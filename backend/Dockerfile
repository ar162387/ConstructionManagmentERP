FROM richarvey/nginx-php-fpm:3.1.6

COPY . .

# Deploy script runs via image's RUN_SCRIPTS (scripts in /var/www/html/scripts/)
RUN chmod +x scripts/00-deploy.sh

# Image config
ENV SKIP_COMPOSER=1
ENV WEBROOT=/var/www/html/public
ENV PHP_ERRORS_STDERR=1
ENV RUN_SCRIPTS=1
ENV REAL_IP_HEADER=1

# Laravel config (overridable via Render env vars)
ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr

# Allow composer to run as root
ENV COMPOSER_ALLOW_SUPERUSER=1

CMD ["/start.sh"]
