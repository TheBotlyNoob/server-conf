#!/bin/sh

ROOT_API_KEY=$(/usr/local/bin/headscale apikey create -e 9999d -o yaml)
export ROOT_API_KEY

node ./build/headplane/server.js
