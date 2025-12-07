# Frontend Dockerfile (static site)
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy site content (root context excludes backend via .dockerignore)
COPY . /usr/share/nginx/html

EXPOSE 80

# No CMD override; use default nginx
