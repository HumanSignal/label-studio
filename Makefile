# Run Django dev server with Sqlite
run-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py runserver

# Run Django dev migrations with Sqlite
migrate-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py migrate

# Run Django dev shell environment with Sqlite
shell-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py shell_plus

# Install modules
frontend-setup:
	cd label_studio/frontend && npm ci && npm run download:all;

# Fetch DM and LSF
frontend-fetch:
	cd label_studio/frontend && npm run download:all;

# Build frontend continuously on files changes
frontend-watch:
	cd label_studio/frontend && npm start

# Build production-ready optimized bundle
frontend-build:
	cd label_studio/frontend && npm ci && npm build:production

# Run tests
test:
	cd label_studio && pytest -v -m "not integration_tests"
