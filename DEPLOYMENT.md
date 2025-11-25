# Railway Deployment Guide for Zoho Cliq Extension

## ✅ Fixed Issues
1. ✅ Created `.gitignore` to prevent secret leaks
2. ✅ Fixed critical bug in `webhook_handler.js` (event parameter)
3. ✅ Created Railway configuration files (`railway.json`, `nixpacks.toml`, `Procfile`)
4. ✅ Updated `manifest.json` (removed invalid function, cleaned structure)
5. ✅ Added rate limiting and security middleware (Helmet)
6. ✅ Enhanced health check with detailed diagnostics
7. ✅ Added graceful shutdown handling
8. ✅ Added input validation to all action endpoints

## 🚀 Deployment Steps

### Step 1: Install New Dependencies
```bash
cd cliq-extension
npm install
```

This installs the new security dependencies:
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers
- `winston` - Structured logging

### Step 2: Commit Changes to Git
```bash
git add .
git commit -m "Add Railway config and security improvements"
git push origin main
```

### Step 3: Configure Railway

#### Option A: Deploy via Railway Dashboard (Recommended)
1. Go to [Railway.app](https://railway.app) and login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository: `Madhu1005/cliq-dashboard-widget`
4. Railway will automatically detect the configuration

#### Option B: Deploy via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to existing project or create new
railway link

# Deploy
railway up
```

### Step 4: Set Environment Variables in Railway

Go to your Railway project → **Variables** tab and add:

```env
# Required
BACKEND_API_URL=https://your-fastapi-backend.railway.app
ZOHO_VERIFICATION_TOKEN=your_token_from_zoho
PORT=3000

# Optional
STRESS_THRESHOLD=7
NODE_ENV=production
ADMIN_ALERT_CHANNEL=
```

**Important:** 
- `BACKEND_API_URL` should be your already-deployed FastAPI backend URL
- `ZOHO_VERIFICATION_TOKEN` you'll get after registering the extension in Zoho (Step 6)
- If you don't have the token yet, leave it empty for now (webhook security will be disabled with a warning)

### Step 5: Deploy and Get Your Railway URL

After deployment completes (2-3 minutes):
1. Go to **Settings** tab → **Domains** section
2. Click **"Generate Domain"** 
3. Copy your Railway URL (e.g., `https://cliq-dashboard-widget-production.up.railway.app`)
4. Test the health endpoint: `curl https://your-url.railway.app/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T10:44:00.000Z",
  "uptime": 5.234,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "backend": { "status": "up", "responseTime": 234 },
    "memory": { "status": "ok", "heapUsed": "45.23 MB" },
    "config": { "status": "ok", "backendConfigured": true, "tokenConfigured": true }
  },
  "responseTime": "245ms"
}
```

### Step 6: Update manifest.json with Railway URL

Replace all placeholder URLs in `cliq-extension/manifest.json`:

```json
{
  "bots": [{
    "webhookUrl": "https://YOUR-RAILWAY-URL.railway.app/bot/webhook"
  }],
  "commands": [{
    "handler": "https://YOUR-RAILWAY-URL.railway.app/commands/team-mood"
  }],
  "widgets": [{
    "url": "https://YOUR-RAILWAY-URL.railway.app/widgets/dashboard"
  }],
  "messageActions": [
    {
      "handler": "https://YOUR-RAILWAY-URL.railway.app/actions/analyze"
    },
    {
      "handler": "https://YOUR-RAILWAY-URL.railway.app/actions/suggest-reply"
    }
  ]
}
```

### Step 7: Register Extension in Zoho Cliq

1. Go to **Zoho Cliq** → **Settings** (gear icon) → **Bots & Tools** → **Extensions**
2. Click **"Create Extension"** → **"Private Extension"**
3. Upload your updated `manifest.json` file
4. Zoho will validate and show you a **Verification Token**
5. **IMPORTANT:** Copy this token!

### Step 8: Add Verification Token to Railway

1. Go back to Railway dashboard
2. **Variables** tab → Add new variable:
   ```
   ZOHO_VERIFICATION_TOKEN=paste_token_here
   ```
3. Railway will automatically redeploy with the new token

### Step 9: Install Extension to Workspace

1. In Zoho Cliq Extensions page, find your extension
2. Click **"Install"** → Select your workspace
3. Grant required permissions
4. Extension is now active!

### Step 10: Test the Extension

#### Test 1: Health Check
```bash
curl https://your-railway-url.railway.app/health
```

#### Test 2: Bot Message (Manual Test)
```bash
curl -X POST https://your-railway-url.railway.app/bot/webhook \
  -H "Content-Type: application/json" \
  -H "x-zoho-verification-token: YOUR_TOKEN" \
  -d '{
    "type": "message",
    "message": {"text": "I am feeling stressed about the deadline"},
    "user": {"id": "test123", "is_bot": false},
    "channel": {"id": "channel456"}
  }'
```

#### Test 3: In Zoho Cliq
1. Go to any channel
2. Send a message like: "I'm feeling overwhelmed with work"
3. The bot should respond with a sentiment analysis card
4. Try the `/team-mood` command
5. Right-click any message → **"Analyze Sentiment"**

## 🔍 Monitoring & Debugging

### View Railway Logs
```bash
# Via CLI
railway logs

# Or in dashboard: Deployments tab → View Logs
```

### Check Health Status
```bash
curl https://your-railway-url.railway.app/health | jq
```

### Common Issues

#### Issue: "Backend not responding"
- **Check:** Is your FastAPI backend running on Railway?
- **Fix:** Verify `BACKEND_API_URL` in Railway variables
- **Test:** `curl $BACKEND_API_URL/health`

#### Issue: "Unauthorized webhook request"
- **Check:** Is `ZOHO_VERIFICATION_TOKEN` set correctly?
- **Fix:** Copy token from Zoho Extensions page → Add to Railway variables
- **Verify:** Check Railway logs for token validation

#### Issue: "Rate limit exceeded"
- **Cause:** Too many requests (>100/min or >20 analysis/min)
- **Fix:** This is normal protection. Wait 1 minute or adjust limits in `server.js`

#### Issue: Build fails on Railway
- **Check:** Railway logs for specific error
- **Common fix:** Ensure `nixpacks.toml` and `railway.json` exist in root
- **Verify:** `package.json` exists in `cliq-extension/` directory

## 📊 What Was Improved

### Security Enhancements
- ✅ Rate limiting (100 req/min general, 20 req/min for analysis)
- ✅ Helmet.js security headers (XSS, clickjacking protection)
- ✅ Input validation on all endpoints
- ✅ Message length limits (5000 chars max)
- ✅ Timing-safe token comparison

### Reliability
- ✅ Enhanced health checks with detailed diagnostics
- ✅ Graceful shutdown (SIGTERM/SIGINT handling)
- ✅ Circuit breaker pattern in API client
- ✅ Request timeout protection
- ✅ Retry logic with exponential backoff

### Production Readiness
- ✅ Railway deployment configuration
- ✅ Proper error handling and logging
- ✅ Environment-based configuration
- ✅ Memory monitoring
- ✅ Uptime tracking

## 🎯 Next Steps After Deployment

1. **Monitor for 24 hours** - Check Railway logs for any errors
2. **Test all features** - Bot responses, commands, message actions
3. **Configure admin alerts** - Add `ADMIN_ALERT_CHANNEL` if needed
4. **Set up uptime monitoring** - Use UptimeRobot or Pingdom
5. **Implement dashboard widget** - Currently shows placeholder
6. **Add analytics** - Track usage patterns, response times
7. **Write tests** - Add Jest tests for critical paths

## 📞 Support

If you encounter issues:
1. Check Railway logs: `railway logs` or dashboard
2. Test health endpoint: `curl https://your-url.railway.app/health`
3. Verify environment variables are set correctly
4. Check Zoho verification token matches
5. Test backend independently: `curl $BACKEND_API_URL/health`

---

**Deployment should now work! The Railway build error is fixed.** 🚀
