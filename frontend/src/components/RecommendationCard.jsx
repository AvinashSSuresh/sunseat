function RecommendationCard({ recommendation }) {
  if (!recommendation) return null;

  const { recommended_side, left_exposure_min, right_exposure_min, confidence, reason } =
    recommendation;

  const sideLabel =
    recommended_side === 'left'
      ? 'Left side'
      : recommended_side === 'right'
      ? 'Right side'
      : 'Either side';

  return (
    <div className="recommendation-card">
      <div className="recommendation-headline">
        <span className="recommendation-label">Recommended</span>
        <span className={`recommendation-side side-${recommended_side}`}>{sideLabel}</span>
      </div>

      <div className="exposure-row">
        <div className="exposure-stat">
          <span className="exposure-label">Left exposure</span>
          <span className="exposure-value">{left_exposure_min}<small>min</small></span>
        </div>
        <div className="exposure-stat">
          <span className="exposure-label">Right exposure</span>
          <span className="exposure-value">{right_exposure_min}<small>min</small></span>
        </div>
        <div className="exposure-stat">
          <span className="exposure-label">Confidence</span>
          <span className="exposure-value">{confidence}<small>%</small></span>
        </div>
      </div>

      <p className="recommendation-reason">{reason}</p>
    </div>
  );
}

export default RecommendationCard;