#!/bin/sh
set -e

# ----------------------------------------------------
# 1. КОНФИГУРАЦИЯ NGINX
# ----------------------------------------------------

NGINX_VARS='$DOMAIN $HOST_PLAYLIST_SERVICE $HOST_ORDER_SERVICE $HOST_AUTH_SERVICE $HOST_SOCKET_SERVICE'

echo "Configuring Nginx with: $NGINX_VARS"

envsubst "$NGINX_VARS" < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# ----------------------------------------------------
# 2. КОНФИГУРАЦИЯ VITE/REACT (RUNTIME CONFIG)
# ----------------------------------------------------

VITE_VARS='$VITE_PLST_API_URL $VITE_AUTH_API_URL $VITE_WS_API_URL $VITE_ORDER_API_URL $VITE_AUTH_CLIENT_ID $VITE_TWITCH_CLIENT_ID $VITE_TWITCH_REDIRECT_URI $VITE_TWITCH_SCOPES $VITE_DA_CLIENT_ID $VITE_DA_REDIRECT_URI $VITE_DA_SCOPES'

echo "Configuring Vite runtime variables..."

envsubst "$VITE_VARS" < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js

cat /usr/share/nginx/html/config.js

echo "DEBUG: All current environment variables:"
printenv # <-- Добавьте эту команду для проверки
echo "------------------------------------------"

# ----------------------------------------------------
# 3. ЗАПУСК NGINX
# ----------------------------------------------------

echo "Starting Nginx..."
exec nginx -g 'daemon off;'