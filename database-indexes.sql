-- =============================================================================
-- IBIG SECRETIS ERP - Index de performance PostgreSQL
-- Version : 1.0.0
-- Usage   : À exécuter APRÈS database-schema.sql
-- Stratégie :
--   1. Tout filtre multi-tenant commence par organization_id → index composites
--   2. Colonnes de tri/recherche fréquentes indexées séparément
--   3. JSONB : GIN pour recherche dans les objets flexibles
--   4. Full-text search : tsvector GIN sur les colonnes textuelles importantes
--   5. Index partiels pour les enregistrements "actifs" seulement
-- =============================================================================

-- =============================================================================
-- SECTION 1 : SOCLE / AUTH
-- =============================================================================

-- organizations
CREATE INDEX idx_organizations_slug        ON organizations (slug);
CREATE INDEX idx_organizations_plan        ON organizations (plan_id) WHERE plan_id IS NOT NULL;
CREATE INDEX idx_organizations_status      ON organizations (license_status);

-- users
CREATE INDEX idx_users_org                 ON users (organization_id);
CREATE INDEX idx_users_org_email           ON users (organization_id, email);
CREATE INDEX idx_users_org_dept            ON users (organization_id, department_id);
CREATE INDEX idx_users_org_active          ON users (organization_id, is_active);
CREATE INDEX idx_users_org_role            ON users (organization_id, role);

-- departments
CREATE INDEX idx_departments_org           ON departments (organization_id);
CREATE INDEX idx_departments_parent        ON departments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_departments_head          ON departments (head_user_id) WHERE head_user_id IS NOT NULL;

-- roles
CREATE INDEX idx_roles_org                 ON roles (organization_id);
CREATE INDEX idx_roles_guard               ON roles (guard_name);

-- model_has_roles
CREATE INDEX idx_model_has_roles_model     ON model_has_roles (model_type, model_id);

-- model_has_permissions
CREATE INDEX idx_model_has_perms_model     ON model_has_permissions (model_type, model_id);

-- audit_logs
CREATE INDEX idx_audit_org                 ON audit_logs (organization_id);
CREATE INDEX idx_audit_org_user            ON audit_logs (organization_id, user_id);
CREATE INDEX idx_audit_org_module          ON audit_logs (organization_id, module);
CREATE INDEX idx_audit_org_resource        ON audit_logs (organization_id, resource_type, resource_id);
CREATE INDEX idx_audit_created_at          ON audit_logs (organization_id, created_at DESC);

-- =============================================================================
-- SECTION 2 : MODULE AGENDA
-- =============================================================================

-- calendars
CREATE INDEX idx_calendars_org             ON calendars (organization_id);
CREATE INDEX idx_calendars_org_user        ON calendars (organization_id, user_id);
CREATE INDEX idx_calendars_org_type        ON calendars (organization_id, type);

-- events
CREATE INDEX idx_events_org                ON events (organization_id);
CREATE INDEX idx_events_org_calendar       ON events (organization_id, calendar_id);
CREATE INDEX idx_events_org_creator        ON events (organization_id, creator_id);
CREATE INDEX idx_events_org_dates          ON events (organization_id, start_at, end_at);
CREATE INDEX idx_events_type               ON events (organization_id, type);
-- Index pour les événements à venir (filtre partiel très courant)
CREATE INDEX idx_events_upcoming           ON events (organization_id, start_at)
    WHERE start_at >= NOW();

-- event_participants
CREATE INDEX idx_event_participants_event  ON event_participants (event_id);
CREATE INDEX idx_event_participants_user   ON event_participants (user_id);
CREATE INDEX idx_event_participants_status ON event_participants (event_id, status);

-- room_reservations
CREATE INDEX idx_room_res_org              ON room_reservations (organization_id);
CREATE INDEX idx_room_res_room_dates       ON room_reservations (room_id, start_at, end_at);
CREATE INDEX idx_room_res_user             ON room_reservations (user_id);
CREATE INDEX idx_room_res_status           ON room_reservations (organization_id, status);

-- =============================================================================
-- SECTION 3 : MODULE COURRIER & GED
-- =============================================================================

-- mail_registry
CREATE INDEX idx_mail_org                  ON mail_registry (organization_id);
CREATE INDEX idx_mail_org_type             ON mail_registry (organization_id, type);
CREATE INDEX idx_mail_org_status           ON mail_registry (organization_id, status);
CREATE INDEX idx_mail_org_urgency          ON mail_registry (organization_id, urgency);
CREATE INDEX idx_mail_org_assigned         ON mail_registry (organization_id, assigned_to_id);
CREATE INDEX idx_mail_org_dept             ON mail_registry (organization_id, department_id);
CREATE INDEX idx_mail_org_received         ON mail_registry (organization_id, received_at DESC);
CREATE INDEX idx_mail_org_sent             ON mail_registry (organization_id, sent_at DESC);
-- Full-text search sur sujet + expéditeur
CREATE INDEX idx_mail_fts                  ON mail_registry
    USING GIN (to_tsvector('french',
        coalesce(subject,'') || ' ' ||
        coalesce(sender_name,'') || ' ' ||
        coalesce(sender_org,'')
    ));

-- mail_attachments
CREATE INDEX idx_mail_att_mail             ON mail_attachments (mail_id);

-- document_folders
CREATE INDEX idx_docfolder_org             ON document_folders (organization_id);
CREATE INDEX idx_docfolder_parent          ON document_folders (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_docfolder_access          ON document_folders (organization_id, access_level);

-- documents
CREATE INDEX idx_docs_org                  ON documents (organization_id);
CREATE INDEX idx_docs_org_folder           ON documents (organization_id, folder_id);
CREATE INDEX idx_docs_org_dept             ON documents (organization_id, department_id);
CREATE INDEX idx_docs_org_author           ON documents (organization_id, author_id);
CREATE INDEX idx_docs_org_status           ON documents (organization_id, status);
CREATE INDEX idx_docs_org_access           ON documents (organization_id, access_level);
CREATE INDEX idx_docs_updated              ON documents (organization_id, updated_at DESC);
-- GIN sur keywords (tableau TEXT)
CREATE INDEX idx_docs_keywords             ON documents USING GIN (keywords);
-- Full-text search
CREATE INDEX idx_docs_fts                  ON documents
    USING GIN (to_tsvector('french',
        coalesce(title,'') || ' ' ||
        coalesce(description,'')
    ));

-- document_versions
CREATE INDEX idx_docver_document           ON document_versions (document_id);

-- document_templates
CREATE INDEX idx_doctpl_org                ON document_templates (organization_id);
CREATE INDEX idx_doctpl_org_active         ON document_templates (organization_id, is_active)
    WHERE is_active = TRUE;
-- GIN sur le contenu JSONB des templates
CREATE INDEX idx_doctpl_content            ON document_templates USING GIN (content jsonb_path_ops);

-- =============================================================================
-- SECTION 4 : MODULE RÉUNIONS
-- =============================================================================

-- meetings
CREATE INDEX idx_meetings_org              ON meetings (organization_id);
CREATE INDEX idx_meetings_org_organizer    ON meetings (organization_id, organizer_id);
CREATE INDEX idx_meetings_org_status       ON meetings (organization_id, status);
CREATE INDEX idx_meetings_org_dates        ON meetings (organization_id, start_at, end_at);
CREATE INDEX idx_meetings_upcoming         ON meetings (organization_id, start_at)
    WHERE status IN ('planned','ongoing');

-- meeting_participants
CREATE INDEX idx_meet_part_meeting         ON meeting_participants (meeting_id);
CREATE INDEX idx_meet_part_user            ON meeting_participants (user_id);
CREATE INDEX idx_meet_part_status          ON meeting_participants (meeting_id, status);

-- meeting_decisions
CREATE INDEX idx_meet_dec_meeting          ON meeting_decisions (meeting_id);
CREATE INDEX idx_meet_dec_assigned         ON meeting_decisions (assigned_to_id) WHERE assigned_to_id IS NOT NULL;
CREATE INDEX idx_meet_dec_status           ON meeting_decisions (meeting_id, status);

-- meeting_action_items
CREATE INDEX idx_meet_act_meeting          ON meeting_action_items (meeting_id);
CREATE INDEX idx_meet_act_assigned         ON meeting_action_items (assigned_to_id) WHERE assigned_to_id IS NOT NULL;

-- =============================================================================
-- SECTION 5 : MODULE TÂCHES
-- =============================================================================

-- projects
CREATE INDEX idx_projects_org              ON projects (organization_id);
CREATE INDEX idx_projects_org_manager      ON projects (organization_id, manager_id);
CREATE INDEX idx_projects_org_status       ON projects (organization_id, status);

-- tasks
CREATE INDEX idx_tasks_org                 ON tasks (organization_id);
CREATE INDEX idx_tasks_org_project         ON tasks (organization_id, project_id);
CREATE INDEX idx_tasks_org_assignee        ON tasks (organization_id, assignee_id);
CREATE INDEX idx_tasks_org_creator         ON tasks (organization_id, creator_id);
CREATE INDEX idx_tasks_org_status          ON tasks (organization_id, status);
CREATE INDEX idx_tasks_org_priority        ON tasks (organization_id, priority);
CREATE INDEX idx_tasks_org_due             ON tasks (organization_id, due_date);
CREATE INDEX idx_tasks_parent              ON tasks (parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_dept                ON tasks (organization_id, department_id);
-- Index composé pour le Kanban (project + status + position)
CREATE INDEX idx_tasks_kanban              ON tasks (organization_id, project_id, status, position);
-- Tâches en retard
CREATE INDEX idx_tasks_overdue             ON tasks (organization_id, due_date)
    WHERE status NOT IN ('done','cancelled') AND due_date IS NOT NULL;

-- task_observers
CREATE INDEX idx_task_obs_task             ON task_observers (task_id);
CREATE INDEX idx_task_obs_user             ON task_observers (user_id);

-- task_comments
CREATE INDEX idx_task_comments_task        ON task_comments (task_id);
CREATE INDEX idx_task_comments_user        ON task_comments (user_id);
CREATE INDEX idx_task_comments_created     ON task_comments (task_id, created_at DESC);

-- task_attachments
CREATE INDEX idx_task_att_task             ON task_attachments (task_id);

-- =============================================================================
-- SECTION 6 : MODULE COMMUNICATION
-- =============================================================================

-- conversations
CREATE INDEX idx_conv_org                  ON conversations (organization_id);
CREATE INDEX idx_conv_org_type             ON conversations (organization_id, type);
CREATE INDEX idx_conv_created_by           ON conversations (created_by_id);

-- conversation_participants
CREATE INDEX idx_conv_part_user            ON conversation_participants (user_id);
CREATE INDEX idx_conv_part_last_read       ON conversation_participants (user_id, last_read_at);

-- messages
CREATE INDEX idx_msg_org                   ON messages (organization_id);
CREATE INDEX idx_msg_conversation          ON messages (conversation_id);
CREATE INDEX idx_msg_sender                ON messages (sender_id);
CREATE INDEX idx_msg_created               ON messages (conversation_id, created_at DESC);
-- Messages non lus (très courant)
CREATE INDEX idx_msg_unread                ON messages (conversation_id, created_at)
    WHERE read_at IS NULL;

-- circulars
CREATE INDEX idx_circ_org                  ON circulars (organization_id);
CREATE INDEX idx_circ_org_sender           ON circulars (organization_id, sender_id);
CREATE INDEX idx_circ_published            ON circulars (organization_id, published_at DESC);
CREATE INDEX idx_circ_active               ON circulars (organization_id, published_at, expires_at)
    WHERE published_at IS NOT NULL;
-- GIN sur recipient_ids (JSONB)
CREATE INDEX idx_circ_recipients           ON circulars USING GIN (recipient_ids jsonb_path_ops);

-- circular_acknowledgments
CREATE INDEX idx_circ_ack_circular         ON circular_acknowledgments (circular_id);
CREATE INDEX idx_circ_ack_user             ON circular_acknowledgments (user_id);

-- contacts
CREATE INDEX idx_contacts_org              ON contacts (organization_id);
CREATE INDEX idx_contacts_org_type         ON contacts (organization_id, type);
CREATE INDEX idx_contacts_org_blacklisted  ON contacts (organization_id, is_blacklisted);
-- Full-text search sur nom et société
CREATE INDEX idx_contacts_fts              ON contacts
    USING GIN (to_tsvector('french',
        coalesce(name,'') || ' ' ||
        coalesce(company,'') || ' ' ||
        coalesce(email,'')
    ));

-- announcements
CREATE INDEX idx_announce_org              ON announcements (organization_id);
CREATE INDEX idx_announce_org_published    ON announcements (organization_id, published_at DESC);
CREATE INDEX idx_announce_pinned           ON announcements (organization_id, is_pinned)
    WHERE is_pinned = TRUE;

-- =============================================================================
-- SECTION 7 : MODULE ACCUEIL VISITEURS
-- =============================================================================

-- visitors
CREATE INDEX idx_visitors_org              ON visitors (organization_id);
CREATE INDEX idx_visitors_org_name         ON visitors (organization_id, name);
-- Full-text search visiteurs
CREATE INDEX idx_visitors_fts              ON visitors
    USING GIN (to_tsvector('simple',
        coalesce(name,'') || ' ' ||
        coalesce(company,'') || ' ' ||
        coalesce(phone,'')
    ));

-- visitor_logs
CREATE INDEX idx_vlog_org                  ON visitor_logs (organization_id);
CREATE INDEX idx_vlog_visitor              ON visitor_logs (visitor_id);
CREATE INDEX idx_vlog_host                 ON visitor_logs (host_user_id);
CREATE INDEX idx_vlog_org_status           ON visitor_logs (organization_id, status);
CREATE INDEX idx_vlog_arrived              ON visitor_logs (organization_id, arrived_at DESC);
-- Visiteurs actuellement présents
CREATE INDEX idx_vlog_present              ON visitor_logs (organization_id)
    WHERE status = 'arrived';

-- visitor_appointments
CREATE INDEX idx_vappt_org                 ON visitor_appointments (organization_id);
CREATE INDEX idx_vappt_host                ON visitor_appointments (host_user_id);
CREATE INDEX idx_vappt_status              ON visitor_appointments (organization_id, status);
CREATE INDEX idx_vappt_scheduled           ON visitor_appointments (organization_id, scheduled_at);
CREATE INDEX idx_vappt_token               ON visitor_appointments (confirmation_token)
    WHERE confirmation_token IS NOT NULL;

-- queue_tickets
CREATE INDEX idx_queue_org                 ON queue_tickets (organization_id);
CREATE INDEX idx_queue_org_status          ON queue_tickets (organization_id, status);
CREATE INDEX idx_queue_visitor             ON queue_tickets (visitor_id) WHERE visitor_id IS NOT NULL;
-- File active
CREATE INDEX idx_queue_waiting             ON queue_tickets (organization_id, issued_at)
    WHERE status = 'waiting';

-- =============================================================================
-- SECTION 8 : MODULE RESSOURCES
-- =============================================================================

-- rooms
CREATE INDEX idx_rooms_org                 ON rooms (organization_id);
CREATE INDEX idx_rooms_org_active          ON rooms (organization_id, is_active)
    WHERE is_active = TRUE;
-- GIN sur equipment JSONB
CREATE INDEX idx_rooms_equipment           ON rooms USING GIN (equipment jsonb_path_ops);

-- equipment
CREATE INDEX idx_equip_org                 ON equipment (organization_id);
CREATE INDEX idx_equip_org_status          ON equipment (organization_id, status);
CREATE INDEX idx_equip_org_category        ON equipment (organization_id, category);
CREATE INDEX idx_equip_assigned            ON equipment (assigned_to_id) WHERE assigned_to_id IS NOT NULL;
-- Équipements en fin de garantie
CREATE INDEX idx_equip_warranty            ON equipment (organization_id, warranty_until)
    WHERE warranty_until IS NOT NULL;

-- supplies
CREATE INDEX idx_supplies_org              ON supplies (organization_id);
CREATE INDEX idx_supplies_org_category     ON supplies (organization_id, category);
-- Alertes stock bas (quantite < min_quantite)
CREATE INDEX idx_supplies_low_stock        ON supplies (organization_id, quantity, min_quantity);

-- supply_movements
CREATE INDEX idx_supply_mov_supply         ON supply_movements (supply_id);
CREATE INDEX idx_supply_mov_type           ON supply_movements (supply_id, type);
CREATE INDEX idx_supply_mov_user           ON supply_movements (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_supply_mov_created        ON supply_movements (supply_id, created_at DESC);

-- vehicles
CREATE INDEX idx_vehicles_org              ON vehicles (organization_id);
CREATE INDEX idx_vehicles_org_status       ON vehicles (organization_id, status);
-- Véhicules avec assurance/CT expirés
CREATE INDEX idx_vehicles_insurance        ON vehicles (organization_id, insurance_until);
CREATE INDEX idx_vehicles_control          ON vehicles (organization_id, control_until);

-- vehicle_logs
CREATE INDEX idx_vlog_vehicle              ON vehicle_logs (vehicle_id);
CREATE INDEX idx_vlog_driver               ON vehicle_logs (driver_id);
CREATE INDEX idx_vlog_dates                ON vehicle_logs (vehicle_id, start_at DESC);

-- vehicle_requests
CREATE INDEX idx_vreq_org                  ON vehicle_requests (organization_id);
CREATE INDEX idx_vreq_org_status           ON vehicle_requests (organization_id, status);
CREATE INDEX idx_vreq_vehicle              ON vehicle_requests (vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX idx_vreq_requester            ON vehicle_requests (requester_id);
CREATE INDEX idx_vreq_dates                ON vehicle_requests (organization_id, start_at, end_at);

-- =============================================================================
-- SECTION 9 : MODULE RH LÉGER
-- =============================================================================

-- employees
CREATE INDEX idx_emp_org                   ON employees (organization_id);
CREATE INDEX idx_emp_org_user              ON employees (organization_id, user_id);
CREATE INDEX idx_emp_org_dept              ON employees (organization_id, department_id);
CREATE INDEX idx_emp_org_contract          ON employees (organization_id, contract_type);
-- GIN sur emergency_contact JSONB
CREATE INDEX idx_emp_emergency             ON employees USING GIN (emergency_contact jsonb_path_ops);

-- leave_requests
CREATE INDEX idx_leave_org                 ON leave_requests (organization_id);
CREATE INDEX idx_leave_org_employee        ON leave_requests (organization_id, employee_id);
CREATE INDEX idx_leave_org_status          ON leave_requests (organization_id, status);
CREATE INDEX idx_leave_org_type            ON leave_requests (organization_id, type);
CREATE INDEX idx_leave_dates               ON leave_requests (organization_id, start_date, end_date);
-- Demandes en attente (pour les tableaux de bord approbateurs)
CREATE INDEX idx_leave_pending             ON leave_requests (organization_id, created_at DESC)
    WHERE status IN ('pending','approved_n1');

-- expense_reports
CREATE INDEX idx_expense_org               ON expense_reports (organization_id);
CREATE INDEX idx_expense_org_employee      ON expense_reports (organization_id, employee_id);
CREATE INDEX idx_expense_org_status        ON expense_reports (organization_id, status);
CREATE INDEX idx_expense_period            ON expense_reports (organization_id, period_start, period_end);

-- expense_items
CREATE INDEX idx_exp_items_report          ON expense_items (expense_report_id);
CREATE INDEX idx_exp_items_category        ON expense_items (expense_report_id, category);

-- work_schedules
CREATE INDEX idx_wsched_org                ON work_schedules (organization_id);
CREATE INDEX idx_wsched_org_dept           ON work_schedules (organization_id, department_id);
CREATE INDEX idx_wsched_org_user           ON work_schedules (organization_id, user_id);
CREATE INDEX idx_wsched_week               ON work_schedules (organization_id, week_start);
-- GIN sur schedule JSONB
CREATE INDEX idx_wsched_schedule           ON work_schedules USING GIN (schedule jsonb_path_ops);

-- =============================================================================
-- SECTION 10 : PAIEMENTS & LICENCES
-- =============================================================================

-- plans
CREATE INDEX idx_plans_active              ON plans (is_active) WHERE is_active = TRUE;

-- licenses
CREATE INDEX idx_licenses_org              ON licenses (organization_id);
CREATE INDEX idx_licenses_org_status       ON licenses (organization_id, status);
CREATE INDEX idx_licenses_expires          ON licenses (organization_id, ends_at);
-- Licences actives uniquement
CREATE INDEX idx_licenses_active           ON licenses (organization_id, ends_at)
    WHERE status IN ('active','grace');

-- payments
CREATE INDEX idx_payments_org              ON payments (organization_id);
CREATE INDEX idx_payments_org_status       ON payments (organization_id, status);
CREATE INDEX idx_payments_license          ON payments (license_id);
CREATE INDEX idx_payments_created          ON payments (organization_id, created_at DESC);
-- GIN sur metadata JSONB
CREATE INDEX idx_payments_metadata         ON payments USING GIN (metadata jsonb_path_ops);

-- invoices
CREATE INDEX idx_invoices_org              ON invoices (organization_id);
CREATE INDEX idx_invoices_payment          ON invoices (payment_id);
CREATE INDEX idx_invoices_issued           ON invoices (organization_id, issued_at DESC);

-- =============================================================================
-- SECTION 11 : NOTIFICATIONS & SYSTÈME
-- =============================================================================

-- notifications
CREATE INDEX idx_notif_org                 ON notifications (organization_id);
CREATE INDEX idx_notif_org_user            ON notifications (organization_id, user_id);
CREATE INDEX idx_notif_org_type            ON notifications (organization_id, type);
CREATE INDEX idx_notif_org_channel         ON notifications (organization_id, channel);
CREATE INDEX idx_notif_created             ON notifications (organization_id, user_id, created_at DESC);
-- Notifications non lues par utilisateur (requête la plus fréquente)
CREATE INDEX idx_notif_unread              ON notifications (organization_id, user_id, created_at DESC)
    WHERE read_at IS NULL;
-- GIN sur data JSONB
CREATE INDEX idx_notif_data                ON notifications USING GIN (data jsonb_path_ops);

-- support_tickets
CREATE INDEX idx_ticket_org                ON support_tickets (organization_id);
CREATE INDEX idx_ticket_org_user           ON support_tickets (organization_id, user_id);
CREATE INDEX idx_ticket_org_status         ON support_tickets (organization_id, status);
CREATE INDEX idx_ticket_org_assigned       ON support_tickets (organization_id, assigned_to_id);
CREATE INDEX idx_ticket_org_priority       ON support_tickets (organization_id, priority);
CREATE INDEX idx_ticket_created            ON support_tickets (organization_id, created_at DESC);
-- Tickets ouverts (pour SLA)
CREATE INDEX idx_ticket_open               ON support_tickets (organization_id, created_at)
    WHERE status NOT IN ('resolved','closed');

-- ticket_replies
CREATE INDEX idx_ticket_rep_ticket         ON ticket_replies (ticket_id);
CREATE INDEX idx_ticket_rep_user           ON ticket_replies (user_id);
CREATE INDEX idx_ticket_rep_created        ON ticket_replies (ticket_id, created_at);
-- GIN sur attachments JSONB
CREATE INDEX idx_ticket_rep_attach         ON ticket_replies USING GIN (attachments jsonb_path_ops);

-- faqs
CREATE INDEX idx_faqs_category             ON faqs (category);
CREATE INDEX idx_faqs_public               ON faqs (is_public, sort_order) WHERE is_public = TRUE;
-- GIN sur keywords
CREATE INDEX idx_faqs_keywords             ON faqs USING GIN (keywords);
-- Full-text search bilingue
CREATE INDEX idx_faqs_fts_fr               ON faqs
    USING GIN (to_tsvector('french',
        coalesce(question_fr,'') || ' ' ||
        coalesce(answer_fr,'')
    ));
CREATE INDEX idx_faqs_fts_en               ON faqs
    USING GIN (to_tsvector('english',
        coalesce(question_en,'') || ' ' ||
        coalesce(answer_en,'')
    ));

-- =============================================================================
-- SECTION 12 : STATISTIQUES — collecte manuelle
-- =============================================================================
-- Après le chargement des données en production, lancer :
--   ANALYZE;
-- Pour cibler une table :
--   ANALYZE users;
-- Pour mettre à jour les statistiques automatiquement (postgresql.conf) :
--   autovacuum = on
--   autovacuum_analyze_threshold = 50
--   autovacuum_analyze_scale_factor = 0.05

-- =============================================================================
-- RÉCAPITULATIF
-- =============================================================================
-- Total index créés :
--   SOCLE / AUTH             : 14
--   AGENDA                   : 13
--   COURRIER & GED           : 20
--   RÉUNIONS                 :  9
--   TÂCHES                   : 15
--   COMMUNICATION            : 17
--   ACCUEIL VISITEURS        : 17
--   RESSOURCES               : 21
--   RH LÉGER                 : 16
--   PAIEMENTS & LICENCES     : 11
--   NOTIFICATIONS & SYSTÈME  : 18
--   ---------------------------------
--   TOTAL                    : ~171 index
-- =============================================================================
