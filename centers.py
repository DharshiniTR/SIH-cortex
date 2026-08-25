from math import radians, sin, cos, sqrt, atan2

# Demo dataset — replace with a real CSC/e-Sevai center DB or API for production.
# In a hackathon, seed this with ~20-30 real centers for your target district.
CENTERS = [
    {"name": "E-Sevai Maiyam - Anna Nagar", "lat": 13.0850, "lon": 80.2101, "address": "Anna Nagar, Chennai"},
    {"name": "E-Sevai Maiyam - Madurai Central", "lat": 9.9252, "lon": 78.1198, "address": "Madurai Central"},
    {"name": "E-Sevai Maiyam - Coimbatore RS Puram", "lat": 11.0025, "lon": 76.9605, "address": "RS Puram, Coimbatore"},
    {"name": "CSC - Trichy Cantonment", "lat": 10.7905, "lon": 78.6856, "address": "Cantonment, Trichy"},
    {"name": "E-Sevai Maiyam - Salem Town", "lat": 11.6643, "lon": 78.1460, "address": "Salem Town"},
]


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def find_nearest_center(lat: float, lon: float) -> dict:
    nearest = min(CENTERS, key=lambda c: _haversine_km(lat, lon, c["lat"], c["lon"]))
    distance = round(_haversine_km(lat, lon, nearest["lat"], nearest["lon"]), 2)
    return {**nearest, "distance_km": distance}
