#!/usr/bin/env python3
"""
Fetch MTG set data and images from Scryfall.

Usage:
    python3 scripts/fetch_set.py <set_code>

Example:
    python3 scripts/fetch_set.py msh

This will:
  1. Fetch all cards for the set from Scryfall
  2. Download card images to public/sets/<code>/images/<code>/
  3. Write public/sets/<code>/<code>.json with localImagePaths added
"""

import json
import os
import ssl
import sys
import time
import urllib.request
import urllib.error

# macOS Python 3 ships without system CA certs; bypass verification for this script
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

SCRYFALL_SEARCH = "https://api.scryfall.com/cards/search"
PUBLIC_SETS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "sets")


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "mtgsetrank-fetcher/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, context=_ssl_ctx) as resp:
        return json.loads(resp.read().decode())


def fetch_all_cards(set_code):
    """Fetch all cards for a set, handling Scryfall pagination."""
    url = (
        f"{SCRYFALL_SEARCH}"
        f"?q=e%3A{set_code}+not%3Aextra+not%3Avariation+not%3Abasic"
        f"&unique=cards&order=set&include_extras=false"
    )
    cards = []
    page = 1
    while url:
        print(f"  Fetching page {page}...", flush=True)
        data = fetch_json(url)
        cards.extend(data["data"])
        url = data.get("next_page")
        page += 1
        if url:
            time.sleep(0.1)  # be polite to Scryfall
    return cards


def image_url_for_card(card):
    """Return the best available image URL for a card."""
    if "image_uris" in card:
        uris = card["image_uris"]
        return uris.get("large") or uris.get("normal") or uris.get("small")
    # Double-faced cards store images on card_faces
    if "card_faces" in card:
        face = card["card_faces"][0]
        if "image_uris" in face:
            uris = face["image_uris"]
            return uris.get("large") or uris.get("normal") or uris.get("small")
    return None


def download_image(url, dest_path):
    req = urllib.request.Request(url, headers={"User-Agent": "mtgsetrank-fetcher/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, context=_ssl_ctx) as resp:
        with open(dest_path, "wb") as f:
            f.write(resp.read())


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/fetch_set.py <set_code>")
        sys.exit(1)

    set_code = sys.argv[1].lower()
    set_dir = os.path.join(PUBLIC_SETS_DIR, set_code)
    img_dir = os.path.join(set_dir, "images", set_code)
    json_path = os.path.join(set_dir, f"{set_code}.json")

    os.makedirs(img_dir, exist_ok=True)

    print(f"Fetching cards for set: {set_code}")
    cards = fetch_all_cards(set_code)
    print(f"Total cards fetched: {len(cards)}")

    print(f"Downloading images to {img_dir}")
    failed_images = []

    for i, card in enumerate(cards):
        collector_number = card.get("collector_number", str(i))
        card_id = card["id"]
        filename = f"{collector_number}-{card_id}.jpg"
        dest_path = os.path.join(img_dir, filename)
        relative_path = f"images/{set_code}/{filename}"

        card["localImagePaths"] = [relative_path]

        if os.path.exists(dest_path):
            print(f"  [{i+1}/{len(cards)}] Skipping (exists): {filename}", flush=True)
            continue

        img_url = image_url_for_card(card)
        if not img_url:
            print(f"  [{i+1}/{len(cards)}] No image URL for: {card['name']}", flush=True)
            failed_images.append(card["name"])
            continue

        try:
            download_image(img_url, dest_path)
            print(f"  [{i+1}/{len(cards)}] Downloaded: {filename}", flush=True)
        except urllib.error.HTTPError as e:
            print(f"  [{i+1}/{len(cards)}] HTTP {e.code} for {card['name']}", flush=True)
            failed_images.append(card["name"])

        time.sleep(0.05)  # ~20 req/s, well within Scryfall's 10 req/s limit with some margin

    print(f"\nWriting {json_path}")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False)

    print(f"\nDone!")
    print(f"  Cards: {len(cards)}")
    print(f"  Images saved: {len(cards) - len(failed_images)}")
    if failed_images:
        print(f"  Failed images ({len(failed_images)}): {failed_images}")
    print(f"\nNext step: add '{{ code: '{set_code}', name: '{set_code.upper()}' }}' to src/constants/sets.js")


if __name__ == "__main__":
    main()
