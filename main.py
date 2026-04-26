"""Main entry point for Raksh.

By default this starts the HTTP server for Postman or frontend testing.
Use `--score-once` if you want the old one-shot CLI scoring mode.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from raksh_backend.http_api import run_backend_server
from raksh_backend.service import RakshBackend


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Raksh streaming backend")
    parser.add_argument("--host", default="127.0.0.1", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument(
        "--score-once",
        action="store_true",
        help="Score one input from flags or stdin instead of starting the HTTP server",
    )
    parser.add_argument("--stdin", action="store_true", help="Read a JSON event or list of events from stdin")
    parser.add_argument("--patient-id", help="Patient id for direct vitals input")
    parser.add_argument("--hr", type=float, help="Heart rate in bpm")
    parser.add_argument("--bp-sys", type=float, help="Systolic blood pressure in mmHg")
    parser.add_argument("--spo2", type=float, help="Oxygen saturation percentage")
    parser.add_argument("--rr", type=float, help="Respiratory rate per minute")
    parser.add_argument("--temp", type=float, help="Temperature in Celsius")
    parser.add_argument("--hb", type=float, help="Haemoglobin in g/dL")
    parser.add_argument("--age", type=int, help="Patient age in years")
    return parser


def main() -> int:
    args = build_parser().parse_args()

    if not args.score_once:
        run_backend_server(args.host, args.port)
        return 0

    backend = RakshBackend()

    try:
        if args.stdin:
            result = handle_stdin(backend)
        else:
            result = handle_direct_input(backend, args)
    except ValueError as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 2

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def handle_stdin(backend: RakshBackend) -> dict[str, Any] | list[dict[str, Any]]:
    payload = json.load(sys.stdin)
    if isinstance(payload, list):
        return [backend.ingest_event(event) for event in payload]
    if isinstance(payload, dict):
        return backend.ingest_event(payload)
    raise ValueError("stdin payload must be a JSON object or list of objects")


def handle_direct_input(backend: RakshBackend, args: argparse.Namespace) -> dict[str, Any]:
    required = ("patient_id", "hr", "bp_sys", "spo2", "rr", "temp", "hb", "age")
    missing = [name for name in required if getattr(args, name) is None]
    if missing:
        display_names = [name.replace("_", "-") for name in missing]
        raise ValueError(f"Missing required arguments: {', '.join(display_names)}")

    vitals = {
        "hr": args.hr,
        "bp_sys": args.bp_sys,
        "spo2": args.spo2,
        "rr": args.rr,
        "temp": args.temp,
        "hb": args.hb,
        "age": args.age,
    }
    return backend.ingest_vitals(args.patient_id, vitals)


if __name__ == "__main__":
    raise SystemExit(main())
