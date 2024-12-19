#!/bin/sh

conf_path=/config
conf_copy_path=/config-copy
data_path=/data
# shellcheck disable=SC2125
ariang_js_path=$(echo /usr/local/www/ariang/js/aria-ng*.js)

# If config does not exist - use default
if [ ! -f $conf_path/aria2.conf ]; then
    cp $conf_copy_path/aria2.conf $conf_path/aria2.conf
fi

if [ -n "$RPC_SECRET" ]; then
    sed -i '/^rpc-secret=/d' $conf_path/aria2.conf
    printf 'rpc-secret=%s\n' "${RPC_SECRET}" >>$conf_path/aria2.conf

    if [ -n "$EMBED_RPC_SECRET" ]; then
        echo "Embedding RPC secret into ariang Web UI"
        RPC_SECRET_BASE64=$(printf "%s" "$RPC_SECRET" | base64 -w 0)
        sed -i 's,secret:"[^"]*",secret:"'"${RPC_SECRET_BASE64}"'",g' "$ariang_js_path"
    fi
fi

if [ -n "$ARIA2RPCPORT" ]; then
    echo "Changing rpc request port to $ARIA2RPCPORT"
    sed -i "s/6800/${ARIA2RPCPORT}/g" "$ariang_js_path"
fi

if [ -n "$ARIA2HOST" ]; then
    echo "Changing rpc request host to $ARIA2HOST"
    sed -i "s/localhost/${ARIA2HOST}/g" "$ariang_js_path"
    sed -i "s/rpcHost:\"[^\"]*\"/rpcHost:\"${ARIA2HOST}\"/g" "$ariang_js_path"
fi

if [ -n "$ARIA2PROTOCOL" ]; then
    echo "Changing rpc request protocol to $ARIA2PROTOCOL"
    sed -i "s/\"http\"/\"${ARIA2PROTOCOL}\"/g" "$ariang_js_path"
fi

touch /session/aria2.session

caddy start -config /usr/local/caddy/Caddyfile -adapter=caddyfile
aria2c --conf-path=/config/aria2.conf "$@"
