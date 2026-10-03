import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from services.geocoding_service import search_locations
from services.routing_service import get_route
from services.solar_service import get_sun_positions_for_segments
from services.recommendation_service import compute_journey_recommendation

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "SunSeat backend"})


@app.route("/api/geocode", methods=["GET"])
def geocode():
    query = request.args.get("q", "")
    try:
        results = search_locations(query)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/journey", methods=["POST"])
def journey():
    data = request.get_json(force=True)

    try:
        from_point = data["from"]
        to_point = data["to"]
        date_str = data["date"]
        time_str = data["time"]

        start_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")

        route_result = get_route(
            from_point["lat"], from_point["lon"],
            to_point["lat"], to_point["lon"],
        )

        segments_with_sun = get_sun_positions_for_segments(
            route_result["segments"],
            start_datetime,
            route_result["duration_s"],
        )

        recommendation = compute_journey_recommendation(
            segments_with_sun,
            route_result["duration_s"],
        )

        return jsonify({
            "geometry": route_result["geometry"],
            "distance_m": route_result["distance_m"],
            "duration_s": route_result["duration_s"],
            "start_datetime": start_datetime.isoformat(),
            "segments": segments_with_sun,
            "recommendation": recommendation,
        })

    except KeyError as e:
        return jsonify({"error": f"Missing required field: {e}"}), 400
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, port=port, use_reloader=False)