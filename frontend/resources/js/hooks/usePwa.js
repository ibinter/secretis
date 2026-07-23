import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook usePwa — gestion complète de la PWA SECRETIS.
 * Expose : isInstalled, isPwaSupported, isOffline, promptInstall,
 *           requestPushPermission, subscribeToPush,
 *           updateAvailable, pendingSync, updateApp.
 */
export function usePwa() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const deferredPromptRef = useRef(null);
  const [installable, setInstallable] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const waitingWorkerRef = useRef(null);

  // ── Écoute online / offline ──────────────────────────────────────────
  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // ── Capturer l'événement d'installation ─────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Signaler quand l'app est installée
    window.addEventListener('appinstalled', () => {
      deferredPromptRef.current = null;
      setInstallable(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── Détection mise à jour SW disponible ─────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // Un nouveau SW a pris le contrôle → recharger la page
      window.location.reload();
    };

    const handleMessage = (event) => {
      if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
        setUpdateAvailable(true);
      }
      if (event.data?.type === 'SYNC_COUNT') {
        setPendingSync(event.data.count ?? 0);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Surveiller les mises à jour SW dès qu'un registration est actif
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // Un nouveau SW est installé et prêt → notifier l'utilisateur
            waitingWorkerRef.current = newWorker;
            setUpdateAvailable(true);
          }
        });
      });
    }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // ── isInstalled ──────────────────────────────────────────────────────
  const isInstalled = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }, []);

  // ── isPwaSupported ───────────────────────────────────────────────────
  const isPwaSupported = useCallback(() => {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }, []);

  // ── isOffline ────────────────────────────────────────────────────────
  const isOffline = useCallback(() => offline, [offline]);

  // ── promptInstall ────────────────────────────────────────────────────
  /**
   * Affiche la dialogue d'installation native.
   * @returns {Promise<'accepted'|'dismissed'|'not-available'>}
   */
  const promptInstall = useCallback(async () => {
    if (!deferredPromptRef.current) return 'not-available';

    deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;

    if (outcome === 'accepted') {
      deferredPromptRef.current = null;
      setInstallable(false);
    }

    return outcome;
  }, []);

  // ── updateApp ────────────────────────────────────────────────────────
  /**
   * Déclenche la mise à jour immédiate du service worker.
   * Envoie SKIP_WAITING au SW en attente puis recharge la page.
   */
  const updateApp = useCallback(() => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, []);

  // ── requestPushPermission ────────────────────────────────────────────
  /**
   * Demande la permission pour les notifications push.
   * @returns {Promise<NotificationPermission>} 'granted' | 'denied' | 'default'
   */
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied';

    if (Notification.permission === 'granted') return 'granted';

    const permission = await Notification.requestPermission();
    return permission;
  }, []);

  // ── subscribeToPush ──────────────────────────────────────────────────
  /**
   * Abonne l'utilisateur aux notifications push via VAPID.
   * @param {string} vapidPublicKey — clé VAPID base64 URL-safe
   * @returns {Promise<PushSubscription|null>}
   */
  const subscribeToPush = useCallback(async (vapidPublicKey) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[usePwa] Push non supporté sur ce navigateur');
      return null;
    }

    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      console.warn('[usePwa] Permission push refusée');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Vérifier si déjà abonné
      const existing = await registration.pushManager.getSubscription();
      if (existing) return existing;

      // Convertir la clé VAPID en Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      return subscription;
    } catch (err) {
      console.error('[usePwa] Erreur abonnement push :', err);
      return null;
    }
  }, [requestPushPermission]);

  // ── Utilitaire VAPID ─────────────────────────────────────────────────
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  return {
    /** true si l'app tourne en mode installé (standalone) */
    isInstalled,
    /** true si le navigateur supporte les PWA (SW + Push + Notification) */
    isPwaSupported,
    /** true si la connexion réseau est absente */
    isOffline,
    /** true si le prompt d'installation est disponible */
    installable,
    /** true si une mise à jour du SW est prête à être appliquée */
    updateAvailable,
    /** Nombre de requêtes en attente de synchronisation (mode offline) */
    pendingSync,
    /** Déclenche le prompt natif d'installation → Promise<'accepted'|'dismissed'|'not-available'> */
    promptInstall,
    /** Active le nouveau service worker et recharge la page */
    updateApp,
    /** Demande la permission de notifications → Promise<NotificationPermission> */
    requestPushPermission,
    /** Abonne aux push VAPID → Promise<PushSubscription|null> */
    subscribeToPush
  };
}

export default usePwa;
