# PAKT Project Documentation
**Last Updated:** December 31, 2025
**Current Version:** 0.7.0
**Status:** Production - Live at getpakt.app

---

## ⚠️ CRITICAL RULES FOR CLAUDE

### Before Making ANY Changes:
1. **ALWAYS verify these exist in index.html before providing updated file:**
   - [ ] Google Analytics: `G-D98VXQ2XM2` (should appear 2x)
   - [ ] trackEvent function defined
   - [ ] trackEvent calls (should be 9+)
   - [ ] FOOD_DATABASE has `filters:` arrays (should be 7)
   - [ ] `activeFilters` state in FoodSelectorModal (should be 8+ occurrences)
   - [ ] Bracket counts balanced (open = close)
   - [ ] LICENSE_CONFIG URLs unchanged
   - [ ] API endpoints unchanged

2. **Never work from memory** - always use the uploaded/fetched file as base

3. **After changes, run verification:**
```bash
echo "Analytics:" && grep -c "G-D98VXQ2XM2" index.html
echo "trackEvent:" && grep -c "trackEvent(" index.html
echo "Filters:" && grep -c "filters:" index.html
echo "activeFilters:" && grep -c "activeFilters" index.html
echo "LICENSE_CONFIG:" && grep -A5 "LICENSE_CONFIG" index.html | head -7
```

4. **Update version number** in index.html when making changes

5. **Update this PAKT-PROJECT.md** with changes made

6. **NEVER modify these without explicit permission:**
   - Stripe webhook URL
   - API endpoint URLs
   - LICENSE_CONFIG values
   - pakt-worker.js endpoints

---

## Quick Start for New Chat

```
Continue PAKT development. Upload files first.
```

Then upload `index.html` and `PAKT-PROJECT.md` from the repo.

---

## What is PAKT?

A Progressive Web App (PWA) for Australian parents to:
- Plan school lunchboxes (309 food items from Coles/Woolies)
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
| Analytics | Google Analytics (G-D98VXQ2XM2) |
| Domain | getpakt.app (Cloudflare) |
| Email | support@getpakt.app (Cloudflare Email Routing) |

---

## Repository Structure

```
pakt-app/
├── public/                    # Cloudflare Pages (auto-deploys)
│   ├── index.html            # Main React app (~8600 lines)
│   ├── success.html          # Post-payment license page
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (v7)
│   ├── favicon.ico           # Multi-size favicon
│   ├── favicon-32.png        # 32px favicon
│   ├── icon-192.png          # PWA icon
│   └── icon-512.png          # PWA icon large
├── worker/
│   └── pakt-worker.js        # Cloudflare Worker API (v3)
├── PAKT-PROJECT.md           # This file
└── README.md                 # Basic readme
```

---

## URLs & Configuration (DO NOT CHANGE)

### Live URLs
- **App:** https://getpakt.app
- **Payment:** https://buy.stripe.com/14AaEY8AH0jQ4LycHn6EU00
- **API:** https://pakt-api.oliveri-john001.workers.dev
- **Success Page:** https://getpakt.app/success.html

### LICENSE_CONFIG (in index.html - DO NOT CHANGE)
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
- **Pages Project:** Hosts app files (auto-deploys from GitHub)
- **Worker:** `pakt-api` handles licensing
- **KV Namespace:** `pakt-licenses` stores license data
- **Email Routing:** support@getpakt.app → owner's Gmail

### Stripe Setup (DO NOT CHANGE)
- **Product:** PAKT Lifetime License ($3.99 AUD one-time)
- **Webhook URL:** https://pakt-api.oliveri-john001.workers.dev/webhook
- **Webhook Event:** checkout.session.completed
- **Success Redirect:** https://getpakt.app/success.html?session_id={CHECKOUT_SESSION_ID}

---

## API Endpoints (pakt-worker.js v3) - DO NOT CHANGE

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
| `lunchbox-chore-progress` | Chore completion status |
| `lunchbox-custom-rewards` | User-created rewards |
| `lunchbox-ate-all` | "Ate it all" tracking |

---

## Google Analytics Events

| Event | When Fired | Parameters |
|-------|------------|------------|
| `child_created` | New child added | child_name |
| `child_updated` | Child profile edited | child_name |
| `lunchbox_planned` | Day saved with items | day, item_count, child_name |
| `chore_completed` | Chore marked done | chore_name, points, child_name |
| `reward_redeemed` | Reward claimed | reward_name, points_cost, child_name |
| `favorite_saved` | Lunch saved as favorite | favorite_name |
| `surprise_week_used` | 🎲 Surprise Week clicked | child_name (throttled 60s) |
| `surprise_day_used` | 🎲 Surprise! clicked | day, child_name (throttled 60s) |
| `shopping_item_checked` | Shopping item ticked | - |
| `todo_item_completed` | Todo task checked | - |

---

## Food Database

| Category | Filter Options | Item Count |
|----------|---------------|------------|
| Fruit | Fresh, Dried, Frozen, Cups & Pouches | ~50 |
| Vegetables | Fresh, Pre-Cut, Cooked, Dips | ~40 |
| Dairy | Cheese, Yoghurt, Milk, Other | ~35 |
| Protein | Deli Meats, Chicken, Eggs, Seafood, Vegetarian, Hot Foods | ~50 |
| Grains | Sandwiches, Wraps, Rice, Crackers, Chips, Pasta, Other | ~50 |
| Drinks | Water, Juice, Milk, Flavoured | ~25 |
| Sweets | Bars, Biscuits, Chips, Fruit Snacks, Chocolate | ~60 |
| **Total** | | **~309 items** |

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

## Deployment

### GitHub → Cloudflare Pages (Automatic)
1. Push to `dev` branch → Preview deploy
2. Merge `dev` to `main` → Production deploy
3. Live in ~30 seconds

### Merge Process (No Commands)
1. GitHub → Pull requests → New pull request
2. base: `main` ← compare: `dev`
3. Create pull request → Merge → Confirm

### Worker Updates (Manual)
1. Cloudflare Dashboard → Workers → pakt-api
2. Edit Code → Paste new code → Deploy

### Service Worker Updates
When updating `sw.js`, **increment cache version**:
```javascript
const CACHE_NAME = 'pakt-v8'; // Increment from current
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
| **0.7.1** | **Dec 31, 2025** | **Added per-item supermarket links to shopping list (Woolies/Coles)** |
| 0.7.0 | Dec 31, 2025 | Restored: Google Analytics, food filters, 309 food items, trackEvent calls |
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

## Recent Session (Dec 31, 2025)

**Problem:** index.html was missing Google Analytics, food filters, and ~60 food items

**Fixed:**
- ✅ Restored Google Analytics (G-D98VXQ2XM2)
- ✅ Restored trackEvent + trackEventThrottled functions
- ✅ Restored all 9 trackEvent calls throughout app
- ✅ Restored full FOOD_DATABASE (309 items with tags)
- ✅ Restored category filters (Fresh, Dried, Cheese, etc.)
- ✅ Restored filter UI in FoodSelectorModal
- ✅ Added checkDietaryConflict function
- ✅ Updated sw.js to v7

**New Feature (v0.7.1):**
- ✅ Supermarket deep links in shopping list
- ✅ Subtle per-item links (Woolies • Coles) under each ingredient
- Links open product search in new tab

**Root cause:** Working from outdated file instead of fetching latest

---

## Future Ideas (Not Implemented)

- [ ] Family sync (share data between parents)
- [ ] Push notifications
- [ ] Dark mode
- [ ] Seasonal lunchbox themes
- [ ] Export/import data

---

## Contact & Accounts

- **Support Email:** support@getpakt.app
- **Domain:** Cloudflare (getpakt.app)
- **Hosting:** Cloudflare Pages
- **Payments:** Stripe
- **Analytics:** Google Analytics (G-D98VXQ2XM2)
