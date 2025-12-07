# Deployment Guide - Script Writer

This guide covers how to deploy your Script Writer application online. You'll need to deploy both the backend server and make the frontend accessible.

## Overview

Your app consists of:
1. **Backend Server** (`server.js`) - Node.js/Express API with SQLite database
2. **Frontend** (`index.html`) - Static HTML file that needs to be served

## Option 1: Deploy to Heroku (Recommended for Beginners)

Heroku is the easiest option for full-stack apps.

### Prerequisites
- Heroku account (free tier available)
- Heroku CLI installed: https://devcenter.heroku.com/articles/heroku-cli

### Steps

1. **Install Heroku CLI and login:**
   ```bash
   heroku login
   ```

2. **Create a Procfile** (create new file `Procfile` in root):
   ```
   web: node server.js
   ```

3. **Update server.js for Heroku:**
   - Heroku provides PORT automatically, so your current code should work
   - Make sure `BASE_URL` uses your Heroku app URL

4. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

5. **Set environment variables:**
   ```bash
   heroku config:set JWT_SECRET=your-secret-key-here
   heroku config:set GOOGLE_CLIENT_ID=your-google-client-id
   heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret
   heroku config:set BASE_URL=https://your-app-name.herokuapp.com
   ```

6. **Deploy:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

7. **Update frontend API_URL:**
   - In `index.html`, change `const API_URL = 'http://localhost:3000/api';` to:
   ```javascript
   const API_URL = 'https://your-app-name.herokuapp.com/api';
   ```

8. **Host frontend:**
   - Option A: Use Heroku Static Buildpack (see below)
   - Option B: Deploy to Netlify/Vercel (see Option 2)

### Host Frontend on Heroku (Static Site)

1. **Create `package.json` script:**
   ```json
   "scripts": {
     "start": "node server.js",
     "static": "npx serve ."
   }
   ```

2. **Or use a simple static server:**
   - Install `serve`: `npm install serve`
   - Update Procfile: `web: node server.js & npx serve . -p $PORT`

**Note:** For production, it's better to serve the frontend separately (see Option 2).

---

## Option 2: Deploy Backend to Railway/Render + Frontend to Netlify/Vercel

This is the recommended approach for production.

### Backend: Railway (or Render)

#### Railway Deployment:

1. **Sign up at railway.app**

2. **Create new project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo" (or upload files)

3. **Configure environment variables:**
   - Go to Variables tab
   - Add:
     ```
     JWT_SECRET=your-secret-key
     GOOGLE_CLIENT_ID=your-client-id
     GOOGLE_CLIENT_SECRET=your-client-secret
     BASE_URL=https://your-app.up.railway.app
     ```

4. **Railway auto-detects Node.js and runs `npm start`**

5. **Get your backend URL:**
   - Railway provides a URL like: `https://your-app.up.railway.app`
   - Use this as your `BASE_URL`

#### Render Deployment (Alternative):

1. **Sign up at render.com**

2. **Create new Web Service:**
   - Connect GitHub repo
   - Build command: `npm install`
   - Start command: `node server.js`

3. **Set environment variables** (same as Railway)

4. **Get your backend URL**

### Frontend: Netlify or Vercel

#### Netlify Deployment:

1. **Sign up at netlify.com**

2. **Deploy:**
   - Drag and drop your `index.html` file, OR
   - Connect GitHub repo and set build settings:
     - Build command: (leave empty)
     - Publish directory: (root)

3. **Update API_URL in index.html:**
   ```javascript
   const API_URL = 'https://your-backend-url.railway.app/api';
   ```

4. **Get your frontend URL:**
   - Netlify provides: `https://your-app.netlify.app`

#### Vercel Deployment:

1. **Sign up at vercel.com**

2. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Update API_URL** (same as Netlify)

---

## Option 3: Deploy to DigitalOcean/VPS

For more control, deploy to a VPS.

### Steps:

1. **Create a Droplet:**
   - Ubuntu 22.04 LTS
   - Minimum: 1GB RAM, 1 vCPU

2. **SSH into server:**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PM2 (process manager):**
   ```bash
   sudo npm install -g pm2
   ```

5. **Clone your repo:**
   ```bash
   git clone your-repo-url
   cd scripter
   npm install
   ```

6. **Create .env file:**
   ```bash
   nano .env
   ```
   Add your environment variables

7. **Start with PM2:**
   ```bash
   pm2 start server.js --name script-writer
   pm2 save
   pm2 startup
   ```

8. **Install Nginx (reverse proxy):**
   ```bash
   sudo apt install nginx
   ```

9. **Configure Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

10. **Restart Nginx:**
    ```bash
    sudo systemctl restart nginx
    ```

11. **Setup SSL with Let's Encrypt:**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

---

## Option 4: Deploy to Fly.io

Fly.io is great for global distribution.

### Steps:

1. **Install flyctl:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Initialize:**
   ```bash
   fly launch
   ```

4. **Set secrets:**
   ```bash
   fly secrets set JWT_SECRET=your-secret
   fly secrets set GOOGLE_CLIENT_ID=your-id
   fly secrets set GOOGLE_CLIENT_SECRET=your-secret
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

---

## Important Configuration Steps

### 1. Update Google OAuth Redirect URI

After deploying, update your Google OAuth settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URI:
   - `https://your-backend-url.com/api/auth/google/callback`

### 2. Update Frontend API URL

In `index.html`, find:
```javascript
const API_URL = 'http://localhost:3000/api';
```

Change to your production backend URL:
```javascript
const API_URL = 'https://your-backend-url.com/api';
```

### 3. CORS Configuration

Your server already has CORS enabled, but if you need to restrict it:

In `server.js`, update:
```javascript
app.use(cors({
    origin: 'https://your-frontend-url.com',
    credentials: true
}));
```

### 4. Database Considerations

**SQLite on Heroku/Railway:**
- SQLite files are ephemeral (lost on restart)
- Consider upgrading to PostgreSQL for production

**To use PostgreSQL on Heroku:**
```bash
heroku addons:create heroku-postgresql:mini
```

Then update `server.js` to use PostgreSQL instead of SQLite.

---

## Production Checklist

- [ ] Set strong `JWT_SECRET` (use a random string generator)
- [ ] Update `BASE_URL` to production URL
- [ ] Update Google OAuth redirect URI
- [ ] Update frontend `API_URL`
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups (if using SQLite, consider PostgreSQL)
- [ ] Test login/register functionality
- [ ] Test file sync functionality
- [ ] Set up monitoring (optional)
- [ ] Configure custom domain (optional)

---

## Quick Start: Recommended Setup

**For fastest deployment:**

1. **Backend:** Deploy to Railway (5 minutes)
   - Sign up → New Project → Deploy from GitHub
   - Add environment variables
   - Get your backend URL

2. **Frontend:** Deploy to Netlify (2 minutes)
   - Sign up → Drag & drop `index.html`
   - Update `API_URL` in the file
   - Get your frontend URL

3. **Update Google OAuth:** (2 minutes)
   - Add redirect URI to Google Console

**Total time: ~10 minutes**

---

## Troubleshooting

### CORS Errors
- Make sure CORS is enabled in `server.js`
- Check that frontend URL is allowed

### Database Errors
- SQLite file might not persist on some platforms
- Consider PostgreSQL for production

### Google OAuth Not Working
- Verify redirect URI matches exactly
- Check environment variables are set
- Ensure `BASE_URL` is correct

### Port Issues
- Most platforms set PORT automatically
- Your code should use `process.env.PORT || 3000`

---

## Need Help?

- **Heroku:** https://devcenter.heroku.com/
- **Railway:** https://docs.railway.app/
- **Netlify:** https://docs.netlify.com/
- **Vercel:** https://vercel.com/docs


