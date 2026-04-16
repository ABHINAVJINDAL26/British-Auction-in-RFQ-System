# British Auction RFQ System - Complete Project Guide

> **Date**: April 16, 2026  
> **Status**: Production Ready  
> **Language**: Node.js + React  

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [What This Project Does](#2-what-this-project-does)
3. [Technology Stack (Detailed)](#3-technology-stack-detailed)
4. [Assignment Requirements](#4-assignment-requirements)
5. [High-Level Architecture](#5-high-level-architecture)
6. [Complete File Structure](#6-complete-file-structure)
7. [Database Schema](#7-database-schema)
8. [REST API Endpoints](#8-rest-api-endpoints)
9. [WebSocket Events](#9-websocket-events)
10. [Code Organization by Feature](#10-code-organization-by-feature)
11. [End-to-End Flow](#11-end-to-end-flow)
12. [Key Algorithms](#12-key-algorithms)

---

## 1. Project Overview

**Name**: British Auction RFQ System  
**Purpose**: A real-time procurement platform where Buyers create competitive auctions (RFQs) and Suppliers submit bids to win contracts. The platform implements British auction rules with automatic time extensions based on bidding activity.

**Core Concept**:
- **RFQ** = Request for Quotation (Buyer creates with shipping details + pricing requirements)
- **Auction** = Time-limited bidding period with auto-extension rules
- **Bid** = Supplier's quote with freight charges, origin charges, destination charges
- **Extension** = Automatic time addition when qualifying bids received near close time

---

## 2. What This Project Does

### 🎯 Main Functionalities

#### A. Authentication & Authorization
- User signup (Buyer or Supplier role)
- JWT-based login with 15s timeout
- Session-scoped auth (prevents multi-tab role conflicts)
- Fresh role lookup on every request (not trusted from JWT token)
- Auto-logout on stale token (401 response)

#### B. RFQ Creation & Management (Buyer Only)
- Create RFQ with shipping details and auction configuration
- Set time windows:
  - **Bid Start Time**: When auction opens for bidding
  - **Bid Close Time**: Initial close time (can extend)
  - **Forced Close Time**: Hard cap - auction never extends beyond this
  - **Pickup Date**: Freight service date
- Configure British Auction rules (trigger window X, extension duration Y, trigger type)
- View all RFQs with live bid status
- View RFQ details with rankings, activity log, all submitted bids

#### C. Bid Submission & Live Ranking (Supplier Only)
- Submit bid during active auction with:
  - Carrier name
  - Freight charges, Origin charges, Destination charges (breakdown)
  - Transit time
  - Quote validity
- System immediately:
  - Calculates total charges and rank
  - Logs bid event
  - Checks extension trigger
  - Broadcasts updated rankings to all connected suppliers

#### D. Automatic Extension Engine
- Monitors activity in trigger window (last X minutes before close)
- Three trigger types:
  - **BID_RECEIVED**: Any new bid in window → extend
  - **ANY_RANK_CHANGE**: Any rank change in window → extend
  - **L1_RANK_CHANGE**: Only if top bidder changes in window → extend
- Validates extension doesn't exceed forced close time
- Runs immediately on bid submit AND every 30 seconds via cron

#### E. Real-Time Updates
- WebSocket broadcasts for:
  - New bids with updated rankings
  - Time extensions with reason + old/new close times
  - Status transitions (DRAFT → ACTIVE, ACTIVE → CLOSED/FORCE_CLOSED)
  - RFQ lifecycle events
- Fallback polling every 10 seconds if socket disconnects

#### F. Lifecycle Automation (30-Second Cron)
- Auto-transition DRAFT → ACTIVE at Bid Start Time
- Auto-transition ACTIVE → CLOSED or FORCE_CLOSED at respective times
- Check and apply extensions for all active auctions
- Broadcast status changes to all clients

---

## 3. Technology Stack (Detailed)

### Backend

| Component | Tech | Purpose |
|-----------|------|---------|
| **Runtime** | Node.js (v16+) | JavaScript execution |
| **Framework** | Express.js v5.2.1 | HTTP server, routing, middleware |
| **Database** | PostgreSQL | Relational database |
| **ORM** | Prisma v6.19.2 | Type-safe database access |
| **Real-time** | Socket.IO v4.8.3 | WebSocket events & broadcasts |
| **Authentication** | JWT (jsonwebtoken v9.0.3) | Token-based auth |
| **Password** | bcryptjs v3.0.3 | Secure password hashing |
| **Scheduler** | node-cron v4.2.1 | Background job scheduling (30-sec interval) |
| **Validation** | Zod v4.3.6 | Schema validation |
| **CORS** | cors v2.8.6 | Cross-origin request handling |
| **Environment** | dotenv v17.3.1 | Environment variable management |

### Frontend

| Component | Tech | Purpose |
|-----------|------|---------|
| **Framework** | React 19.2.4 | UI library |
| **Bundler** | Vite v8.0.1 | Ultra-fast dev server & build |
| **Styling** | Tailwind CSS v4.2.2 | Utility-first CSS |
| **State** | Zustand v5.0.12 | Lightweight global state manager |
| **HTTP Client** | Axios v1.13.6 | API requests with interceptors |
| **Real-time** | Socket.IO Client v4.8.3 | WebSocket event listener |
| **Routing** | React Router v7.13.2 | SPA navigation |
| **UI Icons** | Lucide React v1.7.0 | Icon components |
| **Date Utils** | date-fns v4.1.0 | Date formatting & calculations |
| **Query** | TanStack Query v5.95.2 | Data fetching & caching (optional) |

### Development

- **Package Manager**: npm
- **Code Quality**: ESLint (linting)
- **Dev Tools**: Nodemon (auto-restart on changes)

### Infrastructure

- **Frontend Server**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:5000 (Express server)
- **Database**: PostgreSQL (local or cloud)
- **Authentication**: JWT tokens stored in sessionStorage

---

## 4. Assignment Requirements

*From the provided PDF: [Assignment] British Auction in RFQ System*

### What was required to build:

✅ **1. RFQ Creation with British Auction Configuration**
- Users can create RFQ with Buyer role
- Form includes: RFQ Name, Bid Start/Close/Forced Close times, Pickup Date
- Auction config: Trigger Window (X minutes), Extension Duration (Y minutes), Trigger Type

✅ **2. Bid Submission & Ranking**
- Suppliers submit bids with: Carrier Name, Freight/Origin/Destination Charges, Transit Time, Quote Validity
- System calculates total charges and auto-ranks (lowest price = L1)
- Only latest bid per supplier counts

✅ **3. Automatic Time Extension Logic**
- Monitor trigger window (last X minutes before Bid Close Time)
- Extend by Y minutes if trigger condition met
- Never extend beyond Forced Close Time
- Support three trigger types:
  - **a) BID_RECEIVED**: Any bid in window
  - **b) ANY_RANK_CHANGE**: Any rank movement in window
  - **c) L1_RANK_CHANGE**: Only top bidder change in window

✅ **4. Auction Listing Page**
- Show all RFQs with: Name/ID, Current L1 Bid, Bid Close Time, Forced Close Time, Status
- Update in real-time as bids arrive

✅ **5. Auction Details Page**
- Show: All bids (sorted by price), Ranking (L1, L2, L3...), Bid details
- Auction config display (X, Y, trigger type)
- Activity log: bid submissions, time extensions with reason
- Bid submission form (for suppliers)

✅ **6. Validation Rules**
- Forced Close Time > Bid Close Time
- Extensions never exceed Forced Close Time
- Bid submission only in active window
- Bid start/close times make logical sense

✅ **7. HLD Architecture Diagram**
- Provided: Hld_arc.png

✅ **8. Database Schema Design**
- Provided: Db_schema.pdf
- 5 core models: User, RFQ, AuctionConfig, Bid, AuctionEvent

✅ **9. Backend Code**
- Express API with routes, controllers, middleware

✅ **10. Frontend Code**
- React SPA with real-time updates via Socket.IO

---

## 5. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER (Frontend)                          │
│                     React + Zustand + Socket.IO                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ AuctionList  │  │AuctionDetail │  │ LoginPage    │         │
│  │   Page       │  │    Page      │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         ↑                  ↑                 ↑                  │
└────────┼──────────────────┼─────────────────┼─────────────────┘
         │ HTTP             │ WebSocket       │ HTTP
         │ (Axios)          │ (Socket.IO)     │ (Axios)
         ↓                  ↓                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER (Backend)                       │
│              ┌────────────────────────────────┐                │
│              │  auth.routes.js                │ Auth APIs      │
│              │  rfq.routes.js                 │ RFQ CRUD       │
│              │  bid.routes.js                 │ Bid Submission │
│              └────────────────────────────────┘                │
│                           ↓                                     │
│              ┌────────────────────────────────┐                │
│              │ auctionExtension.engine.js    │ Extension Logic│
│              └────────────────────────────────┘                │
│                           ↓                                     │
│              ┌────────────────────────────────┐                │
│              │ Socket.IO Server               │ Real-time      │
│              │ (Broadcast events)             │                │
│              └────────────────────────────────┘                │
│                           ↓                                     │
│              ┌────────────────────────────────┐                │
│              │ node-cron (30-second interval) │ Scheduler      │
│              └────────────────────────────────┘                │
└────────┬───────────────────────────────────────────────────────┘
         │ SQL
         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐ │
│  │   User     │ │    RFQ     │ │Auction     │ │   Bid       │ │
│  │            │ │            │ │Config      │ │             │ │
│  └────────────┘ └────────────┘ └────────────┘ └─────────────┘ │
│                                  ┌─────────────────────────┐   │
│                                  │   AuctionEvent          │   │
│                                  │   (Activity Log)        │   │
│                                  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Complete File Structure

### Backend Structure
```
backend/
├── src/
│   ├── index.js                         # ⭐ Server entry point
│   ├── config/
│   │   └── db.js                        # Prisma client setup
│   ├── routes/
│   │   ├── auth.routes.js               # ⭐ Auth endpoints (signup, login)
│   │   ├── rfq.routes.js                # ⭐ RFQ CRUD endpoints
│   │   └── bid.routes.js                # ⭐ Bid submission + ranking engine
│   ├── middlewares/
│   │   └── auth.middleware.js           # ⭐ JWT verify + role check
│   ├── services/
│   │   └── auctionExtension.engine.js   # ⭐ Extension trigger logic
│   ├── controllers/                     # (Optional)
│   ├── jobs/                            # (Optional)
│   ├── sockets/                         # (Optional)
│   └── validators/                      # (Optional)
├── prisma/
│   ├── schema.prisma                    # ⭐ Database schema definition
│   └── migrations/                      # Database migration history
├── package.json                         # Dependencies
├── .env                                 # Environment variables
└── seed.js                              # Database seeding

Frontend Structure
```
frontend/
├── src/
│   ├── main.jsx                         # React entry point
│   ├── App.jsx                          # Root component
│   ├── index.css                        # Tailwind theme setup
│   ├── App.css                          # Legacy styles
│   ├── pages/
│   │   ├── LoginPage.jsx                # ⭐ Buyer/Supplier login
│   │   ├── SignupPage.jsx               # ⭐ User registration
│   │   ├── AuctionListPage.jsx          # ⭐ All RFQs + live updates
│   │   ├── AuctionDetailPage.jsx        # ⭐ RFQ detail + bid form
│   │   └── ProfilePage.jsx              # ⭐ User account
│   ├── components/
│   │   └── auction/
│   │       └── CountdownTimer.jsx       # Live countdown display
│   ├── hooks/
│   │   └── useAuctionSocket.js          # ⭐ Socket.IO event handler
│   ├── lib/
│   │   ├── api.js                       # ⭐ Axios setup (15s timeout)
│   │   └── socket.js                    # ⭐ Socket.IO client setup
│   ├── store/
│   │   └── auctionStore.js              # ⭐ Zustand global state
│   └── assets/                          # Images, icons
├── public/                              # Static files
├── package.json                         # Dependencies
├── vite.config.js                       # Vite configuration
├── tailwind.config.js                   # Tailwind theme config
├── eslint.config.js                     # Linting rules
└── index.html                           # HTML template
```

### Root Files
```
PROJECT_ROOT/
├── README.md                            # High-level overview
├── DEBUGGING_GUIDE.md                   # Bug fixes history
├── DEPLOYMENT_GUIDE.md                  # Deployment instructions
├── TESTING_GUIDE.md                     # Testing procedures
├── Hld_arc.png                          # Architecture diagram
├── Db_schema.pdf                        # Database schema visual
├── backend/                             # Backend folder
├── frontend/                            # Frontend folder
└── PROJECT_COMPLETE_GUIDE.md            # This file ⭐
```

---

## 7. Database Schema

### Model: User
```javascript
model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         String    // "BUYER" | "SUPPLIER"
  company      String?
  carrierName  String?   // For suppliers
  
  // Relations
  createdRfqs  RFQ[]     @relation("buyerRfqs")
  bids         Bid[]
  events       AuctionEvent[]
}
```
**Used by**: Authentication, Authorization, Bid tracking, Event logging

---

### Model: RFQ (Request for Quotation)
```javascript
model RFQ {
  id                String    @id @default(cuid())
  referenceId       String    @unique  // Human-readable ID
  name              String
  buyerId           String    @relation("buyerRfqs")
  buyer             User      @relation("buyerRfqs", fields: [buyerId])
  
  // Time windows
  pickupDate        DateTime
  bidStartTime      DateTime
  bidCloseTime      DateTime  // Can extend
  originalCloseTime DateTime  // Original close (for reference)
  forcedCloseTime   DateTime  // Hard cap
  
  // Status
  status            String    // "DRAFT" | "ACTIVE" | "CLOSED" | "FORCE_CLOSED"
  
  // Relations
  auctionConfig     AuctionConfig?
  bids              Bid[]
  events            AuctionEvent[]
}
```
**Used by**: Listing auctions, Creating auctions, Calculating windows, Status transitions

---

### Model: AuctionConfig
```javascript
model AuctionConfig {
  id                String  @id @default(cuid())
  rfqId             String  @unique
  rfq               RFQ     @relation(fields: [rfqId])
  
  triggerWindowX    Int     // Minutes (e.g., 10)
  extensionDurationY Int    // Minutes (e.g., 5)
  triggerType       String  // "BID_RECEIVED" | "ANY_RANK_CHANGE" | "L1_RANK_CHANGE"
}
```
**Used by**: Extension engine to determine trigger conditions

---

### Model: Bid
```javascript
model Bid {
  id                   String    @id @default(cuid())
  rfqId                String
  rfq                  RFQ       @relation(fields: [rfqId])
  
  supplierId           String
  supplier             User      @relation(fields: [supplierId])
  
  carrierName          String
  freightCharges       Float
  originCharges        Float
  destinationCharges   Float
  totalCharges         Float    // freight + origin + destination
  
  transitTime          Int       // Days
  quoteValidity        Int       // Days
  
  rank                 Int       // Auto-calculated (1 = lowest price)
  submittedAt          DateTime
  isLatest             Boolean   // Only latest bid per supplier counts
  notes                String?
}
```
**Used by**: Bid submission, Ranking calculation, Live updates

---

### Model: AuctionEvent
```javascript
model AuctionEvent {
  id           String    @id @default(cuid())
  rfqId        String
  rfq          RFQ       @relation(fields: [rfqId])
  
  eventType    String    // "BID_SUBMITTED" | "TIME_EXTENDED" | "STATUS_CHANGED"
  actorId      String?
  actor        User?     @relation(fields: [actorId])
  
  description  String
  oldCloseTime DateTime?
  newCloseTime DateTime?
  triggeredBy  String?   // "BID_RECEIVED" | "ANY_RANK_CHANGE" | "L1_RANK_CHANGE"
  
  createdAt    DateTime  @default(now())
}
```
**Used by**: Activity log, Extension history, Event tracking

---

## 8. REST API Endpoints

### Authentication Routes (`auth.routes.js`)

#### POST `/api/auth/signup`
**Purpose**: Register new user (Buyer or Supplier)
**Request Body**:
```json
{
  "name": "John Supplier",
  "email": "john@supplier.com",
  "password": "secure123",
  "role": "SUPPLIER",
  "company": "Transport Co",
  "carrierName": "TCI Express"
}
```
**Response**:
```json
{
  "user": {
    "id": "user123",
    "name": "John Supplier",
    "email": "john@supplier.com",
    "role": "SUPPLIER",
    "company": "Transport Co"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
**Status**: 201 Created  
**Auth Required**: No

#### POST `/api/auth/login`
**Purpose**: Login user and get JWT token
**Request Body**:
```json
{
  "email": "john@supplier.com",
  "password": "secure123"
}
```
**Response**:
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
**Status**: 200 OK  
**Auth Required**: No  
**Timeout**: 15 seconds (frontend api.js)

---

### RFQ Routes (`rfq.routes.js`)

#### GET `/api/rfqs`
**Purpose**: List all RFQs with live bid status
**Query Params**: 
- `status` (optional): "DRAFT", "ACTIVE", "CLOSED", "FORCE_CLOSED"
**Response**:
```json
{
  "rfqs": [
    {
      "id": "rfq123",
      "referenceId": "RFQ-001",
      "name": "Delhi to Mumbai Shipment",
      "status": "ACTIVE",
      "bidStartTime": "2026-04-16T10:00:00Z",
      "bidCloseTime": "2026-04-16T11:00:00Z",
      "forcedCloseTime": "2026-04-16T12:00:00Z",
      "pickupDate": "2026-04-17T00:00:00Z",
      "l1Bid": {
        "supplierId": "supplier123",
        "totalCharges": 5000,
        "supplierName": "TCI Express"
      },
      "bidCount": 3
    }
  ]
}
```
**Status**: 200 OK  
**Auth Required**: Yes (any role)

#### GET `/api/rfqs/:id`
**Purpose**: Get RFQ detail with all bids and activity log
**Response**:
```json
{
  "rfq": {
    "id": "rfq123",
    "referenceId": "RFQ-001",
    "name": "Delhi to Mumbai Shipment",
    "status": "ACTIVE",
    "bidStartTime": "2026-04-16T10:00:00Z",
    "bidCloseTime": "2026-04-16T11:00:00Z",
    "originalCloseTime": "2026-04-16T11:00:00Z",
    "forcedCloseTime": "2026-04-16T12:00:00Z",
    "buyerId": "buyer123"
  },
  "auctionConfig": {
    "triggerWindowX": 10,
    "extensionDurationY": 5,
    "triggerType": "ANY_RANK_CHANGE"
  },
  "bids": [
    {
      "id": "bid1",
      "supplierId": "supplier1",
      "supplierName": "TCI Express",
      "carrierName": "TCI",
      "freightCharges": 4500,
      "originCharges": 300,
      "destinationCharges": 200,
      "totalCharges": 5000,
      "rank": 1,
      "transitTime": 2,
      "quoteValidity": 7
    }
  ],
  "events": [
    {
      "eventType": "BID_SUBMITTED",
      "description": "New bid from TCI Express",
      "actorName": "John Supplier",
      "createdAt": "2026-04-16T10:15:00Z"
    },
    {
      "eventType": "TIME_EXTENDED",
      "description": "Extended by ANY_RANK_CHANGE trigger",
      "oldCloseTime": "2026-04-16T11:00:00Z",
      "newCloseTime": "2026-04-16T11:05:00Z",
      "triggeredBy": "ANY_RANK_CHANGE"
    }
  ]
}
```
**Status**: 200 OK  
**Auth Required**: Yes

#### POST `/api/rfqs`
**Purpose**: Create new RFQ with auction config (Buyer only)
**Request Body**:
```json
{
  "name": "Delhi to Mumbai Shipment",
  "pickupDate": "2026-04-17",
  "bidStartTime": "2026-04-16T10:00:00",
  "bidCloseTime": "2026-04-16T11:00:00",
  "forcedCloseTime": "2026-04-16T12:00:00",
  "auctionConfig": {
    "triggerWindowX": 10,
    "extensionDurationY": 5,
    "triggerType": "ANY_RANK_CHANGE"
  }
}
```
**Response**:
```json
{
  "rfq": { ... },
  "auctionConfig": { ... }
}
```
**Validations**:
- `forcedCloseTime > bidCloseTime` (hard cap must be after soft close)
- `bidCloseTime > bidStartTime` (logical ordering)
- `bidStartTime > pickupDate - 24h` (bid must close before pickup)
- `triggerWindowX >= 1` (at least 1 minute)
- `extensionDurationY >= 1` (at least 1 minute)

**Status**: 201 Created  
**Auth Required**: Yes (BUYER only)

---

### Bid Routes (`bid.routes.js`)

#### POST `/api/rfqs/:rfqId/bids`
**Purpose**: Submit bid and trigger extension check
**Request Body**:
```json
{
  "carrierName": "TCI Express",
  "freightCharges": 4500,
  "originCharges": 300,
  "destinationCharges": 200,
  "transitTime": 2,
  "quoteValidity": 7,
  "notes": "Delivery on time guaranteed"
}
```
**Response**:
```json
{
  "bid": {
    "id": "bid1",
    "supplierId": "supplier1",
    "carrierName": "TCI Express",
    "totalCharges": 5000,
    "rank": 1,
    "submittedAt": "2026-04-16T10:15:00Z"
  },
  "extension": {
    "extended": true,
    "oldCloseTime": "2026-04-16T11:00:00Z",
    "newCloseTime": "2026-04-16T11:05:00Z",
    "reason": "ANY_RANK_CHANGE - Rank shifted from 2 to 1",
    "extensionMinutes": 5
  },
  "newRankings": [
    { "supplierId": "supplier1", "rank": 1, "totalCharges": 5000 },
    { "supplierId": "supplier2", "rank": 2, "totalCharges": 5500 }
  ]
}
```
**Processing Pipeline**:
1. ✅ Validate user is SUPPLIER
2. ✅ Validate auction is ACTIVE
3. ✅ Validate current time within bid window (bidStartTime < now < bidCloseTime)
4. ✅ Deactivate supplier's previous bid (set isLatest=false)
5. ✅ Create new bid
6. ✅ Recalculate all ranks by totalCharges ascending
7. ✅ Detect rank changes (log with triggeredBy tag)
8. ✅ Call checkAndExtendAuction() service
9. ✅ Emit `bid:new` socket event with newRankings
10. ✅ Return result with extension details

**Status**: 201 Created  
**Auth Required**: Yes (SUPPLIER only)

#### GET `/api/rfqs/:rfqId/bids`
**Purpose**: Get bids for RFQ (role-aware)
- **Buyer**: Sees one bid per supplier (latest, ranked)
- **Supplier**: Sees own latest bid only
**Response**:
```json
{
  "bids": [
    {
      "id": "bid1",
      "supplierId": "supplier1",
      "supplierName": "TCI Express",
      "totalCharges": 5000,
      "rank": 1,
      "submittedAt": "2026-04-16T10:15:00Z"
    }
  ]
}
```
**Status**: 200 OK  
**Auth Required**: Yes

---

## 9. WebSocket Events

### Client → Server Events

#### `join:auction`
**Purpose**: Subscribe to RFQ auction updates
**Payload**:
```javascript
{ rfqId: "rfq123" }
```
**Effect**: Client joins Socket.IO room `auction:rfq123`
**Sent From**: `useAuctionSocket.js` on component mount
**Example**:
```javascript
socket.emit('join:auction', { rfqId: id });
```

---

### Server → Client Events

#### `bid:new`
**Purpose**: Broadcast new bid and updated rankings
**Payload**:
```javascript
{
  bid: {
    id: "bid1",
    supplierId: "supplier1",
    supplierName: "TCI Express",
    totalCharges: 5000,
    rank: 1,
    submittedAt: "2026-04-16T10:15:00Z"
  },
  newRankings: [
    { supplierId: "supplier1", rank: 1, totalCharges: 5000 },
    { supplierId: "supplier2", rank: 2, totalCharges: 5500 }
  ]
}
```
**Sent By**: `bid.routes.js` after bid submission
**Listened By**: `useAuctionSocket.js`
**Effect**: Update auctionStore.addBid() and log event

---

#### `auction:time-extended`
**Purpose**: Broadcast time extension
**Payload**:
```javascript
{
  oldCloseTime: "2026-04-16T11:00:00Z",
  newCloseTime: "2026-04-16T11:05:00Z",
  reason: "ANY_RANK_CHANGE - Rank shifted from 2 to 1",
  extensionMinutes: 5,
  triggeredBy: "ANY_RANK_CHANGE"
}
```
**Sent By**: `auctionExtension.engine.js` → `bid.routes.js` or cron in `index.js`
**Listened By**: `useAuctionSocket.js`
**Effect**: Update auctionStore.extendTime() and log event

---

#### `auction:status-changed`
**Purpose**: Broadcast auction status transition
**Payload**:
```javascript
{
  rfqId: "rfq123",
  oldStatus: "DRAFT",
  newStatus: "ACTIVE",
  description: "Auction started"
}
```
**Sent By**: Cron scheduler in `index.js`
**Listened By**: `useAuctionSocket.js`
**Effect**: Update auctionStore.setStatus() and log event

---

#### `rfq:created`
**Purpose**: Broadcast new RFQ creation to all buyers
**Payload**:
```javascript
{
  rfq: { ... },
  auctionConfig: { ... }
}
```
**Sent By**: `rfq.routes.js` → POST /api/rfqs
**Listened By**: `AuctionListPage.jsx`
**Effect**: Trigger RFQ list refresh

---

#### `rfq:status-changed`
**Purpose**: Broadcast RFQ status change globally
**Payload**:
```javascript
{
  rfqId: "rfq123",
  newStatus: "CLOSED"
}
```
**Sent By**: Cron scheduler in `index.js`
**Listened By**: `AuctionListPage.jsx`
**Effect**: Trigger RFQ list refresh

---

## 10. Code Organization by Feature

### Feature 1: Authentication

**Files Involved**:
```
Frontend:
  - src/pages/LoginPage.jsx          Login form + error handling
  - src/pages/SignupPage.jsx         Registration form
  - src/lib/api.js                   Axios with 15s timeout + 401 handler
  - src/store/auctionStore.js        setAuth() + logout()

Backend:
  - src/routes/auth.routes.js        POST /signup, POST /login
  - src/middlewares/auth.middleware.js JWT verify + fresh role lookup
```

**Flow**:
1. User fills SignupPage.jsx form
2. Frontend POST to `/api/auth/signup` (api.js Axios)
3. Backend auth.routes.js hashPassword (bcryptjs) + create User
4. Return token + user data
5. Frontend stores in sessionStorage via auctionStore.setAuth()
6. api.js interceptor injects Authorization header in all requests

---

### Feature 2: RFQ Creation & Listing

**Files Involved**:
```
Frontend:
  - src/pages/AuctionListPage.jsx    Table/card view + CreateRfqModal
  - src/store/auctionStore.js        setCurrentRfq(), updateRfqs()
  - src/hooks/useAuctionSocket.js    Listens rfq:created

Backend:
  - src/routes/rfq.routes.js         POST /api/rfqs, GET /api/rfqs
  - src/middlewares/auth.middleware.js Role check (BUYER only)
```

**Flow**:
1. Buyer clicks "Create RFQ" → CreateRfqModal opens
2. Form validates: time ordering, positive extension values
3. POST to `/api/rfqs` with auctionConfig nested
4. Backend rfq.routes.js creates RFQ + AuctionConfig + logs event
5. Emits `rfq:created` socket event
6. All connected clients receive event → refresh list via GET `/api/rfqs`

---

### Feature 3: Bid Submission & Ranking

**Files Involved**:
```
Frontend:
  - src/pages/AuctionDetailPage.jsx  BidSubmitModal
  - src/store/auctionStore.js        addBid(), updateBids()
  - src/hooks/useAuctionSocket.js    Listens bid:new

Backend:
  - src/routes/bid.routes.js         POST /api/rfqs/:id/bids - MAIN LOGIC
  - src/services/auctionExtension.engine.js Called after bid
  - src/middlewares/auth.middleware.js Role check (SUPPLIER only)
```

**Bid Submission Pipeline (bid.routes.js POST handler)**:
```
1. VALIDATE
   ├─ User is SUPPLIER
   ├─ RFQ is ACTIVE
   └─ now > bidStartTime AND now < bidCloseTime

2. TRANSACTION BEGIN
   ├─ Fetch current RFQ state
   ├─ Fetch all previous bids (snapshot)
   ├─ Mark supplier's old bid as isLatest=false
   ├─ Create new bid with totalCharges
   ├─ Fetch new bids (recalculate ranks)
   ├─ Compare old vs new rankings
   ├─ Detect if rank changed: did supplier's rank shift?
   ├─ Detect if L1 changed: did #1 ranked supplier change?
   ├─ If ANY rank changed → triggeredBy = "ANY_RANK_CHANGE"
   ├─ If L1 changed → triggeredBy = "L1_RANK_CHANGE"
   └─ TRANSACTION END

3. CALL EXTENSION ENGINE
   └─ checkAndExtendAuction(rfqId, triggeredBy)

4. BROADCAST
   ├─ Socket emit `bid:new` with newRankings
   └─ Return 201 with extension details

5. Database Logging
   └─ AuctionEvent records creation + triggeredBy tag
```

---

### Feature 4: Automatic Extension Engine

**Files Involved**:
```
Backend:
  - src/services/auctionExtension.engine.js - CORE LOGIC
  - src/routes/bid.routes.js                - Immediate check after bid
  - src/index.js (cron)                     - 30-sec fallback check
```

**auctionExtension.engine.js - checkAndExtendAuction(rfqId, triggeredBy)**:
```javascript
function checkAndExtendAuction(rfqId, triggeredBy) {
  1. LOAD STATE
     ├─ Fetch RFQ + config
     ├─ Calculate window = bidCloseTime - X minutes
     ├─ Check if now IN window: (now >= window AND now < bidCloseTime)
     └─ If not in window → return { extended: false }

  2. CHECK STALE EVENT GUARD
     ├─ Fetch lastExtensionEvent for this RFQ
     ├─ Get triggeredBy from last event
     └─ If (now - lastEvent.createdAt) < 30 sec (same triggering activity)
        → return { extended: false, reason: "Already extended" }

  3. MATCH TRIGGER TYPE
     ├─ TRIGGER: "BID_RECEIVED"
     │  └─ Always extend if in window
     │
     ├─ TRIGGER: "ANY_RANK_CHANGE"
     │  └─ Check: triggeredBy has ANY ranking movement?
     │     └─ "ANY_RANK_CHANGE" OR "L1_RANK_CHANGE"
     │        → Extend
     │
     └─ TRIGGER: "L1_RANK_CHANGE"
        └─ Check: triggeredBy == "L1_RANK_CHANGE"
           → Only extend if TOP bidder changed

  4. EXTEND OR REJECT
     ├─ If condition met:
     │  ├─ newCloseTime = bidCloseTime + Y minutes
     │  ├─ Cap check: if newCloseTime > forcedCloseTime
     │  │  └─ newCloseTime = forcedCloseTime
     │  ├─ Update RFQ.bidCloseTime = newCloseTime
     │  ├─ Log TIME_EXTENDED event with triggeredBy
     │  └─ Return { extended: true, oldCloseTime, newCloseTime }
     │
     └─ Else: return { extended: false, reason: "Trigger not met" }

  5. BROADCAST
     └─ Socket emit `auction:time-extended`
}
```

**Why Double-Check (Immediate + Cron)?**:
1. **Immediate Check** (bid.routes.js): Instant user feedback on bid submit
2. **Cron Fallback** (index.js every 30s): Catches socket disconnections + missed events

---

### Feature 5: Real-Time Updates & Socket Connected

**Files Involved**:
```
Frontend:
  - src/hooks/useAuctionSocket.js       Event listeners + reconnect handler
  - src/pages/AuctionDetailPage.jsx    Fallback polling every 10s
  - src/lib/socket.js                  Socket.IO client config

Backend:
  - src/index.js                        Socket.IO setup + event broadcasts
```

**useAuctionSocket.js Flow**:
```javascript
useEffect(() => {
  if (!id) return;
  
  // Force connect if needed
  if (!socket.connected) {
    socket.connect();
  }
  
  // Join auction room
  socket.emit('join:auction', { rfqId: id });
  
  // Listeners
  socket.on('connect', () => {
    // Reconnected: rejoin room
    socket.emit('join:auction', { rfqId: id });
  });
  
  socket.on('bid:new', (data) => {
    if (data.newRankings) {
      // Full sync: replace all bids
      store.updateBids(data.newRankings);
    } else {
      // Single bid update
      store.addBid(data.bid);
    }
    store.logEvent(data.bid, 'BID_SUBMITTED');
  });
  
  socket.on('auction:time-extended', (data) => {
    store.extendTime(data.newCloseTime);
    store.logEvent(data, 'TIME_EXTENDED');
  });
  
  socket.on('auction:status-changed', (data) => {
    store.setStatus(data.newStatus);
    store.logEvent(data, 'STATUS_CHANGED');
  });
  
  // Cleanup
  return () => {
    socket.off('connect');
    socket.off('bid:new');
    socket.off('auction:time-extended');
    socket.off('auction:status-changed');
  };
}, [id]);

// Fallback polling every 10s
useEffect(() => {
  const interval = setInterval(() => {
    api.get(`/rfqs/${id}`).then(sync state);
  }, 10000);
  return () => clearInterval(interval);
}, [id]);
```

---

### Feature 6: Status Transitions & Lifecycle

**Files Involved**:
```
Backend:
  - src/index.js (cron every 30 seconds)
```

**Cron Flow (index.js)**:
```javascript
cron.schedule('*/30 * * * * *', async () => {
  // EVERY 30 SECONDS:
  
  1. TRANSITION DRAFT → ACTIVE
     ├─ Fetch all RFQs with status='DRAFT'
     ├─ For each where now >= bidStartTime:
     │  ├─ Update status → 'ACTIVE'
     │  ├─ Log STATUS_CHANGED event
     │  └─ Emit `rfq:status-changed` socket
     
  2. CHECK EXTENSIONS
     ├─ Fetch all RFQs with status='ACTIVE'
     ├─ For each:
     │  ├─ Call checkAndExtendAuction()
     │  └─ Re-fetch fresh RFQ.bidCloseTime
     │     (Critical: extension may have updated close time)
     
  3. TRANSITION ACTIVE → CLOSED/FORCE_CLOSED
     ├─ Fetch all RFQs with status='ACTIVE'
     ├─ For each where now >= bidCloseTime:
     │  ├─ If now >= forcedCloseTime:
     │  │  └─ Update status → 'FORCE_CLOSED'
     │  ├─ Else:
     │  │  └─ Update status → 'CLOSED'
     │  ├─ Log STATUS_CHANGED event
     │  └─ Emit `rfq:status-changed` socket
});
```

---

## 11. End-to-End Flow

### Scenario: Buyer Creates Auction → Suppliers Bid → Auto-Extension

**Step 1: Buyer Login** (15s timeout)
```
1. Browser: LoginPage.jsx
2. User enters email + password
3. Frontend: POST to /api/auth/login (api.js Axios, 15s timeout)
4. Backend: auth.routes.js
   ├─ Verify email exists
   ├─ Compare password hash (bcryptjs)
   └─ Return JWT token
5. Frontend: sessionStorage.setItem('token', jwt)
6. Zustand: setAuth(user, token)
```

**Step 2: Buyer Creates RFQ with Auction Config**
```
1. Browser: AuctionListPage.jsx
2. Buyer clicks "Create RFQ" → CreateRfqModal opens
3. Form fields:
   ├─ Name: "Delhi to Mumbai Shipment"
   ├─ Pickup Date: 2026-04-17
   ├─ Bid Start: 2026-04-16 10:00 AM
   ├─ Bid Close: 2026-04-16 11:00 AM
   ├─ Forced Close: 2026-04-16 12:00 PM
   ├─ Trigger Window: 10 minutes
   ├─ Extension Duration: 5 minutes
   └─ Trigger Type: ANY_RANK_CHANGE
4. Frontend: Validate time ordering + positive values
5. Frontend: POST to /api/rfqs
6. Backend: rfq.routes.js
   ├─ Validate all constraints
   ├─ Create RFQ record (status=DRAFT or ACTIVE based on time)
   ├─ Create AuctionConfig record
   └─ Emit `rfq:created` socket event
7. All browsers: Receive socket event → refresh RFQ list
8. DB: RFQ + AuctionConfig created
```

**Step 3: Cron Transition DRAFT → ACTIVE** (at 10:00 AM)
```
1. Cron runs every 30 seconds
2. Finds RFQ with status='DRAFT' where bidStartTime <= now
3. Update status → 'ACTIVE'
4. Emit `rfq:status-changed` socket event (rfqId, newStatus='ACTIVE')
5. CountdownTimer shows "CLOSES IN 1:00:00"
```

**Step 4: Supplier 1 Submits Bid** (at 10:15 AM)
```
1. Browser: AuctionDetailPage.jsx (Supplier 1)
2. Supplier 1 fills BidSubmitModal:
   ├─ Carrier: "TCI Express"
   ├─ Freight: 4500
   ├─ Origin: 300
   ├─ Destination: 200
   └─ Total: 5000
3. Frontend: POST to /api/rfqs/{rfqId}/bids
4. Backend: bid.routes.js (TRANSACTION):
   ├─ VALIDATE
   │  ├─ User is SUPPLIER ✓
   │  ├─ Status is ACTIVE ✓
   │  └─ now (10:15) IN [10:00, 11:00] ✓
   ├─ DEACTIVATE OLD BID
   │  └─ Set supplier's old bid isLatest=false
   ├─ CREATE NEW BID
   │  ├─ supplierId: supplier1
   │  ├─ totalCharges: 5000
   │  ├─ rank: 1 (only bidder so far)
   │  └─ isLatest: true
   ├─ LOG EVENT
   │  └─ BID_SUBMITTED event
   └─ No rank change yet (triggeredBy: null)
5. Call: checkAndExtendAuction(rfqId, triggeredBy=null)
   └─ No trigger met (triggeredBy is null) → not extended
6. Emit: `bid:new` socket with rankings
7. Response: 201 with bid + extension result (extended: false)
8. Browser: Update rankings table, log activity
```

**Step 5: Supplier 2 Submits Bid** (at 10:50 AM - in trigger window)
```
Trigger window: [11:00 - 10 mins] = 10:50 to 11:00

1. Supplier 2 submits bid at 10:50 AM
2. totalCharges: 4800 (lower than supplier 1's 5000)
3. Backend: bid.routes.js (TRANSACTION):
   ├─ Create bid for supplier 2 with totalCharges=4800
   ├─ COMPARE RANKINGS:
   │  Old: Supplier1 (rank 1, 5000)
   │  New: Supplier2 (rank 1, 4800), Supplier1 (rank 2, 5000)
   │      ↑ Rank shifted!
   ├─ LOG EVENT with triggeredBy: "ANY_RANK_CHANGE"
   └─ (Also detected L1_RANK_CHANGE = true)
4. Call: checkAndExtendAuction(rfqId, triggeredBy="ANY_RANK_CHANGE")
   ├─ Load RFQ: bidCloseTime=11:00
   ├─ Window: 11:00 - 10 = 10:50
   ├─ Check: now (10:50) in [10:50, 11:00]? YES ✓
   ├─ Check stale guard: no previous extension → OK ✓
   ├─ Check trigger: triggerType="ANY_RANK_CHANGE" 
   │                  triggeredBy="ANY_RANK_CHANGE"? YES ✓
   ├─ EXTEND:
   │  ├─ newCloseTime = 11:00 + 5 mins = 11:05
   │  ├─ Cap check: 11:05 <= 12:00 (forcedClose)? YES ✓
   │  ├─ Update RFQ.bidCloseTime = 11:05
   │  ├─ Log TIME_EXTENDED event (oldClose=11:00, newClose=11:05)
   │  └─ Return { extended: true, oldCloseTime, newCloseTime }
5. Emit: `auction:time-extended` socket
6. Emit: `bid:new` socket with newRankings
7. Browser (Supplier 1): 
   ├─ CountdownTimer updates: "CLOSES IN 15:00" (from 10 mins)
   ├─ Rankings table updated: now rank 2
   └─ Activity feed: "TIME_EXTENDED: ANY_RANK_CHANGE - Rank shifted from 1 to 2"
```

**Step 6: Supplier 1 Counter-Bids** (at 10:58 AM - 2 mins before new close)
```
New trigger window: [11:05 - 10 mins] = 10:55 to 11:05

1. Supplier 1 submits: 4700 (undercuts supplier 2)
2. Ranks: Supplier1 (rank 1, 4700), Supplier2 (rank 2, 4800)
3. L1 changed: YES (was supplier 2, now supplier 1)
4. Call: checkAndExtendAuction(..., triggeredBy="L1_RANK_CHANGE")
   ├─ Check: now (10:58) in [10:55, 11:05]? YES ✓
   ├─ Check: triggerType="ANY_RANK_CHANGE", triggeredBy="L1_RANK_CHANGE"?
   │  → Config says ANY_RANK_CHANGE, bidirectional includes L1 ✓
   ├─ EXTEND:
   │  ├─ newCloseTime = 11:05 + 5 = 11:10
   │  └─ Update + log
5. Emit `auction:time-extended` socket
6. All suppliers see: "CLOSES IN 12:00" countdown reset
```

**Step 7: No More Bids** (10:55 - 11:10, trigger window ends at 11:10)
```
At 11:10 AM (new bidCloseTime):
1. Cron runs at 11:10
2. Checks: now >= bidCloseTime (11:10 >= 11:10)? YES
3. Update status: ACTIVE → CLOSED
4. Emit `rfq:status-changed` socket (status='CLOSED')
5. CountdownTimer shows "AUCTION CLOSED"
6. All browsers stop updates
7. Supplier 1 winner with lowest bid: 4700
```

---

## 12. Key Algorithms

### Algorithm 1: Bid Ranking Recalculation
```javascript
// Purpose: Determine rank for each supplier based on totalCharges
// File: bid.routes.js POST /api/rfqs/:rfqId/bids

function recalculateRanks(bids) {
  // 1. Group by supplierId, keep only isLatest=true
  const latestBidPerSupplier = {};
  bids.forEach(bid => {
    if (bid.isLatest) {
      if (!latestBidPerSupplier[bid.supplierId] || 
          latestBidPerSupplier[bid.supplierId].totalCharges > bid.totalCharges) {
        latestBidPerSupplier[bid.supplierId] = bid;
      }
    }
  });
  
  // 2. Sort by totalCharges ascending (lowest = rank 1)
  const sorted = Object.values(latestBidPerSupplier)
    .sort((a, b) => a.totalCharges - b.totalCharges);
  
  // 3. Assign ranks
  return sorted.map((bid, index) => ({
    ...bid,
    rank: index + 1
  }));
}

// Usage
const newRankings = recalculateRanks(allBids);
// newRankings[0].rank === 1 (L1)
// newRankings[1].rank === 2 (L2)
// etc
```

---

### Algorithm 2: Rank Change Detection
```javascript
// Purpose: Identify if ANY rank changed or if L1 changed
// File: bid.routes.js POST /api/rfqs/:rfqId/bids

function detectRankChange(oldRankings, newRankings) {
  // Compare each supplier's old vs new rank
  const rankMap = {};
  
  oldRankings.forEach(bid => {
    rankMap[bid.supplierId] = bid.rank;
  });
  
  let anyRankChanged = false;
  let l1Changed = false;
  
  newRankings.forEach(bid => {
    if (rankMap[bid.supplierId] !== bid.rank) {
      anyRankChanged = true;
      
      if (bid.rank === 1 || rankMap[bid.supplierId] === 1) {
        l1Changed = true; // Either was L1 or became L1
      }
    }
  });
  
  return {
    anyRankChanged,
    l1Changed,
    triggeredBy: l1Changed ? 'L1_RANK_CHANGE' 
                : anyRankChanged ? 'ANY_RANK_CHANGE' 
                : null
  };
}
```

---

### Algorithm 3: Extension Trigger Window Calculation
```javascript
// Purpose: Check if current time is in trigger window
// File: auctionExtension.engine.js

function isInTriggerWindow(config, rfq) {
  // Trigger window = last X minutes before bidCloseTime
  // Example: bidCloseTime = 11:00, X = 10 mins
  // Window = [10:50, 11:00)
  
  const now = new Date();
  const bidCloseTime = new Date(rfq.bidCloseTime);
  const windowStart = new Date(bidCloseTime.getTime() - config.triggerWindowX * 60000);
  
  return now >= windowStart && now < bidCloseTime;
}

// Usage
if (isInTriggerWindow(config, rfq)) {
  console.log('We are in trigger window - check trigger conditions');
} else {
  console.log('Not in trigger window - no extension');
}
```

---

### Algorithm 4: Extension + Forced Close Cap
```javascript
// Purpose: Calculate new close time and enforce cap
// File: auctionExtension.engine.js

function extendAuction(rfq, config, extensionMinutes) {
  const bidCloseTime = new Date(rfq.bidCloseTime);
  const forcedCloseTime = new Date(rfq.forcedCloseTime);
  
  // Calculate new close
  const newCloseTime = new Date(
    bidCloseTime.getTime() + extensionMinutes * 60000
  );
  
  // Enforce cap: never extend beyond forcedCloseTime
  if (newCloseTime > forcedCloseTime) {
    return {
      extended: false,
      reason: 'Would exceed forced close cap',
      capped: true
    };
  }
  
  // Update database
  rfq.bidCloseTime = newCloseTime;
  rfq.save();
  
  return {
    extended: true,
    oldCloseTime: bidCloseTime,
    newCloseTime: newCloseTime,
    reason: `Extended by ${extensionMinutes} minutes`
  };
}
```

---

### Algorithm 5: Stale Event Guard (Prevent Retrigger)
```javascript
// Purpose: Don't extend if same trigger just happened
// File: auctionExtension.engine.js

function checkStaleEventGuard(rfqId, currentlyTriggering) {
  // Get last extension event for this RFQ
  const lastEvent = db.AuctionEvent.findLast(e =>
    e.rfqId === rfqId && e.eventType === 'TIME_EXTENDED'
  );
  
  if (!lastEvent) {
    return { stale: false }; // No previous extension
  }
  
  const timeSinceLastExtension = (new Date() - lastEvent.createdAt) / 1000; // seconds
  
  // If less than 30 seconds AND same trigger type → stale
  if (timeSinceLastExtension < 30 && 
      lastEvent.triggeredBy === currentlyTriggering) {
    return {
      stale: true,
      reason: 'Same bidding activity already triggered extension'
    };
  }
  
  return { stale: false };
}

// Usage: Called BEFORE extending
const guard = checkStaleEventGuard(rfqId, 'ANY_RANK_CHANGE');
if (guard.stale) {
  console.log('Skip extension - same activity already extended');
  return { extended: false, ...guard };
}
```

---

## Key Files to Review for Interview

### Ranking Priority
1. **bid.routes.js** - ⭐⭐⭐ (Bid submission + ranking + extension trigger)
2. **auctionExtension.engine.js** - ⭐⭐⭐ (Core extension logic)
3. **AuctionDetailPage.jsx** - ⭐⭐ (Frontend real-time UI)
4. **index.js** - ⭐⭐ (Cron scheduler + socket setup)
5. **auctionStore.js** - ⭐⭐ (State sync)
6. **useAuctionSocket.js** - ⭐⭐ (Socket integration)
7. **auth.middleware.js** - ⭐ (Security: fresh role lookup)
8. **schema.prisma** - ⭐ (Data model)

---

## Common Interview Questions (Based on This Codebase)

1. **How does the bid ranking work? Walk through the transaction.**
   - Answer in [bid.routes.js POST handler] + Algorithm 2

2. **Why do we need checkAndExtendAuction in both bid submit AND cron?**
   - Answer: Immediate feedback + fallback for socket disconnections

3. **What prevents infinite extension retriggers?**
   - Answer: Stale event guard (Algorithm 5) - if same trigger within 30s, skip

4. **How does the trigger window work with multiple extensions?**
   - Answer: Window calculated from CURRENT bidCloseTime, not original (sliding window)

5. **Why fresh DB role lookup instead of trusting JWT claims?**
   - Answer: Security - prevents stale role exploitation if user role changed server-side

6. **Walk through supplier bid at 10:50 when trigger window is 10:50-11:00**
   - Answer: Use scenario from [End-to-End Flow - Step 5]

7. **What happens if extension would exceed forced close time?**
   - Answer: Capped at forcedCloseTime (Algorithm 4)

8. **How do socket reconnections work?**
   - Answer: useAuctionSocket.js re-joins room on 'connect' event + fallback polling

---

## Commands to Run Project

```bash
# Terminal 1: Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Open browser
http://localhost:5173
```

**Default Test Users**:
- Buyer: buyer@test.com / password123
- Supplier: supplier@test.com / password123

---

## Conclusion

This project demonstrates:
- ✅ Real-time bidding with WebSocket + fallback polling
- ✅ Complex state management (Zustand + database)
- ✅ Sophisticated auction logic with multiple trigger types
- ✅ Background scheduling (cron) for lifecycle management
- ✅ Proper authentication + authorization
- ✅ Transaction-based consistent data
- ✅ Clean architecture (routes → services → database)

**Every piece of code is connected and has a purpose.** Nothing is left to chance.

---

**Last Updated**: April 16, 2026  
**Status**: Production Ready  
**Author**: Interview Prep Doc
