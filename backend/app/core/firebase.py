import json
import os
import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    if firebase_admin._apps:
        return  # already initialized

    firebase_json_env = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")

    if firebase_json_env:
        # Production (Render) — load from env var
        cred_dict = json.loads(firebase_json_env)
        cred = credentials.Certificate(cred_dict)
    else:
        # Local dev — fall back to file path
        credential_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "firebase", "firebase-service-account.json"
        )
        if not os.path.exists(credential_path):
            raise RuntimeError(f"Firebase service-account file not found: {credential_path}")
        cred = credentials.Certificate(credential_path)

    firebase_admin.initialize_app(cred)