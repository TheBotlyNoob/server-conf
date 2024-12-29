#!/bin/sh

set -e

REGEX_DOMAINNAME=$(printf "%s$" "$(echo "$DOMAINNAME" | sed 's/\./\\./g')")
export REGEX_DOMAINNAME

(
    echo "cat <<EOF"
    cat /config.template.yaml
    echo EOF
) | sh >/data/config.yaml

(
    echo "cat <<EOF"
    cat /registration.template.yaml
    echo EOF
) | sh >/registration/discord.yaml
