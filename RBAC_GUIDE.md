# Role-Based Access Control (RBAC) in Label Studio

This document describes the role-based access control system implemented in Label Studio Community Edition.

## Overview

Label Studio CE now supports two user roles:
- **Admin**: Full access to create/manage projects, configure label configs, and manage users
- **Annotator**: Limited access to assigned projects for labeling tasks only (no configuration or deletion)

## User Roles

### Admin Role
Admins have full permissions including:
- Create new projects
- Delete projects
- Modify project configurations (including label configs)
- Create new users
- Delete users
- Assign roles to users
- All annotator permissions

### Annotator Role
Annotators have limited permissions:
- View assigned projects
- Perform labeling/annotation tasks
- Submit annotations
- View their own profile

Annotators **cannot**:
- Create or delete projects
- Modify project configurations
- Create or delete users
- Change user roles
- Access admin-only endpoints

## Default Behavior

- New users are created with the `annotator` role by default
- Organization creators are automatically assigned the `admin` role
- The role field is stored in the database and can be queried/modified

## Assigning Roles

### Using the Organization UI

Admins can promote or demote members directly from **Organization → People**:

1. Open the **Organization** navigation item (only visible to admins).
2. Select the member from the list to open their detail panel.
3. In the **Role** section, click **Make Admin** or **Set as Annotator**.

The member list updates immediately after the change, and Label Studio prevents you from removing the final admin in an organization.

### Using the Management Command

You can assign roles to users using the Django management command:

```bash
python manage.py assign_role --email user@example.com --role admin
```

Options:
- `--email`: Email address of the user (required)
- `--role`: Role to assign (`admin` or `annotator`, required)

Example:
```bash
# Assign admin role to a user
python manage.py assign_role --email admin@example.com --role admin

# Assign annotator role to a user
python manage.py assign_role --email annotator@example.com --role annotator
```

### Programmatically

You can also assign roles programmatically in Python code:

```python
from users.models import User

# Get the user
user = User.objects.get(email='user@example.com')

# Assign admin role
user.role = 'admin'
user.save()

# Assign annotator role
user.role = 'annotator'
user.save()
```

## API Endpoints

### Role Field in API Responses

The user's role is included in API responses:

#### `/api/current-user/whoami`
Returns the current user's information including their role:
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "user",
  "role": "admin",
  ...
}
```

#### `/api/users/` (User List/Detail)
The role field is included in user objects:
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "admin",
  ...
}
```

### Protected Endpoints

The following endpoints are restricted to admin users only:

#### Project Management
- `POST /api/projects/` - Create new project (admin only)
- `DELETE /api/projects/{id}/` - Delete project (admin only)
- `PATCH /api/projects/{id}/` - Update project configuration (admin only)

#### User Management
- `POST /api/users/` - Create new user (admin only)
- `DELETE /api/users/{id}/` - Delete user (admin only)

When an annotator tries to access an admin-only endpoint, they will receive a `403 Forbidden` response:
```json
{
  "detail": "Permission denied. Admin role required."
}
```

## Database Schema

The role field is added to the `htx_user` table:

```sql
ALTER TABLE htx_user ADD COLUMN role VARCHAR(32) DEFAULT 'annotator';
```

Valid values:
- `'admin'`
- `'annotator'`

## Migration

The role field was added in migration `users.0012_user_role`. When you run migrations, existing users will have the default `annotator` role. You should manually assign the `admin` role to appropriate users after migrating.

```bash
# Run migrations
python manage.py migrate

# Assign admin role to your primary user(s)
python manage.py assign_role --email your-admin@example.com --role admin
```

## Testing

To test the role-based access control:

1. Create two users with different roles:
```bash
# Create users via Django shell
python manage.py shell
>>> from users.models import User
>>> admin = User.objects.create_user(email='admin@test.com', username='admin', password='password123')
>>> admin.role = 'admin'
>>> admin.save()
>>> annotator = User.objects.create_user(email='annotator@test.com', username='annotator', password='password123')
>>> annotator.role = 'annotator'
>>> annotator.save()
```

2. Test API access:
```bash
# Get admin token
curl -X POST http://localhost:8080/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Get annotator token
curl -X POST http://localhost:8080/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"annotator@test.com","password":"password123"}'

# Try to create project as admin (should succeed)
curl -X POST http://localhost:8080/api/projects/ \
  -H "Authorization: Token <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","label_config":"<View></View>"}'

# Try to create project as annotator (should fail with 403)
curl -X POST http://localhost:8080/api/projects/ \
  -H "Authorization: Token <annotator_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","label_config":"<View></View>"}'
```

## Extending Roles

The current implementation uses a simple CharField with choices. To add more roles or modify permissions:

1. Update the choices in `users/models.py`:
```python
role = models.CharField(
    _('role'),
    max_length=32,
    default='annotator',
    choices=[
        ('admin', 'Admin'),
        ('annotator', 'Annotator'),
        ('reviewer', 'Reviewer'),  # New role
    ],
    help_text=_('User role for access control'),
)
```

2. Create a new migration:
```bash
python manage.py makemigrations
python manage.py migrate
```

3. Update the decorator logic in `users/role_permissions.py` to handle the new role

4. Update the management command choices in `users/management/commands/assign_role.py`

## Security Considerations

- The role check is performed at the API view level using decorators
- Authentication is verified before role checking
- Unauthenticated requests receive `401 Unauthorized`
- Authenticated but unauthorized requests receive `403 Forbidden`
- The role field can only be modified by admin users or via management commands
- Existing permission system is preserved and works alongside the role system

## Troubleshooting

### All users show as annotators
After migration, existing users default to `annotator` role. Manually assign admin role:
```bash
python manage.py assign_role --email your-admin@example.com --role admin
```

### Getting 403 Forbidden errors
Check the user's role:
```bash
python manage.py shell
>>> from users.models import User
>>> user = User.objects.get(email='user@example.com')
>>> print(user.role)
```

If the role is incorrect, update it:
```python
>>> user.role = 'admin'
>>> user.save()
```

### Role not showing in API responses
Ensure you've:
1. Run migrations: `python manage.py migrate`
2. Restarted the server
3. The serializer includes the `role` field

## Notes

- This is a minimal implementation focused on core project and user management permissions
- More granular permissions can be implemented using Django's built-in permission system
- The role system is complementary to the existing organization-based permissions
- Project membership still controls which projects an annotator can access
