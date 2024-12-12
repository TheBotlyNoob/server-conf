#!/bin/sh

/usr/local/bin/headscale users create exit-node-user

[ -f "/var/cache/tailscale/preauth-key.txt" ] || /usr/local/bin/headscale preauthkeys create --ephemeral -e 15m -o json -u exit-node-user | jq -r '.key' >/var/cache/tailscale/preauth-key.txt

TS_AUTHKEY="$(cat /var/cache/tailscale/preauth-key.txt)"
export TS_AUTHKEY

export TS_EXTRA_ARGS="$TS_EXTRA_ARGS --login-server=https://$HEADSCALE_HOST"

/usr/local/bin/containerboot
