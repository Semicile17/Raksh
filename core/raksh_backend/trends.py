"""Sliding-window trend detection for vitals."""

from __future__ import annotations

from collections import deque

from .models import Vitals


class TrendDetector:
    """Calculates slope-based risk bonuses over recent readings."""

    WINDOW_SIZE = 10
    FALLING_IS_BAD = {"spo2", "bp"}
    TREND_BONUS_STRONG = 0.25
    TREND_BONUS_MILD = 0.15
    TREND_DAMP = -0.05

    def __init__(self) -> None:
        self.windows: dict[str, deque[float]] = {
            "spo2": deque(maxlen=self.WINDOW_SIZE),
            "hr": deque(maxlen=self.WINDOW_SIZE),
            "bp": deque(maxlen=self.WINDOW_SIZE),
            "rr": deque(maxlen=self.WINDOW_SIZE),
            "temp": deque(maxlen=self.WINDOW_SIZE),
        }

    def add_reading(self, vitals: Vitals) -> None:
        self.windows["spo2"].append(vitals.spo2)
        self.windows["hr"].append(vitals.hr)
        self.windows["bp"].append(vitals.bp_sys)
        self.windows["rr"].append(vitals.rr)
        self.windows["temp"].append(vitals.temp)

    def get_trend_bonuses(self) -> dict:
        bonuses = {}
        directions = {}

        for vital, window in self.windows.items():
            slope = self._slope(window)
            is_worsening = (slope < 0) if vital in self.FALLING_IS_BAD else (slope > 0)
            is_improving = not is_worsening and abs(slope) > 0.1

            if is_worsening:
                bonus = self.TREND_BONUS_STRONG if abs(slope) > 1.0 else self.TREND_BONUS_MILD
                direction = "worsening"
            elif is_improving:
                bonus = self.TREND_DAMP
                direction = "improving"
            else:
                bonus = 0.0
                direction = "stable"

            bonuses[vital] = bonus
            directions[vital] = direction

        return {"bonuses": bonuses, "directions": directions}

    def _slope(self, values: deque[float]) -> float:
        n = len(values)
        if n < 3:
            return 0.0

        x_values = list(range(n))
        y_values = list(values)
        sum_x = sum(x_values)
        sum_y = sum(y_values)
        sum_xy = sum(x * y for x, y in zip(x_values, y_values))
        sum_x2 = sum(x * x for x in x_values)
        denominator = n * sum_x2 - sum_x**2

        if denominator == 0:
            return 0.0

        return (n * sum_xy - sum_x * sum_y) / denominator
