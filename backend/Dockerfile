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

# entrypoint.d scripts run before CMD (e.g. .env setup); uses serversideup default CMD /init
COPY --chmod=755 ./entrypoint.d/ /etc/entrypoint.d/

# Ensure www-data can read/write (serversideup runs as www-data; needs .env, storage, cache)
USER root
RUN chown -R www-data:www-data /var/www/html
USER www-data

# Render uses port 10000 by default
ENV NGINX_HTTP_PORT=10000
ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr

# Enable serversideup Laravel AUTORUN (config:cache, route:cache, migrate, optimize, etc.)
ENV AUTORUN_ENABLED=true
ENV AUTORUN_LARAVEL_MIGRATION=true
ENV AUTORUN_LARAVEL_MIGRATION_FORCE=true
