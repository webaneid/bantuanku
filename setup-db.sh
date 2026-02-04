#!/bin/bash

echo "🚀 Bantuanku Database Setup Script"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in environment"
  echo ""
  echo "Please follow these steps:"
  echo ""
  echo "1. Create a Neon account at https://neon.tech"
  echo "2. Create a new project called 'bantuanku'"
  echo "3. Copy the connection string (looks like: postgresql://user:password@host/database)"
  echo "4. Create packages/db/.env file with:"
  echo "   DATABASE_URL=your-connection-string-here"
  echo ""
  echo "5. Then run this script again with:"
  echo "   cd packages/db && source .env && cd ../.. && ./setup-db.sh"
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Navigate to db package
cd packages/db || exit

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Pushing database schema to Neon..."
npm run db:push

echo ""
echo "🌱 Seeding database with initial data..."
node run-seed.mjs

echo ""
echo "✅ Database setup complete!"
echo ""
echo "You can now start the development server:"
echo "  cd apps/api"
echo "  npm run dev"
echo ""
