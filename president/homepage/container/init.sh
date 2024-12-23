#!/bin/sh

SUBDOMAINS=$(echo "$PROXY_SUBDOMAINS" | tr "," "\n")

cp -R /config /app

for SUBDOMAIN in $SUBDOMAINS; do
    DOCKER_SOCKET_PORT=$(echo "$SUBDOMAIN" | cut -d':' -f2)
    SUBDOMAIN=$(echo "$SUBDOMAIN" | cut -d':' -f1)

    cat <<EOF >>/app/config/docker.yaml
$SUBDOMAIN:
    host: frps-internal
    port: $DOCKER_SOCKET_PORT
EOF
done

/usr/local/bin/docker-entrypoint.sh node server.js
