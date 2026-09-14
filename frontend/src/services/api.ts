import type {
  WaitlistEntry,
  CreatePartyRequest,
  UpdatePartyRequest,
  Table,
  CreateTableRequest,
  UpdateTableRequest,
  DailyReportResponse,
  PinVerifyRequest,
  PinChangeRequest,
} from "../types/index.ts";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5173";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error('Something went wrong. Please try again.')
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

function jsonBody<T>(data: T): { headers: { "Content-Type": string }; body: string } {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export async function getWaitlist(): Promise<WaitlistEntry[]> {
  return request<WaitlistEntry[]>("/api/waitlist");
}

export async function addParty(data: CreatePartyRequest): Promise<WaitlistEntry> {
  return request<WaitlistEntry>("/api/waitlist", {
    method: "POST",
    ...jsonBody(data),
  });
}

export async function updateParty(
  id: string,
  data: UpdatePartyRequest,
): Promise<WaitlistEntry> {
  return request<WaitlistEntry>(`/api/waitlist/${id}`, {
    method: "PATCH",
    ...jsonBody(data),
  });
}

export async function deleteParty(id: string): Promise<void> {
  return request<void>(`/api/waitlist/${id}`, {
    method: "DELETE",
  });
}

export async function undoAction(id: string): Promise<WaitlistEntry> {
  return request<WaitlistEntry>(`/api/waitlist/${id}/undo`, {
    method: "POST",
  });
}

export async function getTables(): Promise<Table[]> {
  return request<Table[]>("/api/tables");
}

export async function createTable(data: CreateTableRequest): Promise<Table> {
  return request<Table>("/api/tables", {
    method: "POST",
    ...jsonBody(data),
  });
}

export async function updateTable(
  id: string,
  data: UpdateTableRequest,
): Promise<Table> {
  return request<Table>(`/api/tables/${id}`, {
    method: "PATCH",
    ...jsonBody(data),
  });
}

export async function getDailyReport(): Promise<DailyReportResponse> {
  return request<DailyReportResponse>("/api/reports/daily");
}

export async function verifyPin(data: PinVerifyRequest): Promise<{ valid: boolean }> {
  return request<{ valid: boolean }>("/api/settings/pin", {
    method: "POST",
    ...jsonBody(data),
  });
}

export async function changePin(data: PinChangeRequest): Promise<void> {
  return request<void>("/api/settings/pin", {
    method: "PATCH",
    ...jsonBody(data),
  });
}

export async function deleteTable(id: string): Promise<void> {
  return request<void>(`/api/tables/${id}`, {
    method: "DELETE",
  });
}

export async function getAvgTurnoverTime(): Promise<number> {
  return request<number>("/api/settings/avg-turnover-time");
}

export async function setAvgTurnoverTime(minutes: number): Promise<void> {
  return request<void>("/api/settings/avg-turnover-time", {
    method: "PATCH",
    ...jsonBody({ minutes }),
  });
}

export async function getWaitlistPaused(): Promise<boolean> {
  return request<boolean>("/api/settings/waitlist-paused");
}

export async function setWaitlistPaused(paused: boolean): Promise<void> {
  return request<void>("/api/settings/waitlist-paused", {
    method: "PATCH",
    ...jsonBody({ paused }),
  });
}

export async function getPartyByToken(token: string): Promise<WaitlistEntry | null> {
  const res = await fetch(`${BASE_URL}/api/waitlist/token/${token}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Something went wrong. Please try again.')
  }
  if (res.status === 204) return null;
  return res.json() as Promise<WaitlistEntry>;
}

export async function confirmWaiting(token: string): Promise<WaitlistEntry> {
  return request<WaitlistEntry>(`/api/waitlist/token/${token}/confirm`, {
    method: "POST",
  });
}

export async function cancelParty(token: string): Promise<WaitlistEntry> {
  return request<WaitlistEntry>(`/api/waitlist/token/${token}/cancel`, {
    method: "POST",
  });
}
