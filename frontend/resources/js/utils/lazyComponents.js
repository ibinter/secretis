/**
 * IBIG SECRETIS — lazyComponents.js
 * Exports lazy() pour les modules métier lourds.
 * Chaque import est différé au premier rendu du composant.
 *
 * Usage :
 *   import { AgendaPage } from '@/utils/lazyComponents'
 *   // Entourer avec <AppSuspense fallback="page"> dans le routeur
 */

import { lazy } from 'react'

// ── Modules lourds — chargés à la demande ────────────────────────────────────

/** Page Agenda (FullCalendar + gestion événements) */
export const AgendaPage = lazy(() => import('../Pages/Agenda/Index'))

/** Diagramme de Gantt (recharts/svg personnalisé) */
export const GanttChart = lazy(() => import('../Components/Charts/GanttChart'))

/** Tableau Kanban (drag & drop) */
export const KanbanBoard = lazy(() => import('../Components/Kanban/Board'))

/** Dashboard BI (Recharts, DataTable lourde) */
export const BiDashboard = lazy(() => import('../Pages/BI/Dashboard'))

/** Panneau SARA (IA — historique conversationnel) */
export const SaraPanel = lazy(() => import('../Components/Sara/SaraPanel'))

/** Cours Académie (lecteur vidéo + quiz) */
export const AcademyCourse = lazy(() => import('../Pages/Academie/Course'))

/** Constructeur de rapports personnalisés */
export const ReportBuilder = lazy(() => import('../Pages/Reports/Builder'))

/** Carte GPS Flotte */
export const FleetMap = lazy(() => import('../Pages/Fleet/Map'))

/** Éditeur de workflow documentaire */
export const WorkflowEditor = lazy(() => import('../Pages/DocumentWorkflow/Editor'))

/** Interface GED (liste de documents + prévisualisation) */
export const GedExplorer = lazy(() => import('../Pages/GED/Explorer'))

/** Module Comptabilité OHADA (lourde) */
export const AccountingLedger = lazy(() => import('../Pages/Accounting/Ledger'))

/** Portail fournisseurs */
export const SupplierPortal = lazy(() => import('../Pages/Procurement/SupplierPortal'))
