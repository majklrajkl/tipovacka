#!/bin/bash
# =============================================================
# Tipovacka - EC2 Server Setup Script
# Run this script on a fresh Ubuntu EC2 instance
# Usage: bash setup.sh
# =============================================================

set -e  # Exit on any error

echo "========================================="
echo "  Tipovacka - Server Setup"
echo "========================================="

# --- 1. System updates ---
echo ""
echo "[1/6] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# --- 2. Install Node.js 20 ---
echo ""
echo "[2/6] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# --- 3. Install PM2 ---
echo ""
echo "[3/6] Installing PM2 (process manager)..."
sudo npm install -g pm2

# --- 4. Install nginx ---
echo ""
echo "[4/6] Installing nginx..."
sudo apt install -y nginx

# --- 5. Install git ---
echo ""
echo "[5/6] Installing git..."
sudo apt install -y git

# --- 6. Create app directory ---
echo ""
echo "[6/6] Setting up app directory..."
sudo mkdir -p /var/www/tipovacka
sudo chown $USER:$USER /var/www/tipovacka

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Clone your repo:  cd /var/www/tipovacka && git clone YOUR_REPO_URL ."
echo "  2. Install deps:     npm run install:all"
echo "  3. Build:            npm run build"
echo "  4. Create .env:      See the deployment guide"
echo "  5. Start the app:    pm2 start ecosystem.config.js"
echo ""
