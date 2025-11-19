from fastapi import APIRouter
from .module_profile import router as profile_router

router = APIRouter(prefix="/social-media", tags=["Social Media"])

# Include all sub-routers
router.include_router(profile_router)

