#!/usr/bin/env bash
set -euo pipefail
echo "=== API TREE ==="
if [ -d src/app/api ]; then
  find src/app/api -maxdepth 5 -type f | sort
else
  echo "src/app/api missing"
fi


