import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Any, Dict, List, Optional
import pandas as pd
from config import settings

# Database configuration
DATABASE_URL = settings.database_url

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    poolclass=StaticPool,
    pool_pre_ping=True,
    echo=settings.environment == "development"
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db_session():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DatabaseManager:
    """Database manager for executing SQL queries"""

    def __init__(self):
        self.engine = engine

    def execute_query(self, sql: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        """
        Execute SQL query and return results as DataFrame

        Args:
            sql: SQL query to execute
            params: Query parameters

        Returns:
            DataFrame with query results

        Raises:
            Exception: If query execution fails
        """
        try:
            # Validate SQL for basic safety
            self._validate_sql(sql)

            # Execute query
            if params:
                df = pd.read_sql_query(sql, self.engine, params=params)
            else:
                df = pd.read_sql_query(sql, self.engine)

            return df

        except Exception as e:
            raise Exception(f"Query execution failed: {str(e)}")

    def get_table_info(self) -> Dict[str, Any]:
        """
        Get information about database tables and their structure

        Returns:
            Dictionary containing table information
        """
        try:
            # Get table names
            tables_query = """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """

            tables_df = pd.read_sql_query(tables_query, self.engine)
            table_names = tables_df['table_name'].tolist()

            # Get column information for each table
            table_info = {}

            for table_name in table_names:
                columns_query = """
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length
                FROM information_schema.columns
                WHERE table_name = :table_name AND table_schema = 'public'
                ORDER BY ordinal_position
                """

                columns_df = pd.read_sql_query(
                    columns_query,
                    self.engine,
                    params={"table_name": table_name}
                )

                table_info[table_name] = {
                    "columns": columns_df.to_dict('records'),
                    "column_count": len(columns_df)
                }

                # Get sample data (first 5 rows)
                sample_query = f"SELECT * FROM {table_name} LIMIT 5"
                try:
                    sample_df = pd.read_sql_query(sample_query, self.engine)
                    table_info[table_name]["sample_data"] = sample_df.to_dict('records')
                except Exception:
                    table_info[table_name]["sample_data"] = []

            return {
                "tables": table_info,
                "table_names": table_names,
                "total_tables": len(table_names)
            }

        except Exception as e:
            raise Exception(f"Failed to get table info: {str(e)}")

    def _validate_sql(self, sql: str) -> None:
        """
        Basic SQL validation for security

        Args:
            sql: SQL query to validate

        Raises:
            ValueError: If SQL is potentially dangerous
        """
        sql_upper = sql.upper().strip()

        # Block dangerous SQL operations
        dangerous_keywords = [
            'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER',
            'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE'
        ]

        for keyword in dangerous_keywords:
            if f' {keyword} ' in f' {sql_upper} ':
                raise ValueError(f"SQL contains dangerous keyword: {keyword}")

        # Only allow SELECT queries
        if not sql_upper.startswith('SELECT') and not sql_upper.startswith('WITH'):
            raise ValueError("Only SELECT queries are allowed")

        # Check for query result limits
        if 'LIMIT' not in sql_upper:
            # Add LIMIT if not present to prevent large result sets
            sql += f" LIMIT {settings.max_query_results}"

    def test_connection(self) -> bool:
        """
        Test database connection

        Returns:
            True if connection is successful, False otherwise
        """
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                return result.fetchone()[0] == 1
        except Exception:
            return False


# Global database manager instance
db_manager = DatabaseManager()