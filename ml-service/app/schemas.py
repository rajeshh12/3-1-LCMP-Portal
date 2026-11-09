from pydantic import BaseModel, Field


class DeadlineFeatures(BaseModel):
    Case_Type: str = "Civil"
    Case_Priority: str = "Medium"
    Task_Priority: str = "Medium"
    Days_Until_Deadline: int = Field(ge=-3650, le=3650)
    Days_Task_Remained_Open: int = Field(default=0, ge=0, le=3650)
    Previous_Delayed_Tasks: int = Field(default=0, ge=0, le=100)
    Lawyer_Current_Workload: int = Field(default=0, ge=0, le=500)
    Staff_Current_Workload: int = Field(default=0, ge=0, le=500)
    Pending_Tasks_Count: int = Field(default=0, ge=0, le=1000)
    Case_Age_Days: int = Field(default=0, ge=0, le=10000)
    Deadline_Extension_Count: int = Field(default=0, ge=0, le=100)
    Task_Completion_Rate: float = Field(default=0.5, ge=0, le=1)
    Upcoming_Hearing: bool = False
    Days_Since_Last_Update: int = Field(default=0, ge=0, le=10000)
    Task_Status: str = "Not Started"


class Prediction(BaseModel):
    probability: float
    category: str
    source: str
