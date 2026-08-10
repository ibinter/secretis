import React from 'react';
import AppLayout from '@/Layouts/AppLayout';
import LicenceBanner from '@/Components/Licence/LicenceBanner';

/**
 * Le bandeau d'état de licence précède le contenu de chaque écran authentifié.
 * Il se rend lui-même invisible tant que le serveur ne partage pas la prop
 * `licence` : aucun écran n'est modifié tant que le socle n'est pas raccordé.
 */
export default function AuthLayout({ children, header }) {
    return (
        <AppLayout>
            <LicenceBanner className="-mx-4 -mt-4 mb-4 sm:-mx-6 sm:-mt-6 sm:mb-6" />
            {children}
        </AppLayout>
    );
}
