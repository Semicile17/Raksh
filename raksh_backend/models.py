"""Core data models for the Raksh scoring service."""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class Vitals:
    """One snapshot in a patient's continuous vitals stream."""

    hr: float
    bp_sys: float
    spo2: float
    rr: float
    temp: float
    hb: float
    age: int
    timestamp: float = field(default_factory=time.time)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Vitals":
        required = ("hr", "bp_sys", "spo2", "rr", "temp", "hb", "age")
        missing = [field_name for field_name in required if field_name not in data]
        if missing:
            raise ValueError(f"Missing required vitals fields: {', '.join(missing)}")

        return cls(
            hr=float(data["hr"]),
            bp_sys=float(data["bp_sys"]),
            spo2=float(data["spo2"]),
            rr=float(data["rr"]),
            temp=float(data["temp"]),
            hb=float(data["hb"]),
            age=int(data["age"]),
            timestamp=float(data.get("timestamp", time.time())),
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RiskOutput:
    """Scored output for one streamed reading."""

    patient_id: str
    reading_index: int
    news_total: int
    raw_score: float
    smoothed_score: float
    alert_level: str
    reasons: list[str]
    trend_directions: dict[str, str]
    shock_pattern: bool
    resp_pattern: bool
    vitals: dict[str, Any]
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
