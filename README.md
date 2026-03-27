# British Auction RFQ System 🚢⚓

A production-grade, real-time British Auction system for Freight RFQs. Built with a modern **"Industrial Command Center"** aesthetic, this platform allows Buyers to launch multi-parameter auctions and Suppliers to compete in real-time with automated extension logic.

## 🚀 Key Features
- **Real-time Bidding**: Instant rank updates and bid notifications via Socket.IO.
- **Dynamic Extension Engine**: Automatically extends auctions if a bid is received in the "Danger Zone" (Trigger Window). 
- **Hard Cap Enforcement**: Absolute deadline (Forced Close) to prevent infinite extensions.
- **Role-Based Access (RBAC)**:
  - **BUYER**: Create RFQs, view all bids, analyze rankings.
  - **SUPPLIER**: Participate in marketplace, submit bids with carrier details, monitor L1 status.
- **Modern UI/UX**: High-density financial data display with Tailwind v4, custom animations, and a sleek "Shadow" theme.

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS v4, Zustand.
- **Backend**: Node.js, Express, Prisma (SQLite).
- **Communication**: Socket.IO for real-time sync.

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📝 Testing Logic
For a detailed step-by-step walkthrough of the auction logic (including extension triggers and L1 rank changes), see **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**.
