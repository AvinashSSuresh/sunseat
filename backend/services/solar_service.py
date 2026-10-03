from datetime import timedelta
import pandas as pd
from pvlib import solarposition
from timezonefinder import TimezoneFinder

_tf = TimezoneFinder()


def get_sun_position(lat, lon, dt):
    times = pd.DatetimeIndex([dt])  # dt must be timezone-aware
    solpos = solarposition.get_solarposition(times, lat, lon)

    azimuth = float(solpos["azimuth"].iloc[0])
    elevation = float(solpos["apparent_elevation"].iloc[0])

    return {
        "azimuth": round(azimuth, 2),
        "elevation": round(elevation, 2),
        "is_daylight": elevation > 0,
    }


def get_sun_positions_for_segments(segments, start_datetime, total_duration_s):
    total_distance = sum(seg["distance_m"] for seg in segments) or 1

    # Interpret the user's departure time in the local timezone of the start point
    first = segments[0]["start"]
    tz_name = _tf.timezone_at(lat=first["lat"], lng=first["lon"]) or "UTC"
    start_datetime = pd.Timestamp(start_datetime).tz_localize(tz_name)

    elapsed_distance = 0
    results = []

    for seg in segments:
        midpoint_distance = elapsed_distance + (seg["distance_m"] / 2)
        fraction = midpoint_distance / total_distance
        segment_time = start_datetime + timedelta(seconds=fraction * total_duration_s)

        mid_lat = (seg["start"]["lat"] + seg["end"]["lat"]) / 2
        mid_lon = (seg["start"]["lon"] + seg["end"]["lon"]) / 2

        sun = get_sun_position(mid_lat, mid_lon, segment_time)

        results.append({
            **seg,
            "time": segment_time.isoformat(),
            "sun_azimuth": sun["azimuth"],
            "sun_elevation": sun["elevation"],
            "is_daylight": sun["is_daylight"],
        })

        elapsed_distance += seg["distance_m"]

    return results