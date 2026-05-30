# Serves pre-built static assets from ./dist (build locally or in CI before image build).
#   cd new_ui && npm ci && npm run build
#   docker compose build frontend
FROM nginx:stable-alpine

RUN apk add --no-cache gettext

COPY dist /usr/share/nginx/html
COPY public/config.js.template /usr/share/nginx/html/config.js.template
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
