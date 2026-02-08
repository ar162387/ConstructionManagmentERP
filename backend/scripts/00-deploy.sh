#!/usr/bin/env bash
set -e

cd /var/www/html

# Ensure .env exists (Render provides env vars; Laravel needs .env file to bootstrap)
[ -f .env ] || cp .env.example .env

echo "Running composer..."
composer install --no-dev --optimize-autoloader --no-interaction

echo "Caching config..."
php artisan config:cache

echo "Caching routes..."
php artisan route:cache

echo "Running migrations..."
php artisan migrate --force
