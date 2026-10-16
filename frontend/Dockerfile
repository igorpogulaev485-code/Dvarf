# Prod web image expects a prebuilt Vite `dist/` (built by deploy/sync-and-up.sh
# on the agent). This avoids pulling node + running npm/tsc on the Timeweb VPS
# where Docker Hub / BuildKit often hang for tens of minutes.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html

EXPOSE 80
