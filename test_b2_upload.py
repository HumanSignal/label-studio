"""
Test uploading a file to B2 to verify web interface
"""
import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'label_studio'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.label_studio')
django.setup()

from io_storages.b2.models import B2ExportStorage

def test_upload():
    print("=" * 60)
    print("TEST: Upload a visible file to B2")
    print("=" * 60)
    
    # Get export storage
    storage = B2ExportStorage.objects.first()
    
    if not storage:
        print("[ERROR] No B2 export storage found!")
        return
    
    print(f"[INFO] Using storage: {storage.title}")
    print(f"       Bucket: {storage.bucket}")
    print(f"       Prefix: '{storage.prefix}'")
    print()
    
    # Connect to B2
    try:
        client, bucket = storage.get_client_and_bucket(validate_connection=False)
        print("[OK] Connected to B2")
    except Exception as e:
        print(f"[ERROR] Failed to connect: {e}")
        return
    
    # Create test file
    test_content = """{
  "test": "This is a test file from Label Studio",
  "timestamp": "2025-10-12T21:58:00Z",
  "message": "If you can see this file in B2 web interface, everything is working!"
}"""
    
    # Upload with clear name
    test_key = "TEST_FILE_VISIBLE.json"
    if storage.prefix:
        test_key = f"{storage.prefix.rstrip('/')}/{test_key}"
    
    try:
        print(f"[INFO] Uploading test file: {test_key}")
        bucket.put_object(Key=test_key, Body=test_content.encode('utf-8'))
        print("[SUCCESS] Test file uploaded!")
        print()
        
        # List files to confirm
        print("[INFO] Current files in bucket:")
        file_count = 0
        for obj in bucket.objects.all():
            file_count += 1
            size_kb = obj.size / 1024
            print(f"  {file_count}. {obj.key} ({size_kb:.2f} KB)")
        
        print()
        print("=" * 60)
        print("NOW CHECK B2 WEB INTERFACE:")
        print("=" * 60)
        print(f"1. Go to: api-test-bucket")
        print(f"2. Look for: TEST_FILE_VISIBLE.json")
        print(f"3. If you see it, your B2 connection works!")
        print(f"4. Your annotation files (4, 5) should also be there")
        print()
        print("If TEST_FILE_VISIBLE.json appears but files 4,5 don't:")
        print("- Try hard refresh (Ctrl+F5)")
        print("- Wait 30 seconds and refresh again")
        print("- Files 4,5 might be there but web UI has display bug")
        
    except Exception as e:
        print(f"[ERROR] Failed to upload: {e}")

if __name__ == '__main__':
    test_upload()
