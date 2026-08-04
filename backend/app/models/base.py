"""Shared model helpers.

This module intentionally contains no Beanie ``Document`` subclass. Registering
only concrete documents prevents MongoDB from ever creating a ``BaseDocument``
collection or inheriting indexes between unrelated collections.
"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp for persisted documents."""
    return datetime.now(timezone.utc)
