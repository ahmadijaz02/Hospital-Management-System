"""
Entry point for the schedule service.
This file is used to import the FastAPI app from the src/schedule_service.py file.
"""
import os
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("schedule_service")

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the app from the schedule_service.py file
try:
    from src.schedule_service import app
    logger.info("Successfully imported app from src.schedule_service")
except ImportError as e:
    logger.error(f"Error importing app from src.schedule_service: {e}")
    # Try to import with a relative import
    try:
        import src.schedule_service
        app = src.schedule_service.app
        logger.info("Successfully imported app using relative import")
    except ImportError as e2:
        logger.error(f"Error with relative import: {e2}")
        raise

# This file is used as the entry point for the Docker container
# The app variable is imported by uvicorn
