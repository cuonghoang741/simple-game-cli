#!/bin/bash

# Kill any existing PM2 process with the same name
pm2 delete game-server 2>/dev/null || true

# Start the server in development mode
cd server && pm2 start npm --name "game-server" -- run dev

# Display logs
pm2 logs game-server 