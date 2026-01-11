import time
import os
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# --- CONFIGURATION ---
# Current path: NeuroVault/intelligence/auto_ingest.py
# Target path:  NeuroVault/data/
BASE_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))

MEMORIES_DIR = os.path.join(BASE_DATA_DIR, 'memories')
IMAGES_DIR   = os.path.join(BASE_DATA_DIR, 'images')

class SmartHandler(FileSystemEventHandler):
    def on_created(self, event):
        self.process_change(event.src_path, "✨ Created")

    def on_modified(self, event):
        self.process_change(event.src_path, "⚡ Modified")

    def process_change(self, file_path, action_type):
        filename = os.path.basename(file_path)
        
        # 1. HANDLE TEXT (Actual Memory Upload)
        if file_path.endswith(".txt"):
            print(f"\n{action_type} Text: {filename}")
            print("   🔄 Syncing Brain...")
            try:
                # Runs your existing ingest script
                subprocess.run(["python", "ingest/ingest_memories.py"], check=True)
            except subprocess.CalledProcessError:
                print("   ❌ Error during sync. Check ingest_memories.py")
            else:
                print("   ✅ Sync Complete.")

        # 2. HANDLE IMAGES (Log Only for now)
        elif file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            print(f"\n{action_type} Image: {filename}")
            print("   📸 New photo added to vault.")
            # Future: You could trigger an image analysis script here

if __name__ == "__main__":
    # Safety Check
    if not os.path.exists(MEMORIES_DIR):
        print(f"⚠️ Creating missing folder: {MEMORIES_DIR}")
        os.makedirs(MEMORIES_DIR)
    if not os.path.exists(IMAGES_DIR):
        print(f"⚠️ Creating missing folder: {IMAGES_DIR}")
        os.makedirs(IMAGES_DIR)

    print(f"👀 WATCHER STARTED")
    print(f"   📂 Monitoring Memories: {MEMORIES_DIR}")
    print(f"   📂 Monitoring Images:   {IMAGES_DIR}")
    print("---------------------------------------------------")

    event_handler = SmartHandler()
    observer = Observer()

    observer.schedule(event_handler, path=MEMORIES_DIR, recursive=False)
    observer.schedule(event_handler, path=IMAGES_DIR, recursive=False)

    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()