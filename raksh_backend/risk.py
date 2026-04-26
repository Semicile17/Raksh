"""Risk calculation and clinical context adjustment."""

from __future__ import annotations

from typing import Optional

from .models import Vitals
from .news import NEWSScorer


class RiskEngine:
    """Combines NEWS severity, trends, and interaction patterns."""

    SHOCK_LAMBDA = 0.20
    RESP_LAMBDA = 0.20
    SHOCK_HR_THRESHOLD = 100
    SHOCK_BP_THRESHOLD = 100
    RESP_RR_THRESHOLD = 20
    RESP_SPO2_THRESHOLD = 94

    def compute(self, normalized: dict, trend_bonuses: dict, vitals: Vitals) -> dict:
        reasons = []
        vital_components = {}
        base_risk = 0.0

        for vital, weight in NEWSScorer.WEIGHTS.items():
            severity = normalized[vital]
            trend = trend_bonuses.get(vital, 0.0)
            combined = min(1.0, severity + trend)
            contribution = weight * combined
            base_risk += contribution
            vital_components[vital] = {
                "severity": round(severity, 3),
                "trend_bonus": round(trend, 3),
                "combined": round(combined, 3),
                "contribution": round(contribution, 3),
            }

        readable_names = {
            "spo2": f"SpO2 {vitals.spo2}%",
            "hr": f"HR {vitals.hr:.0f} bpm",
            "bp": f"BP {vitals.bp_sys:.0f} mmHg",
            "rr": f"RR {vitals.rr:.0f}/min",
            "temp": f"Temp {vitals.temp:.1f} C",
        }
        for vital, component in vital_components.items():
            if component["severity"] >= 0.67:
                reasons.append(f"{readable_names[vital]} critically abnormal")
            elif component["severity"] >= 0.33:
                reasons.append(f"{readable_names[vital]} mildly abnormal")
            if component["trend_bonus"] >= 0.15:
                reasons.append(f"{readable_names[vital]} trending worse")

        shock_pattern = vitals.hr > self.SHOCK_HR_THRESHOLD and vitals.bp_sys < self.SHOCK_BP_THRESHOLD
        resp_pattern = vitals.rr > self.RESP_RR_THRESHOLD and vitals.spo2 < self.RESP_SPO2_THRESHOLD
        interaction_bonus = 0.0

        if shock_pattern:
            shock_term = self.SHOCK_LAMBDA * (normalized["hr"] * normalized["bp"])
            interaction_bonus += shock_term
            reasons.append(f"Shock pattern: HR {vitals.hr:.0f} high + BP {vitals.bp_sys:.0f} low")

        if resp_pattern:
            resp_term = self.RESP_LAMBDA * (normalized["rr"] * normalized["spo2"])
            interaction_bonus += resp_term
            reasons.append(f"Respiratory pattern: RR {vitals.rr:.0f} high + SpO2 {vitals.spo2}% low")

        total_risk = min(1.0, base_risk + interaction_bonus)

        return {
            "base_risk": round(base_risk, 4),
            "interaction_bonus": round(interaction_bonus, 4),
            "total_risk": round(total_risk, 4),
            "shock_pattern": shock_pattern,
            "resp_pattern": resp_pattern,
            "vital_components": vital_components,
            "reasons": reasons,
        }


class ContextAdjuster:
    """Applies haemoglobin and age context to computed risk."""

    def adjust(self, risk: float, vitals: Vitals) -> dict:
        hb_multiplier = 1.0
        age_multiplier = 1.0
        context_reasons = []

        if vitals.hb < 7.0:
            hb_multiplier = 1.40
            context_reasons.append(f"Severe anaemia: HB {vitals.hb:.1f}, oxygen risk amplified")
        elif vitals.hb < 10.0:
            hb_multiplier = 1.15
            context_reasons.append(f"Moderate anaemia: HB {vitals.hb:.1f}, risk adjusted")

        if vitals.age >= 65:
            age_multiplier = 1.10
            context_reasons.append(f"Age {vitals.age}: reduced physiological reserve")

        combined_multiplier = (hb_multiplier + age_multiplier) / 2.0
        adjusted_risk = min(1.0, risk * combined_multiplier)

        return {
            "adjusted_risk": round(adjusted_risk, 4),
            "hb_multiplier": hb_multiplier,
            "age_multiplier": age_multiplier,
            "context_reasons": context_reasons,
        }


class EMASmoothing:
    """Exponential moving average smoothing for stable output."""

    ALPHA = 0.30

    def __init__(self) -> None:
        self.previous: Optional[float] = None

    def smooth(self, raw_score: float) -> float:
        if self.previous is None:
            self.previous = raw_score
            return raw_score

        smoothed = self.ALPHA * raw_score + (1 - self.ALPHA) * self.previous
        self.previous = smoothed
        return round(smoothed, 2)
