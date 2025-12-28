# PAKT Project Documentation
**Last Updated:** December 29, 2025
**Current Version:** 0.6.0
**Status:** Production - Live at getpakt.app

---

## Quick Start for New Chat

```
Read /mnt/user-data/outputs/PAKT-PROJECT.md and continue PAKT development
```

---

## What is PAKT?

A Progressive Web App (PWA) for Australian parents to:
- Plan school lunchboxes (240+ food items from Coles/Woolies)
- Track kids' chores with points system
- Reward healthy eating and completed tasks
- Manage multiple children with dietary preferences

**Tagline:** "Lunch. Chores. Done."

**Target Audience:** Australian parents with school-age children (5-12)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Single-file React app (Babel in-browser) |
| Styling | Tailwind CSS (CDN) |
| Hosting | Cloudflare Pages |
| API | Cloudflare Workers |
| Database | Cloudflare KV |
| Payments | Stripe |
| Domain | getpakt.app (Cloudflare) |
| Email | support@getpakt.app (Cloudflare Email Routing) |

---

## File Locations

### App Files (Deploy to Cloudflare Pages)
All at `/mnt/user-data/outputs/`:

| File | Purpose |
|------|---------|
| `index.html` | Main app (single-file React, ~400KB) |
| `lunchbox-app.jsx` | React source (for reference/editing) |
| `success.html` | Post-payment license key display |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (v6, cache: pakt-v6) |
| `favicon.ico` | Multi-size favicon (16/32/48px) |
| `favicon-32.png` | 32px favicon |
| `icon-192.png` | PWA icon |
| `icon-512.png` | PWA icon large |
| `pakt-worker.js` | Cloudflare Worker source (v3) |

### Transcripts
`/mnt/transcripts/` - Contains all past conversation logs

---

## URLs & Configuration

### Live URLs
- **App:** https://getpakt.app
- **Payment:** https://buy.stripe.com/14AaEY8AH0jQ4LycHn6EU00
- **API:** https://pakt-api.oliveri-john001.workers.dev
- **Success Page:** https://getpakt.app/success.html

### LICENSE_CONFIG (in index.html)
```javascript
const LICENSE_CONFIG = {
  apiUrl: 'https://pakt-api.oliveri-john001.workers.dev',
  productUrl: 'https://buy.stripe.com/14AaEY8AH0jQ4LycHn6EU00',
  price: '$3.99 AUD',
  trialDays: 7,
  debugCode: 'debugpakt'
};
```

### Cloudflare Setup
- **Pages Project:** Hosts app files
- **Worker:** `pakt-api` handles licensing
- **KV Namespace:** `pakt-licenses` stores license data
- **Email Routing:** support@getpakt.app → owner's Gmail

### Stripe Setup
- **Product:** PAKT Lifetime License ($3.99 AUD one-time)
- **Webhook URL:** https://pakt-api.oliveri-john001.workers.dev/webhook
- **Webhook Event:** checkout.session.completed
- **Success Redirect:** https://getpakt.app/success.html?session_id={CHECKOUT_SESSION_ID}

---

## API Endpoints (pakt-worker.js v3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check, returns version |
| `/webhook` | POST | Receives Stripe payment events, creates license |
| `/activate` | POST | Activate license on device (body: {key, deviceId}) |
| `/validate` | GET | Simple key validation (?key=XXX) |
| `/check-device` | GET | Check if device already activated (?deviceId=XXX) |
| `/lookup` | GET | Find license by email (?email=XXX) |
| `/success` | GET | Get license by Stripe session (?session_id=XXX) |
| `/deactivate` | POST | Remove device from license |

### Device Limiting
- Maximum 3 devices per license
- Device fingerprint: SHA-256 hash of browser characteristics
- Stored in localStorage as 'pakt-device-id'
- Device→Key mapping stored in KV as `device:{deviceId}`

---

## License System Flow

### Purchase Flow
```
User clicks Buy → Stripe Checkout → Payment Success
                                          ↓
                            Stripe sends webhook to /webhook
                                          ↓
                            Worker generates PAKT-XXXX-XXXX-XXXX
                                          ↓
                            Stores in KV: {email, devices:[], status}
                                          ↓
                            Stores mapping: email:{email} → key
                                          ↓
                            User redirected to success.html?session_id=XXX
                                          ↓
                            Page fetches key via /success endpoint
                                          ↓
                            User copies key, enters in app
                                          ↓
                            App calls /activate with key + deviceId
                                          ↓
                            License stored in localStorage
```

### Device Recovery (Browser ↔ PWA Sync)
```
App loads → checkDeviceActivation()
                    ↓
            Generates/retrieves deviceId
                    ↓
            Calls /check-device?deviceId=XXX
                    ↓
            If activated: returns licenseKey
                    ↓
            Saves to localStorage → reload
```

---

## App Features

### Core Features
- **Lunchbox Planner:** 7 food categories, 240+ items, bento layouts
- **Chores System:** Custom chores, day-specific, 3 completion types
- **Points System:** Earn points for healthy food + completed chores
- **Rewards:** Custom rewards (10-5000 points), 8 tier system
- **Multi-child:** Separate profiles, avatars, dietary preferences
- **Shopping List:** Auto-generated from meal plans
- **Favorites:** Save preferred foods
- **History:** View past lunchboxes
- **Progress Tracking:** Weekly steps visualization

### Special Features
- **Surprise Week:** Random balanced lunchbox generator
- **Kindness Bonus:** +25% points when siblings help each other
- **Dietary Modes:** Vegetarian, nut-free, gluten-free filters
- **Recipe Book:** Cooking instructions with prep times
- **Benny the Wombat:** Mascot with helpful tips

### UI Components
- **Paywall:** Trial/purchase/license entry modal
- **Support Modal:** Contact info popup
- **Share Button:** Native share API integration
- **Install Guide:** PWA installation instructions

---

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `lunchbox-license` | License data {key, verified, date, email, deviceId} |
| `lunchbox-trial-start` | Trial start timestamp |
| `pakt-device-id` | Device fingerprint |
| `lunchbox-children` | Children profiles array |
| `lunchbox-weekPlan` | Weekly meal plans |
| `lunchbox-rewards` | Custom rewards |
| `lunchbox-favorites` | Favorite foods per child |

---

## Testing Commands (Browser Console)

### Reset to Different States
```javascript
// Fresh Trial (7 days)
localStorage.clear(); sessionStorage.clear(); 
localStorage.setItem('lunchbox-trial-start', Date.now().toString()); 
location.reload();

// Expired Trial
localStorage.clear(); sessionStorage.clear(); 
localStorage.setItem('lunchbox-trial-start', (Date.now() - 10*24*60*60*1000).toString()); 
location.reload();

// Licensed User
localStorage.setItem('lunchbox-license', JSON.stringify({
  key:'PAKT-XXXX-XXXX-XXXX', verified:true, 
  date:new Date().toISOString(), email:'test@test.com'
})); 
location.reload();

// Nuclear Reset
localStorage.clear(); sessionStorage.clear(); location.reload();
```

### API Testing
```javascript
const API = 'https://pakt-api.oliveri-john001.workers.dev';

// Health check
fetch(API).then(r => r.json()).then(console.log);

// Validate key
fetch(API + '/validate?key=PAKT-XXXX-XXXX-XXXX').then(r => r.json()).then(console.log);

// Email lookup
fetch(API + '/lookup?email=test@test.com').then(r => r.json()).then(console.log);

// Simulate webhook (creates test license)
fetch(API + '/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_' + Date.now(), customer_email: 'test@test.com' }}
  })
}).then(r => r.json()).then(console.log);
```

---

## Deployment Checklist

### Update App
1. Edit files in `/mnt/user-data/outputs/`
2. Download updated files
3. Upload to Cloudflare Pages
4. Purge cache (optional but recommended)

### Update Worker
1. Edit `pakt-worker.js`
2. Cloudflare Dashboard → Workers → pakt-api → Edit Code
3. Paste new code → Deploy

### Service Worker Updates
When updating `sw.js`, increment cache version:
```javascript
const CACHE_NAME = 'pakt-v7'; // Increment this
```

---

## Known Considerations

1. **Single-file architecture:** All React code in index.html - works but large
2. **In-browser Babel:** Shows console warning (harmless)
3. **Tailwind CDN:** Shows console warning (harmless)
4. **Device fingerprinting:** Not 100% unique but good enough
5. **No backend database:** All user data in localStorage (device-specific)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.6.0 | Dec 28, 2025 | PAKT rebrand, Stripe payments, device limiting |
| 0.5.3 | Dec 28, 2025 | Food database expansion (241 items) |
| 0.5.2 | Dec 28, 2025 | Points system fix, chores enhancements |
| 0.5.1 | Dec 27, 2025 | Per-category food points, avatar fix |
| 0.5.0 | Dec 27, 2025 | Chores feature, kindness bonus |
| 0.4.1 | Dec 27, 2025 | BentoIcon component |
| 0.4.0 | Dec 27, 2025 | Custom rewards, weekly progress |
| 0.3.0 | Dec 27, 2025 | Food database (187 items) |
| 0.2.6 | Dec 27, 2025 | YUMMZ rebrand, 3-device license |
| 0.2.5 | Dec 26, 2025 | PWA installation |

---

## Recent Changes (This Session)

- ✅ Trial text fixed: "3-day" → "7-day"
- ✅ PRO badge clickable (shows license key)
- ✅ Points sliders have number input option
- ✅ Header tagline: "Lunch. Chores. Done."
- ✅ Support button opens modal (not direct email)
- ✅ Share button added (native sharing)
- ✅ Email changed to support@getpakt.app
- ✅ Email lookup in Paywall (Retrieve License Key)
- ✅ Instagram ads created

---

## Future Ideas (Not Implemented)

- [ ] Family sync (share data between parents)
- [ ] Push notifications
- [ ] Dark mode
- [ ] More food items
- [ ] Seasonal lunchbox themes
- [ ] Export/import data
- [ ] GitHub repo + proper build system

---

## Contact & Accounts

- **Support Email:** support@getpakt.app
- **Domain:** Cloudflare (getpakt.app)
- **Hosting:** Cloudflare Pages
- **Payments:** Stripe
- **Analytics:** Cloudflare Web Analytics (auto-enabled)

---

## For Claude (Next Session)

When continuing development:

1. Read this file first
2. Check `/mnt/user-data/outputs/` for current files
3. Verify URLs haven't changed
4. Ask user what they want to work on
5. Make changes, test, provide updated files
6. Update this PAKT-PROJECT.md with any changes

**Important patterns:**
- Always verify bracket/paren counts after editing
- Update JSX file alongside index.html
- Keep LICENSE_CONFIG URLs correct
- Service worker version must increment on changes
