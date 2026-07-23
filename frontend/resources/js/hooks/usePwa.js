/**
 * SECRETIS ERP — usePwa.js (v2)
 * Hook unifié pour toutes les fonctionnalités PWA :
 *   - Installation (beforeinstallprompt + iOS Safari)
 *   - Mise à jour du Service Worker
 *   - État hors-ligne / en ligne
 *   - Compteur d'actions en attente (IndexedDB via SW)
 *   - Permissions et abonnement push VAPID
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Communication avec le Service Worker ─────────────────────────────────────
function swMessage(type, payload = {}) {
  if (!navigator.serviceWorker?.controller) return Promise.resolve(null);
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = (e) => resolve(e.data);
    navigator.serviceWorker.controller.postMessage({ type, payload }, [port2]);
    setTimeout(() => resolve(null), 3000);
  });
}

// ─── Clé VAPID Base64URL → Uint8Array ────────────────────────────────────────
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64     = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(b64);
  const out     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// ─── Détecter iOS Safari (pas de beforeinstallprompt) ────────────────────────
function detectIosSafari() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !window.MSStream && !ua.includes('crios');
}

// ─────────────────────────────────────────────────────────────────────────────
export function usePwa() {
  // ── Installation ─────────────────────────────────────────────────────────
  const [installPrompt,  setInstallPrompt]  = useState(null);
  const [isInstalled,    setIsInstalled]    = useState(false);
  const [isInstallable,  setIsInstallable]  = useState(false);
  const [isIos,          setIsIos]          = useState(false);

  // ── Mise à jour SW ───────────────────────────────────────────────────────
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration,    setRegistration]    = useState(null);
  const waitingWorkerRef                       = useRef(null);

  // ── Réseau ───────────────────────────────────────────────────────────────
  const [isOnline,         setIsOnline]        = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // ── Push ─────────────────────────────────────────────────────────────────
  const [pushPermission, setPushPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // ── Détection installation ────────────────────────────────────────────────
  useEffect(() => {
    const ios        = detectIosSafari();
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true
      || document.referrer.startsWith('android-app://');

    setIsIos(ios);
    setIsInstalled(standalone);
    if (ios && !standalone) setIsInstallable(true);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // ── Service Worker : enregistrement et mises à jour ───────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (!reloading) { reloading = true; window.location.reload(); }
    };
    const onSwMessage = ({ data }) => {
      const { type, data: payload, count } = data ?? {};
      if (type === 'PENDING_COUNT')   setPendingSyncCount(count ?? 0);
      if (type === 'action-queued')   refreshPendingCount();
      if (type === 'action-synced')   refreshPendingCount();
      if (type === 'sync-complete')   refreshPendingCount();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.addEventListener('message', onSwMessage);

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      if (reg.waiting) {
        waitingWorkerRef.current = reg.waiting;
        setUpdateAvailable(true);
      }

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorkerRef.current = nw;
            setUpdateAvailable(true);
          }
        });
      });

      // Vérification périodique
      const interval = setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      return () => clearInterval(interval);
    }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, []);

  // ── Réseau ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  refreshPendingCount(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Compteur actions en attente ───────────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    const res = await swMessage('GET_PENDING_COUNT');
    if (res?.count !== undefined) setPendingSyncCount(res.count);
  }, []);

  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  // ─────────────────────────────────────────────────────────────────────────
  // API publique
  // ─────────────────────────────────────────────────────────────────────────

  /** Déclencher le prompt d'installation natif */
  const install = useCallback(async () => {
    if (!installPrompt) return false;
    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
      }
      return outcome === 'accepted';
    } catch (err) {
      console.error('[usePwa] install:', err);
      return false;
    }
  }, [installPrompt]);

  /** Appliquer la mise à jour SW + recharger */
  const updateApp = useCallback(() => {
    const worker = waitingWorkerRef.current ?? navigator.serviceWorker?.controller;
    if (worker) worker.postMessage({ type: 'SKIP_WAITING' });
    else        window.location.reload();
  }, []);

  /** Demander permission push + s'abonner via VAPID */
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window) || !('PushManager' in window)) return 'unsupported';

    const perm = await Notification.requestPermission();
    setPushPermission(perm);
    if (perm !== 'granted') return perm;

    try {
      const reg      = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) return 'granted';

      const vapidRes = await fetch('/push/vapid-key', { headers: { Accept: 'application/json' } });
      const vapid    = await vapidRes.json();
      if (!vapid?.public_key) throw new Error('VAPID key missing');

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapid.public_key),
      });

      const subJson = sub.toJSON();
      await fetch('/push/subscribe', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
          Accept:         'application/json',
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys:     { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
        }),
      });

      return 'granted';
    } catch (err) {
      console.error('[usePwa] push subscribe:', err);
      return 'error';
    }
  }, []);

  /** Déclencher une synchronisation manuelle */
  const syncNow = useCallback(async () => {
    if (!isOnline) return { offline: true };
    if (registration?.sync) {
      try {
        await registration.sync.register('sync-pending-actions');
        setTimeout(refreshPendingCount, 2000);
        return { queued: true };
      } catch { /* fallback */ }
    }
    const result = await swMessage('SYNC_NOW');
    await refreshPendingCount();
    return result ?? {};
  }, [isOnline, registration, refreshPendingCount]);

  /** Mettre en file d'attente une action offline */
  const queueAction = useCallback(async (store, data) => {
    await swMessage('QUEUE_ACTION', { store, ...data });
    await refreshPendingCount();
  }, [refreshPendingCount]);

  return {
    // Installation
    isInstalled,
    isInstallable,
    isIos,
    install,

    // Mise à jour
    updateAvailable,
    registration,
    updateApp,

    // Réseau
    isOnline,
    pendingSyncCount,
    syncNow,
    queueAction,
    refreshPendingCount,

    // Push
    pushPermission,
    requestPushPermission,

    // Compatibilité ancienne API
    installable:    isInstallable,
    promptInstall:  install,
    isOffline:      !isOnline,
    pendingSync:    pendingSyncCount,
    isInstalled,
    isPwaSupported: 'serviceWorker' in navigator && 'PushManager' in window,
  };
}

export default usePwa;
