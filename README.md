# British Auction RFQ System

A production-grade real-time RFQ auction platform where Buyers create auctions and Suppliers compete with live bids.

## Overview
This project implements a British auction workflow for freight RFQs with:
- role-based access for Buyer and Supplier
- real-time bid updates
- automatic extension rules near close time
- hard cap forced close protection
- live ranking and activity timeline

## High Level Design
Architecture diagram:
- [Hld_arc.png](./Hld_arc.png)

Database schema document:
- [Db_schema.pdf](./Db_schema.pdf)

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, Zustand, Socket.IO Client
- Backend: Node.js, Express, Prisma ORM
- Database: PostgreSQL
- Real-time: Socket.IO
- Auth: JWT + role lookup via database
- Scheduler: 30-second cron monitoring

## Core Business Rules
- Bid starts only after Bid Start Time.
- Bid close can extend based on trigger configuration.
- Trigger window is calculated from current bid close time.
- Forced close time is a hard cap and cannot be crossed.
- Only latest bid per supplier participates in ranking.
- Extension check runs immediately on bid submit.

## Trigger Types
- BID_RECEIVED: any valid bid in trigger window can extend.
- ANY_RANK_CHANGE: any rank movement in trigger window can extend.
- L1_RANK_CHANGE: only top rank change in trigger window can extend.

## Real-time Events
- bid:new
- auction:time-extended
- auction:status-changed
- rfq:created
- rfq:status-changed

## Setup
1. Install dependencies in both backend and frontend folders.
2. Configure environment variables for backend and frontend.
3. Run Prisma migration or db push for backend.
4. Start backend server.
5. Start frontend dev server.

## Runtime Flow
1. Buyer creates RFQ with auction config.
2. Supplier submits bids in active window.
3. System recalculates ranks and logs events.
4. Extension engine evaluates trigger and updates close time.
5. WebSocket broadcasts updates to all connected clients.
6. Cron transitions DRAFT to ACTIVE and ACTIVE to CLOSED or FORCE_CLOSED.

## Notes
- This README is intentionally high-level.
- Detailed implementation is available directly in source code and schema documents.
