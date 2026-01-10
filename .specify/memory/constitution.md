<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 → 1.0.0 (MAJOR - initial constitution)
Modified principles: N/A (new document)
Added sections:
  - 7 Core Principles (I-VII)
  - Development Workflow section
  - Quality Standards section
  - Governance section
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Constitution Check section compatible)
  - .specify/templates/spec-template.md ✅ (User stories + requirements align)
  - .specify/templates/tasks-template.md ✅ (Phase structure compatible)
Follow-up TODOs: None
-->

# Label Studio Custom Development Constitution

## Core Principles

### I. Upstream Compatibility

All customizations MUST maintain compatibility with upstream Label Studio releases. Custom features MUST be implemented in a way that allows merging upstream changes without conflicts where possible. Breaking changes from upstream MUST be evaluated and documented before merge decisions.

**Rationale**: This project is a fork/customization of Label Studio. Maintaining upstream compatibility ensures we can benefit from community improvements, security patches, and new features without costly rewrites.

### II. Test-First Development

New features and bug fixes MUST include tests before implementation. The test cycle follows: Write tests → Verify tests fail → Implement → Verify tests pass → Refactor. Integration tests are REQUIRED for: API endpoints, storage backends, labeling interface changes, and cross-component interactions.

**Rationale**: Label Studio has a complex architecture spanning Django backend, React frontend, and multiple integration points. Tests prevent regressions and document expected behavior.

### III. Documentation-Driven Features

Every new feature MUST have documentation written BEFORE or concurrent with implementation. Documentation includes: user-facing guide updates, API documentation (if applicable), and inline code comments for complex logic. Features without documentation are considered incomplete.

**Rationale**: Label Studio serves diverse users (data scientists, ML engineers, annotators). Clear documentation reduces support burden and improves adoption.

### IV. Configuration Over Code

New labeling capabilities SHOULD be achievable through labeling configuration (XML templates) rather than code changes. When code changes are necessary, they MUST expose configuration options where feasible. Hard-coded behaviors are prohibited unless technically unavoidable.

**Rationale**: Label Studio's power comes from its configurable labeling interfaces. Maintaining this flexibility ensures users can adapt the tool to their specific annotation needs.

### V. Storage Abstraction

All file storage operations MUST use Label Studio's storage abstraction layer. Direct file system access is PROHIBITED except within storage backend implementations. New storage backends MUST implement the full storage interface and include connection validation.

**Rationale**: Label Studio supports multiple storage backends (local, S3, GCS, Azure). Proper abstraction ensures features work across all deployment configurations.

### VI. Security by Default

User input MUST be validated and sanitized. File paths MUST be validated against configured document roots. Authentication and authorization checks MUST be applied to all API endpoints. Local file serving MUST be explicitly enabled (disabled by default). Secrets and credentials MUST NOT be logged or exposed in error messages.

**Rationale**: Label Studio handles sensitive data (annotations, ML models, potentially PII in labeled content). Security vulnerabilities can expose customer data.

### VII. Incremental Delivery

Features MUST be decomposed into independently testable user stories. Each story MUST deliver standalone value when implemented. Stories are prioritized (P1, P2, P3) and implemented in priority order. MVP delivery (P1 story complete) MUST be achievable before full feature completion.

**Rationale**: This enables faster feedback cycles, reduces risk of large failed implementations, and allows partial feature releases when deadlines require.

## Development Workflow

### Branch Strategy

- **develop**: Main integration branch for custom features
- **custom/[feature-name]**: Feature branches for custom development
- **upstream-sync**: Branch for merging upstream Label Studio changes

### Code Organization

- **label_studio/**: Django backend (Python)
- **web/apps/labelstudio/**: Frontend integration point (React)
- **web/libs/editor/**: Labeling interface library (React + MobX)
- **web/libs/datamanager/**: Data manager interface

### Pull Request Requirements

1. All tests MUST pass
2. Code MUST follow existing style (Black for Python, ESLint for JS/TS)
3. Breaking changes MUST be documented
4. PR title MUST follow conventional commits (feat:, fix:, docs:, etc.)
5. Acceptance criteria MUST be provided for QA verification

## Quality Standards

### Performance

- API endpoints MUST respond within 500ms for typical requests
- Labeling interface MUST maintain 60fps during annotation
- Batch operations MUST support progress indication for long-running tasks

### Compatibility

- Python 3.10+ required
- Node.js 18+ required for frontend development
- PostgreSQL 13+ for production deployments
- SQLite supported for development only

### Error Handling

- User-facing errors MUST provide actionable guidance
- Internal errors MUST be logged with sufficient context for debugging
- API errors MUST return appropriate HTTP status codes and structured error responses

## Governance

This constitution supersedes all other development practices for this repository. Amendments require:

1. Written proposal documenting the change
2. Review of impact on existing features
3. Update to this document with version increment
4. Update to affected templates in .specify/templates/

All pull requests and code reviews MUST verify compliance with these principles. Violations MUST be justified in the Complexity Tracking section of the implementation plan.

For runtime development guidance, refer to CLAUDE.md in the repository root.

**Version**: 1.0.0 | **Ratified**: 2026-01-10 | **Last Amended**: 2026-01-10
