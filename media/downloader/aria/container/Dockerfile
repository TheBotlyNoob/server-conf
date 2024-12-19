FROM alpine:3.16.0

ARG ARIANG_VERSION
ARG BUILD_DATE
ARG VCS_REF

ENV ARIA2RPCPORT=443

LABEL maintainer="hurlenko" \
    org.label-schema.build-date=$BUILD_DATE \
    org.label-schema.name="aria2-ariang" \
    org.label-schema.description="Aria2 downloader and AriaNg webui Docker image based on Alpine Linux" \
    org.label-schema.version=$ARIANG_VERSION \
    org.label-schema.url="https://github.com/hurlenko/aria2-ariang-docker" \
    org.label-schema.license="MIT" \
    org.label-schema.vcs-ref=$VCS_REF \
    org.label-schema.vcs-url="https://github.com/hurlenko/aria2-ariang-docker" \
    org.label-schema.vcs-type="Git" \
    org.label-schema.vendor="hurlenko" \
    org.label-schema.schema-version="1.0"

RUN apk update \
    && apk add --no-cache --update caddy aria2 curl

# AriaNG
WORKDIR /usr/local/www/ariang

RUN wget --no-check-certificate https://github.com/mayswind/AriaNg/releases/download/${ARIANG_VERSION}/AriaNg-${ARIANG_VERSION}.zip \
    -O ariang.zip \
    && unzip ariang.zip \
    && rm ariang.zip \
    && chmod -R 755 ./

COPY aria2.conf /config-copy/aria2.conf
COPY --chmod=555 start.sh /
COPY Caddyfile /usr/local/caddy/

VOLUME /data
VOLUME /config

EXPOSE 9081
EXPOSE 6800

ENTRYPOINT ["/start.sh"]
CMD ["--conf-path=/config/aria2.conf"]
