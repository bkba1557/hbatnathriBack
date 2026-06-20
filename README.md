# Hbat Nathri Backend

Express + MongoDB backend for menu/admin management.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI`, `JWT_SECRET`, and `ADMIN_SETUP_KEY`.
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

## Local Image Uploads

Image uploads are stored on the backend server filesystem and served from:

```http
/uploads/<file-path>
```

By default files are written to `./uploads` from the backend project folder. To use a different folder on a hosted server, set:

```env
UPLOADS_DIR=/absolute/path/to/uploads
```

Use a persistent disk or a folder that survives deployments/restarts in production. If the frontend is hosted on a different domain, keep `VITE_API_URL` pointed at the backend API so image URLs resolve correctly.

## Main Routes

- `GET /api/public/site-data`
- `POST /api/auth/login`
- `POST /api/auth/bootstrap`
- `GET/PUT /api/admin/settings`
- `GET/POST/PUT/DELETE /api/admin/categories`
- `GET/POST/PUT/DELETE /api/admin/items`
- `GET /api/admin/upload-config`
- `POST /api/admin/upload`

Admin routes require `Authorization: Bearer <token>`.
