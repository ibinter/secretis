/**
 * IBIG SECRETIS — Suspense.jsx (AppSuspense)
 * Wrapper React.Suspense avec skeletons adaptés au contexte.
 *
 * @example
 *   <AppSuspense fallback="page">
 *     <AgendaPage />
 *   </AppSuspense>
 *
 *   <AppSuspense fallback={<MyCustomSkeleton />}>
 *     <HeavyChart />
 *   </AppSuspense>
 */

import React, { Suspense } from 'react'

// ── Skeletons ────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6" aria-hidden="true" role="presentation">
      {/* Titre */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
      {/* Contenu principal */}
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      {/* Ligne supplémentaire */}
      <div className="grid grid-cols-3 gap-4">
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl col-span-2" />
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3" aria-hidden="true" role="presentation">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mt-2" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-hidden="true" role="presentation">
      {/* Header */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
      {/* Rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
      ))}
      {/* Pagination */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-b-lg mt-2" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-4" aria-hidden="true" role="presentation">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        ))}
      </div>
    </div>
  )
}

// Skeletons nommés disponibles
const SKELETONS = {
  page:  <PageSkeleton />,
  card:  <CardSkeleton />,
  table: <TableSkeleton />,
  chart: <ChartSkeleton />,
}

// ── Composant principal ───────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {'page'|'card'|'table'|'chart'|React.ReactNode} props.fallback
 * @param {React.ReactNode} props.children
 */
export default function AppSuspense({ fallback = 'page', children }) {
  const skeleton = typeof fallback === 'string'
    ? (SKELETONS[fallback] ?? SKELETONS.page)
    : fallback

  return (
    <Suspense fallback={skeleton}>
      {children}
    </Suspense>
  )
}

// Exports nommés des skeletons (réutilisables hors Suspense)
export { PageSkeleton, CardSkeleton, TableSkeleton, ChartSkeleton }
export { AppSuspense };
