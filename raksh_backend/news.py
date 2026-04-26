"""NEWS-style vital normalization."""

from __future__ import annotations

from .models import Vitals


class NEWSScorer:
    """National Early Warning Score normalization for core vitals."""

    WEIGHTS = {
        "spo2": 0.30,
        "bp": 0.25,
        "rr": 0.20,
        "hr": 0.15,
        "temp": 0.10,
    }

    def score_spo2(self, spo2: float) -> int:
        if spo2 >= 96:
            return 0
        if spo2 >= 94:
            return 1
        if spo2 >= 92:
            return 2
        return 3

    def score_hr(self, hr: float) -> int:
        if hr <= 40:
            return 3
        if hr <= 50:
            return 1
        if hr <= 90:
            return 0
        if hr <= 110:
            return 1
        if hr <= 130:
            return 2
        return 3

    def score_bp(self, bp_sys: float) -> int:
        if bp_sys <= 90:
            return 3
        if bp_sys <= 100:
            return 2
        if bp_sys <= 110:
            return 1
        if bp_sys <= 219:
            return 0
        return 3

    def score_rr(self, rr: float) -> int:
        if rr <= 8:
            return 3
        if rr <= 11:
            return 1
        if rr <= 20:
            return 0
        if rr <= 24:
            return 2
        return 3

    def score_temp(self, temp: float) -> int:
        if temp <= 35.0:
            return 3
        if temp <= 36.0:
            return 1
        if temp <= 38.0:
            return 0
        if temp <= 39.0:
            return 1
        return 2

    def score_all(self, vitals: Vitals) -> dict:
        subscores = {
            "spo2": self.score_spo2(vitals.spo2),
            "hr": self.score_hr(vitals.hr),
            "bp": self.score_bp(vitals.bp_sys),
            "rr": self.score_rr(vitals.rr),
            "temp": self.score_temp(vitals.temp),
        }
        normalized = {name: value / 3.0 for name, value in subscores.items()}

        return {
            "subscores": subscores,
            "normalized": normalized,
            "news_total": sum(subscores.values()),
        }
