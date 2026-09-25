# SellSnap — Project Progress & Implementation Report

**Date:** July 29, 2026  
**Status:** MVP Fully Implemented & Type-Checked (0 Errors)

---

## 📌 Project Overview

SellSnap is a link-based commerce platform designed for Nigerian small business owners (Instagram vendors, WhatsApp sellers, freelancers). Sellers upload products, generate shareable payment links, and collect instant payments from customers without building a full store or website.

---

## 🛠️ Stack & Key Decisions

| Layer | Choice | Details |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | TypeScript in strict mode |
| **Styling** | CSS Modules + Design Tokens | Uses `tokens/tokens.css` custom properties only |
| **Database & ORM** | PostgreSQL + Prisma v5 | All money stored in **kobo** (integers) |
| **Auth** | NextAuth.js v5 | Credentials provider, 30-day session |
| **Payments** | Flutterwave | Hosted checkout + server-side webhook verification |
| **Image Storage** | Vercel Blob | Magic-byte MIME detection + 5MB size limit |
| **Email** | Resend | HTML seller sale notifications |
| **Mode** | Light mode only at launch | As requested |
| **Landing Page** | 100vh Minimalistic | Single viewport experience |

---

## 🟢 Implemented Features (Phases 1 – 8)

### 1. Scaffold & Foundations
- Created Next.js 15 App Router codebase in `sellsnap/`.
- Imported design token system in `app/globals.css`.
- Configured structured JSON logger (`lib/logger.ts`), env validator (`lib/env.ts`), Naira formatters (`lib/utils.ts`), collision-safe slug generator (`lib/slug.ts`), and in-memory rate limiter (`lib/rate-limit.ts`).

### 2. Database Schema (`prisma/schema.prisma`)
- `User`: Name, email, business name, password hash.
- `Product`: Name, description, price (in kobo), image URL, unique slug.
- `Order`: Product ID, buyer details, amount (in kobo), status (`pending`, `paid`, `failed`), unique transaction reference.
- `Payment`: Order ID, Flutterwave transaction reference, status, paid date — serves as the idempotency guard against duplicate webhooks.

### 3. Authentication (`app/(auth)`)
- Signup page (`/signup`) with Zod validation and bcrypt (12 rounds) password hashing.
- Login page (`/login`) with NextAuth v5 credentials integration and redirect feedback.
- Accessible form components (`Input`, `Button`, `Card`).

### 4. Seller Dashboard (`app/(dashboard)`)
- Responsive navigation: Sticky sidebar on desktop, fixed bottom bar (`DashboardNav`) on mobile.
- Dashboard Overview (`/dashboard`): Stats cards for products count, total orders, and total revenue in Naira.
- Products List (`/products`): Displays all seller products with copyable payment link buttons, WhatsApp share buttons, edit link, and delete action.
- Product Creation & Edit (`/products/new`, `/products/[id]/edit`): Image dropzone with live preview, Naira price input, and server actions.
- Orders Page (`/orders`): Displays buyer orders with status badges (`Paid`, `Pending`, `Failed`).
- Settings Page (`/settings`): Profile information update and password change forms.

### 5. Public Product Page & Checkout (`app/p/[slug]`)
- Server-rendered for fast loading without JavaScript.
- Complete Open Graph tags for WhatsApp link previews.
- Minimalist buyer checkout form (`CheckoutForm`) collecting optional buyer email/name and redirecting to Flutterwave.
- Soft unavailable state page (`ProductUnavailable`) displayed when a product is deleted (no raw 404).
- Payment Success Page (`/p/[slug]/success`) with 3-second polling against `/api/orders/[id]/status`.

### 6. Payments & Webhooks (`app/api/webhooks/flutterwave`)
- Endpoint handles Flutterwave webhooks safely:
  1. Signature check via `verif-hash` header.
  2. Transaction verification via Flutterwave GET API.
  3. Verification check of amount, currency (NGN), and `tx_ref`.
  4. Atomic DB transaction marking order `paid` and recording `Payment`.
  5. Idempotency guard: catches Prisma `P2002` constraint errors on duplicate webhooks and responds 200 silently.
  6. Email notification triggered via Resend (`lib/notifications.ts`).

---

## 🔍 Verification & Code Quality

- **TypeScript Verification**: `npx tsc --noEmit` executed with **0 errors**.
- **Prisma Client**: Prisma v5.22.0 client generated cleanly.
- **Security Audit**: No secret keys exposed to client; rate limits applied to auth & checkout; uploaded images validated at byte level.

---

## 🚀 Next Steps for Local Development & Deployment

1. **Environment Setup**:
   - Copy `.env.example` to `.env.local` inside `sellsnap/`.
   - Fill in actual values for `DATABASE_URL`, `NEXTAUTH_SECRET`, `FLW_SECRET_KEY`, `FLW_PUBLIC_KEY`, `FLW_SECRET_HASH`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and `NEXT_PUBLIC_APP_URL`.

2. **Database Migration**:
   - Run `npx prisma migrate dev --name init_sellsnap_schema` inside `sellsnap/` to create tables on your PostgreSQL instance.

3. **Run Dev Server**:
   - Run `npm run dev` inside `sellsnap/` and visit `http://localhost:3000`.

4. **Testing Payment Flow**:
   - Create a product in the seller dashboard.
   - Open the generated public link (`http://localhost:3000/p/<unique-slug>`).
   - Click **Pay Now** and use Flutterwave test card `4187427415564246` (PIN: `3310`, OTP: `12345`).
   - Deliver test webhook to `http://localhost:3000/api/webhooks/flutterwave` using standard test tools or Ngrok for local webhook testing.
