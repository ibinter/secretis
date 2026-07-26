<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OnboardingSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('onboarding_steps')->truncate();

        $steps = [
            [
                'key'   => 'profile_complete',
                'order' => 1,
                'icon'  => '👤',
                'points' => 50,
                'is_required' => true,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Compléter votre profil',
                        'description'  => 'Ajoutez vos informations personnelles pour personnaliser votre expérience SECRETIS.',
                        'action_label' => 'Compléter le profil',
                    ],
                    'en' => [
                        'title'        => 'Complete your profile',
                        'description'  => 'Add your personal information to personalize your SECRETIS experience.',
                        'action_label' => 'Complete profile',
                    ],
                ]),
                'route_name' => 'profile.edit',
            ],
            [
                'key'   => 'upload_avatar',
                'order' => 2,
                'icon'  => '🖼️',
                'points' => 30,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Ajouter une photo de profil',
                        'description'  => 'Mettez un visage sur votre nom — vos collègues vous reconnaîtront plus facilement.',
                        'action_label' => 'Ajouter ma photo',
                    ],
                    'en' => [
                        'title'        => 'Add a profile photo',
                        'description'  => 'Put a face to your name — your colleagues will recognize you more easily.',
                        'action_label' => 'Add my photo',
                    ],
                ]),
                'route_name' => 'profile.edit',
            ],
            [
                'key'   => 'enable_2fa',
                'order' => 3,
                'icon'  => '🔒',
                'points' => 100,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Activer la double authentification',
                        'description'  => 'Sécurisez votre compte avec la 2FA — protégez vos données sensibles.',
                        'action_label' => 'Activer la 2FA',
                    ],
                    'en' => [
                        'title'        => 'Enable two-factor authentication',
                        'description'  => 'Secure your account with 2FA — protect your sensitive data.',
                        'action_label' => 'Enable 2FA',
                    ],
                ]),
                'route_name' => 'security.2fa',
            ],
            [
                'key'   => 'invite_team',
                'order' => 4,
                'icon'  => '👥',
                'points' => 75,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Inviter un collègue',
                        'description'  => 'SECRETIS est plus puissant en équipe. Invitez votre premier collaborateur dès maintenant.',
                        'action_label' => 'Inviter un collègue',
                    ],
                    'en' => [
                        'title'        => 'Invite a colleague',
                        'description'  => 'SECRETIS is more powerful as a team. Invite your first collaborator now.',
                        'action_label' => 'Invite a colleague',
                    ],
                ]),
                'route_name' => 'users.create',
            ],
            [
                'key'   => 'create_event',
                'order' => 5,
                'icon'  => '📅',
                'points' => 50,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Créer votre premier événement',
                        'description'  => 'Planifiez une réunion ou un rendez-vous pour commencer à maîtriser votre agenda.',
                        'action_label' => 'Créer un événement',
                    ],
                    'en' => [
                        'title'        => 'Create your first event',
                        'description'  => 'Schedule a meeting or appointment to start mastering your agenda.',
                        'action_label' => 'Create an event',
                    ],
                ]),
                'route_name' => 'agenda.create',
            ],
            [
                'key'   => 'upload_document',
                'order' => 6,
                'icon'  => '📄',
                'points' => 50,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Importer votre premier document',
                        'description'  => 'Centralisez vos fichiers dans la GED pour un accès sécurisé partout.',
                        'action_label' => 'Importer un document',
                    ],
                    'en' => [
                        'title'        => 'Upload your first document',
                        'description'  => 'Centralize your files in the DMS for secure access everywhere.',
                        'action_label' => 'Upload a document',
                    ],
                ]),
                'route_name' => 'ged.upload',
            ],
            [
                'key'   => 'create_task',
                'order' => 7,
                'icon'  => '✅',
                'points' => 50,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Créer votre première tâche',
                        'description'  => 'Organisez votre travail et suivez vos priorités avec le gestionnaire de tâches.',
                        'action_label' => 'Créer une tâche',
                    ],
                    'en' => [
                        'title'        => 'Create your first task',
                        'description'  => 'Organize your work and track your priorities with the task manager.',
                        'action_label' => 'Create a task',
                    ],
                ]),
                'route_name' => 'tasks.create',
            ],
            [
                'key'   => 'register_visitor',
                'order' => 8,
                'icon'  => '🏢',
                'points' => 50,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Enregistrer un visiteur',
                        'description'  => 'Testez le module de réception en enregistrant votre premier visiteur.',
                        'action_label' => 'Enregistrer un visiteur',
                    ],
                    'en' => [
                        'title'        => 'Register a visitor',
                        'description'  => 'Test the reception module by registering your first visitor.',
                        'action_label' => 'Register a visitor',
                    ],
                ]),
                'route_name' => 'visitors.create',
            ],
            [
                'key'   => 'chat_sara',
                'order' => 9,
                'icon'  => '🤖',
                'points' => 40,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Poser une question à SARA',
                        'description'  => 'SARA est votre assistante IA. Demandez-lui n\'importe quoi sur SECRETIS !',
                        'action_label' => 'Parler à SARA',
                    ],
                    'en' => [
                        'title'        => 'Ask SARA a question',
                        'description'  => 'SARA is your AI assistant. Ask her anything about SECRETIS!',
                        'action_label' => 'Talk to SARA',
                    ],
                ]),
                'route_name' => 'sara.chat',
            ],
            [
                'key'   => 'explore_guide',
                'order' => 10,
                'icon'  => '📚',
                'points' => 30,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Lire un article du guide',
                        'description'  => 'Consultez notre guide utilisateur pour maîtriser toutes les fonctionnalités.',
                        'action_label' => 'Explorer le guide',
                    ],
                    'en' => [
                        'title'        => 'Read a guide article',
                        'description'  => 'Browse our user guide to master all features.',
                        'action_label' => 'Explore the guide',
                    ],
                ]),
                'route_name' => 'guide.index',
            ],
            [
                'key'   => 'generate_report',
                'order' => 11,
                'icon'  => '📊',
                'points' => 75,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Générer votre premier rapport',
                        'description'  => 'Créez un rapport personnalisé pour analyser vos données en quelques clics.',
                        'action_label' => 'Générer un rapport',
                    ],
                    'en' => [
                        'title'        => 'Generate your first report',
                        'description'  => 'Create a custom report to analyze your data in a few clicks.',
                        'action_label' => 'Generate a report',
                    ],
                ]),
                'route_name' => 'report-builder.index',
            ],
            [
                'key'   => 'customize_dashboard',
                'order' => 12,
                'icon'  => '🎨',
                'points' => 40,
                'is_required' => false,
                'translations' => json_encode([
                    'fr' => [
                        'title'        => 'Personnaliser votre tableau de bord',
                        'description'  => 'Configurez les widgets de votre dashboard selon vos besoins quotidiens.',
                        'action_label' => 'Personnaliser',
                    ],
                    'en' => [
                        'title'        => 'Customize your dashboard',
                        'description'  => 'Configure your dashboard widgets according to your daily needs.',
                        'action_label' => 'Customize',
                    ],
                ]),
                'route_name' => 'dashboard',
            ],
        ];

        foreach ($steps as $step) {
            DB::table('onboarding_steps')->insert(array_merge($step, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $this->command->info('OnboardingSeeder: 12 étapes gamifiées créées.');
    }
}
