import os
import logging
import sys
from fastapi import FastAPI, Depends, HTTPException, Request

# Try different import methods to handle both direct and module imports
try:
    # Try absolute imports first (when running as a module)
    from src.middleware.auth import get_current_user, is_authorized_for_schedule
    from src.controllers.schedule_controller import (
        get_schedules, get_schedule, create_schedule, update_schedule, delete_schedule,
        get_doctor_schedules, get_patient_schedules, get_available_slots
    )
    from src.models.schedule import ScheduleCreate, ScheduleUpdate
    print("Using absolute imports with src prefix")
except ImportError:
    try:
        # Try relative imports (when running directly)
        from middleware.auth import get_current_user, is_authorized_for_schedule
        from controllers.schedule_controller import (
            get_schedules, get_schedule, create_schedule, update_schedule, delete_schedule,
            get_doctor_schedules, get_patient_schedules, get_available_slots
        )
        from models.schedule import ScheduleCreate, ScheduleUpdate
        print("Using relative imports without src prefix")
    except ImportError as e:
        print(f"Import error: {e}")
        # Add the parent directory to the Python path
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        # Try again with direct imports
        from middleware.auth import get_current_user, is_authorized_for_schedule
        from controllers.schedule_controller import (
            get_schedules, get_schedule, create_schedule, update_schedule, delete_schedule,
            get_doctor_schedules, get_patient_schedules, get_available_slots
        )
        from models.schedule import ScheduleCreate, ScheduleUpdate
        print("Using direct imports after path adjustment")

# Configure logging (only once here)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("schedule_service")  # Unified logger name

# Debug log to confirm script start
logger.info("Starting schedule_service.py")

# Debug log to confirm import of schedule_controller
logger.info("Importing schedule_controller")

# FastAPI app
app = FastAPI()

# Routes
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "schedule-service"}

@app.get("/favicon.ico")
async def favicon():
    return {"status": 204}  # No content, prevents 404

@app.get("/api/schedules/schedule/{doctor_id}")
async def get_schedule_by_doctor(doctor_id: str):  # Authentication disabled for testing
    schedule = await get_schedule(doctor_id)
    return schedule

@app.get("/api/schedules/doctor/{doctor_id}")
async def doctor_schedules(doctor_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.get("role") == "doctor" and user.get("_id") != doctor_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await get_doctor_schedules(doctor_id)

@app.post("/api/schedules/")
async def create_new_schedule(schedule: ScheduleCreate, user: dict = Depends(get_current_user)):
    # Log the request
    logger.info(f"Creating new schedule for doctor: {schedule.doctor}")

    # Check authorization
    if user.get("role") not in ["doctor", "admin"]:
        logger.warning(f"Unauthorized attempt to create schedule by user with role: {user.get('role')}")
        raise HTTPException(status_code=403, detail="Not authorized")

    # Only doctors can create their own schedules, admins can create for any doctor
    if user.get("role") == "doctor" and user.get("_id") != schedule.doctor:
        logger.warning(f"Doctor {user.get('_id')} attempted to create schedule for doctor {schedule.doctor}")
        raise HTTPException(status_code=403, detail="Not authorized")

    # Create the schedule with time slots for working days
    return await create_schedule(schedule)

@app.put("/api/schedules/{id}")
async def update_existing_schedule(id: str, schedule: ScheduleUpdate, user: dict = Depends(get_current_user)):
    if user.get("role") not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    existing = await get_schedule(id)
    if user.get("role") == "doctor" and user.get("_id") != existing["data"]["doctor"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await update_schedule(id, schedule)

@app.delete("/api/schedules/{id}")
async def delete_existing_schedule(id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    existing = await get_schedule(id)
    if user.get("role") == "doctor" and user.get("_id") != existing["data"]["doctor"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await delete_schedule(id)

@app.get("/api/schedules/patient/{patient_id}")
async def patient_schedules(patient_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ["patient", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.get("role") == "patient" and user.get("_id") != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await get_patient_schedules(patient_id)

@app.get("/api/schedules/")
async def all_schedules(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return await get_schedules()

@app.put("/api/schedules/schedule/{doctor_id}")
async def update_doctor_schedule(doctor_id: str, schedule: ScheduleUpdate, user: dict = Depends(get_current_user)):
    # Log the request
    logger.info(f"Updating schedule for doctor: {doctor_id}")
    logger.info(f"Update requested by user: {user.get('_id')} with role: {user.get('role')}")

    # Check if the user is authorized to modify this schedule
    if not is_authorized_for_schedule(user, doctor_id, "modify"):
        logger.warning(f"Unauthorized attempt to update schedule for doctor {doctor_id} by user {user.get('_id')}")
        raise HTTPException(status_code=403, detail="Not authorized to modify this schedule")

    # Log the update data
    update_data = schedule.model_dump(exclude_unset=True)
    logger.info(f"Schedule update data: {update_data}")

    # Update the schedule with time slots for working days
    result = await update_schedule(doctor_id, schedule)
    logger.info(f"Schedule update successful for doctor: {doctor_id}")
    return result

@app.patch("/api/schedules/schedule/{doctor_id}/{day}")
async def update_day_schedule(doctor_id: str, day: str, schedule_update: dict, user: dict = Depends(get_current_user)):
    if not is_authorized_for_schedule(user, doctor_id, "modify"):
        raise HTTPException(status_code=403, detail="Not authorized to modify this schedule")

    # Get the current schedule
    schedule = await get_schedule(doctor_id)

    # Find the day in the schedule
    day_index = next((i for i, d in enumerate(schedule["data"]["weeklySchedule"]) if d["day"].lower() == day.lower()), -1)
    if day_index == -1:
        raise HTTPException(status_code=404, detail="Day not found in schedule")

    # Get the current day data
    current_day = schedule["data"]["weeklySchedule"][day_index]

    # Import the generate_time_slots function from the controller
    try:
        # Try absolute import first
        from src.controllers.schedule_controller import generate_time_slots
        logger.info("Using absolute import for generate_time_slots")
    except ImportError:
        # Try relative import
        from controllers.schedule_controller import generate_time_slots
        logger.info("Using relative import for generate_time_slots")

    # If the day is being set to non-working, clear the time slots
    if "isWorkingDay" in schedule_update and not schedule_update["isWorkingDay"]:
        logger.info(f"Setting {day} as non-working day, clearing time slots")
        schedule_update["timeSlots"] = []
    # If time slots are not provided but the day is working
    elif "timeSlots" not in schedule_update and "isWorkingDay" in schedule_update and schedule_update["isWorkingDay"]:
        # If the day was already working and had time slots, preserve them
        if current_day.get("isWorkingDay") and current_day.get("timeSlots"):
            logger.info(f"Preserving existing time slots for {day}")
            schedule_update["timeSlots"] = current_day.get("timeSlots", [])
        else:
            # If it's a new working day or had no time slots, generate them
            logger.info(f"Generating time slots for {day}")

            # Get schedule settings
            default_slot_duration = schedule["data"].get("defaultSlotDuration", 30)
            break_time = schedule["data"].get("breakTime", {"start": "13:00", "end": "14:00"})
            break_start = break_time.get("start", "13:00")
            break_end = break_time.get("end", "14:00")
            start_time = schedule["data"].get("startTime", "09:00")
            end_time = schedule["data"].get("endTime", "17:00")

            # Generate time slots
            schedule_update["timeSlots"] = generate_time_slots(
                start_time,
                end_time,
                default_slot_duration,
                break_start,
                break_end
            )

    # Update the day in the schedule
    schedule["data"]["weeklySchedule"][day_index] = {"day": day, **schedule_update}

    # Update the schedule
    return await update_schedule(doctor_id, ScheduleUpdate(weeklySchedule=schedule["data"]["weeklySchedule"]))

@app.get("/api/schedules/schedule/{doctor_id}/available-slots/{date}")
async def available_slots(doctor_id: str, date: str, _: dict = Depends(get_current_user)):
    # The user parameter is required for authentication but not used in the function
    return await get_available_slots(doctor_id, date)

# Run the app
if __name__ == "__main__":
    import uvicorn
    # Use the default port 3004 for the schedule service
    port = int(os.getenv("PORT", 3004))
    logger.info(f"Schedule service is running on port {port}")
    try:
        # Try to run the server, with a graceful shutdown on error
        uvicorn.run(app, host="0.0.0.0", port=port)
    except OSError as e:
        if "address already in use" in str(e).lower():
            # If the port is already in use, try an alternative port
            alternative_port = port + 1
            logger.warning(f"Port {port} is already in use. Trying alternative port {alternative_port}")
            try:
                uvicorn.run(app, host="0.0.0.0", port=alternative_port)
            except Exception as inner_e:
                logger.error(f"Failed to start server on alternative port: {inner_e}")
                raise
        else:
            logger.error(f"Server failed to start: {e}")
            raise
    except Exception as e:
        logger.error(f"Server failed to start: {e}")
        raise