# 🏗️ DETAILED ARCHITECTURE & DATA FLOW

---

## Part 1: Complete Data Flow Diagram

### **Real-Time Bid Submission Flow**

```
┌────────────────────────────────────────────────────────────────────────┐
│                      SUPPLIER BROWSER (React)                          │
│                                                                        │
│  Bid Form:                                                           │
│  ├─ Carrier: "DHL"                                                   │
│  ├─ Freight: 80000                                                   │
│  ├─ Origin: 5000                                                    │
│  ├─ Destination: 3000                                              │
│  ├─ Transit: 5                                                      │
│  └─ [SUBMIT BID BUTTON] ← Click!                                   │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ axios.post('/api/rfqs/abc/bids',
                                  │ { carrierName, freightCharges, ... })
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.js API Server                           │
│                                                                        │
│  Route: POST /api/rfqs/:id/bids                                      │
│  Middleware: auth (verify JWT)                                       │
│  ├─ Validate: req.params.id (RFQ exists?)                           │
│  ├─ Validate: req.body (amount > 0?, role=SUPPLIER?)                │
│  └─ Handoff to controller                                            │
│                                                                        │
│  TRANSACTION START {                                                  │
│  ├─ Step 1: Fetch RFQ from DB                                       │
│  │   Query: SELECT * FROM rfqs WHERE id=X                           │
│  │   Check: status='ACTIVE' ?                                       │
│  │   Check: now < bidCloseTime ?                                    │
│  │   Check: now >= bidStartTime ?                                   │
│  │   If any fails: → 409 Conflict error                             │
│  │                                                                    │
│  ├─ Step 2: Mark old bids as NOT latest                             │
│  │   Query: UPDATE bids SET isLatest=false                          │
│  │           WHERE rfqId=X AND supplierId=Y AND isLatest=true       │
│  │   (This deduplicates supplier's previous bids)                   │
│  │                                                                    │
│  ├─ Step 3: Insert new bid                                          │
│  │   INSERT INTO bids (rfqId, supplierId, totalCharges, ...)        │
│  │   VALUES (X, Y, 88000, ..., isLatest=true)                       │
│  │                                                                    │
│  ├─ Step 4: Safety cleanup (race condition protection)              │
│  │   DELETE FROM bids                                               │
│  │   WHERE rfqId=X AND supplierId=Y AND isLatest=false             │
│  │   AND id NOT IN (SELECT id FROM bids ... LIMIT 3)                │
│  │   (Keep only last 3 bids for history, delete older)             │
│  │                                                                    │
│  ├─ Step 5: Recalculate rankings                                    │
│  │   SELECT * FROM bids                                             │
│  │   WHERE rfqId=X AND isLatest=true                                │
│  │   ORDER BY totalCharges ASC                                      │
│  │   Loop: bid.rank = 1, 2, 3, ...                                  │
│  │   UPDATE bids SET rank = computed value                          │
│  │                                                                    │
│  ├─ Step 6: Check if L1 changed                                     │
│  │   oldL1 = previousL1Bid                                          │
│  │   newL1 = firstRankedBid                                         │
│  │   If oldL1.supplierId ≠ newL1.supplierId:                       │
│  │     → triggeredBy = 'L1_RANK_CHANGE'                             │
│  │   Else:                                                           │
│  │     → triggeredBy = null                                         │
│  │                                                                    │
│  ├─ Step 7: Log event to database                                   │
│  │   INSERT INTO auction_events (rfqId, eventType, ...)             │
│  │   VALUES (X, 'BID_SUBMITTED', 'DHL bid ₹88k', triggeredBy, ...) │
│  │                                                                    │
│  ├─ Step 8: Broadcast via WebSocket                                 │
│  │   io.to(rfqId).emit('bid:new', {                                │
│  │     bid: { id, supplierId, totalCharges, rank, ... },           │
│  │     l1Changed: (triggeredBy === 'L1_RANK_CHANGE')              │
│  │   })                                                              │
│  │                                                                    │
│  └─ Step 9: Immediate extension check                               │
│     checkAndExtendAuction(rfqId)                                     │
│     (see extension flow below)                                        │
│  }                                                                    │
│  TRANSACTION END                                                       │
│                                                                        │
│  Response: 200 OK { bid, rankings, l1Changed }                       │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
        [DB update] │    [WebSocket broadcast] │
                    ▼             ▼             │
        PostgreSQL  │       Socket.IO         │
                    │       Server            │
                    │       room: rfqId       │
                    │                         │
                    └─────────────┬───────────┘
                                  │
                    ┌─────────────┴──────────────────────────┐
                    │                                        │
                    ▼ (to ALL connected clients on this RFQ)
        ┌───────────────────────────────────────────────┐   │
        │    BUYER BROWSER (Auction Detail Page)      │   │
        │                                               │   │
        │  WebSocket Listener:                         │   │
        │  received: bid:new event                     │   │
        │  {                                           │   │
        │    bid: { rank: 1, supplierId: DHL, ... }   │   │
        │    l1Changed: true                           │   │
        │  }                                           │   │
        │                                               │   │
        │  Actions:                                    │   │
        │  • Update rankings table (visual)            │   │
        │  • Re-highlight L1 row (green)              │   │
        │  • Add event to activity log                 │   │
        │  • If l1Changed: pulsate timer               │   │
        │                                               │   │
        │  UI Update: Instant (no page reload)        │   │
        └───────────────────────────────────────────────┘   │
                                                             │
        ┌────────────────────────────────────────────────┐  │
        │  OTHER SUPPLIER BROWSER (Also viewing)        │   │
        │                                                 │   │
        │  Same WebSocket event received                 │   │
        │  See competitor's bid rank update              │   │
        │  Activity log shows "DHL bid ₹88k"             │   │
        └────────────────────────────────────────────────┘  │
                                                             │
        ┌────────────────────────────────────────────────┐  │
        │  Express.js Server                             │   │
        │  (30-second cron now runs)                     │   │
        │                                                 │   │
        │  Cron detects:                                 │   │
        │  • Action timestamp: 3:55 PM                  │   │
        │  • Trigger window: 3:50-4:00 PM              │   │
        │  • In window? YES ✓                            │   │
        │  • L1 changed? YES ✓                          │   │
        │  • Trigger type: L1_RANK_CHANGE ✓             │   │
        │  • Action: EXTEND bidCloseTime                │   │
        │                                                 │   │
        │  newTime = 4:00 + 5 = 4:05 PM                 │   │
        │  > forcedClose (4:30)? NO → Allowed!          │   │
        │                                                 │   │
        │  UPDATE rfqs SET bidCloseTime = 4:05 PM        │   │
        │  INSERT into auction_events                    │   │
        │    type=TIME_EXTENDED                         │   │
        │    oldCloseTime=4:00, newCloseTime=4:05       │   │
        │    triggeredBy='L1_RANK_CHANGE'               │   │
        │                                                 │   │
        │  Broadcast: auction:time-extended {           │   │
        │    newCloseTime, reason, oldCloseTime         │   │
        │  }                                             │   │
        └────────────────────────────────────────────────┘  │
                                                             │
                    ┌─────────────┬──────────────┐           │
                    │             │              │           │
        [DB update] │    [WebSocket broadcast]   │          │
                    ▼             ▼              │          │
        PostgreSQL  │       Socket.IO           │          │
                    │       server room         │          │
                    │                           │          │
                    └─────────────┬──────────────┘          │
                                  │                        │
                    ┌─────────────┴──────────────────┐     │
                    │                                │     │
                    ▼ (to ALL connected clients)     │     │
        ┌──────────────────────────────────────┐    │     │
        │  ALL BROWSERS (Auction Detail Page)  │    │     │
        │                                       │    │     │
        │  WebSocket Listener:                 │    │     │
        │  received: auction:time-extended     │    │     │
        │  {                                   │    │     │
        │    newCloseTime: 4:05 PM            │    │     │
        │    oldCloseTime: 4:00 PM            │    │     │
        │    reason: 'L1_RANK_CHANGE'         │    │     │
        │  }                                   │    │     │
        │                                       │    │     │
        │  Actions:                            │    │     │
        │  • Update timer display: 00:09:32   │    │     │
        │  • Add to activity log:             │    │     │
        │    "🔔 Extended +5 min              │    │     │
        │     Reason: L1 Rank Change          │    │     │
        │     4:00 PM → 4:05 PM"             │    │     │
        │  • Visual pulse on "CLOSES IN"      │    │     │
        │  • Supplier knows: more time!       │    │     │
        └──────────────────────────────────────┘    │     │
                                                     │     │
        ┌──────────────────────────────────────┐    │     │
        │  SUPPLIER2 (Different Supplier)      │    │     │
        │                                       │    │     │
        │  Sees: Competitor bid came, reset   │    │     │
        │        timer, got more time to bid  │    │     │
        │                                       │    │     │
        │  UI Action: Prepares NEW BID        │    │     │
        │  (competitive pressure activated!)  │    │     │
        └──────────────────────────────────────┘    │     │
                                                     │     │
        Process repeats: New bid → Extension check
        Cycle continues until: now >= forcedCloseTime
```

---

## Part 2: Cron Job - 30-Second Heartbeat

```
┌─────────────────────────────────────────────────────┐
│         CRON JOB (runs every 30 seconds)            │
│         from: backend/src/index.js                  │
└─────────────────────────────────────────────────────┘

LOOP: For each RFQ in database {
  
  1. FILTER PHASE
     ├─ Only fetch where:
     │  status = 'DRAFT' OR status = 'ACTIVE'
     │  (Ignore already CLOSED/FORCE_CLOSED)
     │
     └─ QueryAll:
        SELECT * FROM rfqs 
        WHERE status IN ('DRAFT', 'ACTIVE')
        ORDER BY bidCloseTime ASC
  
  ┌─ For each RFQ:
  │
  ├─ CHECK 1: DRAFT → ACTIVE Transition
  │  │
  │  └─ IF (status = 'DRAFT' AND now >= bidStartTime) THEN
  │     │
  │     ├─ UPDATE rfqs SET status = 'ACTIVE'
  │     │
  │     ├─ INSERT INTO auction_events:
  │     │   type: AUCTION_STARTED
  │     │   description: "Auction started at bid start time"
  │     │
  │     └─ Broadcast WebSocket:
  │        io.to(rfqId).emit('auction:status-changed', {
  │          rfqId, status: 'ACTIVE'
  │        })
  │        [All clients see: DRAFT badge → ACTIVE]
  │        [Timer changes: "STARTS IN" → "CLOSES IN"]
  │        [Button changes: DISABLED → ENABLED]
  │
  ├─ CHECK 2: Extension Mechanism (Only for ACTIVE)
  │  │
  │  └─ IF status = 'ACTIVE' THEN
  │     │
  │     ├─ Load AuctionConfig:
  │     │  Get X (trigger window minutes)
  │     │  Get Y (extension duration minutes)
  │     │  Get triggerType (L1_RANK_CHANGE, BID_RECEIVED, ANY_RANK_CHANGE)
  │     │
  │     ├─ Calculate window:
  │     │  windowStart = bidCloseTime - X minutes
  │     │  windowEnd = bidCloseTime
  │     │  Example: 3:50 PM to 4:00 PM
  │     │
  │     ├─ Is NOW inside window?
  │     │  now >= windowStart AND now <= windowEnd?
  │     │
  │     ├─ IF IN WINDOW THEN
  │     │  │
  │     │  ├─ Check trigger based on type:
  │     │  │
  │     │  │  Option A: triggerType = 'L1_RANK_CHANGE'
  │     │  │  │
  │     │  │  └─ Query:
  │     │  │     SELECT COUNT(*) FROM auction_events
  │     │  │     WHERE rfqId = X
  │     │  │     AND eventType = 'BID_SUBMITTED'
  │     │  │     AND triggeredBy = 'L1_RANK_CHANGE'
  │     │  │     AND createdAt >= windowStart
  │     │  │     [Asking: Did any L1 change happen in window?]
  │     │  │     Count > 0? → shouldExtend = TRUE
  │     │  │
  │     │  │  Option B: triggerType = 'BID_RECEIVED'
  │     │  │  │
  │     │  │  └─ Query:
  │     │  │     SELECT COUNT(*) FROM bids
  │     │  │     WHERE rfqId = X
  │     │  │     AND submittedAt >= windowStart
  │     │  │     [Asking: Did any bid come in window?]
  │     │  │     Count > 0? → shouldExtend = TRUE
  │     │  │
  │     │  │  Option C: triggerType = 'ANY_RANK_CHANGE'
  │     │  │  │
  │     │  │  └─ Query:
  │     │  │     SELECT COUNT(*) FROM auction_events
  │     │  │     WHERE rfqId = X
  │     │  │     AND eventType = 'BID_SUBMITTED'
  │     │  │     AND createdAt >= windowStart
  │     │  │     [Asking: Did any rank change in window?]
  │     │  │     Count > 0? → shouldExtend = TRUE
  │     │  │
  │     │  └─ IF shouldExtend = TRUE THEN
  │     │     │
  │     │     ├─ Calculate new close time:
  │     │     │  newCloseTime = bidCloseTime + Y minutes
  │     │     │
  │     │     ├─ Apply hard cap:
  │     │     │  IF newCloseTime > forcedCloseTime:
  │     │     │    finalTime = forcedCloseTime
  │     │     │  ELSE:
  │     │     │    finalTime = newCloseTime
  │     │     │
  │     │     ├─ Update database:
  │     │     │  oldTime = bidCloseTime
  │     │     │  UPDATE rfqs SET bidCloseTime = finalTime
  │     │     │
  │     │     ├─ Log event:
  │     │     │  INSERT INTO auction_events:
  │     │     │    type = TIME_EXTENDED
  │     │     │    oldCloseTime = oldTime
  │     │     │    newCloseTime = finalTime
  │     │     │    triggeredBy = (L1_RANK_CHANGE or others)
  │     │     │    description = "Extended +5 min (L1 change)"
  │     │     │
  │     │     └─ Broadcast to all clients:
  │     │        io.to(rfqId).emit('auction:time-extended', {
  │     │          rfqId,
  │     │          newCloseTime: finalTime,
  │     │          extensionMinutes: Y,
  │     │          reason: triggeredBy,
  │     │          oldCloseTime
  │     │        })
  │     │        [Clients update timer]
  │     │        [Activity log shows extension]
  │     │
  │     └─ IF NOT IN WINDOW:
  │        (Skip extension check, continue to closure)
  │
  ├─ CHECK 3: RE-FETCH Fresh State
  │  │
  │  │  (CRITICAL: Must use fresh data after extension)
  │  │
  │  └─ SELECT * FROM rfqs WHERE id = X
  │     newRfq = result
  │     (now bidCloseTime might be updated!)
  │
  ├─ CHECK 4: Closure Decision
  │  │
  │  ├─ IF now >= newRfq.forcedCloseTime THEN
  │  │  │
  │  │  ├─ UPDATE rfqs SET status = 'FORCE_CLOSED'
  │  │  │
  │  │  ├─ INSERT INTO auction_events:
  │  │  │   type: AUCTION_FORCE_CLOSED
  │  │  │   description: "Forced close time reached"
  │  │  │
  │  │  └─ Broadcast:
  │  │     io.to(rfqId).emit('auction:status-changed', {
  │  │       rfqId, status: 'FORCE_CLOSED'
  │  │     })
  │  │
  │  ├─ ELSE IF now >= newRfq.bidCloseTime THEN
  │  │  │
  │  │  ├─ UPDATE rfqs SET status = 'CLOSED'
  │  │  │
  │  │  ├─ INSERT INTO auction_events:
  │  │  │   type: AUCTION_CLOSED
  │  │  │   description: "Normal auction closed"
  │  │  │
  │  │  └─ Broadcast:
  │  │     io.to(rfqId).emit('auction:status-changed', {
  │  │       rfqId, status: 'CLOSED'
  │  │     })
  │  │
  │  └─ ELSE:
  │     Stay ACTIVE, continue running
  │
  └─ END of for loop

[Next iteration in 30 seconds...]
```

---

## Part 3: Frontend State Management

```
┌────────────────────────────────────────────────────────────────┐
│               ZUSTAND GLOBAL STATE STORE                       │
│               (frontend/src/store/auctionStore.js)             │
└────────────────────────────────────────────────────────────────┘

STATE OBJECT:
{
  // Auth
  user: {
    id: 'abc123',
    name: 'Kanwal Sharma',
    email: 'kanwal@amazon.com',
    role: 'BUYER',
    company: 'Amazon',
    carrierName: null
  },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  
  // RFQs
  rfqs: [
    {
      id: 'rfq-1',
      name: 'Mumbai-Dubai',
      status: 'ACTIVE',
      bidStartTime: '2026-03-28T15:45:00+05:30',
      bidCloseTime: '2026-03-28T16:05:00+05:30',
      forcedCloseTime: '2026-03-28T16:30:00+05:30',
      ...
    },
    ...
  ],
  
  // Current Auction Detail
  currentRfq: {
    id: 'rfq-1',
    ...full RFQ object,
    bids: [
      { id: 'bid-1', supplierId: 'supplier-1', totalCharges: 73000, rank: 1, isLatest: true },
      { id: 'bid-2', supplierId: 'supplier-2', totalCharges: 75000, rank: 2, isLatest: true },
      ...
    ]
  },
  
  // Event Log
  events: [
    { id: 'evt-1', rfqId: 'rfq-1', eventType: 'BID_SUBMITTED', createdAt, ... },
    { id: 'evt-2', rfqId: 'rfq-1', eventType: 'TIME_EXTENDED', oldCloseTime, newCloseTime, ... },
    ...
  ],
  
  // Loading states
  loading: false,
  error: null,
}

METHODS:
├─ setAuth(user, token)
│  └─ Called after login/signup
│     localStorage.setItem('user', JSON.stringify(user))
│     localStorage.setItem('token', token)
│
├─ logout()
│  └─ Called on 401 error or user clicks logout
│     localStorage.clear()
│     Back to /login
│
├─ setRfqs(rfqList)
│  └─ Called after fetching GE /api/rfqs
│     Populate rfqs array with all auctions
│
├─ setCurrentRfq(rfqDetail)
│  └─ Called when user clicks "View Auction"
│     GET /api/rfqs/:id
│     Store entire RFQ + bids + events
│
├─ addBid(newBid)
│  └─ Called on WebSocket bid:new event
│     Receives { bid, l1Changed }
│     Logic: Dedup by supplierId (remove old, keep latest)
│     Update state.currentRfq.bids array
│     UI re-renders instantly
│
├─ updateRanks(newBids)
│  └─ Called when rank recalculation needed
│     Get new ranking order
│     updateRanks(sortedBids)
│
├─ addEvent(newEvent)
│  └─ Called on WebSocket event
│     Received: { eventType, description, ... }
│     prepend to state.events array (newest first)
│     UI re-renders activity log
│
└─ setLoading(bool), setError(msg)
   └─ UI feedback states
```

---

## Part 4: WebSocket Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│         Socket.IO Connection & Event Flow                   │
└─────────────────────────────────────────────────────────────┘

CLIENT (Browser) Connection Init:
├─ import io from 'socket.io-client'
├─ const socket = io(BACKEND_URL, {
│   autoConnect: false        ← Don't connect yet (lazy)
│ })
│
└─ On component mount (useEffect):
   socket.connect()           ← Connect now
   socket.emit('join:auction', { rfqId })
   └─ Server receives: User wants to watch RFQ-123

SERVER Side:
├─ socket.on('join:auction', (data) => {
│   socket.join(`rfq-${data.rfqId}`)
│   └─ Add this client to room: "rfq-rfq-123"
│   └─ Now broadcasts to this room will reach client
│ })

BROADCAST (after bid submitted):
├─ io.to(`rfq-${rfqId}`).emit('bid:new', {
│   bid: {
│     id, supplierId, totalCharges, rank, isLatest
│   },
│   l1Changed: true/false
│ })
│
└─ All clients in room "rfq-rfq-123" receive

CLIENT Receives:
├─ socket.on('bid:new', (data) => {
│   auctionStore.addBid(data.bid)     ← Zustand update
│   UI re-renders rankings table
│   New bid appears with rank
│ })

BROADCAST (after extension):
├─ io.to(`rfq-${rfqId}`).emit('auction:time-extended', {
│   rfqId,
│   newCloseTime: '2026-03-28T16:05:00+05:30',
│   extensionMinutes: 5,
│   reason: 'L1_RANK_CHANGE',
│   oldCloseTime: '2026-03-28T16:00:00+05:30'
│ })

CLIENT Receives:
├─ socket.on('auction:time-extended', (data) => {
│   state.currentRfq.bidCloseTime = data.newCloseTime
│   CountdownTimer component: recalc remaining time
│   Activity log: append new event
│   → "🔔 Extended +5 min (L1 Rank Change)"
│   → "Old: 4:00 PM → New: 4:05 PM"
│ })

BROADCAST (status change):
├─ io.to(`rfq-${rfqId}`).emit('auction:status-changed', {
│   rfqId,
│   status: 'ACTIVE'  or 'CLOSED' or 'FORCE_CLOSED'
│ })

CLIENT Receives:
├─ socket.on('auction:status-changed', (data) => {
│   state.currentRfq.status = data.status
│   useEffect() sees status change:
│     - Re-render status badge (color changes)
│     - Re-render button (enabled/disabled)
│     - Re-render timer label ("CLOSES IN" vs "STARTED")
│   Layout updates!
│ })

CONNECTION CLEANUP (component unmount):
├─ socket.emit('leave:auction', { rfqId })
├─ socket.disconnect()
└─ Stop listening, clean up
```

---

## Part 5: Database Relationships

```
┌──────────────────────────────────────────────────────────────┐
│              PostgreSQL ER Diagram                           │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐
│     USERS       │
├─────────────────┤
│ id (PK)         │──┐
│ name            │  │
│ email (unique)  │  │
│ passwordHash    │  │
│ role (enum)     │  │
│ company         │  │       ┌─────────────────┐
│ carrierName     │  │       │      RFQS       │
└─────────────────┘  │       ├─────────────────┤
                     └──────→| id (PK)         │
                             | referenceId     │
                             | buyerId (FK)────┘
                             | bidStartTime    │
                             | bidCloseTime    │
                             | forcedCloseTime │
                             | status (enum)   │
                             └─────────────────┘
                                      │
                    ┌─────────────────┼────────────────┐
                    │                 │                │
                    ▼                 ▼                ▼
        ┌──────────────────┐  ┌────────────────┐  ┌─────────────────┐
        │ AUCTION_CONFIGS  │  │     BIDS       │  │ AUCTION_EVENTS  │
        ├──────────────────┤  ├────────────────┤  ├─────────────────┤
        │ id (PK)          │  │ id (PK)        │  │ id (PK)         │
        │ rfqId (FK,uniq)──┘  │ rfqId (FK)─────┘  │ rfqId (FK)──────┘
        │ triggerWindowX   │  │ supplierId (FK)   │ eventType       │
        │ extensionDuration   │ carriersName    │  │ actorId         │
        │ triggerType      │  │ freightCharges  │  │ description     │
        └──────────────────┘  │ originCharges   │  │ oldCloseTime    │
                              │ destinationCh   │  │ newCloseTime    │
                              │ totalCharges    │  │ triggeredBy     │
                              │ transitTime     │  │ createdAt       │
                              │ quoteValidity   │  └─────────────────┘
                              │ rank            │
                              │ isLatest (idx)  │
                              │ submittedAt     │
                              └────────────────┘
                                      │
                              [INDEX: (rfqId, isLatest)]
                              [INDEX: (rfqId, supplierId)]

FOREIGN KEY Relationships:
├─ rfqs.buyerId → users.id
├─ bid.rfqId → rfqs.id
├─ bids.supplierId → users.id
├─ auction_configs.rfqId → rfqs.id (unique)
├─ auction_events.rfqId → rfqs.id
└─ auction_events.actorId → users.id (nullable)

CRITICAL INDEXES:
├─ bids (rfqId, isLatest) ← Fast latest bid per supplier
├─ bids (rfqId, supplierId) ← Prevent dup active bids
├─ auction_events (rfqId, createdAt) ← Timeline queries
└─ rfqs (status, bidCloseTime) ← Cron queries
```

---

## Part 6: API Request/Response Examples

### **POST /api/rfqs - Create RFQ**

```
REQUEST:
POST /api/rfqs
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "Mumbai to Dubai Export",
  "buyerId": "user-123",
  "pickupDate": "2026-04-01",
  "bidStartTime": "2026-03-28T15:45:00+05:30",
  "bidCloseTime": "2026-03-28T16:00:00+05:30",
  "forcedCloseTime": "2026-03-28T16:30:00+05:30",
  "config": {
    "triggerWindowX": 10,
    "extensionDurationY": 5,
    "triggerType": "L1_RANK_CHANGE"
  }
}

BACKEND VALIDATION:
1. JWT valid? ✓
2. bidStartTime < bidCloseTime? ✓
3. bidCloseTime < forcedCloseTime? ✓
4. buyerId matches user.id? ✓

If bidStartTime > now:
  status = 'DRAFT'
Else:
  status = 'ACTIVE'

RESPONSE:
200 OK
{
  "id": "rfq-abc123",
  "referenceId": "RFQ-2026-001",
  "name": "Mumbai to Dubai Export",
  "buyerId": "user-123",
  "bidStartTime": "2026-03-28T15:45:00+05:30",
  "bidCloseTime": "2026-03-28T16:00:00+05:30",
  "forcedCloseTime": "2026-03-28T16:30:00+05:30",
  "status": "DRAFT",
  "config": {
    "triggerWindowX": 10,
    "extensionDurationY": 5,
    "triggerType": "L1_RANK_CHANGE"
  },
  "createdAt": "2026-03-28T15:30:00Z"
}
```

---

### **POST /api/rfqs/:id/bids - Submit Bid**

```
REQUEST:
POST /api/rfqs/rfq-abc123/bids
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "carrierName": "DHL Express",
  "freightCharges": 80000,
  "originCharges": 5000,
  "destinationCharges": 3000,
  "transitTime": 5,
  "quoteValidity": "2026-04-05"
}

BACKEND LOGIC:
1. Verify JWT → user = Supplier-XYZ
2. Fetch RFQ:
   - status = 'ACTIVE'? ✓
   - now < bidCloseTime? ✓
3. Mark old bids is Latest=false
4. Insert new bid with isLatest=true
5. Recalculate ranks
6. Detect L1 change
7. Broadcast WebSocket

RESPONSE:
200 OK
{
  "bid": {
    "id": "bid-xyz123",
    "rfqId": "rfq-abc123",
    "supplierId": "supplier-xyz",
    "carrierName": "DHL Express",
    "freightCharges": 80000,
    "originCharges": 5000,
    "destinationCharges": 3000,
    "totalCharges": 88000,
    "transitTime": 5,
    "quoteValidity": "2026-04-05",
    "rank": 1,
    "isLatest": true,
    "submittedAt": "2026-03-28T15:55:00Z"
  },
  "rankings": [
    { rank: 1, supplierId: '...', totalCharges: 88000 },
    { rank: 2, supplierId: '...', totalCharges: 92000 },
  ],
  "l1Changed": true,
  "timerId": "extended_3min"
}

WebSocket Event (to all clients in room):
bid:new {
  bid: { ...full bid object },
  l1Changed: true
}
```

---

### **GET /api/rfqs/:id - Get RFQ Detail**

```
REQUEST:
GET /api/rfqs/rfq-abc123
Authorization: Bearer eyJhbGc...

BACKEND LOGIC:
1. Verify JWT
2. Fetch RFQ with full config
3. Fetch latest bids (isLatest=true) for this RFQ
4. Fetch events (activity log)
5. Calculate rankings (sort by totalCharges)

RESPONSE:
200 OK
{
  "rfq": {
    "id": "rfq-abc123",
    "name": "Mumbai to Dubai Export",
    "status": "ACTIVE",
    "bidStartTime": "2026-03-28T15:45:00+05:30",
    "bidCloseTime": "2026-03-28T16:05:00+05:30",  ← Extended
    "forcedCloseTime": "2026-03-28T16:30:00+05:30",
    "originalCloseTime": "2026-03-28T16:00:00+05:30",
    "config": {
      "triggerWindowX": 10,
      "extensionDurationY": 5,
      "triggerType": "L1_RANK_CHANGE"
    }
  },
  "bids": [
    {
      "rank": 1,
      "supplierId": "supplier-1",
      "carrierName": "DHL Express",
      "freightCharges": 80000,
      "originCharges": 5000,
      "destinationCharges": 3000,
      "totalCharges": 88000,
      "transitTime": 5,
      "quoteValidity": "2026-04-05",
      "isLatest": true
    },
    {
      "rank": 2,
      "supplierId": "supplier-2",
      "carrierName": "FedEx",
      "freightCharges": 85000,
      "originCharges": 4000,
      "destinationCharges": 3000,
      "totalCharges": 92000,
      "transitTime": 7,
      "quoteValidity": "2026-04-10",
      "isLatest": true
    }
  ],
  "events": [
    {
      "id": "evt-123",
      "eventType": "TIME_EXTENDED",
      "createdAt": "2026-03-28T15:55:00Z",
      "oldCloseTime": "2026-03-28T16:00:00+05:30",
      "newCloseTime": "2026-03-28T16:05:00+05:30",
      "triggeredBy": "L1_RANK_CHANGE",
      "description": "Extended +5 min (L1 Rank Change)"
    },
    {
      "id": "evt-122",
      "eventType": "BID_SUBMITTED",
      "createdAt": "2026-03-28T15:45:00Z",
      "description": "DHL bid ₹88,000 submitted"
    }
  ]
}
```

---

This completes the architectural deep dive! Every component, every database operation, every WebSocket event, and every real-time flow explained in detail. 🚀
