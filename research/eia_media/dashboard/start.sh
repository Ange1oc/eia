#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
exec python -m http.server "${PORT:-8000}" --bind 0.0.0.0
