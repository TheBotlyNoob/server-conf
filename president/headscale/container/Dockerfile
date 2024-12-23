FROM headscale/headscale:latest AS headscale

FROM ghcr.io/tale/headplane:latest

COPY --from=headscale /ko-app/headscale /usr/local/bin/headscale
COPY --chmod=555 init.sh /usr/local/bin/init.sh

CMD [ "/usr/local/bin/init.sh" ]
