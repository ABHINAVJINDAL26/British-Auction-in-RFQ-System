# 🏛️ British Auction RFQ System - Complete Project Analysis

---

## 📌 Project Overview

Yeh ek **full-stack real-time auction platform** hai jaha pe:
- **Buyers** freight shipment ke liye RFQ (Request for Quotation) banate hain
- **Suppliers** us shipment par competing bids dete hain
- System automatically auction ko extend karta hai jab bids trigger window mein aaye
- Real-time countdown + live rankings + auto-extension logic sab combined

**Real-world use case:** 
Company A (Amazon) ko Mumbai se Dubai shipment bhejni hai. Uske liye 5 logistics companies (DHL, FedEx, Maersk, Evergreen, etc) se quotes leni hain. Ye system automatically best price find karta hai, aur last-minute competitive bidding encourage karta hai.

---

## 🔧 Tech Stack

### **Backend**
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js | JavaScript server environment |
| Framework | Express.js | HTTP server & routing |
| Database | PostgreSQL | Relational data storage |
| ORM | Prisma | Type-safe database queries |
| Real-time | Socket.IO | WebSocket bidirectional communication |
| Authentication | JWT (JSON Web Tokens) | Stateless auth tokens |
| Task Scheduling | node-cron | Scheduled jobs (auction checks) |
| Validation | Zod | Runtime type checking |
| Other | bcryptjs | Password hashing |

### **Frontend**
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18 | UI component library |
| Build | Vite | Fast bundler |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| State Management | Zustand | Lightweight global state |
| Real-time | Socket.IO Client | WebSocket client |
| HTTP | Axios | API requests |
| Routing | React Router v7 | Client-side navigation |
| Icons | Lucide React | Icon library |
| Other | date-fns | Date utilities |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BUYER LOGIN                          │
├─────────────────────────────────────────────────────────┤
│ Browser (React App)                                     │
│  ├─ AuctionListPage (RFQ marketplace view)             │
│  ├─ CreateRfqForm (RFQ creation modal)                  │
│  ├─ AuctionDetailPage (live auction view)              │
│  └─ BidSubmitForm (bid submission modal)               │
└─────────────┬───────────────────────────────────────────┘
              │ HTTP + WebSocket
              ▼
┌─────────────────────────────────────────────────────────┐
│              EXPRESS.js SERVER (Backend)                │
│                                                         │
│  Routes Layer:                                          │
│  ├─ POST /api/auth/signup                              │
│  ├─ POST /api/auth/login                               │
│  ├─ GET /api/rfqs (list all RFQs)                      │
│  ├─ POST /api/rfqs (create RFQ)                        │
│  ├─ GET /api/rfqs/:id (RFQ details)                    │
│  ├─ POST /api/rfqs/:id/bids (submit bid)               │
│  └─ GET /api/rfqs/:id/bids (get rankings)              │
│                                                         │
│  Service Layer:                                         │
│  ├─ auctionExtension.engine.js (core logic)            │
│  ├─ Bid validation & ranking calculation               │
│  └─ Event logging                                       │
│                                                         │
│  WebSocket Layer (Socket.IO):                          │
│  ├─ bid:new (broadcast new bid to all clients)         │
│  ├─ auction:time-extended (extension events)           │
│  ├─ auction:status-changed (ACTIVE→CLOSED, etc)        │
│  └─ join:auction (client subscribes to RFQ)            │
│                                                         │
│  Cron Jobs (Every 30 seconds):                         │
│  ├─ Check for extension triggers                       │
│  ├─ Auto-start DRAFT → ACTIVE at bidStartTime         │
│  ├─ Auto-close ACTIVE → CLOSED at bidCloseTime        │
│  └─ Auto-force-close → FORCE_CLOSED at forcedCloseTime│
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                        │
│ Tables: users, rfqs, bids, auction_configs,            │
│         auction_events                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### **1. Users Table**
```
users
├─ id (UUID, primary key)
├─ name (string) — user full name
├─ email (string, unique) — login email
├─ passwordHash (string) — bcrypt hashed password
├─ role (string) — BUYER or SUPPLIER
├─ company (string) — organization name
├─ carrierName (string) — logistics company (suppliers only)
└─ createdAt (timestamp)
```

**Example:**
```
id: 'abc123'
name: 'Kanwal Sharma'
email: 'kanwal@amazon.com'
role: 'BUYER'
company: 'Amazon India'
```

---

### **2. RFQs Table** (Request for Quotation)
```
rfqs
├─ id (UUID, primary key)
├─ referenceId (string, unique) — human-readable ID (RFQ-2024-001)
├─ name (string) — RFQ title
├─ buyerId (UUID, foreign key → users)
├─ pickupDate (timestamp) — when shipment happens
├─ bidStartTime (timestamp) — 🟢 when bidding opens
├─ bidCloseTime (timestamp) — 🔴 when bidding closes (can extend)
├─ forcedCloseTime (timestamp) — 🚫 hard cap (never changes)
├─ originalCloseTime (timestamp) — original bidCloseTime before extensions
├─ status (enum) — DRAFT | ACTIVE | CLOSED | FORCE_CLOSED
└─ createdAt, updatedAt (timestamps)
```

**Status Lifecycle:**
```
DRAFT (future start) 
  ↓ (at bidStartTime, cron auto-activates)
ACTIVE (bidding open)
  ↓ (at bidCloseTime, cron closes)
CLOSED (normal close)
  
OR if bidCloseTime extended past forcedCloseTime:
ACTIVE
  ↓ (at forcedCloseTime, cron force-closes)
FORCE_CLOSED (hard cap reached)
```

**Example:**
```
id: 'rfq-xyz'
referenceId: 'RFQ-2026-001'
name: 'Mumbai to Dubai Export Shipment'
buyerId: 'abc123' (Kanwal)
bidStartTime: 2026-03-28 15:45 IST
bidCloseTime: 2026-03-28 16:00 IST (originally)
forcedCloseTime: 2026-03-28 16:30 IST (hard cap)
status: ACTIVE
```

---

### **3. AuctionConfig Table**
```
auction_configs
├─ id (UUID, primary key)
├─ rfqId (UUID, unique, foreign key → rfqs)
├─ triggerWindowX (int) — minutes before close to monitor
├─ extensionDurationY (int) — minutes to add when triggered
├─ triggerType (enum) — BID_RECEIVED | ANY_RANK_CHANGE | L1_RANK_CHANGE
└─ createdAt (timestamp)
```

**Trigger Types Explained:**
```
triggerWindowX = 10 minutes
extensionDurationY = 5 minutes
bidCloseTime = 4:00 PM

Trigger Window: 3:50 PM to 4:00 PM

a) BID_RECEIVED:
   If ANY bid comes in 3:50-4:00 → extend to 4:05
   (doesn't matter if rank changes)

b) ANY_RANK_CHANGE:
   If supplier ranks change 3:50-4:00 → extend to 4:05
   (e.g., L1 becomes L2, new supplier becomes L1)

c) L1_RANK_CHANGE:
   Only if TOP bidder changes 3:50-4:00 → extend to 4:05
   (e.g., DHL ₹80k → new L1 = Maersk ₹79.5k)
```

---

### **4. Bids Table**
```
bids
├─ id (UUID, primary key)
├─ rfqId (UUID, foreign key → rfqs)
├─ supplierId (UUID, foreign key → users)
├─ carrierName (string) — carrier company
├─ freightCharges (float) — charges in ₹
├─ originCharges (float) — origin handling in ₹
├─ destinationCharges (float) — destination handling in ₹
├─ totalCharges (float) — auto-calculated sum
├─ transitTime (int) — delivery days
├─ quoteValidity (date) — quote valid until
├─ rank (int) — L1=1, L2=2, L3=3...
├─ isLatest (boolean) — only latest bid per supplier = true
├─ notes (text) — optional supplier notes
├─ submittedAt (timestamp)
└─ index: (rfqId, isLatest, supplierId)
```

**Key Point:** `isLatest = true` ensures only 1 bid per supplier counts for ranking.

**Example Timeline:**
```
3:20 PM — DHL bids ₹80,000 → L1, isLatest=true
3:45 PM — FedEx bids ₹75,000 → L1 (DHL = L2)
3:55 PM — DHL bids ₹74,000 → L1 (isLatest=true, old bid marked false)
3:57 PM — FedEx bids ₹73,000 → L1 (isLatest=true, old bid marked false)

Current rankings (isLatest=true only):
L1: FedEx ₹73,000 (bid at 3:57)
L2: DHL ₹74,000 (bid at 3:55)
```

---

### **5. AuctionEvents Table**
```
auction_events
├─ id (UUID, primary key)
├─ rfqId (UUID, foreign key → rfqs)
├─ eventType (enum) — BID_SUBMITTED | TIME_EXTENDED | 
│                     AUCTION_STARTED | AUCTION_CLOSED | 
│                     AUCTION_FORCE_CLOSED
├─ actorId (UUID, nullable, who triggered it)
├─ description (text) — human-readable event
├─ oldCloseTime (timestamp) — before extension
├─ newCloseTime (timestamp) — after extension
├─ triggeredBy (string) — reason (L1_RANK_CHANGE, BID_RECEIVED, etc)
└─ createdAt (timestamp)
```

**Example Events Log:**
```
4:00 PM — AUCTION_STARTED: "Auction started at bid start time"
3:45 PM — BID_SUBMITTED: "DHL submits ₹80,000"
3:50 PM — BID_SUBMITTED: "FedEx submits ₹75,000"
3:50 PM — TIME_EXTENDED: "Extended +5min (L1_RANK_CHANGE)" 
          oldCloseTime: 4:00 → newCloseTime: 4:05
3:53 PM — BID_SUBMITTED: "DHL submits ₹74,000 (L1 change)"
3:53 PM — TIME_EXTENDED: "Extended +5min (L1_RANK_CHANGE)"
          oldCloseTime: 4:05 → newCloseTime: 4:10
```

---

## 🔄 Complete User Workflows

### **Workflow 1: Buyer Creates Auction**

```
1. Buyer clicks "Create RFQ"
   ↓
2. Modal Form Opens:
   - Auction Title: "Mumbai to Dubai Shipment"
   - Bid Start: 2026-03-28 15:45
   - Bid Close: 2026-03-28 16:00
   - Forced Close: 2026-03-28 16:30
   - Trigger Window: 10 min
   - Extension: 5 min
   - Type: L1 Rank Change
   ↓
3. Frontend validates:
   - Bid Start < Bid Close? ✓
   - Bid Close < Forced Close? ✓
   ↓
4. POST /api/rfqs {all data}
   ↓
5. Backend action:
   - Checks: Is bidStartTime in future?
   - If future: status = DRAFT
   - If past/now: status = ACTIVE
   - Creates RFQ + AuctionConfig
   ↓
6. RFQ appears in list as DRAFT or ACTIVE
   ↓
7. Cron checks every 30s:
   - If status=DRAFT AND now >= bidStartTime
     → Update status=ACTIVE
     → Emit WebSocket: auction:status-changed
     → Log: AUCTION_STARTED event
```

---

### **Workflow 2: Supplier Submits Bid**

```
1. Supplier logs in, sees RFQ list
2. Clicks "View Auction Center"
   ↓
3. Detail page loads:
   - If DRAFT: Shows "STARTS IN" countdown, button disabled
   - If ACTIVE: Shows "CLOSES IN" countdown, button enabled
   - If CLOSED/FORCE_CLOSED: Button shows "Auction Closed"
   ↓
4. Supplier clicks "Submit New Bid"
   ↓
5. Bid Modal Opens:
   - Carrier Name: "DHL Express"
   - Freight: ₹80,000
   - Origin: ₹5,000
   - Destination: ₹3,000
   - Total: ₹88,000 (auto-calculated)
   - Transit: 5 days
   - Validity: 2026-04-05
   ↓
6. POST /api/rfqs/{id}/bids
   ↓
7. Backend transaction:
   a) Validate: RFQ status=ACTIVE? now < bidCloseTime? ✓
   
   b) Get current L1: previous best bid
   
   c) Mark old bids as isLatest=false:
      UPDATE bids SET isLatest=false
      WHERE rfqId=X AND supplierId=Y AND isLatest=true
   
   d) Create new bid: isLatest=true
   
   e) Recalculate ranks:
      SELECT * WHERE rfqId=X AND isLatest=true
      ORDER BY totalCharges ASC
      → rank = 1, 2, 3...
   
   f) Check if L1 changed?
      oldL1 != newL1 → triggeredBy='L1_RANK_CHANGE'
   
   g) Log event: BID_SUBMITTED
   
   h) Broadcast WebSocket: bid:new
      { bid: {...}, l1Changed: true }
   
   i) Trigger extension check immediately
   ↓
8. All connected clients (Socket.IO rooms):
   - Receive bid:new event
   - Update rankings table
   - Add event to activity log
   - Recalculate L1 highlight
```

---

### **Workflow 3: Auction Extension (Cron Job)**

```
Every 30 seconds, server runs:

FOR EACH active auction:
  
  1. Get config: triggerWindowX=10, extensionDurationY=5, type=L1_RANK_CHANGE
  
  2. Calculate window:
     windowStart = bidCloseTime - X minutes
     windowEnd = bidCloseTime
     
     Example: 3:50 PM to 4:00 PM
  
  3. Check: Is now inside window?
     If 3:45 PM → outside, skip
     If 3:55 PM → inside, continue
     If 4:01 PM → outside (past end), skip
  
  4. Based on trigger type:
  
     a) BID_RECEIVED:
        → Any bid.submittedAt >= windowStart?
        → If YES: extend
        → If NO: don't extend
     
     b) ANY_RANK_CHANGE:
        → Any event.eventType='BID_SUBMITTED' 
          created_at >= windowStart?
        → If YES: extend
     
     c) L1_RANK_CHANGE:
        → Any event.triggeredBy='L1_RANK_CHANGE'
          created_at >= windowStart?
        → If YES: extend
  
  5. If extend:
     newCloseTime = bidCloseTime + Y minutes
     
     IF newCloseTime > forcedCloseTime:
       finalCloseTime = forcedCloseTime (CAP!)
     ELSE:
       finalCloseTime = newCloseTime
     
     UPDATE rfqs SET bidCloseTime = finalCloseTime
     
     INSERT auctionEvent:
       type: TIME_EXTENDED
       description: "Extended +5 min (L1_RANK_CHANGE)"
       oldCloseTime, newCloseTime, triggeredBy
     
     Broadcast: auction:time-extended
       { newCloseTime, reason, extensionMinutes }
  
  6. Check closure:
     lastRfq = fresh fetch from DB
     
     IF now >= lastRfq.forcedCloseTime:
       status = FORCE_CLOSED
       Emit: auction:status-changed
       Log: AUCTION_FORCE_CLOSED
     
     ELSE IF now >= lastRfq.bidCloseTime:
       status = CLOSED
       Emit: auction:status-changed
       Log: AUCTION_CLOSED
```

---

## 🎨 Frontend Pages & Components

### **Page 1: Auction List Page**

**URL:** `/`

**Visible To:** Both BUYER and SUPPLIER

**Desktop Table:**
```
RFQ DETAILS           STATUS        BID CLOSE           L1 PRICE      ACTIONS
Mumbai-Dubai Export   ACTIVE [🟢]   4:05 PM ↑          ₹73,000       DETAILS
Delhi-London Export   CLOSED        02-04-2026 3:00 PM  ₹1,20,000    DETAILS
```

**Features:**
- **Status Badge**: DRAFT (amber), ACTIVE (green), CLOSED/FORCE_CLOSED (gray)
- **Bid Close Time**: 
  - ACTIVE: Shows time only + pulse indicator + `↑` if extended
  - Not active: Shows date + time
- **Forced Close Column**: Shows hard cap time (new)
- **L1 Price**: Green, lowest bid amount or "—" if no bids
- **Order**: Active auctions first, sorted by bidCloseTime

**Button:**
- BUYER: "+ Create RFQ" button
- SUPPLIER: No creation button, just view

**Create RFQ Modal:**
```
Form Fields:
├─ Auction Title [text]
├─ Pickup Date [date picker]
├─ RFQ Reference ID [auto-generated, editable]
├─ Bid Start Date & Time [datetime picker] ← CRITICAL
├─ Bid Close Date & Time [datetime picker]
├─ Forced Close Time [datetime picker]
└─ Extension Config:
   ├─ Trigger Window: X minutes
   ├─ Extension Duration: Y minutes
   └─ Trigger Event: [dropdown] L1, BID, ANY_RANK
```

---

### **Page 2: Auction Detail Page**

**URL:** `/auctions/:id`

**Visible To:** Both logged-in users (role-based content)

**Layout: 3-column split**

#### **Left Column (50%) — Live Rankings Table**
```
Headers: RANK | CARRIER | FREIGHT | ORIGIN | DEST | TOTAL | TRANSIT | VALIDITY

L1 🥇  DHL      ₹80k    ₹5k    ₹3k   ₹88k   5 days  05-04-26
L2 🥈  FedEx    ₹85k    ₹4k    ₹3k   ₹92k   7 days  10-04-26
L3 🥉  Maersk   ₹90k    ₹4k    ₹4k   ₹98k   4 days  08-04-26
```

**Features:**
- L1 row: Green background, crown icon
- One-row-per-supplier (isLatest dedup)
- Sorted by total charges (low to high)
- Shows all charge breakdowns

---

#### **Center Column (30%) — Timer & Config**
```
[ACTIVE] (status badge, amber for timer, green for active)

Mumbai to Dubai Shipment
Ref: RFQ-2026-001

CLOSES IN           ← (or "STARTS IN" if DRAFT)
00:04:32

[====----] Bid Close Progress
[=-------] Forced Close Progress

Hard Cap: 04:20 PM
18 min to Forced Close

Config Displayed:
Window=10m | Extension=5m | Type=L1 Rank Change

[Button — context dependent]
- BUYER:    "Bidding Restricted to Suppliers"
- SUPPLIER (DRAFT): "Auction Not Started Yet" (disabled)
- SUPPLIER (ACTIVE): "Submit New Bid" (enabled)
- SUPPLIER (CLOSED): "Auction Closed" (disabled)
```

---

#### **Right Column (20%) — Activity Feed**
```
● 03:57 PM — FedEx bid ₹92,000 submitted
🔔 03:55 PM — Auction extended +5 min
              Reason: L1 Rank Change
              Old close: 4:00 PM → New: 4:05 PM
● 03:45 PM — DHL bid ₹88,000 submitted
● 03:20 PM — Auction started
```

**Features:**
- Newest at top
- Icons: Green dot for bids, amber bell for extensions
- Extension entry shows old/new close times + reason
- Live updates via WebSocket

---

### **Bid Submit Modal**

**Opens When:** Supplier clicks "Submit New Bid" during ACTIVE auction

**Form:**
```
Carrier Name: [text] — "DHL Express"

Freight Charges (₹): [number]
Origin Charges (₹):  [number]
Destination (₹):     [number]

[Box showing auto-calculated Total]

Transit Time (Days): [number]
Quote Validity:      [date picker]
Notes (optional):    [textarea]

[Cancel] [Confirm and Submit Bid]
```

---

## 🔐 Authentication & Authorization

### **Auth Flow**

```
1. Signup:
   POST /api/auth/signup
   { name, email, password, role, company, carrierName }
   ↓
   Backend:
   - Hash password with bcryptjs
   - Create user in DB
   - Generate JWT token
   - Return: { user, token }
   ↓
   Frontend:
   - Save token in localStorage
   - Save user in localStorage
   - Zustand store update
   - Redirect to home

2. Login:
   POST /api/auth/login
   { email, password }
   ↓
   Backend:
   - Find user by email
   - Compare password hash
   - Generate JWT token
   - Return: { user, token }
   ↓
   Frontend:
   - Same as signup flow

3. Authenticated Requests:
   All API calls auto-add header:
   Authorization: Bearer {token}
   ↓
   Backend middleware:
   - Verify JWT signature
   - Extract user ID & role
   - Attach to req.user
   - Continue or 401 error

4. Token Expiry/Stale:
   If 401 response:
   - Clear localStorage
   - Redirect to /login
```

### **Role-Based Access Control (RBAC)**

```
BUYER Role:
├─ ✅ Create RFQs
├─ ✅ View all RFQs + details
├─ ✅ View all bids/rankings
├─ ❌ Submit bids
└─ ❌ See only own bids

SUPPLIER Role:
├─ ❌ Create RFQs
├─ ✅ View all RFQs (marketplace)
├─ ✅ View auction details + rankings
├─ ✅ Submit bids (during ACTIVE window)
└─ ✅ See only own bids

Enforcement:
- Backend: roleMiddleware(['BUYER']) on POST /api/rfqs
- Frontend: Conditional render based on user.role
```

---

## 💾 Real-Time Features (WebSocket)

### **Socket.IO Events**

```
CLIENT → SERVER:
├─ join:auction
│  Payload: { rfqId }
│  Purpose: Subscribe to specific auction room
│  Example: User joins RFQ-001 auction

SERVER → CLIENT:
├─ bid:new
│  Payload: { bid: {...}, l1Changed: boolean }
│  When: New bid submitted
│  Effect: Rankings update, activity log appends
│
├─ auction:time-extended
│  Payload: { 
│    rfqId, newCloseTime, reason, 
│    extensionMinutes, oldCloseTime 
│  }
│  When: Extension trigger fires
│  Effect: Timer resets, activity log shows reason
│
├─ auction:status-changed
│  Payload: { rfqId, status }
│  When: Status changes (DRAFT→ACTIVE, ACTIVE→CLOSED, etc)
│  Effect: Page updates, button states change
  
├─ bid:new (for activity log)
│  Captures: Event added to activity feed in real-time
```

### **Real-Time Data Flow**

```
Supplier submits bid at 3:55 PM:
  ↓
POST /api/rfqs/abc/bids (transaction processing)
  ↓
calcRanks() → bids recalculated
  ↓
checkL1Changed()
  ↓
emit WebSocket: bid:new
  ↓
[Connected Buyer Browser]
  - Rankings table refreshed
  - Activity log: "+DHL ₹88k"
  - Counter to L1 highlighted
  
[Connected Supplier Browser]
  - Sees self in L1/L2/etc immediately
  - Activity log updated
  
[All connected AFTER this bid]
  - See updated rankings when they receive
```

---

## 🤖 Core Business Logic: Auction Extension Engine

### **Extension Algorithm**

```javascript
EVERY 30 SECONDS:

FOR EACH active auction:

1. Load config:
   triggerWindowX = 10 min
   extensionDurationY = 5 min
   triggerType = 'L1_RANK_CHANGE'

2. Calculate window:
   windowStart = bidCloseTime - 10 min
   windowEnd = bidCloseTime
   
   Example: 3:50 PM - 4:00 PM

3. Is NOW inside window?
   If NOW < 3:50 PM: Skip
   If 3:50 <= NOW <= 4:00 PM: Check triggers
   If NOW > 4:00 PM: Skip

4. Based on triggerType:

   IF L1_RANK_CHANGE:
     → Query events where:
       eventType = 'BID_SUBMITTED' 
       AND triggeredBy = 'L1_RANK_CHANGE'
       AND createdAt >= windowStart
     → If found: shouldExtend = TRUE
   
   IF BID_RECEIVED:
     → Query bids where:
       submittedAt >= windowStart
     → If found: shouldExtend = TRUE
   
   IF ANY_RANK_CHANGE:
     → Query events where:
       eventType = 'BID_SUBMITTED'
       AND createdAt >= windowStart
     → If found: shouldExtend = TRUE

5. If shouldExtend = TRUE:
   newTime = bidCloseTime + extensionDurationY
   
   IF newTime > forcedCloseTime:
     finalTime = forcedCloseTime  ← CAP!
   ELSE:
     finalTime = newTime
   
   Update DB: bidCloseTime = finalTime
   
   Emit WebSocket to all clients:
     auction:time-extended {
       newCloseTime: finalTime,
       extensionMinutes,
       reason: 'L1_RANK_CHANGE',
       oldCloseTime
     }

6. After extension, check closure:
   
   IF now >= forcedCloseTime:
     status = FORCE_CLOSED
   ELSE IF now >= bidCloseTime:
     status = CLOSED
   
   (Use freshly fetched bidCloseTime after extension)
```

---

## 📊 Complete Example Scenario

### **Timeline: Mumbai-Dubai Shipment Auction**

```
3:00 PM
├─ Buyer (Amazon) creates RFQ
├─ bidStartTime: 3:15 PM
├─ bidCloseTime: 4:00 PM (original)
├─ forcedCloseTime: 4:30 PM
├─ triggerWindow: 10 min (3:50-4:00 PM)
├─ extension: 5 min
├─ triggerType: L1_RANK_CHANGE
└─ Status: DRAFT

3:15 PM
├─ [Cron runs]
├─ Detects: now >= bidStartTime
├─ Updates: status = ACTIVE
├─ Event logged: AUCTION_STARTED
├─ WebSocket: auction:status-changed
└─ All clients receive update

3:20 PM
├─ Supplier 1 (DHL) submits bid ₹88,000
├─ Rankings: [L1: DHL ₹88k]
├─ Event: BID_SUBMITTED (L1_RANK_CHANGE=null)
└─ No extension (outside window)

3:45 PM
├─ Supplier 2 (FedEx) submits bid ₹86,000
├─ Rankings: [L1: FedEx ₹86k, L2: DHL ₹88k]
├─ Event: BID_SUBMITTED (L1_RANK_CHANGE=true)
└─ [Cron runs]
└─ Now at 3:45 PM: outside window (3:50-4:00)
    → No extension

3:55 PM ← ENTERS TRIGGER WINDOW
├─ Supplier 1 (DHL) submits bid ₹85,500
├─ Rankings: [L1: DHL ₹85.5k, L2: FedEx ₹86k]
├─ Event: BID_SUBMITTED (L1_RANK_CHANGE=true) ✓ TRIGGER!
├─ [Cron runs immediately after bid]
├─ Detects: L1_RANK_CHANGE event at 3:55 PM in window
├─ Extension: newTime = 4:00 + 5 min = 4:05 PM
├─ Update: bidCloseTime = 4:05 PM
├─ Event: TIME_EXTENDED (oldClose=4:00, newClose=4:05)
├─ WebSocket: auction:time-extended
└─ All clients: Activity log shows "+5 min extension"

3:58 PM
├─ Supplier 3 (Maersk) submits ₹85,200
├─ Rankings: [L1: Maersk ₹85.2k, L2: DHL ₹85.5k, L3: FedEx ₹86k]
├─ Event: BID_SUBMITTED (L1_RANK_CHANGE=true) ✓ TRIGGER!
├─ Extension: newTime = 4:05 + 5 = 4:10 PM
├─ Update: bidCloseTime = 4:10 PM
├─ Event: TIME_EXTENDED (oldClose=4:05, newClose=4:10)
└─ WebSocket update

4:08 PM
├─ Supplier 2 (FedEx) submits ₹85,100
├─ Rankings: [L1: FedEx ₹85.1k, L2: Maersk ₹85.2k, ...]
├─ Event: BID_SUBMITTED (L1_RANK_CHANGE=true) ✓ TRIGGER!
├─ Extension calc: newTime = 4:10 + 5 = 4:15 PM
├─ BUT: 4:15 PM > 4:30 PM (forcedCloseTime)? NO
├─ Update: bidCloseTime = 4:15 PM
├─ Event: TIME_EXTENDED
└─ WebSocket update

4:13 PM
├─ Supplier 1 (DHL) submits ₹85,050
├─ Rankings: [L1: DHL ₹85.05k, ...]
├─ Event: BID_SUBMITTED (L1_RANK_CHANGE=true) ✓ TRIGGER!
├─ Extension calc: newTime = 4:15 + 5 = 4:20 PM
├─ 4:20 PM > 4:30 PM? NO
├─ Update: bidCloseTime = 4:20 PM
└─ WebSocket update

4:18 PM
├─ Supplier 3 (Maersk) submits ₹84,999
├─ Rankings: [L1: Maersk ₹84,999, ...]
├─ Event: BID_SUBMITTED (L1_RANK_CHANGE=true) ✓ TRIGGER!
├─ Extension calc: newTime = 4:20 + 5 = 4:25 PM
├─ 4:25 PM > 4:30 PM? NO
├─ Update: bidCloseTime = 4:25 PM
└─ WebSocket update

4:22 PM
├─ Supplier 2 submits ₹84,998
├─ Event: BID_SUBMITTED (L1_RANK_CHANGE=true) ✓ TRIGGER!
├─ Extension calc: newTime = 4:25 + 5 = 4:30 PM
├─ 4:30 PM > 4:30 PM? NO (equal)
├─ Update: bidCloseTime = 4:30 PM
├─ CAP approach: No more extension possible
└─ WebSocket update

4:28 PM
├─ No new bids in last 2 mins
├─ Window still active (4:20-4:30 PM range)
├─ But bidCloseTime = 4:30 PM (already at forced close)
└─ No extension triggering

4:30 PM → FORCED CLOSE TIME HIT
├─ [Cron runs]
├─ Checks: now >= forcedCloseTime (4:30 PM)
├─ Update: status = FORCE_CLOSED
├─ Event: AUCTION_FORCE_CLOSED
├─ WebSocket: auction:status-changed
├─ All clients: "FORCE_CLOSED" badge shown
├─ Suppliers: "Auction Closed" button
└─ No more bids accepted

FINAL RANKINGS:
L1: FedEx ₹84,998
L2: Maersk ₹84,999  
L3: DHL ₹85,050
... (no more bids)
```

---

## 🐛 Key Implementation Details

### **Why isLatest = true?**
```
Scenario: DHL submits 3 bids

bid1: DHL ₹100k (isLatest=true)
bid2: DHL ₹90k  (isLatest=true) → bid1 becomes false
bid3: DHL ₹80k  (isLatest=true) → bid2 becomes false

Current ranking shows only DHL ₹80k (bid3)
Old bids seen in history but not in live rankings.

WITHOUT isLatest:
  Ranking would show bid1, bid2, bid3
  Total 3 rows for 1 supplier (WRONG!)
```

### **Why Forced Close Never Changes?**
```
Forced Close = Hard Cap
- Set once at RFQ creation
- Represents buyer's absolute deadline
- No bid can land after this time

Example: Buyer has aircraft leave at 4:30 PM
- No extension beyond 4:30, even if bids coming at 4:29
- If auction kept extending infinitely, buyer gets paralyzed
- forcedCloseTime prevents this infinite loop
```

### **Why Cron Fetches Fresh After Extension?**
```
OLD WAY (STALE):
├─ Fetch RFQ at 3:50 PM
├─ bidCloseTime = 4:00 PM
├─ Extend: bidCloseTime = 4:05 PM
├─ Close check at 3:50 PM: 3:50 < 4:00? YES, stay ACTIVE
├─ BUG: Uses OLD 4:00 to decide, misses the 4:05 update!

NEW WAY (FRESH):
├─ Fetch RFQ at 3:50 PM
├─ bidCloseTime = 4:00 PM
├─ Extend: bidCloseTime = 4:05 PM
├─ RE-FETCH RFQ: now bidCloseTime = 4:05 PM
├─ Close check: 3:50 < 4:05? YES, correct!
```

### **Why DateTime Parsing Needs IST?**
```
Problem:
- Frontend sends "2026-03-28T16:00" (no timezone)
- Without context, JS auto-assumes UTC
- 16:00 local IST (4:00 PM) → 10:30 UTC
- But backend/DB misinterprets it as 16:00 UTC (9:30 PM IST)
- MISMATCH!

Solution:
- Parse as IST: new Date("2026-03-28T16:00:00+05:30")
- Consistent across frontend/backend
- Display always with 'Asia/Kolkata' timezone
```

---

## 🔒 Security Features

```
1. Password Hashing:
   - bcryptjs (10 salt rounds)
   - Never stored as plaintext

2. JWT Tokens:
   - Signed with JWT_SECRET
   - 7-day expiration
   - 401 errors logged client-side

3. Role-Based Access:
   - Buyer routes blocked for Supplier
   - Supplier routes blocked for Buyer

4. Database Constraints:
   - rfqId + supplierId unique (prevent duplicate active bids)
   - Foreign keys enforce referential integrity
   - Timestamps immutable after creation

5. Input Validation:
   - Zod schema validation
   - Bid amounts: positive floats
   - Email format checked
   - Dates validated (start < close < forced)
```

---

## 📈 Performance Considerations

```
1. Database Indexes:
   - (rfqId, isLatest): Fast ranking queries
   - (rfqId, supplierId): Dup prevention
   - Timestamp indexes for range queries

2. Cron Efficiency:
   - Runs every 30 seconds (not continuous polling)
   - Fetches only DRAFT + ACTIVE auctions
   - Skips non-triggered windows early
   - Fresh-fetch post-extension for accuracy

3. WebSocket Rooms:
   - io.to(rfqId).emit() → broadcast only to auction room
   - Prevents unnecessary client traffic
   - Scales to thousands of simultaneous auctions

4. Frontend Optimization:
   - Socket.IO autoConnect: false (lazy init)
   - Zustand for lightweight state
   - React 18 concurrent rendering
   - Tailwind for CSS efficiency
```

---

## 🎯 Summary: What This Project Does

| Aspect | Details |
|--------|---------|
| **Purpose** | Automated real-time auction platform for freight RFQs |
| **Users** | Buyers (create RFQs) + Suppliers (submit bids) |
| **Core Logic** | Auto-extends bidding when L1/rank changes near deadline |
| **Guarantees** | Hard cap (forced close) prevents infinite extensions |
| **Real-time** | WebSocket updates rankings, timer, activity instantly |
| **Scale** | PostgreSQL + Express backend, React frontend |
| **Complexity** | Medium (auction logic, extension triggers, rankings) |
| **Use Case** | Logistics, procurement, supply chain auctions |

---

## 🚀 Flow Diagram: Complete End-to-End

```
BUYER EXPERIENCE:
Signup → Login → Create RFQ → Wait for bids → View rankings → Action!

SUPPLIER EXPERIENCE:
Signup → Login → Browse RFQs → Join active auction → Monitor timer
         ↓
      Submit bid → See rank update → Get extended notification
         ↓
      Continue bidding or wait → Auction forced close → Winner announced

SYSTEM BACKGROUND:
Every 30 sec: Check for extensions, auto-start DRAFT, auto-close auctions
Every bid: Recalculate ranks, log event, broadcast to all clients
Every extension: Update timer, notify clients, prevent > forced close
```

---

## 📝 Schema DDL (Quick Reference)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR (BUYER, SUPPLIER),
  ...
);

CREATE TABLE rfqs (
  id UUID PRIMARY KEY,
  buyer_id UUID REFERENCES users,
  bid_start_time TIMESTAMP,
  bid_close_time TIMESTAMP,
  forced_close_time TIMESTAMP,
  status VARCHAR (DRAFT, ACTIVE, CLOSED, FORCE_CLOSED),
  ...
);

CREATE TABLE auction_configs (
  id UUID PRIMARY KEY,
  rfq_id UUID UNIQUE REFERENCES rfqs,
  trigger_window_x INT,
  extension_duration_y INT,
  trigger_type VARCHAR (...),
  ...
);

CREATE TABLE bids (
  id UUID PRIMARY KEY,
  rfq_id UUID REFERENCES rfqs,
  supplier_id UUID REFERENCES users,
  total_charges FLOAT,
  is_latest BOOLEAN DEFAULT TRUE,
  rank INT,
  INDEX (rfq_id, is_latest)
);

CREATE TABLE auction_events (
  id UUID PRIMARY KEY,
  rfq_id UUID REFERENCES rfqs,
  event_type VARCHAR,
  triggered_by VARCHAR,
  ...
);
```

---

**This is the complete DNA of the project. Every button, timer, database query, WebSocket event, and business rule follows these patterns. 🚀**
