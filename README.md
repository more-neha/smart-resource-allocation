# 🌍 SmartAid 2.0 — AI-Powered NGO Resource System (SRA AI)

SmartAid is a next-generation platform designed to revolutionize how Non-Governmental Organizations (NGOs) and civic bodies respond to emergencies and community needs. By combining crowdsourced incident reporting, real-time mapping, and a robust volunteer management network, SmartAid ensures resources are allocated with startup-speed precision.

Powered by **Google Gemini 2.0 Flash (SRA AI)**, the platform actively processes incident descriptions, formulates structured tactical response plans, and ranks volunteers automatically based on location, skillset, and availability.

---

## 🚀 Key Features

*   **Public Reporting Portal**: Clean, modern interface (Glassmorphism UI) for civilians to submit incidents (Floods, Fires, Medical Emergencies) along with exact geographical locations and images.
*   **SRA AI (Smart Resource Allocation AI)**: Integrated Gemini AI engine acts as a virtual incident commander. It reads the incident, generates actionable steps, and ranks the absolute best volunteers using real-time proximity algorithms.
*   **Volunteer Management System**: Dedicated workflows for civilians to apply to become volunteers, and for admins to review, accept, or reject them. Includes an automated volunteer dashboard to Accept/Deny assigned tasks.
*   **India-Focused Interactive Mapping**: Heatmaps and active incidents are plotted on a responsive Leaflet map strictly bound to the Indian subcontinent. Admins can view clustering based on incident severity.
*   **Modern Web UI**: Responsive `framer-motion` animations, seamless gradient designs, and intuitive dashboards built with Tailwind CSS.
*   **Secure Access Controls**: Role-Based Access Control (RBAC) securely separating `user`, `volunteer`, `admin`, and `super_admin`.

---

## 💻 Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS, Framer Motion, React-Leaflet
*   **Backend**: FastAPI (Python), SQLAlchemy, Pydantic
*   **Database**: PostgreSQL (Hosted on Aiven)
*   **AI Engine**: Google Gemini API (gemini-2.0-flash)
*   **Authentication**: Firebase Auth (Google Sign-In)
*   **Media Storage**: Cloudinary

---

## 🛠️ How to Run Locally

Follow these clear steps to run the full stack on your local machine.

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` folder.
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows
   .venv\Scripts\activate
   # On macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` directory with your secrets:
   ```env
   # Example backend/.env
   DATABASE_URL=postgresql://user:pass@host:port/defaultdb?sslmode=require
   GEMINI_API_KEY=your_gemini_api_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   ```
5. *(Optional)* Seed the database with clean test data:
   ```bash
   python seed_data.py
   ```
6. Start the server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` directory:
   ```env
   # Example frontend/.env
   VITE_API_URL=http://127.0.0.1:8000
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🔐 Security Information

*   All sensitive keys (Gemini, Database URLs, Cloudinary) must strictly remain in `.env` files.
*   `.env` and `firebase-admin-key.json` are properly ignored in `.gitignore`. **Do not commit them.**
*   API Endpoints are secured via Firebase JWT validation. Only users matching `require_admin` dependencies can execute destructive or elevated actions.

---

## 👨‍💻 Team & Contribution

This system is built for hackathons and production deployments focusing on civic tech. 
**SmartAid 2.0** — Moving fast to save lives.
