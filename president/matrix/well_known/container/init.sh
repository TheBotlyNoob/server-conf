#!/bin/sh

set -e

for i in /www-template/**/*; do
    mkdir -p /var/www/"$(dirname "${i#/www-template/}")"
    (
        echo "cat <<EOF"
        cat "$i"
        echo EOF
    ) | sh >/var/www/"${i#/www-template/}"
done
