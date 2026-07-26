import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * usePushNotifications — Hook React pour gérer les Web Push Notifications.
 *
 * Usage :
 *   const { subscribe, unsubscribe, isSubscribed, isSupported, isLoading, error } = usePushNotifications();
 *
 * Prérequis :
 *   - Service Worker enregistré (public/sw.js)
 *   - Clé VAPID publique disponible via GET /push/vapid-key
 *   - Endpoints API : POST /push/subscribe, DELETE /push/unsubscribe
 */
export function usePushNotifications() {
    const [isSupported, setIsSupported]   = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading]       = useState(false);
    const [error, setError]               = useState(null);
    const [permission, setPermission]     = useState('default');

    // -------------------------------------------------------------------------
    // Initialisation : détection support + statut abonnement
    // -------------------------------------------------------------------------

    useEffect(() => {
        const checkSupport = async () => {
            // Vérifier le support navigateur
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
                setIsSupported(false);
                return;
            }

            setIsSupported(true);
            setPermission(Notification.permission);

            // Vérifier si déjà abonné
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (err) {
                console.error('Push: erreur vérification abonnement', err);
            }
        };

        checkSupport();
    }, []);

    // -------------------------------------------------------------------------
    // Abonnement
    // -------------------------------------------------------------------------

    const subscribe = useCallback(async () => {
        if (!isSupported) {
            setError('Votre navigateur ne supporte pas les notifications push.');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Demander la permission à l'utilisateur
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                setError(perm === 'denied'
                    ? 'Notifications bloquées. Autorisez-les dans les paramètres du navigateur.'
                    : 'Permission de notification refusée.'
                );
                setIsLoading(false);
                return false;
            }

            // 2. Récupérer la clé publique VAPID
            const { data: vapidData } = await axios.get('/push/vapid-key');

            if (!vapidData.success || !vapidData.public_key) {
                throw new Error('Clé VAPID non disponible.');
            }

            // 3. Enregistrer le service worker si pas encore fait
            let registration;
            try {
                registration = await navigator.serviceWorker.ready;
            } catch {
                registration = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;
            }

            // 4. S'abonner via PushManager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly:      true,
                applicationServerKey: urlBase64ToUint8Array(vapidData.public_key),
            });

            // 5. Envoyer l'abonnement au backend
            const subscriptionJson = subscription.toJSON();

            await axios.post('/push/subscribe', {
                endpoint: subscriptionJson.endpoint,
                keys: {
                    p256dh: subscriptionJson.keys.p256dh,
                    auth:   subscriptionJson.keys.auth,
                },
            });

            setIsSubscribed(true);
            return true;
        } catch (err) {
            console.error('Push subscribe error:', err);

            if (err.name === 'NotAllowedError') {
                setError('Permission de notification refusée par le navigateur.');
            } else if (err.response?.status === 503) {
                setError('Service de notifications non configuré. Contactez votre administrateur.');
            } else {
                setError(err.message || 'Erreur lors de l\'activation des notifications.');
            }

            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    // -------------------------------------------------------------------------
    // Désabonnement
    // -------------------------------------------------------------------------

    const unsubscribe = useCallback(async () => {
        if (!isSupported) return false;

        setIsLoading(true);
        setError(null);

        try {
            // Récupérer l'abonnement existant
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                const endpoint = subscription.endpoint;

                // Désabonner côté navigateur
                await subscription.unsubscribe();

                // Notifier le backend
                await axios.delete('/push/unsubscribe', {
                    data: { endpoint },
                });
            }

            setIsSubscribed(false);
            return true;
        } catch (err) {
            console.error('Push unsubscribe error:', err);
            setError('Erreur lors de la désactivation des notifications.');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Envoie une notification de test (via le backend).
     */
    const sendTestNotification = useCallback(async () => {
        if (!isSubscribed) return false;

        try {
            await axios.post('/push/test');
            return true;
        } catch {
            return false;
        }
    }, [isSubscribed]);

    return {
        subscribe,
        unsubscribe,
        sendTestNotification,
        isSubscribed,
        isSupported,
        isLoading,
        error,
        permission,
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convertit une clé VAPID Base64URL en Uint8Array pour PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String) {
    const padding  = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData  = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}
