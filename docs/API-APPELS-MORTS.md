# Appels d'API du frontend qui n'aboutissent pas

**109 appels réels sur 189** — soit près de trois sur cinq — visent une route
qui n'existe sous aucune méthode HTTP. Chacun est un bouton qui ne fait rien,
un écran qui reste vide, ou une erreur silencieuse dans la console.

## Comment ce chiffre a été obtenu

Par mesure, après **trois inférences fausses**. Les tentatives précédentes
partaient des 13 fichiers de `routes/api/` que rien ne charge, et cherchaient
si le frontend « mentionnait » quelque chose : elles ont annoncé successivement
117, 33 puis 36 appels cassés. Une vérification a montré que le frontend
n'appelait même pas les chemins concernés — « export », « status » et
« create » apparaissent partout.

La méthode retenue ne déduit rien : elle extrait les URL **littéralement
écrites** dans le code frontend, les dispatche dans l'application, et lit le
code de retour. Seul un 404 sur toutes les méthodes compte comme absente ; un
403 ou un 422 signifient que la route existe.

Outil : `backend/tests/outils/api-appels-morts.php`.

## Répartition

| Préfixe | Appels morts |
|---|---|
| `/api/v1/…` | 58 |
| `/api/public/…` | 8 |
| `/api/help/…` | 6 |
| `/api/accueil/…` | 5 |
| `/api/training/…` | 4 |
| `/api/bi/…` | 4 |
| `/api/messages/…` | 3 |
| `/api/ged/…` | 3 |
| autres | 18 |

Six appels supplémentaires n'apparaissent que dans `ApiDocs.jsx` : ce sont des
exemples de documentation, pas des appels. Ils sont exclus du décompte.

## Ce que ça ne dit pas

Que 109 fonctionnalités sont à écrire. Une bonne part de ces routes existe
probablement **sous un autre chemin** — le dépôt contient 13 fichiers de routes
jamais chargés, dont 200 déclarations absentes de l'application. Le travail
consiste d'abord à faire correspondre les deux listes : rebrancher ce qui
existe, écrire ce qui manque vraiment, supprimer ce que plus rien n'appelle.

## Liste complète

```
  /api/accueil/visitors                                Dashboard.jsx
  /api/accueil/visitors/1/badge                        CheckIn.jsx, Dashboard.jsx
  /api/accueil/visitors/1/check-out                    CheckIn.jsx
  /api/accueil/visitors/check-in                       CheckIn.jsx
  /api/accueil/visitors/report                         Dashboard.jsx
  /api/admin/payments/proofs/1/approve                 Dashboard.jsx
  /api/admin/payments/stats/method-breakdown           Dashboard.jsx
  /api/admin/payments/stats/weekly-revenue             Dashboard.jsx
  /api/agenda/events/1                                 Index.jsx, useAgenda.js
  /api/agenda/smart/suggest-slots                      SmartScheduler.jsx
  /api/appointments/1/status                           Appointments.jsx
  /api/auth/login                                      ApiDocs.jsx
  /api/auth/logout                                     ApiDocs.jsx
  /api/auth/user                                       ApiDocs.jsx
  /api/bi/1                                            useBiData.js
  /api/bi/reports                                      useBiData.js, ReportBuilder.jsx
  /api/bi/reports/1                                    SavedReports.jsx
  /api/bi/reports/1/run                                useBiData.js, SavedReports.jsx
  /api/circulaires                                     ApiDocs.jsx
  /api/currencies/history                              CurrencyReport.jsx
  /api/delegations                                     ApiDocs.jsx
  /api/deliberations                                   ApiDocs.jsx
  /api/document-workflow-templates                     WorkflowTemplates.jsx
  /api/document-workflow-templates/1                   WorkflowTemplates.jsx
  /api/ged/documents/1/download                        Index.jsx, Show.jsx
  /api/ged/documents/1/preview                         Index.jsx
  /api/ged/documents/1/share                           Index.jsx
  /api/help/categories                                 FaqCategory.jsx
  /api/help/category/1                                 FaqCategory.jsx
  /api/help/faq/1/rate                                 FaqCategory.jsx
  /api/help/faq/search                                 TicketForm.jsx
  /api/help/sara/check                                 TicketForm.jsx
  /api/help/tickets                                    TicketForm.jsx
  /api/messages/1                                      Index.jsx
  /api/messages/conversations/1                        Index.jsx
  /api/messages/conversations/1/read                   Index.jsx
  /api/practical-cases/1/complete                      Show.jsx
  /api/public/visitor/1                                VisitorPortal.jsx
  /api/public/visitor/1/available-dates                VisitorPortal.jsx
  /api/public/visitor/1/book                           VisitorPortal.jsx
  /api/public/visitor/1/hosts                          VisitorPortal.jsx
  /api/public/visitor/1/slots                          VisitorPortal.jsx
  /api/public/visitor/appointment/1                    AppointmentConfirmation.jsx
  /api/public/visitor/appointment/1/cancel             AppointmentConfirmation.jsx
  /api/public/visitor/appointment/1/ics                AppointmentConfirmation.jsx
  /api/reports/currency-transactions                   CurrencyReport.jsx
  /api/reports/currency-transactions/export            CurrencyReport.jsx
  /api/reunions/1/brief                                MeetingBrief.jsx
  /api/sara/conversations/1                            Chat.jsx
  /api/sara/conversations/1/feedback                   Chat.jsx
  /api/subscription/payment-methods                    Paiement.jsx
  /api/superadmin/logs                                 Logs.jsx
  /api/superadmin/monitoring/metrics                   Monitoring.jsx
  /api/training/analytics                              AdminCourses.jsx
  /api/training/progress/1                             CoursePlayer.jsx
  /api/training/quizzes/1                              CoursePlayer.jsx
  /api/training/quizzes/1/submit                       CoursePlayer.jsx
  /api/v1                                              useDashboard.js
  /api/v1/announcements/1/dismiss                      AnnouncementBanner.jsx
  /api/v1/announcements/active                         AnnouncementBanner.jsx
  /api/v1/documents/1/workflow                         WorkflowPanel.jsx
  /api/v1/documents/1/workflow/steps/1/1               WorkflowPanel.jsx, DocumentValidation.jsx
  /api/v1/documents/pending-validation                 DocumentValidation.jsx
  /api/v1/documents/validation-stats                   DocumentValidation.jsx
  /api/v1/help/articles                                Article.jsx, Index.jsx
  /api/v1/help/articles/1                              Article.jsx
  /api/v1/help/articles/1/feedback                     Article.jsx
  /api/v1/help/articles/1/view                         Article.jsx
  /api/v1/help/faqs                                    Faq.jsx
  /api/v1/help/search                                  Create.jsx, Index.jsx
  /api/v1/help/tickets                                 Index.jsx, Create.jsx
  /api/v1/help/tickets/1                               Show.jsx
  /api/v1/help/tickets/1/messages                      Show.jsx
  /api/v1/help/tickets/1/resolve                       Show.jsx
  /api/v1/help/tickets/1/satisfaction                  Show.jsx
  /api/v1/help/tickets/attachments/1                   Show.jsx
  /api/v1/import/1                                     History.jsx
  /api/v1/import/1/error-report                        Wizard.jsx, History.jsx
  /api/v1/import/1/start                               Wizard.jsx
  /api/v1/import/1/status                              Wizard.jsx
  /api/v1/import/1/validate                            Wizard.jsx
  /api/v1/legal/1                                      Show.jsx
  /api/v1/legal/1/pdf                                  Show.jsx
  /api/v1/legal/my-acceptances                         Index.jsx
  /api/v1/onboarding/tour-complete                     GuidedTour.jsx
  /api/v1/orders/1                                     Success.jsx, OrderStatus.jsx
  /api/v1/orders/1/checkout/1                          Checkout.jsx
  /api/v1/orders/1/invoice                             Success.jsx
  /api/v1/report-builder/reports/1                     Builder.jsx, Index.jsx
  /api/v1/report-builder/reports/1/duplicate           Index.jsx
  /api/v1/report-builder/reports/1/run                 Builder.jsx, Index.jsx
  /api/v1/report-builder/runs/1/download               Builder.jsx, Index.jsx
  /api/v1/report-builder/runs/1/status                 Builder.jsx
  /api/v1/superadmin/backup/trigger                    Dashboard.jsx
  /api/v1/superadmin/backups                           Index.jsx
  /api/v1/superadmin/backups/1                         Index.jsx
  /api/v1/superadmin/backups/1/download                Index.jsx
  /api/v1/superadmin/backups/restore                   Index.jsx
  /api/v1/superadmin/health                            Dashboard.jsx
  /api/v1/superadmin/jobs/1/retry                      Dashboard.jsx
  /api/v1/superadmin/monitoring/details                Dashboard.jsx
  /api/v1/superadmin/vouchers                          Vouchers.jsx
  /api/v1/superadmin/vouchers/batches                  Vouchers.jsx
  /api/v1/superadmin/vouchers/batches/1/codes          Vouchers.jsx
  /api/v1/superadmin/vouchers/batches/1/disable        Vouchers.jsx
  /api/v1/superadmin/vouchers/batches/1/export         Vouchers.jsx
  /api/v1/superadmin/vouchers/kpis                     Vouchers.jsx
  /api/v1/superadmin/webhooks                          Webhooks.jsx
  /api/v1/superadmin/webhooks/1/replay                 Webhooks.jsx
  /api/v1/superadmin/webhooks/kpis                     Webhooks.jsx
  /api/v1/support/sessions/1/actions                   SupportBanner.jsx
  /api/v1/support/sessions/1/end                       SupportBanner.jsx
  /api/v1/tasks/1/attachments                          TaskModal.jsx
  /api/v1/tasks/1/comments                             TaskModal.jsx, Detail.jsx
  /api/v1/visitors/1/blacklist                         Blacklist.jsx
```
