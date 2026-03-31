#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")"

echo "----------------------------------------"
echo "🚀 HRMS Automation Suite"
echo "----------------------------------------"

# Ensure the database is up to date and seeded
echo "⚙️  Preparing database..."
npx prisma generate
npx prisma migrate deploy
node db/setup.js
# This runs 'prisma migrate deploy' followed by seeding logic in setup.js
npm run --prefix server db:setup

if [ $? -ne 0 ]; then
    echo "❌ Database setup failed. Please follow the instructions in the error message."
    exit 1
fi

echo "✅ Database is ready."

# 2. Start Backend in a new Terminal window
echo "Starting Backend Server..."
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"'/server && npm start"'

# 3. Start Frontend in a new Terminal window
echo "Starting Frontend Development Server..."
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"' && npm run dev"'

echo "----------------------------------------"
echo "🎉 Servers are starting in separate windows!"
echo "----------------------------------------"
