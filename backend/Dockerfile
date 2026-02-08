# Stage 1: Install dependencies with PHP 8.4 (matches composer.lock requirements)
FROM php:8.4-cli AS build
WORKDIR /app

# Install composer and zip extension (required for composer)
RUN apt-get update && apt-get install -y git unzip libzip-dev && \
    docker-php-ext-install zip && \
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY . .
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Stage 2: Runtime with PHP 8.4 + nginx
FROM serversideup/php:8.4-fpm-nginx
WORKDIR /var/www/html

# Copy application and vendor from build stage
COPY --from=build /app /var/www/html

# Startup script: prepare app, run migrations, then start server (chmod in COPY - image runs as www-data)
COPY --chmod=755 scripts/00-deploy.sh /startup.sh

# Ensure www-data can read/write (serversideup runs as www-data; needs .env, storage, cache)
USER root
RUN chown -R www-data:www-data /var/www/html
USER www-data

# Render uses port 10000 by default
ENV NGINX_HTTP_PORT=10000
ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr

# Run migrations at startup, then start nginx/php-fpm
CMD ["/bin/sh", "-c", "/startup.sh && exec /init"]
