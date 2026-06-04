import requests
import json
import os
from dotenv import load_dotenv

load_dotenv('.env.production') # Try to load prod env if it exists, otherwise we'll fetch from local

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not url:
    print("No URL found")
    exit(1)

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

payload = [{
    "title": "Test Game",
    "rules_description": "Rules",
    "location": "Location",
    "location_nickname": "Nickname",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "start_time": "2026-06-10T10:00:00.000Z",
    "end_time": "12:00:00",
    "event_type": "pickup",
    "is_league": False,
    "match_style": "5v5",
    "game_format_type": "Casual",
    "surface_type": "Turf",
    "amount_of_fields": 1,
    "field_size": "Standard",
    "shoe_types": ["Turf Shoes", "FG Cleats"],
    "price": 10,
    "max_players": 22,
    "teams_config": [
        {"name": "Home", "color": "neon-blue", "limit": 11},
        {"name": "Away", "color": "neon-orange", "limit": 11}
    ],
    "refund_policy": "No refunds",
    "conduct_policy": "Be nice",
    "is_refundable": False,
    "refund_cutoff_hours": None,
    "refund_cutoff_date": None,
    "allowed_payment_methods": ["venmo", "zelle"],
    "host_ids": ["938d207d-f263-4ac2-bc02-c89b759e1eb5"]
}]

response = requests.post(f"{url}/rest/v1/games", headers=headers, json=payload)
print(response.status_code)
print(response.text)
