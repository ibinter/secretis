import { Head } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';

export default function LegalNotices() {
    return (
        <PublicLayout>
            <Head title="Mentions légales – IBIG SECRETIS" />

            <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span>⚖️</span> Mentions légales
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Conformément à la loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'économie numérique (LCEN)
                        et aux dispositions applicables en Côte d'Ivoire.
                    </p>
                </div>

                <div className="space-y-10 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

                    <Section title="1. Éditeur du site">
                        <InfoGrid items={[
                            ['Dénomination sociale', 'IBIG TECHNOLOGIES'],
                            ['Forme juridique', 'Société par Actions Simplifiée (SAS)'],
                            ['Capital social', '10 000 000 FCFA'],
                            ['Siège social', 'Cocody, Abidjan, Côte d\'Ivoire'],
                            ['RCCM', 'CI-ABJ-2024-B-XXXXX'],
                            ['Numéro fiscal', 'XXXXXXXXXX'],
                            ['Directeur de publication', 'M. [Nom du Directeur]'],
                            ['Email de contact', 'contact@ibig.ci'],
                            ['Téléphone', '+225 XX XX XX XX XX'],
                        ]} />
                    </Section>

                    <Section title="2. Hébergement">
                        <InfoGrid items={[
                            ['Hébergeur', 'OVH Cloud SAS'],
                            ['Siège social', '2 rue Kellermann – 59100 Roubaix, France'],
                            ['Site web', 'www.ovhcloud.com'],
                            ['Téléphone', '+33 9 72 10 10 07'],
                            ['Localisation des données', 'Union Européenne (France, Strasbourg)'],
                        ]} />
                        <p className="mt-3">
                            L'hébergement est conforme aux exigences du RGPD. Un contrat de sous-traitance
                            (DPA) est en place avec OVH Cloud conformément à l'article 28 du RGPD.
                        </p>
                    </Section>

                    <Section title="3. Propriété intellectuelle">
                        <p>
                            La plateforme IBIG SECRETIS, son interface, ses fonctionnalités, son code source,
                            ses visuels, ses marques, logos et slogans sont la propriété exclusive de
                            <strong> IBIG TECHNOLOGIES</strong> et sont protégés par les lois françaises et
                            internationales relatives à la propriété intellectuelle.
                        </p>
                        <p>
                            Toute reproduction, distribution, modification, adaptation, retransmission ou
                            publication de ces différents éléments est strictement interdite sans l'accord
                            express par écrit d'IBIG TECHNOLOGIES.
                        </p>
                        <p>
                            Les contenus générés par les utilisateurs dans la plateforme (documents, messages,
                            données) restent la propriété de l'organisation cliente.
                        </p>
                    </Section>

                    <Section title="4. Limitation de responsabilité">
                        <p>
                            IBIG TECHNOLOGIES s'efforce d'assurer l'exactitude et la mise à jour des
                            informations diffusées sur cette plateforme, dont elle se réserve le droit
                            de corriger le contenu à tout moment.
                        </p>
                        <p>
                            IBIG TECHNOLOGIES ne peut être tenu responsable de l'utilisation faite de
                            ces informations et de tout préjudice direct ou indirect pouvant en découler.
                        </p>
                        <p>
                            La responsabilité d'IBIG TECHNOLOGIES ne saurait être engagée en cas de
                            force majeure, défaillance technique des réseaux de communication électronique
                            ou interruption d'accès à Internet.
                        </p>
                    </Section>

                    <Section title="5. Liens hypertextes">
                        <p>
                            La plateforme peut contenir des liens vers des sites tiers. IBIG TECHNOLOGIES
                            n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant
                            à leur contenu ou aux pratiques de protection des données qu'ils appliquent.
                        </p>
                        <p>
                            La création de liens hypertextes pointant vers la plateforme SECRETIS est
                            soumise à autorisation préalable écrite d'IBIG TECHNOLOGIES.
                        </p>
                    </Section>

                    <Section title="6. Cookies">
                        <p>
                            La plateforme utilise des cookies et technologies similaires (traceurs).
                            Conformément à l'article 82 de la loi Informatique et Libertés et aux
                            recommandations de la CNIL :
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Les cookies strictement nécessaires au fonctionnement du service sont
                                exemptés de consentement.</li>
                            <li>Les cookies analytiques et marketing nécessitent votre consentement
                                préalable, recueilli via notre bannière de cookies.</li>
                            <li>Vous pouvez gérer ou retirer votre consentement à tout moment depuis
                                votre espace personnel.</li>
                        </ul>
                        <p className="mt-2">
                            Pour en savoir plus, consultez notre{' '}
                            <a href="/privacy" className="text-purple-600 dark:text-purple-400 hover:underline">
                                politique de confidentialité complète
                            </a>.
                        </p>
                    </Section>

                    <Section title="7. Droit applicable et juridiction compétente">
                        <p>
                            Les présentes mentions légales sont régies par le droit français et le droit
                            ivoirien. En cas de litige concernant l'interprétation ou l'exécution de ces
                            mentions légales, les tribunaux compétents seront ceux du ressort du siège
                            social d'IBIG TECHNOLOGIES.
                        </p>
                    </Section>

                    <Section title="8. Contact">
                        <p>
                            Pour toute question relative aux présentes mentions légales ou au traitement
                            de vos données personnelles :
                        </p>
                        <InfoGrid items={[
                            ['Email général', 'contact@ibig.ci'],
                            ['DPO (données personnelles)', 'dpo@ibig.ci'],
                            ['Abus / signalement', 'abuse@ibig.ci'],
                            ['Support technique', 'support@ibig.ci'],
                        ]} />
                    </Section>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
                        Dernière mise à jour : 21 juillet 2026 · IBIG TECHNOLOGIES © {new Date().getFullYear()}. Tous droits réservés.
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}

function Section({ title, children }) {
    return (
        <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                {title}
            </h2>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function InfoGrid({ items }) {
    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 my-4">
            {items.map(([label, value]) => (
                <div key={label} className="flex gap-4 px-4 py-3">
                    <span className="w-52 font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
                    <span className="text-gray-900 dark:text-white">{value}</span>
                </div>
            ))}
        </div>
    );
}
export { LegalNotices };
