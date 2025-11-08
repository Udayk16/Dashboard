import json
import re
from typing import Dict, List, Any, Optional, Tuple
import openai
import pandas as pd
from config import settings
from database import db_manager


class VannaService:
    """Service for AI-powered SQL generation using Groq API"""

    def __init__(self):
        if not settings.groq_api_key:
            raise ValueError("Groq API key is required")

        # Configure OpenAI client to use Groq
        openai.api_key = settings.groq_api_key
        openai.api_base = "https://api.groq.com/openai/v1"

        self.client = openai.OpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1"
        )

        # Cache for schema information
        self._schema_cache: Optional[Dict[str, Any]] = None

    def get_database_schema(self) -> str:
        """
        Get database schema formatted for AI context

        Returns:
            Formatted schema description
        """
        if self._schema_cache is None:
            table_info = db_manager.get_table_info()
            self._schema_cache = table_info

        schema_description = "Database Schema:\n\n"

        for table_name, info in self._schema_cache["tables"].items():
            schema_description += f"Table: {table_name}\n"
            schema_description += "Columns:\n"

            for column in info["columns"]:
                nullable = "NULL" if column["is_nullable"] == "YES" else "NOT NULL"
                default = f" DEFAULT {column['column_default']}" if column["column_default"] else ""
                schema_description += f"  - {column['column_name']}: {column['data_type']} {nullable}{default}\n"

            if info["sample_data"]:
                schema_description += "Sample data:\n"
                for row in info["sample_data"][:3]:  # Show first 3 rows
                    schema_description += f"  {json.dumps(row, default=str)}\n"

            schema_description += "\n"

        return schema_description

    def generate_sql(self, query: str) -> str:
        """
        Generate SQL from natural language query

        Args:
            query: Natural language query

        Returns:
            Generated SQL query

        Raises:
            Exception: If SQL generation fails
        """
        try:
            schema_context = self.get_database_schema()

            # Create prompt for SQL generation
            prompt = f"""
You are an expert SQL assistant. Generate a PostgreSQL query to answer the user's question.

{schema_context}

User Question: {query}

Requirements:
1. Generate only the SELECT query (no explanations)
2. Use proper table joins and relationships
3. Include relevant filters and conditions
4. Add LIMIT clause to prevent large result sets (max 1000 rows)
5. Use proper date formatting and functions
6. Return only valid PostgreSQL syntax

Examples:
Question: "What's the total spend in the last 90 days?"
SELECT SUM(total_amount) as total_spend
FROM invoices
WHERE issue_date >= CURRENT_DATE - INTERVAL '90 days'
  AND status IN ('PAID', 'PENDING', 'OVERDUE');

Question: "List top 5 vendors by spend"
SELECT
    v.name as vendor_name,
    SUM(i.total_amount) as total_spend,
    COUNT(i.id) as invoice_count
FROM invoices i
JOIN vendors v ON i.vendor_id = v.id
WHERE i.status IN ('PAID', 'PENDING', 'OVERDUE')
GROUP BY v.id, v.name
ORDER BY total_spend DESC
LIMIT 5;

Now generate a query for: {query}

SQL:
"""

            response = self.client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert PostgreSQL query generator. Generate only valid SQL queries, no explanations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=1000
            )

            sql_query = response.choices[0].message.content.strip()

            # Clean up the response
            sql_query = re.sub(r'^```sql\s*', '', sql_query)
            sql_query = re.sub(r'\s*```$', '', sql_query)
            sql_query = sql_query.strip()

            # Basic validation
            if not sql_query.upper().startswith('SELECT'):
                raise ValueError("Generated query is not a SELECT statement")

            if 'LIMIT' not in sql_query.upper():
                sql_query += f" LIMIT {settings.max_query_results}"

            return sql_query

        except Exception as e:
            raise Exception(f"SQL generation failed: {str(e)}")

    def execute_query(self, sql: str) -> List[Dict[str, Any]]:
        """
        Execute SQL query and return results

        Args:
            sql: SQL query to execute

        Returns:
            Query results as list of dictionaries
        """
        try:
            df = db_manager.execute_query(sql)
            return df.to_dict('records')

        except Exception as e:
            raise Exception(f"Query execution failed: {str(e)}")

    def determine_chart_type(self, query: str, results: List[Dict[str, Any]]) -> str:
        """
        Determine appropriate chart type based on query and results

        Args:
            query: Original natural language query
            results: Query results

        Returns:
            Chart type suggestion
        """
        query_lower = query.lower()

        # Check for specific chart keywords
        if any(word in query_lower for word in ['trend', 'over time', 'monthly', 'weekly']):
            return 'line'

        if any(word in query_lower for word in ['compare', 'versus', 'top', 'ranking']):
            return 'bar'

        if any(word in query_lower for word in ['percentage', 'proportion', 'breakdown']):
            return 'pie'

        # Analyze results structure
        if len(results) <= 1:
            return 'metric'

        # Check if results have time-series data
        if len(results) > 1:
            columns = list(results[0].keys()) if results else []
            date_columns = [col for col in columns if 'date' in col.lower() or 'time' in col.lower()]
            if date_columns:
                return 'line'

            # Check if results have categorical data with values
            numeric_columns = []
            categorical_columns = []

            for col in columns:
                if results[0][col] is not None:
                    try:
                        float(results[0][col])
                        numeric_columns.append(col)
                    except (ValueError, TypeError):
                        categorical_columns.append(col)

            if categorical_columns and numeric_columns:
                return 'bar'

        return 'table'

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        Process natural language query end-to-end

        Args:
            query: Natural language query

        Returns:
            Dictionary with SQL, results, and metadata
        """
        try:
            # Generate SQL
            sql = self.generate_sql(query)

            # Execute query
            results = self.execute_query(sql)

            # Determine chart type
            chart_type = self.determine_chart_type(query, results)

            # Generate suggested follow-up questions
            follow_up_questions = self._generate_follow_up_questions(query, results)

            return {
                "sql": sql,
                "results": results,
                "chart_type": chart_type,
                "execution_time": 0,  # Will be set by the API layer
                "error": None,
                "suggestedFollowUp": follow_up_questions
            }

        except Exception as e:
            return {
                "sql": None,
                "results": [],
                "chart_type": "metric",
                "execution_time": 0,
                "error": str(e),
                "suggestedFollowUp": []
            }

    def _generate_follow_up_questions(self, original_query: str, results: List[Dict[str, Any]]) -> List[str]:
        """
        Generate suggested follow-up questions

        Args:
            original_query: Original user query
            results: Query results

        Returns:
            List of follow-up questions
        """
        questions = []

        query_lower = original_query.lower()

        # Time-based follow-ups
        if 'last month' in query_lower or 'this month' in query_lower:
            questions.extend([
                "Compare with the same period last year",
                "Show quarterly breakdown"
            ])
        elif 'ytd' in query_lower or 'year to date' in query_lower:
            questions.extend([
                "What about last year?",
                "Show monthly breakdown"
            ])

        # Vendor/Category follow-ups
        if 'vendor' in query_lower:
            questions.extend([
                "Show top vendors by invoice count",
                "What are the spending trends by vendor category?"
            ])
        elif 'category' in query_lower:
            questions.extend([
                "Show top categories by invoice count",
                "Compare category spending month over month"
            ])

        # General follow-ups
        questions.extend([
            "What's the average invoice value?",
            "Show overdue invoices",
            "What are the payment trends?"
        ])

        return questions[:4]  # Return max 4 questions


# Global Vanna service instance
vanna_service = VannaService()