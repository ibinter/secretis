import { Head } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';

const LAST_UPDATE = '21 juillet 2026';
const VERSION     = '2.1';

export default function PrivacyPolicy() {
    return (
        <PublicLayout>
            <Head title="Politique de confidentialité – IBIG SECRETIS" />

            <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
                {/* En-tête */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">🔒</span>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Politique de confidentialité
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Version {VERSION} · Dernière mise à jour : {LAST_UPDATE}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-5 py-4 text-sm text-purple-800 dark:text-purple-300">
                        Cette politique est conforme au <strong>Règlement (UE) 2016/679</strong> (RGPD),
                        à la loi française Informatique et Libertés n° 78-17 du 6 janvier 1978 modifiée,
                        ainsi qu'aux réglementations applicables en Côte d'Ivoire.
                    </div>
                </div>

                <div className="prose prose-gray dark:prose-invert max-w-none space-y-10">

                    {/* 1. Responsable */}
                    <Section id="responsable" title="1. Responsable du traitement">
                        <p>
                            Le responsable du traitement des données collectées via la plateforme
                            IBIG SECRETIS est :
                        </p>
                        <InfoBox>
                            <InfoRow label="Société">IBIG TECHNOLOGIES</InfoRow>
                            <InfoRow label="Siège social">Abidjan, Côte d'Ivoire</InfoRow>
                            <InfoRow label="Email">contact@ibig.ci</InfoRow>
                            <InfoRow label="DPO">dpo@ibig.ci</InfoRow>
                        </InfoBox>
                        <p>
                            Chaque organisation utilisant SECRETIS est également responsable de traitement
                            pour les données de ses propres utilisateurs et peut nommer son propre DPO.
                        </p>
                    </Section>

                    {/* 2. Données collectées */}
                    <Section id="donnees" title="2. Données collectées">
                        <p>Nous collectons les catégories de données suivantes :</p>
                        <DataTable rows={[
                            ['Données d\'identité', 'Nom, prénom, photo de profil', 'Création de compte'],
                            ['Données de contact', 'Adresse email, numéro de téléphone', 'Création de compte'],
                            ['Données professionnelles', 'Poste, département, organisation', 'Configuration du compte'],
                            ['Données de connexion', 'Adresse IP, horodatages de connexion', 'Automatique – sécurité'],
                            ['Données d\'usage', 'Actions dans l\'application, logs d\'audit', 'Automatique – sécurité'],
                            ['Contenu créé', 'Documents, messages, événements, tâches', 'Utilisation des fonctionnalités'],
                            ['Données de consentement', 'Choix cookies, préférences marketing', 'Consentement utilisateur'],
                            ['Données de facturation', 'Coordonnées de facturation, historique', 'Obligation contractuelle'],
                        ]} />
                        <p className="text-sm text-gray-500">
                            Nous ne collectons pas de données sensibles au sens de l'article 9 du RGPD
                            (santé, origine ethnique, opinions politiques, etc.), sauf consentement explicite
                            dans des modules spécifiques (ex : RH médical).
                        </p>
                    </Section>

                    {/* 3. Finalités et bases légales */}
                    <Section id="finalites" title="3. Finalités et bases légales des traitements">
                        <DataTable rows={[
                            ['Fourniture du service', 'Exécution du contrat (Art. 6.1.b)', 'Durée du contrat'],
                            ['Authentification et sécurité', 'Intérêts légitimes (Art. 6.1.f)', '1 an après déconnexion'],
                            ['Facturation', 'Obligation légale (Art. 6.1.c)', '10 ans (Code commerce)'],
                            ['Support client', 'Exécution du contrat (Art. 6.1.b)', '3 ans après clôture ticket'],
                            ['Amélioration du service (analytics)', 'Consentement (Art. 6.1.a)', 'Jusqu\'à révocation'],
                            ['Communication marketing', 'Consentement (Art. 6.1.a)', 'Jusqu\'à désinscription'],
                            ['Obligation légale (logs)', 'Obligation légale (Art. 6.1.c)', '1 an (LCEN)'],
                        ]} headers={['Finalité', 'Base légale', 'Durée de conservation']} />
                    </Section>

                    {/* 4. Durées de conservation */}
                    <Section id="durees" title="4. Durées de conservation">
                        <p>Nous conservons vos données uniquement le temps nécessaire aux finalités poursuivies :</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li><strong>Données de compte actif :</strong> toute la durée de la relation contractuelle + 3 ans.</li>
                            <li><strong>Logs d'audit :</strong> 12 mois glissants (Article L.34-1 CPCE).</li>
                            <li><strong>Données de facturation :</strong> 10 ans (Articles L.123-22 et suivants du Code de commerce).</li>
                            <li><strong>Cookies analytiques :</strong> 13 mois maximum (recommandation CNIL).</li>
                            <li><strong>Consentements révoqués :</strong> 5 ans (preuve de consentement).</li>
                            <li><strong>Données post-résiliation :</strong> anonymisation sous 90 jours, suppression complète sous 3 ans.</li>
                        </ul>
                    </Section>

                    {/* 5. Destinataires */}
                    <Section id="destinataires" title="5. Destinataires des données">
                        <p>Vos données sont accessibles aux personnes suivantes :</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li><strong>Administrateurs de votre organisation</strong> (dans le cadre de leur fonction).</li>
                            <li><strong>Équipe IBIG TECHNOLOGIES</strong> (support technique, administration système).</li>
                            <li><strong>Sous-traitants techniques</strong> encadrés par des DPA (Data Processing Agreements) :
                                hébergeurs (OVH Cloud), services email, outils de monitoring.</li>
                            <li><strong>Autorités compétentes</strong> sur réquisition judiciaire.</li>
                        </ul>
                        <p className="text-sm">
                            Nous ne vendons, ne louons et ne cédons jamais vos données personnelles à des tiers
                            à des fins commerciales.
                        </p>
                        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">Transferts hors UE</h4>
                        <p className="text-sm">
                            Les données sont hébergées en Europe (UE/EEE). Tout transfert hors UE est
                            encadré par des clauses contractuelles types (CCT) approuvées par la Commission
                            européenne (Décision 2021/914).
                        </p>
                    </Section>

                    {/* 6. Vos droits */}
                    <Section id="droits" title="6. Vos droits">
                        <p>
                            Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3 my-4">
                            {[
                                ['📋', 'Droit d\'accès (Art. 15)', 'Obtenir une copie de toutes vos données personnelles.'],
                                ['✏️', 'Droit de rectification (Art. 16)', 'Corriger des données inexactes ou incomplètes.'],
                                ['🗑️', 'Droit à l\'effacement (Art. 17)', 'Demander la suppression de vos données dans les conditions légales.'],
                                ['📦', 'Droit à la portabilité (Art. 20)', 'Recevoir vos données dans un format structuré et lisible.'],
                                ['⏸️', 'Droit à la limitation (Art. 18)', 'Limiter certains traitements dans des cas précis.'],
                                ['🚫', 'Droit d\'opposition (Art. 21)', 'S\'opposer aux traitements basés sur nos intérêts légitimes ou à des fins de marketing.'],
                                ['🤖', 'Droit relatif aux décisions automatisées (Art. 22)', 'Ne pas faire l\'objet de décisions basées uniquement sur un traitement automatisé.'],
                                ['✅', 'Droit de retrait du consentement (Art. 7)', 'Retirer votre consentement à tout moment.'],
                            ].map(([icon, title, desc]) => (
                                <div key={title} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                                    <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">{icon} {title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                        <p>
                            Pour exercer vos droits, connectez-vous à SECRETIS → <strong>Mon profil → Mes données</strong>,
                            ou contactez notre DPO à <a href="mailto:dpo@ibig.ci" className="text-purple-600 dark:text-purple-400">dpo@ibig.ci</a>.
                        </p>
                        <p className="text-sm">
                            Nous répondons dans un délai de <strong>30 jours</strong> (art. 12 RGPD),
                            prorogeable de 2 mois en cas de complexité.
                        </p>
                        <p className="text-sm mt-2">
                            En cas de réponse insatisfaisante, vous pouvez introduire une réclamation
                            auprès de la <strong>CNIL</strong> (<a href="https://www.cnil.fr" className="text-purple-600 dark:text-purple-400" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>)
                            ou de l'autorité de protection des données compétente dans votre pays.
                        </p>
                    </Section>

                    {/* 7. Sécurité */}
                    <Section id="securite" title="7. Sécurité des données">
                        <p>
                            IBIG TECHNOLOGIES met en œuvre des mesures techniques et organisationnelles
                            appropriées pour protéger vos données (Article 32 RGPD) :
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm">
                            <li>Chiffrement TLS 1.3 pour toutes les transmissions.</li>
                            <li>Chiffrement AES-256 pour les données au repos.</li>
                            <li>Authentification à deux facteurs (2FA).</li>
                            <li>Journaux d'audit avec alertes en temps réel.</li>
                            <li>Sauvegardes chiffrées avec rétention 90 jours.</li>
                            <li>Tests de pénétration annuels par des tiers indépendants.</li>
                            <li>Procédure de gestion des incidents (notification CNIL sous 72h).</li>
                        </ul>
                    </Section>

                    {/* 8. Cookies */}
                    <Section id="cookies" title="8. Cookies et traceurs">
                        <DataTable headers={['Catégorie', 'Exemples', 'Durée', 'Base légale']} rows={[
                            ['Essentiels', 'Session, CSRF, préférences', 'Session / 1 an', 'Intérêt légitime'],
                            ['Analytiques', 'Mesure d\'audience (anonymisée)', '13 mois', 'Consentement'],
                            ['Marketing', 'Personnalisation, retargeting', '13 mois', 'Consentement'],
                        ]} />
                        <p className="text-sm mt-2">
                            Vous pouvez gérer vos préférences de cookies à tout moment depuis
                            <strong> Mon compte → Mes données → Consentements</strong>.
                        </p>
                    </Section>

                    {/* 9. DPO */}
                    <Section id="dpo" title="9. Délégué à la Protection des Données (DPO)">
                        <InfoBox>
                            <InfoRow label="Rôle">Délégué à la Protection des Données</InfoRow>
                            <InfoRow label="Entité">IBIG TECHNOLOGIES</InfoRow>
                            <InfoRow label="Contact">dpo@ibig.ci</InfoRow>
                            <InfoRow label="Adresse">Cocody, Abidjan, Côte d'Ivoire</InfoRow>
                        </InfoBox>
                        <p className="text-sm">
                            Le DPO est votre interlocuteur privilégié pour toute question relative
                            au traitement de vos données personnelles. Il est indépendant et soumis
                            au secret professionnel.
                        </p>
                    </Section>

                    {/* 10. Modifications */}
                    <Section id="modifications" title="10. Modifications de cette politique">
                        <p>
                            Nous pouvons mettre à jour cette politique pour refléter des évolutions
                            légales ou techniques. En cas de modification substantielle, vous serez
                            notifié par email et/ou via une notification dans l'application au moins
                            30 jours avant l'entrée en vigueur.
                        </p>
                        <p className="text-sm">
                            L'historique des versions est conservé et accessible sur demande auprès de notre DPO.
                        </p>
                        <p className="text-sm font-medium mt-4">
                            Version actuelle : {VERSION} · Entrée en vigueur : {LAST_UPDATE}
                        </p>
                    </Section>
                </div>
            </div>
        </PublicLayout>
    );
}

function Section({ id, title, children }) {
    return (
        <section id={id} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                {title}
            </h2>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {children}
            </div>
        </section>
    );
}

function InfoBox({ children }) {
    return (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 my-4">
            {children}
        </div>
    );
}

function InfoRow({ label, children }) {
    return (
        <div className="flex gap-4 px-4 py-3 text-sm">
            <span className="w-40 font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
            <span className="text-gray-900 dark:text-white">{children}</span>
        </div>
    );
}

function DataTable({ headers = ['Catégorie', 'Données', 'Source'], rows }) {
    return (
        <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500">
                    <tr>
                        {headers.map(h => (
                            <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                    {rows.map((row, i) => (
                        <tr key={i}>
                            {row.map((cell, j) => (
                                <td key={j} className={`px-4 py-3 text-gray-700 dark:text-gray-300 ${j === 0 ? 'font-medium text-gray-900 dark:text-white' : ''}`}>
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
export { PrivacyPolicy };
