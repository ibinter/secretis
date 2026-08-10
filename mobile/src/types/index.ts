// ============================================================
// SECRETIS — Types globaux
// ============================================================

export type SecretisStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE'
  | 'EN_COURS'
  | 'SOUMIS'
  | 'EN_REVISION'
  | 'APPROUVE'
  | 'REJETE'
  | 'ANNULE'
  | 'CLOTURE'
  | 'ARCHIVE'
  | 'SUSPENDU'
  | 'PLANIFIE'
  | 'REPORTE'
  | 'URGENT'
  | 'CRITIQUE'
  | 'TERMINE'
  | 'TRAITE'
  | 'NON_TRAITE';

export type TaskPriority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export type EventType = 'REUNION' | 'TACHE' | 'RAPPEL' | 'CONGE' | 'FORMATION' | 'AUTRE';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  roleLabel: string;
  organisation: string;
  organisationId: string;
  isActive: boolean;
  biometricEnabled?: boolean;
  notificationsEnabled?: boolean;
  lastLogin?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: SecretisStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: User[];
  createdBy: User;
  subtasks: Subtask[];
  comments: Comment[];
  tags: string[];
  isOverdue: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: User;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  onlineLink?: string;
  participants: User[];
  organizer: User;
  status: SecretisStatus;
  color?: string;
}

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
  avatar?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: MessageType;
  sender: User;
  sentAt: string;
  readBy: string[];
  attachment?: Attachment;
  isTyping?: boolean;
}

export interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  purpose: string;
  hostUser: User;
  checkInAt?: string;
  checkOutAt?: string;
  status: 'PRESENT' | 'PARTI' | 'EN_ATTENTE';
  badge?: string;
}

export interface Mail {
  id: string;
  subject: string;
  sender: string;
  recipient: string;
  receivedAt: string;
  status: SecretisStatus;
  priority: TaskPriority;
  hasAttachments: boolean;
  isRead: boolean;
  body?: string;
  attachments?: Attachment[];
}

export interface KpiData {
  tasksOverdue: number;
  mailsUnprocessed: number;
  meetingsToday: number;
  visitorsPresent: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'TASK' | 'MAIL' | 'AGENDA' | 'VISITOR' | 'MESSAGE' | 'SYSTEM';
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
