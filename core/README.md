# Raksh Backend

Raksh is now a minimal streaming backend.
It keeps the original NEWS-style scoring and trend/risk logic, but removes the
extra patient-data server, ward ranking layer, and simulators.

## Architecture

- `backend_server.py` starts the HTTP API
- `main.py` lets you score direct inputs from the command line
- `raksh_backend/news.py` keeps the NEWS-style subscore rules
- `raksh_backend/trends.py` keeps the rolling trend detection
- `raksh_backend/risk.py` keeps weighted risk, interaction bonuses, context adjustment, and smoothing
- `raksh_backend/pipeline.py` keeps state for one patient's continuous stream
- `raksh_backend/service.py` routes each incoming reading to that patient's stream
- `raksh_backend/http_api.py` exposes one endpoint: `POST /vitals`

## Run The Server

```bash
python3 backend_server.py --host 127.0.0.1 --port 8000
```

## Stream Vitals Into The Single Endpoint

Send each new reading to the same endpoint as the patient continues streaming:

```bash
curl -X POST http://127.0.0.1:8000/vitals \
  -H 'Content-Type: application/json' \
  -d '{
    "patient_id": "PT-001",
    "vitals": {
      "hr": 112,
      "bp_sys": 92,
      "spo2": 91,
      "rr": 28,
      "temp": 39.2,
      "hb": 8.1,
      "age": 70
    }
  }'
```

Post the next reading for `PT-001` to the same endpoint again, and Raksh will
reuse that patient's internal trend window and smoothing state.

## Run With Direct Input

```bash
python3 main.py --patient-id PT-001 --hr 112 --bp-sys 92 --spo2 91 --rr 28 --temp 39.2 --hb 8.1 --age 70
```

## Run With JSON Input

```bash
echo '{"patient_id":"PT-001","vitals":{"hr":112,"bp_sys":92,"spo2":91,"rr":28,"temp":39.2,"hb":8.1,"age":70}}' | python3 main.py --stdin
```

## Use From Python

```python
from raksh_backend import RakshBackend

backend = RakshBackend()

first = backend.ingest_vitals(
    "PT-001",
    {"hr": 112, "bp_sys": 92, "spo2": 91, "rr": 28, "temp": 39.2, "hb": 8.1, "age": 70},
)
second = backend.ingest_vitals(
    "PT-001",
    {"hr": 118, "bp_sys": 89, "spo2": 90, "rr": 30, "temp": 39.4, "hb": 8.1, "age": 70},
)
print(first)
print(second)
```
