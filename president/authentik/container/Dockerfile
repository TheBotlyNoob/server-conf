FROM ghcr.io/goauthentik/server:latest

COPY --chmod=555 init.sh /usr/local/bin/init.sh

ENTRYPOINT [ "/usr/local/bin/init.sh" ]
