from enum import Enum


class ComplaintStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    REJECTED = "Rejected"


class ComplaintCategory(str, Enum):
    """Enforced category values — mirrors Gemini classification prompt options."""
    WATER_SUPPLY = "Water Supply"
    ROADS = "Roads"
    ELECTRICITY = "Electricity"
    GARBAGE = "Garbage"
    DRAINAGE = "Drainage"
    PUBLIC_SAFETY = "Public Safety"
    HEALTH = "Health"
    CORRUPTION = "Corruption"
    OTHER = "Other"


class ComplaintPriority(str, Enum):
    """Enforced priority values — mirrors Gemini classification prompt options."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"