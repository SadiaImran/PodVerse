from fastapi import APIRouter
from .module_profile import router as profile_router
from .module_connections import router as connections_router
from .module_notifications import router as notifications_router

router = APIRouter(prefix="/social-media", tags=["Social Media"])

# Include all sub-routers
router.include_router(profile_router)
router.include_router(connections_router)
router.include_router(notifications_router)

