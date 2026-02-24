from fastapi import APIRouter
from app.api.routes import upload, files, email, batches, email_test, clients

api_router = APIRouter()

api_router.include_router(upload.router,  prefix="/upload",  tags=["Upload"])
api_router.include_router(files.router,   prefix="/files",   tags=["Files"])
api_router.include_router(email.router,   prefix="/email",   tags=["Email"])
api_router.include_router(email_test.router, prefix="/email", tags=["Email"])
api_router.include_router(batches.router, prefix="/batches", tags=["Batches"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
