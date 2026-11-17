FROM node:22-alpine AS construction

WORKDIR /depot

COPY mobile/package.json mobile/package-lock.json ./mobile/
COPY admin-web/package.json admin-web/package-lock.json ./admin-web/

RUN cd mobile && npm ci --ignore-scripts --no-audit --no-fund && cd ../admin-web && npm ci --ignore-scripts --no-audit --no-fund

COPY mobile ./mobile
COPY admin-web ./admin-web

ENV VITE_API_URL=/

RUN cd mobile && npx vite build && cd ../admin-web && npx vite build


FROM nginx:alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construction /depot/mobile/dist /usr/share/nginx/html
COPY --from=construction /depot/admin-web/dist /usr/share/nginx/html/admin

EXPOSE 80
