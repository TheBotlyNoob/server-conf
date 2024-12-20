FROM headscale/headscale:stable AS headscale

FROM alpine:latest

COPY --from=headscale /ko-app/headscale /usr/local/bin/headscale
COPY --chmod=555 init.sh /usr/local/bin/init.sh

RUN touch /dns-rules.json && \
    chmod 666 /dns-rules.json

ENTRYPOINT [ "/usr/local/bin/init.sh" ]
