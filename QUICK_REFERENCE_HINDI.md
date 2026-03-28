# 📋 QUICK REFERENCE GUIDE

## What Does This Project Do? (1 Sentence)
Real-time auction platform jaha pe buyers freight quotes ke liye RFQ banate hain and suppliers competing bids dete hain with automatic extension kab last-minute L1 rank change hoti hai.

---

## Key Concepts

### 1. **RFQ (Request for Quotation)**
Buyer iska matlab: "Mujhe Mumbai se Dubai shipment ke liye quotes chahiye"
- Auction banate ho jisme suppliers bids dey sakte hain
- Status: DRAFT (abhi start nahi hua) → ACTIVE (bidding chalti hai) → CLOSED (khtam ho gaya)

### 2. **Bid**
Supplier iska matlab: "Main ye shipment ₹85,000 mein deliver kar dunga"
- har supplier sirf 1 latest bid count hota hai (old ones ignore)
- Sabko rank milti hai (L1 = sabse sasta, L2 = dusra sasta, etc)

### 3. **Extension**
System iska matlab: "Haan, last minute mein competing bid aaya, toh 5 aur minute bidding open rakh dunga"
- Prevent karta hai last-minute low bids ko
- But upper limit hoti hai (forced close time)

### 4. **Forced Close**
System iska matlab: "Yeh absolute deadline hai, jisse aage extension impossible"
- Buyer ko kab shipment deena hai, uske hisaab se set hota hai
- Example: 4:30 PM – aage bidding nahi hogi chahe koi bid in rahe

---

## Database: Key Tables

| Table | Matlab | Row ka matlab |
|-------|--------|---------------|
| **Users** | Log in varno kaise kaam chalegi | 1 row = 1 log-in account |
| **RFQs** | Buyer ka auction posting | 1 row = 1 shipment auction |
| **AuctionConfig** | Extension rules | Kaun-kaun se trigger se extend hoga |
| **Bids** | Supplier ke pricing offers | 1 row = 1 bid (sirf latest count) |
| **AuctionEvents** | Audit log (kya kya hua) | 1 row = 1 event ("Bid received", "Extended +5min") |

---

## Frontend Pages (React)

### **Page 1: Auction List / `/`**
Ye marketplace dashboard vo jo sab auctions dikha do

```
[+ Create RFQ]  ← Buyer ke liye hi

Table:
RFQ Name      | Status  | Close Time | L1 Price | View Details
Mumbai-Dubai  | ACTIVE  | 4:05 PM ↑  | ₹73k     | [Details]
Delhi-London  | CLOSED  | 3:00 PM    | ₹1.2L    | [Details]

Status badge colors:
🟠 DRAFT = Bidding abhi start nahi hua
🟢 ACTIVE = Bidding go ho rahi hai
⚪ CLOSED = Auction khtam ho gaya
```

### **Page 2: Auction Detail / `/auctions/:id`**
Ye live auction control center - jaha pe suppliers bid dete hain

```
Left (50%):
Rankings table:
L1 🥇 DHL ₹88k | Freight: ₹80k | Origin: ₹5k | ...
L2 🥈 FedEx ...

Middle (30%):
[ACTIVE] status
Mumbai-Dubai Shipment
Ref: RFQ-2026-001

CLOSES IN
00:03:45      ← Countdown (ya STARTS IN if DRAFT)

[====-----]  
Hard Cap: 4:20 PM

[Submit New Bid]  ← If ACTIVE and Supplier

Right (20%):
Activity Log:
• 3:58 PM — FedEx bid ₹92k
🔔 3:55 PM — Extended +5 min (L1 Change)
           Old: 4:00 → New: 4:05
• 3:45 PM — DHL bid ₹88k
```

---

## API Endpoints

### **Auth**
```
POST /api/auth/signup
  Input: { name, email, password, role, company, carrierName }
  Output: { user, token }

POST /api/auth/login
  Input: { email, password }
  Output: { user, token }
```

### **RFQs (Auctions)**
```
GET /api/rfqs
  Output: [ RFQ list with L1 bid ] - sirf active auction top bid dikha do

POST /api/rfqs
  Input: { name, bidStartTime, bidCloseTime, forcedCloseTime, config: {...} }
  Output: { rfq }
  Logic: If bidStartTime > now → status=DRAFT else ACTIVE

GET /api/rfqs/:id
  Output: { rfq details + latest bids per supplier (deduplicated) }
```

### **Bids (Pricing)**
```
POST /api/rfqs/:id/bids
  Input: { carrierName, freightCharges, originCharges, ... }
  Checks:
    1. RFQ status = ACTIVE?
    2. now < bidCloseTime?
    3. Supplier already has bid? → Mark old as isLatest=false
  Output: { bid, newRanks, l1Changed }
  Then: 
    - Calculate ranks
    - Broadcast WebSocket bid:new
    - Trigger extension check

GET /api/rfqs/:id/bids
  Output: [ Rankings with only latest bid per supplier ]
```

---

## WebSocket Events (Real-time)

```
CLIENT sends:
├─ join:auction { rfqId }
   ↳ Server: subscribe client ko us auction room mein

SERVER sends:
├─ bid:new { bid, l1Changed }
   ↳ When: New bid submit
   ↳ Effect: Clients update rankings table instantly

├─ auction:time-extended { newCloseTime, reason, oldCloseTime }
   ↳ When: Extension trigger fires
   ↳ Effect: Timer update + activity log mein "Extended +5min"

├─ auction:status-changed { rfqId, status }
   ↳ When: DRAFT→ACTIVE, ACTIVE→CLOSED, etc
   ↳ Effect: Page UI update (button states, badges)
```

---

## Cron Job (Every 30 seconds)

```
For each ACTIVE or DRAFT auction:

1. If DRAFT and now >= bidStartTime:
   → Update status = ACTIVE
   → Send: auction:status-changed
   → Log: AUCTION_STARTED

2. If ACTIVE:
   → Check: Is now in trigger window?
             (10 minutes before bidCloseTime)
   → Check trigger type:
       - L1_RANK_CHANGE: Any L1 change bid in window?
       - BID_RECEIVED: Any bid in window?
       - ANY_RANK_CHANGE: Any rank change in window?
   → If YES: Extend bidCloseTime += extensionDuration
             BUT cap it at forcedCloseTime (never exceed!)
             Send: auction:time-extended
             Log: TIME_EXTENDED event

3. After extension handling:
   → Fresh fetch RFQ from DB
   → Check: now >= forcedCloseTime?
       ✓ YES: status = FORCE_CLOSED
       ✓ NO: Check now >= bidCloseTime?
             • YES: status = CLOSED
             • NO: Stay ACTIVE
```

---

## Example: DHL ek bid deta hai

```
FRONTEND:
Supplier form me fill karte ho:
├─ Carrier: "DHL Express"
├─ Freight: ₹80,000
├─ Origin: ₹5,000
├─ Destination: ₹3,000
├─ Total: ₹88,000 (auto)
├─ Transit: 5 days
└─ Validity: 05-04-2026

Supplier: [Submit Bid] click

BACKEND:
1. Validate: RFQ=ACTIVE? now < bidCloseTime? ✓
2. Old bids: DHL ki purani bids ke isLatest=false mark karo
3. New bid: { supplierId: DHL, totalCharges: 88000, isLatest: true }
4. Recalculate ranks:
   - Fresh query: isLatest=true wale sab bids
   - Sort by totalCharges ascending
   - Assign rank 1, 2, 3...
5. Check L1 change:
   - Pichla L1 tha kon? Ab kon hai?
   - Agar different: triggeredBy = 'L1_RANK_CHANGE'
6. Log event: BID_SUBMITTED
7. Broadcast to all connected clients:
   - bid:new + newRanks

FRONTEND (ALL CLIENTS):
├─ Rankings table update (DHL ko L1 dikha gaya ya nahi)
├─ Activity log: "+ DHL ₹88k bid"
├─ If L1 change + in trigger window:
   ├─ Timer countdown reset
   ├─ Activity log: "🔔 Extended +5 min (L1 Change)"
   └─ Pulse animation on table
```

---

## Status Lifecycle (State Machine)

```
Creation time → bidStartTime > now
├─ CREATE: status = DRAFT

Cron @ bidStartTime passes
├─ DRAFT → ACTIVE (auto)

Cron @ bidCloseTime passes (but < forcedCloseTime)
├─ ACTIVE → CLOSED

Cron @ forcedCloseTime passes
├─ ACTIVE → FORCE_CLOSED (ya CLOSED se FINAL)

Manual: Always blocked once > bidCloseTime
```

---

## Important Fields

### RFQ
```
| Field | Type | Matlab |
|-------|------|---------|
| bidStartTime | Datetime | Bidding kb shuru hogi |
| bidCloseTime | Datetime | Normally bidding kb band hogi (extend ho sakti hai) |
| forcedCloseTime | Datetime | Buyer ka absolute deadline (kab shipment dejna hai) |
| originalCloseTime | Datetime | Pichla bidCloseTime record karne ke liye (track extensions) |
| status | ENUM | DRAFT/ACTIVE/CLOSED/FORCE_CLOSED |
```

### Bid
```
| Field | Type | Matlab |
|-------|------|---------|
| totalCharges | Float | ₹ mein total quote |
| rank | Int | L1=1, L2=2, L3=3 (compute kiya hota hai) |
| isLatest | Boolean | Yeh supplier ka current bid hai? |
| submittedAt | Datetime | Kab bid diya tha |
```

---

## Timezone: Muhim Detail

```
PROBLEM:
Buyer: "4:00 PM mujhe chahiye"
Frontend: "2026-03-28T16:00" (no timezone)
Backend: Assumes UTC? IST? → MISMATCH!
Result: 16:00 IST ≠ 16:00 UTC (4.5 hours ka farak!)

SOLUTION:
Backend parseRfqDateTime():
  → Parse as IST: new Date("2026-03-28T16:00:00+05:30")
  → Consistent

Frontend display:
  → toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  → Always IST timezone use karo
  → No confusion!
```

---

## Security

```
1. Password: bcryptjs (hashed, never plaintext)
2. Auth: JWT tokens (7-day expiry)
3. Roles: BUYER vs SUPPLIER (routes protected)
4. DB: Foreign keys + unique indexes (data integrity)
5. 401 Error: Auto-redirect to login
6. Validation: Zod schema checks (bad data blocked)
```

---

## Performance Tips

```
1. Cron runs every 30s (not continuous) → CPU efficient
2. WebSocket rooms (io.to(rfqId)) → Only auction subscribers get updates
3. isLatest index → Fast ranking queries
4. Fresh RPCFetch after extension → Prevent stale state bugs
5. React 18 concurrent rendering → Smooth UI updates
```

---

## Common Scenarios

### Scenario 1: "Auction khatm ho gaya, supplier abhi bid de raha hai"
```
Supplier clicks [Submit]
Backend: Check status = ACTIVE?
Response: 🚫 409 (Auction closed)
Supplier sees: "Auction is closed" error
```

### Scenario 2: "Buyer ne forced close time set ki 4:30, par auction 4:35 tak chal raha hai"
```
Cron @ 4:30:
├─ status = FORCE_CLOSED
├─ No more bids accepted
├─ All clients notified
Supplier @ 4:35 clicks [Submit]:
├─ Backend: 🚫 409 (Forced closed)
```

### Scenario 3: "5 minute extension ho kabana, par bidding abhi 5 minute baqi hai"
```
Window = 4:55-5:00 (before 5:00 PM close)
Bid @ 4:58 PM:
├─ In window? ✓ YES
├─ Extend: 5:00 + 5 = 5:05 PM
├─ 5:05 > forced close (5:30)? NO → Allowed!
├─ Activity log: "Extended +5 min"
```

### Scenario 4: "DRAFT auction tha, ab auto-start ho gaya"
```
Created: 2:00 PM with bidStartTime = 3:00 PM
Status: DRAFT, button disabled
Cron @ 3:00 PM:
├─ status = DRAFT AND now >= bidStartTime?
├─ YES: update status = ACTIVE
├─ Broadcast: auction:status-changed
Suppliers see:
├─[ACTIVE] badge on list
├─ "CLOSES IN" countdown on detail
├─ [Submit Bid] button enabled!
```

---

## Debugging Quick Tips

```
Issue: "Supplier bid submit nahi ho raha"
Debug:
  1. RFQ status = ACTIVE? (check list page badge)
  2. now < bidCloseTime? (timer > 0?)
  3. Is it past forcedCloseTime? (check hard cap)
  4. Check backend logs: 409 = Auction state issue

Issue: "Ranking mein ek supplier 2 baar dikha"
Debug:
  1. Check isLatest field in DB
  2. Query should filter: WHERE isLatest = true
  3. Database ko purge old bids

Issue: "Timer 16:00 show hota hai but it's actually 10:30 PM"
Debug:
  1. Timezone mismatch
  2. Ensure all datetime values have +05:30 offset
  3. Check toLocaleString options: timeZone: 'Asia/Kolkata'

Issue: "Extension nahi ho raha even though L1 changed"
Debug:
  1. Is bid in trigger window? (within X min before close)
  2. Check cron logs: What time did bid come?
  3. Check AuctionConfig: Is trigger type correct?
  4. Check event logging: Did system record L1_RANK_CHANGE?
```

---

## File Structure Quick Map

```
backend/
├─ src/
│  ├─ index.js ← Server + Cron setup
│  ├─ routes/
│  │  ├─ auth.routes.js ← Login/Signup
│  │  ├─ rfq.routes.js ← RFQ CRUD
│  │  └─ bid.routes.js ← Bid submit + ranking
│  ├─ services/
│  │  └─ auctionExtension.engine.js ← Extension logic
│  └─ middlewares/
│     └─ auth.middleware.js ← JWT verify
│
frontend/
├─ src/
│  ├─ pages/
│  │  ├─ AuctionListPage.jsx ← Marketplace
│  │  ├─ AuctionDetailPage.jsx ← Live auction
│  │  └─ LoginPage.jsx
│  ├─ components/
│  │  └─ auction/
│  │     └─ CountdownTimer.jsx ← 00:04:32 display
│  ├─ hooks/
│  │  └─ useAuctionSocket.js ← WebSocket listener
│  ├─ store/
│  │  └─ auctionStore.js ← Zustand state
│  └─ lib/
│     ├─ api.js ← Axios + 401 handling
│     └─ socket.js ← Socket.IO init
```

---

## Summary: 3-Sentence Pitch

This is a **real-time competitive bidding platform** for freight logistics. **Buyers post shipment quotes (RFQs) and suppliers submit bids** while a live countdown timer ticks down. **The system automatically extends the deadline** if a better bid comes in near the closing moment, but puts a hard cap to ensure buyers can actually plan their deliveries.

**That's it. That's the whole system.** 🚀
