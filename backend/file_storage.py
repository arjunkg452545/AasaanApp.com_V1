"""
File storage abstraction layer.
MVP: Local disk storage in backend/uploads/
Future: Swap to S3 by implementing S3Storage with the same interface.
"""
import os
import uuid
from pathlib import Path
from datetime import datetime


class LocalStorage:
    """Store files on local disk under backend/uploads/"""

    def __init__(self, base_dir: str = None):
        if base_dir is None:
            base_dir = os.path.join(os.path.dirname(__file__), "uploads")
        self.base_dir = base_dir

    def _ensure_dir(self, folder: str) -> str:
        dir_path = os.path.join(self.base_dir, folder)
        os.makedirs(dir_path, exist_ok=True)
        return dir_path

    async def save(self, file_bytes: bytes, original_filename: str, folder: str = "payment_proofs") -> str:
        """
        Save file bytes to disk.
        Returns the relative path from uploads root (e.g., 'payment_proofs/abc123.jpg')
        """
        dir_path = self._ensure_dir(folder)

        # Generate unique filename preserving extension
        ext = Path(original_filename).suffix.lower() or ".jpg"
        unique_name = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(dir_path, unique_name)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return f"{folder}/{unique_name}"

    def get_url(self, relative_path: str) -> str:
        """Convert relative path to URL path for serving."""
        return f"/uploads/{relative_path}"

    def get_absolute_path(self, relative_path: str) -> str:
        """Get absolute filesystem path for a relative path."""
        return os.path.join(self.base_dir, relative_path)

    def delete(self, relative_path: str) -> bool:
        """Delete a file. Returns True if deleted, False if not found."""
        abs_path = self.get_absolute_path(relative_path)
        if os.path.exists(abs_path):
            os.remove(abs_path)
            return True
        return False


# Singleton instance used across the app
file_storage = LocalStorage()
