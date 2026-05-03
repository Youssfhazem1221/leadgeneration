# Scraper Setup Guide — Outreach CRM

## What This Does
Runs a headless browser that scrapes Google Maps for real business leads
(name, phone, address) and pushes them directly into your CRM's Firebase database.
**No AI. No API key. No rate limits.**

---

## Step 1 — Install Python Dependencies

Open a terminal in the `Lead-Generation-main/Lead-Generation-main/` folder and run:

```bash
pip install firebase-admin playwright beautifulsoup4 geopy
playwright install chromium
```

---

## Step 2 — Download Firebase Service Account Key

1. Go to: https://console.firebase.google.com/project/outrach-crm/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. A JSON file will download — **rename it to `serviceAccountKey.json`**
4. Place it in the same folder as `run.py`

> ⚠️ **Keep this file private.** Never commit it to GitHub. It grants full admin access to your database.

---

## Step 3 — Run the Scraper

```bash
python run.py
```

You'll be prompted for:
- **Business type** (e.g. `dental clinic`, `gym`, `restaurant`)
- **Area/City** (e.g. `Cairo`, `Nasr City`, `Alexandria`)
- **Zoom level** (default 12, increase to narrow down to a district)

A Chromium browser window will open and scroll through Google Maps automatically.
This takes about **3–5 minutes** depending on the number of results.

---

## Step 4 — View in CRM

Once the script finishes:
1. Open **https://outrach-crm.web.app**
2. Go to **Leads Table**
3. Your scraped leads will appear automatically (sourced as `google_maps`)

---

## Tips
- **More results**: Increase `SCROLL_TIME_DURATION_S` in `google_maps/engine.py` (default 200s)
- **Slower scrolling**: Increase `SLEEP_PER_SCROLL_S` (default 5s) to avoid Google rate-limiting
- **Specific district**: Use area like `"Maadi, Cairo"` for a narrow search
- **Multiple niches**: Run the script multiple times with different inputs
