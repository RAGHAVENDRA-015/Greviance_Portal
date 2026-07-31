from enum import Enum


class UserRole(str, Enum):
    """
    User role definitions for RBAC.

    Current roles:
        CITIZEN      — End user submitting grievances.
        OFFICER      — Government officer handling assigned complaints.
        ADMIN        — System administrator with full access.

    Reserved for future use (add logic in dependencies.py when needed):
        SUPER_ADMIN      — Cross-department super administrator.
        DEPARTMENT_HEAD  — Head of a specific department.
        AUDITOR          — Read-only auditing access.
    """
    CITIZEN = "citizen"
    OFFICER = "officer"
    ADMIN = "admin"

    # --- Future roles (reserved) ---
    # SUPER_ADMIN = "super_admin"
    # DEPARTMENT_HEAD = "department_head"
    # AUDITOR = "auditor"