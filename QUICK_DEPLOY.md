# Quick Deployment Guide

## Step 1: Deploy Backend to Railway (5 minutes)

1. **Sign up at [railway.app](https://railway.app)** (free tier available)

2. **Create a new project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `scripter` repository
   - Railway will auto-detect Node.js

3. **Set environment variables:**
   - Go to your project → Variables tab
   - Add these variables:
     ```
     JWT_SECRET=your-random-secret-key-here-make-it-long-and-random
     PORT=3000
     BASE_URL=https://your-app-name.up.railway.app
     ```
   - **Note:** Replace `your-app-name` with your actual Railway app name
   - Generate a random JWT_SECRET (you can use: `openssl rand -base64 32`)

4. **Get your backend URL:**
   - Railway will provide a URL like: `https://scripter-production-xxxx.up.railway.app`
   - Copy this URL - you'll need it for the frontend

5. **Optional - Google OAuth (if you want Google login):**
   - Add these variables if you have Google OAuth credentials:
     ```
     GOOGLE_CLIENT_ID=your-google-client-id
     GOOGLE_CLIENT_SECRET=your-google-client-secret
     ```
   - Update Google OAuth redirect URI in Google Cloud Console to:
     `https://your-railway-url.up.railway.app/api/auth/google/callback`

---

## Step 2: Update Frontend API URL

After you get your Railway backend URL, update `index.html`:

1. Find line 2262: `const API_URL = 'http://localhost:3000/api';`
2. Replace with: `const API_URL = 'https://your-railway-url.up.railway.app/api';`
3. Save the file
4. Commit and push to GitHub:
   ```bash
   git add index.html
   git commit -m "Update API URL for production"
   git push
   ```

---

## Step 3: Deploy Frontend to Netlify (2 minutes)

1. **Sign up at [netlify.com](https://netlify.com)** (free tier available)

2. **Deploy from GitHub:**
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your `scripter` repository
   - Build settings:
     - **Build command:** (leave empty)
     - **Publish directory:** (leave empty or put `/`)
   - Click "Deploy site"

3. **Get your frontend URL:**
   - Netlify will provide: `https://your-app-name.netlify.app`
   - Your site is now live!

---

## Alternative: Deploy Everything to Railway

If you want everything on Railway:

1. Railway can serve both backend and frontend
2. Update `server.js` to serve static files (add this before `app.listen`):
   ```javascript
   app.use(express.static(__dirname));
   app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, 'index.html'));
   });
   ```
3. Deploy to Railway as above
4. Your site will be at your Railway URL

---

## Quick Checklist

- [ ] Backend deployed to Railway
- [ ] Environment variables set (JWT_SECRET, BASE_URL)
- [ ] Backend URL copied
- [ ] API_URL updated in index.html
- [ ] Changes pushed to GitHub
- [ ] Frontend deployed to Netlify
- [ ] Test login/register functionality
- [ ] Test script saving/loading

---

## Troubleshooting

**CORS Errors:**
- Make sure your Railway backend URL is correct in `index.html`
- Check that CORS is enabled in `server.js` (it already is)

**Database Issues:**
- SQLite works on Railway but data may be lost on redeploy
- For production, consider upgrading to PostgreSQL later

**Can't Login:**
- Check that JWT_SECRET is set on Railway
- Verify API_URL in index.html matches your Railway URL

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Netlify Docs: https://docs.netlify.com
