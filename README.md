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
- **Backend**: Node.js, Express, Prisma (PostgreSQL).
- **Communication**: Socket.IO for real-time sync.

## 🧭 High Level Design (HLD)

The following architecture diagram is aligned with the current project implementation:

- Buyer and Supplier portals
- REST + WebSocket hybrid flow
- Bid processing + extension engine
- 30-second scheduler (cron)
- PostgreSQL + Prisma data layer

![British Auction RFQ - HLD](./Hld_arc.png)

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

## ✅ Core Runtime Rules
- Bid submit performs immediate extension check (cron wait is not required).
- Trigger window is always computed from current `bidCloseTime`.
- Forced close time is a hard cap and is never crossed.
- Only latest bid per supplier participates in live ranking (`isLatest = true`).


## Database Schema Document
- PDF: [Db_schema.pdf](./Db_schema.pdf)


---

## Detailed Build Guide (Merged from previous README)

# 🏛️ British Auction RFQ System — Complete Build Guide

> A full-stack, production-grade RFQ (Request for Quotation) platform with British Auction–style bidding, real-time extensions, and modern UI/UX.

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture (HLD)](#3-system-architecture-hld)
4. [Database Schema Design](#4-database-schema-design)
5. [Backend — API Design & Code Structure](#5-backend--api-design--code-structure)
6. [Frontend — UI/UX Design & Code Structure](#6-frontend--uiux-design--code-structure)
7. [British Auction Business Logic](#7-british-auction-business-logic)
8. [Validation Rules Implementation](#8-validation-rules-implementation)
9. [Real-Time Features (WebSockets)](#9-real-time-features-websockets)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Page-by-Page UI Breakdown](#11-page-by-page-ui-breakdown)
12. [Folder Structure](#12-folder-structure)
13. [Setup & Running the Project](#13-setup--running-the-project)
14. [Deliverables Checklist](#14-deliverables-checklist)

---

## 1. Project Overview

This system enables **buyers** to create RFQs with British Auction–style bidding where:

- Suppliers submit bids and compete by lowering prices
- Bidding near the deadline **automatically extends** the auction
- A **Forced Close Time** acts as a hard cap — no extension can go beyond it
- Buyers see real-time rankings (L1, L2, L3...) and an activity log

---

## 2. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js (v20+) |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Real-time | Socket.IO |
| Auth | JWT (JSON Web Tokens) |
| Validation | Zod |
| Task Scheduling | node-cron / BullMQ |
| API Docs | Swagger / OpenAPI |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS + custom CSS variables |
| State Management | Zustand |
| Real-time | Socket.IO Client |
| Data Fetching | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Charts & Timers | Recharts + custom countdown |
| Date/Time | date-fns |
| Icons | Lucide React |
| Notifications | react-hot-toast |

---

## 3. System Architecture (HLD)

```
┌────────────────────────────────────────────────────────┐
│                     CLIENT (React)                      │
│   Auction List │ Auction Details │ RFQ Create │ Bid     │
└────────────────────────┬───────────────────────────────┘
                         │ HTTP + WebSocket
                         ▼
┌────────────────────────────────────────────────────────┐
│                  API SERVER (Express)                   │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  REST APIs  │  │  Socket.IO   │  │  Cron Jobs    │  │
│  │  /rfq       │  │  bid:new     │  │  check        │  │
│  │  /bids      │  │  rank:update │  │  trigger      │  │
│  │  /auction   │  │  time:extend │  │  windows      │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Auction Extension Engine              │   │
│  │  - Watches trigger window (X minutes)            │   │
│  │  - Checks trigger type (bid / rank / L1 change)  │   │
│  │  - Extends time by Y minutes                     │   │
│  │  - Enforces Forced Close Time cap                │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                   │
│  rfqs │ auction_configs │ bids │ auction_events         │
└────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **WebSockets** for real-time bid updates and countdown timer sync across all connected suppliers/buyers
- **Cron Job / BullMQ** runs every 30 seconds to evaluate trigger windows and fire extensions
- **Auction Extension Engine** is a dedicated service module, keeping business logic separate from routes
- **Optimistic locking** on bids to prevent race conditions when multiple bids arrive simultaneously

---

## 4. Database Schema Design

### Table: `rfqs`
```sql
CREATE TABLE rfqs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id    VARCHAR(50) UNIQUE NOT NULL,       -- e.g. RFQ-2024-001
  name            VARCHAR(255) NOT NULL,
  buyer_id        UUID NOT NULL REFERENCES users(id),
  pickup_date     TIMESTAMP NOT NULL,
  bid_start_time  TIMESTAMP NOT NULL,
  bid_close_time  TIMESTAMP NOT NULL,                -- current close (can extend)
  forced_close_time TIMESTAMP NOT NULL,              -- hard cap, never changes
  original_close_time TIMESTAMP NOT NULL,            -- original close before extensions
  status          VARCHAR(20) DEFAULT 'DRAFT'        -- DRAFT | ACTIVE | CLOSED | FORCE_CLOSED
                  CHECK (status IN ('DRAFT','ACTIVE','CLOSED','FORCE_CLOSED')),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: `auction_configs`
```sql
CREATE TABLE auction_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id            UUID UNIQUE NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  trigger_window_x  INTEGER NOT NULL,   -- minutes before close to monitor
  extension_duration_y INTEGER NOT NULL, -- minutes to extend when triggered
  trigger_type      VARCHAR(30) NOT NULL
                    CHECK (trigger_type IN (
                      'BID_RECEIVED',         -- any new bid in window
                      'ANY_RANK_CHANGE',      -- any supplier rank changes
                      'L1_RANK_CHANGE'        -- only when top bidder changes
                    )),
  created_at        TIMESTAMP DEFAULT NOW()
);
```

### Table: `bids`
```sql
CREATE TABLE bids (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id            UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id       UUID NOT NULL REFERENCES users(id),
  carrier_name      VARCHAR(255) NOT NULL,
  freight_charges   DECIMAL(12,2) NOT NULL,
  origin_charges    DECIMAL(12,2) DEFAULT 0,
  destination_charges DECIMAL(12,2) DEFAULT 0,
  total_charges     DECIMAL(12,2) GENERATED ALWAYS AS 
                    (freight_charges + origin_charges + destination_charges) STORED,
  transit_time      INTEGER NOT NULL,              -- in days
  quote_validity    DATE NOT NULL,
  rank              INTEGER,                       -- L1=1, L2=2, etc. (computed)
  submitted_at      TIMESTAMP DEFAULT NOW(),
  is_latest         BOOLEAN DEFAULT TRUE,          -- only latest bid per supplier
  notes             TEXT
);

-- Index for fast rank queries
CREATE INDEX idx_bids_rfq_total ON bids(rfq_id, total_charges ASC) WHERE is_latest = TRUE;
```

### Table: `auction_events`
```sql
CREATE TABLE auction_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id        UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  event_type    VARCHAR(30) NOT NULL
                CHECK (event_type IN (
                  'BID_SUBMITTED',
                  'TIME_EXTENDED',
                  'AUCTION_STARTED',
                  'AUCTION_CLOSED',
                  'AUCTION_FORCE_CLOSED'
                )),
  actor_id      UUID REFERENCES users(id),         -- who triggered it
  description   TEXT NOT NULL,
  old_close_time TIMESTAMP,                         -- before extension
  new_close_time TIMESTAMP,                         -- after extension
  triggered_by  VARCHAR(30),                        -- trigger type that caused extension
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### Table: `users`
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  role        VARCHAR(20) CHECK (role IN ('BUYER', 'SUPPLIER')),
  company     VARCHAR(255),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Backend — API Design & Code Structure

### REST API Endpoints

#### RFQ Endpoints
```
POST   /api/rfqs                     Create new RFQ with auction config
GET    /api/rfqs                     List all RFQs (with filters: status, date)
GET    /api/rfqs/:id                 Get RFQ details
PATCH  /api/rfqs/:id                 Update RFQ (only if DRAFT)
DELETE /api/rfqs/:id                 Delete RFQ (only if DRAFT)
```

#### Bid Endpoints
```
POST   /api/rfqs/:id/bids            Submit a bid for an RFQ
GET    /api/rfqs/:id/bids            Get all bids for an RFQ (sorted by total_charges)
GET    /api/rfqs/:id/bids/my         Get current supplier's own bids
```

#### Auction Endpoints
```
GET    /api/rfqs/:id/auction/status  Get current auction status + time remaining
GET    /api/rfqs/:id/auction/events  Get activity log for an auction
POST   /api/rfqs/:id/auction/start   Manually start auction (if start_time not set)
```

### Backend Code Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── rfq.routes.js
│   │   ├── bid.routes.js
│   │   └── auction.routes.js
│   ├── controllers/
│   │   ├── rfq.controller.js
│   │   ├── bid.controller.js
│   │   └── auction.controller.js
│   ├── services/
│   │   ├── rfq.service.js
│   │   ├── bid.service.js
│   │   ├── auction.service.js
│   │   └── auctionExtension.engine.js   ← Core business logic
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── validate.middleware.js
│   ├── validators/
│   │   ├── rfq.validator.js
│   │   └── bid.validator.js
│   ├── sockets/
│   │   └── auction.socket.js            ← WebSocket events
│   ├── jobs/
│   │   └── extensionChecker.job.js      ← Cron job
│   ├── prisma/
│   │   └── schema.prisma
│   ├── config/
│   │   └── db.js
│   └── index.js
```

### Core: Auction Extension Engine

```javascript
// services/auctionExtension.engine.js

async function checkAndExtendAuction(rfqId) {
  const rfq = await prisma.rfq.findUnique({
    where: { id: rfqId },
    include: { auctionConfig: true }
  });

  if (!rfq || rfq.status !== 'ACTIVE') return;

  const now = new Date();
  const { trigger_window_x, extension_duration_y, trigger_type } = rfq.auctionConfig;

  // Calculate trigger window start
  const windowStart = new Date(rfq.bid_close_time);
  windowStart.setMinutes(windowStart.getMinutes() - trigger_window_x);

  // Only evaluate if we're inside the trigger window
  if (now < windowStart || now > rfq.bid_close_time) return;

  let shouldExtend = false;

  if (trigger_type === 'BID_RECEIVED') {
    // Check if any bid was placed in the trigger window
    const recentBid = await prisma.bid.findFirst({
      where: { rfq_id: rfqId, submitted_at: { gte: windowStart } }
    });
    shouldExtend = !!recentBid;
  }

  else if (trigger_type === 'ANY_RANK_CHANGE') {
    // Check if any rank-changing event happened in window
    const rankEvent = await prisma.auctionEvent.findFirst({
      where: {
        rfq_id: rfqId,
        event_type: 'BID_SUBMITTED',
        created_at: { gte: windowStart }
      }
    });
    shouldExtend = !!rankEvent;
  }

  else if (trigger_type === 'L1_RANK_CHANGE') {
    // Check if top bidder (rank=1) changed in the window
    const l1ChangeEvent = await prisma.auctionEvent.findFirst({
      where: {
        rfq_id: rfqId,
        triggered_by: 'L1_RANK_CHANGE',
        created_at: { gte: windowStart }
      }
    });
    shouldExtend = !!l1ChangeEvent;
  }

  if (shouldExtend) {
    await extendAuction(rfq, extension_duration_y, trigger_type);
  }
}

async function extendAuction(rfq, extensionMinutes, reason) {
  const newCloseTime = new Date(rfq.bid_close_time);
  newCloseTime.setMinutes(newCloseTime.getMinutes() + extensionMinutes);

  // HARD RULE: Never exceed forced close time
  const finalCloseTime = newCloseTime > rfq.forced_close_time
    ? rfq.forced_close_time
    : newCloseTime;

  // Don't extend if already at forced close
  if (rfq.bid_close_time >= rfq.forced_close_time) return;

  await prisma.rfq.update({
    where: { id: rfq.id },
    data: { bid_close_time: finalCloseTime }
  });

  // Log the extension event
  await prisma.auctionEvent.create({
    data: {
      rfq_id: rfq.id,
      event_type: 'TIME_EXTENDED',
      description: `Auction extended by ${extensionMinutes} min due to ${reason}`,
      old_close_time: rfq.bid_close_time,
      new_close_time: finalCloseTime,
      triggered_by: reason
    }
  });

  // Broadcast to all connected clients via WebSocket
  io.to(rfq.id).emit('auction:time-extended', {
    rfqId: rfq.id,
    newCloseTime: finalCloseTime,
    reason,
    extensionMinutes
  });
}
```

### Bid Submission with Rank Recalculation

```javascript
// services/bid.service.js

async function submitBid(rfqId, supplierId, bidData) {
  // 1. Validate auction is still active
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
  if (!rfq || rfq.status !== 'ACTIVE') throw new Error('Auction is not active');
  if (new Date() > rfq.bid_close_time) throw new Error('Auction has closed');

  // 2. Get current L1 before new bid
  const currentL1 = await prisma.bid.findFirst({
    where: { rfq_id: rfqId, is_latest: true },
    orderBy: { total_charges: 'asc' }
  });

  // 3. Mark supplier's previous bid as not latest
  await prisma.bid.updateMany({
    where: { rfq_id: rfqId, supplier_id: supplierId, is_latest: true },
    data: { is_latest: false }
  });

  // 4. Create new bid
  const newBid = await prisma.bid.create({
    data: { rfq_id: rfqId, supplier_id: supplierId, is_latest: true, ...bidData }
  });

  // 5. Recalculate all ranks
  await recalculateRanks(rfqId);

  // 6. Check if L1 changed
  const newL1 = await prisma.bid.findFirst({
    where: { rfq_id: rfqId, is_latest: true },
    orderBy: { total_charges: 'asc' }
  });

  const l1Changed = currentL1?.supplier_id !== newL1?.supplier_id;

  // 7. Log bid event with L1 change info
  await prisma.auctionEvent.create({
    data: {
      rfq_id: rfqId,
      event_type: 'BID_SUBMITTED',
      actor_id: supplierId,
      description: `New bid of ₹${newBid.total_charges} submitted`,
      triggered_by: l1Changed ? 'L1_RANK_CHANGE' : null
    }
  });

  // 8. Broadcast to all clients
  io.to(rfqId).emit('bid:new', { bid: newBid, l1Changed });

  // 9. Trigger extension check immediately
  await checkAndExtendAuction(rfqId);

  return newBid;
}

async function recalculateRanks(rfqId) {
  const activeBids = await prisma.bid.findMany({
    where: { rfq_id: rfqId, is_latest: true },
    orderBy: { total_charges: 'asc' }
  });

  for (let i = 0; i < activeBids.length; i++) {
    await prisma.bid.update({
      where: { id: activeBids[i].id },
      data: { rank: i + 1 }
    });
  }
}
```

### Validation (Zod)

```javascript
// validators/rfq.validator.js
import { z } from 'zod';

export const createRfqSchema = z.object({
  name: z.string().min(3).max(255),
  pickup_date: z.coerce.date(),
  bid_start_time: z.coerce.date(),
  bid_close_time: z.coerce.date(),
  forced_close_time: z.coerce.date(),
  auction_config: z.object({
    trigger_window_x: z.number().int().min(1).max(60),
    extension_duration_y: z.number().int().min(1).max(60),
    trigger_type: z.enum(['BID_RECEIVED', 'ANY_RANK_CHANGE', 'L1_RANK_CHANGE'])
  })
}).refine(
  data => data.forced_close_time > data.bid_close_time,
  { message: 'Forced close time must be after bid close time', path: ['forced_close_time'] }
).refine(
  data => data.bid_close_time > data.bid_start_time,
  { message: 'Bid close time must be after bid start time', path: ['bid_close_time'] }
);
```

---

## 6. Frontend — UI/UX Design & Code Structure

### Frontend Code Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── AuctionListPage.jsx          ← All RFQs listing
│   │   ├── AuctionDetailPage.jsx        ← Live auction view
│   │   ├── CreateRfqPage.jsx            ← RFQ creation form
│   │   └── BidSubmitPage.jsx            ← Supplier bid form
│   ├── components/
│   │   ├── auction/
│   │   │   ├── CountdownTimer.jsx       ← Live countdown
│   │   │   ├── BidTable.jsx             ← Ranked bids table
│   │   │   ├── ActivityLog.jsx          ← Extension + bid events
│   │   │   ├── AuctionStatusBadge.jsx   ← Active/Closed/Force Closed
│   │   │   └── ForcedCloseBar.jsx       ← Progress to forced close
│   │   ├── forms/
│   │   │   ├── RfqCreateForm.jsx
│   │   │   ├── BritishAuctionConfig.jsx ← X, Y, trigger type config
│   │   │   └── BidSubmitForm.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── Modal.jsx
│   │       └── Toast.jsx
│   ├── hooks/
│   │   ├── useAuctionSocket.js          ← WebSocket connection
│   │   ├── useCountdown.js              ← Live timer logic
│   │   └── useAuctionData.js            ← React Query fetching
│   ├── store/
│   │   └── auctionStore.js              ← Zustand global state
│   ├── lib/
│   │   ├── api.js                       ← Axios instance
│   │   └── socket.js                    ← Socket.IO client
│   └── main.jsx
```

---

## 7. British Auction Business Logic

### Trigger Window Evaluation Flow

```
Every 30 seconds (cron job):
  For each ACTIVE auction:
    1. Get current time → Is it inside the trigger window?
       Trigger Window = [bid_close_time - X minutes, bid_close_time]
    
    2. If YES → Check trigger type:
       a. BID_RECEIVED      → Any bid in window? → Extend
       b. ANY_RANK_CHANGE   → Any bid that changed rankings? → Extend
       c. L1_RANK_CHANGE    → Did the #1 bidder change? → Extend
    
    3. If extending:
       new_close = bid_close_time + Y minutes
       if new_close > forced_close_time:
         new_close = forced_close_time  ← HARD CAP
       
       Update bid_close_time = new_close
       Emit WebSocket: auction:time-extended
       Log to auction_events
```

### Auction Status Transitions

```
DRAFT → ACTIVE  (at bid_start_time, or manual trigger)
ACTIVE → CLOSED       (when bid_close_time passes normally)
ACTIVE → FORCE_CLOSED (when forced_close_time is reached)
```

---

## 8. Validation Rules Implementation

### Rule 1: Forced Close Time > Bid Close Time
```javascript
// Frontend: React Hook Form + Zod
forced_close_time: z.coerce.date().refine(
  (val) => val > getValues('bid_close_time'),
  'Forced close time must be after bid close time'
)
```

### Rule 2: Extensions Never Exceed Forced Close Time
```javascript
// Backend: auctionExtension.engine.js
const cappedCloseTime = Math.min(
  newCloseTime.getTime(),
  rfq.forced_close_time.getTime()
);
```

### Rule 3: Bids Only Accepted While Auction Is Active
```javascript
if (new Date() > rfq.bid_close_time || rfq.status !== 'ACTIVE') {
  throw new ApiError(400, 'Bidding window has closed');
}
```

---

## 9. Real-Time Features (WebSockets)

### Socket Events

| Event | Direction | Payload |
|---|---|---|
| `join:auction` | Client → Server | `{ rfqId }` |
| `bid:new` | Server → Client | `{ bid, ranks, l1Changed }` |
| `auction:time-extended` | Server → Client | `{ rfqId, newCloseTime, reason, extensionMinutes }` |
| `auction:closed` | Server → Client | `{ rfqId, finalStatus }` |
| `auction:force-closed` | Server → Client | `{ rfqId }` |

### Client-Side Socket Hook

```javascript
// hooks/useAuctionSocket.js
export function useAuctionSocket(rfqId) {
  const { updateBids, extendTime, setStatus } = useAuctionStore();

  useEffect(() => {
    socket.emit('join:auction', { rfqId });

    socket.on('bid:new', ({ bid, ranks }) => {
      updateBids(ranks);
      toast.success(`New bid: ₹${bid.total_charges}`);
    });

    socket.on('auction:time-extended', ({ newCloseTime, reason, extensionMinutes }) => {
      extendTime(newCloseTime);
      toast(`⏱ Auction extended by ${extensionMinutes} min — ${reason}`, {
        icon: '🔔', duration: 5000
      });
    });

    socket.on('auction:closed', ({ finalStatus }) => {
      setStatus(finalStatus);
    });

    return () => {
      socket.off('bid:new');
      socket.off('auction:time-extended');
      socket.off('auction:closed');
    };
  }, [rfqId]);
}
```

---

## 10. UI/UX Design System

### Design Language: "Industrial Command Center"
Clean, data-dense, professional — like a trading terminal meets logistics dashboard.

### Color Palette
```css
:root {
  --bg-primary:    #0F1117;    /* Deep navy-black background */
  --bg-card:       #1A1D2E;    /* Card/panel surface */
  --bg-elevated:   #252840;    /* Hover/elevated state */
  --accent-blue:   #4F8EF7;    /* Primary actions, links */
  --accent-green:  #22C55E;    /* L1 bid, success, active */
  --accent-amber:  #F59E0B;    /* Warnings, extending state */
  --accent-red:    #EF4444;    /* Force closed, errors */
  --text-primary:  #F1F5F9;    /* Main text */
  --text-muted:    #64748B;    /* Secondary text, labels */
  --border:        #2D3148;    /* Card borders */
}
```

### Typography
```css
/* Display / Headings: Syne (geometric, modern) */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&display=swap');

/* Body / Data: JetBrains Mono for numbers, IBM Plex Sans for text */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

h1, h2, h3  { font-family: 'Syne', sans-serif; }
body, p, label { font-family: 'IBM Plex Sans', sans-serif; }
.bid-amount, .timer, .rank { font-family: 'JetBrains Mono', monospace; }
```

### Component Design Principles
- **Bid Table**: Highlight L1 row with green glow. Use monospaced font for all numbers.
- **Countdown Timer**: Large, prominent, changes color: green → amber (last 10 min) → red (last 2 min)
- **Forced Close Bar**: A secondary progress bar always visible — shows how close to the hard cap
- **Extension Toast**: Non-blocking, bottom-right notification with extension reason
- **Activity Log**: Timeline-style, newest at top, with icons per event type
- **Status Badge**: Pill-shaped — green for ACTIVE, gray for CLOSED, red for FORCE_CLOSED

---

## 11. Page-by-Page UI Breakdown

### Page 1: Auction Listing Page (`/auctions`)

**Sections:**
- Header with "Create New RFQ" button
- Filter bar: status filter (Active / Closed / All), date range picker
- Data table with columns:
  - RFQ Name / Reference ID
  - Current Lowest Bid (L1 amount, highlighted green)
  - Current Bid Close Time (with live countdown for ACTIVE ones)
  - Forced Close Time
  - Auction Status badge
  - Actions: View Details

**UX Notes:**
- Active auctions appear at the top, sorted by soonest close
- Rows pulse subtly when a new bid comes in (WebSocket-triggered)
- Countdown timer counts down live in the table row

### Page 2: Auction Details Page (`/auctions/:id`)

**Layout: 3-column split**

**Left Panel — Bid Rankings (50% width)**
- Title: "Live Rankings"
- Table: Rank | Carrier | Freight | Origin | Destination | Total | Transit | Validity
- L1 row: green background + crown icon
- L2+ rows: normal styling with rank badge
- Each row shows the supplier's latest bid only

**Center Panel — Auction Status (30% width)**
- RFQ name and reference ID
- Large countdown timer
- Two time bars:
  1. "Closes in" → bid_close_time
  2. "Forced close in" → forced_close_time
- Auction config info: Trigger Window, Extension Duration, Trigger Type
- "Submit Bid" button (only visible to suppliers, only when ACTIVE)

**Right Panel — Activity Log (20% width)**
- Title: "Activity Feed"
- Timeline list, newest on top:
  - 🟢 Bid submitted — Supplier A — ₹45,000
  - 🔔 Auction extended +5 min (Reason: L1 Rank Change)
  - 🟢 Bid submitted — Supplier B — ₹43,000
  - 🔴 Auction Force Closed

### Page 3: Create RFQ Page (`/rfqs/new`)

**Form Sections:**

**Section 1 — RFQ Details**
```
RFQ Name           [__________________________]
Reference ID       [Auto-generated or manual  ]
Pickup/Service Date [Date Picker              ]
```

**Section 2 — Auction Timing**
```
Bid Start Date & Time    [Date + Time Picker]
Bid Close Date & Time    [Date + Time Picker]
Forced Close Date & Time [Date + Time Picker]
                         ⚠ Must be after Bid Close Time (inline validation)
```

**Section 3 — British Auction Configuration**
```
Trigger Window (X)    [  10  ] minutes
Extension Duration (Y) [  5  ] minutes
Extension Trigger Type:
  ○ Any New Bid Received
  ○ Any Supplier Rank Change
  ● L1 (Lowest Bidder) Change    ← radio button selection
```

**Helper text example shown dynamically:**
> With these settings: If any supplier changes the top rank in the last 10 minutes, the auction extends by 5 minutes (up to Forced Close Time).

### Page 4: Bid Submission Page / Modal (`/rfqs/:id/bid`)

**Form Fields:**
```
Carrier Name           [__________________________]
Freight Charges (₹)    [__________________________]
Origin Charges (₹)     [__________________________]
Destination Charges (₹)[__________________________]
                        ─────────────────────────
Total (auto-calculated) ₹ 48,000
Transit Time (days)    [__________________________]
Quote Validity         [Date Picker              ]
Notes (optional)       [Textarea                 ]
```

**UX Notes:**
- Total charges calculated live as user types
- Show current L1 bid for reference: "Current best bid: ₹43,000"
- Disable submit button and show warning if auction has closed

---

## 12. Folder Structure

```
british-auction-rfq/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   └── auctionExtension.engine.js   ← Key file
│   │   ├── jobs/
│   │   │   └── extensionChecker.job.js
│   │   ├── sockets/
│   │   │   └── auction.socket.js
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── index.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   │   ├── auction/
│   │   │   ├── forms/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── lib/
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 13. Setup & Running the Project

### Prerequisites
- Node.js v20+
- PostgreSQL 15+
- npm or pnpm

### 1. Clone and install

```bash
git clone <your-repo-url>
cd british-auction-rfq

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/rfq_db"
JWT_SECRET="your-secret-key"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

### 3. Set up database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed    # optional: seed sample data
```

### 4. Run development servers

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Backend runs at: `http://localhost:5000`  
Frontend runs at: `http://localhost:5173`

---

## 14. Deliverables Checklist

| # | Deliverable | Status |
|---|---|---|
| 1 | ✅ **HLD Architecture Diagram** | Section 3 — includes system diagram with all layers |
| 2 | ✅ **Database Schema Design** | Section 4 — rfqs, auction_configs, bids, auction_events, users |
| 3 | ✅ **Backend Code** | Section 5 — Express + Prisma + Socket.IO + Cron |
| 4 | ✅ **Frontend Code** | Section 6 + 11 — React + Zustand + Socket.IO client |
| 5 | ✅ **RFQ Creation with British Auction** | CreateRfqPage + auctionConfig |
| 6 | ✅ **Trigger Window (X)** | auctionExtension.engine.js |
| 7 | ✅ **Extension Duration (Y)** | auctionExtension.engine.js |
| 8 | ✅ **All 3 Trigger Types** | BID_RECEIVED, ANY_RANK_CHANGE, L1_RANK_CHANGE |
| 9 | ✅ **Forced Close Time hard cap** | Validation + engine logic |
| 10 | ✅ **Auction Listing Page** | Shows all required columns |
| 11 | ✅ **Auction Details Page** | Rankings, log, config, bid form |
| 12 | ✅ **Activity Log** | Bid submissions + extensions with reasons |
| 13 | ✅ **Supplier Rankings (L1, L2, L3)** | recalculateRanks() on every bid |
| 14 | ✅ **Validation Rules** | forced_close > bid_close, extensions capped |
| 15 | ✅ **Real-time updates** | WebSocket for bids, extensions, status |
| 16 | ✅ **Modern UI/UX Design System** | Section 10 — colors, typography, components |

---

> **Good luck!** Focus on getting the Auction Extension Engine correct — that's the most complex and impressive part of this assignment. Start with the backend logic and database, then build the frontend around real API data.

