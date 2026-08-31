from pydantic import BaseModel, Field

class FinancialSummaryResponse(BaseModel):
    total_income: float = Field(default=0.0)
    total_expenses: float = Field(default=0.0)
    net_profit: float = Field(default=0.0)
