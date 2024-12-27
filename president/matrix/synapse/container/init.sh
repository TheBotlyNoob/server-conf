#!/bin/sh

set -e

if [ -f /config/homeserver.yaml ]; then
    echo "Config file already exists, skipping"
    exit 0
fi

(
    echo "cat <<EOF"
    cat /homeserver.template.yaml
    echo EOF
) | sh >/config/homeserver.yaml
