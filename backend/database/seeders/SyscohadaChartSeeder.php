<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * SyscohadaChartSeeder — Plan comptable SYSCOHADA 2017 (OHADA)
 *
 * Insère les comptes système pour TOUTES les organisations.
 * Appelé depuis DatabaseSeeder ou via : php artisan db:seed --class=SyscohadaChartSeeder
 *
 * Pour une organisation spécifique : passer l'org_id en option
 *   php artisan db:seed --class=SyscohadaChartSeeder --org=1
 */
class SyscohadaChartSeeder extends Seeder
{
    /**
     * Plan comptable SYSCOHADA révisé 2017 — Classes 1 à 8
     * Format : [account_number, account_name, account_type, parent, ohada_class, is_leaf]
     */
    private array $accounts = [

        // =====================================================================
        // CLASSE 1 — RESSOURCES DURABLES (Capitaux)
        // =====================================================================
        ['10',   'Capital',                                      'capitaux', null, 1, false],
        ['101',  'Capital social',                               'capitaux', '10', 1, true],
        ['102',  'Primes liées au capital social',               'capitaux', '10', 1, true],
        ['104',  'Réserves légales',                             'capitaux', '10', 1, true],
        ['105',  'Réserves statutaires ou contractuelles',       'capitaux', '10', 1, true],
        ['106',  'Réserves réglementées',                        'capitaux', '10', 1, true],
        ['107',  'Écart de réévaluation',                        'capitaux', '10', 1, true],
        ['109',  'Actionnaires, capital souscrit non appelé',    'capitaux', '10', 1, true],

        ['11',   'Report à nouveau',                             'capitaux', null, 1, false],
        ['110',  'Report à nouveau (solde créditeur)',           'capitaux', '11', 1, true],
        ['119',  'Report à nouveau (solde débiteur)',            'capitaux', '11', 1, true],

        ['12',   'Résultat net de l\'exercice',                  'capitaux', null, 1, false],
        ['120',  'Résultat net : bénéfice',                      'capitaux', '12', 1, true],
        ['129',  'Résultat net : perte',                         'capitaux', '12', 1, true],

        ['13',   'Subventions d\'investissement',                'capitaux', null, 1, false],
        ['130',  'Subventions d\'investissement reçues',         'capitaux', '13', 1, true],
        ['131',  'Subventions d\'investissement inscrites au CR','capitaux', '13', 1, true],

        ['14',   'Provisions réglementées',                      'capitaux', null, 1, false],
        ['141',  'Provisions pour hausse des prix',              'capitaux', '14', 1, true],
        ['142',  'Amortissements dérogatoires',                  'capitaux', '14', 1, true],

        ['15',   'Provisions pour risques et charges',           'passif',   null, 1, false],
        ['151',  'Provisions pour risques',                      'passif',   '15', 1, true],
        ['158',  'Autres provisions pour charges',               'passif',   '15', 1, true],

        ['16',   'Emprunts et dettes assimilés',                 'passif',   null, 1, false],
        ['161',  'Emprunts obligataires',                        'passif',   '16', 1, true],
        ['162',  'Emprunts auprès établissements de crédit',     'passif',   '16', 1, true],
        ['163',  'Emprunts auprès des associés',                 'passif',   '16', 1, true],
        ['165',  'Dépôts et cautionnements reçus',               'passif',   '16', 1, true],
        ['168',  'Autres emprunts et dettes assimilés',          'passif',   '16', 1, true],

        ['17',   'Dettes de crédit-bail et contrats assimilés',  'passif',   null, 1, false],
        ['172',  'Dettes de crédit-bail mobilier',               'passif',   '17', 1, true],
        ['173',  'Dettes de crédit-bail immobilier',             'passif',   '17', 1, true],

        ['18',   'Dettes liées à des participations',            'passif',   null, 1, false],
        ['181',  'Comptes courants bloqués',                     'passif',   '18', 1, true],
        ['182',  'Dettes envers sociétés mères',                 'passif',   '18', 1, true],

        // =====================================================================
        // CLASSE 2 — ACTIF IMMOBILISÉ
        // =====================================================================
        ['20',   'Charges immobilisées',                         'actif',    null, 2, false],
        ['201',  'Frais de développement et de prospection',     'actif',    '20', 2, true],
        ['202',  'Brevets, licences, concessions',               'actif',    '20', 2, true],
        ['203',  'Logiciels et sites Internet',                  'actif',    '20', 2, true],
        ['204',  'Marques',                                      'actif',    '20', 2, true],
        ['207',  'Fonds commercial',                             'actif',    '20', 2, true],
        ['208',  'Autres immobilisations incorporelles',         'actif',    '20', 2, true],

        ['21',   'Terrains',                                     'actif',    null, 2, false],
        ['211',  'Terrains nus',                                 'actif',    '21', 2, true],
        ['212',  'Terrains bâtis',                               'actif',    '21', 2, true],
        ['213',  'Sites de gisement',                            'actif',    '21', 2, true],
        ['214',  'Terrains de gisement',                         'actif',    '21', 2, true],
        ['215',  'Terrains mis en concession',                   'actif',    '21', 2, true],

        ['22',   'Bâtiments',                                    'actif',    null, 2, false],
        ['221',  'Bâtiments sur sol propre',                     'actif',    '22', 2, true],
        ['222',  'Bâtiments sur sol d\'autrui',                  'actif',    '22', 2, true],
        ['223',  'Ouvrages d\'infrastructure',                   'actif',    '22', 2, true],
        ['224',  'Installations techniques de voirie',           'actif',    '22', 2, true],
        ['225',  'Aménagements et agencements',                  'actif',    '22', 2, true],

        ['23',   'Autres immobilisations corporelles',           'actif',    null, 2, false],
        ['231',  'Matériel',                                     'actif',    '23', 2, true],
        ['232',  'Matériel de transport',                        'actif',    '23', 2, true],
        ['233',  'Matériel de bureau, informatique, mobilier',   'actif',    '23', 2, true],
        ['234',  'Matériel spécialisé',                         'actif',    '23', 2, true],
        ['235',  'Cheptel',                                      'actif',    '23', 2, true],
        ['238',  'Autres immobilisations corporelles',           'actif',    '23', 2, true],

        ['24',   'Matériel',                                     'actif',    null, 2, false],

        ['25',   'Avances et acomptes versés sur immobilisations','actif',   null, 2, false],
        ['251',  'Avances et acomptes versés — immob. incorp.',  'actif',    '25', 2, true],
        ['252',  'Avances et acomptes versés — immob. corp.',    'actif',    '25', 2, true],

        ['26',   'Titres de participation',                      'actif',    null, 2, false],
        ['261',  'Titres de participation',                      'actif',    '26', 2, true],
        ['265',  'Autres titres immobilisés',                    'actif',    '26', 2, true],
        ['266',  'Autres formes de participation',               'actif',    '26', 2, true],

        ['27',   'Autres immobilisations financières',           'actif',    null, 2, false],
        ['271',  'Prêts et créances non commerciales',           'actif',    '27', 2, true],
        ['272',  'Créances rattachées à des participations',     'actif',    '27', 2, true],
        ['274',  'Titres immobilisés',                           'actif',    '27', 2, true],
        ['275',  'Dépôts et cautionnements versés',              'actif',    '27', 2, true],
        ['276',  'Autres créances immobilisées',                 'actif',    '27', 2, true],

        ['28',   'Amortissements des immobilisations',           'actif',    null, 2, false],
        ['281',  'Amortissements des immobilisations incorporelles','actif', '28', 2, true],
        ['282',  'Amortissements des terrains',                  'actif',    '28', 2, true],
        ['283',  'Amortissements des bâtiments',                 'actif',    '28', 2, true],
        ['284',  'Amortissements autres immob. corporelles',     'actif',    '28', 2, true],

        ['29',   'Dépréciations des immobilisations',            'actif',    null, 2, false],
        ['291',  'Dépréciations des immobilisations incorporelles','actif',  '29', 2, true],
        ['292',  'Dépréciations des terrains',                   'actif',    '29', 2, true],
        ['293',  'Dépréciations des bâtiments',                  'actif',    '29', 2, true],
        ['294',  'Dépréciations autres immob. corporelles',      'actif',    '29', 2, true],
        ['296',  'Dépréciations des titres de participation',    'actif',    '29', 2, true],
        ['297',  'Dépréciations autres immob. financières',      'actif',    '29', 2, true],

        // =====================================================================
        // CLASSE 3 — ACTIF CIRCULANT (Stocks)
        // =====================================================================
        ['30',   'Stocks de marchandises',                       'actif',    null, 3, false],
        ['31',   'Matières premières et fournitures',            'actif',    null, 3, false],
        ['311',  'Matières premières',                           'actif',    '31', 3, true],
        ['312',  'Matières de conditionnement',                  'actif',    '31', 3, true],
        ['313',  'Matières consommables',                        'actif',    '31', 3, true],
        ['318',  'Autres matières et fournitures',               'actif',    '31', 3, true],

        ['32',   'Autres approvisionnements',                    'actif',    null, 3, false],
        ['33',   'Encours de production de biens',               'actif',    null, 3, false],
        ['34',   'Encours de production de services',            'actif',    null, 3, false],
        ['35',   'Stocks de produits finis',                     'actif',    null, 3, false],
        ['36',   'Produits intermédiaires et résiduels',         'actif',    null, 3, false],
        ['37',   'Stocks de marchandises (autres)',              'actif',    null, 3, false],
        ['38',   'Stocks en cours de route',                     'actif',    null, 3, false],
        ['39',   'Dépréciations des stocks',                     'actif',    null, 3, false],

        // =====================================================================
        // CLASSE 4 — ACTIF CIRCULANT (Créances et dettes)
        // =====================================================================
        ['40',   'Fournisseurs et comptes rattachés',            'passif',   null, 4, false],
        ['401',  'Fournisseurs',                                 'passif',   '40', 4, true],
        ['402',  'Fournisseurs — effets à payer',                'passif',   '40', 4, true],
        ['408',  'Fournisseurs — factures non parvenues',        'passif',   '40', 4, true],
        ['409',  'Fournisseurs débiteurs',                       'actif',    '40', 4, true],

        ['41',   'Clients et comptes rattachés',                 'actif',    null, 4, false],
        ['411',  'Clients',                                      'actif',    '41', 4, true],
        ['412',  'Clients — effets à recevoir',                  'actif',    '41', 4, true],
        ['413',  'Clients — effets escomptés',                   'actif',    '41', 4, true],
        ['416',  'Clients douteux ou litigieux',                 'actif',    '41', 4, true],
        ['418',  'Clients — produits non encore facturés',       'actif',    '41', 4, true],
        ['419',  'Clients créditeurs — avances reçues',          'passif',   '41', 4, true],

        ['42',   'Personnel',                                    'passif',   null, 4, false],
        ['421',  'Personnel — rémunérations dues',               'passif',   '42', 4, true],
        ['422',  'Personnel — acomptes et avances consentis',    'actif',    '42', 4, true],
        ['423',  'Personnel — oppositions saisies-arrêts',       'passif',   '42', 4, true],
        ['424',  'Personnel — oeuvres sociales internes',        'passif',   '42', 4, true],
        ['425',  'Personnel — dépôts',                          'passif',   '42', 4, true],
        ['426',  'Personnel — participation aux résultats',      'passif',   '42', 4, true],
        ['428',  'Personnel — charges à payer et produits',      'passif',   '42', 4, true],

        ['43',   'Organismes sociaux',                           'passif',   null, 4, false],
        ['431',  'CNPS — cotisations à payer',                   'passif',   '43', 4, true],
        ['432',  'Caisses de retraite complémentaires',          'passif',   '43', 4, true],
        ['438',  'Organismes sociaux — charges à payer',         'passif',   '43', 4, true],

        ['44',   'État et collectivités publiques',              'passif',   null, 4, false],
        ['441',  'État — impôts et taxes recouvrables',          'actif',    '44', 4, true],
        ['442',  'État — impôts et taxes retenus à la source',   'passif',   '44', 4, true],
        ['443',  'État — TVA facturée',                          'passif',   '44', 4, true],
        ['4431', 'TVA collectée sur ventes',                     'passif',   '443', 4, true],
        ['444',  'État — TVA due ou crédit de TVA',              'passif',   '44', 4, true],
        ['4441', 'TVA déductible sur achats',                    'actif',    '444', 4, true],
        ['4447', 'TVA à décaisser',                              'passif',   '444', 4, true],
        ['445',  'État — taxes sur le chiffre d\'affaires',      'passif',   '44', 4, true],
        ['447',  'État — autres impôts et taxes',                'passif',   '44', 4, true],
        ['448',  'État — charges à payer et produits',           'passif',   '44', 4, true],

        ['45',   'Organismes internationaux',                    'passif',   null, 4, false],
        ['46',   'Associés et groupe',                           'passif',   null, 4, false],

        ['47',   'Débiteurs et créditeurs divers',               'actif',    null, 4, false],
        ['471',  'Débiteurs divers',                             'actif',    '47', 4, true],
        ['472',  'Versements restant à effectuer',               'passif',   '47', 4, true],
        ['476',  'Charges constatées d\'avance',                 'actif',    '47', 4, true],
        ['477',  'Produits constatés d\'avance',                 'passif',   '47', 4, true],
        ['478',  'Produits à recevoir',                          'actif',    '47', 4, true],
        ['479',  'Charges à payer',                              'passif',   '47', 4, true],

        ['48',   'Dettes pour achats d\'immobilisations',        'passif',   null, 4, false],
        ['49',   'Dépréciations et provisions pour risques',     'actif',    null, 4, false],
        ['491',  'Dépréciations des comptes clients',            'actif',    '49', 4, true],

        // =====================================================================
        // CLASSE 5 — TRÉSORERIE
        // =====================================================================
        ['50',   'Titres de placement',                          'actif',    null, 5, false],
        ['51',   'Banques, établissements financiers — chèques', 'actif',    null, 5, false],
        ['511',  'Banque centrale',                              'actif',    '51', 5, true],
        ['512',  'Banques locales',                              'actif',    '51', 5, true],
        ['513',  'Banques sous-régionales',                      'actif',    '51', 5, true],
        ['514',  'Chèques postaux',                              'actif',    '51', 5, true],
        ['515',  'Virements de fonds en attente',                'actif',    '51', 5, true],

        ['52',   'Établissements financiers et assimilés',       'actif',    null, 5, false],
        ['521',  'Crédits d\'escompte',                         'passif',   '52', 5, true],
        ['522',  'Crédits de trésorerie',                        'passif',   '52', 5, true],
        ['524',  'Mobilisation de créances commerciales',        'actif',    '52', 5, true],

        ['53',   'Caisses des filiales et succursales',          'actif',    null, 5, false],
        ['57',   'Caisse',                                       'actif',    null, 5, false],
        ['571',  'Caisse siège social',                          'actif',    '57', 5, true],
        ['572',  'Caisse succursales',                           'actif',    '57', 5, true],
        ['578',  'Autres caisses',                               'actif',    '57', 5, true],

        ['58',   'Régies d\'avances et accréditifs',             'actif',    null, 5, false],
        ['59',   'Dépréciations des titres de placement',        'actif',    null, 5, false],

        // =====================================================================
        // CLASSE 6 — CHARGES DES ACTIVITÉS ORDINAIRES
        // =====================================================================
        ['60',   'Achats et variations de stocks',               'charge',   null, 6, false],
        ['601',  'Achats de marchandises',                       'charge',   '60', 6, true],
        ['602',  'Achats de matières premières et fournitures',  'charge',   '60', 6, true],
        ['603',  'Achats de matières et fournitures consommables','charge',  '60', 6, true],
        ['604',  'Achats stockés — autres approvisionnements',   'charge',   '60', 6, true],
        ['605',  'Autres achats',                                'charge',   '60', 6, true],
        ['606',  'Achats non stockés de matières et fournitures','charge',   '60', 6, true],
        ['608',  'Frais accessoires d\'achat',                   'charge',   '60', 6, true],

        ['61',   'Transports',                                   'charge',   null, 6, false],
        ['611',  'Transports sur achats',                        'charge',   '61', 6, true],
        ['612',  'Transports sur ventes',                        'charge',   '61', 6, true],
        ['613',  'Transports pour compte de tiers',              'charge',   '61', 6, true],
        ['614',  'Transports du personnel',                      'charge',   '61', 6, true],
        ['618',  'Autres frais de transport',                    'charge',   '61', 6, true],

        ['62',   'Services extérieurs A',                        'charge',   null, 6, false],
        ['621',  'Sous-traitance générale',                      'charge',   '62', 6, true],
        ['622',  'Locations et charges locatives',               'charge',   '62', 6, true],
        ['623',  'Redevances de crédit-bail',                    'charge',   '62', 6, true],
        ['624',  'Entretien, réparations et maintenance',        'charge',   '62', 6, true],
        ['625',  'Primes d\'assurance',                          'charge',   '62', 6, true],
        ['626',  'Études, recherches et documentation',          'charge',   '62', 6, true],
        ['627',  'Publicité, publications et relations publiques','charge',  '62', 6, true],
        ['628',  'Frais de télécommunications',                  'charge',   '62', 6, true],

        ['63',   'Services extérieurs B',                        'charge',   null, 6, false],
        ['631',  'Frais bancaires',                              'charge',   '63', 6, true],
        ['632',  'Rémunérations d\'intermédiaires et honoraires','charge',  '63', 6, true],
        ['633',  'Frais de formation du personnel',              'charge',   '63', 6, true],
        ['634',  'Redevances pour brevets, licences, concessions','charge', '63', 6, true],
        ['635',  'Cotisations',                                  'charge',   '63', 6, true],
        ['637',  'Rémunérations pour travaux effectués',         'charge',   '63', 6, true],
        ['638',  'Divers services extérieurs',                   'charge',   '63', 6, true],

        ['64',   'Impôts et taxes',                              'charge',   null, 6, false],
        ['641',  'Impôts et taxes directes',                     'charge',   '64', 6, true],
        ['642',  'Impôts et taxes indirectes',                   'charge',   '64', 6, true],
        ['645',  'Droits d\'enregistrement',                     'charge',   '64', 6, true],
        ['646',  'Droits de timbre',                             'charge',   '64', 6, true],
        ['647',  'Pénalités, amendes fiscales et pénales',       'charge',   '64', 6, true],
        ['648',  'Autres impôts et taxes',                       'charge',   '64', 6, true],

        ['65',   'Autres charges',                               'charge',   null, 6, false],
        ['651',  'Pertes sur créances clients',                  'charge',   '65', 6, true],
        ['652',  'Pertes sur créances liées à des participations','charge',  '65', 6, true],
        ['653',  'Jetons de présence versés',                    'charge',   '65', 6, true],
        ['654',  'Pertes sur opérations faites en commun',       'charge',   '65', 6, true],
        ['658',  'Charges diverses',                             'charge',   '65', 6, true],

        ['66',   'Charges de personnel',                         'charge',   null, 6, false],
        ['661',  'Appointements, salaires et commissions',       'charge',   '66', 6, true],
        ['662',  'Commissions et courtages sur achats',          'charge',   '66', 6, true],
        ['663',  'Indemnités forfaitaires de congés payés',      'charge',   '66', 6, true],
        ['664',  'Charges sociales',                             'charge',   '66', 6, true],
        ['665',  'Charges de personnel extérieur',               'charge',   '66', 6, true],
        ['668',  'Autres charges de personnel',                  'charge',   '66', 6, true],

        ['67',   'Frais financiers et charges assimilées',       'charge',   null, 6, false],
        ['671',  'Intérêts des emprunts',                        'charge',   '67', 6, true],
        ['672',  'Intérêts des dettes financières diverses',     'charge',   '67', 6, true],
        ['673',  'Intérêts sur dettes de crédit-bail',           'charge',   '67', 6, true],
        ['674',  'Escomptes accordés',                           'charge',   '67', 6, true],
        ['675',  'Escomptes de règlement accordés',              'charge',   '67', 6, true],
        ['676',  'Pertes de change',                             'charge',   '67', 6, true],
        ['677',  'Charges nettes sur cession de titres de placement','charge','67',6, true],
        ['678',  'Autres charges financières',                   'charge',   '67', 6, true],

        ['68',   'Dotations aux amortissements et provisions',   'charge',   null, 6, false],
        ['681',  'Dotations aux amortissements — charges d\'exploitation','charge','68',6,true],
        ['682',  'Dotations aux provisions — charges d\'exploitation','charge','68',6,true],
        ['685',  'Dotations aux amortissements — charges financières','charge','68',6,true],
        ['686',  'Dotations aux provisions — charges financières','charge',  '68', 6, true],

        ['69',   'Impôts sur le résultat',                       'charge',   null, 6, false],
        ['691',  'Participation des travailleurs',               'charge',   '69', 6, true],
        ['695',  'Impôts sur les bénéfices',                     'charge',   '69', 6, true],
        ['699',  'Produits de réduction d\'impôts',              'charge',   '69', 6, true],

        // =====================================================================
        // CLASSE 7 — PRODUITS DES ACTIVITÉS ORDINAIRES
        // =====================================================================
        ['70',   'Ventes',                                       'produit',  null, 7, false],
        ['701',  'Ventes de marchandises',                       'produit',  '70', 7, true],
        ['702',  'Ventes de produits finis',                     'produit',  '70', 7, true],
        ['703',  'Ventes de produits intermédiaires',            'produit',  '70', 7, true],
        ['704',  'Ventes de produits résiduels',                 'produit',  '70', 7, true],
        ['705',  'Travaux facturés',                             'produit',  '70', 7, true],
        ['706',  'Services vendus',                              'produit',  '70', 7, true],
        ['707',  'Produits des activités annexes',               'produit',  '70', 7, true],
        ['709',  'Rabais, remises, ristournes accordés',         'produit',  '70', 7, true],

        ['71',   'Production stockée ou déstockée',              'produit',  null, 7, false],
        ['72',   'Production immobilisée',                       'produit',  null, 7, false],
        ['73',   'Variation des stocks de biens et services',    'produit',  null, 7, false],

        ['75',   'Autres produits',                              'produit',  null, 7, false],
        ['751',  'Redevances pour brevets, licences, concessions','produit', '75', 7, true],
        ['752',  'Revenus des immeubles non affectés',           'produit',  '75', 7, true],
        ['753',  'Jetons de présence reçus',                     'produit',  '75', 7, true],
        ['754',  'Quotes-parts de bénéfice : opérations en commun','produit','75', 7, true],
        ['755',  'Profits sur cessions d\'immobilisations',      'produit',  '75', 7, true],
        ['758',  'Produits divers',                              'produit',  '75', 7, true],

        ['77',   'Revenus financiers et produits assimilés',     'produit',  null, 7, false],
        ['771',  'Intérêts de prêts',                            'produit',  '77', 7, true],
        ['772',  'Produits de participations',                   'produit',  '77', 7, true],
        ['773',  'Revenus de créances et valeurs assimilées',    'produit',  '77', 7, true],
        ['774',  'Escomptes obtenus',                            'produit',  '77', 7, true],
        ['775',  'Escomptes de règlement obtenus',               'produit',  '77', 7, true],
        ['776',  'Gains de change',                              'produit',  '77', 7, true],
        ['777',  'Profits nets sur cession de titres de placement','produit','77', 7, true],
        ['778',  'Autres revenus financiers',                    'produit',  '77', 7, true],

        ['78',   'Reprises de provisions et amortissements',     'produit',  null, 7, false],
        ['781',  'Reprises d\'amortissements — exploit.',        'produit',  '78', 7, true],
        ['782',  'Reprises de provisions — exploit.',            'produit',  '78', 7, true],
        ['785',  'Reprises d\'amortissements — financiers',      'produit',  '78', 7, true],
        ['786',  'Reprises de provisions — financiers',          'produit',  '78', 7, true],

        ['79',   'Transferts de charges',                        'produit',  null, 7, false],
        ['791',  'Transferts de charges d\'exploitation',        'produit',  '79', 7, true],
        ['797',  'Transferts de charges financières',            'produit',  '79', 7, true],

        // =====================================================================
        // CLASSE 8 — COMPTES DES AUTRES CHARGES ET PRODUITS (Extraordinaires)
        // =====================================================================
        ['81',   'Valeurs comptables des cessions d\'immob.',    'charge',   null, 8, false],
        ['82',   'Produits des cessions d\'immobilisations',     'produit',  null, 8, false],
        ['83',   'Charges hors activités ordinaires',            'charge',   null, 8, false],
        ['84',   'Produits hors activités ordinaires',           'produit',  null, 8, false],
        ['85',   'Dotations HAO aux amortissements et provisions','charge',  null, 8, false],
        ['86',   'Reprises HAO de provisions',                   'produit',  null, 8, false],
        ['87',   'Impôts sur les résultats HAO',                 'charge',   null, 8, false],
        ['88',   'Subventions d\'équilibre',                     'produit',  null, 8, false],
        ['89',   'Résultat HAO',                                 'produit',  null, 8, false],
    ];

    public function run(): void
    {
        // Récupère toutes les organisations
        $organizations = DB::table('organizations')->pluck('id');

        if ($organizations->isEmpty()) {
            $this->command->warn('Aucune organisation trouvée. Passer --org=N pour cibler une org.');
            return;
        }

        $now = now();

        foreach ($organizations as $orgId) {
            $this->command->info("Insertion plan SYSCOHADA pour org #{$orgId}…");

            // Évite les doublons
            $existing = DB::table('chart_of_accounts')
                ->where('organization_id', $orgId)
                ->where('is_system', true)
                ->count();

            if ($existing > 0) {
                $this->command->info("  → Comptes système déjà présents, on passe.");
                continue;
            }

            $rows = [];
            foreach ($this->accounts as [$num, $name, $type, $parent, $class, $isLeaf]) {
                $rows[] = [
                    'organization_id'      => $orgId,
                    'account_number'       => $num,
                    'account_name'         => $name,
                    'account_type'         => $type,
                    'parent_account_number'=> $parent,
                    'is_system'            => true,
                    'ohada_class'          => $class,
                    'is_leaf'              => $isLeaf,
                    'currency_code'        => 'XOF',
                    'created_at'           => $now,
                    'updated_at'           => $now,
                ];
            }

            // Insertion par lots de 100
            foreach (array_chunk($rows, 100) as $chunk) {
                DB::table('chart_of_accounts')->insert($chunk);
            }

            $this->command->info("  → " . count($rows) . " comptes insérés.");
        }
    }
}
