import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

const STEPS = [
  { key: 'organization_profile',    icon: '🏢', label: 'Profil organisation',      desc: 'Logo, nom, secteur et pays',           time: '2 min' },
  { key: 'configure_services',      icon: '⚙️', label: 'Modules',                  desc: 'Activez les modules nécessaires',       time: '2 min' },
  { key: 'set_prefix',              icon: '🏷️', label: 'Préfixe courrier',          desc: 'Configurer CORR-ENT-2025-0001',        time: '1 min' },
  { key: 'invite_users',            icon: '👥', label: 'Inviter des collègues',     desc: 'Ajoutez votre équipe',                  time: '2 min' },
  { key: 'create_first_event',      icon: '📅', label: 'Premier événement',         desc: 'Créez votre premier rendez-vous',       time: '3 min' },
  { key: 'upload_first_document',   icon: '📄', label: 'Premier document',          desc: 'Uploadez votre premier fichier',        time: '2 min' },
  { key: 'configure_notifications', icon: '🔔', label: 'Notifications',             desc: 'SMTP ou WhatsApp',                      time: '2 min' },
  { key: 'discover_sara',           icon: '🤖', label: 'Découvrir SARA',            desc: 'Votre assistante IA',                   time: '1 min' },
];

function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 120 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height - canvas.height,
      size:  Math.random() * 8 + 4,
      color: ['#3b82f6','#f59e0b','#10b981','#ec4899','#8b5cf6'][Math.floor(Math.random()*5)],
      speed: Math.random() * 3 + 1,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.2,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.4);
        ctx.restore();
        p.y     += p.speed;
        p.angle += p.spin;
        if (p.y > canvas.height) p.y = -10;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    const t = setTimeout(() => cancelAnimationFrame(raf), 4000);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ opacity: 1, transition: 'opacity 1s' }}
    />
  );
}

export default function Welcome({ organization, steps: stepsMeta }) {
  const handleStart = () => router.get('/onboarding');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <Confetti />

      {/* Hero */}
      <div className="text-center mb-12 relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 mb-6 shadow-2xl shadow-blue-500/40">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
          Bienvenue chez <span className="text-blue-400">IBIG SECRETIS</span> !
        </h1>
        <p className="text-xl text-slate-300 max-w-lg mx-auto">
          Votre espace{' '}
          <span className="font-bold text-white">{organization?.name}</span> est prêt.
          Configurons-le en quelques minutes.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-sm font-semibold px-4 py-2 rounded-full border border-blue-500/30">
          <span>⏱️</span> Estimation : 15 minutes pour bien démarrer
        </div>
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mb-10 relative z-10">
        {STEPS.map((step, i) => (
          <div
            key={step.key}
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center text-lg">
                {step.icon}
              </div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Étape {i + 1}
              </span>
            </div>
            <h3 className="text-white font-bold text-sm mb-1">{step.label}</h3>
            <p className="text-slate-400 text-xs">{step.desc}</p>
            <div className="mt-3 text-xs text-blue-400 font-medium">{step.time}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <button
          onClick={handleStart}
          className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-lg px-10 py-4 rounded-xl shadow-xl shadow-blue-600/40 transition-all duration-200"
        >
          Commencer maintenant
          <span className="text-xl">→</span>
        </button>
        <button
          onClick={() => router.get('/dashboard')}
          className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
        >
          Passer pour l'instant — je configurerai plus tard
        </button>
      </div>
    </div>
  );
}
