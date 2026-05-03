"""
firebase_bridge.py
------------------
Pushes scraped leads from the Python scraper directly into the
Outreach CRM Firebase Realtime Database.

SETUP (one-time):
1. Go to: https://console.firebase.google.com/project/outrach-crm/settings/serviceaccounts/adminsdk
2. Click "Generate new private key" → download the JSON file
3. Save it as: serviceAccountKey.json  (in the same folder as this file)
4. Run: pip install firebase-admin
"""

import json
import uuid
import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, db as firebase_db

    _FIREBASE_AVAILABLE = True
except ImportError:
    _FIREBASE_AVAILABLE = False
    print("[firebase_bridge] WARNING: firebase-admin not installed.")
    print("[firebase_bridge] Run: pip install firebase-admin")


DATABASE_URL = "https://outrach-crm-default-rtdb.europe-west1.firebasedatabase.app"
SERVICE_ACCOUNT_FILE = "serviceAccountKey.json"

_initialized = False


def _init():
    """Initialize Firebase Admin SDK (only once per session)."""
    global _initialized
    if _initialized or not _FIREBASE_AVAILABLE:
        return

    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {"databaseURL": DATABASE_URL})
        _initialized = True
        print("[firebase_bridge] ✓ Connected to Firebase.")
    except FileNotFoundError:
        print(f"[firebase_bridge] ✗ ERROR: '{SERVICE_ACCOUNT_FILE}' not found.")
        print("[firebase_bridge]   Download it from Firebase Console > Project Settings > Service Accounts")
    except Exception as e:
        print(f"[firebase_bridge] ✗ Firebase init error: {e}")


def push_leads(entries: list[dict], source_label: str = "google_maps") -> int:
    """
    Push a list of scraped lead dicts to Firebase.
    
    Args:
        entries:      List of dicts with keys like Title, PhoneNumber, Address, etc.
        source_label: Tag to identify where the lead came from (e.g. 'google_maps', 'yelp')

    Returns:
        Number of leads successfully pushed.
    """
    _init()

    if not _FIREBASE_AVAILABLE or not _initialized:
        print("[firebase_bridge] Skipping Firebase push (not configured).")
        return 0

    leads_ref = firebase_db.reference("leads")
    count = 0
    now = datetime.datetime.utcnow().isoformat() + "Z"

    for entry in entries:
        # Skip entries with no name and no phone
        name = entry.get("Title", "").strip()
        phone = entry.get("PhoneNumber", "").strip()
        if not name and not phone:
            continue

        lead_id = "scrape_" + str(uuid.uuid4()).replace("-", "")[:12]
        lead = {
            "id":           lead_id,
            "name":         name or "Unknown",
            "phone":        phone or "",
            "area":         entry.get("Address", ""),
            "pain":         "",
            "channel":      "WhatsApp",
            "status":       "New",
            "notes":        "",
            "follow_up_date": "",
            "source":       source_label,
            "place_id":     None,
            "rating":       None,
            "en_message":   "",
            "ar_message":   "",
            "created_at":   now,
            "updated_at":   now,
            "activity_log": [
                {"action": f"Scraped from {source_label}", "timestamp": now}
            ],
        }

        try:
            leads_ref.child(lead_id).set(lead)
            count += 1
            print(f"[firebase_bridge] ✓ Pushed: {name} ({phone})")
        except Exception as e:
            print(f"[firebase_bridge] ✗ Failed to push {name}: {e}")

    print(f"[firebase_bridge] Done. {count}/{len(entries)} leads pushed to CRM.")
    return count
