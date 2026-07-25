/**
 * Messages/Index.jsx — Messagerie interne temps réel
 *
 * Layout 3 panneaux :
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  [Liste conversations]  │  [Zone messages]  │  [Infos contact] │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * Temps réel via Laravel Echo + Reverb :
 *  - Écoute les nouveaux messages sur le channel de la conversation active
 *  - Écoute les mises à jour de toutes les conversations (badge non lus)
 *  - Statut de saisie (typing indicator) via Presence Channel
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ChatBubbleLeftRightIcon,
    MagnifyingGlassIcon,
    PaperAirplaneIcon,
    PaperClipIcon,
    PlusIcon,
    UserGroupIcon,
    XMarkIcon,
    FaceSmileIcon,
    ArrowUturnLeftIcon,
    TrashIcon,
    EllipsisVerticalIcon,
    PhoneIcon,
    EnvelopeIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon, CheckCheckIcon } from 'lucide-react';

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MessagesIndex({ conversations: initialConversations = [] }) {
    const { auth } = usePage().props;

    // ── État global ──
    const [conversations, setConversations] = useState(initialConversations);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // ── Composition ──
    const [inputText, setInputText] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [sending, setSending] = useState(false);

    // ── UI ──
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewConv, setShowNewConv] = useState(false);
    const [showContactInfo, setShowContactInfo] = useState(true);
    const [typingUsers, setTypingUsers] = useState([]);

    const messagesEndRef = useRef(null);
    const fileInputRef   = useRef(null);
    const inputRef       = useRef(null);
    const typingTimerRef = useRef(null);

    // ─── Scroll automatique vers le bas ──────────────────────────────────────

    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    }, []);

    useEffect(() => {
        scrollToBottom(false);
    }, [messages]);

    // ─── Connexion Echo / Reverb ──────────────────────────────────────────────

    useEffect(() => {
        if (!window.Echo) return;

        // Écoute du canal personnel pour les badges globaux
        const userChannel = window.Echo.private(`user.${auth.user.id}`);

        userChannel.listen('.message.sent', (event) => {
            const { message, conversation } = event;

            // Mettre à jour la conversation dans la liste (badge non lus + dernier message)
            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id !== conversation.id) return conv;
                    return {
                        ...conv,
                        latest_message: message,
                        unread_count: conv.id === activeConversation?.id
                            ? 0
                            : (conv.unread_count || 0) + 1,
                    };
                }).sort((a, b) =>
                    new Date(b.latest_message?.created_at) - new Date(a.latest_message?.created_at)
                )
            );
        });

        return () => {
            userChannel.stopListening('.message.sent');
            window.Echo.leave(`user.${auth.user.id}`);
        };
    }, [auth.user.id, activeConversation?.id]);

    // ─── Écoute de la conversation active ────────────────────────────────────

    useEffect(() => {
        if (!activeConversation || !window.Echo) return;

        // Presence channel pour le typing indicator
        const presenceChannel = window.Echo
            .join(`conversation.${activeConversation.id}`)
            .here((users) => {})
            .joining((user) => {})
            .leaving((user) => {
                setTypingUsers(prev => prev.filter(u => u.id !== user.id));
            })
            .listenForWhisper('typing', (e) => {
                setTypingUsers(prev => {
                    const exists = prev.find(u => u.id === e.user.id);
                    if (!exists) return [...prev, e.user];
                    return prev;
                });
                // Effacer après 3s sans activité
                setTimeout(() => {
                    setTypingUsers(prev => prev.filter(u => u.id !== e.user.id));
                }, 3000);
            });

        // Écoute des nouveaux messages
        const privateChannel = window.Echo.private(`conversation.${activeConversation.id}`);

        privateChannel
            .listen('.message.sent', (event) => {
                const { message } = event;
                // Ajouter le message s'il vient d'un autre utilisateur
                if (message.sender.id !== auth.user.id) {
                    setMessages(prev => [...prev, message]);
                    // Marquer comme lu
                    axios.post(`/api/messages/conversations/${activeConversation.id}/read`);
                }
            })
            .listen('.message.deleted', (event) => {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === event.message.id
                            ? { ...msg, is_deleted: true, content: null }
                            : msg
                    )
                );
            });

        return () => {
            window.Echo.leave(`conversation.${activeConversation.id}`);
        };
    }, [activeConversation?.id, auth.user.id]);

    // ─── Charger une conversation ─────────────────────────────────────────────

    const loadConversation = useCallback(async (conv) => {
        setActiveConversation(conv);
        setMessages([]);
        setNextCursor(null);
        setHasMore(false);
        setLoadingMessages(true);
        setReplyTo(null);

        try {
            const res = await axios.get(`/api/messages/conversations/${conv.id}`);
            setMessages(res.data.messages);
            setNextCursor(res.data.pagination.next_cursor);
            setHasMore(res.data.pagination.has_more);

            // Réinitialiser le badge non lus
            setConversations(prev =>
                prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
            );
        } catch (err) {
            console.error('Erreur chargement conversation', err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // ─── Charger plus de messages (scroll vers le haut) ───────────────────────

    const loadMoreMessages = useCallback(async () => {
        if (!hasMore || loadingMore || !nextCursor) return;
        setLoadingMore(true);

        try {
            const res = await axios.get(`/api/messages/conversations/${activeConversation.id}`, {
                params: { cursor: nextCursor },
            });

            setMessages(prev => [...res.data.messages, ...prev]);
            setNextCursor(res.data.pagination.next_cursor);
            setHasMore(res.data.pagination.has_more);
        } catch (err) {
            console.error('Erreur chargement messages', err);
        } finally {
            setLoadingMore(false);
        }
    }, [activeConversation?.id, hasMore, loadingMore, nextCursor]);

    // ─── Envoyer un message ───────────────────────────────────────────────────

    const sendMessage = useCallback(async () => {
        const content = inputText.trim();
        if (!content || !activeConversation || sending) return;

        setSending(true);
        setInputText('');
        setReplyTo(null);

        // Optimistic update — ajouter le message immédiatement
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            conversation_id: activeConversation.id,
            content,
            type: 'text',
            sender: { id: auth.user.id, name: auth.user.name, avatar: auth.user.avatar },
            is_mine: true,
            reply_to: replyTo,
            attachments: [],
            created_at: new Date().toISOString(),
            is_optimistic: true,
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await axios.post('/api/messages/send', {
                conversation_id: activeConversation.id,
                content,
                reply_to_id: replyTo?.id ?? null,
            });

            // Remplacer le message optimiste par le message réel
            setMessages(prev =>
                prev.map(msg => msg.id === optimisticMsg.id ? res.data : msg)
            );

            // Mettre à jour la liste des conversations
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === activeConversation.id
                        ? { ...conv, latest_message: res.data }
                        : conv
                ).sort((a, b) =>
                    new Date(b.latest_message?.created_at) - new Date(a.latest_message?.created_at)
                )
            );
        } catch (err) {
            // Annuler l'optimistic update en cas d'erreur
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMsg.id));
            setInputText(content); // Restaurer le texte
            console.error('Erreur envoi message', err);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }, [inputText, activeConversation, sending, replyTo, auth.user]);

    // ─── Typing indicator ─────────────────────────────────────────────────────

    const handleTyping = useCallback(() => {
        if (!activeConversation || !window.Echo) return;

        window.Echo.join(`conversation.${activeConversation.id}`)
            .whisper('typing', { user: { id: auth.user.id, name: auth.user.name } });

        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {}, 2000);
    }, [activeConversation?.id, auth.user]);

    // ─── Supprimer un message ─────────────────────────────────────────────────

    const deleteMessage = useCallback(async (messageId) => {
        if (!confirm('Supprimer ce message ?')) return;

        try {
            await axios.delete(`/api/messages/${messageId}`);
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === messageId
                        ? { ...msg, is_deleted: true, content: null }
                        : msg
                )
            );
        } catch (err) {
            console.error('Erreur suppression message', err);
        }
    }, []);

    // ─── Filtrage des conversations ───────────────────────────────────────────

    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            conv.name?.toLowerCase().includes(q) ||
            conv.latest_message?.content?.toLowerCase().includes(q)
        );
    });

    // ─── Rendu ───────────────────────────────────────────────────────────────

    return (
        <>
            <Head title="Messagerie interne" />

            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">

                {/* ══════════════════════════════════════════════════════════
                    PANNEAU 1 — LISTE DES CONVERSATIONS
                ═══════════════════════════════════════════════════════════ */}
                <aside className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">

                    {/* Header liste */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-600" />
                                Messages
                            </h2>
                            <button
                                onClick={() => setShowNewConv(true)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Nouvelle conversation"
                            >
                                <PlusIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Recherche */}
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Liste */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredConversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                Aucune conversation
                            </div>
                        ) : (
                            filteredConversations.map(conv => (
                                <ConversationItem
                                    key={conv.id}
                                    conversation={conv}
                                    isActive={activeConversation?.id === conv.id}
                                    currentUserId={auth.user.id}
                                    onClick={() => loadConversation(conv)}
                                />
                            ))
                        )}
                    </div>
                </aside>

                {/* ══════════════════════════════════════════════════════════
                    PANNEAU 2 — ZONE DE MESSAGES
                ═══════════════════════════════════════════════════════════ */}
                <main className="flex-1 flex flex-col min-w-0">

                    {activeConversation ? (
                        <>
                            {/* Header conversation */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center gap-3">
                                    <ConversationAvatar conversation={activeConversation} size="md" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {activeConversation.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {activeConversation.type === 'group'
                                                ? `${activeConversation.participants?.length} participants`
                                                : 'Conversation directe'
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowContactInfo(!showContactInfo)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">

                                {/* Charger plus */}
                                {hasMore && (
                                    <div className="text-center">
                                        <button
                                            onClick={loadMoreMessages}
                                            disabled={loadingMore}
                                            className="text-xs text-purple-600 hover:underline disabled:opacity-50"
                                        >
                                            {loadingMore ? 'Chargement...' : 'Voir les messages précédents'}
                                        </button>
                                    </div>
                                )}

                                {loadingMessages ? (
                                    <div className="flex-1 flex items-center justify-center py-20">
                                        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg, index) => (
                                            <MessageBubble
                                                key={msg.id}
                                                message={msg}
                                                isMine={msg.sender?.id === auth.user.id || msg.is_mine}
                                                showAvatar={
                                                    index === 0 ||
                                                    messages[index - 1]?.sender?.id !== msg.sender?.id
                                                }
                                                onReply={() => setReplyTo(msg)}
                                                onDelete={() => deleteMessage(msg.id)}
                                            />
                                        ))}
                                    </>
                                )}

                                {/* Typing indicator */}
                                {typingUsers.length > 0 && (
                                    <div className="flex items-center gap-2 px-3">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {typingUsers.map(u => u.name).join(', ')} est en train d'écrire…
                                        </span>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Zone de réponse */}
                            {replyTo && (
                                <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-100 dark:border-purple-800 flex items-center gap-2">
                                    <ArrowUturnLeftIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                            {replyTo.sender?.name}
                                        </p>
                                        <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                                            {replyTo.content}
                                        </p>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="p-1">
                                        <XMarkIcon className="h-4 w-4 text-purple-500" />
                                    </button>
                                </div>
                            )}

                            {/* Input envoi */}
                            <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-700 rounded-2xl px-3 py-2">
                                    {/* Pièce jointe */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-shrink-0 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                        title="Joindre un fichier"
                                    >
                                        <PaperClipIcon className="h-5 w-5 text-gray-500" />
                                    </button>
                                    <input ref={fileInputRef} type="file" className="hidden" multiple />

                                    {/* Emoji */}
                                    <button className="flex-shrink-0 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                                        <FaceSmileIcon className="h-5 w-5 text-gray-500" />
                                    </button>

                                    {/* Textarea */}
                                    <textarea
                                        ref={inputRef}
                                        value={inputText}
                                        onChange={(e) => {
                                            setInputText(e.target.value);
                                            handleTyping();
                                        }}
                                        onKeyDown={(e) => {
                                            // Entrée = envoyer, Shift+Entrée = nouvelle ligne
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Écrire un message… (Entrée pour envoyer)"
                                        rows={1}
                                        className="flex-1 bg-transparent resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none max-h-32 overflow-y-auto"
                                        style={{ minHeight: '24px' }}
                                    />

                                    {/* Bouton envoyer */}
                                    <button
                                        onClick={sendMessage}
                                        disabled={!inputText.trim() || sending}
                                        className="flex-shrink-0 p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl transition-all"
                                    >
                                        <PaperAirplaneIcon className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* État vide — aucune conversation sélectionnée */
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
                            <ChatBubbleLeftRightIcon className="h-16 w-16 opacity-30" />
                            <p className="text-lg font-medium">Sélectionnez une conversation</p>
                            <p className="text-sm">ou démarrez-en une nouvelle</p>
                            <button
                                onClick={() => setShowNewConv(true)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            >
                                Nouvelle conversation
                            </button>
                        </div>
                    )}
                </main>

                {/* ══════════════════════════════════════════════════════════
                    PANNEAU 3 — INFOS CONTACT
                ═══════════════════════════════════════════════════════════ */}
                {showContactInfo && activeConversation && (
                    <aside className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-y-auto">
                        <ContactInfoPanel
                            conversation={activeConversation}
                            currentUserId={auth.user.id}
                            onClose={() => setShowContactInfo(false)}
                        />
                    </aside>
                )}
            </div>

            {/* Modal nouvelle conversation */}
            {showNewConv && (
                <NewConversationModal
                    onClose={() => setShowNewConv(false)}
                    onCreated={(conv) => {
                        setConversations(prev => [conv, ...prev]);
                        setShowNewConv(false);
                        loadConversation(conv);
                    }}
                />
            )}
        </>
    );
}

// ─── Sous-composant : Item conversation dans la liste ─────────────────────────

function ConversationItem({ conversation, isActive, currentUserId, onClick }) {
    const otherParticipant = conversation.type === 'direct'
        ? conversation.participants?.find(p => p.id !== currentUserId)
        : null;

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'maintenant';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-50 dark:border-gray-700/50 ${
                isActive ? 'bg-purple-50 dark:bg-purple-900/20 border-r-2 border-r-blue-600' : ''
            }`}
        >
            {/* Avatar */}
            <ConversationAvatar conversation={conversation} size="sm" />

            {/* Contenu */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>
                        {conversation.name}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {formatTime(conversation.latest_message?.created_at)}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {conversation.latest_message?.is_deleted
                            ? <em>Message supprimé</em>
                            : conversation.latest_message?.content || 'Aucun message'
                        }
                    </p>

                    {/* Badge non lus */}
                    {conversation.unread_count > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ─── Sous-composant : Bulle de message ───────────────────────────────────────

function MessageBubble({ message, isMine, showAvatar, onReply, onDelete }) {
    const [showActions, setShowActions] = useState(false);

    if (message.is_deleted) {
        return (
            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <p className="text-xs text-gray-400 italic px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    Message supprimé
                </p>
            </div>
        );
    }

    return (
        <div
            className={`flex items-end gap-2 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar (côté gauche uniquement) */}
            {!isMine && (
                <div className="w-7 h-7 flex-shrink-0">
                    {showAvatar && (
                        <img
                            src={message.sender?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender?.name)}&size=28`}
                            alt={message.sender?.name}
                            className="w-7 h-7 rounded-full object-cover"
                        />
                    )}
                </div>
            )}

            <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {/* Nom expéditeur (groupes) */}
                {!isMine && showAvatar && (
                    <span className="text-[11px] font-medium text-gray-500 px-1">
                        {message.sender?.name}
                    </span>
                )}

                {/* Réponse à */}
                {message.reply_to && (
                    <div className={`px-2 py-1 text-xs rounded-lg border-l-2 border-purple-400 bg-gray-100 dark:bg-gray-700 mb-0.5 ${isMine ? 'self-end' : 'self-start'}`}>
                        <span className="font-medium text-purple-600">{message.reply_to.sender_name}</span>
                        <p className="text-gray-500 truncate">{message.reply_to.content}</p>
                    </div>
                )}

                {/* Bulle */}
                <div
                    className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMine
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm border border-gray-100 dark:border-gray-600'
                    } ${message.is_optimistic ? 'opacity-70' : ''}`}
                >
                    {/* Pièces jointes */}
                    {message.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                            {message.attachments.map(att => (
                                <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
                                   className="text-xs underline opacity-80">
                                    📎 {att.filename}
                                </a>
                            ))}
                        </div>
                    )}

                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>

                {/* Métadonnées */}
                <div className={`flex items-center gap-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] text-gray-400">
                        {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {/* Statut lu (côté envoyeur uniquement) */}
                    {isMine && !message.is_optimistic && (
                        message.reads?.length > 0
                            ? <span title="Lu"><CheckCheckIcon className="h-3 w-3 text-purple-400" /></span>
                            : <span title="Envoyé"><CheckIcon className="h-3 w-3 text-gray-400" /></span>
                    )}
                </div>
            </div>

            {/* Actions au survol */}
            {showActions && !message.is_optimistic && (
                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'flex-row-reverse' : ''}`}>
                    <button
                        onClick={onReply}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Répondre"
                    >
                        <ArrowUturnLeftIcon className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                    {isMine && (
                        <button
                            onClick={onDelete}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Supprimer"
                        >
                            <TrashIcon className="h-3.5 w-3.5 text-red-500" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Sous-composant : Avatar conversation ────────────────────────────────────

function ConversationAvatar({ conversation, size = 'md' }) {
    const sizeClass = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-10 h-10 text-base';

    if (conversation.type === 'group') {
        return (
            <div className={`${sizeClass} rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0`}>
                <UserGroupIcon className="h-5 w-5 text-white" />
            </div>
        );
    }

    if (conversation.avatar) {
        return <img src={conversation.avatar} alt={conversation.name} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />;
    }

    return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center flex-shrink-0 text-white font-semibold`}>
            {conversation.name?.charAt(0)?.toUpperCase()}
        </div>
    );
}

// ─── Sous-composant : Panneau infos contact ───────────────────────────────────

function ContactInfoPanel({ conversation, currentUserId, onClose }) {
    const contact = conversation.type === 'direct'
        ? conversation.participants?.find(p => p.id !== currentUserId)
        : null;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Informations</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <XMarkIcon className="h-4 w-4 text-gray-500" />
                </button>
            </div>

            <div className="flex-1 p-4 space-y-6">
                {/* Avatar et nom */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <ConversationAvatar conversation={conversation} size="lg" />
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{conversation.name}</p>
                        {contact && (
                            <p className="text-xs text-gray-500">
                                {contact.status === 'active' ? '● En ligne' : '○ Hors ligne'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Participants (groupe) */}
                {conversation.type === 'group' && (
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Participants ({conversation.participants?.length})
                        </p>
                        <div className="space-y-2">
                            {conversation.participants?.map(p => (
                                <div key={p.id} className="flex items-center gap-2">
                                    <img
                                        src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=28`}
                                        className="w-7 h-7 rounded-full"
                                        alt={p.name}
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {p.name}
                                        {p.id === currentUserId && ' (vous)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions rapides (direct) */}
                {contact && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</p>
                        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                            <PhoneIcon className="h-4 w-4 text-gray-400" />
                            Appeler
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                            <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                            Envoyer un email
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sous-composant : Modal nouvelle conversation ─────────────────────────────

function NewConversationModal({ onClose, onCreated }) {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Rechercher des utilisateurs
    useEffect(() => {
        if (!search || search.length < 2) { setUsers([]); return; }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await axios.get('/api/users/search', { params: { q: search } });
                setUsers(res.data);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const toggleUser = (user) => {
        setSelected(prev =>
            prev.find(u => u.id === user.id)
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
        );
    };

    const create = async () => {
        if (!selected.length || creating) return;
        setCreating(true);

        try {
            const res = await axios.post('/api/messages/conversations', {
                type: selected.length === 1 ? 'direct' : 'group',
                name: selected.length > 1 ? groupName || selected.map(u => u.name).join(', ') : undefined,
                participant_ids: selected.map(u => u.id),
            });
            onCreated(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Nouvelle conversation</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Sélection utilisateurs */}
                {selected.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {selected.map(u => (
                            <span key={u.id} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                                {u.name}
                                <button onClick={() => toggleUser(u)}>
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Nom du groupe si > 1 personne */}
                {selected.length > 1 && (
                    <input
                        type="text"
                        placeholder="Nom du groupe (optionnel)"
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        className="w-full mb-3 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                )}

                {/* Recherche utilisateurs */}
                <div className="relative mb-3">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un collègue..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1">
                    {loading && <p className="text-center text-sm text-gray-400 py-4">Recherche…</p>}
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => toggleUser(u)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selected.find(s => s.id === u.id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                        >
                            <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=32`}
                                className="w-8 h-8 rounded-full object-cover"
                                alt={u.name}
                            />
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.job_title}</p>
                            </div>
                            {selected.find(s => s.id === u.id) && (
                                <CheckIcon className="ml-auto h-4 w-4 text-purple-600" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex gap-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Annuler
                    </button>
                    <button
                        onClick={create}
                        disabled={!selected.length || creating}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40"
                    >
                        {creating ? 'Création…' : 'Démarrer'}
                    </button>
                </div>
            </div>
        </div>
    );
}
export { MessagesIndex };
