# 🏛️ Smart Public Issues Reporting and Tracking System (CivicCare)

An enterprise-grade, AI-powered municipal grievance reporting and automated department tracking platform.

---

## 📁 Repository Structure

```
smart public issues reporting and tracking systems/
│
├── 📂 frontend/               # React 19 + Tailwind CSS + Lucide Icons + Chart.js + Leaflet
│   ├── src/                  # Components, Pages, Contexts, Hooks, CSS
│   ├── public/               # Public assets and icons
│   ├── index.html            # Web entrypoint
│   ├── package.json          # Frontend packages
│   ├── vite.config.js        # Vite dev server & /api proxy to Flask (Port 5000)
│   └── .env.local            # Frontend environment variables
│
├── 📂 backend/                # Flask + SQLAlchemy + JWT Auth + SQLite + AI Engine
│   ├── app.py                # Flask application entrypoint (Port 5000)
│   ├── config.py             # Server & database configuration
│   ├── database.db           # SQLite database
│   ├── models/               # SQLAlchemy Models (User, Issue, Notification, etc.)
│   ├── routes/               # API Blueprints (Auth, Issues, Admin, Analytics)
│   ├── services/             # AI classification, notifications, JWT token services
│   ├── static/               # Uploads & multimedia assets
│   ├── templates/            # HTML email verification & reset templates
│   ├── tests/                # Automated unit & integration test suites
│   ├── seed_data.py          # Admin provisioning & department seed script
│   └── requirements.txt      # Python dependencies
│
├── package.json              # Root helper scripts for workspace management
└── README.md
```

---

## 🚀 How to Run

### 1. Start Backend (Flask API - Port 5000)
```powershell
# From the project root:
cd backend
..\.venv\Scripts\python.exe app.py
```
Backend API will be live at: **`http://127.0.0.1:5000`**

---

### 2. Start Frontend (Vite React - Port 5173)
```powershell
# In a new terminal from project root:
cd frontend
npm run dev
```
Or from root:
```powershell
npm run dev
```
Frontend web application will be live at: **`http://localhost:5173`**

---

## 🔐 Built-in Administrative Accounts

| Account / Role | Email | Password | Department Portal |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `vevinoth333@gmail.com` | `vinothciviccare` | `/admin/dashboard` & `/admin/data-vault` |
| **Roads Admin** | `roads.admin@smartcity.gov` | `AdminPassword123!` | `/admin/roads` |
| **Sanitation Admin** | `sanitation.admin@smartcity.gov` | `AdminPassword123!` | `/admin/sanitation` |
| **Water Supply Admin** | `water.admin@smartcity.gov` | `AdminPassword123!` | `/admin/water` |
| **Electricity Admin** | `electricity.admin@smartcity.gov` | `AdminPassword123!` | `/admin/electricity` |
| **Drainage Admin** | `drainage.admin@smartcity.gov` | `AdminPassword123!` | `/admin/drainage` |
| **Public Health Admin**| `health.admin@smartcity.gov` | `AdminPassword123!` | `/admin/health` |
| **Commissioner** | `commissioner@smartcity.gov` | `AdminPassword123!` | `/admin/commissioner` |

---

## 🧪 Running Tests
```powershell
# Backend unit & integration test suite (11/11 tests)
cd backend
..\.venv\Scripts\python.exe -m unittest discover tests

# Frontend production build
cd frontend
npm run build
```
