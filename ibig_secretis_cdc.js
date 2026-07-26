const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageBreak, NumberFormat, convertInchesToTwip, Header, Footer,
  PageNumber, TabStopPosition, TabStopType, UnderlineType,
  LevelFormat, TableLayoutType
} = require('docx');

const fs = require('fs');

// ─── COULEURS CHARTE GRAPHIQUE IBIG SECRETIS ───────────────────────────────
const C = {
  primary:     '1A3A5C',   // Bleu marine professionnel
  secondary:   '2E86C1',   // Bleu vif
  accent:      'F39C12',   // Or/Ambre
  dark:        '1C1C1C',   // Noir texte
  gray:        '6C757D',   // Gris texte secondaire
  lightGray:   'F5F7FA',   // Fond clair
  white:       'FFFFFF',
  tableHeader: '1A3A5C',
  tableRow1:   'EBF5FB',
  tableRow2:   'FDFEFE',
  border:      'BDC3C7',
  success:     '1E8449',
  warning:     'F39C12',
  danger:      'C0392B',
};

// ─── HELPERS ───────────────────────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    thematicBreak: false,
    spacing: { before: 400, after: 200 },
    run: { color: C.primary, bold: true, size: 32 },
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    run: { color: C.secondary, bold: true, size: 26 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    run: { color: C.primary, bold: true, size: 24 },
  });
}

function h4(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: C.secondary, size: 22 })],
    spacing: { before: 180, after: 100 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 20, color: opts.color || C.dark, bold: opts.bold || false, italics: opts.italic || false })],
    spacing: { before: opts.spaceBefore || 80, after: opts.spaceAfter || 80 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: C.dark })],
    bullet: { level },
    spacing: { before: 60, after: 60 },
  });
}

function pb() {
  return new Paragraph({ children: [new PageBreak()] });
}

function separator() {
  return new Paragraph({
    children: [new TextRun({ text: '' })],
    border: { bottom: { color: C.border, space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: 160, after: 160 },
  });
}

function tableHeader(cells, widths) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text, i) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, color: C.white, size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
        })],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.tableHeader },
        width: { size: widths[i], type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      })
    ),
  });
}

function tableRow(cells, widths, even = true) {
  return new TableRow({
    children: cells.map((text, i) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: String(text), size: 18, color: C.dark })],
          spacing: { before: 50, after: 50 },
        })],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: even ? C.tableRow1 : C.tableRow2 },
        width: { size: widths[i], type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
      })
    ),
  });
}

function makeTable(headers, rows, widths) {
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: [
      tableHeader(headers, widths),
      ...rows.map((row, i) => tableRow(row, widths, i % 2 === 0)),
    ],
  });
}

function infoBox(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label} : `, bold: true, color: C.primary, size: 20 }),
      new TextRun({ text: value, color: C.dark, size: 20 }),
    ],
    spacing: { before: 60, after: 60 },
  });
}

// ─── DOCUMENT ──────────────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  styles: {
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1',
        run: { bold: true, color: C.primary, size: 32, font: 'Calibri' },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2',
        run: { bold: true, color: C.secondary, size: 26, font: 'Calibri' },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3',
        run: { bold: true, color: C.primary, size: 24, font: 'Calibri' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.1), right: convertInchesToTwip(1.1) },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'IBIG SECRETIS — Cahier des Charges Complet', bold: true, color: C.primary, size: 18 }),
                new TextRun({ text: '     |     secretis.ibigsoft.com     |     IBIG Soft © 2025', color: C.gray, size: 16 }),
              ],
              alignment: AlignmentType.CENTER,
              border: { bottom: { color: C.secondary, space: 1, style: BorderStyle.SINGLE, size: 6 } },
              spacing: { after: 100 },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'IBIG SARL – Intermark Business International Group  |  ibigsoft.com  |  Page ', color: C.gray, size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], color: C.gray, size: 16 }),
                new TextRun({ text: ' / ', color: C.gray, size: 16 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], color: C.gray, size: 16 }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { color: C.border, space: 1, style: BorderStyle.SINGLE, size: 4 } },
            }),
          ],
        }),
      },
      children: [
        // ═══════════════════════════════════════
        // PAGE DE COUVERTURE
        // ═══════════════════════════════════════
        new Paragraph({ children: [new TextRun('')], spacing: { before: 800, after: 0 } }),
        new Paragraph({
          children: [new TextRun({ text: 'IBIG SOFT', bold: true, color: C.accent, size: 36, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Intermark Business International Group', color: C.gray, size: 22, font: 'Calibri', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'IBIG SECRETIS', bold: true, color: C.primary, size: 72, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 160 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'ERP de Gestion de Secrétariat, Bureautique', bold: false, color: C.secondary, size: 30, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Assistanat de Direction & Organisation Planning', bold: false, color: C.secondary, size: 30, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'CAHIER DES CHARGES COMPLET', bold: true, color: C.white, size: 28, font: 'Calibri', highlight: 'none' })],
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.primary },
          spacing: { before: 0, after: 0 },
          indent: { left: 720, right: 720 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Version 1.0 — Juillet 2025', color: C.gray, size: 20, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: '« L\'excellence est notre passion »', italics: true, color: C.accent, size: 22, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 600 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'secretis.ibigsoft.com', color: C.secondary, size: 22, font: 'Calibri', underline: { type: UnderlineType.SINGLE } })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Contact : ibigsoft.com  |  ibigpartners.com', color: C.gray, size: 18, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
        }),
        pb(),

        // ═══════════════════════════════════════
        // FICHE D'IDENTITÉ DU PROJET
        // ═══════════════════════════════════════
        h1('1. FICHE D\'IDENTITÉ DU PROJET'),
        separator(),
        makeTable(
          ['Paramètre', 'Valeur'],
          [
            ['Nom du logiciel', 'IBIG SECRETIS'],
            ['Nom commercial court', 'SECRETIS'],
            ['Secteur d\'activité', 'Secrétariat, Bureautique, Assistanat de Direction, Organisation & Planning'],
            ['Domaine officiel', 'secretis.ibigsoft.com'],
            ['Éditeur', 'IBIG Soft'],
            ['Groupe', 'IBIG SARL — Intermark Business International Group'],
            ['Slogan éditeur', 'L\'excellence est notre passion'],
            ['Programme partenaire', 'IBIG PARTNERS — ibigpartners.com'],
            ['Mode de commercialisation', 'Logiciel SaaS sous licence'],
            ['Langues obligatoires', 'Français (par défaut) et Anglais'],
            ['Zone cible', 'Afrique, espace OHADA, marché international'],
            ['Devise principale', 'FCFA, avec support multidevise paramétrable'],
            ['Type d\'utilisation', 'Ordinateur, tablette, smartphone'],
            ['Architecture', 'Web App SaaS, multientreprise, multiutilisateur, PWA, responsive'],
            ['Framework recommandé', 'Laravel (backend) + React.js (frontend) + PostgreSQL'],
            ['Version document', '1.0 — Juillet 2025'],
            ['Confidentiel', 'Document propriétaire IBIG SARL — Usage interne et partenaires autorisés'],
          ],
          [3500, 5500]
        ),
        separator(),

        // ═══════════════════════════════════════
        // RÉSUMÉ EXÉCUTIF
        // ═══════════════════════════════════════
        pb(),
        h1('2. RÉSUMÉ EXÉCUTIF'),
        separator(),
        p('IBIG SECRETIS est un logiciel ERP SaaS de nouvelle génération, conçu spécifiquement pour centraliser, automatiser et digitaliser l\'ensemble des activités du secrétariat, de la bureautique, de l\'assistanat de direction et de la gestion organisationnelle. Il s\'adresse aux organisations de toutes tailles — entreprises, administrations, ONG, institutions académiques, cabinets et structures publiques — en Afrique et dans le monde entier.'),
        p('L\'objectif est de devenir le meilleur ERP dans ce domaine en Afrique et au niveau international, en offrant une expérience utilisateur sans équivalent local, une couverture fonctionnelle exhaustive et une intégration native de l\'intelligence artificielle à travers l\'assistant SARA.'),
        p('IBIG SECRETIS s\'inscrit dans l\'écosystème complet des solutions IBIG Soft, partageant la même architecture de commercialisation, la même console Superadministrateur, le même programme de partenariat IBIG PARTNERS et le même moteur de paiement multicanal.'),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 120, after: 120 } }),
        h3('Ambition stratégique'),
        bullet('Devenir la référence africaine et internationale du secrétariat numérique'),
        bullet('Remplacer les fichiers Excel, cahiers et outils épars par une plateforme unique'),
        bullet('Offrir à chaque secrétaire, assistante de direction et responsable administratif un outil de niveau Fortune 500'),
        bullet('Soutenir la transformation numérique des organisations africaines avec une solution adaptée aux réalités locales'),
        bullet('Générer des revenus récurrents pour IBIG Soft et ses partenaires IBIG PARTNERS'),

        // ═══════════════════════════════════════
        // CONTEXTE ET PROBLÉMATIQUE
        // ═══════════════════════════════════════
        pb(),
        h1('3. CONTEXTE ET PROBLÉMATIQUE'),
        separator(),
        h2('3.1 Contexte du marché'),
        p('En Afrique et dans les pays OHADA, la gestion du secrétariat reste largement artisanale : registres papier, fichiers Excel non partagés, courriers physiques non tracés, agendas personnels, réunions mal planifiées. Les organisations perdent un temps considérable et accumulent des risques opérationnels et juridiques.'),
        p('Le marché mondial des logiciels de gestion administrative est estimé à plusieurs milliards de dollars. En Afrique, ce marché est encore peu exploité par des solutions localisées, créant une opportunité exceptionnelle pour IBIG SECRETIS.'),
        h2('3.2 Problèmes identifiés'),
        bullet('Agenda et planning gérés sur papier ou des outils non partagés — risque de conflits et d\'oublis'),
        bullet('Courrier entrant et sortant non tracé — impossibilité d\'audit et de suivi'),
        bullet('Documents éparpillés dans plusieurs dossiers physiques et numériques — perte de temps et risque de perte'),
        bullet('Réunions mal organisées — pas de comptes rendus structurés, pas de suivi des décisions'),
        bullet('Accueil des visiteurs non tracé — manque de traçabilité et de sécurité'),
        bullet('Tâches déléguées sans suivi formalisé — retards et manque de responsabilisation'),
        bullet('Ressources (salles, véhicules, matériels) non gérées — conflits de réservation'),
        bullet('Absence de tableaux de bord — le dirigeant ne voit pas l\'état réel de son organisation'),
        bullet('Communication interne fragmentée — emails, WhatsApp, appels mélangés'),
        bullet('Notes de frais et absences gérées manuellement — erreurs et fraudes possibles'),
        h2('3.3 Solution apportée par IBIG SECRETIS'),
        p('IBIG SECRETIS centralise en une seule plateforme tous ces processus, avec un interface moderne, une assistance IA, des alertes automatiques, des rapports en temps réel et une accessibilité totale depuis tout appareil connecté.'),

        // ═══════════════════════════════════════
        // OBJECTIFS DU PROJET
        // ═══════════════════════════════════════
        pb(),
        h1('4. OBJECTIFS DU PROJET'),
        separator(),
        h2('4.1 Objectifs fonctionnels'),
        bullet('Centraliser la gestion de l\'agenda, du courrier, des documents, des tâches, de la communication, de l\'accueil, des ressources et des rapports'),
        bullet('Automatiser les rappels, les notifications, les relances et les rapports périodiques'),
        bullet('Permettre la collaboration en temps réel entre membres d\'une organisation'),
        bullet('Offrir une traçabilité complète de toutes les actions et opérations'),
        bullet('Intégrer un assistant IA (SARA) pour guider et assister les utilisateurs'),
        h2('4.2 Objectifs techniques'),
        bullet('Architecture SaaS multientreprise, multiutilisateur, sécurisée'),
        bullet('Application web responsive et PWA installable sur tous appareils'),
        bullet('Performance optimale même sur connexions lentes (contexte africain)'),
        bullet('Sécurité de niveau entreprise — chiffrement, MFA, audit trail'),
        bullet('API ouverte pour intégrations futures'),
        h2('4.3 Objectifs commerciaux'),
        bullet('Lancer avec un modèle d\'essai gratuit de 14 jours'),
        bullet('Proposer des offres flexibles adaptées à toutes les tailles de structures'),
        bullet('Déployer via le réseau de partenaires IBIG PARTNERS'),
        bullet('Cibler les administrations, entreprises, ONG, institutions et cabinets en Afrique'),
        bullet('Devenir leader sur le segment secrétariat/assistanat de direction en Afrique'),

        // ═══════════════════════════════════════
        // PUBLICS CIBLES
        // ═══════════════════════════════════════
        pb(),
        h1('5. PUBLICS CIBLES ET PROFILS UTILISATEURS'),
        separator(),
        h2('5.1 Types de structures'),
        makeTable(
          ['Type de structure', 'Exemples', 'Besoin principal'],
          [
            ['Entreprises privées', 'PME, grandes entreprises, groupes', 'Gestion administrative centralisée'],
            ['Administrations publiques', 'Ministères, mairies, préfectures', 'Courrier officiel, agenda des autorités'],
            ['Institutions académiques', 'Universités, lycées, écoles', 'Secrétariat pédagogique, plannings'],
            ['ONG & Associations', 'ONG, fondations, associations', 'Coordination, réunions, rapports'],
            ['Cabinets professionnels', 'Avocats, médecins, consultants', 'Rendez-vous, documents, facturation'],
            ['Hôpitaux & Cliniques', 'Centres de santé, cliniques', 'Accueil patients, planning médical'],
            ['Structures multisites', 'Banques, réseaux de succursales', 'Coordination multisite, flux centralisés'],
          ],
          [2500, 2500, 4000]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        h2('5.2 Profils utilisateurs'),
        makeTable(
          ['Profil', 'Rôle', 'Accès principal'],
          [
            ['Superadministrateur IBIG Soft', 'Gestion globale de la plateforme', 'Console Superadmin complète'],
            ['Administrateur organisation', 'Configuration, utilisateurs, modules', 'Tous les modules + paramètres'],
            ['Dirigeant / DG', 'Vision globale, décisions', 'Tableaux de bord, rapports, agenda'],
            ['Secrétaire de Direction', 'Gestion quotidienne du secrétariat', 'Agenda, courrier, réunions, visiteurs'],
            ['Assistante de Direction', 'Support au dirigeant', 'Agenda, tâches, communication, docs'],
            ['Responsable Administratif', 'Supervision administrative', 'Tous modules + statistiques'],
            ['Agent d\'accueil', 'Accueil des visiteurs', 'Module accueil + annuaire'],
            ['Chargé de communication', 'Communication interne', 'Messagerie, circulaires, annuaire'],
            ['Auditeur / Contrôleur', 'Contrôle et traçabilité', 'Lecture seule + journal d\'audit'],
            ['Agent opérationnel', 'Tâches spécifiques', 'Modules assignés uniquement'],
          ],
          [2500, 2500, 4000]
        ),

        // ═══════════════════════════════════════
        // CHARTE GRAPHIQUE
        // ═══════════════════════════════════════
        pb(),
        h1('6. CHARTE GRAPHIQUE ET IDENTITÉ VISUELLE IBIG SECRETIS'),
        separator(),
        h2('6.1 Positionnement visuel'),
        p('L\'identité visuelle d\'IBIG SECRETIS exprime le professionnalisme, la rigueur, la modernité et la confiance. Elle doit inspirer immédiatement la crédibilité d\'un outil de niveau international tout en restant accessible et agréable à utiliser au quotidien.'),
        h2('6.2 Palette de couleurs'),
        makeTable(
          ['Rôle', 'Couleur', 'Code HEX', 'Usage'],
          [
            ['Couleur primaire', 'Bleu Marine', '#1A3A5C', 'Header, titres principaux, boutons primaires'],
            ['Couleur secondaire', 'Bleu Vif', '#2E86C1', 'Liens, sous-titres, accents UI'],
            ['Couleur accentuation', 'Or / Ambre', '#F39C12', 'Badges, alertes positives, CTA secondaires'],
            ['Couleur de succès', 'Vert Forêt', '#1E8449', 'Statuts validés, confirmations'],
            ['Couleur d\'alerte', 'Orange', '#E67E22', 'Avertissements, délais proches'],
            ['Couleur de danger', 'Rouge', '#C0392B', 'Erreurs, suppressions, urgences'],
            ['Texte principal', 'Noir Doux', '#1C1C1C', 'Corps de texte, labels'],
            ['Texte secondaire', 'Gris', '#6C757D', 'Placeholders, métadonnées, sous-titres'],
            ['Fond principal', 'Blanc', '#FFFFFF', 'Arrière-plan des cartes et contenu'],
            ['Fond secondaire', 'Gris Clair', '#F5F7FA', 'Fond de page, zones inactives'],
            ['Bordures', 'Gris Moyen', '#BDC3C7', 'Séparateurs, bordures de tableaux'],
          ],
          [2200, 1500, 1500, 3800]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        h2('6.3 Typographie'),
        bullet('Police principale : Calibri ou Inter (sans-serif, lisible à toutes tailles)'),
        bullet('Titres H1 : 32px, Gras, Bleu Marine — pour les grandes sections'),
        bullet('Titres H2 : 24px, Gras, Bleu Vif — pour les sous-sections'),
        bullet('Titres H3 : 20px, Gras, Bleu Marine — pour les titres de modules'),
        bullet('Corps de texte : 14-16px, Normal, Noir Doux — justifié'),
        bullet('Labels de formulaires : 13px, Medium, Gris Foncé'),
        bullet('Métadonnées : 12px, Normal, Gris — dates, statuts, info secondaires'),
        h2('6.4 Logo et icônes'),
        bullet('Logo IBIG SECRETIS : combinaison du nom "SECRETIS" avec l\'identité visuelle IBIG Soft'),
        bullet('Favicon : initiales "IS" sur fond bleu marine'),
        bullet('Icônes : librairie cohérente (Font Awesome ou Phosphor Icons) — style outline'),
        bullet('Toutes les icônes doivent être uniformes en taille (16px, 20px, 24px selon contexte)'),
        h2('6.5 Composants UI'),
        bullet('Boutons primaires : fond bleu marine, texte blanc, coins arrondis 6px'),
        bullet('Boutons secondaires : bordure bleue, texte bleu, fond transparent'),
        bullet('Boutons danger : fond rouge, texte blanc'),
        bullet('Cartes : fond blanc, ombre légère (0 2px 8px rgba(0,0,0,0.08)), rayon 8px'),
        bullet('Tableaux : en-têtes bleu marine, lignes alternées bleu très clair et blanc'),
        bullet('Formulaires : champs avec bordure grise, focus en bleu secondaire, labels au-dessus'),
        bullet('Badges : coins très arrondis, couleurs sémantiques selon statut'),
        bullet('Mode clair obligatoire, mode sombre recommandé en phase 2'),

        // ═══════════════════════════════════════
        // ARCHITECTURE TECHNIQUE
        // ═══════════════════════════════════════
        pb(),
        h1('7. ARCHITECTURE TECHNIQUE'),
        separator(),
        h2('7.1 Stack technologique recommandé'),
        makeTable(
          ['Couche', 'Technologie', 'Justification'],
          [
            ['Backend', 'Laravel (PHP 8.2+)', 'Robuste, écosystème riche, parfait pour SaaS OHADA'],
            ['Frontend', 'React.js + Inertia.js ou Vue.js', 'SPA moderne, composants réutilisables'],
            ['Base de données', 'PostgreSQL', 'Fiabilité, performance, support JSON avancé'],
            ['Cache', 'Redis', 'Sessions, queues, rate limiting'],
            ['Files d\'attente', 'Laravel Queues + Redis', 'Emails, exports, imports asynchrones'],
            ['Stockage fichiers', 'S3 compatible (Cloudflare R2 ou AWS S3)', 'Documents, pièces jointes, exports'],
            ['Recherche', 'Meilisearch ou Algolia', 'Recherche globale rapide'],
            ['IA / SARA', 'Groq (défaut), OpenAI, Anthropic (configurable)', 'Multi-fournisseur sans redéploiement'],
            ['PWA', 'Service Worker + Manifest JSON', 'Installation mobile native-like'],
            ['Temps réel', 'Laravel Reverb ou Pusher', 'Notifications push, collaboration'],
            ['Emails', 'SMTP configurable (Mailgun, SendGrid, etc.)', 'Campagnes et transactionnel'],
            ['SMS / WhatsApp', 'Twilio, infobip ou API locale', 'Alertes et rappels'],
          ],
          [2000, 2500, 4500]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        h2('7.2 Architecture multientreprise (Multi-tenancy)'),
        bullet('Isolation complète des données par organization_id/tenant_id sur chaque table'),
        bullet('Aucune donnée d\'une organisation ne peut être visible par une autre'),
        bullet('Chaque organisation a ses propres paramètres, utilisateurs, modules actifs, logo, devise'),
        bullet('Tests automatisés d\'isolation interentreprises obligatoires avant mise en production'),
        h2('7.3 Sécurité'),
        bullet('HTTPS obligatoire — certificat SSL/TLS sur tous les domaines'),
        bullet('Chiffrement des données sensibles en base (clés API, mots de passe)'),
        bullet('Authentification JWT + sessions sécurisées'),
        bullet('MFA optionnelle (TOTP — Google Authenticator)'),
        bullet('Rate limiting sur toutes les routes publiques'),
        bullet('CSRF protection sur tous les formulaires'),
        bullet('Validation serveur systématique — ne jamais faire confiance au client'),
        bullet('Journal d\'audit complet de toutes les actions sensibles'),
        bullet('CSP, X-Frame-Options, HSTS et autres headers de sécurité'),

        // ═══════════════════════════════════════
        // MODULES MÉTIER — SECRETARIAT
        // ═══════════════════════════════════════
        pb(),
        h1('8. MODULES MÉTIER — DESCRIPTION DÉTAILLÉE'),
        separator(),
        p('IBIG SECRETIS est organisé en 10 modules métier interconnectés, auxquels s\'ajoutent les modules transversaux communs à tous les logiciels IBIG Soft (paiements, licences, SARA, support, etc.).'),

        // MODULE 1
        h2('MODULE 1 — AGENDA & PLANNING'),
        p('Le module central d\'IBIG SECRETIS. Il gère l\'intégralité des événements, rendez-vous et plannings de l\'organisation.'),
        h3('1.1 Calendrier'),
        bullet('Vues multiples : jour, semaine, mois, année, liste des événements'),
        bullet('Calendriers personnels, partagés par équipe, calendriers d\'organisation'),
        bullet('Création rapide d\'événements (clic sur un créneau)'),
        bullet('Événements récurrents (quotidien, hebdomadaire, mensuel, annuel, personnalisé)'),
        bullet('Couleurs personnalisables par type d\'événement'),
        bullet('Drag & Drop pour déplacer les événements'),
        bullet('Indicateur de disponibilité des participants'),
        bullet('Export du calendrier (PDF, ICS compatible Google Calendar / Outlook)'),
        bullet('Synchronisation bidirectionnelle avec Google Calendar (phase 2)'),
        h3('1.2 Rendez-vous et réunions'),
        bullet('Création de rendez-vous avec : titre, description, lieu, participants internes et externes, pièces jointes'),
        bullet('Invitation automatique des participants par email et notification interne'),
        bullet('Acceptation / refus des invitations avec confirmation'),
        bullet('Lien de visioconférence intégré (Google Meet, Zoom — URL saisie ou générée)'),
        bullet('Rappels configurables (15 min, 1h, 1 jour avant) par email, SMS et notification interne'),
        bullet('Compte rendu de réunion : éditeur de texte, participants, décisions, actions, responsables, délais'),
        bullet('Suivi des décisions prises en réunion avec affectation de tâches'),
        bullet('Historique complet de toutes les réunions avec compte rendu'),
        h3('1.3 Réservation de salles et ressources'),
        bullet('Catalogue des salles : nom, capacité, équipements, photo, disponibilité'),
        bullet('Réservation en ligne avec vérification automatique des conflits'),
        bullet('Approbation de réservation (option : validation par responsable)'),
        bullet('Planning de salle en vue calendrier'),
        bullet('Notification de confirmation et rappel avant la réservation'),
        bullet('Historique des réservations par salle'),
        h3('1.4 Planning d\'équipe'),
        bullet('Vue globale des agendas de tous les collaborateurs (selon droits)'),
        bullet('Détection automatique des conflits d\'agenda'),
        bullet('Suggestion de créneaux libres communs (IA SARA)'),
        bullet('Planification des congés et absences sur le calendrier'),

        separator(),
        // MODULE 2
        h2('MODULE 2 — COURRIER & GESTION ÉLECTRONIQUE DES DOCUMENTS (GED)'),
        h3('2.1 Registre du courrier'),
        bullet('Enregistrement du courrier entrant : date, expéditeur, référence, objet, pièces jointes numérisées, service destinataire, niveau d\'urgence'),
        bullet('Enregistrement du courrier sortant : date, destinataire, référence, objet, pièces jointes, état d\'envoi'),
        bullet('Numérotation automatique unique (format configurable : REF-ANNÉE-NUMÉRO)'),
        bullet('Suivi du traitement : En attente / En cours / Traité / Archivé'),
        bullet('Attribution du courrier à un service ou agent responsable'),
        bullet('Délai de traitement avec alerte si dépassement'),
        bullet('Recherche avancée dans le registre (par date, expéditeur, référence, mot-clé)'),
        bullet('Export du registre (PDF, Excel)'),
        h3('2.2 Gestion Électronique des Documents (GED)'),
        bullet('Arborescence de dossiers personnalisable par l\'organisation'),
        bullet('Upload de documents : PDF, Word, Excel, images, tous formats courants'),
        bullet('Métadonnées : titre, description, type, service, auteur, date, version, statut, mots-clés, confidentialité'),
        bullet('Versionnement : chaque nouvelle version est conservée avec historique'),
        bullet('Prévisualisation directe dans le navigateur (PDF, images, Office)'),
        bullet('Recherche plein texte dans les documents (OCR pour les PDF scannés — phase 2)'),
        bullet('Partage de documents avec lien temporaire ou accès direct'),
        bullet('Niveau de confidentialité : Public, Interne, Confidentiel, Très confidentiel'),
        bullet('Signature électronique (intégration Docusign ou équivalent — phase 2)'),
        bullet('Archivage automatique selon règles de rétention configurables'),
        h3('2.3 Modèles de documents'),
        bullet('Bibliothèque de modèles : lettres, notes de service, compte-rendus, rapports, convocations, attestations, PV'),
        bullet('Éditeur de modèles avec variables dynamiques ({NOM}, {DATE}, {RÉFÉRENCE}...)'),
        bullet('Génération de documents à partir d\'un modèle en un clic'),
        bullet('Personnalisation par organisation : logo, en-tête, pied de page, couleurs'),
        bullet('QR code de vérification sur les documents officiels'),

        separator(),
        // MODULE 3
        h2('MODULE 3 — RÉUNIONS & COMPTES RENDUS'),
        bullet('Planification de réunions depuis le calendrier ou le module dédié'),
        bullet('Ordre du jour structuré : ajout de points par les participants autorisés'),
        bullet('Distribution de l\'ODJ avant la réunion par email et notification'),
        bullet('Prise de notes en temps réel pendant la réunion (mode collaboratif)'),
        bullet('Rédaction du compte rendu avec validation par le président de séance'),
        bullet('Extraction automatique des décisions et points d\'action (IA SARA)'),
        bullet('Affectation des tâches issues des décisions directement dans le module Tâches'),
        bullet('Suivi des points non résolus lors de la prochaine réunion (points reports)'),
        bullet('Signature électronique du compte rendu par les participants'),
        bullet('Archivage automatique avec la date, les participants et le document final'),

        separator(),
        // MODULE 4
        h2('MODULE 4 — GESTION DES TÂCHES & PROJETS ADMINISTRATIFS'),
        h3('4.1 Tâches individuelles et collaboratives'),
        bullet('Création de tâches : titre, description, priorité (Urgent, Haute, Normale, Basse), date d\'échéance, responsable, observateurs'),
        bullet('Pièces jointes et commentaires sur chaque tâche'),
        bullet('Sous-tâches (liste de vérification ou tâches imbriquées)'),
        bullet('Statuts configurables : À faire / En cours / En révision / Terminé / Annulé'),
        bullet('Rappels automatiques avant l\'échéance (J-3, J-1, Jour J)'),
        bullet('Notification au responsable et aux observateurs à chaque changement de statut'),
        bullet('Historique complet des modifications sur chaque tâche'),
        h3('4.2 Vue Kanban'),
        bullet('Tableau Kanban drag & drop par statut'),
        bullet('Filtres : par responsable, priorité, date, service, module lié'),
        bullet('Vue compacte ou étendue des cartes'),
        h3('4.3 Vue Gantt'),
        bullet('Diagramme de Gantt pour les projets avec dépendances entre tâches'),
        bullet('Chemin critique automatique'),
        bullet('Export PDF du Gantt'),
        h3('4.4 Suivi de projets administratifs'),
        bullet('Création de projets : nom, description, dates, équipe, budget indicatif'),
        bullet('Regroupement de tâches par projet'),
        bullet('Tableau de bord par projet : avancement, retards, charge par personne'),
        bullet('Rapport de projet exportable'),

        separator(),
        // MODULE 5
        h2('MODULE 5 — COMMUNICATION INTERNE'),
        h3('5.1 Messagerie interne'),
        bullet('Conversations directes entre utilisateurs'),
        bullet('Groupes de discussion par équipe, projet ou département'),
        bullet('Envoi de fichiers et pièces jointes'),
        bullet('Notifications en temps réel (badge non lu, son configurable)'),
        bullet('Recherche dans les conversations'),
        bullet('Épinglage de messages importants'),
        h3('5.2 Circulaires et notes de service'),
        bullet('Rédaction de notes de service avec modèles prédéfinis'),
        bullet('Diffusion ciblée : par service, département, rôle, ou liste personnalisée'),
        bullet('Accusé de réception : voir qui a lu la note'),
        bullet('Pièces jointes et liens'),
        bullet('Archivage et consultation ultérieure'),
        h3('5.3 Annuaire de contacts'),
        bullet('Annuaire interne de tous les collaborateurs avec photo, poste, département, contacts'),
        bullet('Annuaire externe : clients, fournisseurs, partenaires, contacts officiels'),
        bullet('Fiches de contact complètes : coordonnées, historique des interactions'),
        bullet('Import/export CSV/Excel'),
        bullet('Recherche rapide par nom, service, téléphone, email'),
        h3('5.4 Tableau d\'affichage numérique'),
        bullet('Espace de publication d\'annonces générales'),
        bullet('Catégories : RH, Direction, Sécurité, Événements, Offres, Divers'),
        bullet('Date de publication et d\'expiration'),
        bullet('Épinglage et mise en avant des annonces importantes'),

        separator(),
        // MODULE 6
        h2('MODULE 6 — ACCUEIL & GESTION DES VISITEURS'),
        h3('6.1 Registre des visiteurs'),
        bullet('Enregistrement à l\'arrivée : nom, prénom, entreprise, téléphone, objet de la visite, personne visitée, heure d\'arrivée'),
        bullet('Départ : heure de sortie, remarques'),
        bullet('Photo facultative du visiteur'),
        bullet('Signature numérique du registre (tablette ou smartphone)'),
        bullet('Impression d\'un badge visiteur (PDF QR code)'),
        bullet('Historique complet et consultable'),
        h3('6.2 Rendez-vous en ligne (Portail visiteur public)'),
        bullet('Page publique de prise de rendez-vous (lien partageable)'),
        bullet('Choix du service, du motif et d\'un créneau disponible'),
        bullet('Confirmation automatique par email avec QR code'),
        bullet('Rappel SMS/email 24h avant'),
        bullet('Notification automatique de la personne visitée à l\'arrivée du visiteur'),
        h3('6.3 Gestion de la file d\'attente'),
        bullet('Attribution d\'un numéro de ticket virtuel à l\'arrivée'),
        bullet('Écran d\'affichage du numéro en cours (pour salle d\'attente)'),
        bullet('Notification sur smartphone du visiteur quand c\'est son tour'),
        h3('6.4 Sécurité et contrôle d\'accès'),
        bullet('Alerte automatique si un visiteur non attendu se présente'),
        bullet('Liste noire (visiteurs non autorisés)'),
        bullet('Rapport quotidien des passages'),

        separator(),
        // MODULE 7
        h2('MODULE 7 — RESSOURCES & STOCKS ADMINISTRATIFS'),
        h3('7.1 Gestion des salles et espaces'),
        bullet('Catalogue complet des salles, bureaux, espaces de travail'),
        bullet('Équipements disponibles par salle (vidéoprojecteur, climatisation, capacité)'),
        bullet('Réservation en ligne avec planning de disponibilité'),
        bullet('Rapport d\'utilisation par salle'),
        h3('7.2 Gestion du matériel'),
        bullet('Inventaire du matériel informatique et bureautique'),
        bullet('Attribution de matériel à un utilisateur'),
        bullet('Demande de matériel en ligne'),
        bullet('Maintenance et réparations : fiches d\'interventions'),
        bullet('Alertes de fin de garantie'),
        h3('7.3 Gestion des fournitures de bureau'),
        bullet('Stock de fournitures (stylos, papiers, cartouches, etc.)'),
        bullet('Demandes de réapprovisionnement'),
        bullet('Bons de commande internes'),
        bullet('Seuil d\'alerte de stock minimum'),
        h3('7.4 Gestion des véhicules de service'),
        bullet('Catalogue des véhicules (marque, modèle, immatriculation, état)'),
        bullet('Demande de mise à disposition d\'un véhicule'),
        bullet('Planning d\'utilisation des véhicules'),
        bullet('Carnet de bord numérique (kilométrage, carburant, chauffeur)'),
        bullet('Alertes : vidange, contrôle technique, assurance'),

        separator(),
        // MODULE 8
        h2('MODULE 8 — RESSOURCES HUMAINES LÉGÈRES'),
        p('Ce module ne remplace pas un SIRH complet mais couvre les besoins quotidiens du secrétariat en gestion du personnel.'),
        h3('8.1 Fiches du personnel'),
        bullet('Profil complet : identité, poste, service, contrat, date d\'embauche, contacts d\'urgence'),
        bullet('Documents RH : contrat, diplômes, attestations — stockés dans la GED'),
        bullet('Photo de profil et organigramme'),
        h3('8.2 Gestion des congés et absences'),
        bullet('Demande de congé en ligne par l\'employé'),
        bullet('Workflow d\'approbation : N+1 puis RH/Admin'),
        bullet('Solde de congés automatiquement calculé et mis à jour'),
        bullet('Calendrier des absences de l\'équipe'),
        bullet('Rapport mensuel des absences'),
        bullet('Types configurables : congé annuel, maladie, maternité, sans solde, récupération'),
        h3('8.3 Notes de frais'),
        bullet('Saisie des dépenses avec justificatifs numérisés'),
        bullet('Catégories : transport, hébergement, repas, divers'),
        bullet('Workflow de validation : manager puis comptabilité'),
        bullet('Rapport de frais par période et par agent'),
        bullet('Export pour traitement comptable'),
        h3('8.4 Planning des équipes'),
        bullet('Planning hebdomadaire/mensuel par service'),
        bullet('Affectation des agents aux plages horaires'),
        bullet('Vue globale des disponibilités'),
        bullet('Export PDF du planning'),

        separator(),
        // MODULE 9
        h2('MODULE 9 — RAPPORTS, STATISTIQUES & TABLEAUX DE BORD'),
        h3('9.1 Tableau de bord exécutif (Dirigeant)'),
        bullet('Nombre d\'événements de la semaine en cours'),
        bullet('Courriers en attente de traitement (avec délai dépassé en rouge)'),
        bullet('Tâches en retard par service'),
        bullet('Visiteurs du jour / de la semaine'),
        bullet('Absences du jour'),
        bullet('Ressources réservées aujourd\'hui'),
        bullet('Activité récente de l\'organisation'),
        bullet('Graphiques de tendances (courrier, réunions, visiteurs) par période'),
        h3('9.2 Tableau de bord Secrétariat'),
        bullet('Agenda du jour et de la semaine'),
        bullet('Tâches urgentes assignées'),
        bullet('Courriers à traiter'),
        bullet('Prochains visiteurs attendus'),
        bullet('Documents récemment modifiés'),
        bullet('Rappels et alertes'),
        h3('9.3 Rapports disponibles'),
        makeTable(
          ['Rapport', 'Contenu', 'Format'],
          [
            ['Registre du courrier', 'Entrées/sorties par période avec statuts', 'PDF, Excel'],
            ['Rapport de réunions', 'Liste des réunions, participants, décisions', 'PDF, Excel'],
            ['Rapport de tâches', 'Avancement par service/responsable/période', 'PDF, Excel'],
            ['Rapport des visiteurs', 'Flux de visiteurs par jour/semaine/mois', 'PDF, Excel'],
            ['Rapport d\'absences', 'Absences et congés par agent/période', 'PDF, Excel'],
            ['Rapport d\'utilisation salles', 'Taux d\'occupation des salles', 'PDF, Excel'],
            ['Rapport de stock', 'Niveaux de fournitures, mouvements', 'PDF, Excel'],
            ['Rapport d\'activité global', 'Vue synthétique de toute l\'activité', 'PDF'],
            ['Journal d\'audit', 'Toutes les actions tracées dans le système', 'PDF, Excel'],
          ],
          [2500, 4000, 2500]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        h3('9.4 Personnalisation des tableaux de bord'),
        bullet('Chaque utilisateur peut personnaliser ses widgets de tableau de bord'),
        bullet('Filtres de période : aujourd\'hui, cette semaine, ce mois, trimestre, année, personnalisé'),
        bullet('Comparaison avec la période précédente'),
        bullet('Export de n\'importe quel rapport en un clic'),

        separator(),
        // MODULE 10
        h2('MODULE 10 — PARAMÈTRES & ADMINISTRATION DE L\'ORGANISATION'),
        h3('10.1 Configuration de l\'organisation'),
        bullet('Identité : raison sociale, logo, adresse, téléphone, email, site web, devise'),
        bullet('Structure : services, départements, sites/agences, organigramme'),
        bullet('Exercice administratif et règles de numérotation des documents'),
        bullet('Langues, fuseau horaire, format de date'),
        h3('10.2 Gestion des utilisateurs'),
        bullet('Invitation par email avec lien d\'activation sécurisé'),
        bullet('Activation, suspension, désactivation des comptes'),
        bullet('Changement de rôle, service ou site'),
        bullet('Réinitialisation du mot de passe par l\'administrateur'),
        bullet('Historique des connexions et appareils'),
        h3('10.3 Rôles et permissions (RBAC)'),
        bullet('Rôles prédéfinis (voir section 5.2) et rôles personnalisés'),
        bullet('Permissions granulaires par module : voir, créer, modifier, supprimer, valider, exporter'),
        bullet('Contrôle des permissions à 5 niveaux : menu, route, contrôleur, service, API'),
        bullet('Masquer un bouton ne constitue jamais une sécurité — contrôle serveur obligatoire'),
        h3('10.4 Notifications'),
        bullet('Canal : application, email, SMS, WhatsApp'),
        bullet('Règles configurables par événement et par rôle'),
        bullet('Préférences individuelles dans les limites définies par l\'administrateur'),
        h3('10.5 Intégrations'),
        bullet('Messagerie email (SMTP)'),
        bullet('WhatsApp Business API'),
        bullet('Google Calendar (phase 2)'),
        bullet('API et webhooks configurables'),
        bullet('Stockage cloud S3'),

        // ═══════════════════════════════════════
        // ASSISTANT IA SARA
        // ═══════════════════════════════════════
        pb(),
        h1('9. ASSISTANT INTELLIGENT SARA'),
        separator(),
        h2('9.1 Présentation'),
        p('SARA (Smart Administrative and Resource Assistant) est l\'assistante intelligente intégrée à IBIG SECRETIS. Elle accompagne les visiteurs sur la landing page, les utilisateurs dans l\'espace interne, et les agents dans le centre d\'aide. Elle est propulsée par Groq (par défaut) avec architecture multifournisseur configurable.'),
        h2('9.2 Fonctions publiques (Landing Page)'),
        bullet('Présenter IBIG SECRETIS et ses modules'),
        bullet('Répondre aux questions sur les tarifs, l\'essai gratuit, les fonctionnalités'),
        bullet('Guider vers la demande de démonstration ou l\'inscription'),
        bullet('Expliquer l\'installation PWA'),
        bullet('Orienter vers le support si nécessaire'),
        h2('9.3 Fonctions internes (Espace authentifié)'),
        bullet('Suggérer des créneaux libres en analysant l\'agenda (SARA Planning)'),
        bullet('Extraire les décisions et points d\'action des comptes rendus de réunion'),
        bullet('Aider à rédiger des lettres, notes de service, convocations à partir d\'un contexte'),
        bullet('Expliquer les menus et procédures du logiciel'),
        bullet('Proposer l\'ouverture d\'un ticket de support'),
        bullet('Rechercher dans le guide utilisateur et les FAQ'),
        h2('9.4 Garde-fous obligatoires'),
        bullet('Ne jamais inventer une fonctionnalité, un tarif ou une information non confirmée'),
        bullet('Ne jamais divulguer de données confidentielles d\'un autre utilisateur ou organisation'),
        bullet('Répondre dans la langue de l\'utilisateur'),
        bullet('Reconnaître les limites et proposer un contact humain si nécessaire'),
        bullet('Ne jamais exécuter une action sensible sans confirmation explicite'),
        h2('9.5 Architecture technique'),
        bullet('Fournisseur par défaut : Groq (faible latence, coût maîtrisé)'),
        bullet('Fournisseurs alternatifs : OpenAI, Anthropic, Mistral, Google — configurable sans redéploiement'),
        bullet('Base de connaissances RAG : guide utilisateur, FAQ, modules actifs, offres'),
        bullet('Paramètres depuis la console Superadmin : fournisseur, modèle, quota, historique, coûts'),
        bullet('Clés API chiffrées, jamais exposées au navigateur'),

        // ═══════════════════════════════════════
        // MODULE DE PAIEMENT
        // ═══════════════════════════════════════
        pb(),
        h1('10. MODULE DE PAIEMENT MULTICANAL'),
        separator(),
        p('Le module de paiement d\'IBIG SECRETIS gère les licences et abonnements via 10 familles de moyens de paiement, tous configurables depuis la console sans toucher au code.'),
        makeTable(
          ['#', 'Moyen de paiement', 'Options', 'Validation'],
          [
            ['1', 'Mobile Money', 'Orange Money, MTN MoMo, Wave, Moov, Airtel', 'Manuelle (preuve uploadée)'],
            ['2', 'Paiement électronique', 'Moneroo, CinetPay, FedaPay, Paystack, Flutterwave, Stripe', 'Automatique (webhook signé)'],
            ['3', 'Virement bancaire national', 'RIB/IBAN national', 'Manuelle (preuve uploadée)'],
            ['4', 'Virement international', 'IBAN, BIC/SWIFT', 'Manuelle (preuve uploadée)'],
            ['5', 'Transfert d\'argent', 'Western Union, MoneyGram, Ria', 'Manuelle (numéro MTCN)'],
            ['6', 'Espèces en agence', 'Points de collecte partenaires', 'Code de reçu saisi par client'],
            ['7', 'Chèque bancaire', 'Envoi postal ou dépôt en agence', 'Manuelle après encaissement'],
            ['8', 'Cryptomonnaie', 'USDT, Bitcoin, Ethereum (TRC20/ERC20)', 'Manuelle (hash blockchain)'],
            ['9', 'Voucher / code prépayé', 'Codes générés en lot par l\'admin', 'Automatique (vérification code)'],
            ['10', 'Paiement à la livraison', 'Zones configurables, agents autorisés', 'Confirmation par agent'],
          ],
          [500, 2200, 3000, 3300]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        h2('10.1 Règles de sécurité absolues'),
        bullet('La licence n\'est jamais activée sur le simple retour client — uniquement via webhook vérifié ou validation admin'),
        bullet('Chaque webhook est vérifié par signature HMAC'),
        bullet('Idempotence : un même paiement ne peut activer la licence qu\'une seule fois'),
        bullet('Preuves de paiement stockées en espace privé (jamais dans /public)'),
        bullet('Mode test et production séparés, clés chiffrées'),
        bullet('Journal complet : paiements réussis, en attente, échoués, remboursements'),

        // ═══════════════════════════════════════
        // OFFRES ET LICENCES
        // ═══════════════════════════════════════
        pb(),
        h1('11. OFFRES ET LICENCES'),
        separator(),
        h2('11.1 Cycle de vie d\'une licence'),
        p('Essai gratuit (14 jours) → En attente paiement → Active → Grâce (7 jours) → Expirée → Suspendue/Révoquée'),
        h2('11.2 Tableau des offres proposées'),
        makeTable(
          ['Offre', 'Utilisateurs', 'Modules', 'Support', 'Prix indicatif'],
          [
            ['Starter (Essai)', '1-5', 'Agenda, Courrier, Tâches', 'Email', 'Gratuit 14 jours'],
            ['PME', 'Jusqu\'à 20', 'Tous modules de base', 'Email + Chat', 'Sur devis (FCFA/mois)'],
            ['Entreprise', 'Jusqu\'à 100', 'Tous modules + API', 'Email + Chat + Tel', 'Sur devis (FCFA/mois)'],
            ['Institution', 'Illimité', 'Tous modules + Personnalisation', 'Dédié 24/7', 'Sur devis annuel'],
            ['Multisite', 'Illimité + multi-agences', 'Complet + multi-entités', 'Dédié', 'Sur devis'],
          ],
          [1800, 1700, 2500, 2000, 2000]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        h2('11.3 Sécurité anti-fuite des licences'),
        bullet('Aucune logique de licence exposée dans le JavaScript client'),
        bullet('Toutes les routes premium protégées par middleware serveur'),
        bullet('Vérification basée sur la date serveur, jamais le client'),
        bullet('Désactiver une licence coupe immédiatement l\'accès même sur session ouverte'),
        bullet('Test explicite : 0 route premium sans contrôle de licence avant production'),

        // ═══════════════════════════════════════
        // EMAILS AUTOMATIQUES
        // ═══════════════════════════════════════
        pb(),
        h1('12. CYCLE D\'EMAILS AUTOMATIQUES'),
        separator(),
        makeTable(
          ['#', 'Déclencheur', 'Objet de l\'email', 'CTA principal'],
          [
            ['1', 'Inscription / Création de compte', 'Bienvenue — votre essai gratuit est activé', 'Ouvrir mon espace'],
            ['2', 'J-7 avant échéance', 'Votre essai arrive à échéance dans 7 jours', 'Activer / Renouveler'],
            ['3', 'J-3 avant échéance', 'Plus que 3 jours avant l\'échéance', 'Activer / Renouveler'],
            ['4', 'J-1 avant échéance', 'Votre accès expire dans moins de 24 heures', 'Activer / Renouveler'],
            ['5', 'Paiement réussi', 'Reçu de paiement — abonnement SECRETIS', 'Ouvrir mon espace'],
            ['6', 'J+1 après expiration', 'Votre accès a expiré — réactivez maintenant', 'Réactiver'],
            ['7', 'Mot de passe oublié', 'Réinitialisation de votre mot de passe', 'Réinitialiser'],
            ['8', 'Demande de démo', 'Votre demande de démonstration a été reçue', 'Consulter ma demande'],
            ['9', 'Offre envoyée', 'Votre offre personnalisée est disponible', 'Voir l\'offre'],
            ['10', 'Ticket créé', 'Votre demande a été enregistrée', 'Suivre le ticket'],
            ['11', 'Ticket résolu', 'Votre demande a été traitée', 'Consulter la réponse'],
            ['12', 'Compte suspendu', 'Information importante concernant votre compte', 'Contacter le support'],
            ['13', 'Connexion suspecte', 'Nouvelle connexion détectée', 'Vérifier l\'activité'],
          ],
          [500, 2500, 3000, 3000]
        ),

        // ═══════════════════════════════════════
        // LANDING PAGE
        // ═══════════════════════════════════════
        pb(),
        h1('13. LANDING PAGE — secretis.ibigsoft.com'),
        separator(),
        p('La landing page d\'IBIG SECRETIS est un outil de vente actif, conçu pour convertir les visiteurs en essayeurs puis en clients. Elle couvre 34 zones administrables depuis la console Superadmin.'),
        makeTable(
          ['Zone', 'Contenu'],
          [
            ['1. Barre supérieure', 'Essai gratuit, téléphone, email, sélecteur de langue'],
            ['2. Header', 'Logo, navigation, connexion, essai gratuit, démonstration, PWA'],
            ['3. Hero dynamique', '5 slides : promesse, gain de temps, mobilité, IA SARA, sécurité'],
            ['4. Appels à l\'action', 'Essayer gratuitement / Demander une démonstration'],
            ['5. Preuves de confiance', 'Édité par IBIG Soft, données sécurisées, support disponible'],
            ['6. Présentation', 'Résumé du logiciel avec capture du tableau de bord'],
            ['7. Problèmes résolus', 'Avant/Après : fichiers épars → plateforme centralisée'],
            ['8. Bénéfices majeurs', '12 bénéfices en cartes icônes'],
            ['9. Fonctionnalités', '10 fonctionnalités clés avec capture'],
            ['10. Modules', 'Présentation des 10 modules avec descriptions'],
            ['11. Démonstration visuelle', 'Galerie de captures réelles du logiciel'],
            ['12. Vidéo de présentation', 'Courte vidéo 2-3 min présentant IBIG SECRETIS'],
            ['13. Publics concernés', 'PME, administrations, ONG, cabinets, hôpitaux, académique'],
            ['14. Comment ça marche', '5 étapes : compte → config → équipe → modules → tableau de bord'],
            ['15. Tableaux de bord vitrine', 'KPI, graphiques, alertes, rapports'],
            ['16. Exports et documents', 'PDF, Excel, QR code, modèles professionnels'],
            ['17. Intégrations', 'Mobile Money, CinetPay, WhatsApp, IA, stockage cloud'],
            ['18. Section SARA', 'Présentation de l\'assistante IA SARA'],
            ['19. Bouton SARA flottant', 'Bas à droite, badge En ligne, fenêtre de chat'],
            ['20. PWA et installation', 'Installation sur Android, iOS, Windows, Mac'],
            ['21. Sécurité', 'Chiffrement, MFA, audit trail, isolation des données'],
            ['22. Avantages IBIG Soft', 'Solutions africaines, accompagnement, mises à jour'],
            ['23. Offres et comparateur', 'Tableau de tarifs, badge Recommandé, CTA'],
            ['24. Demande de démonstration', 'Formulaire complet + confirmation automatique'],
            ['25. Témoignages', 'Uniquement témoignages réels validés (masqué si vide)'],
            ['26. FAQ publique', 'Catégories + recherche + Poser une question à SARA'],
            ['27. Autres logiciels IBIG Soft', 'Promotion croisée des autres solutions du groupe'],
            ['28. IBIG PARTNERS', 'Programme partenaire, devenir revendeur, ibigpartners.com'],
            ['29. Centre d\'aide vitrine', 'Guide, FAQ, tickets, SARA, contact humain'],
            ['30. Appel à l\'action final', 'Essayer / Demander une démo / Parler à SARA'],
            ['31. WhatsApp flottant', 'Bas à gauche, discret, message prérempli'],
            ['32. Footer complet', '6 colonnes : identité, navigation, ressources, IBIG Soft, légal, contacts'],
            ['33. Pages légales', '18 pages : CGU, confidentialité, cookies, PI, SARA, etc.'],
            ['34. SEO, analytics, cookies', 'Balises meta, sitemap, consentement, statistiques de conversion'],
          ],
          [1800, 7200]
        ),

        // ═══════════════════════════════════════
        // CONSOLE SUPERADMIN
        // ═══════════════════════════════════════
        pb(),
        h1('14. CONSOLE SUPERADMINISTRATEUR IBIG SOFT'),
        separator(),
        p('La console Superadmin est réservée exclusivement à IBIG Soft et assure le pilotage complet de la plateforme IBIG SECRETIS.'),
        h2('14.1 Tableau de bord global'),
        bullet('Prospects, essais actifs, conversions, clients actifs, revenus, RMR, RA'),
        bullet('Abonnements à renouveler, tickets ouverts, taux de satisfaction'),
        bullet('Santé technique : erreurs, CRON, SMTP, IA, sauvegardes, stockage'),
        h2('14.2 Gestion complète'),
        bullet('Prospects et CRM commercial'),
        bullet('Démonstrations planifiées et réalisées'),
        bullet('Clients et organisations (profil complet, modules, paiements, historique)'),
        bullet('Abonnements et licences (activer, suspendre, modifier, prolonger)'),
        bullet('Paiements, factures, reçus, relances'),
        bullet('Offres commerciales et promotions'),
        bullet('Tickets de support et base de connaissances'),
        bullet('Configuration de SARA et des fournisseurs IA'),
        bullet('Landing page (administration des 34 zones)'),
        bullet('Analytics et statistiques de conversion'),
        bullet('Sauvegardes, logs, tâches CRON'),
        bullet('Programme IBIG PARTNERS et promotion croisée'),

        // ═══════════════════════════════════════
        // SÉCURITÉ & AUDIT
        // ═══════════════════════════════════════
        pb(),
        h1('15. SÉCURITÉ, JOURNAL D\'AUDIT ET CONFORMITÉ'),
        separator(),
        h2('15.1 Sécurité applicative'),
        makeTable(
          ['Domaine', 'Mesures mises en place'],
          [
            ['Authentification', 'Hash bcrypt/argon2, MFA TOTP, sessions expirables, limite de tentatives'],
            ['Autorisation', 'RBAC/ABAC, contrôle 5 niveaux, isolation multi-tenant'],
            ['Injections', 'ORM paramétré, validation serveur systématique, CSP'],
            ['XSS', 'Échappement HTML, Content Security Policy, tokens CSRF'],
            ['Fichiers', 'Validation MIME, antivirus optionnel, stockage privé'],
            ['API', 'Rate limiting, versionnement, scopes, pas de stack trace en prod'],
            ['Secrets', 'Chiffrement en base, jamais dans les logs, rotation des clés'],
            ['Transport', 'HTTPS obligatoire, HSTS, headers de sécurité'],
            ['Sessions', 'Expiration configurable, déconnexion à distance, historique appareils'],
          ],
          [2500, 6500]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        h2('15.2 Journal d\'audit'),
        p('Toutes les actions sensibles sont journalisées : connexion, création, modification, suppression, export, import, paiement, validation, changement de permission, prise en main, génération de document.'),
        bullet('Chaque entrée : utilisateur, organisation, rôle, action, module, ressource, ancienne/nouvelle valeur, date, heure, IP, appareil'),
        bullet('Journal consultable, filtrable, exportable depuis l\'interface'),
        bullet('Journal protégé contre les modifications ordinaires'),
        bullet('Politique de rétention configurable'),

        // ═══════════════════════════════════════
        // GUIDE, SUPPORT, FORMATION
        // ═══════════════════════════════════════
        pb(),
        h1('16. GUIDE UTILISATEUR, SUPPORT ET FORMATION'),
        separator(),
        h2('16.1 Guide utilisateur complet'),
        bullet('Disponible dans le logiciel, en ligne, en PDF téléchargeable, en français et en anglais'),
        bullet('Couvrant tous les modules, toutes les procédures, tous les rôles'),
        bullet('Searchable par SARA et par moteur de recherche interne'),
        bullet('Versionné et synchronisé avec la version du logiciel'),
        h2('16.2 100 FAQ minimum'),
        bullet('10 FAQ générales · 10 connexion/sécurité · 10 utilisateurs · 10 paramètres · 20 modules métier · 10 imports/exports · 10 documents · 5 abonnements · 5 sauvegardes · 5 SARA · 5 support'),
        bullet('Chaque FAQ : question, réponse, procédure, rôle, mots-clés, lien guide, lien vidéo'),
        h2('16.3 Centre d\'aide unifié'),
        bullet('Guide + FAQ + vidéos + cas pratiques + nouveautés + état des services'),
        bullet('Aide contextuelle sur chaque page : icône ?, FAQ associées, tutoriels, ticket'),
        h2('16.4 Système de tickets de support'),
        bullet('Statuts : Nouveau → Ouvert → Attribué → En cours → En attente → Résolu → Fermé'),
        bullet('SLA, notifications, modèles de réponse, escalade, statistiques'),
        h2('16.5 Académie / Formation'),
        bullet('Parcours de formation par rôle et niveau'),
        bullet('Vidéos de démonstration par module'),
        bullet('Quiz et exercices pratiques'),
        bullet('Attestations de formation'),
        bullet('Bibliothèque de ressources téléchargeables (fiches, modèles, check-lists)'),

        // ═══════════════════════════════════════
        // PWA ET RESPONSIVE
        // ═══════════════════════════════════════
        pb(),
        h1('17. PWA, RESPONSIVITÉ ET ACCESSIBILITÉ'),
        separator(),
        h2('17.1 Application PWA'),
        bullet('Manifest.json complet (nom, icônes, couleurs, display standalone)'),
        bullet('Service Worker avec cache versionné et mode hors ligne'),
        bullet('Installation intelligente (bannière après 1ère interaction, mémorisation)'),
        bullet('Compatibilité Android, iOS (procédure Partager > Écran d\'accueil), Windows, Mac'),
        h2('17.2 Responsivité'),
        bullet('Testé sur 14 résolutions de 320px à 1920px en portrait et paysage'),
        bullet('Zéro scroll horizontal sur aucune page'),
        bullet('Navigation mobile (bottom navigation 4-5 items + Plus)'),
        bullet('Tableaux : scroll interne ou vue carte sur mobile'),
        bullet('Modales : plein écran ou bottom-sheet sur mobile'),
        h2('17.3 Accessibilité'),
        bullet('Navigation clavier complète, focus visible'),
        bullet('Contrastes WCAG AA minimum'),
        bullet('Labels sur tous les champs de formulaire'),
        bullet('Textes alternatifs sur toutes les images'),
        bullet('Zoom jusqu\'à 200% sans casser la mise en page'),

        // ═══════════════════════════════════════
        // IMPORTS, EXPORTS, DOCUMENTS
        // ═══════════════════════════════════════
        pb(),
        h1('18. IMPORTS, EXPORTS ET GESTION DES DOCUMENTS'),
        separator(),
        h2('18.1 Imports'),
        bullet('Moteur d\'import universel XLSX/CSV pour contacts, courriers, tâches, données RH'),
        bullet('Modèle téléchargeable, aperçu avant import, validation, rapport d\'erreurs'),
        bullet('Détection des doublons, choix créer/mettre à jour/ignorer'),
        h2('18.2 Exports'),
        bullet('PDF : logo organisation, titre, référence, date, pagination, QR code, pied de page'),
        bullet('XLSX : colonnes adaptées, formats, totaux, en-têtes figés, styles professionnels'),
        bullet('CSV : UTF-8, séparateur configurable, protection anti-formules malveillantes'),
        bullet('Export asynchrone pour gros volumes avec barre de progression'),
        h2('18.3 Documents générés'),
        bullet('Modèles personnalisables : en-tête, pied de page, logo, couleurs, police, marges'),
        bullet('QR code de vérification sur documents officiels (page secretis.ibigsoft.com/verify/{TOKEN})'),
        bullet('Numérotation unique et configurable'),
        bullet('Plusieurs modèles par type de document'),

        // ═══════════════════════════════════════
        // SAUVEGARDES
        // ═══════════════════════════════════════
        pb(),
        h1('19. SAUVEGARDES ET RESTAURATION'),
        separator(),
        bullet('Sauvegarde manuelle et planifiée (base + fichiers + paramètres)'),
        bullet('Chiffrement des sauvegardes, stockage distant (jamais dans /public)'),
        bullet('Rétention configurable, téléchargement sécurisé, notification d\'échec'),
        bullet('Restauration sécurisée en 10 étapes : sélection → vérification → avertissement → confirmation → sauvegarde préalable → maintenance → restauration → vérification → rapport → notification'),
        bullet('Une sauvegarde n\'est fiable que si sa restauration a été testée avec succès'),

        // ═══════════════════════════════════════
        // MULTILINGUE
        // ═══════════════════════════════════════
        h1('20. MULTILINGUE ET ORTHOGRAPHE'),
        separator(),
        bullet('Français (par défaut) et Anglais — toutes les chaînes externalisées, aucun texte en dur'),
        bullet('Détection automatique de la langue du navigateur, choix manuel mémorisé'),
        bullet('Formats de date, devise, nombre, pluriels adaptés à la langue'),
        bullet('SEO multilingue, URLs adaptées'),
        bullet('Vérification orthographique systématique avant chaque mise en production'),
        bullet('Vouvoiement par défaut dans les interfaces françaises'),

        // ═══════════════════════════════════════
        // PLAN DE DÉVELOPPEMENT
        // ═══════════════════════════════════════
        pb(),
        h1('21. PLAN DE DÉVELOPPEMENT PAR PHASES'),
        separator(),
        makeTable(
          ['Phase', 'Contenu', 'Durée estimée'],
          [
            ['Phase 1 — Audit & Architecture', 'Audit initial, architecture multitenant, design system, variables', '2-3 semaines'],
            ['Phase 2 — Socle critique', 'Auth, rôles/permissions, licences, paiements, sécurité, AppShell', '3-4 semaines'],
            ['Phase 3 — Modules métier (Part 1)', 'Agenda & Planning, Courrier & GED, Réunions, Tâches', '4-5 semaines'],
            ['Phase 4 — Modules métier (Part 2)', 'Communication, Accueil visiteurs, Ressources, RH légère', '4-5 semaines'],
            ['Phase 5 — Rapports & Tableaux de bord', 'Tableaux de bord, rapports, exports, statistiques', '2-3 semaines'],
            ['Phase 6 — Landing page', 'Landing page 34 zones, SEO, analytics, IBIG PARTNERS', '2-3 semaines'],
            ['Phase 7 — IA SARA', 'SARA publique et interne, RAG, multi-fournisseur, garde-fous', '2-3 semaines'],
            ['Phase 8 — Commercialisation', 'CRM prospects, démos, offres, relances, emails automatiques', '2-3 semaines'],
            ['Phase 9 — Documentation', 'Guide, 100 FAQ, cas pratiques, Académie, visite guidée', '3-4 semaines'],
            ['Phase 10 — Console Superadmin', 'Console complète IBIG Soft, analytics, prise en main sécurisée', '3-4 semaines'],
            ['Phase 11 — PWA & Responsivité', 'PWA complète, responsive toutes résolutions, accessibilité', '2-3 semaines'],
            ['Phase 12 — Recette & Déploiement', 'Tests complets, sécurité, performance, déploiement production', '2-3 semaines'],
          ],
          [2500, 4500, 2000]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        p('Durée totale estimée : 8 à 12 mois selon la taille de l\'équipe de développement. Un MVP (Phases 1 à 5) peut être livré en 4 à 6 mois.'),

        // ═══════════════════════════════════════
        // IBIG PARTNERS
        // ═══════════════════════════════════════
        pb(),
        h1('22. PROGRAMME IBIG PARTNERS ET PROMOTION CROISÉE'),
        separator(),
        h2('22.1 Programme IBIG PARTNERS'),
        p('IBIG SECRETIS intègre nativement le programme IBIG PARTNERS, permettant à tout partenaire de recommander le logiciel et de percevoir des commissions sur les ventes générées.'),
        bullet('Inscription gratuite sur ibigpartners.com'),
        bullet('Accès aux outils IBIG (fiches produits, vidéos, argumentaires)'),
        bullet('Suivi des recommandations et des conversions'),
        bullet('Commissions sur les ventes générées'),
        bullet('Espace partenaire dédié'),
        bullet('Accompagnement et formation commerciale'),
        p('⚠️ Ne jamais promettre un revenu garanti dans la communication.'),
        h2('22.2 Promotion croisée des autres logiciels IBIG Soft'),
        p('La landing page et l\'espace interne d\'IBIG SECRETIS présentent les autres solutions du groupe IBIG Soft avec lien vers ibigsoft.com.'),

        // ═══════════════════════════════════════
        // CRITÈRES DE VALIDATION
        // ═══════════════════════════════════════
        pb(),
        h1('23. CRITÈRES DE VALIDATION ET RECETTE FINALE'),
        separator(),
        h2('23.1 Indicateurs minimaux avant mise en production'),
        makeTable(
          ['Indicateur', 'Cible'],
          [
            ['Bugs bloquants connus', '0'],
            ['Failles critiques connues', '0'],
            ['Fuite interentreprises détectée', '0'],
            ['Routes premium sans contrôle de licence', '0'],
            ['Boutons principaux sans action', '0'],
            ['Clés secrètes exposées', '0'],
            ['Scroll horizontal global', '0 page'],
            ['Routes critiques testées', '100%'],
            ['Rôles critiques testés', '100%'],
            ['Documents critiques vérifiables (QR)', '100%'],
            ['Textes relus orthographiquement (FR + EN)', '100%'],
            ['Restauration de sauvegarde testée', 'Oui — succès confirmé'],
            ['Tests automatisés des parcours critiques', 'Tous réussis'],
          ],
          [5000, 4000]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 200, after: 0 } }),
        h2('23.2 Livrables obligatoires'),
        bullet('Code source complet, migrations propres, seeders nécessaires'),
        bullet('Variables d\'environnement documentées + .env.example'),
        bullet('Tests unitaires, intégration, fonctionnels, sécurité, non-régression'),
        bullet('Guides : installation, déploiement, rollback, sauvegardes, CRON, queues, SMTP, paiements, IA, Superadmin'),
        bullet('Guide utilisateur FR et EN (+ version PDF professionnelle)'),
        bullet('100 FAQ FR et EN + cas pratiques + structure Académie'),
        bullet('Matrice des rôles, matrice des modules, matrice de conformité'),
        bullet('Inventaire complet des routes'),
        bullet('Rapports : bugs corrigés, sécurité, licences, traduction, orthographe, responsive'),
        bullet('Changelog et numéro de version'),

        // ═══════════════════════════════════════
        // INTERDICTIONS
        // ═══════════════════════════════════════
        pb(),
        h1('24. INTERDICTIONS ABSOLUES'),
        separator(),
        bullet('Prétendre qu\'une fonctionnalité est terminée sans test réel'),
        bullet('Laisser des boutons décoratifs sans action'),
        bullet('Afficher de fausses statistiques ou faux indicateurs'),
        bullet('Créer de faux témoignages ou inventer des clients'),
        bullet('Inventer des coordonnées, prix, délais, fonctionnalités non validées'),
        bullet('Exposer une clé API ou une stack trace'),
        bullet('Contourner les autorisations ou masquer un bouton en croyant que cela suffit'),
        bullet('Supprimer des données sans migration ou sauvegarde préalable'),
        bullet('Laisser des textes non traduits ou codés en dur'),
        bullet('Coder les prix directement dans les vues (toujours depuis la base)'),
        bullet('Laisser des données d\'une société accessibles à une autre'),
        bullet('Activer une licence avant confirmation fiable du paiement'),
        bullet('Laisser SARA inventer des tarifs ou fonctionnalités'),
        bullet('Utiliser overflow-x: hidden pour masquer un problème responsive sans le corriger'),
        bullet('Annoncer une intégration inexistante comme disponible'),

        // ═══════════════════════════════════════
        // ANNEXES
        // ═══════════════════════════════════════
        pb(),
        h1('25. ANNEXES'),
        separator(),
        h2('Annexe A — Variables de configuration IBIG SECRETIS'),
        makeTable(
          ['Variable', 'Valeur'],
          [
            ['NOM DU LOGICIEL', 'IBIG SECRETIS'],
            ['SECTEUR D\'ACTIVITÉ', 'Secrétariat, Bureautique, Assistanat de Direction, Organisation & Planning'],
            ['DOMAINE OFFICIEL', 'secretis.ibigsoft.com'],
            ['ÉDITEUR', 'IBIG Soft'],
            ['SITE ÉDITEUR', 'https://ibigsoft.com'],
            ['GROUPE', 'IBIG SARL — Intermark Business International Group'],
            ['SLOGAN IBIG', 'L\'excellence est notre passion'],
            ['PROGRAMME PARTENAIRE', 'IBIG PARTNERS — https://ibigpartners.com/'],
            ['MODE DE COMMERCIALISATION', 'Logiciel SaaS sous licence'],
            ['LANGUES OBLIGATOIRES', 'Français (par défaut) et Anglais'],
            ['ZONE CIBLE', 'Afrique, espace OHADA, marché international'],
            ['DEVISE PRINCIPALE', 'FCFA, avec support multidevise paramétrable'],
            ['TYPE D\'UTILISATION', 'Ordinateur, tablette, smartphone'],
            ['ESSAI GRATUIT', '14 jours'],
            ['SARA — Fournisseur par défaut', 'Groq'],
            ['ARCHITECTURE', 'Application web responsive, SaaS multientreprise, PWA'],
          ],
          [3500, 5500]
        ),
        new Paragraph({ children: [new TextRun('')], spacing: { before: 300, after: 0 } }),
        h2('Annexe B — Message d\'accueil SARA (IBIG SECRETIS)'),
        new Paragraph({
          children: [
            new TextRun({ text: '« Bonjour, je suis SARA, l\'assistante intelligente d\'IBIG SECRETIS. Je peux vous présenter la solution, vous aider à choisir une formule ou organiser une démonstration. Comment puis-je vous aider ? »', italics: true, color: C.secondary, size: 20 }),
          ],
          spacing: { before: 120, after: 120 },
          alignment: AlignmentType.JUSTIFIED,
        }),
        h2('Annexe C — Questions rapides suggérées à SARA (Landing)'),
        bullet('Que fait IBIG SECRETIS ?'),
        bullet('À qui s\'adresse ce logiciel ?'),
        bullet('Quelles sont les fonctionnalités principales ?'),
        bullet('Combien coûte la licence ?'),
        bullet('Puis-je essayer gratuitement ?'),
        bullet('Comment demander une démonstration ?'),
        bullet('Comment installer l\'application sur mon téléphone ?'),
        bullet('Comment contacter IBIG Soft ?'),
        bullet('Quels modules sont disponibles ?'),
        bullet('Ce logiciel fonctionne-t-il sans connexion internet ?'),

        // Mention copyright finale
        separator(),
        new Paragraph({
          children: [
            new TextRun({ text: '© 2025 IBIG SECRETIS. Tous droits réservés.', bold: true, color: C.primary, size: 18 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Logiciel conçu, édité et exploité par IBIG Soft, une marque de IBIG SARL – Intermark Business International Group.', italics: true, color: C.gray, size: 16 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Toute reproduction, imitation, copie, adaptation, extraction ou utilisation non autorisée du logiciel, de son interface, de son logo, de ses textes, de sa documentation ou de son identité visuelle est interdite.', italics: true, color: C.gray, size: 16 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Découvrir l\'éditeur IBIG Soft → ibigsoft.com', color: C.secondary, size: 16, underline: { type: UnderlineType.SINGLE } }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('/sessions/peaceful-blissful-cray/mnt/outputs/IBIG_SECRETIS_Cahier_des_Charges_v1.0.docx', buffer);
  console.log('✅ Fichier généré avec succès.');
});
