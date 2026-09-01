# FarmFlow - Modern Agricultural Management System

FarmFlow is a comprehensive, production-ready full-stack application designed to modernize farm management. It integrates core agricultural record-keeping with advanced Machine Learning predictions, OCR receipt scanning, Voice Inputs, and dynamic PDF/CSV reporting.

---

## 🌟 Key Features

- **Core CRM & Farm Management:** Secure JWT authentication, multi-farm management, field tracking with soil type metrics, and crop lifecycle tracking across 7 stages (Planted -> Germination -> Vegetative -> Flowering -> Ripening -> Harvested -> Sold).
- **Financial Accounting:** Track Incomes and Expenses tied directly to specific crops, fields, or farms with dynamic cascading dropdowns, edit/delete actions, and instant P&L overview.
- **Livestock Management:** Manage livestock inventory, feed schedules, medical treatments, vaccination records with due date tracking, and daily production (milk/eggs).
- **Real-Time Analytics Dashboard:** Aggregated farm metrics, expense breakdown by category, yield distributions, and recent activities powered by MongoDB aggregation pipelines and `Recharts`.
- **AI & Machine Learning Engine:**
  - Crop Yield Prediction based on farm size and crop type.
  - Net Profit Forecasting with historical trend extrapolation.
  - Expense Anomaly Detection identifying unusual or inflated expense entries.
  - Smart Expense Category Recommendation based on natural language descriptions.
- **Modern Accessibility & Input Tools:**
  - Browser-native WebAssembly OCR (`tesseract.js`) for scanning receipts and bills directly into expense entries.
  - Web Speech API integration for hands-free voice logging.
- **Automated Alerts & PDF/CSV Reports:**
  - Dynamic in-app notification center for automated harvest and vaccination reminders.
  - On-demand PDF and CSV report generator with in-browser **Live PDF Preview**, print preview, and downloads using `reportlab`.

---

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **Database:** MongoDB (Motor Async Driver)
- **Authentication:** JWT (JSON Web Tokens), `passlib` (bcrypt)
- **Machine Learning:** `scikit-learn`, `joblib`, `numpy`, `pandas`
- **PDF Generation:** `reportlab`

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Vanilla Tailwind CSS
- **Icons:** `lucide-react`
- **Routing:** React Router DOM
- **HTTP Client:** Axios (centralized `api` instance with auto JWT header injection)
- **Charts:** Recharts
- **OCR:** `tesseract.js`

---

## 🚀 Local Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB Community Server (or MongoDB Atlas connection string)

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Getting Started
1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. Click **Create an account** on the login page to register your own account.
3. Start managing your farms, crops, livestock, activities, and finances!

---

## ☁️ Deployment on Render

This repository includes a `render.yaml` blueprint for easy deployment of both Backend and Frontend on [Render.com](https://render.com).

### Option A: Blueprint Deployment (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) -> **Blueprints** -> **New Blueprint Instance**.
2. Connect your GitHub repository `https://github.com/Aravindh2727/-FarmFlow.git`.
3. Set your `MONGODB_URL` environment variable (from MongoDB Atlas).
4. Click **Apply** – Render will build and deploy both the FastAPI Backend and Vite Frontend automatically!

### Option B: Manual Service Setup

#### 1. Backend Web Service:
- **Environment:** `Python 3`
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:**
  - `MONGODB_URL`: Your MongoDB Atlas connection URI (`mongodb+srv://...`)
  - `DATABASE_NAME`: `farmflow`
  - `JWT_SECRET`: A secure random string (minimum 32 characters)
  - `JWT_ALGORITHM`: `HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES`: `1440`

#### 2. Frontend Static Site:
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Rewrite Rules:** Add a rewrite rule for Single Page Application:
  - Source: `/*`
  - Destination: `/index.html`
- **Environment Variables:**
  - `VITE_API_URL`: `https://<YOUR-BACKEND-NAME>.onrender.com/api`

---

## 🧪 Testing

Run unit & integration tests from the backend directory:
```bash
cd backend
pytest test_phase9.py
```

## 🔒 Security

- Enforces strict user ID ownership verification across all database queries to prevent unauthorized cross-tenant data access.
- Passwords are encrypted using salted `bcrypt` hashes.
- API endpoints are protected using bearer JWT tokens.

## 📄 License
This project is licensed under the MIT License.
