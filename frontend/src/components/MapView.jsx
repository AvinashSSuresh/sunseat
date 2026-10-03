import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icons breaking under Vite's bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FitBounds({ geometry }) {
  const map = useMap();
  useEffect(() => {
    if (geometry && geometry.length > 0) {
      map.fitBounds(geometry, { padding: [40, 40] });
    }
  }, [geometry, map]);
  return null;
}

function MapView({ from, to, geometry }) {
  const center = geometry?.[0] || [from?.lat, from?.lon] || [9.9312, 76.2673]; // fallback: Kochi

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {from && (
          <Marker position={[from.lat, from.lon]}>
            <Popup>Start: {from.name}</Popup>
          </Marker>
        )}
        {to && (
          <Marker position={[to.lat, to.lon]}>
            <Popup>End: {to.name}</Popup>
          </Marker>
        )}
        {geometry && geometry.length > 0 && (
          <>
            <Polyline positions={geometry} pathOptions={{ color: '#ffb703', weight: 5 }} />
            <FitBounds geometry={geometry} />
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;