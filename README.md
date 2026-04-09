# Team Orders — Weekly B2B Catering

**Built and proven in production at Vanda's Kitchen.** The system Vanda's Kitchen uses to serve Accenture and Red Bull.

A complete B2B weekly order management system for Shopify. Customers select which days their team needs catering, quantities per day, see live pricing and allergen warnings, and add a full weekly order to cart in one click. Works for offices, corporate clients, restaurants, meal prep, and any food business taking scheduled pre-orders.

---

## Plans

| Plan       | Price       | Key Features |
|------------|-------------|--------------|
| Free       | $0/month    | Basic day selector, up to 5 days, no discount tiers |
| Starter    | $39/month   | Full day selector, minimum order enforcement, team notes, advance notice rules, allergen warnings |
| Pro        | $59/month   | Volume discount tiers, order history dashboard, recurring order scheduling, email confirmation |
| Enterprise | $199/month  | Corporate account integration, multi-site, custom branding, API access, dedicated account manager |

---

## Features

- Day selector toggles (Mon–Fri, configurable per merchant)
- Popular days indicator with custom label
- Meal/tray size selector with prices (admin-configured)
- Per-day quantity inputs with live pricing
- Real-time day count and total quantity counter
- Minimum order enforcement per day with clear error messages
- Allergen warning display (per size + global disclaimer)
- Team notes and allergy notes fields
- Week commencing date picker with advance notice enforcement
- Volume discount tier display
- One-click "Add complete weekly order to cart" — one line item per active day
- Line item properties: Day, Week, Meal, Team Notes, Allergy Notes

---

## Structure

```
team-orders/
├── Dockerfile
├── package.json
├── railway.json
├── shopify.app.toml
├── prisma/
│   └── schema.prisma
├── web/
│   ├── index.js              # Express backend
│   ├── shopify.js            # Shopify API helpers + plan definitions
│   ├── package.json
│   ├── middleware/
│   │   └── verify-request.js
│   ├── lib/
│   │   └── orderHelpers.js
│   └── frontend/
│       ├── index.html
│       ├── vite.config.js
│       ├── App.jsx
│       └── pages/
│           ├── index.jsx     # Dashboard
│           ├── meals.jsx     # Meal size management
│           ├── discounts.jsx # Volume discount tiers
│           ├── orders.jsx    # Order history (Pro+)
│           └── settings.jsx  # App settings + billing
└── extensions/
    └── team-orders/
        ├── shopify.extension.toml
        └── blocks/
            └── weekly_orders.liquid  # Theme App Extension block
```

---

## Setup

### Prerequisites
- Node.js 18+
- Shopify Partner account
- PostgreSQL database (Neon recommended)

### Environment Variables
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_APP_URL=https://your-app.railway.app
NODE_ENV=production
PORT=3000
```

### Development
```bash
npm install
cd web && npm install
shopify app dev
```

### Deploy to Railway
Push to main — Railway builds from the Dockerfile automatically.

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/config | Full page config for storefront |
| POST | /api/config | Save config |
| GET | /api/meal-sizes | List meal sizes |
| POST | /api/meal-sizes | Create meal size |
| PUT | /api/meal-sizes/:id | Update meal size |
| DELETE | /api/meal-sizes/:id | Delete meal size |
| GET | /api/volume-discounts | List discount tiers |
| POST | /api/volume-discounts | Create discount tier |
| PUT | /api/volume-discounts/:id | Update discount tier |
| DELETE | /api/volume-discounts/:id | Delete discount tier |
| GET | /api/orders | List weekly orders (paginated) |
| GET | /api/settings | Get app settings |
| POST | /api/settings | Save app settings |
| GET | /api/billing/status | Current plan + stats |
| POST | /api/billing/subscribe | Initiate subscription |
| GET | /api/billing/callback | Billing callback |
| POST | /api/webhooks/:topic | GDPR + uninstall webhooks |

---

## Developer

**SaltCore** — [saltai.app](https://saltai.app) — support@saltai.app
