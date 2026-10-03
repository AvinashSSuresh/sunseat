import math


def compute_segment_side(bearing, sun_azimuth, sun_elevation):
    """
    Determine which side of the bus (if any) receives direct sunlight
    for a single segment, based on bus heading vs sun position.

    Returns: (side, intensity)
      side: 'left', 'right', or 'none'
      intensity: 0.0 - 1.0, how strongly that side is exposed
    """
    if sun_elevation <= 0:
        return "none", 0.0

    # Angle of the sun relative to the direction the bus is facing.
    # 0 = sun directly ahead, 90 = sun on the right, 180 = behind, 270 = left.
    relative_angle = (sun_azimuth - bearing) % 360
    side_component = math.sin(math.radians(relative_angle))  # >0 = right, <0 = left

    # Low sun angle = strong horizontal glare through side windows.
    # High sun (near overhead) = mostly blocked by the roof, minimal side exposure.
    elevation_factor = max(0.0, math.cos(math.radians(min(sun_elevation, 90))))

    intensity = abs(side_component) * elevation_factor

    NEGLIGIBLE_THRESHOLD = 0.12  # sun roughly ahead/behind, or too high overhead
    if intensity < NEGLIGIBLE_THRESHOLD:
        return "none", intensity

    side = "right" if side_component > 0 else "left"
    return side, intensity


def compute_journey_recommendation(segments, total_duration_s):
    """
    Aggregate per-segment sun exposure into an overall LEFT/RIGHT
    recommendation, with confidence and a timeline of per-segment sides.
    """
    total_distance = sum(seg["distance_m"] for seg in segments) or 1

    left_minutes = 0.0
    right_minutes = 0.0
    timeline = []

    for seg in segments:
        seg_duration_s = (seg["distance_m"] / total_distance) * total_duration_s
        seg_duration_min = seg_duration_s / 60

        side, intensity = compute_segment_side(
            seg["bearing"], seg["sun_azimuth"], seg["sun_elevation"]
        )

        weighted_minutes = seg_duration_min * intensity

        if side == "left":
            left_minutes += weighted_minutes
        elif side == "right":
            right_minutes += weighted_minutes

        timeline.append({
            "index": seg["index"],
            "time": seg["time"],
            "side": side,
            "intensity": round(intensity, 3),
        })

    total_exposure = left_minutes + right_minutes

    # Case: negligible sun exposure across the entire journey
    if total_exposure < 1:
        if all(seg["sun_elevation"] <= 0 for seg in segments):
            reason = "The sun is below the horizon for this entire journey. No direct sunlight expected."
        else:
            reason = "The sun stays mostly ahead of or behind the bus during this journey, with little exposure to either side."
        return {
            "recommended_side": "none",
            "left_exposure_min": round(left_minutes, 1),
            "right_exposure_min": round(right_minutes, 1),
            "confidence": 0,
            "reason": reason,
            "timeline": timeline,
        }

    diff = abs(right_minutes - left_minutes)
    confidence = round(min(99, (diff / total_exposure) * 100), 1)

    if diff < total_exposure * 0.08:
        recommended_side = "none"
        reason = "Both sides receive similar sunlight on this route — pick whichever seat you prefer."
    elif right_minutes < left_minutes:
        recommended_side = "right"
        reason = (
            f"The left side faces the sun for more of the journey "
            f"({round(left_minutes)} min vs {round(right_minutes)} min), so the right side stays cooler."
        )
    else:
        recommended_side = "left"
        reason = (
            f"The right side faces the sun for more of the journey "
            f"({round(right_minutes)} min vs {round(left_minutes)} min), so the left side stays cooler."
        )

    return {
        "recommended_side": recommended_side,
        "left_exposure_min": round(left_minutes, 1),
        "right_exposure_min": round(right_minutes, 1),
        "confidence": confidence,
        "reason": reason,
        "timeline": timeline,
    }