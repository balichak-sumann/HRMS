# IndusInnovate HR Suite

A full-stack HR and collaboration platform with role-based dashboards, employee lifecycle management, payroll, attendance, project tracking, chat, group calls, meetings, complaints, audit logs, and document/drive management.

## Tech Stack

- Frontend: React 19, Vite, React Router, Socket.IO Client, Recharts, Lucide Icons
- Backend: Node.js, Express 5, Socket.IO, PostgreSQL (pg)
- Auth/Security: JWT, token blacklist, role-based authorization
- Storage: Local uploads directory served by backend
- PDF/Export: @react-pdf/renderer, html-to-image

# HRMS Project Setup

## Scripts

- `npm run dev:all` — Installs dependencies and starts both frontend and backend servers. Does NOT run any database migrations or setup.
- `npm run deploy` — For initializing a new/empty database (full schema deploy). Use this for a fresh setup.
- `npm run migrate` — For applying migrations to an existing database (incremental changes). Use this when updating an existing database schema.

## Usage
5. **Start frontend and backend separately:**
   - To start the frontend only:
     ```
     npm run dev
     ```
   - To start the backend only:
     ```
     cd server
     npm start
     ```

1. **Install dependencies:**
  ```
  npm install
  cd server && npm install
  ```
2. **Start servers:**
  ```
  npm run dev:all
  ```

3. **Database setup:**
  - For a new/empty database:
    ```
    npm run deploy
    ```
  - For updating an existing database:
    ```
    npm run migrate
    ```

4. **Seed default profiles (admin, HR, employee):**
   - Set the required environment variables in your .env file (see server/db/setup.js for details).
   - Then run:
     ```
     npm run seed
     ```
   - This will seed the default admin, HR, and employee profiles if the env vars are set.

## Notes
- Only run one migration tool (Prisma or node-pg-migrate) per database, unless you know what you are doing.
- If you encounter migration errors, check your database state and migration history.
- For more details, see the scripts and server/README.md if available.
- Personal chat and group chat
- Group member management (add members, leave group)
- File/image chat uploads
- Voice/video calls and meeting room support
- Meeting scheduling and joining
- Shared drive browsing/upload/download

## Routes Overview (Frontend)

- Public: /login, /forgot-password, /reset-password
- HR area: /hr/*
- Employee area: /employee/*
- Shared protected pages:
  - /chat
  - /meetings
  - /meetings/:id
  - /drive
  - /profile

Main route configuration: [src/App.jsx](src/App.jsx)

## API Modules (Backend)

Mounted in [server/index.js](server/index.js):

- /api/auth
- /api/employees
- /api/leaves
- /api/holidays
- /api/analytics
- /api/announcements
- /api/payroll
- /api/documents
- /api/attendance
- /api/projects
- /api/offer-letters
- /api/complaints
- /api/audit
- /api/chat
- /api/meetings
- /api/drive
- /api/user

## Realtime Architecture

- Socket.IO server handles:
  - Presence (user_online, user_offline)
  - Chat message broadcasting
  - Meeting chat broadcasting
  - WebRTC signaling (offer/answer/ICE)
  - Meeting join/leave notifications

Socket server entry: [server/index.js](server/index.js)

## Database Overview

Key domain tables include:

- profiles, employees
- attendance, leaves, leave_balances
- payroll
- projects, project_members, tasks, daily_reports
- documents
- chat_groups, chat_group_members, messages
- meetings, meeting_participants
- folders, files, file_shares
- announcements, complaints, audit_logs
- notifications, token_blacklist, password_reset_tokens

Full schema: [server/db/init.sql](server/db/init.sql)

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL running locally

### Quick Start (Recommended)

From project root:

```bash
npm run dev:all
```

This will:

- install frontend dependencies
- install backend dependencies
- run DB migration/setup
- free backend/frontend ports if occupied
- start backend and frontend together

### Manual Start

1. Backend

```bash
cd server
npm install
npm run db:setup
npm start
```

2. Frontend

```bash
cd ..
npm install
npm run dev
```

## Environment Variables

Create [server/.env](server/.env) with values similar to:

```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/website
PORT=5001
JWT_SECRET=your_jwt_secret
```

## Default Seed Accounts

- Seed accounts are optional and environment-driven.
- Set `SEED_DEFAULT_USERS=true` and provide `SEED_HR_*` / `SEED_EMPLOYEE_*` variables in [server/.env](server/.env).
- If `SEED_DEFAULT_USERS` is not set to true, no default users are created.
- Seeding logic is in [server/db/setup.js](server/db/setup.js).

## Available Scripts

Frontend scripts in [package.json](package.json):

- npm run dev
- npm run dev:all
- npm run build
- npm run lint
- npm run preview

Backend scripts in [server/package.json](server/package.json):

- npm start
- npm run db:setup

## Deployment Notes

- Vite dev proxy is configured in [vite.config.js](vite.config.js)
- Vercel rewrite file exists at [vercel.json](vercel.json)
- /uploads is served from backend static path

## Known Limitations

- Group video currently uses mesh WebRTC. This works for small groups but is not ideal for very large rooms (for example 10+ participants).
- For large-scale meetings, SFU-based architecture is recommended.

## Troubleshooting

1. Port already in use
	- Use npm run dev:all; it auto-frees ports 5001 and 5173.

2. Login fails with token/session errors
	- Clear localStorage token and log in again.

3. DB migration issues
	- Confirm DATABASE_URL is correct and PostgreSQL is running.

4. Chat/call disconnect during code edits
	- Expected in dev when backend restarts.

## License

Private internal project.
