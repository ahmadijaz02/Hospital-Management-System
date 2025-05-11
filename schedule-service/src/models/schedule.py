from pydantic import BaseModel, Field, field_validator
from typing import List, Any, Optional, Union

class TimeSlot(BaseModel):
    startTime: str = Field(..., pattern=r"^(?:[0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    endTime: str = Field(..., pattern=r"^(?:[0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    isAvailable: bool = True
    isSelected: bool = True  # Mark as selected by default for admin interface

    @field_validator('endTime')
    def validate_time_slot(cls, end_time: str, info: Any) -> str:
        values = info.data
        if 'startTime' not in values:
            raise ValueError("startTime must be provided")
        start = values['startTime']
        start_hour, start_min = map(int, start.split(':'))
        end_hour, end_min = map(int, end_time.split(':'))
        start_total = start_hour * 60 + start_min
        end_total = end_hour * 60 + end_min
        if end_total <= start_total:
            raise ValueError("endTime must be after startTime")
        return end_time

class DaySchedule(BaseModel):
    day: str = Field(..., pattern=r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$")
    isWorkingDay: bool = False
    timeSlots: List[TimeSlot] = []

class BreakTime(BaseModel):
    start: str = Field(default="13:00", pattern=r"^(?:[0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    end: str = Field(default="14:00", pattern=r"^(?:[0-1]?[0-9]|2[0-3]):[0-5][0-9]$")

class ScheduleCreate(BaseModel):
    doctor: str
    weeklySchedule: List[DaySchedule] = [
        {"day": day, "isWorkingDay": False, "timeSlots": []}
        for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    ]
    defaultSlotDuration: int = Field(30, ge=5, le=120)
    breakTime: BreakTime = BreakTime()
    maxPatientsPerSlot: int = Field(1, ge=1, le=10)

class ScheduleUpdate(BaseModel):
    weeklySchedule: Optional[List[DaySchedule]] = None
    defaultSlotDuration: Optional[int] = Field(None, ge=5, le=120)
    breakTime: Optional[BreakTime] = None
    maxPatientsPerSlot: Optional[int] = Field(None, ge=1, le=10)