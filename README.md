# TrackMent — Academic Project Governance & Mentorship Platform (React PWA)

A production-ready Progressive Web Application (PWA) built with **React 18**, **TypeScript**, **Vite**, and **Supabase**, migrated with 1:1 functional and visual parity from the original Flutter application for RV College of Engineering (RVCE).

---

## 🚀 Key Features & Role Personas

TrackMent unifies three distinct academic personas within a single Progressive Web App:

1. **Student / Team Member (`/student/*`)**
   - Sprint progress overview, deliverable submissions with verifiable proof file attachments (PDFs, images) & repository links.
   - Democratic leadership election voting ballots.
   - Mentor consultation requests, agenda coordination, and internal team availability voting.
   - Read-only meeting ledger & attendance history.
   - Team exit & leadership transfer workflows.

2. **Team Lead (`/lead/*`)**
   - Milestone progress slider & status updates.
   - Contribution review queue (Approve, Request Changes, Reject with remarks).
   - Incoming student join requests evaluation.
   - Faculty mentor directory discovery and mentorship proposals.
   - Student recruitment via USN/Branch directory search.

3. **Faculty Mentor (`/mentor/*`)**
   - Assigned project teams portfolio and milestone health monitoring.
   - Dual-column meeting triage (Confirm, Reschedule, Reject appointments).
   - Daily 8:00 AM – 6:00 PM Consultation Queue Monitor with red flag detection.
   - Meeting Attendance Ledger logger with absence tracking.
   - Milestone Marks Management: Phase 1, Phase 2, and Phase 3 cohort & individual evaluations.
   - Official **Download as Excel (.xlsx)** and CSV marks extraction across all assigned teams.
   - Faculty Broadcast Notice announcements dispatched across assigned teams.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript 5, Vite 6
- **Routing**: React Router 6 (Full SPA deep linking, route guards, role restrictions)
- **State Management & Auth**: Context API (`AuthContext`, `TeamContext`, `ToastContext`), Supabase Auth (Google OAuth + Password)
- **PWA**: `vite-plugin-pwa`, Workbox runtime caching, offline app shell routing, Web App Manifest
- **Spreadsheet Engine**: SheetJS (`xlsx`) for Excel reports
- **Backend / Database**: Supabase (PostgreSQL 16, RLS, Storage `project-proofs`, Realtime WebSockets)

---

## 📦 Installation & Local Development

### 1. Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm 9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your environment variables are configured:
```env
VITE_SUPABASE_URL=https://cqpjehsbpjeqomwlshob.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YLdlqjzPnNeJrUN4K6AvIw_b1nhe5MX
VITE_APP_URL=http://localhost:5173
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🏗️ Production Build & Verification

Run the full verification pipeline (TypeScript type checks + Vite production bundling + PWA Service Worker generation):

```bash
# Type check only
npm run typecheck

# Full production build
npm run build

# Preview production build locally
npm run preview
```

The output directory `dist/` contains all optimized production bundles, `manifest.webmanifest`, `sw.js`, and precached assets.

---

## 🚢 Vercel Deployment Guide

### Option A: Deploy via GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete TrackMent React PWA"
   git remote add origin https://github.com/YOUR_USERNAME/trackment-pwa.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your `trackment-pwa` GitHub repository.

3. **Configure Build Settings in Vercel**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (or the folder where `package.json` resides)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variables in Vercel**:
   In the Vercel dashboard project settings under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://cqpjehsbpjeqomwlshob.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_YLdlqjzPnNeJrUN4K6AvIw_b1nhe5MX`

5. **Deploy**:
   - Click **Deploy**. Vercel will build the project and output a live HTTPS URL (e.g. `https://trackment-pwa.vercel.app`).
   - SPA routing is pre-configured via [`vercel.json`](./vercel.json).

---

## ⚡ Supabase Production Dashboard Configuration

Once your production frontend is deployed (e.g. `https://trackment-pwa.vercel.app`), update your Supabase settings to allow authentication:

1. **Authentication → URL Configuration**:
   - **Site URL**: `https://trackment-pwa.vercel.app`
   - **Redirect URLs**:
     - `http://localhost:5173`
     - `http://localhost:5173/*`
     - `https://trackment-pwa.vercel.app`
     - `https://trackment-pwa.vercel.app/*`

2. **Google OAuth Configuration**:
   - In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client:
     - **Authorized JavaScript origins**:
       - `http://localhost:5173`
       - `https://trackment-pwa.vercel.app`
       - `https://cqpjehsbpjeqomwlshob.supabase.co`
     - **Authorized redirect URIs**:
       - `https://cqpjehsbpjeqomwlshob.supabase.co/auth/v1/callback`

---

## 🧪 Pre-Seeded Testing Accounts

The database includes 50 pre-seeded mock accounts across all three personas.

**Global Password for ALL Accounts:**
```text
123456
```

- **Faculty Mentors**:
  - `alan.turing@rvce.edu.in` (Prof. Alan Turing — CSE)
  - `ada.lovelace@rvce.edu.in` (Prof. Ada Lovelace — AIML)
  - `albert.einstein@rvce.edu.in` (Dr. Albert Einstein — ISE)
  - `nikola.tesla@rvce.edu.in` (Prof. Nikola Tesla — EEE)
  - `cv.raman@rvce.edu.in` (Dr. C. V. Raman — ECE)
- **Students & Team Leads**:
  - `student1@rvce.edu.in` to `student10@rvce.edu.in` (CSE, USN: `1RV25CS001` - `010`)
  - `student11@rvce.edu.in` to `student20@rvce.edu.in` (AIML, USN: `1RV25CI001` - `010`)
  - `student21@rvce.edu.in` to `student30@rvce.edu.in` (ISE, USN: `1RV25IS001` - `010`)
  - `student31@rvce.edu.in` to `student40@rvce.edu.in` (ECE, USN: `1RV25EC001` - `010`)
