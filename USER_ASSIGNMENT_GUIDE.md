# RBAC Implementation - User Assignment and Verification Guide

## Overview

This document describes how user assignment per project works in the RBAC implementation and provides a verification plan for testing the changes.

## User Roles

### Admin Role
- Can create/delete/modify projects
- Can create/delete users
- Can see ALL projects in the organization
- Has access to project settings
- Can assign users to projects

### Annotator Role  
- **Default role for new users**
- Can only see projects they are assigned to
- Cannot create/delete/modify projects
- Cannot access project settings
- Cannot create/delete users
- Can perform labeling tasks on assigned projects

## User Assignment to Projects

### How It Works

Users are assigned to projects via the `ProjectMember` model, which has the following fields:
- `user`: Foreign key to the User
- `project`: Foreign key to the Project
- `enabled`: Boolean flag (must be True for the user to see the project)
- `created_at`: Timestamp of when the membership was created
- `updated_at`: Timestamp of last update

### Methods for Assigning Users to Projects

#### 1. Programmatically via Django Shell

```python
from users.models import User
from projects.models import Project

# Get the user and project
user = User.objects.get(email='annotator@example.com')
project = Project.objects.get(id=1)

# Add the user as a collaborator
project.add_collaborator(user)
```

#### 2. Via Django Admin Interface

1. Navigate to the Django admin interface at `/admin/`
2. Go to `Projects > Project members`
3. Click "Add project member"
4. Select the user and project
5. Ensure "Enabled" is checked
6. Save

#### 3. Via Management Script (Recommended for Bulk Operations)

Create a management command to assign users to projects:

```python
# label_studio/users/management/commands/assign_project.py
from django.core.management.base import BaseCommand
from users.models import User
from projects.models import Project

class Command(BaseCommand):
    help = 'Assign a user to a project'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='User email')
        parser.add_argument('--project-id', type=int, required=True, help='Project ID')

    def handle(self, *args, **options):
        try:
            user = User.objects.get(email=options['email'])
            project = Project.objects.get(id=options['project_id'])
            
            if project.add_collaborator(user):
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully assigned {user.email} to project "{project.title}"'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'User {user.email} is already assigned to project "{project.title}"'
                    )
                )
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {options["email"]} not found'))
        except Project.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Project with ID {options["project_id"]} not found'))
```

Usage:
```bash
python manage.py assign_project --email annotator@example.com --project-id 1
```

## Verification Plan

### 1. Backend Verification

#### Test 1: Admin Can See All Projects
```bash
# Login as admin
curl -X POST http://localhost:8080/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Get projects list (should see all projects)
curl -X GET http://localhost:8080/api/projects/ \
  -H "Authorization: Token <admin_token>"
```

Expected: Returns all projects in the organization.

#### Test 2: Annotator Can Only See Assigned Projects
```bash
# Login as annotator
curl -X POST http://localhost:8080/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"annotator@example.com","password":"password123"}'

# Get projects list (should only see assigned projects)
curl -X GET http://localhost:8080/api/projects/ \
  -H "Authorization: Token <annotator_token>"
```

Expected: Returns only projects where the annotator is a member with `enabled=True`.

#### Test 3: Annotator Cannot Access Unassigned Project
```bash
# Try to access a project not assigned to the annotator
curl -X GET http://localhost:8080/api/projects/<unassigned_project_id>/ \
  -H "Authorization: Token <annotator_token>"
```

Expected: Returns 404 Not Found.

#### Test 4: Annotator Cannot Create Projects
```bash
curl -X POST http://localhost:8080/api/projects/ \
  -H "Authorization: Token <annotator_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","label_config":"<View></View>"}'
```

Expected: Returns 403 Forbidden with message "Permission denied. Admin role required."

#### Test 5: Annotator Cannot Delete Projects
```bash
curl -X DELETE http://localhost:8080/api/projects/<project_id>/ \
  -H "Authorization: Token <annotator_token>"
```

Expected: Returns 403 Forbidden with message "Permission denied. Admin role required."

### 2. Frontend Verification

#### Test 1: Admin UI Shows All Features
1. Login as admin user
2. Navigate to the home page
3. **Verify**: "Create Project" button is visible
4. **Verify**: "Invite Members" button is visible
5. Navigate to projects page
6. **Verify**: "Create" button in toolbar is visible
7. **Verify**: Settings menu (three dots) is visible on project cards

#### Test 2: Annotator UI Hides Admin Features
1. Login as annotator user
2. Navigate to the home page
3. **Verify**: "Create Project" button is NOT visible
4. **Verify**: "Invite Members" button is NOT visible
5. **Verify**: If no projects assigned, message says "No projects assigned" with "Contact your administrator" text
6. Navigate to projects page (if has assigned projects)
7. **Verify**: "Create" button in toolbar is NOT visible
8. **Verify**: Settings menu (three dots) is NOT visible on project cards

#### Test 3: Annotator Can Only See Assigned Projects
1. Create 3 projects as admin
2. Assign annotator to only 2 of them
3. Login as annotator
4. Navigate to projects page
5. **Verify**: Only 2 projects are visible
6. Try to access the URL of the unassigned project directly
7. **Verify**: Gets 404 or redirected

### 3. Database Verification

Check the database directly to verify role assignments and project memberships:

```sql
-- Check user roles
SELECT id, email, username, role FROM htx_user;

-- Check project memberships
SELECT 
    pm.id,
    u.email as user_email,
    p.title as project_title,
    pm.enabled,
    pm.created_at
FROM projects_projectmember pm
JOIN htx_user u ON pm.user_id = u.id
JOIN project p ON pm.project_id = p.id
ORDER BY pm.created_at DESC;

-- Check if specific user can access specific project
SELECT 
    u.email,
    u.role,
    p.title,
    pm.enabled
FROM htx_user u
LEFT JOIN projects_projectmember pm ON pm.user_id = u.id
LEFT JOIN project p ON pm.project_id = p.id
WHERE u.email = 'annotator@example.com';
```

### 4. Automated Test Suite

Run the comprehensive test suite:

```bash
# Run all role-based filtering tests
python manage.py test label_studio.projects.tests.test_role_based_filtering

# Run all role permission tests
python manage.py test label_studio.users.tests.test_role_permissions
```

Expected: All tests should pass.

### 5. Integration Testing Checklist

- [ ] Create admin user with email/password
- [ ] Create annotator user with email/password
- [ ] Verify admin user has role='admin'
- [ ] Verify annotator user has role='annotator' (default)
- [ ] Create 3 test projects as admin
- [ ] Assign annotator to 2 of the 3 projects
- [ ] Login as admin and verify can see all 3 projects
- [ ] Login as annotator and verify can only see 2 assigned projects
- [ ] Verify annotator cannot create new project (UI and API)
- [ ] Verify annotator cannot delete project (UI and API)
- [ ] Verify annotator cannot modify project settings (UI and API)
- [ ] Verify annotator can view and annotate tasks in assigned projects
- [ ] Disable annotator's membership in one project
- [ ] Verify annotator can no longer see that project
- [ ] Re-enable the membership
- [ ] Verify annotator can see the project again

## Common Issues and Solutions

### Issue 1: New users don't have the annotator role
**Solution**: The User model defaults to 'annotator' role. If users are being created via other methods (API, scripts), ensure the role field is set correctly or defaults are respected.

### Issue 2: Annotators can see all projects
**Solution**: 
1. Check if the queryset filtering is in place in `ProjectListAPI`, `ProjectCountsListAPI`, and `ProjectAPI`
2. Verify the user has role='annotator' (not 'admin')
3. Check if ProjectMember records exist for that user

### Issue 3: Admin cannot see any projects
**Solution**: Admins should see all projects regardless of membership. Check if the role check `user_role != 'admin'` is properly implemented in the API views.

### Issue 4: User has no projects assigned
**Solution**: Use the Django shell or management command to assign users to projects:
```python
project.add_collaborator(user)
```

## Next Steps

1. **API Enhancement**: The annotators endpoint now supports full CRUD operations:
   - Listing project members: `GET /api/projects/{id}/annotators/`
   - Adding users to projects: `POST /api/projects/{id}/annotators/`
   - Removing users from projects: `DELETE /api/projects/{id}/annotators/{user_id}/`

2. **UI Enhancement**: Add a project members management page in the admin interface for easier user assignment

3. **Notification**: Send email notifications when users are assigned to projects

4. **Bulk Operations**: Add management commands for bulk user-project assignments

5. **Audit Trail**: Log all project membership changes for security and compliance

## Security Considerations

1. **Role Field Security**: The role field can only be modified by:
   - Django superusers via admin interface
   - Management commands run by system administrators
   - Admin API endpoints (if implemented)

2. **Project Access**: Annotators have no way to access projects they're not assigned to:
   - API returns 404 for unassigned projects
   - UI doesn't show unassigned projects
   - Direct URL access is blocked

3. **Admin Actions**: All admin-only actions (create/delete/modify) are protected:
   - Backend: `@admin_only` decorator checks
   - Frontend: UI elements hidden for non-admins
   - API responses enforce permissions

## Summary

The RBAC implementation ensures:
- ✅ New users default to 'annotator' role
- ✅ Admins can see and manage all projects
- ✅ Annotators only see projects they're assigned to
- ✅ Project membership is controlled via ProjectMember model
- ✅ UI hides admin-only features from annotators
- ✅ API endpoints enforce role-based filtering
- ✅ Comprehensive test coverage validates the implementation
