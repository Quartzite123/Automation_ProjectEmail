from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import APP_NAME
from app.api.router import api_router
from app.services.aws_ses import validate_aws_credentials

app = FastAPI(title=APP_NAME, version="1.0")

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Validate AWS SES configuration on startup"""
    validate_aws_credentials()

@app.get("/")
def read_root():
    return {
        "status": "running",
        "message": "Kiirus Automation Backend Active"
    }
