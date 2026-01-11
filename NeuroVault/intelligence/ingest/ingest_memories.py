import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient
from moorcheh_sdk import MoorchehClient

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".env"))
load_dotenv(ENV_PATH)

NAMESPACE = "grandpa_joe_FINAL"
DOC_TYPE = "text"

MONGO_URI = os.getenv("MONGODB_URI")
MONGO_DB = os.getenv("MONGODB_DB", "neurovault")
MONGO_COLLECTION = os.getenv("MONGODB_COLLECTION", "memories")

BATCH_SIZE = int(os.getenv("INGEST_BATCH_SIZE", "50"))
MAX_ATTEMPTS = int(os.getenv("INGEST_MAX_ATTEMPTS", "5"))


def to_iso(dt):
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    return None


def _ensure_namespace(client: MoorchehClient):
    print(f"📦 Ensuring Box exists: {NAMESPACE}")
    try:
        if hasattr(client, "namespaces") and hasattr(client.namespaces, "create"):
            client.namespaces.create(namespace_name=NAMESPACE, doc_type=DOC_TYPE)
        else:
            client.create_namespace(NAMESPACE, DOC_TYPE)
        print("✅ Namespace ready.")
    except Exception as e:
        print(f"ℹ️ Namespace create skipped or already exists: {e}")


def _upload_documents(client: MoorchehClient, documents):
    print(f"🚀 Uploading {len(documents)} pending memories...")
    if hasattr(client, "documents") and hasattr(client.documents, "upload"):
        client.documents.upload(namespace_name=NAMESPACE, documents=documents)
    else:
        client.upload_documents(NAMESPACE, documents)
    print("✅ SUCCESS! Pending memories uploaded.")


def ingest_pending():
    api_key = os.getenv("MOORCHEH_API_KEY")
    if not api_key:
        print("❌ ERROR: MOORCHEH_API_KEY missing in intelligence/.env")
        return

    if not MONGO_URI:
        print("❌ ERROR: MONGODB_URI missing in intelligence/.env")
        return

    mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=15000)
    col = mongo[MONGO_DB][MONGO_COLLECTION]

    batch = list(
        col.find(
            {
                "$or": [
                    {"moorchehStatus": "pending"},
                    {"moorchehStatus": "failed", "attempts": {"$lt": MAX_ATTEMPTS}},
                ]
            }
        )
        .sort("createdAt", 1)
        .limit(BATCH_SIZE)
    )

    if not batch:
        print("✅ No pending memories to ingest.")
        return

    docs = []
    ids = []

    for m in batch:
        _id = str(m["_id"])
        text = (m.get("text") or "").strip()

        if not text:
            col.update_one(
                {"_id": m["_id"]},
                {"$set": {"moorchehStatus": "failed"}, "$inc": {"attempts": 1}},
            )
            continue

        metadata = {
            "file": _id,
            "source": "neurovault",
            "author": m.get("author", "Caregiver"),
            "imageUrl": m.get("imageUrl", None),
            "patientId": m.get("patientId", "default"),
            "createdAt": to_iso(m.get("createdAt")),
        }

        metadata = {k: v for k, v in metadata.items() if v is not None}

        docs.append(
            {
                "id": _id,
                "text": text,
                "metadata": metadata,
            }
        )
        ids.append(m["_id"])

    if not docs:
        print("✅ Nothing valid in batch after filtering.")
        return

    client = MoorchehClient(api_key=api_key)
    _ensure_namespace(client)

    try:
        _upload_documents(client, docs)
        col.update_many(
            {"_id": {"$in": ids}},
            {"$set": {"moorchehStatus": "indexed", "indexedAt": datetime.now(timezone.utc)}},
        )
    except Exception:
        col.update_many(
            {"_id": {"$in": ids}},
            {"$set": {"moorchehStatus": "failed"}, "$inc": {"attempts": 1}},
        )
        raise


if __name__ == "__main__":
    ingest_pending()
