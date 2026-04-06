# HR Suite Local Setup Guide

Follow these steps to set up the project on a new system with a local MySQL or MariaDB database.

## 1. Prerequisites
- **Node.js**: Install from [nodejs.org](https://nodejs.org/)
- **MySQL/MariaDB**: Install and ensure it's running.

## 2. Database Setup
1. Create a database named `website` in your MySQL instance.
2. Go to the `server` directory:
   ```bash
   cd server
   ```
3. Copy `.env.example` to a new file named `.env`:
   ```bash
   copy .env.example .env
   ```
4. Update `DATABASE_URL` in the `.env` file with your credentials:
   `DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost:3306/website`
   `PORT=5001`

## 3. Run Automated Migration
This command will automatically apply the MySQL schema and seed default setup data:
```bash
npm run db:setup
```

## 4. Start the Application
- **Backend**: In the `server` folder, run `npm start`.
- **Frontend**: In the root folder, run `npm run dev`.

## 5. One-Command Setup + Run (Recommended)
From the project root, run:
```bash
npm run dev:all
```
This single command will:
- install frontend dependencies
- install backend dependencies
- run backend DB setup/migration (`db:setup`)
- start backend (`npm start` in `server`)
- start frontend (`npm run dev` in root)

---

### 7. Interactive User Management (Python)

You can manage all portal accounts (HR and Employees) using the provided interactive Python script:

1.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Run the script**:
    ```bash
    python manage_users.py
    ```
    This script allows you to:
    - **List** all current accounts.
    - **Add** new HR or Employee accounts with secure password hashing.
    - **Edit** existing accounts (update passwords or roles).
    - **Delete** accounts permanently from the database.

---

### Default Login Accounts
- No fixed default credentials are embedded.
- To seed accounts, set `SEED_DEFAULT_USERS=true` and provide `SEED_HR_*` / `SEED_EMPLOYEE_*` values in `server/.env`.
- If seeding variables are not provided, onboarding users should be created through admin flows.
