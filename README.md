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

## Database Reset

> **WARNING:** This permanently deletes ALL SMMO data from the connected MongoDB database.
> Use only for development or when you want a completely fresh start.

### Run the reset command

```bash
npm run reset-db -- --confirm
```

Without `--confirm` the script prints a warning and exits safely without touching the database.

### What gets deleted

| Collection | Contents |
|---|---|
| users | All CEO and Worker accounts |
| clients | All clients |
| boards | All monthly boards |
| tasks | All content tasks |
| payments | All payment records |
| agreements | All agreements and documents |
| generateddocuments | All generated PDFs (metadata) |
| activitylogs | All activity history |
| contentitems | All content calendar items |
| photoshootsessions | All photoshoot sessions |
| reports | All report records |

### First use after reset

```bash
npm run reset-db -- --confirm   # 1. Reset
npm run dev                      # 2. Start app
```

3. Open `http://localhost:3000`
4. You will be redirected to `/setup`
5. Create your CEO/Admin account (no default user is seeded)
6. Log in
7. Create workers manually via the Workers page
8. Create clients manually via the Clients page
9. Start using SMMO from the beginning

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
