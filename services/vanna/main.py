import time
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import uvicorn
from config import settings
from database import db_manager
from vanna_service import vanna_service


# Pydantic models for requests/responses
class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Natural language query")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")


class ChatResponse(BaseModel):
    sql: Optional[str] = None
    results: List[Dict[str, Any]] = []
    chart_type: str = "table"
    execution_time: float = 0.0
    error: Optional[str] = None
    suggestedFollowUp: List[str] = []


class HealthResponse(BaseModel):
    status: str
    database_connected: bool
    environment: str


class SuggestionsResponse(BaseModel):
    suggestions: List[str]


# Initialize FastAPI app
app = FastAPI(
    title="Vanna AI Service",
    description="AI-powered natural language to SQL service for analytics platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.environment == "development" else "Something went wrong"
        }
    )


@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "service": "Vanna AI Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    db_connected = db_manager.test_connection()

    return HealthResponse(
        status="healthy" if db_connected else "unhealthy",
        database_connected=db_connected,
        environment=settings.environment
    )


@app.get("/suggestions", response_model=SuggestionsResponse)
async def get_query_suggestions():
    """Get suggested queries for users"""
    suggestions = [
        "What's the total spend in the last 90 days?",
        "List top 5 vendors by spend.",
        "Show overdue invoices as of today.",
        "Compare spend by category.",
        "What's our average invoice value?",
        "How many invoices were processed this month?",
        "What's the total value of pending invoices?",
        "Show payment trends over the last 6 months.",
    ]

    return SuggestionsResponse(suggestions=suggestions)


@app.post("/ask", response_model=ChatResponse)
async def ask_question(request: ChatRequest):
    """
    Process natural language query and return SQL + results

    This endpoint:
    1. Converts natural language to SQL using AI
    2. Executes the generated SQL against the database
    3. Returns results with suggested visualizations
    """
    start_time = time.time()

    try:
        # Validate query
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        # Process the query using Vanna service
        result = vanna_service.process_query(request.query)

        # Calculate execution time
        execution_time = time.time() - start_time

        # Prepare response
        response = ChatResponse(
            sql=result["sql"],
            results=result["results"],
            chart_type=result["chart_type"],
            execution_time=execution_time,
            error=result["error"],
            suggestedFollowUp=result.get("suggestedFollowUp", [])
        )

        return response

    except Exception as e:
        # Calculate execution time even for errors
        execution_time = time.time() - start_time

        return ChatResponse(
            sql=None,
            results=[],
            chart_type="metric",
            execution_time=execution_time,
            error=str(e),
            suggestedFollowUp=[]
        )


@app.post("/validate-sql")
async def validate_sql(sql: str = Field(..., description="SQL query to validate")):
    """Validate SQL query without executing it"""
    try:
        # Basic validation
        if not sql.strip().upper().startswith('SELECT'):
            raise HTTPException(
                status_code=400,
                detail="Only SELECT queries are allowed"
            )

        # Test SQL syntax with EXPLAIN (PostgreSQL specific)
        test_sql = f"EXPLAIN {sql}"
        db_manager.execute_query(test_sql)

        return {
            "valid": True,
            "message": "SQL syntax is valid"
        }

    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }


@app.get("/schema")
async def get_database_schema():
    """Get database schema information"""
    try:
        schema_info = db_manager.get_table_info()
        return {
            "success": True,
            "data": schema_info
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get schema: {str(e)}"
        )


@app.post("/train")
async def train_model(
    ddl: Optional[str] = None,
    documentation: Optional[str] = None
):
    """
    Train the model with additional schema information

    Note: This is a placeholder for future fine-tuning capabilities
    """
    return {
        "status": "not_implemented",
        "message": "Model training is not yet implemented"
    }


if __name__ == "__main__":
    # Print startup information
    print(f"🚀 Starting Vanna AI Service")
    print(f"📍 Environment: {settings.environment}")
    print(f"🌐 Server: http://{settings.host}:{settings.port}")
    print(f"📚 Docs: http://{settings.host}:{settings.port}/docs")
    print(f"🔧 Groq Model: {settings.groq_model}")

    # Test database connection
    if db_manager.test_connection():
        print("✅ Database connection successful")
    else:
        print("❌ Database connection failed")

    # Start the server
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level="info"
    )