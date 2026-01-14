# Development Guide

Comprehensive guide for developing on the Label Studio PDF Labeling fork.

## Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Python | 3.10+ (3.12 recommended) | [python.org](https://python.org) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org) |
| Yarn | 1.x | `npm install -g yarn` |
| Poetry | Latest | `pip install poetry` |

## Environment Setup

### Backend Setup

```bash
# Install Python dependencies
pip install poetry
poetry install

# Run database migrations
make migrate-dev

# (Optional) Create a superuser
DJANGO_DB=sqlite poetry run python label_studio/manage.py createsuperuser
```

### Frontend Setup

```bash
cd web

# Install dependencies
yarn install --frozen-lockfile

# (Optional) Create .env for custom configuration
# See "Environment Variables" section below
```

### Running Both Together

You need **two separate terminals**:

**Terminal 1 - Backend:**
```bash
make run-dev
# Runs Django on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd web
DJANGO_HOSTNAME=http://localhost:8000 yarn dev
# Runs Webpack dev server on http://localhost:8010
```

**Access the application at:** http://localhost:8010

The frontend proxies `/api` requests to the backend automatically.

## Environment Variables

### Frontend (.env in project root)

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_HMR` | `false` | Enable Hot Module Replacement |
| `FRONTEND_HOSTNAME` | `http://localhost:8010` | Frontend server address |
| `DJANGO_HOSTNAME` | `http://localhost:8080` | Backend server address |

### Backend (set via environment)

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_DB` | `default` | Database backend (`sqlite` for dev) |
| `DEBUG` | `false` | Enable debug mode |
| `LOG_LEVEL` | `INFO` | Logging level |

## Available Commands

### Backend Commands (from project root)

| Command | Description |
|---------|-------------|
| `make run-dev` | Start Django dev server with SQLite |
| `make migrate-dev` | Run database migrations |
| `make makemigrations-dev` | Create new migrations |
| `make shell-dev` | Open Django shell |
| `make test` | Run backend tests |
| `make fmt` | Format code (pre-commit hooks) |
| `make fmt-check` | Check formatting without fixing |
| `make configure-hooks` | Install pre-commit hooks |

### Frontend Commands (from /web directory)

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server with HMR (port 8010) |
| `yarn watch` | Build continuously (no server) |
| `yarn build` | Production build |
| `yarn ls:dev` | Label Studio app with HMR |
| `yarn ls:watch` | Label Studio app continuous build |
| `yarn lsf:watch` | Editor library continuous build |
| `yarn lsf:serve` | Run editor standalone |
| `yarn dm:watch` | Datamanager continuous build |
| `yarn test:unit` | Run all unit tests |
| `yarn test:e2e` | Run all E2E tests |
| `yarn test:integration` | Run integration tests |
| `yarn lint` | Run Biome linter with autofix |
| `yarn lint-scss` | Run Stylelint on SCSS |
| `yarn ui:serve` | Serve Storybook UI components |

### Docker Commands (optional)

| Command | Description |
|---------|-------------|
| `make docker-dev-setup` | Setup Docker dev environment |
| `make docker-run-dev` | Start with Docker Compose |
| `make docker-migrate-dev` | Run migrations in Docker |

## Project Architecture

### Monorepo Structure (NX)

```
web/
├── apps/
│   ├── labelstudio/          # Main React application
│   │   ├── src/
│   │   │   ├── app/          # App entry point
│   │   │   ├── components/   # App-specific components
│   │   │   ├── pages/        # Page components
│   │   │   └── providers/    # Context providers
│   │   └── project.json      # NX configuration
│   └── labelstudio-e2e/      # E2E tests
│
├── libs/
│   ├── editor/               # Label Studio Frontend (LSF)
│   │   ├── src/
│   │   │   ├── components/   # Annotation UI components
│   │   │   ├── regions/      # Region types (Rectangle, Polygon, etc.)
│   │   │   ├── tags/         # Labeling config tags
│   │   │   └── tools/        # Annotation tools
│   │   └── tests/e2e/        # Cypress tests
│   │
│   ├── datamanager/          # Data exploration tool
│   ├── core/                 # Shared utilities and types
│   ├── ui/                   # Shared UI component library
│   └── app-common/           # Common app components
│
└── package.json              # Workspace root
```

### Backend Structure

```
label_studio/
├── core/                     # Django settings and core config
│   ├── settings/             # Settings modules
│   └── all_urls.json         # API URL mapping
├── projects/                 # Project management
├── tasks/                    # Task management
├── users/                    # User authentication
├── data_export/              # Export functionality
├── data_import/              # Import functionality
├── data_manager/             # Data management
├── ocr/                      # OCR features
├── io_storages/              # Cloud storage integrations
└── manage.py                 # Django management script
```

### Feature Specifications

Each custom feature has a dedicated spec folder:

```
specs/{feature}/
├── spec.md           # Feature requirements and user stories
├── plan.md           # Implementation approach
├── research.md       # Technical research findings
├── data-model.md     # Data structures and schemas
├── tasks.md          # Implementation task checklist
├── quickstart.md     # Quick setup guide
└── contracts/        # API specs, schemas, configs
```

## Development Workflow

### Working on Features

1. **Check out the feature branch**
   ```bash
   git checkout 002-pdf-text-label
   ```

2. **Read the specification**
   - `specs/{feature}/spec.md` - Requirements and acceptance criteria
   - `specs/{feature}/tasks.md` - Implementation checklist

3. **Follow the plan**
   - `specs/{feature}/plan.md` - Implementation approach

4. **Run tests frequently**
   ```bash
   cd web && yarn test:unit
   ```

### Making Changes to the Editor (LSF)

When modifying the editor library:

```bash
cd web

# Watch for changes and rebuild
yarn lsf:watch

# In another terminal, run the main app
DJANGO_HOSTNAME=http://localhost:8000 yarn dev
```

### Testing

**Unit Tests:**
```bash
cd web
yarn test:unit                    # All unit tests
yarn lsf:unit                     # Editor unit tests
yarn dm:unit                      # Datamanager unit tests
```

**E2E Tests:**
```bash
cd web
yarn test:e2e                     # All E2E tests
yarn lsf:e2e                      # Editor E2E tests
yarn ls:e2e                       # Main app E2E tests
```

**Backend Tests:**
```bash
make test
# Or manually:
cd label_studio && DJANGO_DB=sqlite pytest -v
```

### Code Quality

**Pre-commit Hooks (recommended):**
```bash
make configure-hooks
```

This installs hooks that run on `git push`:
- **Biome** - JavaScript/TypeScript linting
- **Ruff** - Python linting

**Manual Linting:**
```bash
# Frontend
cd web && yarn lint

# Python
make fmt-check
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :8000
lsof -i :8010

# Kill the process
kill -9 <PID>
```

#### TypeScript Errors in Console

The codebase has ~370 pre-existing TypeScript errors. These are **warnings only** and don't block the build. The webpack configuration is set to continue despite type errors.

#### Sass Deprecation Warnings

Sass `@import` deprecation warnings are expected and come from upstream. They don't affect functionality.

#### NX Cache Issues
```bash
cd web
yarn nx reset
```

#### Database Issues
```bash
# Reset SQLite database
rm -f label_studio/db.sqlite3
make migrate-dev
```

#### Frontend Not Connecting to Backend

Ensure both servers are running and check the environment:
```bash
# Terminal 1
make run-dev  # Must show "Starting development server at http://127.0.0.1:8000/"

# Terminal 2
cd web
DJANGO_HOSTNAME=http://localhost:8000 yarn dev
```

### Useful Debug Commands

```bash
# Check running processes on dev ports
lsof -i :8000 -i :8010

# Clear NX build cache
cd web && yarn nx reset

# Rebuild everything
cd web && yarn build

# Check Django configuration
DJANGO_DB=sqlite poetry run python label_studio/manage.py check
```

## Technology Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript 5.8** - Type system
- **NX 21.4** - Monorepo management
- **Webpack 5** - Bundler
- **mobx-state-tree** - State management (in editor)
- **Konva** - Canvas drawing
- **PDF.js 4.0** - PDF rendering
- **Tailwind CSS** - Styling
- **Ant Design 4** - UI components
- **Jest/Cypress** - Testing

### Backend
- **Django 5.1** - Web framework
- **Django REST Framework** - API
- **PostgreSQL** - Production database
- **SQLite** - Development database
- **Poetry** - Dependency management
- **uWSGI** - Application server
- **Nginx** - Reverse proxy

## Additional Resources

- [Upstream Label Studio Docs](https://labelstud.io/guide/)
- [Label Studio API Reference](https://api.labelstud.io/)
- [NX Documentation](https://nx.dev/)
- [React Documentation](https://react.dev/)
