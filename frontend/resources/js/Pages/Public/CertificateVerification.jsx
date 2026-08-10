import { Head } from '@inertiajs/react';
import { ShieldCheck, ShieldX, Award, User, Calendar, BookOpen } from 'lucide-react';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <Icon size={16} className="text-gray-400 flex-shrink-0" />
      <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{value ?? '—'}</span>
    </div>
  );
}

export default function CertificateVerification({ certificate = null }) {
  const valid = Boolean(certificate);

  return (
    <>
      <Head title="Vérification de certificat — SECRETIS" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-lg">

          <div className={`rounded-2xl border overflow-hidden ${valid
            ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800'
            : 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-800'}`}>

            {/* Bandeau statut */}
            <div className={`px-6 py-8 text-center ${valid ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              {valid ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} className="text-green-600 dark:text-green-400" />
                  </div>
                  <h1 className="text-xl font-bold text-green-700 dark:text-green-300">Certificat authentique</h1>
                  <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">Ce certificat a été délivré par SECRETIS et est valide.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4">
                    <ShieldX size={32} className="text-red-500 dark:text-red-400" />
                  </div>
                  <h1 className="text-xl font-bold text-red-600 dark:text-red-300">Certificat introuvable</h1>
                  <p className="text-sm text-red-500/80 dark:text-red-400/80 mt-1">Ce certificat est invalide ou n'existe pas dans nos registres.</p>
                </>
              )}
            </div>

            {valid && (
              <div className="px-6 py-5">
                <Row icon={User}     label="Titulaire"    value={certificate.holder_name ?? certificate.user_name} />
                <Row icon={BookOpen} label="Formation"    value={certificate.course_title ?? certificate.course_name} />
                <Row icon={Award}    label="Référence"    value={certificate.reference ?? certificate.certificate_number} />
                <Row icon={Calendar} label="Délivré le"   value={fmt(certificate.issued_at ?? certificate.created_at)} />
                {certificate.score != null && (
                  <Row icon={Award} label="Score obtenu" value={`${certificate.score}%`} />
                )}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Vérification propulsée par SECRETIS ERP — IBIG Soft
          </p>
        </div>
      </div>
    </>
  );
}
