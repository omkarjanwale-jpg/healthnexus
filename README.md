# HealthNexus: Clinic Appointment, Patient Queue & Emergency Management System

[![Node.js Version](https://img.shields.io/badge/node.js-v20%2B-brightgreen)](https://nodejs.org)
[![Framework](https://img.shields.io/badge/framework-Express.js-blue)](https://expressjs.com)
[![Database](https://img.shields.io/badge/database-SQLite%203%20(better--sqlite3)-orange)](https://github.com/WiseLibs/better-sqlite3)
[![Deployment](https://img.shields.io/badge/cloud-Google%20Cloud%20Run-4285F4)](https://cloud.google.com/run)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**HealthNexus** is an autonomous, production-grade healthcare operations MVP designed for rapid outpatient consultation scheduling, real-time patient queue triage, automated ambulance SOS dispatch telemetry, and regional blood bank inventory management.

---

## 1. Indian Healthcare Context & Problem Statement

### The Healthcare Delivery Challenge in India
1. **Outpatient (OPD) Queue Congestion:** Overcrowded clinic waiting rooms in tier-1 and tier-2 Indian cities result in 2–4 hour delays with zero real-time visibility into doctor consultation timings or queue tokens.
2. **Emergency Response Disconnect:** Lack of synchronized communication between callers, 108/102 ambulance paramedics, and hospital emergency trauma triage desks causes critical transit delays during road accidents and acute cardiac events.
3. **Blood Bank Inventory Scarcity:** Regional blood banks (Red Cross, Rotary, hospital banks) operate in silos, requiring emergency surgeons and families to make frantic manual phone calls to locate rare PRBC units, FFP, or platelets.

### The HealthNexus Solution: 5 Operational Pillars
- **1. Outpatient Appointment Management:** Specialist consultation booking across 8 clinical departments (AIIMS/PGIMER/CMC qualified doctors) with transparent INR (`₹`) consultation fees, instant queue token issuance (`Q-01`, `Q-02`, etc.), and digital booking tickets.
- **2. Patient Flow & OPD Queue Triage:** Live waiting room queue manifest, reception walk-in check-in, and priority flags for senior citizens, pediatric, and post-operative patients.
- **3. Ambulance Fleet Coordination (108 / 102 EMS):** Rapid automated SOS fleet mobilization assigning nearest ALS/BLS mobile units, direct driver & paramedic contact (`+91` mobile format), and 5-phase live transit telemetry.
- **4. Regional Blood-Bank Information:** Real-time inventory tracking across all 8 blood groups and therapeutic components (PRBC, Platelets, FFP) with automatic critical shortage warnings (&le; 5 units).
- **5. Emergency Trauma Coordination:** Hospital surgical blood requisition alerts, emergency corridor coordination with AIIMS and central trauma centers, and audit logging.

---

## 2. Compliance & Scope Guardrail

> **Strict Non-Diagnostic Adherence:**
> HealthNexus is engineered solely for administrative, logistical, and workflow operations. The system **does not** provide automated medical diagnosis, clinical symptom checkers, or automated treatment recommendations. For acute, life-threatening crises, direct emergency dialers (`108` / `112` Toll Free) and hospital trauma center dispatches are integrated directly into the interface.

---

## 3. Technology Stack

- **Runtime & Backend:** Node.js (v20 LTS) + Express.js 4.x
- **Template Engine:** EJS (Embedded JavaScript)
- **Styling & Icons:** Tailwind CSS (CDN) + FontAwesome 6 (CDN) + Google Fonts (`Inter`, `Outfit`)
- **Database:** SQLite 3 powered by high-performance synchronous driver `better-sqlite3` with Write-Ahead Logging (`WAL`)
- **Containerization:** Multi-stage `Dockerfile` built on `node:20-alpine`
- **Target Cloud:** Google Cloud Run (Fully managed serverless container runtime)

---

## 4. File Architecture

```text
├── package.json               # Node.js dependencies and run scripts
├── db.js                      # SQLite schema, Indian seeds, queries, and transactions
├── server.js                  # Express application, routes, auth, and APIs
├── Dockerfile                 # Multi-stage Alpine container configuration
├── .dockerignore              # Build context exclusion rules
├── .gitignore                 # Git ignore rules for node_modules and databases
├── README.md                  # System architecture, deployment, and API guide
├── views/
│   ├── partials/
│   │   ├── header.ejs         # Responsive header, 108/112 SOS ticker & auth status
│   │   └── footer.ejs         # Compliance notice, Indian emergency hotlines & stack tags
│   ├── index.ejs              # Public consultation booking + Live queue tracker
│   ├── emergency.ejs          # Ambulance dispatch SOS (108) + Blood availability index
│   ├── admin.ejs              # Clinic triage manager, fleet monitor & KPIs
│   └── login.ejs              # Attractive staff login with 1-click demo credentials
└── public/
    ├── css/
    │   └── custom.css         # Typography, animations, glassmorphism & print rules
    └── images/                # Medical branding & iconography
```

---

## 5. Local Setup & Run Instructions

### Prerequisites
- Node.js (v20 or newer)
- npm (v10 or newer)

### Step-by-Step Launch

1. Clone or navigate to the project directory:
   ```bash
   cd doct
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Access the web portals in your browser:
   - **Public Outpatient Clinic:** [http://localhost:8080/](http://localhost:8080/)
   - **Emergency SOS & Blood Bank:** [http://localhost:8080/emergency](http://localhost:8080/emergency)
   - **Staff Login:** [http://localhost:8080/login](http://localhost:8080/login)
   - **Admin Operations Desk:** [http://localhost:8080/admin](http://localhost:8080/admin)
   - **Health Monitor:** [http://localhost:8080/health](http://localhost:8080/health)

---

## 6. Staff Login & Demo Credentials

To access the restricted Clinic Operations Command Center (`/admin`):
- **Login URL:** [http://localhost:8080/login](http://localhost:8080/login)
- **Staff Username / Email:** `admin@healthnexus.org` (or `admin`)
- **Authorization Passcode:** `healthnexus2026` (or `admin123`)
- **Fast 1-Click Auto-Fill:** The login page features an `Auto-Fill` demo button that fills verified credentials in one click for hackathon evaluators.

---

## 7. Public GitHub Repository Setup

To push this complete project to your public GitHub repository:

```bash
# 1. Initialize git repository
git init

# 2. Stage all project files (.gitignore protects database & node_modules)
git add .

# 3. Commit initial release
git commit -m "feat: complete HealthNexus clinic & emergency management MVP"

# 4. Create main branch
git branch -M main

# 5. Link your public GitHub repository
git remote add origin https://github.com/[YOUR-USERNAME]/[YOUR-REPOSITORY-NAME].git

# 6. Push to GitHub
git push -u origin main
```

---

## 8. Google Cloud Run Deployment Pipeline

HealthNexus is packaged as a self-contained Alpine Linux container listening on `process.env.PORT || 8080`.

### Build with Cloud Build:
```bash
gcloud builds submit --tag gcr.io/[PROJECT-ID]/healthnexus:latest .
```

### Deploy to Cloud Run:
```bash
gcloud run deploy healthnexus \
  --image gcr.io/[PROJECT-ID]/healthnexus:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --set-env-vars NODE_ENV=production
```

---

## 9. Social Media & Hackathon Submission Copy

### LinkedIn / Devpost Announcement
```text
🚨 Excited to introduce HealthNexus: A Unified Clinic Appointment, Patient Queue & Emergency Operations Management System! 🏥

During medical emergencies and outpatient visits, every minute counts. Yet healthcare facilities often struggle with fragmented appointment queues, disconnected ambulance dispatches, and opaque blood bank inventories.

To solve this, we engineered HealthNexus — a high-performance, containerized healthcare operations MVP:
✅ 1. Outpatient Appointment Management: Digital booking with instant queue token generation.
✅ 2. Patient Flow & Queue Triage: Live waiting room manifest with fast walk-in reception entry.
✅ 3. Emergency Ambulance SOS Dispatch: Real-time unit mobilization with paramedic telemetry and 5-phase transit tracking.
✅ 4. Regional Blood Bank Inventory: Live visibility across 8 blood groups and components with low-stock alerts.
✅ 5. Emergency Central Coordination: Unified trauma center requisitions and audit logs.

⚡ Stack: Node.js 20, Express.js, SQLite 3 (WAL mode), EJS, Tailwind CSS, packaged on Alpine Linux for Google Cloud Run.

#HealthTech #Hackathon #NodeJS #CloudRun #HealthcareInnovation #ExpressJS #EmergencyResponse
```

---

## 10. Operational Endpoints

| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public outpatient booking wizard & doctor directory | No |
| `POST` | `/appointments` | Books appointment & generates queue token (`Q-XX`) | No |
| `POST` | `/appointments/cancel` | Cancels scheduled consultation slot | No |
| `GET` | `/emergency` | Emergency ambulance SOS & live blood bank inventory | No |
| `POST` | `/emergency/ambulance` | Dispatches nearest ALS/BLS mobile unit with telemetry | No |
| `POST` | `/emergency/blood-request`| Submits urgent hospital blood requisition | No |
| `GET` | `/login` | Attractive staff login with 1-click demo button | No |
| `POST` | `/login` | Authenticates staff credentials & sets session cookie | No |
| `GET` | `/logout` | Terminates staff session | Yes |
| `GET` | `/admin` | Clinic command center, triage queue & KPIs | **Yes (Staff)** |
| `POST` | `/admin/appointment/update-status`| Transitions patient triage phases | **Yes (Staff)** |
| `POST` | `/admin/appointment/walk-in` | Issues immediate walk-in queue token | **Yes (Staff)** |
| `POST` | `/admin/ambulance/update-status` | Updates ambulance transit status and ETA | **Yes (Staff)** |
| `POST` | `/admin/blood/update-stock` | Increments or decrements blood inventory units | **Yes (Staff)** |
| `POST` | `/admin/blood-request/status` | Resolves or fulfills hospital blood requisitions | **Yes (Staff)** |
| `GET` | `/health` | Container monitoring endpoint returning service status | No |
| `GET` | `/api/stats` | JSON endpoint returning real-time clinic statistics | No |
| `GET` | `/api/doctors` | JSON endpoint returning doctors filtered by department | No |
| `GET` | `/api/blood-search` | JSON endpoint filtering blood inventory | No |
