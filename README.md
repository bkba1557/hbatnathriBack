# Hbat Nathri Backend

Express + MongoDB + Firebase Storage backend for menu/admin management.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_SETUP_KEY`, and Firebase values.
3. Install dependencies:

```bash
npm install
```

4. Create the first admin either with:

```bash
npm run seed:admin
```

or call:

```http
POST /api/auth/bootstrap
{
  "setupKey": "ADMIN_SETUP_KEY",
  "email": "admin@example.com",
  "password": "strong-password"
}
```

5. Run:

```bash
npm run dev
```

## Main Routes

- `GET /api/public/site-data`
- `POST /api/auth/login`
- `POST /api/auth/bootstrap`
- `GET/PUT /api/admin/settings`
- `GET/POST/PUT/DELETE /api/admin/categories`
- `GET/POST/PUT/DELETE /api/admin/items`
- `POST /api/admin/upload`

Admin routes require `Authorization: Bearer <token>`.
