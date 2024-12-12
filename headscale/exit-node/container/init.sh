#!/bin/sh

/usr/local/bin/headscale users create exit-node-user

TS_AUTHKEY="$(/usr/local/bin/headscale preauthkeys create --ephemeral -e 15m -o json -u exit-node-user | jq -r '.key')"
export TS_AUTHKEY

export TS_TAILSCALED_EXTRA_ARGS="$TAILSCALE_EXTRA_ARGS --login-server=headscale:8080"

/usr/local/bin/containerboot
