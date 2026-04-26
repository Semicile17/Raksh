"""Minimal HTTP API for streaming vitals into Raksh."""

from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from .service import RakshBackend


class BackendHTTPServer(ThreadingHTTPServer):
    """HTTP server carrying one shared RakshBackend instance."""

    def __init__(self, server_address: tuple[str, int], backend: RakshBackend) -> None:
        super().__init__(server_address, BackendRequestHandler)
        self.backend = backend


class BackendRequestHandler(BaseHTTPRequestHandler):
    server: BackendHTTPServer

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/vitals":
            self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        try:
            payload = self._read_json()
            output = self.server.backend.ingest_event(payload)
        except ValueError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON body"}, HTTPStatus.BAD_REQUEST)
            return

        self._send_json(output)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _read_json(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)
        payload = json.loads(body.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object")
        return payload

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run_backend_server(host: str, port: int) -> None:
    server = BackendHTTPServer((host, port), RakshBackend())
    print(f"Raksh backend server listening on http://{host}:{port}")
    print("POST /vitals with {patient_id, vitals} for a continuous patient stream.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
