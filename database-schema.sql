-- =============================================================================
-- IBIG SECRETIS ERP - Schéma PostgreSQL complet
-- Version : 1.0.0
-- Stack   : Laravel 11 / PostgreSQL / Multi-tenant par organization_id
-- =============================================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================================
-- SECTION 0 : DOMAINES ENUM RÉUTILISABLES
-- =============================================================================

CREATE TYPE license_status_enum   AS ENUM ('trial','active','grace','expired','suspended','revoked');
CREATE TYPE access_level_enum     AS ENUM ('public','internal','confidential','top_secret');
CREATE TYPE urgency_enum          AS ENUM ('low','normal','high','urgent');
CREATE TYPE priority_enum         AS ENUM ('low','normal','high','urgent');
CREATE TYPE task_status_enum      AS ENUM ('todo','in_progress','review','done','cancelled');
CREATE TYPE meeting_status_enum   AS ENUM ('planned','ongoing','completed','cancelled');
CREATE TYPE visit_status_enum     AS ENUM ('expected','arrived','departed');
CREATE TYPE appt_status_enum      AS ENUM ('pending','confirmed','arrived','cancelled');
CREATE TYPE request_status_enum   AS ENUM ('pending','approved','rejected');
CREATE TYPE leave_type_enum       AS ENUM ('annual','sick','maternity','unpaid','recovery');
CREATE TYPE leave_status_enum     AS ENUM ('pending','approved_n1','approved_hr','rejected');
CREATE TYPE expense_status_enum   AS ENUM ('draft','submitted','approved','rejected','paid');
CREATE TYPE expense_cat_enum      AS ENUM ('transport','accommodation','meals','other');
CREATE TYPE payment_status_enum   AS ENUM ('pending','completed','failed','refunded');
CREATE TYPE vehicle_status_enum   AS ENUM ('available','in_use','maintenance');
CREATE TYPE equip_status_enum     AS ENUM ('available','assigned','maintenance','retired');
CREATE TYPE notif_channel_enum    AS ENUM ('app','email','sms','whatsapp');
CREATE TYPE ticket_status_enum    AS ENUM ('new','open','assigned','in_progress','waiting','resolved','closed');
CREATE TYPE supply_move_enum      AS ENUM ('in','out');
CREATE TYPE mail_type_enum        AS ENUM ('incoming','outgoing');
CREATE TYPE mail_status_enum      AS ENUM ('pending','processing','processed','archived');
CREATE TYPE calendar_type_enum    AS ENUM ('personal','shared','organization');
CREATE TYPE event_type_enum       AS ENUM ('event','meeting','task','reminder');
CREATE TYPE conv_type_enum        AS ENUM ('direct','group');
CREATE TYPE msg_type_enum         AS ENUM ('text','file');
CREATE TYPE contract_type_enum    AS ENUM ('cdi','cdd','internship','freelance','other');

-- =============================================================================
-- SECTION 1 : SOCLE / AUTH
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Plans (défini avant organizations pour la FK)
-- -----------------------------------------------------------------------------
CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100)     NOT NULL,
    max_users       INTEGER          NOT NULL DEFAULT 10,
    max_storage_gb  INTEGER          NOT NULL DEFAULT 5,
    features        JSONB            NOT NULL DEFAULT '{}',
    price_monthly   NUMERIC(10,2)    NOT NULL DEFAULT 0,
    price_yearly    NUMERIC(10,2)    NOT NULL DEFAULT 0,
    currency        VARCHAR(3)       NOT NULL DEFAULT 'XOF',
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plans IS 'Plans tarifaires SaaS (Starter, Pro, Enterprise…)';

-- -----------------------------------------------------------------------------
-- Organizations
-- -----------------------------------------------------------------------------
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)     NOT NULL,
    slug            VARCHAR(100)     NOT NULL UNIQUE,
    logo            VARCHAR(500),
    email           VARCHAR(255)     NOT NULL,
    phone           VARCHAR(50),
    address         TEXT,
    timezone        VARCHAR(50)      NOT NULL DEFAULT 'Africa/Abidjan',
    locale          VARCHAR(10)      NOT NULL DEFAULT 'fr',
    currency        VARCHAR(3)       NOT NULL DEFAULT 'XOF',
    plan_id         UUID             REFERENCES plans(id) ON DELETE SET NULL,
    trial_ends_at   TIMESTAMPTZ,
    license_status  license_status_enum NOT NULL DEFAULT 'trial',
    settings        JSONB            NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Tenants — chaque organisation est un tenant isolé';
COMMENT ON COLUMN organizations.slug IS 'Identifiant URL unique (ex : mairie-abidjan)';
COMMENT ON COLUMN organizations.settings IS 'Paramètres libres : modules activés, branding, etc.';

-- -----------------------------------------------------------------------------
-- Departments
-- -----------------------------------------------------------------------------
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    parent_id       UUID             REFERENCES departments(id) ON DELETE SET NULL,
    head_user_id    UUID,            -- FK vers users (ajoutée après)
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE departments IS 'Organigramme hiérarchique des directions/services';

-- -----------------------------------------------------------------------------
-- Users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    email           VARCHAR(255)     NOT NULL,
    password        VARCHAR(255)     NOT NULL,
    role            VARCHAR(50)      NOT NULL DEFAULT 'user',
    department_id   UUID             REFERENCES departments(id) ON DELETE SET NULL,
    job_title       VARCHAR(255),
    phone           VARCHAR(50),
    avatar          VARCHAR(500),
    locale          VARCHAR(10)      NOT NULL DEFAULT 'fr',
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, email)
);

COMMENT ON TABLE users IS 'Utilisateurs — email unique par organisation';

-- Maintenant on peut ajouter la FK head_user_id sur departments
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Roles & Permissions (Spatie-style)
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
    id              BIGSERIAL        PRIMARY KEY,
    name            VARCHAR(255)     NOT NULL,
    guard_name      VARCHAR(255)     NOT NULL DEFAULT 'web',
    organization_id UUID             REFERENCES organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (name, guard_name, organization_id)
);

COMMENT ON TABLE roles IS 'Rôles RBAC — peuvent être globaux (organization_id NULL) ou propres à un tenant';

CREATE TABLE permissions (
    id              BIGSERIAL        PRIMARY KEY,
    name            VARCHAR(255)     NOT NULL,
    guard_name      VARCHAR(255)     NOT NULL DEFAULT 'web',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (name, guard_name)
);

COMMENT ON TABLE permissions IS 'Permissions atomiques (ex : documents.create)';

CREATE TABLE model_has_roles (
    role_id         BIGINT           NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    model_type      VARCHAR(255)     NOT NULL,
    model_id        UUID             NOT NULL,
    PRIMARY KEY (role_id, model_id, model_type)
);

CREATE TABLE model_has_permissions (
    permission_id   BIGINT           NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    model_type      VARCHAR(255)     NOT NULL,
    model_id        UUID             NOT NULL,
    PRIMARY KEY (permission_id, model_id, model_type)
);

CREATE TABLE role_has_permissions (
    permission_id   BIGINT           NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    role_id         BIGINT           NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (permission_id, role_id)
);

-- -----------------------------------------------------------------------------
-- Audit Logs
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID             REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100)     NOT NULL,
    module          VARCHAR(100)     NOT NULL,
    resource_type   VARCHAR(100)     NOT NULL,
    resource_id     UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Traçabilité complète de toutes les actions utilisateur';
COMMENT ON COLUMN audit_logs.action IS 'Ex : created, updated, deleted, viewed, exported';

-- =============================================================================
-- SECTION 2 : MODULE AGENDA
-- =============================================================================

CREATE TABLE calendars (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    color           VARCHAR(7)       NOT NULL DEFAULT '#3B82F6',
    type            calendar_type_enum NOT NULL DEFAULT 'personal',
    is_default      BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE calendars IS 'Agendas personnels, partagés ou organisationnels';

CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    calendar_id     UUID             NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    creator_id      UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255)     NOT NULL,
    description     TEXT,
    location        VARCHAR(500),
    start_at        TIMESTAMPTZ      NOT NULL,
    end_at          TIMESTAMPTZ      NOT NULL,
    is_all_day      BOOLEAN          NOT NULL DEFAULT FALSE,
    recurrence_rule VARCHAR(500),
    color           VARCHAR(7),
    type            event_type_enum  NOT NULL DEFAULT 'event',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_event_dates CHECK (end_at >= start_at)
);

COMMENT ON TABLE events IS 'Événements agenda — supporte la récurrence RRULE';
COMMENT ON COLUMN events.recurrence_rule IS 'Format iCalendar RRULE (ex : FREQ=WEEKLY;BYDAY=MO,WE)';

CREATE TABLE event_participants (
    id              BIGSERIAL        PRIMARY KEY,
    event_id        UUID             NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20)      NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','declined')),
    role            VARCHAR(20)      NOT NULL DEFAULT 'participant'
                        CHECK (role IN ('organizer','participant')),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

CREATE TABLE room_reservations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    room_id         UUID             NOT NULL, -- FK vers rooms (table définie plus bas)
    event_id        UUID             REFERENCES events(id) ON DELETE SET NULL,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at        TIMESTAMPTZ      NOT NULL,
    end_at          TIMESTAMPTZ      NOT NULL,
    status          request_status_enum NOT NULL DEFAULT 'pending',
    notes           TEXT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reservation_dates CHECK (end_at > start_at)
);

COMMENT ON TABLE room_reservations IS 'Réservations de salles — liées optionnellement à un événement agenda';

-- =============================================================================
-- SECTION 3 : MODULE COURRIER & GED
-- =============================================================================

CREATE TABLE mail_registry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type            mail_type_enum   NOT NULL,
    reference       VARCHAR(100)     NOT NULL,
    sender_name     VARCHAR(255),
    sender_org      VARCHAR(255),
    recipient_name  VARCHAR(255),
    recipient_org   VARCHAR(255),
    subject         VARCHAR(500)     NOT NULL,
    urgency         urgency_enum     NOT NULL DEFAULT 'normal',
    received_at     TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    assigned_to_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    department_id   UUID             REFERENCES departments(id) ON DELETE SET NULL,
    status          mail_status_enum NOT NULL DEFAULT 'pending',
    notes           TEXT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, reference)
);

COMMENT ON TABLE mail_registry IS 'Registre courrier entrant/sortant avec numéro de référence unique par organisation';

CREATE TABLE mail_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mail_id         UUID             NOT NULL REFERENCES mail_registry(id) ON DELETE CASCADE,
    filename        VARCHAR(255)     NOT NULL,
    path            VARCHAR(1000)    NOT NULL,
    mime_type       VARCHAR(100),
    size            BIGINT           NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE document_folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    parent_id       UUID             REFERENCES document_folders(id) ON DELETE CASCADE,
    created_by_id   UUID             REFERENCES users(id) ON DELETE SET NULL,
    access_level    access_level_enum NOT NULL DEFAULT 'internal',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_folders IS 'Arborescence GED avec niveaux de confidentialité';

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    folder_id       UUID             REFERENCES document_folders(id) ON DELETE SET NULL,
    title           VARCHAR(500)     NOT NULL,
    description     TEXT,
    type            VARCHAR(100),
    department_id   UUID             REFERENCES departments(id) ON DELETE SET NULL,
    author_id       UUID             REFERENCES users(id) ON DELETE SET NULL,
    current_version INTEGER          NOT NULL DEFAULT 1,
    status          VARCHAR(50)      NOT NULL DEFAULT 'active',
    access_level    access_level_enum NOT NULL DEFAULT 'internal',
    keywords        TEXT[],
    mime_type       VARCHAR(100),
    file_path       VARCHAR(1000),
    file_size       BIGINT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'Documents GED avec versioning et niveaux de confidentialité';
COMMENT ON COLUMN documents.keywords IS 'Mots-clés pour la recherche full-text';

CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID             NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number  INTEGER          NOT NULL,
    file_path       VARCHAR(1000)    NOT NULL,
    file_size       BIGINT,
    uploaded_by_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, version_number)
);

CREATE TABLE document_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    type            VARCHAR(100),
    content         JSONB            NOT NULL DEFAULT '{}',
    variables       JSONB            NOT NULL DEFAULT '[]',
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_templates IS 'Modèles de documents avec variables de fusion';

-- =============================================================================
-- SECTION 4 : MODULE RÉUNIONS
-- =============================================================================

CREATE TABLE meetings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title                 VARCHAR(500)     NOT NULL,
    description           TEXT,
    location              VARCHAR(500),
    meeting_link          VARCHAR(500),
    organizer_id          UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at              TIMESTAMPTZ      NOT NULL,
    end_at                TIMESTAMPTZ      NOT NULL,
    status                meeting_status_enum NOT NULL DEFAULT 'planned',
    agenda                JSONB            NOT NULL DEFAULT '[]',
    notes                 TEXT,
    minutes_approved_by_id UUID            REFERENCES users(id) ON DELETE SET NULL,
    minutes_approved_at   TIMESTAMPTZ,
    created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_meeting_dates CHECK (end_at >= start_at)
);

COMMENT ON TABLE meetings IS 'Réunions — PV électronique avec approbation';
COMMENT ON COLUMN meetings.agenda IS 'Points à l'ordre du jour [{"order":1,"title":"...","duration":15}]';

CREATE TABLE meeting_participants (
    id              BIGSERIAL        PRIMARY KEY,
    meeting_id      UUID             NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20)      NOT NULL DEFAULT 'invited'
                        CHECK (status IN ('invited','accepted','declined','attended')),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (meeting_id, user_id)
);

CREATE TABLE meeting_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id      UUID             NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    description     TEXT             NOT NULL,
    assigned_to_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    due_date        DATE,
    status          VARCHAR(20)      NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','done')),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE meeting_action_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id      UUID             NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    description     TEXT             NOT NULL,
    assigned_to_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    due_date        DATE,
    status          VARCHAR(50)      NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 5 : MODULE TÂCHES
-- =============================================================================

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    description     TEXT,
    manager_id      UUID             REFERENCES users(id) ON DELETE SET NULL,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(30)      NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','on_hold','completed','cancelled')),
    budget          NUMERIC(15,2),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id      UUID             REFERENCES projects(id) ON DELETE SET NULL,
    title           VARCHAR(500)     NOT NULL,
    description     TEXT,
    priority        priority_enum    NOT NULL DEFAULT 'normal',
    status          task_status_enum NOT NULL DEFAULT 'todo',
    assignee_id     UUID             REFERENCES users(id) ON DELETE SET NULL,
    creator_id      UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    due_date        DATE,
    estimated_hours NUMERIC(6,2),
    parent_task_id  UUID             REFERENCES tasks(id) ON DELETE SET NULL,
    position        INTEGER          NOT NULL DEFAULT 0,
    department_id   UUID             REFERENCES departments(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'Tâches avec sous-tâches (parent_task_id), Kanban (position) et Gantt (dates)';

CREATE TABLE task_observers (
    task_id         UUID             NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);

CREATE TABLE task_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID             NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT             NOT NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE task_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID             NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    filename        VARCHAR(255)     NOT NULL,
    path            VARCHAR(1000)    NOT NULL,
    uploaded_by_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 6 : MODULE COMMUNICATION
-- =============================================================================

CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type            conv_type_enum   NOT NULL DEFAULT 'direct',
    name            VARCHAR(255),
    created_by_id   UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
    conversation_id UUID             NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    last_read_at    TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sender_id       UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID             NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content         TEXT,
    type            msg_type_enum    NOT NULL DEFAULT 'text',
    file_path       VARCHAR(1000),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE messages IS 'Messagerie interne temps-réel (WebSocket Laravel Reverb)';

CREATE TABLE circulars (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title                   VARCHAR(500)     NOT NULL,
    content                 TEXT             NOT NULL,
    sender_id               UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_type          VARCHAR(20)      NOT NULL DEFAULT 'all'
                                CHECK (recipient_type IN ('all','department','role','custom')),
    recipient_ids           JSONB            NOT NULL DEFAULT '[]',
    published_at            TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ,
    requires_acknowledgment BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE circulars IS 'Notes de service et circulaires avec accusé de réception optionnel';

CREATE TABLE circular_acknowledgments (
    circular_id     UUID             NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    PRIMARY KEY (circular_id, user_id)
);

CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type            VARCHAR(20)      NOT NULL DEFAULT 'external'
                        CHECK (type IN ('internal','external')),
    name            VARCHAR(255)     NOT NULL,
    company         VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    department      VARCHAR(255),
    notes           TEXT,
    is_blacklisted  BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title           VARCHAR(500)     NOT NULL,
    content         TEXT             NOT NULL,
    category        VARCHAR(100),
    priority        priority_enum    NOT NULL DEFAULT 'normal',
    author_id       UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    is_pinned       BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE announcements IS 'Tableau d'affichage — annonces et informations générales';

-- =============================================================================
-- SECTION 7 : MODULE ACCUEIL VISITEURS
-- =============================================================================

CREATE TABLE visitors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    company         VARCHAR(255),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    id_number       VARCHAR(100),
    photo_path      VARCHAR(500),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE visitors IS 'Répertoire des visiteurs (dédupliqué par organisation)';

CREATE TABLE visitor_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id      UUID             NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    host_user_id    UUID             REFERENCES users(id) ON DELETE SET NULL,
    purpose         VARCHAR(500)     NOT NULL,
    arrived_at      TIMESTAMPTZ,
    departed_at     TIMESTAMPTZ,
    badge_number    VARCHAR(50),
    signature_path  VARCHAR(500),
    notes           TEXT,
    status          visit_status_enum NOT NULL DEFAULT 'expected',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE visitor_logs IS 'Journal des entrées/sorties visiteurs avec signature électronique';

CREATE TABLE visitor_appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_name        VARCHAR(255)     NOT NULL,
    visitor_email       VARCHAR(255),
    visitor_phone       VARCHAR(50),
    host_user_id        UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose             VARCHAR(500)     NOT NULL,
    scheduled_at        TIMESTAMPTZ      NOT NULL,
    status              appt_status_enum NOT NULL DEFAULT 'pending',
    confirmation_token  VARCHAR(100)     UNIQUE,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE visitor_appointments IS 'Rendez-vous pré-enregistrés — QR code via confirmation_token';

CREATE TABLE queue_tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ticket_number   VARCHAR(20)      NOT NULL,
    visitor_id      UUID             REFERENCES visitors(id) ON DELETE SET NULL,
    service         VARCHAR(255)     NOT NULL,
    status          VARCHAR(20)      NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting','called','served','cancelled')),
    issued_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    called_at       TIMESTAMPTZ,
    served_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE queue_tickets IS 'Gestion de file d'attente avec tickets numérotés';

-- =============================================================================
-- SECTION 8 : MODULE RESSOURCES
-- =============================================================================

CREATE TABLE rooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    location        VARCHAR(500),
    capacity        INTEGER          NOT NULL DEFAULT 1,
    equipment       JSONB            NOT NULL DEFAULT '[]',
    photos          JSONB            NOT NULL DEFAULT '[]',
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rooms IS 'Salles de réunion et espaces partagés';
COMMENT ON COLUMN rooms.equipment IS '[{"name":"Projecteur","quantity":1},...]';

-- Maintenant on peut ajouter la FK de room_reservations vers rooms
ALTER TABLE room_reservations
    ADD CONSTRAINT fk_room_reservations_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

CREATE TABLE equipment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    category        VARCHAR(100),
    serial_number   VARCHAR(255),
    purchase_date   DATE,
    warranty_until  DATE,
    assigned_to_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    status          equip_status_enum NOT NULL DEFAULT 'available',
    notes           TEXT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE equipment IS 'Parc matériel informatique et bureautique';

CREATE TABLE supplies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    category        VARCHAR(100),
    unit            VARCHAR(50)      NOT NULL DEFAULT 'pièce',
    quantity        NUMERIC(10,3)    NOT NULL DEFAULT 0,
    min_quantity    NUMERIC(10,3)    NOT NULL DEFAULT 0,
    location        VARCHAR(255),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_supplies_quantity CHECK (quantity >= 0)
);

COMMENT ON TABLE supplies IS 'Stock de fournitures de bureau avec seuil d'alerte (min_quantity)';

CREATE TABLE supply_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supply_id       UUID             NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
    type            supply_move_enum NOT NULL,
    quantity        NUMERIC(10,3)    NOT NULL,
    reason          VARCHAR(500),
    user_id         UUID             REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_movement_qty CHECK (quantity > 0)
);

COMMENT ON TABLE supply_movements IS 'Mouvements de stock (entrée/sortie) — historique complet';

CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brand           VARCHAR(100)     NOT NULL,
    model           VARCHAR(100)     NOT NULL,
    plate           VARCHAR(50)      NOT NULL,
    year            SMALLINT,
    fuel_type       VARCHAR(50),
    status          vehicle_status_enum NOT NULL DEFAULT 'available',
    mileage         INTEGER          NOT NULL DEFAULT 0,
    insurance_until DATE,
    control_until   DATE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, plate)
);

COMMENT ON TABLE vehicles IS 'Flotte de véhicules avec suivi des assurances et contrôles techniques';

CREATE TABLE vehicle_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      UUID             NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id       UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at        TIMESTAMPTZ      NOT NULL,
    end_at          TIMESTAMPTZ,
    start_mileage   INTEGER          NOT NULL,
    end_mileage     INTEGER,
    purpose         VARCHAR(500),
    fuel_added      NUMERIC(6,2),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id      UUID             REFERENCES vehicles(id) ON DELETE SET NULL,
    requester_id    UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at        TIMESTAMPTZ      NOT NULL,
    end_at          TIMESTAMPTZ      NOT NULL,
    purpose         VARCHAR(500)     NOT NULL,
    status          request_status_enum NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vehicle_request_dates CHECK (end_at > start_at)
);

-- =============================================================================
-- SECTION 9 : MODULE RH LÉGER
-- =============================================================================

CREATE TABLE employees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id             UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_number     VARCHAR(50)      NOT NULL,
    hire_date           DATE             NOT NULL,
    contract_type       contract_type_enum NOT NULL DEFAULT 'cdi',
    department_id       UUID             REFERENCES departments(id) ON DELETE SET NULL,
    position            VARCHAR(255),
    emergency_contact   JSONB            NOT NULL DEFAULT '{}',
    annual_leave_days   INTEGER          NOT NULL DEFAULT 30,
    leave_balance       NUMERIC(6,2)     NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, employee_number),
    UNIQUE (organization_id, user_id)
);

COMMENT ON TABLE employees IS 'Fiche RH — extension du compte utilisateur';
COMMENT ON COLUMN employees.emergency_contact IS '{"name":"...","phone":"...","relation":"..."}';

CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id     UUID             NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type            leave_type_enum  NOT NULL,
    start_date      DATE             NOT NULL,
    end_date        DATE             NOT NULL,
    days_count      NUMERIC(5,1)     NOT NULL,
    reason          TEXT,
    status          leave_status_enum NOT NULL DEFAULT 'pending',
    approved_by_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE leave_requests IS 'Demandes de congé — workflow à deux niveaux d'approbation';

CREATE TABLE expense_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id     UUID             NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title           VARCHAR(500)     NOT NULL,
    total_amount    NUMERIC(12,2)    NOT NULL DEFAULT 0,
    currency        VARCHAR(3)       NOT NULL DEFAULT 'XOF',
    period_start    DATE             NOT NULL,
    period_end      DATE             NOT NULL,
    status          expense_status_enum NOT NULL DEFAULT 'draft',
    approved_by_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE expense_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_report_id UUID           NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
    category        expense_cat_enum NOT NULL,
    description     VARCHAR(500)     NOT NULL,
    amount          NUMERIC(10,2)    NOT NULL,
    date            DATE             NOT NULL,
    receipt_path    VARCHAR(1000),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE work_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id   UUID             REFERENCES departments(id) ON DELETE SET NULL,
    user_id         UUID             REFERENCES users(id) ON DELETE SET NULL,
    week_start      DATE             NOT NULL,
    schedule        JSONB            NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE work_schedules IS 'Plannings hebdomadaires — par département ou individuel';
COMMENT ON COLUMN work_schedules.schedule IS '{"monday":{"start":"08:00","end":"17:00"},...}';

-- =============================================================================
-- SECTION 10 : PAIEMENTS & LICENCES
-- =============================================================================

CREATE TABLE licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id         UUID             NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status          license_status_enum NOT NULL DEFAULT 'trial',
    starts_at       TIMESTAMPTZ      NOT NULL,
    ends_at         TIMESTAMPTZ      NOT NULL,
    grace_until     TIMESTAMPTZ,
    activated_by_id UUID             REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE licenses IS 'Licences actives par organisation — une seule active à la fois';

CREATE TABLE payment_methods_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type                    VARCHAR(50)      NOT NULL,
    provider                VARCHAR(100)     NOT NULL,
    credentials_encrypted   TEXT,
    is_active               BOOLEAN          NOT NULL DEFAULT TRUE,
    test_mode               BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payment_methods_config IS 'Configuration moyens de paiement (Wave, MTN Money, Stripe…) — credentials chiffrées';

CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    license_id          UUID             NOT NULL REFERENCES licenses(id) ON DELETE RESTRICT,
    amount              NUMERIC(12,2)    NOT NULL,
    currency            VARCHAR(3)       NOT NULL DEFAULT 'XOF',
    method              VARCHAR(50)      NOT NULL,
    provider            VARCHAR(100),
    provider_reference  VARCHAR(255),
    status              payment_status_enum NOT NULL DEFAULT 'pending',
    proof_path          VARCHAR(1000),
    validated_by_id     UUID             REFERENCES users(id) ON DELETE SET NULL,
    validated_at        TIMESTAMPTZ,
    idempotency_key     VARCHAR(255)     UNIQUE,
    metadata            JSONB            NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Paiements — idempotency_key pour éviter les doublons';

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id      UUID             NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    number          VARCHAR(50)      NOT NULL UNIQUE,
    amount          NUMERIC(12,2)    NOT NULL,
    issued_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    pdf_path        VARCHAR(1000),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'Factures générées automatiquement après paiement validé';

-- =============================================================================
-- SECTION 11 : NOTIFICATIONS & SYSTÈME
-- =============================================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(100)     NOT NULL,
    title           VARCHAR(500)     NOT NULL,
    body            TEXT,
    data            JSONB            NOT NULL DEFAULT '{}',
    channel         notif_channel_enum NOT NULL DEFAULT 'app',
    read_at         TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Centre de notifications multi-canal (app, email, SMS, WhatsApp)';

CREATE TABLE support_tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject         VARCHAR(500)     NOT NULL,
    description     TEXT             NOT NULL,
    category        VARCHAR(100),
    priority        priority_enum    NOT NULL DEFAULT 'normal',
    status          ticket_status_enum NOT NULL DEFAULT 'new',
    assigned_to_id  UUID             REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE support_tickets IS 'Helpdesk interne — tickets support utilisateurs';

CREATE TABLE ticket_replies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID             NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT             NOT NULL,
    is_internal     BOOLEAN          NOT NULL DEFAULT FALSE,
    attachments     JSONB            NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE faqs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        VARCHAR(100),
    question_fr     TEXT             NOT NULL,
    question_en     TEXT,
    answer_fr       TEXT             NOT NULL,
    answer_en       TEXT,
    keywords        TEXT[],
    is_public       BOOLEAN          NOT NULL DEFAULT TRUE,
    sort_order      INTEGER          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE faqs IS 'Base de connaissances bilingue FR/EN — pas de organization_id (FAQ globale)';

-- =============================================================================
-- SECTION 12 : ROW-LEVEL SECURITY (préparation)
-- =============================================================================
-- Activer RLS sur les tables sensibles pour double isolation au niveau DB
-- (à configurer avec un paramètre de session app.current_organization_id)

ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_registry          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;

-- Exemple de policy (à adapter par table)
-- CREATE POLICY tenant_isolation ON users
--     USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =============================================================================
-- SECTION 13 : TRIGGERS — updated_at automatique
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'organizations','users','departments','roles','permissions',
        'calendars','events','room_reservations',
        'mail_registry','document_folders','documents','document_templates',
        'meetings','meeting_decisions','meeting_action_items',
        'projects','tasks','task_comments',
        'conversations','messages','circulars','contacts','announcements',
        'visitors','visitor_logs','visitor_appointments',
        'rooms','equipment','supplies','vehicles','vehicle_logs','vehicle_requests',
        'employees','leave_requests','expense_reports','work_schedules',
        'plans','licenses','payment_methods_config','payments',
        'notifications','support_tickets','ticket_replies','faqs'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- =============================================================================
-- FIN DU SCHÉMA
-- =============================================================================
