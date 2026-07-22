#!/usr/bin/env bash
# =============================================================================
# IBIG SECRETIS ERP — Script d'initialisation du projet Laravel
# Laravel 11 | PHP 8.2+ | PostgreSQL | Redis | Reverb
# =============================================================================

set -euo pipefail

PROJECT_NAME="secretis"
PHP_VERSION="8.2"

echo "============================================="
echo " IBIG SECRETIS ERP — Initialisation projet"
echo "============================================="

# -----------------------------------------------------------------------------
# 1. CRÉATION DU PROJET LARAVEL
# -----------------------------------------------------------------------------
echo ""
echo "[1/10] Création du projet Laravel 11..."
composer create-project laravel/laravel "$PROJECT_NAME" "^11.0" --prefer-dist

cd "$PROJECT_NAME"

echo "Projet Laravel créé dans : $(pwd)"

# -----------------------------------------------------------------------------
# 2. INSTALLATION DES PACKAGES COMPOSER
# -----------------------------------------------------------------------------
echo ""
echo "[2/10] Installation des packages Composer..."

# Inertia.js (SSR React)
composer require inertiajs/inertia-laravel

# Ziggy — partage des routes Laravel vers le frontend JS
composer require tightenco/ziggy

# Spatie Laravel Permission — RBAC complet
composer require spatie/laravel-permission

# Spatie Laravel Multitenancy — stratégie multi-tenant
composer require spatie/laravel-multitenancy

# Laravel Reverb — WebSockets temps réel
composer require laravel/reverb

# Laravel Scout — recherche full-text (compatible PostgreSQL)
composer require laravel/scout

# Intervention Image — traitement d'images (avatars, documents)
composer require intervention/image

# Laravel Sanctum — authentification API tokens
composer require laravel/sanctum

# Spatie Laravel Media Library — gestion fichiers/documents
composer require spatie/laravel-medialibrary

# Spatie Laravel Activity Log — journal d'audit
composer require spatie/laravel-activitylog

# Spatie Laravel Query Builder — filtres API REST
composer require spatie/laravel-query-builder

# Laravel Excel — export Excel/CSV
composer require maatwebsite/excel

# DomPDF — génération PDF
composer require barryvdh/laravel-dompdf

# Laravel Telescope (dev uniquement) — debugging
composer require laravel/telescope --dev

# Pest PHP — framework de tests
composer require pestphp/pest --dev --with-all-dependencies
composer require pestphp/pest-plugin-laravel --dev

echo "Packages Composer installés."

# -----------------------------------------------------------------------------
# 3. INSTALLATION DES PACKAGES NPM
# -----------------------------------------------------------------------------
echo ""
echo "[3/10] Installation des packages NPM..."

# Framework React + Inertia
npm install react react-dom @inertiajs/react

# Vite + plugins
npm install -D vite @vitejs/plugin-react laravel-vite-plugin

# TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui ou composants headless
npm install @headlessui/react @heroicons/react

# Laravel Echo + Pusher JS (pour Reverb)
npm install laravel-echo pusher-js

# Zustand — gestion d'état léger
npm install zustand

# React Query — gestion des requêtes serveur
npm install @tanstack/react-query

# Formulaires
npm install react-hook-form @hookform/resolvers zod

# Internationalisation
npm install react-i18next i18next

# Calendrier / Agenda
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

# Graphiques / Rapports
npm install recharts

# Éditeur de texte riche (PV réunions, notes)
npm install @tiptap/react @tiptap/starter-kit

# Notifications toast
npm install react-hot-toast

# Drag and Drop (Kanban tâches)
npm install @dnd-kit/core @dnd-kit/sortable

# Dates
npm install dayjs

echo "Packages NPM installés."

# -----------------------------------------------------------------------------
# 4. PUBLICATION DES CONFIGURATIONS
# -----------------------------------------------------------------------------
echo ""
echo "[4/10] Publication des configurations..."

# Inertia
php artisan inertia:middleware

# Sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Spatie Permission
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"

# Spatie Multitenancy
php artisan vendor:publish --provider="Spatie\Multitenancy\MultitenancyServiceProvider"

# Spatie Activity Log
php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider" --tag="activitylog-migrations"

# Reverb
php artisan reverb:install

# Telescope (dev)
php artisan telescope:install

# Media Library
php artisan vendor:publish --provider="Spatie\MediaLibrary\MediaLibraryServiceProvider" --tag="medialibrary-migrations"

echo "Configurations publiées."

# -----------------------------------------------------------------------------
# 5. CONFIGURATION DU FICHIER .ENV
# -----------------------------------------------------------------------------
echo ""
echo "[5/10] Configuration du fichier .env..."

cat > .env << 'ENVEOF'
# =============================================================================
# IBIG SECRETIS ERP — Configuration d'environnement
# =============================================================================

APP_NAME="IBIG SECRETIS"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_TIMEZONE=Africa/Abidjan
APP_URL=http://localhost:8000
APP_LOCALE=fr
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=fr_FR

# --- Logs ---
LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

# --- Base de données PostgreSQL ---
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=secretis
DB_USERNAME=secretis_user
DB_PASSWORD=secretis_password

# Base de données landlord (superadmin, organisations, licences)
LANDLORD_DB_CONNECTION=pgsql
LANDLORD_DB_HOST=127.0.0.1
LANDLORD_DB_PORT=5432
LANDLORD_DB_DATABASE=secretis_landlord
LANDLORD_DB_USERNAME=secretis_user
LANDLORD_DB_PASSWORD=secretis_password

# --- Cache & Sessions (Redis) ---
CACHE_STORE=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=480
SESSION_DOMAIN=.secretis.local

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1
REDIS_SESSION_DB=2

# --- File d'attente ---
QUEUE_CONNECTION=redis
QUEUE_RETRY_AFTER=90

# --- Mail ---
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@secretis.ibigsoft.com"
MAIL_FROM_NAME="IBIG SECRETIS"

# --- Stockage fichiers ---
FILESYSTEM_DISK=local
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-3
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

# --- Laravel Reverb (WebSockets) ---
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=secretis-app
REVERB_APP_KEY=secretis-key
REVERB_APP_SECRET=secretis-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# --- Laravel Scout (recherche full-text) ---
SCOUT_DRIVER=database
# En production : SCOUT_DRIVER=meilisearch ou algolia
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=

# --- Intelligence Artificielle ---
AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_DEFAULT_MODEL=llama3-8b-8192

OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# --- Multi-tenancy ---
TENANCY_STRATEGY=single_database
TENANCY_COLUMN=organization_id

# --- Licence & Plans ---
TRIAL_DAYS=14
LICENSE_CHECK_URL=https://licenses.ibigsoft.com/api/check

# --- Sécurité ---
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1,secretis.local
ENVEOF

# Générer la clé d'application
php artisan key:generate

echo "Fichier .env configuré."

# -----------------------------------------------------------------------------
# 6. CRÉATION DES BASES DE DONNÉES POSTGRESQL
# -----------------------------------------------------------------------------
echo ""
echo "[6/10] Création des bases de données PostgreSQL..."
echo "NOTE : Exécutez ces commandes manuellement si psql n'est pas disponible."

# Ces commandes nécessitent les droits superadmin PostgreSQL
# psql -U postgres << 'SQLEOF'
# CREATE USER secretis_user WITH PASSWORD 'secretis_password';
# CREATE DATABASE secretis OWNER secretis_user;
# CREATE DATABASE secretis_landlord OWNER secretis_user;
# GRANT ALL PRIVILEGES ON DATABASE secretis TO secretis_user;
# GRANT ALL PRIVILEGES ON DATABASE secretis_landlord TO secretis_user;
# -- Extension UUID
# \c secretis
# CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
# CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour la recherche full-text
# \c secretis_landlord
# CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
# SQLEOF

echo "Commandes SQL affichées (à exécuter manuellement)."

# -----------------------------------------------------------------------------
# 7. CONFIGURATION DES FICHIERS DE CONFIGURATION
# -----------------------------------------------------------------------------
echo ""
echo "[7/10] Création des fichiers de configuration personnalisés..."

# Créer config/secretis.php (voir fichier séparé)
# Créer config/tenancy.php
cat > config/tenancy.php << 'PHPEOF'
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Tenant Model
    |--------------------------------------------------------------------------
    */
    'tenant_model' => \App\Models\Organization::class,

    /*
    |--------------------------------------------------------------------------
    | Tenant Finder
    |--------------------------------------------------------------------------
    | Comment identifier le tenant courant depuis la requête HTTP.
    | Stratégies disponibles : domain, subdomain, path, header, jwt
    */
    'tenant_finder' => \Spatie\Multitenancy\TenantFinder\DomainTenantFinder::class,

    /*
    |--------------------------------------------------------------------------
    | Tasks à exécuter lors du switch de tenant
    |--------------------------------------------------------------------------
    */
    'switch_tenant_tasks' => [
        \Spatie\Multitenancy\Tasks\SwitchTenantDatabaseTask::class,
        \App\Support\Tasks\SetTenantStorageDiskTask::class,
        \App\Support\Tasks\SetTenantLocaleTask::class,
        \App\Support\Tasks\BindTenantToContainerTask::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Connexions base de données
    |--------------------------------------------------------------------------
    */
    'landlord_database_connection_name' => env('LANDLORD_DB_CONNECTION', 'landlord'),
    'tenant_database_connection_name' => env('DB_CONNECTION', 'pgsql'),

    /*
    |--------------------------------------------------------------------------
    | Noms de connexions
    |--------------------------------------------------------------------------
    */
    'db_connection_map' => [
        'landlord' => env('LANDLORD_DB_CONNECTION', 'pgsql'),
        'tenant' => env('DB_CONNECTION', 'pgsql'),
    ],
];
PHPEOF

echo "Configuration tenancy créée."

# -----------------------------------------------------------------------------
# 8. CRÉATION DE LA STRUCTURE DES DOSSIERS
# -----------------------------------------------------------------------------
echo ""
echo "[8/10] Création de la structure de dossiers..."

# Domaines métier
DOMAINS=(
    "app/Domain/Agenda/Actions"
    "app/Domain/Agenda/DataTransferObjects"
    "app/Domain/Agenda/Events"
    "app/Domain/Agenda/Models"
    "app/Domain/Agenda/Repositories"
    "app/Domain/Agenda/Services"
    "app/Domain/Courrier/Actions"
    "app/Domain/Courrier/DataTransferObjects"
    "app/Domain/Courrier/Events"
    "app/Domain/Courrier/Models"
    "app/Domain/Courrier/Repositories"
    "app/Domain/Courrier/Services"
    "app/Domain/Reunions/Actions"
    "app/Domain/Reunions/Models"
    "app/Domain/Reunions/Repositories"
    "app/Domain/Reunions/Services"
    "app/Domain/Taches/Actions"
    "app/Domain/Taches/Models"
    "app/Domain/Taches/Repositories"
    "app/Domain/Taches/Services"
    "app/Domain/Communication/Actions"
    "app/Domain/Communication/Models"
    "app/Domain/Communication/Repositories"
    "app/Domain/Communication/Services"
    "app/Domain/Accueil/Actions"
    "app/Domain/Accueil/Models"
    "app/Domain/Accueil/Repositories"
    "app/Domain/Accueil/Services"
    "app/Domain/Ressources/Actions"
    "app/Domain/Ressources/Models"
    "app/Domain/Ressources/Repositories"
    "app/Domain/Ressources/Services"
    "app/Domain/RH/Actions"
    "app/Domain/RH/Models"
    "app/Domain/RH/Repositories"
    "app/Domain/RH/Services"
    "app/Domain/Rapports/Actions"
    "app/Domain/Rapports/Models"
    "app/Domain/Rapports/Services"
    "app/Domain/Parametres/Actions"
    "app/Domain/Parametres/Models"
    "app/Domain/Parametres/Services"
    "app/Http/Controllers/Api/V1"
    "app/Http/Controllers/Api/Webhooks"
    "app/Http/Controllers/SuperAdmin"
    "app/Http/Controllers/Web"
    "app/Http/Controllers/Auth"
    "app/Support/Helpers"
    "app/Support/Tasks"
    "app/Support/Traits"
    "routes/modules"
    "resources/js/Components/Common"
    "resources/js/Components/Layout"
    "resources/js/Components/Modules"
    "resources/js/Pages/Auth"
    "resources/js/Pages/SuperAdmin/Tenants"
    "resources/js/Pages/SuperAdmin/Licenses"
    "resources/js/Pages/SuperAdmin/Plans"
    "resources/js/Stores"
    "resources/js/Hooks"
    "resources/lang/fr"
    "resources/lang/en"
    "resources/views/emails"
    "resources/views/pdf"
    "storage/app/private/tenants"
    "database/migrations/Agenda"
    "database/migrations/Courrier"
    "database/migrations/Reunions"
    "database/migrations/Taches"
    "database/migrations/Communication"
    "database/migrations/Accueil"
    "database/migrations/Ressources"
    "database/migrations/RH"
    "database/migrations/Rapports"
    "tests/Feature/Auth"
    "tests/Feature/Agenda"
    "tests/Feature/Courrier"
    "tests/Feature/Tenancy"
    "tests/Feature/License"
    "tests/Unit/Services"
    "tests/Unit/Repositories"
)

for dir in "${DOMAINS[@]}"; do
    mkdir -p "$dir"
    touch "$dir/.gitkeep"
done

echo "Structure de dossiers créée."

# -----------------------------------------------------------------------------
# 9. CONFIGURATION VITE
# -----------------------------------------------------------------------------
echo ""
echo "[9/10] Configuration de Vite..."

cat > vite.config.js << 'VITEEOF'
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
            '@components': path.resolve(__dirname, './resources/js/Components'),
            '@pages': path.resolve(__dirname, './resources/js/Pages'),
            '@stores': path.resolve(__dirname, './resources/js/Stores'),
            '@hooks': path.resolve(__dirname, './resources/js/Hooks'),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
    },
});
VITEEOF

# Configuration TailwindCSS
cat > tailwind.config.js << 'TAILEOF'
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
        './resources/js/**/*.js',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Palette IBIG SECRETIS
                primary: {
                    50:  '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    900: '#1e3a8a',
                },
                secondary: {
                    500: '#10b981',
                    600: '#059669',
                },
                africa: {
                    green:  '#009A44',
                    yellow: '#FCD116',
                    red:    '#CE1126',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
    ],
};
TAILEOF

echo "Vite et TailwindCSS configurés."

# -----------------------------------------------------------------------------
# 10. MIGRATIONS ET SEEDS INITIAUX
# -----------------------------------------------------------------------------
echo ""
echo "[10/10] Exécution des migrations..."

# Migrer la base landlord d'abord
php artisan migrate --database=landlord

# Migrer la base tenant principale
php artisan migrate

# Seeder de base
php artisan db:seed --class=PlanSeeder
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=SuperAdminSeeder

echo ""
echo "============================================="
echo " Installation terminée avec succès !"
echo "============================================="
echo ""
echo " Commandes utiles :"
echo "   php artisan serve              — Serveur Laravel"
echo "   npm run dev                    — Vite (Hot Reload)"
echo "   php artisan reverb:start       — WebSockets Reverb"
echo "   php artisan queue:work         — Worker file d'attente"
echo "   php artisan telescope:clear    — Nettoyer Telescope"
echo ""
echo " URLs :"
echo "   App      : http://localhost:8000"
echo "   Vite HMR : http://localhost:5173"
echo "   Reverb WS: ws://localhost:8080"
echo "   Telescope: http://localhost:8000/telescope"
echo ""
