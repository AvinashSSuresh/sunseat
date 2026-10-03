import os
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

def search_locations(query, limit=5):
    """
    Search for locations matching the query using OpenStreetMap's Nominatim.
    Returns a list of dicts: { display_name, lat, lon }
    """
    if not query or len(query.strip()) < 2:
        return []

    headers = {
        "User-Agent": os.getenv("NOMINATIM_USER_AGENT", "SunSeat/1.0")
    }
    params = {
        "q": query,
        "format": "json",
        "limit": limit,
        "addressdetails": 0,
    }

    response = requests.get(NOMINATIM_URL, headers=headers, params=params, timeout=8)
    response.raise_for_status()
    results = response.json()

    return [
        {
            "display_name": item["display_name"],
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
        }
        for item in results
    ]