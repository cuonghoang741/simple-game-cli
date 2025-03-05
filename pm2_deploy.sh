#!/bin/bash

# Kill any existing PM2 process
pm2 delete game-app 2>/dev/null || true

# Start both server and UI using the root dev script
pm2 start npm --name "game-app" -- run dev

# Display logs
pm2 logs 