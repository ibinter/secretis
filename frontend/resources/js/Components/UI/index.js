/**
 * SECRETIS ERP — Système de composants UI
 *
 *   import { PageHeader, Button, Badge, DataTable, EmptyState } from '@/Components/UI'
 *
 * Deux règles à respecter en modifiant ce fichier :
 *   1. La casse des chemins doit correspondre EXACTEMENT au nom réel des
 *      fichiers : la production tourne sous Linux (FS sensible à la casse)
 *      alors que les postes de dev sont sous Windows (FS insensible).
 *   2. Ne réexporter `default as X` que si le module expose réellement un
 *      export par défaut — sinon le build Vite échoue (cas historique de
 *      Tabs.jsx et Tooltip.jsx, qui n'exposent que des exports nommés).
 */

/* ─── Socle du design system ───────────────────────────────────────────────── */
export { default as PageHeader }  from './PageHeader'
export { default as Button }      from './Button'
export { default as Badge }       from './Badge'
export { default as StatCard }    from './StatCard'
export { default as DataTable }   from './DataTable'
export { default as EmptyState }  from './EmptyState'

export {
  default as Skeleton,
  SkeletonText, SkeletonTableRows, SkeletonStatCards, SkeletonCard,
} from './Skeleton'

export {
  default as Card,
  CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from './Card'

/* ─── Tokens partagés (surfaces, bordures, tons sémantiques, helper cx) ────── */
export * from './tokens'

/* ─── Composants existants conservés (export par défaut vérifié) ───────────── */
export { default as Modal }         from './Modal'
export { default as Table }         from './Table'
export { default as FormInput }     from './FormInput'
export { default as Select }        from './Select'
export { default as Input }         from './Input'
export { default as Alert }         from './Alert'
export { default as Spinner }       from './Spinner'
export { default as Stepper }       from './Stepper'
export { default as Avatar }        from './Avatar'
export { default as Pagination }    from './Pagination'
export { default as SearchInput }   from './SearchInput'
export { default as DatePicker }    from './DatePicker'
export { default as FileUpload }    from './FileUpload'
export { default as Toast, toast }  from './Toast'
export { default as Dropdown }      from './Dropdown'
export { default as ConfirmDialog } from './ConfirmDialog'

/* ─── Tabs & Tooltip ───────────────────────────────────────────────────────── */
// Ces deux modules existaient en double (casse Pascal ET minuscule) avec des
// contenus différents : les versions minuscules étaient des ébauches shadcn,
// dont `TooltipContent` renvoyait `null` — les infobulles n'affichaient donc
// rien. Les doublons ont été supprimés le 2026-08-08 ; il ne reste que les
// implémentations maison, réexportables sans risque.
export { default as Tabs }    from './Tabs'
export { default as Tooltip } from './Tooltip'
