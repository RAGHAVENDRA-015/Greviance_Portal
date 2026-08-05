# Officer Knowledge Base

This document provides a comprehensive guide for **Department Officers** using the AI‑Powered Citizen Grievance Portal. It outlines role responsibilities, UI workflows, API interactions, and best practices for handling assigned complaints.

---

## 1. Officer Role Overview

- **Primary Responsibility**: Receive, investigate, and resolve complaints assigned to your department or directly to you.
- **Access Level**: Verified Officer accounts (role `officer`) have read/write access to:
  - Department queue (`GET /complaints/department`).
  - Assigned complaints (`GET /complaints/{id}` where `assigned_officer` matches your ID).
  - Status update endpoints (`PATCH /complaints/{id}/status`).
- **Verification**: Officers must be **approved by an Admin** (`is_verified = True` in the user document) before gaining access to the officer dashboard.

---

## 2. Officer Dashboard UI

- **Queue View** – Lists all pending complaints for the officer’s department and any complaints explicitly assigned to the officer.
- **Filters** – Filter by status, priority, category, and date range.
- **Complaint Detail** – Shows full description, images (lightbox), location map, AI‑generated summary, and timeline of events.
- **Action Bar** – Buttons to **Assign to Self**, **Update Status**, and **Add Resolution Notes**.

---

## 3. Typical Workflow

1. **Login** – Authenticate via Firebase; app fetches officer profile (`GET /users/me`).
2. **View Department Queue** – `GET /complaints/department` returns complaints where `department` matches your assigned department.
3. **Select a Complaint** – Open detail page; review AI summary, images, and location.
4. **Assign (if not auto‑assigned)** – Click **Assign to Self** which triggers `PATCH /complaints/{id}/assign` (admin‑only) – alternatively, an admin may pre‑assign.
5. **Investigation** – Visit the site, verify the issue, take notes.
6. **Update Status** – Use `PATCH /complaints/{id}/status` with payload:
   ```json
   {
     "status": "Resolved" | "Rejected" | "In Progress",
     "resolution_notes": "Detailed description of actions taken or reason for rejection."
   }
   ```
7. **Save & Notify** – The API updates `updated_at`, stores notes, and the citizen UI automatically reflects the change via React Query polling.
8. **Close** – Once resolved, the complaint moves to the **Resolved** list; citizens can view final notes.

---

## 4. API Reference (Officer Scoped)

| Endpoint | Method | Description | Permissions |
|----------|--------|-------------|-------------|
| `/complaints/department` | GET | Retrieve all complaints for your department (status `Pending` or `In Progress`). | Officer (verified) |
| `/complaints/{id}` | GET | Fetch a single complaint by ID. | Officer (if belongs to department or assigned) |
| `/complaints/{id}/status` | PATCH | Update status and add resolution notes. | Officer (assigned or department member) |
| `/complaints/{id}/assign` | PATCH | **Admin‑only** – Assign an officer to a complaint. | Admin |

---

## 5. Best Practices

- **Prioritize High‑Priority & Safety‑Critical Issues** – Use the `priority` field to address `High` complaints first, especially those in the **Public Safety** or **Health** categories.
- **Add Detailed Resolution Notes** – Clear notes improve transparency for citizens and aid audit logs.
- **Leverage AI Summary** – Review the Gemini‑generated `ai_summary` as a quick overview before field inspection.
- **Validate Images** – If any image appears unrelated, flag it via the UI; the system will log the discrepancy for admin review.
- **Stay Within SLA** – Each department has Service Level Agreements (see `departments.md`). Aim to resolve within the target timeframe.

---

## 6. Auditing & Logging

All status changes are stored with timestamps (`updated_at`). The admin dashboard aggregates these into audit reports, showing:
- Average resolution time per department.
- Number of complaints handled per officer.
- Flags for complaints with low AI confidence (< 0.6) for manual review.

---

*This knowledge file is stored at `backend/knowledge/officer.md` for ingestion by the RAG chatbot.*
