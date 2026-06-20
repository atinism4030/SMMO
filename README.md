# SMMO — Social Media Management Organization

An internal tool for managing social media clients, content boards, workers, and performance reports.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
```

> Generate a strong secret: `openssl rand -base64 32`

### 3. Run the development server

```bash
npm run dev
```

### 4. Open the app

```
http://localhost:3000
```

---

## First-Time Setup

When no admin account exists in the database, the app automatically redirects to `/setup`.

1. Open `http://localhost:3000`
2. You will be redirected to `/setup`
3. Fill in your CEO/Admin account details
4. Click **Create Admin Account**
5. Log in with the account you just created

The /setup page is permanently disabled once an admin account exists.

---

## Creating Workers

After logging in as CEO:

1. Go to **Workers** in the sidebar
2. Click **Add Worker**
3. Fill in the worker details and password
4. Share credentials with the worker

---

## Roles

| Role   | Access |
|--------|--------|
| CEO    | Full access — clients, boards, payments, workers, reports |
| Worker | Own tasks only — available tasks, my tasks, calendar |

---

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- MongoDB with Mongoose
- JWT authentication (HTTP-only cookies)
- Tailwind CSS v4
- TypeScript
