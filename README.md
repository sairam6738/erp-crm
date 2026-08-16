# Mini ERP + CRM Operations Portal

A 48-hour case-study implementation based on the supplied Full Stack Developer Case Study.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL
- Authentication: JWT
- Validation: Zod

## Core business flow
Customer → Product/Stock → Sales Challan → Confirm Challan → Reduce Stock

## Roles
- ADMIN
- SALES
- WAREHOUSE
- ACCOUNTS

## Local setup

### 1. Database
Create a PostgreSQL database named `mini_erp`.

Run:

```bash
psql mini_erp < backend/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run build
npx tsx seed.ts
npm run dev
```

### 3. Frontend

Open another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Demo credentials

All demo users use:

`Password123`

- admin@example.com
- sales@example.com
- warehouse@example.com
- accounts@example.com

## API

- POST `/api/auth/login`
- GET/POST `/api/customers`
- GET/POST/PUT `/api/products`
- GET `/api/products/movements/all`
- GET/POST `/api/challans`
- PUT `/api/challans/:id/confirm`

## Important business logic

A Draft challan does not reduce stock.

When a Draft challan is confirmed:
1. The backend starts a database transaction.
2. Each product row is locked.
3. Available stock is checked.
4. If stock is insufficient, the transaction is rolled back.
5. Otherwise stock is reduced.
6. An OUT stock movement is recorded.
7. The challan becomes Confirmed.

Challan items store product snapshot data (name, SKU and unit price) so historical challans do not depend only on the current product record.

## Environment variables

Backend:
- PORT
- DATABASE_URL
- JWT_SECRET
- CLIENT_URL

Frontend:
- VITE_API_URL

## Assumptions / limitations

This MVP focuses on the required core flow. It intentionally does not implement optional bonus features such as Docker, GitHub Actions, PDF invoice export, or AWS S3 product image uploads.

For production, add stronger password policies, refresh tokens, audit logging, rate limiting, more granular permissions, automated tests, and stronger transactional sequence generation for challan numbers.
