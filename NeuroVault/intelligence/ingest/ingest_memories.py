import os
import glob
from dotenv import load_dotenv
from moorcheh_sdk import MoorchehClient

# --- PATH SETUP ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', 'data', 'memories'))
ENV_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '.env'))

load_dotenv(ENV_PATH)

def ingest():
    api_key = os.getenv("MOORCHEH_API_KEY")
    if not api_key:
        print("❌ ERROR: MOORCHEH_API_KEY is missing from .env")
        return

    # 1. READ FILES
    txt_files = glob.glob(os.path.join(DATA_FOLDER, "*.txt"))
    if not txt_files:
        print(f"❌ ERROR: No .txt files found in {DATA_FOLDER}")
        return

    print(f"📖 Scanning {len(txt_files)} files...")
    memories = []
    
    for path in txt_files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                
                # --- THE FIX IS HERE ---
                if content: 
                    memories.append({"id": os.path.basename(path), "text": content})
                else:
                    print(f"⚠️ Skipping EMPTY file: {os.path.basename(path)}")
                    
        except Exception as e:
            print(f"⚠️ Error reading {os.path.basename(path)}: {e}")

    if not memories:
        print("❌ No valid text found to upload. All files were empty.")
        return

    # 2. UPLOAD
    client = MoorchehClient(api_key=api_key)
    # MUST MATCH route.ts EXACTLY
    NAMESPACE = "grandpa_joe_FINAL" 
    
    print(f"📦 Box: {NAMESPACE}")
    try:
        client.create_namespace(NAMESPACE, "text")
    except:
        pass # Box likely exists, which is fine

    print(f"🚀 Uploading {len(memories)} valid memories...")
    client.upload_documents(NAMESPACE, memories)
    print("✅ SUCCESS! Memories uploaded.")

if __name__ == "__main__":
    ingest()