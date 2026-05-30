#!/bin/sh
set -e

VITE_VARS='$VITE_PLST_API_URL $VITE_AUTH_API_URL $VITE_WS_API_URL $VITE_SOCKET_PATH $VITE_ORDER_API_URL $VITE_AUTH_CLIENT_ID $VITE_TWITCH_CLIENT_ID $VITE_TWITCH_REDIRECT_URI $VITE_TWITCH_SCOPES $VITE_DA_CLIENT_ID $VITE_DA_REDIRECT_URI $VITE_DA_SCOPES'

echo "Writing runtime config.js..."
envsubst "$VITE_VARS" < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js

echo "Starting nginx..."
exec nginx -g 'daemon off;'
