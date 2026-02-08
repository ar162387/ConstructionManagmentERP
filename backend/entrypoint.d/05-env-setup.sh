#!/bin/sh
cd /var/www/html
[ -f .env ] || cp .env.example .env
exit 0
