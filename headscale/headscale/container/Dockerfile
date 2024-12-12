FROM headplane/headplane AS headplane

FROM ghcr.io/tale/headplane:0.3.9

RUN apk add --no-cache jq

COPY --from=headscale /ko-app/headscale /usr/local/bin/headscale
COPY --chmod=555 init.sh /usr/local/bin/init.sh

CMD [ "/usr/local/bin/init.sh" ]
