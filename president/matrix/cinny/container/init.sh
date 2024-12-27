#!/bin/sh

set -e

(
    echo "cat <<EOF"
    cat /config.template.json
    echo EOF
) | sh >/app/config.json
