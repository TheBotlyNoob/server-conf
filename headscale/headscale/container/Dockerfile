FROM headplane/headplane AS headplane

FROM ghcr.io/tale/headplane:0.3.9

COPY --from=headscale /ko-app/headscale /usr/local/bin/headscale
COPY --chmod=555 init.sh /usr/local/bin/init.sh

CMD [ "/usr/local/bin/init.sh" ]
