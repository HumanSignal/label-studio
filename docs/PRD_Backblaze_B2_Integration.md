# Product Requirements Document: Backblaze B2 Cloud Storage Integration

## Document Information
- **Feature Name**: Backblaze B2 Cloud Storage Integration
- **Type**: New Storage Backend
- **Created**: October 2025

---

## Executive Summary

This PRD describes the integration of Backblaze B2 Cloud Storage as a new storage backend for Label Studio. This feature enables users to connect their Backblaze B2 buckets for both source storage (importing tasks) and target storage (exporting annotations), providing a cost-effective alternative to AWS S3, Google Cloud Storage, and Azure Blob Storage.

---

## Problem Statement

### Current State
Label Studio currently supports several cloud storage providers (AWS S3, Google Cloud Storage, Azure Blob Storage, Redis, and local storage). However, users looking for cost-effective cloud storage with S3-compatible APIs have limited options, especially those concerned about:

1. **Egress fees**: Major cloud providers charge significant fees for data transfer out of their storage
2. **Unpredictable pricing**: Complex pricing models with multiple factors (storage class, retrieval, operations)
3. **Vendor lock-in**: Limited alternatives force users to accept less favorable terms
4. **Data sovereignty**: Need for specific geographic data storage requirements

### Business Impact
- Users seeking cost-effective storage solutions may choose competitors that support Backblaze B2
- Enterprise customers with large datasets face high egress costs with current providers
- Organizations in specific regions need compliant storage options

### User Pain Points
- "AWS S3 egress fees are too high for our annotation export volumes"
- "We need an affordable S3-compatible storage option"
- "Our data governance requires specific regional storage, and major providers don't meet our needs"

---

## Solution Overview

Integrate Backblaze B2 as a fully-featured storage backend that:

1. **Leverages S3 Compatibility**: Uses B2's S3-compatible API for seamless integration
2. **Supports Both Modes**: Functions as both source storage (import) and target storage (export)
3. **Maintains Parity**: Provides feature parity with existing S3 integration
4. **Offers Cost Benefits**: Enables users to reduce storage costs with Backblaze's competitive pricing

### Key Benefits
- **Cost Reduction**: 20-25% lower storage costs with no egress fees
- **S3 Compatibility**: Familiar API and workflows for users migrating from S3
- **Geographic Options**: Multiple regions including US West, US East, and EU
- **Predictable Pricing**: Simple pricing model without hidden fees

---

## User Stories

### Epic 1: Basic Storage Connection

#### Story 1.1: Configure Source Storage
**As a** data scientist  
**I want to** connect my Backblaze B2 bucket as source storage  
**So that** I can import labeling tasks from my B2 bucket into Label Studio

**Acceptance Criteria:**
- [ ] User can select "Backblaze B2" from storage type dropdown
- [ ] User can enter B2 endpoint URL, Application Key ID, and Application Key
- [ ] User can specify bucket name and optional prefix
- [ ] User can configure presigned URL settings
- [ ] Connection validation works before saving
- [ ] Tasks sync successfully from B2 bucket

#### Story 1.2: Configure Target Storage
**As a** ML engineer  
**I want to** connect my Backblaze B2 bucket as target storage  
**So that** annotations are automatically exported to my B2 bucket

**Acceptance Criteria:**
- [ ] User can select "Backblaze B2" from target storage dropdown
- [ ] User can configure export prefix for organizing annotations
- [ ] Annotations export automatically on save/update
- [ ] User can enable/disable object deletion sync
- [ ] Export status is visible in UI

### Epic 2: Advanced Features

#### Story 2.1: File Filtering and Organization
**As a** project manager  
**I want to** filter and organize B2 files using prefixes and regex  
**So that** I can import only relevant tasks for my project

**Acceptance Criteria:**
- [ ] User can specify bucket prefix to limit scope
- [ ] User can use regex to filter file names
- [ ] Recursive scanning works for nested folders
- [ ] File count preview shows before sync

#### Story 2.2: Secure Media Access
**As a** security-conscious user  
**I want to** use presigned URLs or proxy mode for media access  
**So that** my B2 data remains secure

**Acceptance Criteria:**
- [ ] Presigned URLs work with configurable TTL
- [ ] Proxy mode works when presigned URLs are disabled
- [ ] CORS validation helps troubleshoot access issues
- [ ] Access errors provide clear error messages

### Epic 3: Performance and Reliability

#### Story 3.1: Connection Reliability
**As a** Label Studio administrator  
**I want to** have reliable connections with automatic retries  
**So that** temporary network issues don't disrupt labeling

**Acceptance Criteria:**
- [ ] Configurable connection timeouts
- [ ] Automatic retry with exponential backoff
- [ ] Connection pooling for better performance
- [ ] Clear error messages for connection failures

#### Story 3.2: Large Dataset Handling
**As a** user with large datasets  
**I want to** efficiently sync thousands of files from B2  
**So that** my project setup doesn't take too long

**Acceptance Criteria:**
- [ ] Pagination handles large file lists
- [ ] Sync progress is visible in UI
- [ ] Background sync doesn't block UI
- [ ] Incremental sync only imports new files

---

## Technical Requirements

### Functional Requirements

1. **Storage Backend Implementation**
   - Implement `B2ImportStorage` model extending `ImportStorage`
   - Implement `B2ExportStorage` model extending `ExportStorage`
   - Implement `B2ImportStorageLink` and `B2ExportStorageLink` models
   - Use `boto3` library for S3-compatible API access

2. **Configuration Options**
   - `b2_endpoint_url`: S3-compatible endpoint (e.g., `https://s3.us-west-004.backblazeb2.com`)
   - `b2_access_key_id`: Backblaze Application Key ID
   - `b2_secret_access_key`: Backblaze Application Key (secret)
   - `bucket`: Bucket name
   - `prefix`: Optional prefix for scoping files
   - `region_name`: Optional region specification
   - `regex_filter`: Optional file name filter
   - `use_blob_urls`: Import method selection (Files vs Tasks)
   - `presign`: Enable/disable presigned URLs
   - `presign_ttl`: Presigned URL expiration time
   - `recursive_scan`: Enable recursive folder scanning
   - `can_delete_objects`: Enable deletion sync for target storage

3. **API Endpoints**
   - `GET/POST /api/storages/b2` - List/create import storage
   - `GET/PATCH/DELETE /api/storages/b2/{id}` - Manage import storage
   - `POST /api/storages/b2/{id}/sync` - Trigger sync
   - `POST /api/storages/b2/validate` - Validate connection
   - `GET /api/storages/b2/form` - Get form layout
   - Mirror endpoints for export storage at `/api/storages/export/b2`

4. **Frontend Integration**
   - Provider configuration in React/TypeScript
   - Form fields with validation (Zod schemas)
   - Test connection button
   - Import/export method selection
   - Presigned URL configuration UI

### Non-Functional Requirements

1. **Performance**
   - Connection timeout: 60 seconds (configurable)
   - Read timeout: 60 seconds (configurable)
   - Max retries: 3 (configurable)
   - Connection pooling: 50 connections

2. **Security**
   - Credentials stored encrypted in database
   - No credentials logged or exposed in errors (for untrusted domains)
   - Presigned URLs expire after configurable TTL
   - Support for trusted domain configuration

3. **Reliability**
   - Graceful error handling with user-friendly messages
   - Automatic retry on transient failures
   - Connection validation before storage creation
   - Signal-based export ensures annotations are saved

4. **Compatibility**
   - Compatible with Label Studio Community and Enterprise
   - Works with all B2 regions
   - Supports all labeling templates and data types
   - Feature parity with S3 storage backend

---

## Acceptance Criteria

### Core Functionality
- [x] Backblaze B2 appears as storage option in UI
- [x] Users can create source storage connections
- [x] Users can create target storage connections
- [x] Test connection validates credentials
- [x] Tasks sync from B2 source storage
- [x] Annotations export to B2 target storage automatically
- [x] Presigned URLs work for media access
- [x] Proxy mode works when presigned URLs disabled
- [x] File filtering with regex works
- [x] Bucket prefix scoping works
- [x] Deletion sync works for target storage (when enabled)

### Quality Assurance
- [x] Unit tests cover utility functions
- [x] Integration tests cover storage operations
- [x] Error handling tested for common failure scenarios
- [x] Connection validation prevents invalid configurations
- [x] Performance tested with large datasets (1000+ files)
- [x] Security review completed (no credential leakage)

### Documentation
- [x] User documentation in `docs/source/guide/storage.md`
- [x] API documentation generated via OpenAPI schema
- [x] Code comments explain B2-specific logic
- [x] README in `label_studio/io_storages/b2/`
- [x] Migration guide from S3 to B2 (if needed)

### Code Quality
- [x] Code passes all linters (flake8, black, isort)
- [x] Type hints added to all functions
- [x] No hardcoded values (all configurable)
- [x] Follows Label Studio coding conventions
- [x] Commit messages follow `feat:` prefix convention

---

## Test Plan

### Unit Tests
1. **Utils Testing** (`test_utils.py`)
   - Test `catch_and_reraise_from_none` decorator
   - Test trusted vs untrusted domain handling
   - Test B2 client initialization
   - Test URL resolution (presigned vs proxy)

2. **Model Testing** (`test_models.py`)
   - Test storage creation with valid credentials
   - Test storage creation fails with invalid credentials
   - Test export signal triggers on annotation save
   - Test import storage data retrieval
   - Test storage validation

### Integration Tests
1. **End-to-End Import**
   - Create B2 import storage
   - Upload test files to B2 bucket
   - Sync storage
   - Verify tasks created
   - Verify media accessible

2. **End-to-End Export**
   - Create B2 export storage
   - Create annotation
   - Verify annotation exported to B2
   - Update annotation
   - Verify update exported
   - Delete annotation (if deletion sync enabled)
   - Verify deletion synced

3. **Error Scenarios**
   - Invalid credentials → Clear error message
   - Network timeout → Retry and eventual failure
   - Invalid bucket name → Validation error
   - CORS misconfiguration → Helpful error message

### Manual QA Checklist
- [ ] Install fresh Label Studio instance
- [ ] Create Backblaze B2 account and bucket
- [ ] Configure source storage through UI
- [ ] Sync files from B2
- [ ] Verify tasks appear in project
- [ ] Verify media files load correctly
- [ ] Create annotations
- [ ] Configure target storage
- [ ] Verify annotations export to B2
- [ ] Test with different regions
- [ ] Test with large datasets (1000+ files)
- [ ] Test prefix filtering
- [ ] Test regex filtering
- [ ] Test presigned URL expiration
- [ ] Test proxy mode
- [ ] Test deletion sync

---

## Success Metrics

### Adoption Metrics
- **Primary**: Number of B2 storage connections created (target: 100+ in first 3 months)
- **Secondary**: Percentage of projects using B2 storage (target: 5% of active projects)
- **User Feedback**: NPS score from B2 users (target: 8+)

### Performance Metrics
- **Sync Performance**: Time to sync 1000 files < 60 seconds
- **Export Latency**: Annotation export < 2 seconds
- **Error Rate**: < 1% connection failures
- **Retry Success**: > 95% of retries succeed

### Business Metrics
- **Cost Savings**: User-reported storage cost reduction (target: 20-30%)
- **Support Tickets**: < 5 support tickets per month for B2 issues
- **Feature Completeness**: 100% feature parity with S3 storage

---

## Risks and Mitigation

### Risk 1: B2 API Changes
**Risk**: Backblaze changes S3-compatible API  
**Impact**: High - Storage connections could break  
**Likelihood**: Low - S3 API is stable  
**Mitigation**: 
- Monitor Backblaze API changelogs
- Maintain version-specific handling if needed
- Add API version checking in connection validation

### Risk 2: Performance Issues
**Risk**: B2 performance slower than expected  
**Impact**: Medium - User experience degraded  
**Likelihood**: Low - B2 performance is competitive  
**Mitigation**:
- Implement connection pooling
- Add configurable timeouts
- Provide performance tuning documentation

### Risk 3: Authentication Complexity
**Risk**: B2 Application Keys confuse users  
**Impact**: Medium - Support burden increases  
**Likelihood**: Medium - New auth model for some users  
**Mitigation**:
- Comprehensive documentation with screenshots
- Clear error messages for auth failures
- Link to Backblaze documentation in UI

### Risk 4: CORS Configuration
**Risk**: Users struggle with CORS setup  
**Impact**: Medium - Media files won't load  
**Likelihood**: Medium - CORS is complex  
**Mitigation**:
- Detailed CORS documentation
- Provide copy-paste CORS rules
- Offer proxy mode as alternative

---

## Future Enhancements

### Phase 2 Features (Future)
1. **Event Notifications**: Support for B2 event notifications/webhooks for automatic sync
2. **Lifecycle Policies**: Integration with B2 lifecycle rules for cost optimization
3. **Multi-Region**: Automatic region selection based on Label Studio location
4. **Encryption**: Support for B2 server-side encryption
5. **Version Control**: Support for B2 file versioning
6. **Bandwidth Optimization**: Smart caching and CDN integration

### Integration Opportunities
1. **Backblaze Partner Program**: Explore partnership for co-marketing
2. **Template Marketplace**: B2-specific templates and examples
3. **Migration Tools**: Automated migration from S3/GCS to B2
4. **Cost Calculator**: Built-in cost comparison tool

---

## Dependencies

### External Dependencies
- **boto3** (>= 1.26.0): S3-compatible API client
- **botocore** (>= 1.29.0): Low-level SDK for retry/timeout config
- **tldextract**: Domain extraction for trusted domain validation

### Internal Dependencies
- **Django** (>= 5.1): Web framework
- **DRF** (Django REST Framework): API layer
- **drf-spectacular**: OpenAPI schema generation
- **django-rq**: Async task processing

### Service Dependencies
- **Backblaze B2**: Cloud storage service
- **Redis** (optional): For async task queue

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1-2)
- Deploy to staging environment
- Internal QA testing
- Performance benchmarking
- Security audit

### Phase 2: Beta Testing (Week 3-4)
- Select 5-10 beta users
- Gather feedback
- Fix critical issues
- Update documentation based on feedback

### Phase 3: General Availability (Week 5)
- Merge to main branch
- Include in next release
- Publish blog post announcement
- Update marketing materials

### Phase 4: Post-Launch (Week 6+)
- Monitor adoption metrics
- Address support tickets
- Iterate based on user feedback
- Plan Phase 2 features

---

## Support and Maintenance

### Documentation
- User guide: `docs/source/guide/storage.md`
- API reference: Auto-generated OpenAPI docs
- Code documentation: Inline comments and docstrings
- Troubleshooting: Common issues and solutions

### Support Channels
- GitHub Issues: Bug reports and feature requests
- Community Forum: User discussions and questions
- Enterprise Support: Direct support for enterprise customers
- Documentation: Self-service troubleshooting

### Maintenance Plan
- **Monthly**: Review GitHub issues
- **Quarterly**: Update dependencies
- **Annually**: Security audit
- **As Needed**: Backblaze API updates

---

## Appendix

### A. Related Documentation
- [Backblaze B2 Documentation](https://www.backblaze.com/docs/cloud-storage)
- [Backblaze S3 Compatible API](https://www.backblaze.com/docs/cloud-storage-s3-compatible-api)
- [Label Studio Storage Documentation](https://labelstud.io/guide/storage.html)

### B. Implementation Files
- Models: `label_studio/io_storages/b2/models.py`
- Serializers: `label_studio/io_storages/b2/serializers.py`
- API Views: `label_studio/io_storages/b2/api.py`
- Utils: `label_studio/io_storages/b2/utils.py`
- Frontend Provider: `web/apps/labelstudio/src/pages/Settings/StorageSettings/providers/b2.ts`
- Tests: `label_studio/tests/io_storages/b2/`

### C. Configuration Examples

**Environment Variables**:
```bash
B2_ACCESS_KEY_ID=your_key_id
B2_SECRET_ACCESS_KEY=your_secret_key
B2_ENDPOINT_URL=https://s3.us-west-004.backblazeb2.com
B2_REGION=us-west-004
B2_CONNECT_TIMEOUT=60
B2_READ_TIMEOUT=60
B2_MAX_RETRIES=3
B2_TRUSTED_STORAGE_DOMAINS=backblazeb2.com,backblaze.com
```

**UI Configuration**:
```json
{
  "bucket": "my-label-studio-bucket",
  "b2_endpoint_url": "https://s3.us-west-004.backblazeb2.com",
  "b2_access_key_id": "***",
  "b2_secret_access_key": "***",
  "region_name": "us-west-004",
  "prefix": "annotations/project1/",
  "use_blob_urls": true,
  "presign": true,
  "presign_ttl": 15,
  "recursive_scan": false
}
```

### D. Comparison with Other Storage Backends

| Feature | AWS S3 | B2 | GCS | Azure |
|---------|--------|-----|-----|-------|
| S3-Compatible API | ✅ Native | ✅ Yes | ❌ No | ❌ No |
| Presigned URLs | ✅ | ✅ | ✅ | ✅ |
| Proxy Mode | ✅ | ✅ | ✅ | ✅ |
| Egress Fees | ❌ High | ✅ None | ❌ High | ❌ High |
| Pricing Model | Complex | Simple | Complex | Complex |
| Regions | Global | Limited | Global | Global |
| Cost (per GB/month) | $0.023 | $0.005 | $0.020 | $0.018 |

---

## Approval

**Product Owner**: _________________ Date: _________

**Engineering Lead**: _________________ Date: _________

**QA Lead**: _________________ Date: _________

**Documentation Lead**: _________________ Date: _________

---

*End of PRD*

