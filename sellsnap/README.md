# SellSnap

Link-based commerce for Nigerian small businesses. Sellers upload a product, get a unique payment link, and share it on WhatsApp or Instagram. Buyers click, see the product, and pay instantly. No store. No website. Just a link.

**Core promise:** Sell anything in seconds using just a link.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL |
| ORM | Prisma |
| Payment Gateway | Flutterwave |
| Styling | CSS Modules + CSS custom properties (design tokens) |
| Auth | NextAuth.js |
| Email | Resend |
| Hosting | Vercel |

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in credentials
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example`. All secrets live in `.env.local`. `FLW_SECRET_KEY` and `FLW_SECRET_HASH` must never be used in client-side code.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run db:clear:orders` | Clear test orders |

## Key Flows

- **Seller:** Signup → Dashboard → Create Product → Copy Link → Share on WhatsApp
- **Buyer:** Click link → View product → Pay on Flutterwave hosted page → Confirmation
- **System:** Webhook → signature verified → charge verified → order marked paid → seller notified

See `AGENTS.md` for the full project brief, data models, and business rules.