import React, { useState } from 'react'
import { AlertTriangle, Info, Trash2, X } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

const TYPE_CONFIG = {
  danger:  { icon: Trash2,         iconBg: 'bg-[#C0392B]/10', iconColor: 'text-[#C0392B]', confirmVariant: 'danger',  confirmLabel: 'Supprimer' },
  warning: { icon: AlertTriangle,  iconBg: 'bg-[#F39C12]/10', iconColor: 'text-[#F39C12]', confirmVariant: 'secondary', confirmLabel: 'Confirmer' },
  info:    { icon: Info,           iconBg: 'bg-[#7e22ce]/10', iconColor: 'text-[#7e22ce]', confirmVariant: 'primary', confirmLabel: 'Confirmer' },
}

/**
 * ConfirmDialog — Boîte de confirmation réutilisable
 *
 * @param {boolean}  open
 * @param {function} onClose
 * @param {function} onConfirm
 * @param {string}   type         'danger' | 'warning' | 'info'
 * @param {string}   title
 * @param {string}   message
 * @param {string}   confirmLabel Overrides default label
 * @param {string}   requireText  If set, user must type this text to confirm
 * @param {boolean}  loading
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  type         = 'danger',
  title        = 'Confirmer l\'action',
  message      = 'Cette action est irréversible. Voulez-vous continuer ?',
  confirmLabel,
  requireText,
  loading      = false,
}) {
  const [inputVal, setInputVal] = useState('')
  const config   = TYPE_CONFIG[type] ?? TYPE_CONFIG.danger
  const Icon     = config.icon
  const label    = confirmLabel ?? config.confirmLabel
  const canConfirm = !requireText || inputVal.trim() === requireText

  const handleClose = () => {
    setInputVal('')
    onClose?.()
  }

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm?.()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            loading={loading}
          >
            {label}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${config.iconBg}`}>
          <Icon size={32} className={config.iconColor} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
        </div>

        {requireText && (
          <div className="w-full text-left">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Tapez <strong className="text-[#C0392B]">{requireText}</strong> pour confirmer
            </label>
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0F1923] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C0392B]"
              placeholder={requireText}
              autoFocus
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
export { ConfirmDialog };
