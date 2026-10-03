import { useRef } from 'react';
import './BusSeatMap.css';

const HEAT_STOPS = [
  { t: 0.0, color: [52, 214, 196] },
  { t: 0.25, color: [125, 211, 155] },
  { t: 0.5, color: [255, 198, 92] },
  { t: 0.75, color: [255, 143, 74] },
  { t: 1.0, color: [255, 107, 74] },
];

function heatColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    const a = HEAT_STOPS[i];
    const b = HEAT_STOPS[i + 1];
    if (clamped >= a.t && clamped <= b.t) {
      const local = (clamped - a.t) / (b.t - a.t || 1);
      const r = Math.round(a.color[0] + (b.color[0] - a.color[0]) * local);
      const g = Math.round(a.color[1] + (b.color[1] - a.color[1]) * local);
      const bl = Math.round(a.color[2] + (b.color[2] - a.color[2]) * local);
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  const last = HEAT_STOPS[HEAT_STOPS.length - 1].color;
  return `rgb(${last.join(', ')})`;
}

const ROWS = 8;

function Seat({ intensity }) {
  const color = heatColor(intensity);
  const isHot = intensity > 0.6;
  const glow =
    intensity > 0.35
      ? `0 0 ${10 + intensity * 16}px ${2 + intensity * 3}px ${color}70`
      : 'none';
  return (
    <div
      className={`seat ${isHot ? 'seat-hot' : ''}`}
      style={{ background: color, boxShadow: glow }}
    />
  );
}

function SunIcon({ glowStrength }) {
  const core = heatColor(0.6 + glowStrength * 0.4);
  return (
    <svg viewBox="0 0 80 80" width="52" height="52" className="sun-svg">
      <defs>
        <radialGradient id="sunCore" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fff7e0" />
          <stop offset="35%" stopColor={core} />
          <stop offset="100%" stopColor={core} stopOpacity="0.15" />
        </radialGradient>
        <radialGradient id="sunCorona" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={core} stopOpacity="0.5" />
          <stop offset="100%" stopColor={core} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle className="sun-corona" cx="40" cy="40" r="38" fill="url(#sunCorona)" />

      <g className="sun-rays">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const inner = i % 2 === 0 ? 24 : 21;
          const outer = i % 2 === 0 ? 34 : 28;
          const x1 = 40 + Math.cos(angle) * inner;
          const y1 = 40 + Math.sin(angle) * inner;
          const x2 = 40 + Math.cos(angle) * outer;
          const y2 = 40 + Math.sin(angle) * outer;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={core} strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
          );
        })}
      </g>

      <circle cx="40" cy="40" r="15" fill="url(#sunCore)" />
    </svg>
  );
}

function BusSeatMap({ leftExposureMin = 0, rightExposureMin = 0, durationMin = 1, recommendedSide }) {
  const rows = Array.from({ length: ROWS }, (_, i) => i);
  const shellRef = useRef(null);

  const maxExposure = Math.max(leftExposureMin, rightExposureMin, 0.001);
  const GAMMA = 0.55;
  const leftIntensity = Math.pow(leftExposureMin / maxExposure, GAMMA);
  const rightIntensity = Math.pow(rightExposureMin / maxExposure, GAMMA);
  const overallSeverity = Math.min(1, maxExposure / (durationMin * 0.35 || 1));

  const balance = rightIntensity - leftIntensity; // -1 full left, +1 full right
  const sunLeftPercent = 50 + balance * 38;
  const sunTopPx = 6 - overallSeverity * 6;
  const showBeam = overallSeverity > 0.15;

  const handlePointerMove = (e) => {
    const el = shellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tiltX', `${(-py * 10).toFixed(2)}deg`);
    el.style.setProperty('--tiltY', `${(px * 14).toFixed(2)}deg`);
  };

  const handlePointerLeave = () => {
    const el = shellRef.current;
    if (!el) return;
    el.style.setProperty('--tiltX', '0deg');
    el.style.setProperty('--tiltY', '0deg');
  };

  return (
    <div className="bus-map-wrapper">
      <div className="sun-arc">
        <div
          className="sun-icon"
          style={{
            left: `${sunLeftPercent}%`,
            top: `${sunTopPx}px`,
            opacity: 0.55 + overallSeverity * 0.45,
          }}
        >
          <SunIcon glowStrength={overallSeverity} />
        </div>

        {showBeam && (
          <div
            className="light-beam"
            style={{
              left: `${sunLeftPercent}%`,
              transform: `translateX(-50%) rotate(${balance * 9}deg)`,
              '--beamOpacity': (0.35 + overallSeverity * 0.5).toFixed(2),
            }}
          />
        )}
      </div>

      <div className="bus-3d-stage" onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
        <div className="bus-shell" ref={shellRef}>
          <div className="bus-windshield">
            <span className="bus-driver-dot" />
          </div>

          <div className="bus-cabin">
            {rows.map((row) => (
              <div className="seat-row" key={row}>
                <div className={`seat-pair ${leftIntensity > 0.5 ? 'lit-side' : ''}`}>
                  <Seat intensity={leftIntensity} />
                  <Seat intensity={leftIntensity * 0.7} />
                </div>
                <div className="aisle" />
                <div className={`seat-pair ${rightIntensity > 0.5 ? 'lit-side' : ''}`}>
                  <Seat intensity={rightIntensity * 0.7} />
                  <Seat intensity={rightIntensity} />
                </div>
              </div>
            ))}
          </div>

          <div className="bus-rear" />
        </div>
        <div className="bus-floor-shadow" />
      </div>

      <div className="bus-side-labels">
        <span className={`side-tag ${recommendedSide === 'left' ? 'side-tag-recommended' : ''}`}>
          Left {recommendedSide === 'left' && '· cooler'}
        </span>
        <span className={`side-tag ${recommendedSide === 'right' ? 'side-tag-recommended' : ''}`}>
          Right {recommendedSide === 'right' && '· cooler'}
        </span>
      </div>

      <div className="heat-legend">
        <span className="heat-legend-label">Shaded</span>
        <div className="heat-legend-bar" />
        <span className="heat-legend-label">Direct sun</span>
      </div>
    </div>
  );
}

export default BusSeatMap;