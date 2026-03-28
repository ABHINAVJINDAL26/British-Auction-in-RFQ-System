# Deployment Guide - British Auction RFQ System 🚀

This guide explains how to deploy the application to a production environment using **Render** (Backend) and **Vercel** (Frontend).

## 1. Database (PostgreSQL)
Since the local project uses SQLite (which doesn't persist on most cloud platforms), you should move to **PostgreSQL**.

- **Option A (Render)**: Create a "New PostgreSQL" database on Render.
- **Option B (Supabase)**: Create a project on Supabase and use their connection string.

**Action**: In `backend/prisma/schema.prisma`, change:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 🛠️ How to get your Connection String:
1. **Local (via pgAdmin)**:
   - Open **pgAdmin 4**.
   - Right-click **Databases** -> **Create** -> **Database**. Name it `auction_db`.
   - Your string: `postgresql://postgres:YOUR_PASSWORD@localhost:5432/auction_db?schema=public`
2. **Production (via Render)**:
   - On Render Dashboard, click **New +** -> **PostgreSQL**.
   - Create the database.
   - Copy the **Internal Database URL** for your Web Service env vars.

## 2. Backend Deployment (Render)
1. **New Web Service**: Connect your GitHub repo.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install && npx prisma generate && npx prisma db push`
4. **Start Command**: `node src/index.js`
5. **Environment Variables**:
   - `PORT`: `5000`
   - `JWT_SECRET`: (Your secret)
   - `DATABASE_URL`: (Your Postgres URL)
   - `FRONTEND_URL`: (Your Vercel URL, e.g., `https://your-app.vercel.app`)

## 3. Frontend Deployment (Vercel)
1. **New Project**: Connect your GitHub repo.
2. **Framework Preset**: `Vite`
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build`
5. **Environment Variables**:
   - `VITE_API_URL`: (The URL of your Render backend, e.g., `https://your-app.onrender.com/api`)

## 4. Socket.IO Configuration
Ensure the frontend `socket.js` uses the production backend URL:
```javascript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
```
On Render, WebSocket works out of the box, but ensure your frontend points to the correct `https://` (or `wss://`) URL.
