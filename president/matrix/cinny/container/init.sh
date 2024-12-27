#!/bin/sh

set -e

if [ -f /app/config.json ]; then
    echo "Config file already exists, skipping"
    exit 0
fi

(
    echo "cat <<EOF"
    cat /config.template.json
    echo EOF
) | sh >/app/config.json
