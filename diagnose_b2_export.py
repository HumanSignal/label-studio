"""
Diagnostic script to check B2 export storage configuration
"""
import os
import sys
import django

# Add label_studio to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'label_studio'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.label_studio')
django.setup()

from io_storages.b2.models import B2ExportStorage, B2ImportStorage, B2ExportStorageLink
from projects.models import Project
from tasks.models import Annotation as AnnotationModel

def diagnose():
    print("=" * 60)
    print("B2 Export Storage Diagnostic")
    print("=" * 60)
    print()
    
    # Check B2 models exist
    print("[1] Checking B2 Models...")
    try:
        print(f"    B2ImportStorage: {B2ImportStorage}")
        print(f"    B2ExportStorage: {B2ExportStorage}")
        print("    [OK] B2 models imported")
    except Exception as e:
        print(f"    [ERROR] {e}")
        return
    
    print()
    
    # List all B2 export storages
    print("[2] Checking B2 Export Storages in Database...")
    export_storages = B2ExportStorage.objects.all()
    print(f"    Total B2 Export Storages: {export_storages.count()}")
    
    for storage in export_storages:
        print(f"    - ID: {storage.id}")
        print(f"      Title: {storage.title}")
        print(f"      Bucket: {storage.bucket}")
        print(f"      Prefix: {storage.prefix}")
        print(f"      Project: {storage.project.title if storage.project else 'None'}")
        print(f"      Project ID: {storage.project.id if storage.project else 'None'}")
        print(f"      Endpoint: {storage.b2_endpoint_url}")
    
    if export_storages.count() == 0:
        print("    [WARNING] No B2 export storages configured!")
        print("    Please configure one in UI: Settings -> Cloud Storage -> Add Target Storage")
        return
    
    print()
    
    # Check related name
    print("[3] Checking Related Name Access...")
    projects = Project.objects.all()
    print(f"    Total Projects: {projects.count()}")
    
    for project in projects:
        print(f"    Project: {project.title} (ID: {project.id})")
        
        # Try to access B2 export storages via related name
        try:
            b2_storages = project.io_storages_b2exportstorages.all()
            print(f"      B2 Export Storages: {b2_storages.count()}")
            for storage in b2_storages:
                print(f"        - {storage.title} (Bucket: {storage.bucket})")
        except AttributeError as e:
            print(f"      [ERROR] Cannot access io_storages_b2exportstorages: {e}")
            print(f"      This means the related_name might be wrong!")
        
    print()
    
    # Check recent annotations
    print("[4] Checking Recent Annotations...")
    annotations = AnnotationModel.objects.all().order_by('-id')[:5]
    print(f"    Total Annotations: {AnnotationModel.objects.count()}")
    print(f"    Recent 5:")
    
    for ann in annotations:
        print(f"    - Annotation ID: {ann.id}")
        print(f"      Task ID: {ann.task.id}")
        print(f"      Project: {ann.project.title if ann.project else 'N/A'}")
        print(f"      Created: {ann.created_at}")
        
        # Check if this annotation has export links
        links = B2ExportStorageLink.objects.filter(annotation=ann)
        print(f"      B2 Export Links: {links.count()}")
        for link in links:
            print(f"        - Storage: {link.storage.title}")
    
    print()
    
    # Check signal registration
    print("[5] Checking Django Signal Registration...")
    from django.db.models.signals import post_save
    
    receivers = post_save._live_receivers(AnnotationModel)
    print(f"    Total post_save receivers for Annotation: {len(receivers)}")
    
    b2_receiver_found = False
    for receiver in receivers:
        receiver_name = receiver.__name__ if hasattr(receiver, '__name__') else str(receiver)
        print(f"    - {receiver_name}")
        if 'b2' in receiver_name.lower():
            b2_receiver_found = True
            print(f"      [OK] B2 export signal found!")
    
    if not b2_receiver_found:
        print("    [WARNING] B2 export signal not found!")
        print("    This means signals might not be registered properly")
    
    print()
    print("=" * 60)
    print("Diagnostic Complete")
    print("=" * 60)
    print()
    
    # Summary
    if export_storages.count() > 0 and b2_receiver_found:
        print("[RESULT] Everything looks configured correctly!")
        print()
        print("If export still not working:")
        print("1. Make sure you submitted annotation (not just saved draft)")
        print("2. Check terminal logs for 'Export' messages")
        print("3. Wait 30 seconds and refresh B2 bucket")
        print("4. Check correct bucket and prefix folder")
    else:
        print("[ACTION REQUIRED]")
        if export_storages.count() == 0:
            print("- Configure B2 Export Storage in UI")
        if not b2_receiver_found:
            print("- Restart server to register signals")

if __name__ == '__main__':
    try:
        diagnose()
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

