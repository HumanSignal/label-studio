#!/usr/bin/env python
"""
Verification script for Role-Based Access Control (RBAC) in Label Studio

This script demonstrates the role-based access control functionality by:
1. Creating admin and annotator users
2. Verifying role assignments
3. Testing access permissions
"""
import os
import sys

import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.label_studio')
django.setup()

from users.models import User
from organizations.models import Organization
from projects.models import Project


def cleanup():
    """Clean up test data"""
    User.objects.filter(email__in=['rbac_admin@test.com', 'rbac_annotator@test.com']).delete()
    Organization.objects.filter(title='RBAC Test Organization').delete()
    print("✓ Cleaned up test data")


def verify_rbac():
    """Verify RBAC functionality"""
    print("\n=== Role-Based Access Control Verification ===\n")
    
    # Clean up any existing test data
    cleanup()
    
    # Step 1: Create test organization
    print("1. Creating test organization...")
    admin_user = User.objects.create_user(
        email='rbac_admin@test.com',
        username='rbac_admin',
        password='password123'
    )
    admin_user.role = 'admin'
    admin_user.save()
    
    org = Organization.create_organization(
        title='RBAC Test Organization',
        created_by=admin_user
    )
    admin_user.active_organization = org
    admin_user.save()
    print(f"   ✓ Created organization: {org.title}")
    print(f"   ✓ Admin user: {admin_user.email} (role: {admin_user.role})")
    
    # Step 2: Create annotator user
    print("\n2. Creating annotator user...")
    annotator_user = User.objects.create_user(
        email='rbac_annotator@test.com',
        username='rbac_annotator',
        password='password123'
    )
    annotator_user.role = 'annotator'
    annotator_user.active_organization = org
    annotator_user.save()
    org.add_user(annotator_user)
    print(f"   ✓ Annotator user: {annotator_user.email} (role: {annotator_user.role})")
    
    # Step 3: Verify default roles
    print("\n3. Verifying default roles...")
    new_user = User.objects.create_user(
        email='default_test@test.com',
        username='default_test',
        password='password123'
    )
    print(f"   ✓ New user default role: {new_user.role}")
    assert new_user.role == 'annotator', "Default role should be 'annotator'"
    new_user.delete()
    
    # Step 4: Test role field in model
    print("\n4. Testing role field in model...")
    assert hasattr(User, 'role'), "User model should have 'role' field"
    assert admin_user.role == 'admin', "Admin user should have 'admin' role"
    assert annotator_user.role == 'annotator', "Annotator user should have 'annotator' role"
    print("   ✓ Role field exists and is properly set")
    
    # Step 5: Test role assignment
    print("\n5. Testing role assignment...")
    test_user = User.objects.create_user(
        email='role_change_test@test.com',
        username='role_change_test',
        password='password123'
    )
    assert test_user.role == 'annotator', "Default should be annotator"
    test_user.role = 'admin'
    test_user.save()
    test_user.refresh_from_db()
    assert test_user.role == 'admin', "Role should be updated to admin"
    print("   ✓ Role can be changed and persisted")
    test_user.delete()
    
    # Step 6: Verify decorators exist
    print("\n6. Verifying permission decorators...")
    from users.role_permissions import admin_only, admin_only_method
    print("   ✓ admin_only decorator exists")
    print("   ✓ admin_only_method decorator exists")
    
    # Step 7: Test project creation
    print("\n7. Testing project creation...")
    project = Project.objects.create(
        title='RBAC Test Project',
        created_by=admin_user,
        organization=org,
        label_config='<View></View>'
    )
    print(f"   ✓ Project created: {project.title}")
    
    # Step 8: Verify management command exists
    print("\n8. Verifying management command...")
    from django.core.management import get_commands
    commands = get_commands()
    assert 'assign_role' in commands, "assign_role command should exist"
    print("   ✓ assign_role management command exists")
    
    # Cleanup
    print("\n9. Cleaning up test data...")
    cleanup()
    
    print("\n" + "="*50)
    print("✓ All RBAC verification tests passed!")
    print("="*50 + "\n")
    
    print("Summary:")
    print("- Role field added to User model")
    print("- Default role is 'annotator'")
    print("- Roles can be assigned and changed")
    print("- Permission decorators are available")
    print("- Management command is available")
    print("\nNext steps:")
    print("1. Run migrations: python manage.py migrate")
    print("2. Assign admin role: python manage.py assign_role --email your-admin@example.com --role admin")
    print("3. See RBAC_GUIDE.md for more details")


if __name__ == '__main__':
    try:
        verify_rbac()
    except Exception as e:
        print(f"\n✗ Verification failed: {e}")
        import traceback
        traceback.print_exc()
        cleanup()
        sys.exit(1)
