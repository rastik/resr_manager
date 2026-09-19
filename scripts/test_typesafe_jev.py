#!/usr/bin/env python3
"""
Test script for TypeSafe AI Jev model integration.
Loads TYPESAFE_API_KEY from .env and queries the System One endpoint.
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

# Load .env from root and server directory
load_dotenv(".env")
load_dotenv("server/.env")

api_key = os.getenv("TYPESAFE_API_KEY", "").strip().strip('"').strip("'")
api_url = os.getenv("TYPESAFE_API_URL", "https://api.typesafe.ai/v1/systemone").strip()
model = os.getenv("TYPESAFE_MODEL", "jev-latest").strip()

print("=" * 60)
print("RESR Property OS - TypeSafe Jev AI Test Script")
print("=" * 60)

if not api_key:
    print("❌ CHYBA: TYPESAFE_API_KEY nie je nastavený v .env súbore.")
    print("Prosím doplňte svoj API kľúč z https://console.typesafe.ai/settings/keys")
    sys.exit(1)

masked_key = f"{api_key[:5]}...{api_key[-4:]}" if len(api_key) > 9 else "***"
print(f"🔑 Nájdený API kľúč: {masked_key} (dĺžka: {len(api_key)})")
print(f"🌐 Endpoint: {api_url}")
print(f"🤖 Model: {model}\n")

sample_listing = """
Na prenájom ponúkame moderný, kompletne zariadený 2-izbový byt v novostavbe Arboria, Veterná ulica v Trnave.
Výmera bytu je 62 m² + balkón 6 m². Byt disponuje novou klimatizáciou Daikin, pivničnou kobkou (3 m²)
a vlastným garážovým státim v podzemnej garáži.
Mesačný nájom: 650 € + 150 € energie vrátane vysokorýchlostného optického internetu.
Voľný od 1. novembra. Domáce zvieratá po dohode.
"""

payload = {
    "model": model,
    "state": sample_listing.strip(),
    "questions": {
        "has_ac": {
            "type": "noul",
            "instructions": "Does this apartment have air conditioning (klimatizácia)?"
        },
        "has_balcony": {
            "type": "noul",
            "instructions": "Does this apartment have a balcony, loggia, or terrace (balkón, lodžia, terasa)?"
        },
        "has_parking": {
            "type": "noul",
            "instructions": "Is a parking spot or garage included or available with the apartment (garáž, parkovanie)?"
        },
        "has_cellar": {
            "type": "noul",
            "instructions": "Does the apartment include a cellar or storage unit (pivnica, kobka)?"
        },
        "furnishing": {
            "type": "choice",
            "instructions": "How is the apartment furnished?",
            "criteria": {
                "furnished": "Fully furnished with furniture and appliances (kompletne zariadený)",
                "partially": "Partially furnished or kitchen only (čiastočne zariadený)",
                "unfurnished": "Unfurnished without furniture (nezariadený)"
            }
        },
        "utilities_included": {
            "type": "noul",
            "instructions": "Are utilities already included in the base rent price or listed as an extra fee?"
        },
        "condition": {
            "type": "choice",
            "instructions": "What is the condition of the apartment?",
            "criteria": {
                "new_building": "New building / development (novostavba)",
                "reconstructed": "Complete reconstruction (rekonštrukcia)",
                "original": "Original condition (pôvodný stav)"
            }
        }
    }
}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

print("Odosielam testovaciu požiadavku na TypeSafe AI...")
try:
    response = requests.post(api_url, json=payload, headers=headers, timeout=10)
    print(f"HTTP Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("\n✅ ÚSPECH! TypeSafe Jev AI úspešne vrátil extrahované dáta:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    elif response.status_code == 401:
        print("\n❌ 401 UNAUTHORIZED: Server odmietol API kľúč.")
        print(response.text)
        print("\nSkontrolujte, či kľúč začína prefixom 'ts_' z https://console.typesafe.ai/settings/keys")
    else:
        print(f"\n⚠️ Chyba servera ({response.status_code}):")
        print(response.text)
except Exception as e:
    print(f"\n❌ Chyba pripojenia: {e}")
