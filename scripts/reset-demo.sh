#!/bin/bash
set -e

echo ""
echo "Deer Predictor — Reset to Demo Data"
echo "──────────────────────────────────────"
echo ""
echo "This will DELETE all current data and load the Hollow Creek Farm demo."
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Cancelled."
  exit 0
fi

cd "$(dirname "$0")/.."

echo "Resetting database..."
cd server && npx prisma migrate reset --force && cd ..

echo "Loading demo data..."
cd server && node prisma/seed.js && cd ..

echo ""
echo "Demo data loaded!"
echo "Run: npm run dev"
echo ""
