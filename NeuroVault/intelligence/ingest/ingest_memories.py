import os
import glob
from dotenv import load_dotenv
from moorcheh_sdk import MoorchehClient

# --- PATH DEBUGGING ---
# Get the absolute path of this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Navigate: ingest -> intelligence -> NeuroVault -> data -> memories
DATA_FOLDER = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', 'data', 'memories'))
print(f"📂 Data folder set to: {DATA_FOLDER}")
ENV_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '.env'))

print(f"📍 Script is here:   {SCRIPT_DIR}")
print(f"📂 Looking for data: {DATA_FOLDER}")
print(f"🔑 Looking for env:  {ENV_PATH}")

load_dotenv(ENV_PATH)

def ingest():
    api_key = os.getenv("MOORCHEH_API_KEY")
    if not api_key:
        print("❌ ERROR: MOORCHEH_API_KEY is missing from .env")
        return

    # 1. READ FILES
    txt_files = glob.glob(os.path.join(DATA_FOLDER, "*.txt"))
    if not txt_files:
        print("❌ ERROR: No .txt files found! Check the 'Looking for data' path above.")
        return

    print(f"📖 Found {len(txt_files)} memories. Reading...")
    memories = []
    for path in txt_files:
        with open(path, "r", encoding="utf-8") as f:
            memories.append({"id": os.path.basename(path), "text": f.read().strip()})

    # 2. UPLOAD
    client = MoorchehClient(api_key=api_key)
    # MUST MATCH route.ts EXACTLY
    NAMESPACE = "grandpa_joe_FINAL" 
    
    print(f"📦 Creating Box: {NAMESPACE}")
    try:
        client.create_namespace(NAMESPACE, "text")
    except:
        pass

    print(f"🚀 Uploading...")
    client.upload_documents(NAMESPACE, memories)
    print("✅ SUCCESS! Memories uploaded.")

if __name__ == "__main__":
    ingest()