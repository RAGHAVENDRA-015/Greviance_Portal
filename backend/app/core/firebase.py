from pathlib import Path

import firebase_admin
from firebase_admin import credentials

from app.core.config import settings


def initialize_firebase() -> None:
    """
    Initialize Firebase Admin SDK (Auth token verification only).
    Safe to call multiple times — skips if already initialized.
    Storage is handled by Cloudinary; no Firebase Storage bucket required.
    """
    if not firebase_admin._apps:
        credential_path: Path = settings.firebase_credentials_path
        if not credential_path.is_file():
            print(f"[ERROR] Firebase credential not found: {credential_path}")
            raise RuntimeError(
                f"Firebase service-account file not found: {credential_path}"
            )
        cred = credentials.Certificate(str(credential_path))
        firebase_admin.initialize_app(cred)
        print("[OK] Firebase Admin initialized")
    else:
        print("[INFO] Firebase already initialized, skipping.")
