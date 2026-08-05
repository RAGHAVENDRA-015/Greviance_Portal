# Citizen Guide — AI-Powered Citizen Grievance Portal

Welcome to the **Citizen Guide** for the AI-Powered Citizen Grievance Portal. This document provides complete information on how citizens can register, file grievances, upload evidence, track complaint status, and utilize AI features for fast civic issue resolution.

---

## Table of Contents
1. [Overview](#1-overview)
2. [Account Registration & Management](#2-account-registration--management)
3. [Filing a Grievance](#3-filing-a-grievance)
   - [Step 1: Grievance Details](#step-1-grievance-details)
   - [Step 2: Media Evidence & AI Image Validation](#step-2-media-evidence--ai-image-validation)
   - [Step 3: Location Tagging](#step-3-location-tagging)
   - [Step 4: AI Auto-Classification & Submission](#step-4-ai-auto-classification--submission)
4. [Grievance Categories & Departments](#4-grievance-categories--departments)
5. [Tracking Complaint Status & Lifecycle](#5-tracking-complaint-status--lifecycle)
6. [Citizen Dashboard & Personal Analytics](#6-citizen-dashboard--personal-analytics)
7. [AI Chatbot Assistance & Support](#7-ai-chatbot-assistance--support)
8. [Frequently Asked Questions (FAQ)](#8-frequently-asked-questions-faq)

---

## 1. Overview

The **Citizen Grievance Portal** empowers citizens to report public infrastructure and municipal issues directly to government authorities. Powered by Google Gemini AI, the platform automates categorization, priority scoring, summary generation, and image validation to ensure grievances are routed efficiently to the responsible department.

### Key Citizen Features:
- **Easy Complaint Filing**: Multi-step intuitive submission wizard.
- **AI Smart Assist**: Automated category detection, priority assignment, and executive summary generation.
- **AI Image Relevance Validation**: Verification of uploaded photos to ensure authentic civic issues.
- **Geo-location Support**: Automatic GPS coordinate capture for accurate physical location mapping.
- **Real-Time Tracking**: Interactive status tracker and step-by-step history log.
- **Personal Dashboard**: Charts, metrics, and trends of submitted complaints.
- **24/7 AI Chatbot Support**: Natural language assistance for instant portal help and status inquiry.

---

## 2. Account Registration & Management

### Account Creation
1. Navigate to the **Register** page (`/register`).
2. Provide your **Full Name**, **Email Address**, and a secure **Password**.
3. Upon registration, your account is automatically created with the **Citizen** role.
4. Authentication is secured via Firebase Auth.

### Profile Management
Citizens can update their personal information anytime from the **Profile** page (`/citizen/profile`):
- **Full Name**
- **Phone Number**
- **Residential Address**
- **Profile Picture**

---

## 3. Filing a Grievance

Citizens can create a new grievance by visiting **New Complaint** (`/citizen/complaints/new`). The submission wizard guides you through 4 steps:

### Step 1: Grievance Details
- **Title**: A clear summary of the issue (5 to 200 characters). *Example: "Broken street light near Central Park main gate"*.
- **Description**: Detailed explanation of the problem (10 to 2000 characters). Include specific context such as duration of issue, exact landmark, or public hazard details.
- **Category & Priority (Optional)**: You may manually choose a category and priority, or leave it blank to allow Gemini AI to automatically infer them from your title and description.

### Step 2: Media Evidence & AI Image Validation
- **Supported Formats**: JPEG, PNG, WebP.
- **Limits**: Up to **5 images**, maximum **5 MB** per image.
- **Image Content Validation**:
  - **Quality Check**: Rejects corrupted images, files smaller than 2x2 pixels, or solid/blank placeholder photos.
  - **Gemini Vision AI Check**: Analyzes uploaded photos to confirm they portray real civic issues matching the described context (e.g., potholes, garbage heaps, broken pipes).

### Step 3: Location Tagging
- **Automated GPS Detection**: Click **"Use Current Location"** to automatically populate your exact latitude and longitude via browser geolocation.
- **Manual Pinning**: Specify geographic coordinates to pinpoint exact issue locations for field officers.

### Step 4: AI Auto-Classification & Submission
When submitted, the backend triggers the **Gemini AI Classification Engine**:
- **Category Matching**: Assigns the complaint to one of the 9 official categories.
- **Department Routing**: Directs the complaint to the relevant government department.
- **Priority Scoring**: Assesses urgency (Low, Medium, High) based on safety hazards and public impact.
- **AI Summary**: Generates a concise executive summary for government officers.
- **Confidence Rating**: Calculates a confidence score (0.0 to 1.0) for the AI classification.

---

## 4. Grievance Categories & Departments

The portal supports 9 official grievance categories mapped to corresponding municipal and state departments:

| Grievance Category | Target Department | Example Issues |
| :--- | :--- | :--- |
| **Water Supply** | Water Board | Low water pressure, contaminated water, broken main pipeline, missing meter |
| **Roads** | Public Works Department (PWD) | Potholes, damaged pavement, broken footpaths, unpaved roads |
| **Electricity** | Electricity Board | Power outages, dangerous exposed wiring, broken street lights, transformer noise |
| **Garbage** | Sanitation Department | Uncollected municipal waste, overflowing dustbins, open dumping |
| **Drainage** | Municipal Engineering | Blocked stormwater drains, sewage overflow, stagnant water accumulation |
| **Public Safety** | Police / Public Safety | Damaged traffic signals, missing signboards, hazardous trees/structures |
| **Health** | Health Department | Vector breeding grounds, unhygienic public toilets, food safety violations |
| **Corruption** | Anti-Corruption Cell | Demand for bribes, misuse of official powers, fraudulent services |
| **Other** | Municipal Administration | Encroachments, public nuisance, noise pollution, unclassified issues |

---

## 5. Tracking Complaint Status & Lifecycle

Every complaint progresses through a transparent 4-stage lifecycle:

```
[ Pending ] ➔ [ In Progress ] ➔ [ Resolved ] OR [ Rejected ]
```

### Status Breakdown:
1. **Pending** (Amber): Complaint has been registered and is queued in the system awaiting officer assignment.
2. **In Progress** (Blue): An officer or department has been assigned and field resolution work is ongoing.
3. **Resolved** (Green): Work is completed. The officer uploads **Resolution Notes** detailing action taken.
4. **Rejected** (Red): Review determined the complaint is invalid, duplicate, or out of scope, accompanied by **Rejection Rationale**.

### Detailed View (`/citizen/complaints/{id}`)
- **Visual Progress Bar**: Step-by-step indicator showing current phase.
- **History Timeline**: Chronological event log showing when the complaint was created, assigned, and updated.
- **Photo Lightbox**: High-resolution gallery of uploaded evidence.
- **Resolution Notes**: Official closing comments from the assigned officer.

---

## 6. Citizen Dashboard & Personal Analytics

The **Citizen Dashboard** (`/citizen`) gives citizens full visibility into their grievance submission history:

- **Metrics Cards**: Total Complaints Filed, Pending, In Progress, Resolved, and Rejected.
- **Resolution Rate Progress Ring**: Percentage of total complaints successfully resolved.
- **Interactive Visualizations**:
  - *Status Distribution*: Breakdown chart of complaint statuses.
  - *Filing Trends*: Daily/Weekly timeline of submitted grievances.
  - *Resolution Analytics*: Comparison of pending vs. resolved grievances over time.
- **Recent Activity Feed**: Timeline of status updates across all your active complaints.
- **AI High-Confidence Highlights**: Showcase of complaints with high AI classification accuracy.

---

## 7. AI Chatbot Assistance & Support

The portal features an integrated **AI Chatbot** accessible across all citizen pages:
- **Instant Answers**: Ask questions about how to file complaints, required image formats, or department responsibilities.
- **Complaint Status Inquiries**: Query the chatbot for status updates on your existing complaints.
- **Guidance & Tips**: Receive advice on drafting effective descriptions and taking clear evidence photos.

---

## 8. Frequently Asked Questions (FAQ)

#### Q1: Can I edit a complaint after submitting it?
No. Once a complaint is submitted, it is immediately routed to officers and Gemini AI. If details need correction, you can add notes or submit a new grievance with updated information.

#### Q2: How long does it take for a complaint to be resolved?
Resolution times vary depending on priority and department:
- **High Priority** (Public safety/health hazards): 24 – 48 hours.
- **Medium Priority** (Road repairs, garbage removal): 3 – 7 business days.
- **Low Priority** (Minor maintenance): 7 – 14 business days.

#### Q3: Why was my uploaded image rejected during submission?
Images are checked automatically for:
- Supported formats (JPEG, PNG, WebP) and size (< 5 MB).
- Image clarity (corrupted, blank, or solid color images are rejected).
- Relevance (Gemini Vision ensures photos show legitimate civic issues).

#### Q4: What should I do if my complaint is marked "Rejected"?
Review the **Resolution Notes** on your complaint detail page. Rejections usually occur if the issue lacks sufficient detail, falls outside municipal jurisdiction, or is a duplicate. You may re-file with clearer photos and updated location data.

#### Q5: Are my personal details visible to officers?
Officers see the complaint title, description, photos, location, and contact information necessary to conduct field inspections and resolve your issue.
