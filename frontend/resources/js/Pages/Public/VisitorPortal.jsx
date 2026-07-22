/**
 * SECRETIS ERP — VisitorPortal.jsx
 * Portail public de prise de rendez-vous visiteur
 * Route : /rdv/{organization-slug}
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

// ─── Icônes inline SVG légères ───────────────────────────────────────────────
const Icon = {
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Briefcase: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Service',   icon: 'Briefcase' },
  { id: 2, label: 'Agent',     icon: 'User' },
  { id: 3, label: 'Créneau',  icon: 'Calendar' },
  { id: 4, label: 'Infos',    icon: 'User' },
  { id: 5, label: 'Confirmation', icon: 'Check' },
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

function formatDate(date) {
  return `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

function isoDate(date) {
  return date.toISOString().split('T')[0];
}

// ─── Composants internes ──────────────────────────────────────────────────────
function StepBar({ current, primary }) {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${done  ? 'text-white'  : ''}
                  ${active ? 'text-white ring-4 ring-opacity-30' : ''}
                  ${!done && !active ? 'bg-gray-100 text-gray-400' : ''}
                `}
                style={done || active ? { backgroundColor: primary } : {}}
              >
                {done ? <Icon.Check /> : step.id}
              </div>
              <span className={`text-xs hidden sm:block ${active ? 'font-semibold' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 sm:mx-2 transition-all duration-300"
                style={{ backgroundColor: done ? primary : '#E5E7EB' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, required, placeholder, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all
          focus:ring-2 focus:ring-offset-0
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-blue-400'}
        `}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CalendarPicker({ selectedDate, onSelect, availableDates, primary }) {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 select-none">
      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Icon.ChevronLeft />
        </button>
        <span className="font-semibold text-gray-800">
          {MONTHS_FR[month]} {year}
        </span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Icon.ChevronRight />
        </button>
      </div>
      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>
      {/* Cellules */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const iso = isoDate(date);
          const isAvailable = availableDates?.includes(iso);
          const isPast = date < today;
          const isSelected = selectedDate && isoDate(selectedDate) === iso;
          return (
            <button
              key={iso}
              disabled={isPast || !isAvailable}
              onClick={() => onSelect(date)}
              className={`relative text-sm rounded-lg py-2 transition-all duration-150 font-medium
                ${isPast || !isAvailable ? 'text-gray-300 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}
                ${isSelected ? 'text-white' : isAvailable && !isPast ? 'text-gray-800' : ''}
              `}
              style={isSelected ? { backgroundColor: primary } : isAvailable && !isPast ? {} : {}}
            >
              {date.getDate()}
              {isAvailable && !isPast && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: primary }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function VisitorPortal() {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const { t }     = useTranslation();

  // Données organisation
  const [org, setOrg]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // État du wizard
  const [step, setStep]       = useState(1);
  const [services, setServices] = useState([]);
  const [hosts, setHosts]     = useState([]);
  const [slots, setSlots]     = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]   = useState({});

  // Sélections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedHost, setSelectedHost]       = useState(null);
  const [selectedDate, setSelectedDate]       = useState(null);
  const [selectedSlot, setSelectedSlot]       = useState(null);
  const [visitorInfo, setVisitorInfo]         = useState({
    first_name: '', last_name: '', email: '', phone: '', company: '',
  });

  // Couleurs organisation ou défaut SECRETIS
  const primary   = org?.primary_color   || '#2563EB';
  const secondary = org?.secondary_color || '#1E40AF';

  // ── Chargement initial ──────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    axios.get(`/api/public/visitor/${slug}`)
      .then(res => {
        setOrg(res.data.organization);
        setServices(res.data.services || []);
      })
      .catch(() => setError('Organisation introuvable.'))
      .finally(() => setLoading(false));
  }, [slug]);

  // ── Chargement des agents selon le service ──────────────────────────────────
  useEffect(() => {
    if (!selectedService) return;
    axios.get(`/api/public/visitor/${slug}/hosts`, {
      params: { service_id: selectedService.id },
    }).then(res => setHosts(res.data));
  }, [selectedService, slug]);

  // ── Chargement des créneaux selon l'agent et la date ───────────────────────
  useEffect(() => {
    if (!selectedHost) return;
    // Récupérer les dates disponibles du mois courant
    const now = new Date();
    axios.get(`/api/public/visitor/${slug}/available-dates`, {
      params: { host_id: selectedHost.id, month: now.getMonth() + 1, year: now.getFullYear() },
    }).then(res => setAvailableDates(res.data));
  }, [selectedHost, slug]);

  const loadSlots = useCallback((date) => {
    if (!selectedHost || !date) return;
    setSlots([]);
    axios.get(`/api/public/visitor/${slug}/slots`, {
      params: { host_id: selectedHost.id, date: isoDate(date) },
    }).then(res => setSlots(res.data));
  }, [selectedHost, slug]);

  useEffect(() => {
    if (selectedDate) loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

  // ── Validation visiteur ─────────────────────────────────────────────────────
  function validateVisitor() {
    const errs = {};
    if (!visitorInfo.first_name.trim()) errs.first_name = 'Prénom requis';
    if (!visitorInfo.last_name.trim())  errs.last_name  = 'Nom requis';
    if (!visitorInfo.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Email invalide';
    if (!visitorInfo.phone.trim()) errs.phone = 'Téléphone requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Soumission ──────────────────────────────────────────────────────────────
  async function handleBook() {
    setSubmitting(true);
    try {
      const res = await axios.post(`/api/public/visitor/${slug}/book`, {
        service_id: selectedService.id,
        host_id:    selectedHost.id,
        date:       isoDate(selectedDate),
        slot:       selectedSlot,
        visitor:    visitorInfo,
      });
      navigate(`/rdv/confirmation/${res.data.token}`, { state: { appointment: res.data } });
    } catch (err) {
      const msg = err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.';
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Chargement du portail…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Portail introuvable</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── En-tête organisation ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          {org?.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-10 w-auto object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: primary }}>
              {org?.name?.[0] || 'S'}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{org?.name}</h1>
            <p className="text-xs text-gray-500">Prise de rendez-vous en ligne</p>
          </div>
        </div>
      </header>

      {/* ── Corps ── */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <StepBar current={step} primary={primary} />

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* ÉTAPE 1 : Service                                                */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Quel est le motif de votre visite ?</h2>
              <p className="text-sm text-gray-500 mb-6">Sélectionnez le service ou le type de rendez-vous.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => { setSelectedService(service); setStep(2); }}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md
                      ${selectedService?.id === service.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'}
                    `}
                    style={selectedService?.id === service.id
                      ? { borderColor: primary, backgroundColor: `${primary}10` } : {}}
                  >
                    <div className="flex items-start gap-3">
                      {service.icon && (
                        <span className="text-2xl flex-shrink-0">{service.icon}</span>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{service.name}</div>
                        {service.description && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</div>
                        )}
                        {service.duration_minutes && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                            <Icon.Clock />
                            {service.duration_minutes} min
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* ÉTAPE 2 : Agent                                                   */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Avec qui souhaitez-vous vous rencontrer ?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Service : <strong>{selectedService?.name}</strong>
              </p>
              <div className="space-y-3">
                {hosts.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-4xl mb-3">👤</p>
                    <p>Aucun agent disponible pour ce service.</p>
                  </div>
                ) : (
                  hosts.map(host => (
                    <button
                      key={host.id}
                      onClick={() => { setSelectedHost(host); setStep(3); }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200
                        hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left bg-white"
                    >
                      {host.avatar_url ? (
                        <img src={host.avatar_url} alt={host.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white
                          font-bold text-lg flex-shrink-0"
                          style={{ backgroundColor: primary }}>
                          {host.name?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{host.name}</div>
                        {host.title && <div className="text-sm text-gray-500">{host.title}</div>}
                        {host.department && (
                          <div className="text-xs text-gray-400 mt-0.5">{host.department}</div>
                        )}
                      </div>
                      <Icon.ChevronRight />
                    </button>
                  ))
                )}
              </div>
              <button onClick={() => setStep(1)} className="mt-4 text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                <Icon.ChevronLeft /> Retour
              </button>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* ÉTAPE 3 : Créneau                                                 */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Choisissez un créneau</h2>
              <p className="text-sm text-gray-500 mb-6">
                Avec <strong>{selectedHost?.name}</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CalendarPicker
                  selectedDate={selectedDate}
                  onSelect={date => { setSelectedDate(date); setSelectedSlot(null); }}
                  availableDates={availableDates}
                  primary={primary}
                />
                {selectedDate && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Créneaux pour le {formatDate(selectedDate)}
                    </h3>
                    {slots.length === 0 ? (
                      <p className="text-sm text-gray-400">Aucun créneau disponible ce jour.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                        {slots.map(slot => (
                          <button
                            key={slot.start}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-all duration-150
                              ${selectedSlot?.start === slot.start
                                ? 'text-white border-transparent'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300'}
                            `}
                            style={selectedSlot?.start === slot.start
                              ? { backgroundColor: primary } : {}}
                          >
                            {slot.start} – {slot.end}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                  <Icon.ChevronLeft /> Retour
                </button>
                <button
                  disabled={!selectedSlot}
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ backgroundColor: primary }}
                >
                  Continuer
                </button>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* ÉTAPE 4 : Informations visiteur                                   */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {step === 4 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Vos informations</h2>
              <p className="text-sm text-gray-500 mb-6">
                Ces informations seront transmises à l'accueil.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Prénom" required value={visitorInfo.first_name}
                  onChange={v => setVisitorInfo(p => ({ ...p, first_name: v }))}
                  placeholder="Jean" error={errors.first_name} />
                <InputField label="Nom" required value={visitorInfo.last_name}
                  onChange={v => setVisitorInfo(p => ({ ...p, last_name: v }))}
                  placeholder="Dupont" error={errors.last_name} />
                <InputField label="Email" type="email" required value={visitorInfo.email}
                  onChange={v => setVisitorInfo(p => ({ ...p, email: v }))}
                  placeholder="jean.dupont@example.com" error={errors.email} />
                <InputField label="Téléphone" type="tel" required value={visitorInfo.phone}
                  onChange={v => setVisitorInfo(p => ({ ...p, phone: v }))}
                  placeholder="+225 07 00 00 00 00" error={errors.phone} />
                <div className="sm:col-span-2">
                  <InputField label="Société / Organisation" value={visitorInfo.company}
                    onChange={v => setVisitorInfo(p => ({ ...p, company: v }))}
                    placeholder="Nom de votre entreprise (optionnel)" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => setStep(3)} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                  <Icon.ChevronLeft /> Retour
                </button>
                <button
                  onClick={() => { if (validateVisitor()) setStep(5); }}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
                  style={{ backgroundColor: primary }}
                >
                  Vérifier le récapitulatif
                </button>
              </div>
            </section>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* ÉTAPE 5 : Confirmation                                            */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {step === 5 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Récapitulatif de votre rendez-vous</h2>
              <p className="text-sm text-gray-500 mb-6">Vérifiez les informations avant de confirmer.</p>

              <div className="rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                  Détails du rendez-vous
                </div>
                {[
                  { label: 'Service',    value: selectedService?.name },
                  { label: 'Agent',      value: selectedHost?.name },
                  { label: 'Date',       value: selectedDate ? formatDate(selectedDate) : '' },
                  { label: 'Horaire',    value: selectedSlot ? `${selectedSlot.start} – ${selectedSlot.end}` : '' },
                  { label: 'Visiteur',   value: `${visitorInfo.first_name} ${visitorInfo.last_name}` },
                  { label: 'Email',      value: visitorInfo.email },
                  { label: 'Téléphone', value: visitorInfo.phone },
                  visitorInfo.company && { label: 'Société', value: visitorInfo.company },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} className="flex gap-4 px-5 py-3 border-t border-gray-100 text-sm">
                    <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mb-4 flex items-start gap-2">
                <span>ℹ️</span>
                Un email de confirmation avec un QR code vous sera envoyé à <strong>{visitorInfo.email}</strong>.
              </p>

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                  {errors.submit}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button onClick={() => setStep(4)} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                  <Icon.ChevronLeft /> Modifier
                </button>
                <button
                  onClick={handleBook}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  style={{ backgroundColor: primary }}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Confirmation en cours…
                    </>
                  ) : (
                    <>✅ Confirmer le rendez-vous</>
                  )}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Footer discret */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Portail sécurisé propulsé par <span className="font-semibold">SECRETIS ERP</span>
        </p>
      </main>
    </div>
  );
}
