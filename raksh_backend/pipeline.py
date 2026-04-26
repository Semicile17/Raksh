"""Single-patient streaming pipeline."""

from __future__ import annotations

from .models import RiskOutput, Vitals
from .news import NEWSScorer
from .risk import ContextAdjuster, EMASmoothing, RiskEngine
from .trends import TrendDetector


class PatientStream:
    """Keeps the minimal state needed to score one patient's stream."""

    ALERT_THRESHOLDS = {
        "LOW": (0, 30),
        "MODERATE": (30, 55),
        "HIGH": (55, 75),
        "CRITICAL": (75, 101),
    }

    def __init__(self, patient_id: str) -> None:
        self.patient_id = patient_id
        self.reading_count = 0
        self.news_scorer = NEWSScorer()
        self.trend_detector = TrendDetector()
        self.risk_engine = RiskEngine()
        self.context_adjuster = ContextAdjuster()
        self.ema_smoother = EMASmoothing()

    def ingest(self, vitals: Vitals) -> RiskOutput:
        self.reading_count += 1

        news_result = self.news_scorer.score_all(vitals)
        self.trend_detector.add_reading(vitals)
        trend_result = self.trend_detector.get_trend_bonuses()

        risk_result = self.risk_engine.compute(
            news_result["normalized"],
            trend_result["bonuses"],
            vitals,
        )
        context_result = self.context_adjuster.adjust(risk_result["total_risk"], vitals)
        raw_score = round(context_result["adjusted_risk"] * 100, 1)
        smoothed_score = self.ema_smoother.smooth(raw_score)

        return RiskOutput(
            patient_id=self.patient_id,
            reading_index=self.reading_count,
            news_total=news_result["news_total"],
            raw_score=raw_score,
            smoothed_score=smoothed_score,
            alert_level=self._classify_alert(smoothed_score),
            reasons=risk_result["reasons"] + context_result["context_reasons"],
            trend_directions=trend_result["directions"],
            shock_pattern=risk_result["shock_pattern"],
            resp_pattern=risk_result["resp_pattern"],
            vitals=vitals.to_dict(),
        )

    def _classify_alert(self, score: float) -> str:
        for level, (low, high) in self.ALERT_THRESHOLDS.items():
            if low <= score < high:
                return level
        return "CRITICAL"
