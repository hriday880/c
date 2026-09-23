#!/bin/bash

echo "🚀 Starting Typography Tool..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Kill any existing node servers running on our ports to avoid conflicts
echo "🧹 Cleaning up old processes..."
npx --yes kill-port 8080 4173 2>/dev/null || true

# Start the Node.js backend in the background
echo "🔌 Starting backend server on Port 8080..."
node server-node/server.cjs &
BACKEND_PID=$!

# Build and start the Vite frontend
echo "🎨 Building and starting frontend on Port 4173..."
npm run build
npx vite preview --port 4173 &
FRONTEND_PID=$!

echo "✅ All systems go! Open http://localhost:4173 in your browser."
echo "Press Ctrl+C to stop both servers."

# Wait for user to press Ctrl+C, then kill both background processes
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
