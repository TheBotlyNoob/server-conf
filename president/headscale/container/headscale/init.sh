#!/bin/sh

SUBDOMAINS=$(echo "$PROXY_SUBDOMAINS" | tr "," "\n")

echo "[" >/dns-rules.json

FIRST_LOOP=true

for SUBDOMAIN in $SUBDOMAINS; do
    if [ "$FIRST_LOOP" = true ]; then
        FIRST_LOOP=false
    else
        echo "," >>/dns-rules.json
    fi

    _DOCKER_SOCKET_PORT=$(echo "$SUBDOMAIN" | cut -d':' -f4)
    _PORT=$(echo "$SUBDOMAIN" | cut -d':' -f3)
    TAILSCALE_IP=$(echo "$SUBDOMAIN" | cut -d':' -f2)
    SUBDOMAIN=$(echo "$SUBDOMAIN" | cut -d':' -f1)

    cat <<EOF >>/dns-rules.json
{
    "name": "$SUBDOMAIN.$DOMAINNAME",
    "type": "A",
    "value": "$TAILSCALE_IP"
}
EOF
done

echo "]" >>/dns-rules.json

/usr/local/bin/headscale serve
