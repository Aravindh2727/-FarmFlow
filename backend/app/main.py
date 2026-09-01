from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import connect_to_mongo, close_mongo_connection
from app.routes.auth import router as auth_router
from app.routes.farms import router as farms_router
from app.routes.fields import router as fields_router
from app.routes.crops import router as crops_router
from app.routes.activities import router as activities_router
from app.routes.expenses import router as expenses_router
from app.routes.income import router as income_router
from app.routes.finance import router as finance_router
from app.routes.livestock import router as livestock_router
from app.routes.dashboard import router as dashboard_router
from app.routes.ai import router as ai_router
from app.routes.notifications import router as notifications_router
from app.routes.reports import router as reports_router
from app.ml.predictors import ml_predictor

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    ml_predictor.load_models()
    yield
    await close_mongo_connection()

app = FastAPI(title="FarmFlow API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://farmflow-vfti.onrender.com",
        "https://farmflow-frontend.onrender.com"
    ],
    allow_origin_regex=r"^https?:\/\/([a-zA-Z0-9_\-]+\.)*(onrender\.com|vercel\.app|netlify\.app|localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(farms_router, prefix="/api/farms", tags=["farms"])
app.include_router(fields_router, prefix="/api/fields", tags=["fields"])
app.include_router(crops_router, prefix="/api/crops", tags=["crops"])
app.include_router(activities_router, prefix="/api/activities", tags=["activities"])
app.include_router(expenses_router, prefix="/api/expenses", tags=["expenses"])
app.include_router(income_router, prefix="/api/income", tags=["income"])
app.include_router(finance_router, prefix="/api/finance", tags=["finance"])
app.include_router(livestock_router, prefix="/api/livestock", tags=["livestock"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
app.include_router(notifications_router)
app.include_router(reports_router)

@app.get("/api/health")
async def health_check():
    from app.core import database
    db_status = "connected" if database.db is not None else "disconnected"
    return {"status": "ok", "database": db_status}
