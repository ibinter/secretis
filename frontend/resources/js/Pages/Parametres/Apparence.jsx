/**
 * IBIG SECRETIS — Apparence.jsx
 * Page de paramètres d'apparence
 *
 * Fonctionnalités :
 *   - Sélecteur de thème : Clair / Sombre / Automatique (avec previews)
 *   - Sélecteur de couleur d'accent (5 prédéfinies + picker custom)
 *   - Taille de police (Compact / Normal / Large)
 *   - Densité d'affichage (Compact / Confortable / Spacieux)
 *   - Prévisualisation en temps réel
 */

import React, { useState, useEffect, useCallback } from 'react';
import useTheme from '@/hooks/useTheme';
import { announceToScreenReader } from '@/utils/accessibility';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const SunIcon    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" strokeWidth={2}/><path strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const MoonIcon   = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;
const SystemIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2}/><path strokeWidth={2} d="M8 21h8M12 17v4"/><circle cx="12" cy="10" r="2" strokeWidth={2}/></svg>;
const CheckIcon  = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>;

// ─── Couleurs d'accent ────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  { name: 'Bleu SECRETIS', value: '#7e22ce', dark: '#1565c0' },
  { name: 'Vert forêt',    value: '#1E8449', dark: '#1a7040' },
  { name: 'Or ambre',      value: '#F39C12', dark: '#D4880F' },
  { name: 'Violet',        value: '#7D3C98', dark: '#6c3483' },
  { name: 'Rose corail',   value: '#E74C3C', dark: '#c0392b' },
];

// ─── Options de thème ─────────────────────────────────────────────────────────
const THEMES = [
  {
    value: 'light',
    label: 'Clair',
    icon:  SunIcon,
    preview: {
      bg: 'bg-white',
      sidebar: 'bg-[#142D47]',
      card: 'bg-gray-50',
      text: 'text-gray-900',
      border: 'border-gray-200',
    },
  },
  {
    value: 'dark',
    label: 'Sombre',
    icon:  MoonIcon,
    preview: {
      bg: 'bg-[#0F1923]',
      sidebar: 'bg-[#0D1820]',
      card: 'bg-[#1E2D40]',
      text: 'text-[#E8F1FA]',
      border: 'border-[#2A3F55]',
    },
  },
  {
    value: 'system',
    label: 'Automatique',
    icon:  SystemIcon,
    preview: {
      bg: 'bg-gradient-to-br from-white to-[#0F1923]',
      sidebar: 'bg-gradient-to-b from-[#142D47] to-[#0D1820]',
      card: 'bg-gradient-to-br from-gray-50 to-[#1E2D40]',
      text: 'text-gray-700',
      border: 'border-gray-200',
    },
  },
];

const FONT_SIZES = [
  { value: 'compact', label: 'Compact', size: '13px', description: '13px — idéal pour petits écrans' },
  { value: 'normal',  label: 'Normal',  size: '16px', description: '16px — taille recommandée' },
  { value: 'large',   label: 'Grand',   size: '18px', description: '18px — meilleure lisibilité' },
];

const DENSITIES = [
  { value: 'compact',     label: 'Compact',     padding: 'p-1',  description: 'Affiche plus de contenu' },
  { value: 'comfortable', label: 'Confortable',  padding: 'p-3',  description: 'Équilibre espace / lisibilité' },
  { value: 'spacious',    label: 'Spacieux',      padding: 'p-5',  description: 'Meilleur pour écrans larges' },
];

// ─── Composant Section ────────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <section
      className="bg-white dark:bg-[#1E2D40] rounded-2xl border border-gray-100 dark:border-[#2A3F55]
        shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.40)] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2A3F55]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-[#E8F1FA]">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-[#6B8BA4] mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ─── Aperçu de thème miniature ────────────────────────────────────────────────
function ThemePreview({ config, selected }) {
  const p = config.preview;
  return (
    <div className={`rounded-xl overflow-hidden border-2 transition-all duration-200
      ${selected ? 'border-purple-500 dark:border-[#7e22ce] shadow-md' : 'border-gray-200 dark:border-[#2A3F55]'}
    `}>
      <div className={`h-20 flex ${p.bg}`}>
        {/* Sidebar simulée */}
        <div className={`w-8 h-full ${p.sidebar}`} />
        {/* Contenu simulé */}
        <div className={`flex-1 p-2 flex flex-col gap-1`}>
          {/* Header simulé */}
          <div className={`h-3 ${p.card} ${p.border} border rounded`} />
          {/* Cards simulées */}
          <div className="flex gap-1 flex-1">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex-1 ${p.card} ${p.border} border rounded`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Apparence() {
  const { theme, setTheme, isDark } = useTheme();

  const [accentColor, setAccentColor]   = useState(() =>
    localStorage.getItem('secretis_accent') || '#7e22ce'
  );
  const [customAccent, setCustomAccent] = useState('');
  const [fontSize, setFontSize]         = useState(() =>
    localStorage.getItem('secretis_font_size') || 'normal'
  );
  const [density, setDensity]           = useState(() =>
    localStorage.getItem('secretis_density') || 'comfortable'
  );
  const [saved, setSaved]               = useState(false);

  // Appliquer les préférences en temps réel
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-secondary', accentColor);
    root.style.setProperty('--color-accent-custom', accentColor);
  }, [accentColor]);

  useEffect(() => {
    const sizes = { compact: '13px', normal: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[fontSize] || '16px';
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const handleSave = useCallback(async () => {
    // Sauvegarder localement
    localStorage.setItem('secretis_accent',    accentColor);
    localStorage.setItem('secretis_font_size', fontSize);
    localStorage.setItem('secretis_density',   density);

    // Synchroniser avec l'API
    try {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
      await fetch('/api/user/preferences', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
        body: JSON.stringify({
          theme,
          accent_color: accentColor,
          font_size:    fontSize,
          density,
        }),
      });
    } catch { /* ignore */ }

    setSaved(true);
    announceToScreenReader('Préférences d\'apparence sauvegardées');
    setTimeout(() => setSaved(false), 3000);
  }, [theme, accentColor, fontSize, density]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E8F1FA]">
          Apparence
        </h1>
        <p className="text-gray-500 dark:text-[#6B8BA4] mt-1">
          Personnalisez l'interface selon vos préférences visuelles.
        </p>
      </div>

      {/* ── Thème ── */}
      <Section
        title="Thème"
        description="Choisissez entre le mode clair, sombre ou automatique (suit le système)."
      >
        <fieldset>
          <legend className="sr-only">Sélectionner le thème</legend>
          <div className="grid grid-cols-3 gap-4">
            {THEMES.map(t => {
              const IconCmp = t.icon;
              const isSelected = theme === t.value;
              return (
                <label
                  key={t.value}
                  className={`relative cursor-pointer rounded-xl p-1
                    focus-within:ring-2 focus-within:ring-purple-500 dark:focus-within:ring-[#7e22ce]`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={t.value}
                    checked={isSelected}
                    onChange={() => {
                      setTheme(t.value);
                      announceToScreenReader(`Thème ${t.label} activé`);
                    }}
                    className="sr-only"
                  />
                  <ThemePreview config={t} selected={isSelected} />
                  <div className={`mt-2 flex items-center justify-between px-1`}>
                    <div className="flex items-center gap-1.5">
                      <IconCmp />
                      <span className={`text-sm font-medium
                        ${isSelected
                          ? 'text-purple-700 dark:text-purple-400'
                          : 'text-gray-700 dark:text-[#A8C0D6]'}`}
                      >
                        {t.label}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-purple-600 dark:text-purple-400">
                        <CheckIcon />
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      {/* ── Couleur d'accent ── */}
      <Section
        title="Couleur d'accent"
        description="Personnalisez la couleur principale de l'interface."
      >
        <fieldset>
          <legend className="sr-only">Sélectionner la couleur d'accent</legend>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(color => {
              const isSelected = accentColor === color.value || accentColor === color.dark;
              return (
                <label key={color.value} className="cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 rounded-full">
                  <input
                    type="radio"
                    name="accent"
                    value={color.value}
                    checked={isSelected}
                    onChange={() => {
                      setAccentColor(isDark ? color.dark : color.value);
                      announceToScreenReader(`Couleur ${color.name} sélectionnée`);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform
                      ${isSelected ? 'scale-110 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600' : 'hover:scale-105'}`}
                    style={{ backgroundColor: isDark ? color.dark : color.value }}
                    title={color.name}
                    aria-label={color.name + (isSelected ? ' (sélectionné)' : '')}
                  >
                    {isSelected && <CheckIcon />}
                  </div>
                </label>
              );
            })}

            {/* Picker custom */}
            <label className="cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 rounded-full" title="Couleur personnalisée">
              <span className="sr-only">Couleur personnalisée</span>
              <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-[#2A3F55] hover:border-gray-400 dark:hover:border-[#3A5570] transition-colors">
                <input
                  type="color"
                  value={customAccent || accentColor}
                  onChange={e => {
                    setCustomAccent(e.target.value);
                    setAccentColor(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Choisir une couleur personnalisée"
                />
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-[#6B8BA4] text-lg">
                  +
                </div>
              </div>
            </label>
          </div>

          {/* Aperçu de la couleur */}
          <div className="mt-4 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg shadow-md flex-shrink-0"
              style={{ backgroundColor: accentColor }}
              aria-hidden="true"
            />
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-[#A8C0D6]">
                Couleur actuelle
              </div>
              <code className="text-xs text-gray-500 dark:text-[#6B8BA4] font-mono">
                {accentColor}
              </code>
            </div>
          </div>
        </fieldset>
      </Section>

      {/* ── Taille de police ── */}
      <Section
        title="Taille de police"
        description="Ajustez la taille du texte pour améliorer la lisibilité."
      >
        <fieldset>
          <legend className="sr-only">Taille de police</legend>
          <div className="grid grid-cols-3 gap-3">
            {FONT_SIZES.map(fs => {
              const isSelected = fontSize === fs.value;
              return (
                <label
                  key={fs.value}
                  className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all
                    focus-within:ring-2 focus-within:ring-purple-500 dark:focus-within:ring-[#7e22ce]
                    ${isSelected
                      ? 'border-purple-500 dark:border-[#7e22ce] bg-purple-50 dark:bg-[#0a1a2e]'
                      : 'border-gray-200 dark:border-[#2A3F55] hover:border-gray-300 dark:hover:border-[#3A5570]'}`}
                >
                  <input
                    type="radio"
                    name="font-size"
                    value={fs.value}
                    checked={isSelected}
                    onChange={() => {
                      setFontSize(fs.value);
                      announceToScreenReader(`Taille de police ${fs.label} sélectionnée`);
                    }}
                    className="sr-only"
                  />
                  {/* Aperçu typographique */}
                  <div className="text-center mb-2">
                    <span
                      className={`font-semibold ${isSelected ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-[#A8C0D6]'}`}
                      style={{ fontSize: fs.size }}
                    >
                      Aa
                    </span>
                  </div>
                  <div className={`text-sm font-medium text-center
                    ${isSelected ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-[#A8C0D6]'}`}
                  >
                    {fs.label}
                  </div>
                  <div className="text-xs text-center text-gray-400 dark:text-[#6B8BA4] mt-0.5">
                    {fs.size}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 text-purple-600 dark:text-purple-400">
                      <CheckIcon />
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      {/* ── Densité d'affichage ── */}
      <Section
        title="Densité d'affichage"
        description="Contrôlez l'espacement entre les éléments de l'interface."
      >
        <fieldset>
          <legend className="sr-only">Densité d'affichage</legend>
          <div className="space-y-2">
            {DENSITIES.map(d => {
              const isSelected = density === d.value;
              return (
                <label
                  key={d.value}
                  className={`flex items-center gap-4 cursor-pointer rounded-xl border-2 p-4 transition-all
                    focus-within:ring-2 focus-within:ring-purple-500 dark:focus-within:ring-[#7e22ce]
                    ${isSelected
                      ? 'border-purple-500 dark:border-[#7e22ce] bg-purple-50 dark:bg-[#0a1a2e]'
                      : 'border-gray-200 dark:border-[#2A3F55] hover:border-gray-300 dark:hover:border-[#3A5570]'}`}
                >
                  <input
                    type="radio"
                    name="density"
                    value={d.value}
                    checked={isSelected}
                    onChange={() => {
                      setDensity(d.value);
                      announceToScreenReader(`Densité ${d.label} sélectionnée`);
                    }}
                    className="sr-only"
                  />

                  {/* Aperçu densité */}
                  <div className={`w-12 h-10 rounded border-2
                    ${isSelected
                      ? 'border-purple-300 dark:border-purple-700'
                      : 'border-gray-200 dark:border-[#2A3F55]'}
                    flex flex-col justify-center gap-0.5 flex-shrink-0 ${d.padding}`}
                    aria-hidden="true"
                  >
                    {[1,2,3].map(i => (
                      <div key={i}
                        className={`h-1 rounded-full
                          ${isSelected ? 'bg-purple-300 dark:bg-purple-700' : 'bg-gray-200 dark:bg-[#2A3F55]'}`}
                      />
                    ))}
                  </div>

                  <div className="flex-1">
                    <div className={`font-medium text-sm
                      ${isSelected ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-[#A8C0D6]'}`}
                    >
                      {d.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-[#6B8BA4]">
                      {d.description}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-purple-600 dark:text-purple-400 flex-shrink-0">
                      <CheckIcon />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => {
            setTheme('system');
            setAccentColor('#7e22ce');
            setFontSize('normal');
            setDensity('comfortable');
            announceToScreenReader('Paramètres réinitialisés');
          }}
          className="px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-[#2A3F55]
            text-sm font-medium text-gray-600 dark:text-[#A8C0D6]
            hover:bg-gray-50 dark:hover:bg-[#243447]
            focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#2A3F55]
            transition-all"
        >
          Réinitialiser
        </button>

        <button
          type="button"
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all
            focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-[#7e22ce]
            focus:ring-offset-2 dark:focus:ring-offset-[#0F1923]
            ${saved
              ? 'bg-green-600 dark:bg-[#1a7040]'
              : 'bg-purple-600 hover:bg-purple-700 dark:bg-[#7e22ce] dark:hover:bg-purple-600'}`}
          aria-live="polite"
        >
          {saved ? '✓ Enregistré' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
export { Apparence };
