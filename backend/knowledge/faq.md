# Frequently Asked Questions (FAQ) — Citizen Grievance Portal

Welcome to the **Frequently Asked Questions (FAQ)** repository for the **AI-Powered Citizen Grievance Portal**. This document provides detailed answers to common questions asked by **Citizens**, **Department Officers**, and **System Administrators**, as well as technical insights into the portal's AI features and security protocols.

---

## Table of Contents
1. [General Questions](#1-general-questions)
2. [Citizen FAQs](#2-citizen-faqs)
   - [Account & Profile](#account--profile)
   - [Submitting a Grievance](#submitting-a-grievance)
   - [Media & Image Uploads](#media--image-uploads)
   - [Location & Mapping](#location--mapping)
   - [Tracking & Statuses](#tracking--statuses)
3. [Department Officer FAQs](#3-department-officer-faqs)
   - [Account Verification](#account-verification)
   - [Managing Assigned Complaints](#managing-assigned-complaints)
   - [Updating Status & Resolution Notes](#updating-status--resolution-notes)
4. [Administrator FAQs](#4-administrator-faqs)
   - [User & Role Management](#user--role-management)
   - [Officer Assignments & Department Escalations](#officer-assignments--department-escalations)
   - [Analytics & Metrics](#analytics--metrics)
5. [AI & Technical Deep-Dive](#5-ai--technical-deep-dive)
   - [Gemini AI Classification & Summarization](#gemini-ai-classification--summarization)
   - [AI Image Relevance Validation](#ai-image-relevance-validation)
   - [RAG & Vector Search Chatbot](#rag--vector-search-chatbot)
6. [Security & Privacy](#6-security--privacy)

---

## 1. General Questions

### What is the Citizen Grievance Portal?
The Citizen Grievance Portal is an AI-powered municipal management web platform that allows citizens to report public issues (such as potholes, water leaks, garbage accumulation, or power outages) directly to local government authorities.

### How does AI improve grievance resolution?
Google Gemini AI automatically analyzes incoming complaints to:
1. **Categorize** the issue accurately into one of 9 municipal categories.
2. **Assign a priority rating** (Low, Medium, High) based on public safety hazards.
3. **Generate an executive summary** for field officers.
4. **Validate uploaded photos** to filter out non-civic or blank images.

### What user roles exist on the platform?
- **Citizen** (Default): Registers, files grievances, uploads photos, tracks progress, and views personal analytics.
- **Officer**: Verified government representative who manages departmental queues, conducts inspections, and resolves complaints.
- **Admin**: System administrator with full access to user management, officer approvals, complaint assignments, and system-wide analytics.

---

## 2. Citizen FAQs

### Account & Profile

#### Q: How do I create a Citizen account?
Click on **Register** on the top navigation bar or go to `/register`. Fill in your name, email address, and password. Your account will automatically receive the **Citizen** role.

#### Q: Can I update my contact details after registration?
Yes. Go to your **Profile** page (`/citizen/profile`) to update your full name, phone number, residential address, or profile picture.

---

### Submitting a Grievance

#### Q: How do I file a new complaint?
Navigate to **New Complaint** (`/citizen/complaints/new`) and complete the 4-step wizard:
1. **Details**: Title (5–200 chars) and detailed description (10–2000 chars).
2. **Evidence**: Upload up to 5 photos.
3. **Location**: Auto-detect GPS or manually pin coordinates.
4. **Submit**: Review and submit for AI auto-classification.

#### Q: Do I need to know which department handles my issue?
No! You can leave the category and department blank. Gemini AI will analyze your title and description to automatically assign the appropriate category and department.

#### Q: Can I edit a complaint after submission?
Once submitted, complaints cannot be directly edited because they are immediately indexed and assigned. If major information was omitted, you may submit a follow-up complaint or ask the AI Chatbot for assistance.

---

### Media & Image Uploads

#### Q: What image formats and sizes are supported?
- **Formats**: JPEG, PNG, WebP.
- **Quantity**: Maximum **5 images** per complaint.
- **Size Limit**: Up to **5 MB** per image on frontend (10 MB backend cap).

#### Q: Why did the portal reject my photo upload?
Photos are validated automatically on upload:
1. **Client Quality Check**: Blank images (all black/white), corrupted files, or tiny placeholder images (< 2x2 pixels) are rejected.
2. **Gemini Vision Check**: The AI verifies that the photo actually depicts a civic issue matching your report. Personal selfies, unrelated downloads, or non-civic photos will be flagged as invalid.

---

### Location & Mapping

#### Q: Why does the portal request my GPS location?
GPS coordinates help field officers locate the exact physical site of the problem (e.g., specific pothole or street light pole) without delay.

#### Q: What if I am reporting an issue from a different location than where I currently am?
You can grant GPS permission for current location or manually adjust the latitude and longitude parameters during Step 3 of complaint creation.

---

### Tracking & Statuses

#### Q: What do the complaint statuses mean?
- 🟡 **Pending**: Complaint submitted and queued for officer assignment.
- 🔵 **In Progress**: Assigned to an officer/department; investigation or repairs underway.
- 🟢 **Resolved**: Issue fixed! Resolution notes are posted by the officer.
- 🔴 **Rejected**: Review determined the complaint is invalid, duplicate, or out of scope.

#### Q: Where can I view officer notes on my resolved complaint?
Click on any complaint in your **Complaints List** (`/citizen/complaints`) or **Dashboard** (`/citizen`) to open the **Complaint Detail Page** (`/citizen/complaints/{id}`). You will find resolution notes and a complete history timeline at the bottom.

---

## 3. Department Officer FAQs

### Account Verification

#### Q: I registered as an Officer, but I cannot access the Officer Dashboard. Why?
Officer accounts require verification by a System Administrator to prevent unauthorized access to government queues. Contact your portal admin to verify your account (`is_verified = True`).

---

### Managing Assigned Complaints

#### Q: How do I view complaints assigned to my department?
Log into your officer account and open the **Officer Queue** (`/officer/queue`). You can filter by:
- **My Assigned Complaints**: Issues directly assigned to your Officer ID.
- **Department Queue**: Issues assigned to your department (e.g., Water Board, Public Works).

#### Q: Can I reassign a complaint if it belongs to a different department?
If a complaint was misclassified, notify a System Administrator via the Admin Panel to update the department or reassign it to the correct officer.

---

### Updating Status & Resolution Notes

#### Q: How do I mark a complaint as Resolved?
1. Open the complaint detail page in the Officer interface (`/officer/complaints/{id}`).
2. Click **Update Status**.
3. Select **Resolved** (or **In Progress** / **Rejected**).
4. Enter clear **Resolution Notes** explaining the repairs or action taken.
5. Click **Save Changes**.

---

## 4. Administrator FAQs

### User & Role Management

#### Q: How do I promote a user to an Officer or Admin role?
In the **Admin Console** under **Users** (`/admin/users`), select the target user account, edit their role, and assign their designated department if promoting to Officer.

#### Q: How do I verify new Officer registrations?
Go to **Officers** (`/admin/officers`), review pending officer registrations, and toggle their verification status to **Verified**.

---

### Officer Assignments & Department Escalations

#### Q: How do I manually assign an officer to an unassigned complaint?
Open the complaint in `/admin/complaints/{id}`, click **Assign Officer**, select the officer from the dropdown list, and save. The status automatically transitions from **Pending** to **In Progress**.

#### Q: What happens when an Admin deletes a complaint?
Performing a hard delete on a complaint removes the MongoDB document and automatically deletes all associated photo folders from Cloudinary storage.

---

### Analytics & Metrics

#### Q: What analytics are available on the Admin Dashboard?
The Admin Dashboard (`/admin`) utilizes MongoDB aggregation pipelines to calculate:
- **Total Grievances Filed** across all categories.
- **Status Breakdown**: Pending, In Progress, Resolved, and Rejected counts.
- **Departmental Load Distribution**: Number of complaints handled per department.
- **Average Resolution Time**: Performance tracking across municipal sectors.

---

## 5. AI & Technical Deep-Dive

### Gemini AI Classification & Summarization

#### Q: How does the AI classify complaints?
When a complaint is submitted, the backend calls `AIService.classify_complaint()`, sending the title and description to Gemini AI. The model analyzes the text against strict schemas and returns:
- Recommended **Category**
- Recommended **Department**
- **Priority Rating** (Low/Medium/High)
- Concise **Summary**
- **Confidence Score** (0.0 to 1.0)

---

### AI Image Relevance Validation

#### Q: How does multimodal image validation work?
Uploaded image bytes are sent to Gemini Vision AI (`validate_image_relevance()`) alongside the category and description. The model assesses whether the visual elements in the photo correspond to genuine civic damage or infrastructure failure.

---

### RAG & Vector Search Chatbot

#### Q: How does the AI Chatbot answer citizen questions?
The portal uses **Retrieval-Augmented Generation (RAG)**:
1. Portal knowledge files (`citizen.md`, `portal.md`, `faq.md`) are processed and indexed into a **FAISS vector database**.
2. When a user asks a question, the backend retrieves top matching semantic snippets.
3. Gemini AI synthesizes a friendly, accurate response grounded strictly in portal knowledge.

---

## 6. Security & Privacy

### How is user authentication handled?
Authentication is handled via **Firebase Authentication** using JWT Bearer Tokens. Passwords are never stored directly on portal servers.

### How is data access restricted (RBAC)?
The FastAPI backend enforces Role-Based Access Control (RBAC):
- **Citizens** can only access their own submitted complaints (`GET /complaints/my`).
- **Officers** can only view/update complaints within their department or assigned to their ID.
- **Admins** hold system-wide read/write permissions.

### Are uploaded photos stored securely?
Yes. Uploaded evidence photos are hosted on Cloudinary with organized folder structures per citizen and complaint ID, served over HTTPS with secure CDN delivery.
