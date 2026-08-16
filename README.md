# Mini ERP + CRM Operations Portal

A full-stack **Mini ERP + CRM Operations Portal** for managing customers, products, inventory, sales challans, and user access in a single application.

## Technology Stack

* **Frontend:** React + TypeScript + Vite
* **Backend:** Node.js + TypeScript + Express
* **Database:** PostgreSQL
* **Authentication:** JWT
* **Validation:** Zod
* **API Testing:** Postman

## Core Business Flow

```text
Customer
   ↓
Product / Inventory
   ↓
Sales Challan
   ↓
Confirm Challan
   ↓
Reduce Stock
   ↓
Record Stock Movement
```

## Modules

### CRM - Customer Management

The CRM module manages customer information and follow-ups.

Features include:

* Create customers
* View customers
* Search customers
* Update customer information
* Customer type management
* Customer status management
* GST information
* Address management
* Follow-up date
* Follow-up notes

### ERP - Product Management

The product module manages products and their inventory information.

Features include:

* Create products
* View products
* Update products
* SKU management
* Category management
* Unit price
* Current stock
* Minimum stock level
* Warehouse assignment

### Inventory Management

The inventory module tracks stock availability and stock movements.

Features include:

* Stock IN movements
* Stock OUT movements
* Current stock tracking
* Low-stock identification
* Warehouse tracking
* Stock movement history

### Sales Challan Management

The challan module manages the sales transaction flow.

Features include:

* Create sales challans
* Select customers
* Add products
* Specify quantities
* Save challans as Draft
* Confirm challans
* Track challan status
* Automatically reduce stock after confirmation
* Record stock movement after confirmation

## User Roles

The application supports role-based access control.

* **ADMIN** - Full system access
* **SALES** - Customer and sales-related operations
* **WAREHOUSE** - Product and inventory-related operations
* **ACCOUNTS** - Accounts and transaction-related operations

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sairam6738/erp-crm.git
cd erp-crm
```

### 2. Database Setup

Create a PostgreSQL database named:

```text
mini_erp
```

Run the database schema:

```bash
psql mini_erp < backend/schema.sql
```

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run build
npx tsx seed.ts
npm run dev
```

### 4. Frontend Setup

Open another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the Vite URL displayed in the terminal.

## Demo Credentials

All demo users use:

```text
Password123
```

Available demo accounts:

```text
admin@example.com
sales@example.com
warehouse@example.com
accounts@example.com
```

## API Endpoints

### Authentication

```text
POST /api/auth/login
```

### Customers

```text
GET  /api/customers
GET  /api/customers/:id
POST /api/customers
PUT  /api/customers/:id
```

### Products

```text
GET  /api/products
GET  /api/products/:id
POST /api/products
PUT  /api/products/:id
```

### Inventory

```text
GET /api/products/movements/all
```

### Sales Challans

```text
GET  /api/challans
GET  /api/challans/:id
POST /api/challans
PUT  /api/challans/:id/confirm
```

## Important Business Logic

### Draft Challan

Creating a Draft challan does **not** reduce product stock.

### Confirming a Challan

When a Draft challan is confirmed:

1. The backend starts a database transaction.
2. Product rows are locked.
3. Available stock is checked.
4. If stock is insufficient, the transaction is rolled back.
5. If sufficient stock is available, stock is reduced.
6. An `OUT` stock movement is recorded.
7. The challan status changes to `Confirmed`.

### Historical Product Snapshot

Challan items store snapshot information such as:

* Product name
* SKU
* Unit price

This ensures historical challans remain accurate even when the current product information changes later.

## Environment Variables

### Backend

```text
PORT
DATABASE_URL
JWT_SECRET
CLIENT_URL
```

### Frontend

```text
VITE_API_URL
```

Do not commit real `.env` files or secrets to the repository.

## Project Structure

```text
erp-crm/
├── backend/
│   ├── src/
│   ├── schema.sql
│   ├── seed.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── postman/
│   └── mini-erp.postman_collection.json
│
├── README.md
└── .gitignore
```

## Postman

A Postman collection is included for testing the backend APIs:

```text
postman/mini-erp.postman_collection.json
```

It can be imported into Postman to test authentication, customers, products, inventory, and challan APIs.

## Current Scope

This project currently focuses on the core ERP + CRM workflow:

* Authentication
* Role-based authorization
* Customer management
* Product management
* Inventory management
* Stock movement tracking
* Sales challan management
* Automatic stock reduction
* PostgreSQL integration
* REST APIs
* Postman API collection

## Assumptions and Limitations

This project focuses on the required core workflow and does not currently include optional features such as:

* Docker
* GitHub Actions
* PDF invoice generation
* AWS S3 product image uploads

For production deployment, the application could additionally implement:

* Stronger password policies
* Refresh tokens
* Audit logging
* API rate limiting
* More granular permissions
* Automated tests
* Stronger challan-number generation
* Production monitoring and logging

## Project Status

**Mini ERP + CRM is an ongoing full-stack project.**

The core customer, product, inventory, authentication, and sales challan workflows are implemented and can be extended with additional business features.
