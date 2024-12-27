#!/bin/sh

set -e

echo "$DOMAINNAME"

(
    echo "cat <<EOF"
    cat /config.template.json
    echo EOF
) | sh >/app/config.json

cat /app/config.json
