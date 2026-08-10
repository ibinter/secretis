import React, { useState } from 'react'

export default function Tabs({
  tabs       = [],   // [{ key, label, icon?, badge?, content, disabled? }]
  defaultTab,
  onChange,
  variant    = 'underline',  // 'underline' | 'pills' | 'bordered'
  className  = '',
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key)

  const handleChange = (key) => {
    setActive(key)
    onChange?.(key)
  }

  const baseTab = 'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    underline: {
      nav:    'flex border-b border-gray-200 dark:border-[#1E3048] gap-0',
      active: 'text-[#9333EA] dark:text-purple-300 border-b-2 border-[#9333EA] dark:border-purple-400 -mb-px',
      idle:   'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent',
    },
    pills: {
      nav:    'flex gap-1 p-1 bg-gray-100 dark:bg-[#0F1923] rounded-xl',
      active: 'bg-white dark:bg-[#162032] text-[#9333EA] dark:text-purple-300 shadow-sm rounded-lg',
      idle:   'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg',
    },
    bordered: {
      nav:    'flex gap-0 border border-gray-200 dark:border-[#1E3048] rounded-xl overflow-hidden',
      active: 'bg-[#9333EA] text-white',
      idle:   'bg-white dark:bg-[#162032] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border-r border-gray-200 dark:border-[#1E3048] last:border-0',
    },
  }

  const style = variantStyles[variant] ?? variantStyles.underline
  const current = tabs.find(t => t.key === active)

  return (
    <div className={className}>
      <nav className={`${style.nav} overflow-x-auto`} role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && handleChange(tab.key)}
            className={`${baseTab} ${active === tab.key ? style.active : style.idle}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.badge != null && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div role="tabpanel" className="mt-4">
        {current?.content}
      </div>
    </div>
  )
}
export { Tabs };
