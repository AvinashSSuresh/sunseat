import { useState } from 'react';
import axios from 'axios';
import LocationInput from './components/LocationInput';
import MapView from './components/MapView';
import RecommendationCard from './components/RecommendationCard';
import BusSeatMap from './components/BusSeatMap';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setRouteData(null);

    try {
      const res = await axios.post(`${API_BASE}/api/journey`, {
        from,
        to,
        date,
        time,
      });
      setRouteData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch journey data.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = from && to && date && time;

  return (
    <div className="app">
      <div className="brand">
        <span className="brand-icon">🚌</span>
        <span className="brand-name">
          Sun<span>Seat</span>
        </span>
      </div>
      <p className="tagline">Know which side of the bus to sit on — before you board.</p>

      <form className="search-card" onSubmit={handleSubmit}>
        <div className="route-swap-row">
          <LocationInput
            id="from"
            label="From"
            placeholder="Starting location"
            value={from}
            onSelect={setFrom}
          />
          <button type="button" className="swap-btn" onClick={handleSwap} title="Swap">
            ⇅
          </button>
        </div>

        <LocationInput
          id="to"
          label="To"
          placeholder="Destination"
          value={to}
          onSelect={setTo}
        />

        <div className="field-row">
          <div className="field-group">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="time">Departure</label>
            <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={!isValid || loading}>
          {loading ? 'Finding route…' : 'Find My Side ☀️'}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {routeData && (
        <div className="results-card">
          <div className="route-summary">
            <span>{(routeData.distance_m / 1000).toFixed(1)} km</span>
            <span>{Math.round(routeData.duration_s / 60)} min</span>
            <span>{routeData.segments.length} segments</span>
          </div>

          <BusSeatMap
            leftExposureMin={routeData.recommendation.left_exposure_min}
            rightExposureMin={routeData.recommendation.right_exposure_min}
            durationMin={routeData.duration_s / 60}
            recommendedSide={routeData.recommendation.recommended_side}
          />

          <RecommendationCard recommendation={routeData.recommendation} />
          <MapView from={from} to={to} geometry={routeData.geometry} />
        </div>
      )}

      <p className="disclaimer">
        SunSeat estimates sun exposure using route, time, and solar position. Buildings, trees,
        clouds, and bus window layout can affect actual sunlight.
      </p>
    </div>
  );
}

export default App;