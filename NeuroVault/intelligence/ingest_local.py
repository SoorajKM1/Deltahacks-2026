import os
import glob
from dotenv import load_dotenv
from moorcheh_sdk import MoorchehClient

# --- PATH SETUP ---
# Current file: NeuroVault/intelligence/ingest/ingest_memories.py
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# NeuroVault/data/memories
DATA_FOLDER = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "memories"))

# NeuroVault/intelligence/.env
ENV_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, ".env"))

print(f"📍 Script is here:   {SCRIPT_DIR}")
print(f"📂 Looking for data: {DATA_FOLDER}")
print(f"🔑 Looking for env:  {ENV_PATH}")

load_dotenv(ENV_PATH)

# MUST MATCH route.ts EXACTLY
NAMESPACE = "grandpa_joe_FINAL"
DOC_TYPE = "text"


def _ensure_namespace(client: MoorchehClient):
    print(f"📦 Ensuring Box exists: {NAMESPACE}")
    try:
        # New SDK (your install expects namespace_name=)
        if hasattr(client, "namespaces") and hasattr(client.namespaces, "create"):
            client.namespaces.create(namespace_name=NAMESPACE, doc_type=DOC_TYPE)
        else:
            # Old SDK fallback
            client.create_namespace(NAMESPACE, DOC_TYPE)

        print("✅ Namespace ready.")
    except Exception as e:
        # Usually means it already exists
        print(f"ℹ️ Namespace create skipped or already exists: {e}")


def _upload_documents(client: MoorchehClient, documents):
    print(f"🚀 Uploading {len(documents)} valid memories...")

    try:
        # New SDK (your install expects namespace_name=)
        if hasattr(client, "documents") and hasattr(client.documents, "upload"):
            client.documents.upload(namespace_name=NAMESPACE, documents=documents)
        else:
            # Old SDK fallback
            client.upload_documents(NAMESPACE, documents)

        print("✅ SUCCESS! Memories uploaded.")
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        raise


def ingest():
    api_key = os.getenv("MOORCHEH_API_KEY")
    if not api_key:
        print("❌ ERROR: MOORCHEH_API_KEY is missing from NeuroVault/intelligence/.env")
        return

    # 1) READ FILES
    txt_files = glob.glob(os.path.join(DATA_FOLDER, "*.txt"))
    if not txt_files:
        print(f"❌ ERROR: No .txt files found in {DATA_FOLDER}")
        return

    print(f"📖 Scanning {len(txt_files)} files...")
    memories = []

    for path in sorted(txt_files):
        filename = os.path.basename(path)

        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()

            # Empty file guard (keeps old fix)
            if not content:
                print(f"⚠️ Skipping EMPTY file: {filename}")
                continue

            # ✅ Camera support:
            # Attach metadata.file so you can query deterministically with:
            #   #file:mem_family_tim.txt
            memories.append({
                "id": filename,
                "text": content,
                "metadata": {
                    "file": filename,      # <-- used by Moorcheh query filter
                    "source": "neurovault"
                }
            })

        except Exception as e:
            print(f"⚠️ Error reading {filename}: {e}")

    if not memories:
        print("❌ No valid text found to upload. All files were empty.")
        return

    print(f"🧾 Prepared {len(memories)} memories.")
    print(f"🧪 Sample: {memories[0]['id']} -> {memories[0]['text'][:90]}")

    # 2) UPLOAD
    client = MoorchehClient(api_key=api_key)

    _ensure_namespace(client)
    _upload_documents(client, memories)


if __name__ == "__main__":
    ingest()