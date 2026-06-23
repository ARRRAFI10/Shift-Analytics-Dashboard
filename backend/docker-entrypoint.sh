#!/bin/sh
# Prepare the database and seed it from the bundled spreadsheet, then hand off to
# whatever command was given (gunicorn by default). The DB is reseeded on every
# start, so the dashboard always comes up with data even on a fresh container.
set -e

echo "==> Applying migrations"
python manage.py migrate --noinput

echo "==> Importing shift data"
python manage.py import_shifts

echo "==> Starting: $*"
exec "$@"
