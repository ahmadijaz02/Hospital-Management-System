from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional

class AppointmentStatus(str, Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no-show"

class AppointmentType(str, Enum):
    regular = "regular"
    follow_up = "follow-up"
    emergency = "emergency"

class AppointmentCreate(BaseModel):
    doctor: str
    patient: str
    schedule: str
    date: datetime
    time: str = Field(..., pattern=r"^(?:[0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    status: AppointmentStatus = AppointmentStatus.scheduled
    type: AppointmentType = AppointmentType.regular
    notes: Optional[str] = None
    reason: str
    duration: int = Field(30, ge=5, le=120)