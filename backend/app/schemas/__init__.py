from pydantic import BaseModel, Field, field_validator


class PartyResponse(BaseModel):
    id: str
    name: str
    party_size: int
    phone: str | None = None
    email: str | None = None
    status: str
    position: int | None = None
    estimated_wait: int | None = None
    notes: str | None = None
    urgent: bool = False
    token: str | None = None
    created_at: str
    updated_at: str
    notified_at: str | None = None
    seated_at: str | None = None
    canceled_at: str | None = None


class CreatePartyRequest(BaseModel):
    name: str = Field(..., min_length=1)
    party_size: int = Field(..., ge=1, le=12)
    phone: str | None = None
    email: str | None = None
    notes: str | None = None
    urgent: bool = False


class UpdatePartyRequest(BaseModel):
    name: str | None = None
    party_size: int | None = Field(None, ge=1, le=12)
    phone: str | None = None
    email: str | None = None
    status: str | None = None
    position: int | None = None
    estimated_wait: int | None = None
    notes: str | None = None
    urgent: bool | None = None


class TableResponse(BaseModel):
    id: str
    capacity: int
    label: str
    is_occupied: bool = False
    occupied_by_party_id: str | None = None
    created_at: str


class CreateTableRequest(BaseModel):
    capacity: int = Field(..., ge=1, le=20)
    label: str = Field(..., min_length=1)


class UpdateTableRequest(BaseModel):
    capacity: int | None = Field(None, ge=1, le=20)
    label: str | None = None
    is_occupied: bool | None = None
    occupied_by_party_id: str | None = None


class ActionLogResponse(BaseModel):
    id: str
    party_id: str
    action: str
    previous_state: str | None = None
    created_by: str = "system"
    created_at: str


class AppSettingsResponse(BaseModel):
    key: str
    value: str


class DailyReportResponse(BaseModel):
    date: str
    total_parties: int = Field(..., ge=0)
    average_wait_minutes: float = Field(..., ge=0)
    no_show_rate: float = Field(..., ge=0, le=1)
    seat_utilization: float = Field(..., ge=0, le=1)


class PinVerifyRequest(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def pin_must_be_digits_4_to_8(cls, v: str) -> str:
        if not v.isdigit() or not (4 <= len(v) <= 8):
            raise ValueError("pin must be 4 to 8 digits")
        return v


class PinChangeRequest(BaseModel):
    current_pin: str
    new_pin: str

    @field_validator("current_pin")
    @classmethod
    def current_pin_must_be_digits_4_to_8(cls, v: str) -> str:
        if not v.isdigit() or not (4 <= len(v) <= 8):
            raise ValueError("current_pin must be 4 to 8 digits")
        return v

    @field_validator("new_pin")
    @classmethod
    def new_pin_must_be_digits_4_to_8(cls, v: str) -> str:
        if not v.isdigit() or not (4 <= len(v) <= 8):
            raise ValueError("new_pin must be 4 to 8 digits")
        return v


class PinVerifyResponse(BaseModel):
    valid: bool
    token: str | None = None
