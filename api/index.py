import sys
import os

# Add backend to path so FastAPI app can import its modules
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from app.main import app  # noqa: E402, F401
