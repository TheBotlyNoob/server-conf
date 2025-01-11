#!/usr/bin/env bash

# https://forums.docker.com/t/how-to-get-a-sizeable-and-persistent-volume/117305/2

set -e

# shellcheck source=/dev/null
. .env

if [ -z "$PINGVIN_STORAGE_SIZE_MEGABITS" ]; then
    echo "PINGVIN_STORAGE_SIZE_MEGABITS is not set"
    exit 1
fi

if [ -z "$APP_ROOT" ]; then
    echo "APP_ROOT is not set"
    exit 1
fi

disk_path="$APP_ROOT/pingvin/data"
mkdir -p "$disk_path"
chown -R "$PUID:$PGID" "$disk_path"

dd if=/dev/zero of="$disk_path/pingvin.img" bs=1M "count=$PINGVIN_STORAGE_SIZE_MEGABITS" status=progress

mkfs.ext4 "$disk_path/pingvin.img"
