import { Head, useForm } from '@inertiajs/react';
import { MessageSquare, Send, Building2, User } from 'lucide-react';
import { useState } from 'react';

function fmt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

export default function ClientMessages({ messages = [] }) {
  const [showForm, setShowForm] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({ subject: '', body: '' });

  function submit(e) {
    e.preventDefault();
    post(route('portail.messages.send'), {
      onSuccess: () => { reset(); setShowForm(false); },
    });
  }

  return (
    <>
      <Head title="Mes Messages" />
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-5">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-indigo-500" /> Mes Messages
          </h1>
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
            <Send size={14} /> Nouveau message
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Envoyer un message</h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <input value={data.subject} onChange={e => setData('subject', e.target.value)}
                  placeholder="Objet du message" className={inputCls} />
                {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
              </div>
              <div>
                <textarea value={data.body} onChange={e => setData('body', e.target.value)}
                  rows={4} placeholder="Votre message…"
                  className={`${inputCls} resize-none`} />
                {errors.body && <p className="text-xs text-red-500 mt-1">{errors.body}</p>}
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                  Annuler
                </button>
                <button type="submit" disabled={processing}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                  <Send size={13} /> {processing ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
            <MessageSquare size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun message pour le moment.</p>
            <button onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
              <Send size={14} /> Envoyer un premier message
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => {
              const fromOrg = msg.direction === 'from_org';
              return (
                <div key={msg.id} className={`flex gap-3 ${fromOrg ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${fromOrg ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {fromOrg
                      ? <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                      : <User size={14} className="text-gray-500 dark:text-gray-400" />
                    }
                  </div>
                  <div className={`flex-1 max-w-lg ${fromOrg ? '' : 'text-right'}`}>
                    <div className={`rounded-xl p-3 text-sm inline-block max-w-full text-left ${fromOrg
                      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      : 'bg-indigo-600 text-white'}`}>
                      {msg.subject && (
                        <p className={`font-semibold text-xs mb-1 ${fromOrg ? 'text-gray-400' : 'text-indigo-200'}`}>
                          {msg.subject}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fmt(msg.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
