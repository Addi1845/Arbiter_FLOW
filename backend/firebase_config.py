import os
import json
import threading
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore, storage
from dotenv import load_dotenv

load_dotenv()

# ─── Persistent JSON File Store ───────────────────────────────────────────────
# Mimics Firestore API. Data stored in local_db/*.json files.
# Survives server restarts. Zero billing needed.

DB_DIR = os.path.join(os.path.dirname(__file__), "local_db")
os.makedirs(DB_DIR, exist_ok=True)

_lock = threading.Lock()


def _db_path(collection: str) -> str:
    return os.path.join(DB_DIR, f"{collection}.json")


def _load_collection(collection: str) -> dict:
    path = _db_path(collection)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_collection(collection: str, data: dict):
    path = _db_path(collection)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


class LocalDocumentSnapshot:
    def __init__(self, data):
        self._data = data
        self.exists = data is not None

    def to_dict(self):
        return self._data.copy() if self._data else {}


class LocalQuery:
    def __init__(self, docs_list):
        # docs_list: list of dicts
        self._docs = list(docs_list)

    def where(self, field, op, val):
        if op == "==":
            self._docs = [d for d in self._docs if d.get(field) == val]
        elif op == "!=":
            self._docs = [d for d in self._docs if d.get(field) != val]
        elif op == "in":
            self._docs = [d for d in self._docs if d.get(field) in val]
        return self

    def order_by(self, field, direction="ASCENDING"):
        reverse = direction == "DESCENDING"
        self._docs.sort(key=lambda d: d.get(field) or "", reverse=reverse)
        return self

    def limit(self, count):
        self._docs = self._docs[:count]
        return self

    def stream(self):
        for data in self._docs:
            yield LocalDocumentSnapshot(data)


class LocalDocumentReference:
    def __init__(self, collection: str, doc_id: str):
        self._collection = collection
        self._doc_id = doc_id

    def set(self, data: dict):
        with _lock:
            col = _load_collection(self._collection)
            col[self._doc_id] = data.copy()
            _save_collection(self._collection, col)

    def update(self, data: dict):
        with _lock:
            col = _load_collection(self._collection)
            if self._doc_id in col:
                col[self._doc_id].update(data)
            else:
                col[self._doc_id] = data.copy()
            _save_collection(self._collection, col)

    def get(self):
        with _lock:
            col = _load_collection(self._collection)
            data = col.get(self._doc_id)
        return LocalDocumentSnapshot(data)

    def delete(self):
        with _lock:
            col = _load_collection(self._collection)
            col.pop(self._doc_id, None)
            _save_collection(self._collection, col)


class LocalCollectionReference:
    def __init__(self, name: str):
        self._name = name

    def document(self, doc_id: str) -> LocalDocumentReference:
        return LocalDocumentReference(self._name, doc_id)

    def where(self, field, op, val) -> LocalQuery:
        with _lock:
            docs = list(_load_collection(self._name).values())
        return LocalQuery(docs).where(field, op, val)

    def order_by(self, field, direction="ASCENDING") -> LocalQuery:
        with _lock:
            docs = list(_load_collection(self._name).values())
        return LocalQuery(docs).order_by(field, direction)

    def limit(self, count) -> LocalQuery:
        with _lock:
            docs = list(_load_collection(self._name).values())
        return LocalQuery(docs).limit(count)

    def stream(self):
        with _lock:
            docs = list(_load_collection(self._name).values())
        for data in docs:
            yield LocalDocumentSnapshot(data)


class LocalFirestore:
    """Persistent JSON-backed Firestore replacement."""

    def collection(self, name: str) -> LocalCollectionReference:
        return LocalCollectionReference(name)


class MockBucket:
    """Stub bucket — storage handled locally via /uploads/ static route."""
    def blob(self, name):
        return MockBlob(name)


class MockBlob:
    def __init__(self, name):
        self.name = name
        self.public_url = f"http://mock-storage.local/{name}"

    def upload_from_string(self, *args, **kwargs):
        pass

    def make_public(self):
        pass


# ─── Connection Logic ─────────────────────────────────────────────────────────

db = None
bucket = None

try:
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                "storageBucket": os.getenv("STORAGE_BUCKET", "")
            })

    # Try real Firestore
    _real_db = firestore.client()
    # Quick probe to check billing/API access
    list(_real_db.collection("__health__").limit(1).stream())
    db = _real_db
    print("✅ Connected to real Firebase Firestore.")

    try:
        bucket = storage.bucket()
        print("✅ Connected to Firebase Storage.")
    except Exception:
        bucket = MockBucket()
        print("⚠️  Storage unavailable — using local /uploads/ folder.")

except Exception as e:
    err = str(e)
    if "billing" in err.lower() or "SERVICE_DISABLED" in err or "does not exist" in err or "403" in err:
        print(f"⚠️  Firebase unavailable ({err[:80]}...)")
    else:
        print(f"⚠️  Firebase init error: {err[:120]}")
    print("📁 Using persistent LOCAL JSON store (local_db/*.json).")
    db = LocalFirestore()
    bucket = MockBucket()
