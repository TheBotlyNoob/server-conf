#!/bin/sh

SUBDOMAINS=$(echo "$PROXY_SUBDOMAINS" | tr "," "\n")

for SUBDOMAIN in $SUBDOMAINS; do
    _DOCKER_SOCKET_PORT=$(echo "$SUBDOMAIN" | cut -d':' -f3)
    PORT=$(echo "$SUBDOMAIN" | cut -d':' -f2)
    SUBDOMAIN=$(echo "$SUBDOMAIN" | cut -d':' -f1)

    cat <<EOF >/rules/"$SUBDOMAIN-subdomain-rev-proxy".yml
http:
    routers:
        $SUBDOMAIN-subdomain-rev-proxy-rtr:
            rule: HostRegexp(\`^(.+\.)?$SUBDOMAIN\.{{ env "DOMAINNAME" | regexQuoteMeta }}$\`)
            service: $SUBDOMAIN-subdomain-rev-proxy-svc
    services:
        $SUBDOMAIN-subdomain-rev-proxy-svc:
            loadBalancer:
                servers:
                    - url: "http://frps-internal:$PORT"
EOF
done

/entrypoint.sh traefik
