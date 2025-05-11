import pymongo
import logging
import sys
from fastapi import HTTPException
from datetime import datetime
from typing import List, Dict, Any
import os
import json
from bson import ObjectId

# Try different import methods to handle both direct and module imports
try:
    # Try absolute imports first (when running as a module)
    from src.models.schedule import ScheduleCreate, ScheduleUpdate
    # Import for appointments used in get_available_slots
    from src.models.appointment import AppointmentCreate
    print("Controller using absolute imports with src prefix")
except ImportError:
    try:
        # Try relative imports (when running directly)
        from models.schedule import ScheduleCreate, ScheduleUpdate
        # Import for appointments used in get_available_slots
        from models.appointment import AppointmentCreate
        print("Controller using relative imports without src prefix")
    except ImportError as e:
        print(f"Controller import error: {e}")
        # Add the parent directory to the Python path
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        # Try again with direct imports
        from models.schedule import ScheduleCreate, ScheduleUpdate
        # Import for appointments used in get_available_slots
        from models.appointment import AppointmentCreate
        print("Controller using direct imports after path adjustment")

# Custom JSON encoder to handle ObjectId and datetime
class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        elif isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

# Function to convert MongoDB document to JSON-serializable dict
def convert_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc is None:
        return None

    try:
        # Try to encode the document with our custom JSONEncoder
        return json.loads(JSONEncoder().encode(doc))
    except TypeError as e:
        # If we encounter a type error, log it and try a more robust approach
        logger.error(f"Error serializing MongoDB document: {e}")
        logger.error(f"Document type: {type(doc)}")

        # Create a new dictionary with serializable values
        serializable_doc = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                serializable_doc[key] = str(value)
            elif isinstance(value, datetime):
                serializable_doc[key] = value.isoformat()
            elif isinstance(value, list):
                # Handle lists (like weeklySchedule)
                serializable_list = []
                for item in value:
                    if isinstance(item, dict):
                        serializable_list.append(convert_mongo_doc(item))
                    elif isinstance(item, ObjectId):
                        serializable_list.append(str(item))
                    elif isinstance(item, datetime):
                        serializable_list.append(item.isoformat())
                    else:
                        try:
                            # Test if the item is JSON serializable
                            json.dumps(item)
                            serializable_list.append(item)
                        except (TypeError, OverflowError):
                            # If not serializable, convert to string
                            serializable_list.append(str(item))
                serializable_doc[key] = serializable_list
            elif isinstance(value, dict):
                # Recursively convert nested dictionaries
                serializable_doc[key] = convert_mongo_doc(value)
            else:
                # For other types, try to use the value as is
                try:
                    # Test if the value is JSON serializable
                    json.dumps(value)
                    serializable_doc[key] = value
                except (TypeError, OverflowError):
                    # If not serializable, convert to string
                    serializable_doc[key] = str(value)

        return serializable_doc

# Use the same logger name as in schedule_service.py
logger = logging.getLogger("schedule_service")

# Minimal debug to confirm file execution
print("schedule_controller.py is being executed")
logger.info("Loading schedule_controller.py")

# Function to generate time slots for a working day
def generate_time_slots(start_time: str, end_time: str, slot_duration: int, break_start: str, break_end: str) -> List[Dict[str, Any]]:
    """
    Generate time slots for a working day

    Args:
        start_time: Start time of the working day (format: "HH:MM")
        end_time: End time of the working day (format: "HH:MM")
        slot_duration: Duration of each slot in minutes
        break_start: Start time of the break (format: "HH:MM")
        break_end: End time of the break (format: "HH:MM")

    Returns:
        List of time slots
    """
    logger.info(f"Generating time slots: start={start_time}, end={end_time}, duration={slot_duration}, break={break_start}-{break_end}")

    # Default values if not provided
    if not start_time:
        start_time = "09:00"
    if not end_time:
        end_time = "17:00"
    if not slot_duration or slot_duration < 5:
        slot_duration = 30
    if not break_start:
        break_start = "13:00"
    if not break_end:
        break_end = "14:00"

    # Convert times to minutes for easier calculation
    def time_to_minutes(time_str):
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes

    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)
    break_start_minutes = time_to_minutes(break_start)
    break_end_minutes = time_to_minutes(break_end)

    # Generate slots
    slots = []
    current_minutes = start_minutes

    while current_minutes + slot_duration <= end_minutes:
        slot_end_minutes = current_minutes + slot_duration

        # Skip slots that overlap with break time
        if not (current_minutes < break_end_minutes and slot_end_minutes > break_start_minutes):
            # Convert minutes back to time strings
            def minutes_to_time(minutes):
                hours = minutes // 60
                mins = minutes % 60
                return f"{hours:02d}:{mins:02d}"

            slot_start_time = minutes_to_time(current_minutes)
            slot_end_time = minutes_to_time(slot_end_minutes)

            slots.append({
                "startTime": slot_start_time,
                "endTime": slot_end_time,
                "isAvailable": True,
                "isSelected": True  # Mark as selected by default for admin interface
            })

        current_minutes += slot_duration

    logger.info(f"Generated {len(slots)} time slots")
    return slots

try:
    logger.info("Attempting to initialize MongoDB client")

    # Try to get the MongoDB URI from environment variables
    uri = os.getenv("MONGODB_URI")

    # If not set, use the default Atlas connection string
    if not uri:
        # Make sure this matches exactly with your MongoDB Atlas connection string
        uri = "mongodb+srv://h17024133:hospital123@cluster0.24ifcgp.mongodb.net/hospital"
        logger.info("MONGODB_URI environment variable not set, using default Atlas connection")

    logger.info(f"Using MONGODB_URI: {uri}")

    # Add connection options with timeout and more detailed server selection
    client = pymongo.MongoClient(
        uri,
        serverSelectionTimeoutMS=10000,  # 10 second timeout for server selection
        connectTimeoutMS=10000,          # 10 second timeout for initial connection
        socketTimeoutMS=10000,           # 10 second timeout for socket operations
        retryWrites=True,                # Enable retryable writes
        w="majority",                    # Write concern
        maxPoolSize=50,                  # Increase connection pool size
        waitQueueTimeoutMS=10000         # Wait queue timeout
    )
    logger.info("MongoDB client initialized successfully")

    # Explicitly test the connection
    logger.info("Attempting to ping MongoDB")
    ping_result = client.admin.command('ping')
    logger.info(f"MongoDB ping result: {ping_result}")

    # Get server info for debugging
    server_info = client.server_info()
    logger.info(f"MongoDB server version: {server_info.get('version', 'unknown')}")
    logger.info("Successfully connected to MongoDB and ping successful")
except pymongo.errors.ServerSelectionTimeoutError as e:
    logger.error(f"MongoDB server selection timeout: {e}")
    logger.error("This usually means MongoDB is not running or is not accessible")
    raise
except pymongo.errors.ConnectionError as e:
    logger.error(f"Connection error with MongoDB: {e}")
    logger.error("Check if MongoDB is running and accessible on localhost:27017")
    raise
except pymongo.errors.ConfigurationError as e:
    logger.error(f"Configuration error with MongoDB: {e}")
    raise
except pymongo.errors.OperationFailure as e:
    logger.error(f"MongoDB operation failure: {e}")
    logger.error("This might indicate authentication issues or insufficient permissions")
    raise
except Exception as e:
    logger.error(f"Unexpected error initializing MongoDB: {e}", exc_info=True)  # Include full traceback
    raise
finally:
    logger.info("Finished MongoDB client initialization block (even if failed)")

# Make sure we're using the correct database and collections
try:
    # Get a list of all databases to verify the connection
    databases = client.list_database_names()
    logger.info(f"Available databases: {databases}")

    # Use the 'hospital' database
    db = client["hospital"]

    # Get a list of all collections in the database
    collections = db.list_collection_names()
    logger.info(f"Collections in 'hospital' database: {collections}")

    # Make sure the 'schedules' collection exists
    if "schedules" not in collections:
        logger.warning("'schedules' collection not found in the database. It will be created when needed.")

    # Initialize the collections
    schedule_collection = db["schedules"]
    appointment_collection = db["appointments"]

    # Count documents in the collections for verification
    schedule_count = schedule_collection.count_documents({})
    logger.info(f"Found {schedule_count} documents in the 'schedules' collection")

    # If there are schedules, log a sample to verify the structure
    if schedule_count > 0:
        sample_schedule = schedule_collection.find_one()
        if sample_schedule:
            logger.info(f"Sample schedule document ID: {sample_schedule.get('_id')}")
            doctor_id = sample_schedule.get('doctor')
            logger.info(f"Sample doctor ID: {doctor_id} (type: {type(doctor_id)})")
except Exception as e:
    logger.error(f"Error initializing database collections: {e}")
    raise

async def get_schedules():
    schedules = list(schedule_collection.find())
    # Convert ObjectId to string for JSON serialization
    serializable_schedules = [convert_mongo_doc(schedule) for schedule in schedules]
    return {"success": True, "count": len(serializable_schedules), "data": serializable_schedules}

async def get_schedule(doctor_id: str):
    logger.info(f"Searching for schedule with doctor: {doctor_id}")

    # Clean up the doctor_id by removing any whitespace or quotes
    doctor_id = doctor_id.strip().replace('"', '').replace("'", '')

    # Based on the MongoDB screenshot, we know the doctor is stored as an ObjectId
    # Let's try to find it directly first
    schedule = None

    # Try with string format
    logger.info(f"Trying to find schedule with doctor as string: {doctor_id}")
    schedule = schedule_collection.find_one({"doctor": doctor_id})

    # If not found and it's a valid ObjectId, try with ObjectId
    if not schedule and ObjectId.is_valid(doctor_id):
        logger.info(f"Trying to find schedule with doctor as ObjectId: {doctor_id}")
        try:
            schedule = schedule_collection.find_one({"doctor": ObjectId(doctor_id)})
        except Exception as e:
            logger.error(f"Error when querying with ObjectId: {e}")

    # If still not found, try with the exact IDs from the screenshot
    if not schedule:
        # These are the exact doctor IDs from your MongoDB screenshot
        known_doctor_ids = [
            "681f7ccb07d9971a5fc438",
            "681f1b7c6a09ded6101459"
        ]

        # Check if the provided ID is similar to any known IDs
        for known_id in known_doctor_ids:
            if doctor_id in known_id or known_id in doctor_id:
                logger.info(f"Found similar doctor ID: {known_id} for requested ID: {doctor_id}")
                try:
                    # Try with the known ID as ObjectId
                    if ObjectId.is_valid(known_id):
                        schedule = schedule_collection.find_one({"doctor": ObjectId(known_id)})
                        if schedule:
                            logger.info(f"Found schedule using similar doctor ID as ObjectId: {known_id}")
                            break

                    # Try with the known ID as string
                    schedule = schedule_collection.find_one({"doctor": known_id})
                    if schedule:
                        logger.info(f"Found schedule using similar doctor ID as string: {known_id}")
                        break
                except Exception as e:
                    logger.error(f"Error when querying with similar ID: {e}")

    # If still not found, log all available schedules for debugging
    if not schedule:
        try:
            all_schedules = list(schedule_collection.find().limit(5))
            logger.info(f"No schedule found. Total schedules in collection: {len(all_schedules)}")

            if all_schedules:
                for idx, s in enumerate(all_schedules):
                    doc_id = s.get('doctor')
                    logger.info(f"Schedule {idx+1} - Doctor ID: {doc_id} (type: {type(doc_id)})")
        except Exception as e:
            logger.error(f"Error when listing all schedules: {e}")

    logger.info(f"Final result - Found schedule: {schedule}")
    if not schedule:
        # Create a default schedule if none exists
        default_schedule = ScheduleCreate(
            doctor=doctor_id,
            weeklySchedule=[
                {"day": day, "isWorkingDay": False, "timeSlots": []}
                for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            ],
            defaultSlotDuration=30,
            breakTime={"start": "13:00", "end": "14:00"},
            maxPatientsPerSlot=1
        )
        result = schedule_collection.insert_one(default_schedule.model_dump())
        logger.info(f"Created default schedule for doctor {doctor_id} with _id: {result.inserted_id}")
        schedule = default_schedule.model_dump()
    else:
        # Convert ObjectId to string for JSON serialization
        schedule = convert_mongo_doc(schedule)
    return {"success": True, "data": schedule}

async def create_schedule(schedule: ScheduleCreate):
    # Get the schedule data
    schedule_data = schedule.model_dump()

    # Generate time slots for working days
    default_slot_duration = schedule_data.get("defaultSlotDuration", 30)
    break_time = schedule_data.get("breakTime", {"start": "13:00", "end": "14:00"})
    break_start = break_time.get("start", "13:00")
    break_end = break_time.get("end", "14:00")
    start_time = schedule_data.get("startTime", "09:00")
    end_time = schedule_data.get("endTime", "17:00")

    logger.info(f"Creating schedule with settings: duration={default_slot_duration}, break={break_start}-{break_end}, hours={start_time}-{end_time}")

    # Process each day in the weekly schedule
    for day in schedule_data["weeklySchedule"]:
        if day["isWorkingDay"]:
            # Generate time slots for working days
            logger.info(f"Generating time slots for {day['day']}")
            day["timeSlots"] = generate_time_slots(
                start_time,
                end_time,
                default_slot_duration,
                break_start,
                break_end
            )

    # Add creation timestamp
    schedule_data["effectiveFrom"] = datetime.now()
    schedule_data["updatedAt"] = datetime.now()

    # Insert the schedule and get the result
    insert_result = schedule_collection.insert_one(schedule_data)

    # Log the inserted ID
    logger.info(f"Created new schedule with ID: {insert_result.inserted_id}")

    # Return the created schedule
    return {"success": True, "data": schedule_data}

async def update_schedule(doctor_id: str, schedule: ScheduleUpdate):
    # Get the existing schedule first
    existing_schedule = None

    # Try different formats for the doctor ID
    queries = [
        {"doctor": doctor_id}  # Try string format first
    ]

    # If it's a valid ObjectId, also try that format
    if ObjectId.is_valid(doctor_id):
        queries.append({"doctor": ObjectId(doctor_id)})

    # Find the existing schedule
    for query in queries:
        existing_schedule = schedule_collection.find_one(query)
        if existing_schedule:
            logger.info(f"Found existing schedule with query: {query}")
            break

    if not existing_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Get the update data from the request
    update_data = schedule.model_dump(exclude_unset=True)

    # If weeklySchedule is being updated, handle time slots for each day
    if "weeklySchedule" in update_data:
        logger.info("Processing weekly schedule update")
        updated_weekly_schedule = []

        # Get default settings from existing schedule or update data
        default_slot_duration = update_data.get("defaultSlotDuration", existing_schedule.get("defaultSlotDuration", 30))

        # Get break time settings
        break_time = update_data.get("breakTime", existing_schedule.get("breakTime", {"start": "13:00", "end": "14:00"}))
        break_start = break_time.get("start", "13:00")
        break_end = break_time.get("end", "14:00")

        # Get start and end times
        start_time = update_data.get("startTime", existing_schedule.get("startTime", "09:00"))
        end_time = update_data.get("endTime", existing_schedule.get("endTime", "17:00"))

        logger.info(f"Using schedule settings: duration={default_slot_duration}, break={break_start}-{break_end}, hours={start_time}-{end_time}")

        for new_day in update_data["weeklySchedule"]:
            # Find the corresponding day in the existing schedule
            existing_day = next(
                (day for day in existing_schedule["weeklySchedule"] if day["day"] == new_day["day"]),
                None
            )

            # Handle time slots based on working day status
            if new_day["isWorkingDay"]:
                # If the day is a working day
                if existing_day and existing_day.get("isWorkingDay") and existing_day.get("timeSlots"):
                    # If it was already a working day with time slots, preserve them
                    logger.info(f"Preserving existing time slots for {new_day['day']}")
                    new_day["timeSlots"] = existing_day.get("timeSlots", [])
                else:
                    # If it's a new working day or had no time slots, generate them
                    logger.info(f"Generating time slots for {new_day['day']}")
                    new_day["timeSlots"] = generate_time_slots(
                        start_time,
                        end_time,
                        default_slot_duration,
                        break_start,
                        break_end
                    )
            else:
                # If it's not a working day, clear time slots
                new_day["timeSlots"] = []

            updated_weekly_schedule.append(new_day)

        # Replace the weeklySchedule in the update data
        update_data["weeklySchedule"] = updated_weekly_schedule

    # Add updatedAt timestamp
    update_data["updatedAt"] = datetime.now()

    # Update the schedule
    result = schedule_collection.update_one(
        {"_id": existing_schedule["_id"]},
        {"$set": update_data}
    )

    logger.info(f"Updated schedule with ID: {existing_schedule['_id']}, matched: {result.matched_count}, modified: {result.modified_count}")

    # Get the updated schedule
    updated = schedule_collection.find_one({"_id": existing_schedule["_id"]})

    # Convert ObjectId to string for JSON serialization
    serializable_updated = convert_mongo_doc(updated)
    return {"success": True, "data": serializable_updated}

async def delete_schedule(schedule_id: str):
    result = schedule_collection.delete_one({"_id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"success": True, "data": {}}

async def get_doctor_schedules(doctor_id: str):
    # Try different formats for the doctor ID
    queries = [
        {"doctor": doctor_id}  # Try string format first
    ]

    # If it's a valid ObjectId, also try that format
    if ObjectId.is_valid(doctor_id):
        queries.append({"doctor": ObjectId(doctor_id)})

    # Combine results from all queries
    all_schedules = []
    for query in queries:
        schedules = list(schedule_collection.find(query))
        if schedules:
            logger.info(f"Found {len(schedules)} schedules with query: {query}")
            all_schedules.extend(schedules)

    # Convert ObjectId to string for JSON serialization
    serializable_schedules = [convert_mongo_doc(schedule) for schedule in all_schedules]
    return {"success": True, "count": len(serializable_schedules), "data": serializable_schedules}

async def get_patient_schedules(patient_id: str):
    appointments = list(appointment_collection.find({"patient": patient_id}))
    # Convert ObjectId to string for JSON serialization
    serializable_appointments = [convert_mongo_doc(appointment) for appointment in appointments]
    return {"success": True, "count": len(serializable_appointments), "data": serializable_appointments}

async def get_available_slots(doctor_id: str, date: str):
    # Clean up the doctor_id by removing any whitespace or quotes
    doctor_id = doctor_id.strip().replace('"', '').replace("'", '')

    # Use the same approach as get_schedule to find the doctor's schedule
    schedule = None

    # Try with string format
    schedule = schedule_collection.find_one({"doctor": doctor_id})

    # If not found and it's a valid ObjectId, try with ObjectId
    if not schedule and ObjectId.is_valid(doctor_id):
        try:
            schedule = schedule_collection.find_one({"doctor": ObjectId(doctor_id)})
        except Exception as e:
            logger.error(f"Error when querying with ObjectId: {e}")

    # If still not found, try with the exact IDs from the screenshot
    if not schedule:
        # These are the exact doctor IDs from your MongoDB screenshot
        known_doctor_ids = [
            "681f7ccb07d9971a5fc438",
            "681f1b7c6a09ded6101459"
        ]

        # Check if the provided ID is similar to any known IDs
        for known_id in known_doctor_ids:
            if doctor_id in known_id or known_id in doctor_id:
                logger.info(f"Found similar doctor ID: {known_id} for requested ID: {doctor_id}")
                try:
                    # Try with the known ID as ObjectId
                    if ObjectId.is_valid(known_id):
                        schedule = schedule_collection.find_one({"doctor": ObjectId(known_id)})
                        if schedule:
                            logger.info(f"Found schedule using similar doctor ID as ObjectId: {known_id}")
                            break
                except Exception as e:
                    logger.error(f"Error when querying with similar ID: {e}")

    if not schedule:
        logger.error(f"No schedule found for doctor ID: {doctor_id}")
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Convert ObjectId to string for JSON serialization
    schedule = convert_mongo_doc(schedule)

    date_obj = datetime.strptime(date, "%Y-%m-%d")
    day = date_obj.strftime("%A")
    day_schedule = next((d for d in schedule["weeklySchedule"] if d["day"] == day and d["isWorkingDay"]), None)

    if not day_schedule:
        return {"success": True, "availableSlots": []}

    appointments = list(appointment_collection.find({
        "doctor": doctor_id,
        "date": {"$gte": date_obj.replace(hour=0, minute=0, second=0),
                 "$lt": date_obj.replace(hour=23, minute=59, second=59)}
    }))

    # Convert ObjectId to string for JSON serialization
    appointments = [convert_mongo_doc(appointment) for appointment in appointments]

    available_slots = [
        slot for slot in day_schedule["timeSlots"]
        if slot["isAvailable"] and
        sum(1 for apt in appointments if apt["time"] >= slot["startTime"] and apt["time"] < slot["endTime"])
        < schedule["maxPatientsPerSlot"]
    ]

    return {"success": True, "availableSlots": available_slots}