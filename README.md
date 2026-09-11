# Mini ERP + CRM Operations Portal

A full-stack ERP and CRM operations portal for a wholesale/distribution business.

The application manages customers, CRM follow-ups, products, inventory, stock movements, and sales challans with role-based access control.

## Live Application

Frontend:
https://mini-erp-flame.vercel.app

Backend API:
http://16.171.9.131

GitHub Repository:
https://github.com/yuvan2451/mini-erp

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- HTML/CSS
- React Router

### Backend
- Node.js
- TypeScript
- Express.js
- REST APIs
- JWT Authentication
- Zod validation

### Database
- PostgreSQL
- AWS RDS

### Deployment
- Frontend: Vercel
- Backend: AWS EC2
- Database: AWS RDS
- Database password: AWS Secrets Manager
- Reverse proxy: Nginx
- Containerization: Docker

---

## Main Features

### Authentication and Roles

The application supports four roles:

- Admin
- Sales
- Warehouse
- Accounts

Authentication uses JWT tokens.

Different roles have access to different operations based on their responsibilities.

### Customer CRM

- Add customers
- Search customers
- View customer information
- Add follow-up records
- Track follow-up dates
- Customer types:
  - Retail
  - Wholesale
  - Distributor
- Customer status:
  - Lead
  - Active
  - Inactive

### Product and Inventory

- Add products
- Edit product information
- SKU management
- Category
- Unit price
- Current stock
- Minimum stock level
- Warehouse location
- Stock IN/OUT operations
- Stock movement history
- Low-stock tracking

### Sales Challans

- Create sales challan drafts
- Select customers
- Add multiple products
- Set product quantities
- Automatically generate challan numbers
- Confirm challans
- Cancel challans
- Automatically reduce stock when confirmed
- Prevent stock from becoming negative
- Store product snapshot information in challan items

---

## Project Structure

```text
mini-erp/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── db/
│   │   ├── types/
│   │   └── server.ts
│   │
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── vercel.json
│   ├── package.json
│   └── vite.config.ts
│
├── database/
│
├── postman/
│   └── Mini-ERP-API.postman_collection.json
│
├── docker-compose.yml
└── README.md