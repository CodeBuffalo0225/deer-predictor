#!/bin/bash
set -e

echo ""
echo "Deer Predictor — First Time Setup"
echo "──────────────────────────────────────"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

# Check for .env
if [ ! -f server/.env ]; then
  echo "No server/.env file found. Creating from .env.example..."
  cp .env.example server/.env
  echo "   -> Add your ANTHROPIC_API_KEY to server/.env before using AI features"
fi

echo "Installing root dependencies..."
npm install

echo "Installing server dependencies..."
cd server && npm install && cd ..

echo "Installing client dependencies..."
cd client && npm install && cd ..

echo "Running database migrations..."
cd server && npx prisma migrate dev --name init && cd ..

echo ""
echo "Setup complete!"
echo ""
echo "   Next steps:"
echo "   1. (Optional) Add your ANTHROPIC_API_KEY to server/.env"
echo "   2. Run: npm run dev"
echo "   3. Open: http://localhost:5173"
echo "   4. The setup wizard will guide you through the rest"
echo ""
