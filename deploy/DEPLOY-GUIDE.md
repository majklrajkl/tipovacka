# Deploying Tipovacka on AWS EC2 (Step-by-Step)

This guide assumes you have zero AWS experience. Follow each step exactly.

---

## Part 1: Create an AWS Account

1. Go to https://aws.amazon.com and click **Create an AWS Account**
2. Fill in your email, password, and account name
3. Add a payment method (credit/debit card) — you won't be charged if you stay within the free tier
4. Choose the **Basic (Free)** support plan
5. Wait for your account to be activated (can take a few minutes)

---

## Part 2: Launch an EC2 Instance

1. Log in to the **AWS Console** at https://console.aws.amazon.com
2. In the search bar at the top, type **EC2** and click on it
3. Click the orange **Launch instance** button

### Configure your instance:

| Setting | What to choose |
|---------|---------------|
| **Name** | `tipovacka` |
| **OS Image (AMI)** | Ubuntu Server 24.04 LTS (should be the default Ubuntu option) |
| **Instance type** | `t2.micro` (Free tier eligible — says "Free tier eligible" next to it) |
| **Key pair** | Click **Create new key pair**. Name it `tipovacka-key`, keep RSA and `.pem` selected, click **Create**. A file called `tipovacka-key.pem` will download — **save this file, you need it to connect!** |
| **Network settings** | Click **Edit**, then make sure these boxes are checked: ✅ Allow SSH traffic (from Anywhere), ✅ Allow HTTP traffic from the internet, ✅ Allow HTTPS traffic from the internet |
| **Storage** | Change from 8 GB to **20 GB** (still free tier) |

4. Click **Launch instance**
5. Wait until the instance state shows **Running** (refresh the page if needed)

---

## Part 3: Get Your Server's IP Address

1. In the EC2 dashboard, click **Instances** in the left sidebar
2. Click on your `tipovacka` instance
3. Find **Public IPv4 address** — it looks something like `54.123.45.67`
4. **Write this down** — you'll need it throughout the guide

---

## Part 4: Connect to Your Server

### On Mac / Linux:

Open Terminal and run:

```bash
# Make the key file secure (required, only need to do this once)
chmod 400 ~/Downloads/tipovacka-key.pem

# Connect to your server (replace YOUR_IP with the IP from Part 3)
ssh -i ~/Downloads/tipovacka-key.pem ubuntu@YOUR_IP
```

### On Windows:

1. Download and install **PuTTY** from https://www.putty.org
2. Or use **Windows Terminal** / **PowerShell** (Windows 10+):

```powershell
ssh -i C:\Users\YourName\Downloads\tipovacka-key.pem ubuntu@YOUR_IP
```

> If it asks "Are you sure you want to continue connecting?" — type `yes` and press Enter.

You should now see something like `ubuntu@ip-172-31-xx-xx:~$` — you're in!

---

## Part 5: Install Everything on the Server

Run these commands one by one on your server (copy-paste each line):

```bash
# Download the setup script
sudo apt update && sudo apt install -y git

# Clone your repository
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/tipovacka.git
cd tipovacka

# Run the setup script (installs Node.js, PM2, nginx)
bash deploy/setup.sh
```

---

## Part 6: Build and Configure the App

Still on your server, inside the `tipovacka` folder:

```bash
# Install all dependencies
npm run install:all

# Build the app (compiles TypeScript + bundles React)
npm run build

# Create a logs folder
mkdir -p logs
```

### Set up environment variables

Create a `.env` file for the server:

```bash
nano server/.env
```

Type these two lines (replace the secret with any long random string):

```
PORT=3001
JWT_SECRET=replace-this-with-a-long-random-string-abc123xyz
```

To save: press `Ctrl+X`, then `Y`, then `Enter`.

> **Tip:** To generate a random secret, you can run:
> `openssl rand -hex 32`
> and copy-paste the output as your JWT_SECRET.

---

## Part 7: Start the App with PM2

```bash
# Start the app
pm2 start ecosystem.config.js

# Check it's running (should show "online" status)
pm2 status

# Make PM2 restart your app if the server reboots
pm2 save
pm2 startup
```

The last command (`pm2 startup`) will print a command starting with `sudo env PATH=...`. **Copy that entire line and run it.** This ensures your app starts automatically if the server ever restarts.

### Test it works:

```bash
curl http://localhost:3001
```

You should see HTML output. If you see an error, check logs with:

```bash
pm2 logs tipovacka
```

---

## Part 8: Set Up Nginx (So People Can Access It)

```bash
# Copy the nginx config
sudo cp deploy/nginx-tipovacka.conf /etc/nginx/sites-available/tipovacka

# Edit it to add your IP address
sudo nano /etc/nginx/sites-available/tipovacka
```

Find the line that says `server_name YOUR_DOMAIN_OR_IP;` and replace `YOUR_DOMAIN_OR_IP` with your EC2 public IP from Part 3 (e.g., `54.123.45.67`).

Save: `Ctrl+X`, then `Y`, then `Enter`.

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/tipovacka /etc/nginx/sites-enabled/

# Remove the default nginx page
sudo rm /etc/nginx/sites-enabled/default

# Test nginx config has no errors
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Test it from your own computer:

Open your browser and go to: `http://YOUR_IP`

You should see your Tipovacka app!

---

## Part 9: Set Up HTTPS with a Domain (Optional)

Skip this if you don't have a domain name. The app works fine with just the IP address.

If you do have a domain (e.g., from Namecheap, GoDaddy, etc.):

### Point your domain to EC2:

1. Go to your domain registrar's DNS settings
2. Add an **A record**: `@` → `YOUR_EC2_IP`
3. Add another **A record**: `www` → `YOUR_EC2_IP`
4. Wait 5-30 minutes for DNS to update

### Install free HTTPS certificate:

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace yourdomain.com with your actual domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts — enter your email, agree to terms
```

Certbot automatically configures nginx for HTTPS. It also auto-renews.

---

## Useful Commands (Cheat Sheet)

| What you want to do | Command |
|---------------------|---------|
| Check if app is running | `pm2 status` |
| View app logs | `pm2 logs tipovacka` |
| Restart the app | `pm2 restart tipovacka` |
| Stop the app | `pm2 stop tipovacka` |
| Check nginx status | `sudo systemctl status nginx` |
| Restart nginx | `sudo systemctl restart nginx` |

## Updating Your App (After Making Changes)

When I (or you) make changes to the code and push them to GitHub, here's how to
get those changes live on your server. **Do this every time you want to update.**

### Step 1: Connect to your server

Open Terminal (Mac/Linux) or PowerShell (Windows) and SSH in:

```bash
ssh -i ~/Downloads/tipovacka-key.pem ubuntu@YOUR_IP
```

### Step 2: Go to the app folder

```bash
cd /home/ubuntu/tipovacka
```

### Step 3: Pull the latest code from GitHub

```bash
git pull
```

You should see a list of changed files. If it says "Already up to date" there's
nothing new to deploy.

### Step 4: Install dependencies

Only needed if I tell you that new packages were added. If unsure, just run it
anyway — it's harmless and takes a few seconds if nothing changed:

```bash
npm run install:all
```

### Step 5: Rebuild the app

This compiles the new code. **Always do this after pulling.**

```bash
npm run build
```

This takes about 30-60 seconds. Wait for it to finish without errors.

### Step 6: Restart the app

```bash
pm2 restart tipovacka
```

### Step 7: Verify it's running

```bash
pm2 status
```

You should see `tipovacka` with status **online**. Now open https://tipovacka.eu
in your browser and check that everything works.

### Quick copy-paste version

If you want to do it all in one go, here's everything as a single command:

```bash
cd /home/ubuntu/tipovacka && git pull && npm run install:all && npm run build && pm2 restart tipovacka && pm2 status
```

### If something goes wrong

If the site doesn't load after updating:

```bash
# Check the app logs for errors
pm2 logs tipovacka --lines 30
```

If you see an error, let me know what it says and I'll help you fix it.

---

## Troubleshooting

### "I can't access the site in my browser"
- Make sure you're using `http://` not `https://` (unless you set up Part 9)
- Check EC2 security group allows HTTP (port 80) — go to EC2 → your instance → Security → Security groups → Edit inbound rules → Add rule: HTTP, Anywhere
- Check nginx is running: `sudo systemctl status nginx`
- Check the app is running: `pm2 status`

### "The app crashes / won't start"
- Check logs: `pm2 logs tipovacka`
- Make sure you ran `npm run build` after pulling new code
- Make sure the `server/.env` file exists with the correct values

### "npm run build fails"
- Make sure you have enough memory. If the t2.micro runs out of memory during build, add a swap file:
  ```bash
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
  Then try `npm run build` again.

---

## Monthly Cost

| Resource | Cost |
|----------|------|
| EC2 t2.micro | **Free** for 12 months, then ~$8.50/month |
| Storage (20 GB) | **Free** for 12 months, then ~$2/month |
| Data transfer | **Free** up to 100 GB/month outbound |
| **Total (first year)** | **$0** |
| **Total (after free tier)** | **~$10.50/month** |
