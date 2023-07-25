# Run Django dev server with Sqlite
run-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py runserver

# Run Django dev migrations with Sqlite
migrate-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py migrate

# Run Django dev make migrations with Sqlite
makemigrations-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py makemigrations

# Run Django dev shell environment with Sqlite
shell-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py shell_plus

# Install modules
frontend-setup:
	cd label_studio/frontend && yarn install --frozen-lockfile && yarn run download:all;

# Fetch DM and LSF
frontend-fetch:
	cd label_studio/frontend && yarn run download:all;

# Build frontend continuously on files changes
frontend-watch:
	cd label_studio/frontend && yarn start

# Build production-ready optimized bundle
frontend-build:
	cd label_studio/frontend && yarn install --frozen-lockfile && yarn run build:production

# Run tests
test:
	cd label_studio && DJANGO_DB=sqlite pytest -v -m "not integration_tests"

# Build image which includes test dependencies, for unit testing within docker
build-testing-image:
	docker build -t heartexlabs/label-studio:latest . && docker build -t heartexlabs/label-studio:latest-testing -f Dockerfile.testing .

# Run an interactive shell inside a testing container. Label studio dir will be mounted as a volume
# to avoid need for rebuilds. Run `make build-testing-image` first.
docker-testing-shell:
	docker run --volume ./label_studio:/label-studio/label_studio --volume ./mydata:/label-studio/data:rw -it heartexlabs/label-studio:latest-testing /bin/bash

# Update urls
update-urls:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py show_urls --format pretty-json > ./label_studio/core/all_urls.json
