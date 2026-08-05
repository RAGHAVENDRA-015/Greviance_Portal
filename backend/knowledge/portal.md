# System Documentation — AI-Powered Citizen Grievance Portal

Welcome to the official **System Documentation** for the **AI-Powered Citizen Grievance Portal**. This document provides an exhaustive technical overview of the system architecture, technology stack, database schemas, role-based access control (RBAC), AI pipelines, API endpoints, and end-to-end workflows.

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [User Roles & RBAC Matrix](#3-user-roles--rbac-matrix)
4. [Database Schemas & Models](#4-database-schemas--models)
   - [User Document Model](#user-document-model)
   - [Complaint Document Model](#complaint-document-model)
   - [Enums & Constants](#enums--constants)
5. [AI Architecture & Pipelines](#5-ai-architecture--pipelines)
   - [Gemini AI Classification & Summarization](#gemini-ai-classification--summarization)
   - [Gemini Vision Multimodal Image Validation](#gemini-vision-multimodal-image-validation)
   - [RAG & Vector Search Chatbot](#rag--vector-search-chatbot)
6. [API Endpoints & Routing](#6-api-endpoints--routing)
7. [End-to-End Workflows](#7-end-to-end-workflows)
   - [Grievance Submission & Processing Workflow](#grievance-submission--processing-workflow)
   - [Officer Resolution & Update Workflow](#officer-resolution--update-workflow)
   - [Admin Assignment & Management Workflow](#admin-assignment--management-workflow)
8. [Configuration & Environment Variables](#8-configuration--environment-variables)

---

## 1. System Overview

The **Citizen Grievance Portal** is a full-stack, enterprise-grade web application designed to bridge the gap between citizens and municipal authorities. By leveraging Google Gemini AI, the system automates complaint triage, priority assessment, summary generation, image verification, and departmental routing.

### Key Highlights:
- **FastAPI Asynchronous Backend**: High-performance RESTful API with automated OpenAPI docs.
- **React 18 + Vite Frontend**: Modern, responsive SPA styled with TailwindCSS and Framer Motion animations.
- **MongoDB + Beanie ODM**: Scalable document-oriented database with asynchronous ODM and indexing.
- **Firebase Authentication**: Secure user management with JWT token validation.
- **Cloudinary Storage**: Automated cloud storage and delivery for complaint media assets.
- **Google Gemini 2.0 AI**: Advanced LLM and Vision models powering auto-categorization and multimodal image validation.

---

## 2. Technology Stack

### Backend Architecture
- **Framework**: Python 3.11+ / FastAPI
- **Database**: MongoDB (via Beanie ODM & Motor async driver)
- **Authentication**: Firebase Admin SDK
- **Storage**: Cloudinary Python SDK
- **AI / LLM**: Google GenAI SDK (`google-genai` / Gemini 2.0 Flash)
- **Vector Search & RAG**: FAISS & LangChain / Sentence Transformers

### Frontend Architecture
- **Core**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS, Lucide React icons, Framer Motion
- **State & Data Fetching**: TanStack React Query v5, Zustand
- **Forms & Validation**: React Hook Form, Zod

---

## 3. User Roles & RBAC Matrix

The system enforces strict Role-Based Access Control (RBAC) across API endpoints and UI routes:

| Feature / Action | Citizen | Officer | Admin |
| :--- | :---: | :---: | :---: |
| Register & Authenticate | ✅ | ✅ | ✅ |
| Manage Profile | ✅ | ✅ | ✅ |
| Submit New Complaint | ✅ | ❌ | ❌ |
| View Own Complaints (`/my`) | ✅ | ❌ | ❌ |
| View Department Queue | ❌ | ✅ (Own Dept) | ✅ (All Depts) |
| View All System Complaints | ❌ | ❌ | ✅ |
| Update Status & Notes | ❌ | ✅ (Assigned/Dept) | ✅ |
| Assign Officer / Dept | ❌ | ❌ | ✅ |
| Verify Officer Accounts | ❌ | ❌ | ✅ |
| Hard Delete Complaints | ❌ | ❌ | ✅ |
| Access Admin Dashboard | ❌ | ❌ | ✅ |

---

## 4. Database Schemas & Models

### User Document Model (`users` collection)
```python
class User(Document):
    firebase_uid: str           # Unique Firebase Auth ID (Indexed)
    name: str                   # Full name
    email: EmailStr             # Unique email address (Indexed)
    phone: Optional[str]        # Contact phone number
    role: UserRole              # CITIZEN | OFFICER | ADMIN
    department: Optional[str]   # Department string for Officers
    profile_image: Optional[str]# Avatar image URL
    address: Optional[str]      # Residential address
    is_active: bool             # Active status flag
    is_verified: bool           # Verification status (True for verified Officers)
    created_at: datetime        # Account creation timestamp
    updated_at: datetime        # Last update timestamp
```

### Complaint Document Model (`complaints` collection)
```python
class Complaint(Document):
    title: str                  # Grievance title (5-200 chars)
    description: str            # Detailed description (10-2000 chars)
    citizen_id: str             # MongoDB ObjectId string of citizen
    category: ComplaintCategory # Enum-enforced category
    priority: ComplaintPriority # Enum-enforced priority (Low, Medium, High)
    department: Optional[str]   # Department assigned to handle complaint
    status: ComplaintStatus     # Pending | In Progress | Resolved | Rejected
    location: Optional[dict]    # {"latitude": float, "longitude": float}
    images: List[ImageReference]# Array of Cloudinary image references
    ai_summary: Optional[str]   # Gemini generated executive summary
    ai_confidence: Optional[float]# AI classification confidence score (0.0 to 1.0)
    assigned_officer: Optional[str]# MongoDB ObjectId string of assigned officer
    resolution_notes: Optional[str]# Closing notes from resolving officer
    created_at: datetime        # Submission timestamp
    updated_at: datetime        # Last update timestamp
```

### Enums & Constants
- **`ComplaintStatus`**: `Pending`, `In Progress`, `Resolved`, `Rejected`
- **`ComplaintCategory`**: `Water Supply`, `Roads`, `Electricity`, `Garbage`, `Drainage`, `Public Safety`, `Health`, `Corruption`, `Other`
- **`ComplaintPriority`**: `Low`, `Medium`, `High`
- **`UserRole`**: `citizen`, `officer`, `admin`

---

## 5. AI Architecture & Pipelines

### Gemini AI Classification & Summarization
When a complaint is created, `AIService.classify_complaint()` sends the complaint title and description to Gemini AI with structured JSON outputs:
- **Category Detection**: Maps content to one of 9 enforced categories.
- **Priority Assessment**: Evaluates public safety hazards and urgency.
- **Department Routing**: Determines the best municipal authority.
- **Summary & Confidence**: Generates a 2-sentence summary and confidence score.

### Gemini Vision Multimodal Image Validation
`AIService.validate_image_relevance()` analyzes uploaded photo bytes alongside category and description. It verifies whether the image contains genuine civic defect evidence (e.g. potholes, broken transformers) and rejects irrelevant, blank, or inappropriate uploads.

### RAG & Vector Search Chatbot
- **Knowledge Ingestion**: Markdown knowledge bases (`citizen.md`, `portal.md`, `faq.md`) in `backend/knowledge/` are split into chunks.
- **Vector Indexing**: Embedded into a local **FAISS index** (`index.faiss`, `index.pkl`) in `backend/vector_store/`.
- **Retrieval Pipeline**: Upon query, `retriever.py` fetches relevant context chunks, which `prompt.py` feeds into Gemini AI for grounded responses.

---

## 6. API Endpoints & Routing

### Authentication Routes (`/auth`)
- `POST /auth/sync`: Synchronizes Firebase Auth tokens into MongoDB user documents.

### Complaint Routes (`/complaints`)
- `POST /complaints/validate-image`: Validates image relevance via Gemini Vision AI.
- `POST /complaints/`: Creates a new complaint with image uploads and AI classification (Citizen).
- `GET /complaints/my`: Returns all complaints submitted by the current citizen.
- `GET /complaints/department`: Returns complaints assigned to the officer's department.
- `GET /complaints/`: Returns all complaints (Officer/Admin).
- `GET /complaints/{id}`: Retrieves details for a specific complaint.
- `PATCH /complaints/{id}/status`: Updates complaint status and resolution notes (Officer/Admin).
- `PATCH /complaints/{id}/assign`: Assigns an officer and department to a complaint (Admin).
- `DELETE /complaints/{id}`: Hard deletes a complaint and cleans up Cloudinary assets (Admin).

### User Routes (`/users`)
- `GET /users/me`: Gets current authenticated user profile.
- `PATCH /users/me`: Updates current user profile details.
- `GET /users/officers`: Gets list of verified officers (Admin).

### Admin Routes (`/admin`)
- `GET /admin/stats`: Aggregate complaint metrics via MongoDB aggregation pipeline.
- `GET /admin/users`: Lists all users with filtering.
- `PATCH /admin/users/{id}/role`: Updates user role and department.
- `PATCH /admin/users/{id}/verify`: Toggles officer verification status.

---

## 7. End-to-End Workflows

### Grievance Submission & Processing Workflow
```
[Citizen Input] ➔ [Client-side Image Check] ➔ [Cloudinary Upload]
       │
       ▼
[Gemini AI Classification & Vision Check]
       │
       ▼
[Save Complaint to MongoDB] ➔ [Status: Pending]
```

### Officer Resolution & Update Workflow
```
[Officer Views Queue] ➔ [Selects Complaint] ➔ [Conducts Inspection]
       │
       ▼
[Submits Status Update (Resolved/Rejected) + Resolution Notes]
       │
       ▼
[MongoDB Record Updated] ➔ [Citizen Dashboard Reflects Real-Time Change]
```

### Admin Assignment & Management Workflow
```
[Admin Views System Stats] ➔ [Selects Pending Complaint]
       │
       ▼
[Assigns Officer ID & Department] ➔ [Status Automatically Changes to "In Progress"]
```

---

## 8. Configuration & Environment Variables

Key configuration parameters required in `backend/.env`:
- `MONGODB_URL`: MongoDB connection string.
- `DATABASE_NAME`: Database name (default: `grievance_portal`).
- `GEMINI_API_KEY`: API key for Google Gemini AI.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Media storage credentials.
- `FIREBASE_CREDENTIALS_PATH`: Path to Firebase Admin service account key JSON.
- `ALLOWED_ORIGINS`: Origins permitted by CORS middleware.
