# Admin Knowledge Base

This document provides a comprehensive reference for **System Administrators** of the AI‑Powered Citizen Grievance Portal. It covers role responsibilities, UI components, API endpoints, system configuration, and best practices for managing users, officers, and overall platform health.

---

## 1. Admin Role Overview

- **Primary Responsibilities**:
  1. **User & Role Management** – Create, modify, verify, and deactivate user accounts.
  2. **Officer Verification** – Approve officer registrations (`is_verified = true`).
  3. **Complaint Assignment** – Manually assign complaints to officers or departments.
  4. **System Monitoring & Metrics** – View platform-wide analytics, SLA compliance, and audit logs.
- **Access Scope**: Full read/write access to all API endpoints under `/admin/*` and privileged actions on `/complaints/*` (e.g., hard delete, assign).
- **Authentication**: Admin accounts are regular user documents with `role = "admin"`. Firebase Auth enforces JWT verification; additional server‑side checks ensure the `role` claim matches.

---

## 2. Admin Dashboard UI

The Admin Dashboard (`/admin`) presents a high‑level overview of platform health:

| Section | Description |
|---------|-------------|
| **User Management** | List all users, filter by role, edit profile details, promote/demote roles, and toggle officer verification.
| **Officer Directory** | View verified officers, assign departments, and see workload statistics.
| **Complaint Overview** | Aggregate statistics (total complaints, status breakdown, department load).
| **Assignment Panel** | Search pending complaints and assign an officer or department via a modal dialog.
| **Analytics Charts** | Trend graphs for daily submissions, average resolution time, and AI confidence distribution.
| **System Settings** | Manage environment variables, API keys, and feature toggles (e.g., enable/disable AI validation).

---

## 3. API Reference (Admin Scoped)

| Endpoint | Method | Description | Permissions |
|----------|--------|-------------|-------------|
| `/admin/users` | GET | Retrieve paginated list of all users with role filters. | Admin |
| `/admin/users/{id}` | PATCH | Update user fields: `role`, `department`, `is_verified` (for officers). | Admin |
| `/admin/users/{id}/verify` | PATCH | Toggle officer verification status (`is_verified`). | Admin |
| `/admin/stats` | GET | Aggregate platform metrics (complaint counts, status distribution, SLA compliance). | Admin |
| `/admin/users/officers` | GET | List all verified officers for assignment UI. | Admin |
| `/admin/complaints/{id}/assign` | PATCH | Assign an officer ID and optionally a department to a complaint. Automatically changes status to **In Progress** if previously **Pending**. | Admin |
| `/admin/complaints/{id}` | DELETE | **Hard delete** a complaint. Removes the MongoDB document and calls Cloudinary to delete the associated image folder. | Admin |

---

## 4. User & Officer Management Workflow

1. **Create / Invite User** – Admin creates a new user via Firebase Auth or invites via email. The user signs up and receives a JWT.
2. **Promote to Officer** – Edit the user record (`role = "officer"`) and set `department` field.
3. **Verification** – Set `is_verified = true`. Until verified, the officer cannot access the Officer Dashboard.
4. **Assign Complaints** – From the Assignment Panel, search for pending complaints and assign an officer using the `PATCH /admin/complaints/{id}/assign` endpoint.
5. **Deactivation** – To deactivate a user, set `is_active = false` or delete the Firebase user.

---

## 5. Metrics & SLA Monitoring

- **Dashboard Aggregation** – Implemented in `ComplaintService.get_dashboard_stats()` using MongoDB aggregation pipelines. Returns:
  - Total complaint count.
  - Counts per status (`pending`, `in_progress`, `resolved`, `rejected`).
  - Departmental distribution.
  - Average resolution time per department (helps enforce SLAs).
- **SLA Targets** (see `departments.md`):
  - Public Works – 7‑14 business days.
  - Water Board – 3‑7 business days.
  - Electricity – 2‑5 business days.
  - Sanitation – 2‑5 business days.
  - Health – 5‑10 business days.
  - Police / Public Safety – 1‑3 business days (high‑priority safety).
- **Alerting** – Admin can configure threshold alerts (e.g., pending > 100) that trigger email notifications via Firebase Cloud Messaging (future extension).

---

## 6. Security & Auditing

- **RBAC Enforcement** – All protected endpoints use FastAPI dependencies (`get_current_user`, `require_roles`) to validate the JWT and role.
- **Audit Log** – Every status transition, assignment, and deletion logs the actor’s `user_id` and timestamp in MongoDB (`audit_logs` collection). This supports compliance reviews.
- **Data Privacy** – Citizen personal data (name, phone, address) is stored encrypted at rest via MongoDB field-level encryption (optional). Only officers and admins with appropriate roles can read these fields.

---

## 7. Operational Tasks & Maintenance

- **Database Backups** – Schedule daily `mongodump` snapshots; keep 7‑day rotation.
- **AI Model Updates** – When upgrading Gemini model versions, update the API key and test the `AIService` endpoints in a staging environment before production rollout.
- **Cloudinary Cleanup** – Periodic script (`scripts/cleanup_unused_folders.py`) removes orphaned image folders for deleted complaints.
- **Environment Variables** – Managed in `.env` file:
  - `ADMIN_EMAILS` – List of admin email addresses for privileged actions.
  - `SLA_ALERT_THRESHOLD` – Numeric value for pending complaints alert.

---

## 8. Best Practices for Admins

1. **Verify Officers Promptly** – Faster verification leads to quicker complaint assignment and improved citizen satisfaction.
2. **Monitor AI Confidence** – Complaints with `ai_confidence < 0.6` should be reviewed manually to avoid mis‑routing.
3. **Regularly Review SLA Metrics** – Identify bottlenecks in departments that consistently miss targets and coordinate with municipal authorities.
4. **Maintain Clean User Data** – Deactivate stale accounts and purge unnecessary personal data to stay GDPR‑compliant.
5. **Document Changes** – Record any configuration changes (e.g., API key rotations) in the internal changelog for auditability.

---

*This admin knowledge file resides at `backend/knowledge/admin.md` and is ingested by the RAG chatbot for contextual answers.*
