# Grievance Process Documentation

This document outlines the end‑to‑end **grievance lifecycle** for the AI‑Powered Citizen Grievance Portal, describing each stage from citizen submission through AI processing, officer handling, and final resolution.

---

## 1. Submission Stage (Citizen)

1. **Citizen Login** – Authenticated via Firebase.
2. **Open New Complaint Wizard** – Four‑step UI:
   - **Step 1: Details** – Title (5‑200 chars) & Description (10‑2000 chars).
   - **Step 2: Evidence** – Upload up to **5 images** (JPEG/PNG/WebP, ≤ 5 MB each). Front‑end validates format, dimensions, and file size; then sends bytes to the backend.
   - **Step 3: Location** – Auto‑detect GPS or manually input latitude/longitude.
   - **Step 4: Review & Submit** – Final confirmation.
3. **Backend Receives Payload** – Calls `AIService.validate_image_relevance()` for each image and `AIService.classify_complaint()` for text classification.
4. **Complaint Document Creation** – Generates a MongoDB `Complaint` document with:
   - AI‑derived `category`, `priority`, `department`, `ai_summary`, and `ai_confidence`.
   - Uploaded image URLs stored in Cloudinary under a folder `citizen/{citizen_id}/{complaint_id}`.
   - Initial status set to **Pending**.

---

## 2. AI Processing Stage

- **Classification Pipeline** (`AIService.classify_complaint`):
  - Sends title & description to Gemini LLM with a strict JSON schema.
  - Receives `category`, `priority`, `department`, `summary`, and `confidence`.
  - Persists these fields on the complaint document.

- **Image Relevance Validation** (`AIService.validate_image_relevance`):
  - Multimodal Gemini Vision evaluates each image for civic relevance.
  - Returns a boolean `relevant` flag and a short justification.
  - If any image fails, the API returns `400 Bad Request` with the failure reason.

---

## 3. Assignment & Queue Stage (Admin / Officer)

| Role | Action |
|------|--------|
| **Admin** | Can manually assign an officer via `PATCH /complaints/{id}/assign`. This automatically changes the status to **In Progress** if it was `Pending`. |
| **Officer** | Views the **Department Queue** (`GET /complaints/department`) which returns all complaints where `department` matches the officer’s department **or** complaints where `assigned_officer` equals the officer’s ID. |
| **Admin** | Can also assign a department to an unassigned complaint using the same endpoint. |

---

## 4. Resolution Stage (Officer)

1. Officer opens the complaint detail page, inspects images, and optionally visits the physical location.
2. Officer updates the status via `PATCH /complaints/{id}/status`:
   - **In Progress** → Ongoing work.
   - **Resolved** – Provide `resolution_notes` describing the corrective action.
   - **Rejected** – Provide `resolution_notes` explaining why the complaint is out of scope or invalid.
3. The system records `updated_at` and logs the change for the citizen timeline.

---

## 5. Notification & Feedback Loop

- **Real‑Time Updates** – Frontend poll via React Query automatically refreshes the citizen dashboard.
- **Email / Push Notifications** – (Future extension) can be hooked into Firebase Cloud Messaging for status change alerts.
- **AI Chatbot** – Citizens can query the chatbot for the current status of a complaint ID; the RAG system pulls the latest timeline data from the database.

---

## 6. Auditing & Metrics

- All status transitions are stored in MongoDB with timestamps, enabling **audit trails**.
- Admin dashboard aggregates statistics via the `ComplaintService.get_dashboard_stats()` aggregation pipeline (counts per status, per department, average resolution time, etc.).

---

## 7. Edge Cases & Error Handling

- **Invalid Image** – Immediate rejection with a detailed error message.
- **AI Confidence < 0.6** – System flags the complaint for manual review by an admin.
- **Duplicate Complaint** – If a citizen attempts to file a complaint with the same title and location within 24 h, the API returns `409 Conflict` with a suggestion to view the existing ticket.

---

## 8. Diagram (Mermaid)

```mermaid
flowchart TD
    A[Citizen Submits] --> B[AI Image Validation]
    B --> C[AI Text Classification]
    C --> D[Store Complaint (Pending)]
    D -->|Admin Assign| E[Assigned to Officer]
    E -->|Officer Updates| F[Status Change]
    F -->|Resolved/Rejected| G[Citizen Notified]
```

---

*This document is stored in `backend/knowledge/grievance_process.md` for RAG ingestion.*
