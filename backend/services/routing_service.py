import math
import requests

OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving"


def calculate_bearing(lat1, lon1, lat2, lon2):
    """
    Initial compass bearing (degrees, 0-360) from point 1 to point 2.
    0 = North, 90 = East, 180 = South, 270 = West.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    x = math.sin(delta_lambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    theta = math.atan2(x, y)
    bearing = (math.degrees(theta) + 360) % 360
    return bearing


def haversine_distance(lat1, lon1, lat2, lon2):
    """Great-circle distance in meters between two lat/lon points."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def simplify_segments(geometry, min_segment_distance_m=300, min_bearing_change_deg=15):
    """
    Reduce a dense list of route points into fewer, meaningful segments.
    A new segment boundary is created only when either:
      - accumulated distance since the last boundary exceeds min_segment_distance_m, OR
      - the bearing has changed by more than min_bearing_change_deg since the last boundary
        (i.e. the road actually turned)
    This keeps segments long on straight roads and short around turns,
    which is exactly what matters for sun-side comparison.
    """
    if len(geometry) < 2:
        return []

    segments = []
    seg_start = geometry[0]
    seg_start_bearing = None
    accumulated_distance = 0.0

    for i in range(len(geometry) - 1):
        lat1, lon1 = geometry[i]
        lat2, lon2 = geometry[i + 1]

        step_distance = haversine_distance(lat1, lon1, lat2, lon2)
        if step_distance < 0.5:
            continue

        step_bearing = calculate_bearing(lat1, lon1, lat2, lon2)

        if seg_start_bearing is None:
            seg_start_bearing = step_bearing

        accumulated_distance += step_distance
        bearing_diff = abs((step_bearing - seg_start_bearing + 180) % 360 - 180)

        should_close_segment = (
            accumulated_distance >= min_segment_distance_m
            or bearing_diff >= min_bearing_change_deg
        )

        if should_close_segment:
            seg_end = geometry[i + 1]
            final_bearing = calculate_bearing(seg_start[0], seg_start[1], seg_end[0], seg_end[1])
            segments.append({
                "index": len(segments),
                "start": {"lat": seg_start[0], "lon": seg_start[1]},
                "end": {"lat": seg_end[0], "lon": seg_end[1]},
                "bearing": round(final_bearing, 2),
                "distance_m": round(accumulated_distance, 1),
            })
            seg_start = seg_end
            seg_start_bearing = None
            accumulated_distance = 0.0

    # Close any remaining trailing segment
    if accumulated_distance > 0:
        seg_end = geometry[-1]
        final_bearing = calculate_bearing(seg_start[0], seg_start[1], seg_end[0], seg_end[1])
        segments.append({
            "index": len(segments),
            "start": {"lat": seg_start[0], "lon": seg_start[1]},
            "end": {"lat": seg_end[0], "lon": seg_end[1]},
            "bearing": round(final_bearing, 2),
            "distance_m": round(accumulated_distance, 1),
        })

    return segments


def get_route(from_lat, from_lon, to_lat, to_lon):
    """
    Fetch the actual road route from OSRM and break it into simplified
    segments, each with a start point, end point, bearing, and distance.
    """
    # OSRM expects lon,lat order
    coords_str = f"{from_lon},{from_lat};{to_lon},{to_lat}"
    url = f"{OSRM_BASE_URL}/{coords_str}"
    params = {"overview": "full", "geometries": "geojson"}

    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError("No route found between these locations.")

    route = data["routes"][0]
    distance_m = route["distance"]
    duration_s = route["duration"]

    # GeoJSON geometry coordinates are [lon, lat] pairs
    raw_coords = route["geometry"]["coordinates"]
    geometry = [[lat, lon] for lon, lat in raw_coords]  # convert to [lat, lon] for Leaflet

    segments = simplify_segments(geometry)

    return {
        "geometry": geometry,
        "segments": segments,
        "distance_m": round(distance_m, 1),
        "duration_s": round(duration_s, 1),
    }