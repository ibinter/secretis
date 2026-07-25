/**
 * SECRETIS ERP — Components/Help/ContextualHelp.jsx
 *
 * Composant d'aide contextuelle affiché en popover sur les formulaires complexes.
 *
 * Usage :
 *   <ContextualHelp topic="agenda.create" />
 *
 * Topics disponibles : agenda.create, ged.upload, tasks.assign,
 * visitors.register, reports.builder, users.permissions, sara.usage
 */

import React, { useState, useRef, useEffect } from 'react'
import { Link } from '@inertiajs/react'

// ─── Contenu des topics ───────────────────────────────────────────────────────
const TOPICS = {
  'agenda.create': {
    title: 'Créer un événement',
    content: "Définissez le type d'événement (réunion, rendez-vous, rappel), ajoutez des participants depuis votre annuaire et configurez les récurrences. Les invitations sont envoyées automatiquement par email.",
    guide_url: '/aide/guide/agenda',
  },
  'ged.upload': {
    title: 'Importer un document',
    content: "Glissez vos fichiers ou cliquez pour les sélectionner. Les formats acceptés sont PDF, Word, Excel, images jusqu'à 50 Mo. Chaque document est automatiquement indexé pour la recherche.",
    guide_url: '/aide/guide/ged',
  },
  'tasks.assign': {
    title: 'Assigner une tâche',
    content: "Sélectionnez un ou plusieurs responsables dans votre équipe. Définissez une date d'échéance et une priorité. Les assignés reçoivent une notification immédiate et un rappel 24h avant l'échéance.",
    guide_url: '/aide/guide/taches',
  },
  'visitors.register': {
    title: "Enregistrer un visiteur",
    content: "Saisissez les informations du visiteur et sélectionnez l'hôte. Une photo peut être prise depuis la webcam. Le badge visiteur est imprimable directement après validation.",
    guide_url: '/aide/guide/reception',
  },
  'reports.builder': {
    title: 'Créer un rapport',
    content: "Choisissez la source de données (module), les colonnes à inclure et le type de visualisation. Les rapports peuvent être planifiés pour un envoi automatique par email.",
    guide_url: '/aide/guide/rapports',
  },
  'users.permissions': {
    title: 'Gérer les permissions',
    content: "Les rôles définissent l'accès aux modules. Utilisez les rôles prédéfinis (Admin, Manager, Membre) ou créez des rôles personnalisés. Les modifications prennent effet immédiatement.",
    guide_url: '/aide/guide/utilisateurs',
  },
  'sara.usage': {
    title: 'Utiliser SARA',
    content: "Posez vos questions en langage naturel. SARA peut créer des événements, rechercher des documents, générer des résumés ou vous guider dans les fonctionnalités. Préfixez par @sara pour l'invoquer depuis n'importe quel module.",
    guide_url: '/aide/guide/sara',
  },
}

// ─── Icônes inline ───────────────────────────────────────────────────────────
function QuestionIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
    </svg>
  )
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function ContextualHelp({ topic, className = '' }) {
  const [open, setOpen]     = useState(false)
  const [pos, setPos]       = useState('bottom') // 'bottom' | 'top'
  const buttonRef           = useRef(null)
  const popoverRef          = useRef(null)
  const helpId              = `help-${topic.replace(/\./g, '-')}`

  const data = TOPICS[topic]

  // Fermer au clic extérieur ou Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  // Calcul de la position (évite de sortir du viewport)
  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setPos(spaceBelow < 180 ? 'top' : 'bottom')
    }
    setOpen(prev => !prev)
  }

  if (!data) return null

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Bouton déclencheur */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={`Aide : ${data.title}`}
        aria-expanded={open}
        aria-controls={helpId}
        aria-describedby={open ? helpId : undefined}
        className="w-5 h-5 rounded-full bg-gray-100 hover:bg-[#7e22ce] hover:text-white text-gray-400 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#7e22ce] focus:ring-offset-1"
      >
        <QuestionIcon />
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          id={helpId}
          role="tooltip"
          aria-label={data.title}
          className={`
            absolute z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
            rounded-xl shadow-lg p-4 text-left
            ${pos === 'bottom' ? 'top-7 right-0' : 'bottom-7 right-0'}
          `}
        >
          {/* Flèche décorative */}
          <span className={`absolute right-3 w-2.5 h-2.5 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-600 rotate-45 ${pos === 'bottom' ? '-top-1.5' : '-bottom-1.5 rotate-[225deg]'}`} />

          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-[#9333EA] dark:text-white text-sm pr-2">{data.title}</h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
              aria-label="Fermer l'aide"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Contenu */}
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{data.content}</p>

          {/* Lien vers le guide */}
          {data.guide_url && (
            <a
              href={data.guide_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-3 text-xs font-medium text-[#7e22ce] hover:text-[#9333EA] dark:hover:text-purple-300 transition-colors"
            >
              <ExternalLinkIcon />
              En savoir plus dans le guide
            </a>
          )}
        </div>
      )}
    </div>
  )
}
export { ContextualHelp };
