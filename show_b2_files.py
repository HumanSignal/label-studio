"""
Show exactly what files are in your B2 bucket
"""
import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'label_studio'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.label_studio')
django.setup()

from io_storages.b2.models import B2ExportStorage

def show_files():
    print("=" * 70)
    print("CHECKING YOUR B2 BUCKET FOR EXPORTED FILES")
    print("=" * 70)
    print()
    
    # Get export storage
    storage = B2ExportStorage.objects.first()
    
    if not storage:
        print("[ERROR] No B2 export storage found!")
        print("Please configure one in UI first.")
        return
    
    print(f"[INFO] Export Storage: {storage.title}")
    print(f"       Bucket: {storage.bucket}")
    print(f"       Prefix: '{storage.prefix}' (empty = bucket root)")
    print(f"       Endpoint: {storage.b2_endpoint_url}")
    print()
    
    # Connect to B2
    print("[INFO] Connecting to B2...")
    try:
        client, bucket = storage.get_client_and_bucket(validate_connection=False)
        print("[OK] Connected successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to connect: {e}")
        return
    
    print()
    
    # List all files in bucket
    print(f"[INFO] Listing files in bucket: {storage.bucket}")
    if storage.prefix:
        print(f"       Looking in folder: {storage.prefix}")
    else:
        print(f"       Looking in: BUCKET ROOT (no subfolder)")
    print()
    
    try:
        file_count = 0
        for obj in bucket.objects.all():
            file_count += 1
            size_kb = obj.size / 1024
            print(f"  {file_count}. File: {obj.key}")
            print(f"     Size: {size_kb:.2f} KB")
            print(f"     Modified: {obj.last_modified}")
            
            # Check if this matches our prefix
            if storage.prefix:
                if obj.key.startswith(storage.prefix):
                    print(f"     [MATCH] This file is in your export prefix!")
            else:
                print(f"     [INFO] File in bucket root")
            print()
        
        if file_count == 0:
            print("  [WARNING] No files found in bucket!")
            print()
            print("  Possible reasons:")
            print("  1. Export failed (check credentials have write permission)")
            print("  2. Files in different bucket")
            print("  3. Application Key doesn't have permission to list files")
        else:
            print(f"[OK] Found {file_count} file(s) in bucket")
            
            if storage.prefix:
                print(f"     Look for files starting with: {storage.prefix}")
            else:
                print(f"     Files are in BUCKET ROOT")
                print(f"     Look for: 3.json or 1.json")
    
    except Exception as e:
        print(f"[ERROR] Failed to list files: {e}")
        print()
        print("Check:")
        print("1. Application Key has list/read permission")
        print("2. Bucket name is correct")
        print("3. Credentials are valid")
    
    print()
    print("=" * 70)
    print("WHERE TO FIND YOUR FILE")
    print("=" * 70)
    print()
    print(f"Bucket: {storage.bucket}")
    if storage.prefix:
        print(f"Folder: {storage.prefix}")
    else:
        print(f"Folder: ROOT of bucket (no subfolder)")
    print(f"File Name: 3.json (annotation ID)")
    print(f"  or: 1.json (task ID)")
    print()
    print("In B2 Web Interface:")
    print(f"1. Go to Buckets → {storage.bucket}")
    if storage.prefix:
        print(f"2. Open folder: {storage.prefix}")
    else:
        print(f"2. Look in ROOT (don't go into any folders)")
    print("3. Look for: 3.json or 1.json")
    print("4. Refresh if not visible")

if __name__ == '__main__':
    try:
        show_files()
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

