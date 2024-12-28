#!/bin/sh

set -e

for i in $(find /www-template -type f); do
    mkdir -p /var/www/"$(dirname "${i#/www-template/}")"
    (
        echo "cat <<EOF"
        cat "$i"
        echo EOF
    ) | sh >"/var/www/${i#/www-template/}"
done

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
