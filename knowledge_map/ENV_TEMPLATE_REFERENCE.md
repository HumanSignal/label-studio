# Label Studio .env Template Reference

This document provides a complete reference template for the `.env` file used by Label Studio.

## Location

The `.env` file should be located at:
```
/path/to/label-studio-custom/data/.env
```

## Complete Template

```env
# Label Studio Environment Configuration
# Copy this template and customize for your environment

# ============================================================================
# REQUIRED CONFIGURATION
# ============================================================================

# Django Secret Key (required)
# Generate a new one: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-secret-key-here

# Base Data Directory Configuration
# This sets the base directory for Label Studio data (media, exports, database)
BASE_DATA_DIR=/path/to/your/label-studio/data

# ============================================================================
# ML BACKEND CONFIGURATION
# ============================================================================

# Enable automatic connection of ML backend to new projects
ADD_DEFAULT_ML_BACKENDS=true

# Default ML Backend URL (automatically connected to all new projects)
# Examples:
#   - Local: http://localhost:9090
#   - Remote: http://ml-server.example.com:8080
#   - Docker: http://ml-backend:9090
DEFAULT_ML_BACKEND_URL=http://localhost:9090

# Display name for the default ML backend
DEFAULT_ML_BACKEND_TITLE=Default ML Backend

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# Database type: sqlite (default), postgresql, mysql
DJANGO_DB=sqlite

# SQLite database path
DATABASE_NAME=/path/to/your/label-studio/data/label_studio.sqlite3

# PostgreSQL Configuration (if using DJANGO_DB=postgresql)
# POSTGRE_USER=postgres
# POSTGRE_PASSWORD=postgres
# POSTGRE_NAME=labelstudio
# POSTGRE_HOST=localhost
# POSTGRE_PORT=5432

# MySQL Configuration (if using DJANGO_DB=mysql)
# MYSQL_USER=root
# MYSQL_PASSWORD=
# MYSQL_NAME=labelstudio
# MYSQL_HOST=localhost
# MYSQL_PORT=3306

# ============================================================================
# SECURITY & AUTHENTICATION
# ============================================================================

# Cloudflare Turnstile Configuration
# For development, use Cloudflare's test keys (always pass validation)
TURNSTILE_ENABLED=false
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Session Configuration
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=Lax
CSRF_COOKIE_SECURE=false
CSRF_COOKIE_HTTPONLY=false
CSRF_COOKIE_SAMESITE=Lax
CSRF_COOKIE_AGE=31449600  # ~1 year in seconds

# Inactivity Session Timeout
INACTIVITY_SESSION_TIMEOUT_ENABLED=true
MAX_SESSION_AGE=1209600  # 14 days in seconds
MAX_TIME_BETWEEN_ACTIVITY=432000  # 5 days in seconds

# SSRF Protection
SSRF_PROTECTION_ENABLED=false
USE_DEFAULT_BANNED_SUBNETS=true
# USER_ADDITIONAL_BANNED_SUBNETS=10.0.0.0/8,172.16.0.0/12

# ============================================================================
# NETWORKING & HOSTNAME
# ============================================================================

# Hostname Configuration (set if behind a proxy or using a specific domain)
# HOST=https://labelstudio.example.com

# ============================================================================
# LOGGING & DEBUGGING
# ============================================================================

# Log Level: DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_LEVEL=WARNING

# JSON formatted logs
JSON_LOG=false

# Debug Mode (DO NOT enable in production)
DEBUG=false
DEBUG_PROPAGATE_EXCEPTIONS=false

# ============================================================================
# STORAGE & FILE HANDLING
# ============================================================================

# Storage persistence
STORAGE_PERSISTENCE=true

# Local file storage
ENABLE_LOCAL_FILES_STORAGE=true
LOCAL_FILES_SERVING_ENABLED=false
LOCAL_FILES_DOCUMENT_ROOT=/

# File upload limits
DATA_UPLOAD_MAX_MEMORY_SIZE=262144000  # 250 MB in bytes
DATA_UPLOAD_MAX_NUMBER_FILES=100

# Task limits
TASK_LOCK_TTL=86400  # 1 day in seconds
LABEL_STREAM_HISTORY_LIMIT=100
RANDOM_NEXT_TASK_SAMPLE_SIZE=50
# TASK_API_PAGE_SIZE_MAX=0

# ============================================================================
# ML BACKEND TIMEOUTS
# ============================================================================

ML_CONNECTION_TIMEOUT=1  # seconds
ML_TIMEOUT_DEFAULT=100  # seconds
ML_TIMEOUT_TRAIN=30  # seconds
ML_TIMEOUT_PREDICT=100  # seconds
ML_TIMEOUT_HEALTH=1  # seconds
ML_TIMEOUT_SETUP=3  # seconds
ML_TIMEOUT_DUPLICATE_MODEL=1  # seconds
ML_TIMEOUT_DELETE=1  # seconds
ML_TIMEOUT_TRAIN_JOB_STATUS=1  # seconds

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================

FROM_EMAIL=Label Studio <hello@labelstud.io>
EMAIL_BACKEND=django.core.mail.backends.dummy.EmailBackend

# For production SMTP:
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=true
# EMAIL_HOST_USER=your-email@gmail.com
# EMAIL_HOST_PASSWORD=your-password

# ============================================================================
# FEATURE FLAGS & EXPERIMENTAL
# ============================================================================

FEATURE_FLAGS_OFFLINE=true
FEATURE_FLAGS_FILE=feature_flags.json
EXPERIMENTAL_FEATURES=false

# ============================================================================
# EXTERNAL SERVICES
# ============================================================================

# Sentry Configuration (error tracking and monitoring)
# SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
# SENTRY_ENVIRONMENT=production
# FRONTEND_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
# FRONTEND_SENTRY_ENVIRONMENT=production

# Stripe Billing Configuration (dj-stripe)
# DJSTRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
# STRIPE_PRO_PRICE_ID=price_your_pro_plan_price_id
# STRIPE_PORTAL_CONFIGURATION_ID=bpc_your_portal_config_id

# ============================================================================
# ADVANCED CONFIGURATION
# ============================================================================

# Organization webhooks
ALLOW_ORGANIZATION_WEBHOOKS=false

# Resource converter
CONVERTER_DOWNLOAD_RESOURCES=true

# Import/export options
ALLOW_IMPORT_TASKS_WITH_UNKNOWN_EMAILS=false

# CSRF enforcement
USE_ENFORCE_CSRF_CHECKS=true

# Storage sync on creation
SYNC_ON_TARGET_STORAGE_CREATION=true

# Google Cloud Logging (for GCP deployments)
# GOOGLE_LOGGING_ENABLED=false
```

## Production Configuration Example

For a production deployment with PostgreSQL and remote ML backend:

```env
# Production Configuration
SECRET_KEY=<generate-strong-random-key>
BASE_DATA_DIR=/var/lib/label-studio/data

# Database
DJANGO_DB=postgresql
POSTGRE_USER=labelstudio_user
POSTGRE_PASSWORD=<strong-password>
POSTGRE_NAME=labelstudio_db
POSTGRE_HOST=db.internal.example.com
POSTGRE_PORT=5432

# ML Backend
ADD_DEFAULT_ML_BACKENDS=true
DEFAULT_ML_BACKEND_URL=http://ml-backend.internal.example.com:9090
DEFAULT_ML_BACKEND_TITLE=Production SAM Model

# Security
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
CSRF_COOKIE_HTTPONLY=true
DEBUG=false
LOG_LEVEL=INFO

# Hostname
HOST=https://labelstudio.example.com

# Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

## Development Configuration Example

For local development:

```env
# Development Configuration
SECRET_KEY=dev-secret-key-not-for-production
BASE_DATA_DIR=/Users/yourname/Developer/label-studio-custom/data

# Local SQLite
DJANGO_DB=sqlite
DATABASE_NAME=/Users/yourname/Developer/label-studio-custom/data/label_studio.sqlite3

# Local ML Backend
ADD_DEFAULT_ML_BACKENDS=true
DEFAULT_ML_BACKEND_URL=http://localhost:9090
DEFAULT_ML_BACKEND_TITLE=SAM Interactive Segmentation

# Development settings
DEBUG=true
LOG_LEVEL=DEBUG
TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

## Docker Configuration Example

For Docker Compose deployment:

```env
# Docker Configuration
SECRET_KEY=<generate-random-key>
BASE_DATA_DIR=/label-studio/data

# PostgreSQL (Docker service name)
DJANGO_DB=postgresql
POSTGRE_USER=postgres
POSTGRE_PASSWORD=postgres
POSTGRE_NAME=postgres
POSTGRE_HOST=postgres  # Docker service name
POSTGRE_PORT=5432

# ML Backend (Docker service name)
ADD_DEFAULT_ML_BACKENDS=true
DEFAULT_ML_BACKEND_URL=http://ml-backend:9090  # Docker service name
DEFAULT_ML_BACKEND_TITLE=SAM Model

# Docker-specific
SESSION_COOKIE_SECURE=false
CSRF_COOKIE_SECURE=false
LOG_LEVEL=INFO
```

## Environment Variable Prefixes

Label Studio checks environment variables with these prefixes (in order):
1. `LABEL_STUDIO_<NAME>` (highest priority)
2. `HEARTEX_<NAME>`
3. `<NAME>` (lowest priority)

Example:
- `LABEL_STUDIO_BASE_DATA_DIR` overrides `BASE_DATA_DIR`
- `HEARTEX_DEBUG` overrides `DEBUG`

## Notes

1. **Secret Key**: Generate a secure random key for production
2. **Restart Required**: Changes to `.env` require restarting Label Studio
3. **File Location**: Must be at `<project>/data/.env` to be loaded automatically
4. **Security**: Don't commit `.env` with sensitive data to version control
5. **Boolean Values**: Use `true/false`, `yes/no`, `on/off`, or `1/0`
6. **Comments**: Lines starting with `#` are ignored

## Validation

To verify your configuration is loaded correctly:
1. Start Label Studio with `python label_studio/manage.py runserver`
2. Check logs for:
   - "=> Database and media directory: <path>"
   - "=> Hostname correctly is set to: <url>" (if HOST is set)
   - Any configuration warnings or errors

## References

- Main settings: `label_studio/core/settings/base.py`
- Label Studio settings: `label_studio/core/settings/label_studio.py`
- Environment utils: `label_studio/core/utils/params.py`

