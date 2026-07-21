from pydantic import BaseModel, Field
import datetime as dt

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None

class TaskRead(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    created_at: dt.datetime
    model_config = {"from_attributes": True}

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None

class SignupIn(BaseModel):
    email: str
    password: str = Field(min_length=8)

class TokenOut(BaseModel):
    access_token: str
    token_type: str

class TaskDraft(BaseModel):
    title: str
    due_date: str | None
    priority: str
