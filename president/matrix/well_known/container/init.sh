#!/bin/sh

set -e

for i in /www-template/**/*; do
    (
        echo "cat <<EOF"
        cat "$i"
        echo EOF
    ) | sh >/var/www/"${i#/www-template/}"
done
