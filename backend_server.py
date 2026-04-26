"""Run the Raksh scoring backend as an HTTP server."""

from __future__ import annotations

import argparse

from raksh_backend.http_api import run_backend_server


def main() -> int:
    parser = argparse.ArgumentParser(description="Raksh backend HTTP server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    run_backend_server(args.host, args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
