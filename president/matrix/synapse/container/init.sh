#!/bin/sh

set -e

(
    echo "cat <<EOF"
    cat /homeserver.template.yaml
    echo EOF
) | sh >/config/homeserver.yaml
