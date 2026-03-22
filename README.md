# 🏌️ Golf Charity Subscription Platform

A full-stack web application that combines golf with charity giving through a monthly subscription-based draw system. Subscribers enter their Stableford golf scores, participate in monthly draws, and a portion of every subscription goes directly to charities.

---

## 📁 Project Structure

```
├── frontend/          → React + TypeScript + Vite (UI)
│   ├── src/
│   │   ├── App.tsx    → Main application component
│   │   ├── main.tsx   → Entry point
│   │   └── index.css  → Global styles
│   ├── public/        → Static assets (images, 3D models)
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── backend/           → Node.js + Express + TypeScript (API)
│   ├── src/
│   │   ├── index.ts           → Express server entry
│   │   ├── config/supabase.ts → Database client
│   │   ├── middleware/        → JWT auth & admin guards
│   │   ├── routes/            → All API route handlers
│   │   └── utils/helpers.ts   → Constants & utilities
│   ├── database/schema.sql    → PostgreSQL schema
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## ⚡ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Three.js, GSAP |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **Hosting** | Vercel (frontend) + Railway/Render (backend) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone https://github.com/ighackerbot/glory.git
cd glory/rajesh-portfolio

# Install frontend
cd frontend && npm install

# Install backend
cd ../backend && npm install
```

### 2. Database Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Paste the contents of `backend/database/schema.sql` → Run
3. This creates 9 tables + seed data (3 charities)

### 3. Configure Environment

Create `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
PORT=3001
```

### 4. Run Locally

```bash
# Terminal 1 — Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 2 — Backend  (http://localhost:3001)
cd backend && npm run dev
```

---

## 📡 API Endpoints (30+)

| Module | Endpoints | Auth |
|--------|----------|------|
| **Auth** | `POST /api/auth/signup`, `/login`, `GET /me` | Public / JWT |
| **Subscriptions** | `GET`, `POST`, `PUT /cancel`, `PUT /renew` | JWT |
| **Scores** | `GET`, `POST`, `DELETE /:id` | JWT |
| **Draws** | `GET`, `GET /:id`, `POST`, `/enter`, `/execute`, `/simulate`, `/publish` | JWT / Admin |
| **Charities** | `GET`, `/featured`, `GET /:id`, `POST`, `PUT`, `DELETE`, `/user/select` | Public / Admin |
| **Winners** | `GET`, `/my`, `/verify`, `/review`, `/payout` | JWT / Admin |
| **User Dashboard** | `GET /api/dashboard/user` | JWT |
| **Admin Dashboard** | `GET /stats`, `/users`, `PUT /users/:id`, `/subscription` | Admin |

Full API docs: `GET /api` (when server is running)

---

## 🎯 Core Features

- **Subscription System** — Monthly ($24) or Yearly ($240) plans
- **Score Management** — Stableford scoring (1-45), rolling 5-score window
- **Draw System** — Random & algorithmic modes, jackpot rollover
- **Prize Pool** — 40% / 35% / 25% tier split (5-match / 4-match / 3-match)
- **Charity System** — 10% minimum contribution, user-selected charities
- **Winner Verification** — Proof upload → Admin review → Payout tracking
- **Admin Dashboard** — Full analytics, user & subscription management

---

## 🧪 Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Signup
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

---

## 🌐 Deployment

### Backend → Railway / Render

1. Set Root Directory: `rajesh-portfolio/backend`
2. Build: `npm install`
3. Start: `npx tsx src/index.ts`
4. Add env vars from `.env.example`

### Frontend → Vercel / Netlify

1. Set Root Directory: `rajesh-portfolio/frontend`
2. Build: `npm run build`
3. Output: `dist`
4. Env: `VITE_API_URL=https://your-backend-url.railway.app/api`

---

## 👤 Author

**Anuj Jain**

---

## 📄 License

This project is licensed under the MIT License.
