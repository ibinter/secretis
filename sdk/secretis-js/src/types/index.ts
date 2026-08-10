// =============================================================================
// IBIG SECRETIS JS SDK — Types TypeScript
// =============================================================================

// ---------------------------------------------------------------------------
// Configuration client
// ---------------------------------------------------------------------------

export interface SecretisClientConfig {
  /** URL de base de votre organisation. Ex: https://acme-ci.secretis.ibigsoft.com */
  baseUrl: string;
  /** Token Sanctum (Bearer). Obtenu via POST /auth/login */
  apiKey: string;
  /** Timeout en millisecondes (défaut: 30000) */
  timeout?: number;
  /** Version de l'API (défaut: v1) */
  apiVersion?: string;
}

// ---------------------------------------------------------------------------
// Réponses API standard
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  meta: ApiMeta;
}

export interface ApiMeta {
  api_version: string;
  timestamp: string;
  request_id: string;
  /** Présent sur les réponses paginées */
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  from?: number | null;
  to?: number | null;
  /** Présent sur /tasks/index */
  overdue_count?: number;
  /** Présent sur /notifications/index */
  unread_count?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta & {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Erreur SDK
// ---------------------------------------------------------------------------

export interface ApiErrorData {
  success: false;
  message: string;
  error_code?: string;
  errors?: Record<string, string[]>;
  meta?: ApiMeta;
}

// ---------------------------------------------------------------------------
// MODELS
// ---------------------------------------------------------------------------

// ---- Organization ----------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  country: string;
  timezone: string;
  status: 'active' | 'trial' | 'grace' | 'suspended' | 'expired';
  trial_ends_at: string | null;
  logo_url: string | null;
  settings: {
    language: string;
    enabled_modules: string[];
  };
  created_at: string;
}

// ---- User ------------------------------------------------------------------

export interface User {
  id: number;
  organization_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'locked';
  roles: string[];
  department: Department | null;
  last_login_at: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

// ---- Event -----------------------------------------------------------------

export type EventType = 'event' | 'meeting' | 'task' | 'reminder';

export interface Event {
  id: string;
  calendar_id: string;
  creator_id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  recurrence_rule: string | null;
  color: string | null;
  type: EventType;
  meet_link: string | null;
  reminders: Array<{ minutes: number; channel: 'email' | 'push' | 'sms' }>;
  participants: Array<{
    user_id: number;
    name: string;
    status: 'pending' | 'accepted' | 'declined';
  }>;
  created_at: string;
  updated_at: string;
}

/** Format FullCalendar.js retourné par GET /events */
export interface EventCalendarFormat {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  extendedProps: {
    type: EventType;
    description: string | null;
    location: string | null;
    meet_link: string | null;
    recurrence_rule: string | null;
    calendar_id: string;
    creator_name: string | null;
    participants_count: number;
    has_room: boolean;
  };
}

export interface ListEventsParams {
  /** Début de la plage (date ISO) — obligatoire */
  start: string;
  /** Fin de la plage (date ISO) — obligatoire */
  end: string;
  view?: 'month' | 'week' | 'day' | 'list';
  calendar_id?: string;
  type?: EventType;
}

export interface CreateEventData {
  title: string;
  start_at: string;
  end_at: string;
  calendar_id?: string;
  description?: string;
  location?: string;
  is_all_day?: boolean;
  recurrence_rule?: string;
  color?: string;
  type?: EventType;
  meet_link?: string;
  participant_ids?: number[];
  reminders?: Array<{ minutes: number; channel: 'email' | 'push' }>;
}

export type UpdateEventData = Partial<CreateEventData>;

// ---- Task ------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  project_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  is_overdue: boolean;
  assignees: User[];
  subtasks_count: number;
  subtasks_progress: number;
  created_at: string;
  updated_at: string;
}

export interface ListTasksParams {
  project_id?: string;
  status?: TaskStatus;
  assignee_id?: number;
  priority?: TaskPriority;
  page?: number;
  per_page?: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  project_id?: string;
  parent_id?: string;
  priority?: TaskPriority;
  due_date?: string;
  assignee_ids?: number[];
}

export type UpdateTaskData = Partial<CreateTaskData>;

// ---- MailRegistry ----------------------------------------------------------

export type MailType = 'incoming' | 'outgoing';
export type MailStatus = 'pending' | 'processing' | 'processed' | 'archived';
export type MailUrgency = 'low' | 'normal' | 'high' | 'urgent';

export interface MailRegistry {
  id: string;
  type: MailType;
  reference: string;
  sender_name: string | null;
  sender_org: string | null;
  recipient_name: string | null;
  recipient_org: string | null;
  subject: string;
  urgency: MailUrgency;
  received_at: string | null;
  sent_at: string | null;
  status: MailStatus;
  notes: string | null;
  assignee: User | null;
  attachments: Array<{
    id: string;
    name: string;
    size: number;
    mime: string;
    url: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ListMailParams {
  status?: MailStatus;
  type?: MailType;
  search?: string;
  page?: number;
  per_page?: number;
  urgency?: MailUrgency;
}

export interface CreateMailData {
  type: MailType;
  subject: string;
  sender_name?: string;
  sender_org?: string;
  recipient_name?: string;
  recipient_org?: string;
  urgency?: MailUrgency;
  received_at?: string;
  sent_at?: string;
  notes?: string;
  processing_delay_days?: number;
}

// ---- Invoice ---------------------------------------------------------------

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  client_name: string;
  client_email: string;
  client_address: string | null;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  balance: number;
  items: InvoiceItem[];
  notes: string | null;
  payment_gateway: 'cinetpay' | 'paystack' | 'flutterwave' | null;
  pdf_url: string | null;
  created_at: string;
}

export interface ListInvoicesParams {
  status?: InvoiceStatus;
  page?: number;
  per_page?: number;
}

export interface CreateInvoiceData {
  client_name: string;
  client_email: string;
  client_address?: string;
  issue_date?: string;
  due_date?: string;
  currency?: string;
  tax_rate?: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  notes?: string;
}

export interface RecordPaymentData {
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'mobile_money' | 'cinetpay' | 'paystack' | 'flutterwave';
  reference?: string;
  paid_at?: string;
}

// ---- Notification ----------------------------------------------------------

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ListNotificationsParams {
  unread_only?: boolean;
  page?: number;
  per_page?: number;
}

// ---- Auth ------------------------------------------------------------------

export interface LoginData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthResult {
  token: string;
  token_type: 'Bearer';
  user: User;
  organization: Organization;
  license_status: string;
  permissions: string[];
}
