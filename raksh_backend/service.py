"""Backend service facade for a continuous patient stream."""

from __future__ import annotations

from typing import Any

from .models import Vitals
from .pipeline import PatientStream


class RakshBackend:
    """Owns per-patient stream state and scores each incoming reading."""

    def __init__(self) -> None:
        self.patient_streams: dict[str, PatientStream] = {}

    def ingest_vitals(self, patient_id: str, vitals_data: dict[str, Any]) -> dict[str, Any]:
        vitals = Vitals.from_dict(vitals_data)
        stream = self.patient_streams.setdefault(patient_id, PatientStream(patient_id))
        output = stream.ingest(vitals)
        return output.to_dict()

    def ingest_event(self, event: dict[str, Any]) -> dict[str, Any]:
        patient_id = event.get("patient_id")
        if not patient_id:
            raise ValueError("Missing required field: patient_id")

        vitals_data = event.get("vitals", event)
        return self.ingest_vitals(str(patient_id), vitals_data)
