#!/bin/sh

[ -f "/var/cache/headplane/api-key.txt" ] || /usr/local/bin/headscale apikey create -e 9999d -o yaml >/var/cache/headplane/api-key.txt

ROOT_API_KEY=$(cat /var/cache/headplane/api-key.txt)
export ROOT_API_KEY

node ./build/headplane/server.js
