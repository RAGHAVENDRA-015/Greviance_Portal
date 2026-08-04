import json

import firebase_admin
from firebase_admin import credentials

from app.core.config import settings


def initialize_firebase():
    if firebase_admin._apps:
        return

    try:
        cred_dict = json.loads(settings.FIREBASE_CREDENTIALS)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            "FIREBASE_CREDENTIALS is not valid JSON."
        ) from e

    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)