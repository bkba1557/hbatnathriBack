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

## Firebase Storage

Image uploads use Firebase Storage when these environment variables are present:

```env
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

Provide Firebase Admin credentials using one of these options:

```env
FIREBASE_SERVICE_ACCOUNT_BASE64=base64-service-account-json
```

or:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

or split variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

For local development, you can also place the downloaded Firebase service account at `service-account.json` and set:

```env
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

Use `service-account.example.json` only as a shape reference. Never commit the real `service-account.json`.

Set `LOCAL_UPLOADS=false` on hosted environments so image upload fails clearly if Firebase is not configured.

## Render Firebase Uploads

On Render, do not rely on `service-account.json`; it is ignored by git and will not be deployed. Add these environment variables to the backend service:

```env
FIREBASE_STORAGE_BUCKET=albuhairaalarabia2026.firebasestorage.app
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 of service-account.json>
LOCAL_UPLOADS=false
```

Generate the base64 value locally from the backend folder:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

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
