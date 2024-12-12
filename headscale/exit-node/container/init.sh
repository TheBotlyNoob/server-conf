#!/bin/sh

/usr/local/bin/headscale users create exit-node-user

TS_AUTHKEY="$(/usr/local/bin/headscale preauthkeys create --ephemeral -e 15m -o json -u exit-node-user | jq -r '.key')"
export TS_AUTHKEY

export TS_EXTRA_ARGS="$TS_EXTRA_ARGS --login-server=http://headscale:8080"

/usr/local/bin/containerboot
