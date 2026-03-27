# 🏁 Comprehensive Production Testing Guide

Welcome to the British Auction RFQ System. This guide provides real-life scenarios to verify the system's robustness, security, and real-time capabilities.

---

## 🛡️ Phase 0: The First Mile (Onboarding & Identity)
**Goal:** Establish secure identities with role-specific profiles.

### 👩‍💼 Scenario A: The Corporate Buyer (Anita from Apple India)
1.  **Action**: Navigate to `http://localhost:5173/signup`.
2.  **Step**: Select the **BUYER** role button (it will highlight in blue).
3.  **Enter Details**:
    - **Full Name**: `Anita Deshmukh (Procurement Lead)`
    - **Work Email**: `anita.d@apple.com`
    - **Company**: `Apple India Pvt. Ltd.` (Notice: The "Carrier Name" field is **NOT** visible).
    - **Password**: `Security@2024`
4.  **Submit**: Click "Sign Up As BUYER".
5.  **Result**: You land in the **"Buyer Control Center"**. Look for the **"Create New RFQ"** button.

### 🚢 Scenario B: The Global Carrier (Vikram from Maersk)
1.  **Action**: Navigate to `http://localhost:5173/signup`.
2.  **Step**: Select the **SUPPLIER** role button.
3.  **Enter Details**:
    - **Full Name**: `Vikram Singh (Sales Director)`
    - **Work Email**: `vikram.s@maersk.com`
    - **Company**: `Maersk Logistics India`
    - **Carrier Name**: `Maersk / Safmarine` (Notice: This field **appears specifically for Suppliers**).
    - **Password**: `Carrier@2024`
4.  **Submit**: Click "Sign Up As SUPPLIER".
5.  **Result**: You land in the **"Supplier Marketplace"**. Notice the "Create New RFQ" button is **hidden**.

### 🔐 Scenario C: Returning to Workspace (Identity Persistence)
1.  **Logout**: Click the **"Logout"** button in the header.
2.  **Action**: Navigate to `http://localhost:5173/login`.
3.  **Step**: Login with Vikram's email (`vikram.s@maersk.com`).
4.  **Result**: Confirm you are recognized as a **Supplier** from **Maersk Logistics India**.

---

## 🏗️ Phase 1: RFQ Creation (The Buyer’s Demand)
**Objective:** Initiate a high-value shipment auction with precise logic.

### 📝 Parameter Logic Guide
| Parameter | How it Works | Real-Life Example |
| :--- | :--- | :--- |
| **Auction Title** | Display name for the RFQ. | `Semiconductors - Taiwan to Chennai` |
| **Pickup Date** | Planned cargo readiness date. | `2024-10-15` |
| **RFQ Ref. ID** | Unique ID for tracking. | `RFQ-992-ALPHA` |
| **Bidding Close** | The **Soft Deadline**. Can be extended. | `Today, 5:00 PM` |
| **Hard Cap** | The **Absolute Deadline**. Zero extensions after this. | `Today, 7:00 PM` |
| **Trigger Window** | The period (in mins) before Close where extensions happen. | `10 mins` |
| **Extension** | Amount of time added if a trigger occurs. | `5 mins` |
| **Trigger Event** | `L1 Rank`: Extend if lead changes. `Any Bid`: Extend on any bid. | `L1 Rank Change` |

### 🚀 Step-by-Step Action
1.  **Buyer Action**: As Anita, click **"Create New RFQ"**.
2.  **Logic Test**: Set **Bidding Close** to +5 mins and **Hard Cap** to +15 mins.
3.  **Checkpoint**: Confirm the auction appears as `ACTIVE`.

---

## ⚓ Phase 2: Open Market War (Supplier Bidding)
**Objective:** Compete for the lead (**L1 - Lowest Price**) position.

1.  **Enter Auction**: Login as Vikram (Supplier). In the "Marketplace", click on the **"Semiconductors - Taiwan to Chennai"** auction card.
2.  **Analyze Command Center**: 
    - **Left Section**: See the **Live Rankings** grid (currently empty).
    - **Right Section**: See the Auction Info, Timer, and **"Submit New Bid"** button.
3.  **Place Bid**: Click the blue **"Submit New Bid"** button.
    - **Sea Freight**: ₹75,000
    - **Origin/Dest**: ₹5,000 each.
    - **Transit Days**: `18` (Standard for Taiwan to Chennai is 15-20 days).
    - **Total**: ₹85,000.
4.  **Confirm 🥇 L1 Dominance**: 
    - Your name will appear in the grid with a **Gold 🥇 Crown**. 
    - Your row will have a **Vibrant Green Glow**.
    - The **Activity Feed** will show your new bid in real-time.

---

## 🔥 Phase 3: The Extension Logic (Real-time Battle)
**Objective:** Test the 10-minute trigger window.

1.  **Trigger**: Wait for the timer to drop below **10 minutes**.
2.  **Competition**: Login as a **different Supplier** (e.g., MSC).
3.  **Under-cut**: Submit a total bid of ₹98,000.
4.  **Result**: 
    - The timer **instantly adds 5 minutes**.
    - The Activity Feed logs: *"Time extended by 5 mins due to rank change/late bid."*

---

## ⌛ Phase 4: The Hard Cap (Forced Closure)
**Objective:** Ensure the auction ends at the absolute deadline.

1.  **Repetitive Bidding**: Continue outbidding each other in the last 2 minutes.
2.  **Forced Close**: Once the clock hits the **Forced Close Time**, the auction MUST end.
3.  **Result**: Status transitions from `ACTIVE` to `FORCE_CLOSED`. No further bids allowed.

---

## ✅ Final Quality Checklist
- [ ] **Data Density**: All currency uses `JetBrains Mono` font for perfect decimal alignment.
- [ ] **RBAC**: Suppliers **cannot** view "Create RFQ" and **cannot** view other suppliers' full bid details (only L1 price).
- [ ] **Urgency**: Timer shifts to **Amber** at <10m and **Red** at <2m.

---
*Developed by Antigravity - Logistics Intelligence System*
