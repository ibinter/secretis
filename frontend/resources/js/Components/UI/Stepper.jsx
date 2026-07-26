import React from 'react'
import { Check, AlertCircle } from 'lucide-react'

const STATUS_STYLES = {
  completed: { circle: 'bg-[#1E8449] border-[#1E8449] text-white', label: 'text-[#1E8449] dark:text-green-400', line: 'bg-[#1E8449]' },
  active:    { circle: 'bg-[#9333EA] border-[#9333EA] text-white ring-4 ring-[#9333EA]/20', label: 'text-[#9333EA] dark:text-purple-300 font-semibold', line: 'bg-gray-200 dark:bg-[#1E3048]' },
  error:     { circle: 'bg-[#C0392B] border-[#C0392B] text-white', label: 'text-[#C0392B] dark:text-red-400', line: 'bg-gray-200 dark:bg-[#1E3048]' },
  pending:   { circle: 'bg-white dark:bg-[#162032] border-gray-300 dark:border-gray-600 text-gray-400', label: 'text-gray-500 dark:text-gray-400', line: 'bg-gray-200 dark:bg-[#1E3048]' },
}

function StepIcon({ status, index }) {
  if (status === 'completed') return <Check size={14} strokeWidth={3} />
  if (status === 'error')     return <AlertCircle size={14} />
  return <span className="text-xs font-bold">{index + 1}</span>
}

export default function Stepper({
  steps     = [],
  direction = 'horizontal',
  className = '',
}) {
  if (direction === 'vertical') {
    return (
      <div className={`flex flex-col ${className}`}>
        {steps.map((step, i) => {
          const style = STATUS_STYLES[step.status] ?? STATUS_STYLES.pending
          const isLast = i === steps.length - 1
          return (
            <div key={i} className="flex gap-4">
              {/* Left col: circle + line */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${style.circle}`}>
                  <StepIcon status={step.status} index={i} />
                </div>
                {!isLast && <div className={`w-0.5 flex-1 mt-1 mb-1 min-h-[32px] ${style.line}`} />}
              </div>
              {/* Content */}
              <div className={`pb-8 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm ${style.label}`}>{step.label}</p>
                {step.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal
  return (
    <div className={`flex items-start ${className}`}>
      {steps.map((step, i) => {
        const style  = STATUS_STYLES[step.status] ?? STATUS_STYLES.pending
        const isLast = i === steps.length - 1
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${style.circle}`}>
                <StepIcon status={step.status} index={i} />
              </div>
              <p className={`text-xs text-center max-w-[80px] leading-tight ${style.label}`}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-[10px] text-gray-400 text-center max-w-[80px]">{step.description}</p>
              )}
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mt-4 mx-1 ${style.line}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
export { Stepper };
