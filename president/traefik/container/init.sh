#!/bin/sh

SUBDOMAINS=$(echo "$PROXY_SUBDOMAINS" | tr "," "\n")

for SUBDOMAIN in $SUBDOMAINS; do
    _DOCKER_SOCKET_PORT=$(echo "$SUBDOMAIN" | cut -d':' -f3)
    PORT=$(echo "$SUBDOMAIN" | cut -d':' -f2)
    SUBDOMAIN=$(echo "$SUBDOMAIN" | cut -d':' -f1)

    cat <<EOF >/rules/"$SUBDOMAIN-subdomain-rev-proxy".yml
http:
    serversTransports:
        $SUBDOMAIN-subdomain-rev-proxy-transport:
            serverName: $SUBDOMAIN.{{ env "DOMAINNAME" }}
    routers:
        $SUBDOMAIN-subdomain-rev-proxy-rtr:
            rule: HostRegexp(\`^(.+\.)?$SUBDOMAIN\.{{ env "DOMAINNAME" | regexQuoteMeta }}$\`)
            service: $SUBDOMAIN-subdomain-rev-proxy-svc
    services:
        $SUBDOMAIN-subdomain-rev-proxy-svc:
            loadBalancer:
                servers:
                    - url: "https://frps-internal:$PORT"
                serversTransport: $SUBDOMAIN-subdomain-rev-proxy-transport
                passHostHeader: true
EOF
done

/entrypoint.sh traefik
