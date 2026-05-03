"""
run.py — Outreach CRM Lead Scraper
-----------------------------------
Scrapes Google Maps for real businesses and pushes them directly
into your Outreach CRM Firebase database.

Usage:
    python run.py

Prerequisites:
    pip install py-lead-generation firebase-admin playwright
    playwright install chromium
    Place serviceAccountKey.json in this directory.
"""

import asyncio
from py_lead_generation import GoogleMapsEngine
from firebase_bridge import push_leads


async def main() -> None:
    print("=" * 50)
    print("  Outreach CRM — Google Maps Lead Scraper")
    print("=" * 50)

    niche = input("\n📍 What type of business? (e.g. clinic, gym, restaurant): ").strip() or "clinic"
    area  = input("📍 Which area / city?  (e.g. Cairo, Nasr City, Alexandria): ").strip() or "Cairo"
    zoom  = float(input("🔍 Google Maps zoom level (default 12): ").strip() or 12)

    print(f"\n🚀 Scraping Google Maps for: '{niche}' in '{area}' ...")
    print("   (This will open a browser window — don't close it)\n")

    engine = GoogleMapsEngine(niche, area, zoom)
    await engine.run()

    # Save locally as backup CSV
    engine.save_to_csv()
    print(f"\n✅ Saved local backup: google_maps_leads.csv")

    # Push to Firebase → appears in CRM instantly
    print("\n🔥 Pushing leads to Outreach CRM Firebase...")
    pushed = push_leads(engine.entries, source_label="google_maps")
    
    print(f"\n🎉 Done! {pushed} leads are now live in your CRM.")
    print("   Open https://outrach-crm.web.app and check the Leads Table.\n")


if __name__ == "__main__":
    asyncio.run(main())
