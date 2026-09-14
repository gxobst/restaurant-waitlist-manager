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
  PartyStatus,
  ActionLog,
} from "../types/index.ts";

let parties: WaitlistEntry[] = [];
let tables: Table[] = [];
let actionLogs: ActionLog[] = [];
let currentPin = "1234";
let waitlistPaused = false;
let avgTurnoverTime = 45;

const VALID_TRANSITIONS: Record<PartyStatus, PartyStatus[]> = {
  waiting: ["notified", "canceled", "no_show"],
  notified: ["seated", "canceled", "no_show"],
  seated: [],
  canceled: [],
  no_show: [],
};

function reset(): void {
  parties = [];
  tables = [];
  actionLogs = [];
  currentPin = "1234";
  waitlistPaused = false;
  avgTurnoverTime = 45;
}

function writeLog(
  partyId: string,
  action: string,
  previousState: WaitlistEntry | null,
): void {
  actionLogs.push({
    id: crypto.randomUUID(),
    party_id: partyId,
    action,
    previous_state: previousState ? JSON.stringify(previousState) : null,
    created_by: "system",
    created_at: new Date().toISOString(),
  });
}

export async function getWaitlist(): Promise<WaitlistEntry[]> {
  return [...parties];
}

export async function addParty(
  data: CreatePartyRequest,
): Promise<WaitlistEntry> {
  const now = new Date().toISOString();
  const entry: WaitlistEntry = {
    id: crypto.randomUUID(),
    name: data.name,
    party_size: data.party_size,
    phone: data.phone ?? null,
    email: data.email ?? null,
    status: "waiting",
    position: null,
    estimated_wait: null,
    notes: data.notes ?? null,
    urgent: data.urgent ?? false,
    created_at: now,
    updated_at: now,
    notified_at: null,
    seated_at: null,
    canceled_at: null,
    token: crypto.randomUUID(),
  };
  parties.push(entry);
  writeLog(entry.id, "add", null);
  return { ...entry };
}

export async function updateParty(
  id: string,
  data: UpdatePartyRequest,
): Promise<WaitlistEntry> {
  const idx = parties.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Party ${id} not found`);

  if (data.status !== undefined) {
    const current = parties[idx].status;
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed.includes(data.status)) {
      throw new Error(
        `Invalid status transition: ${current} → ${data.status}`,
      );
    }
  }

  const previous = { ...parties[idx] };
  const now = new Date().toISOString();

  const updated: WaitlistEntry = {
    ...parties[idx],
    ...data,
    updated_at: now,
  };

  if (data.status === "notified") updated.notified_at = now;
  if (data.status === "seated") updated.seated_at = now;
  if (data.status === "canceled") updated.canceled_at = now;

  parties[idx] = updated;
  writeLog(id, `update:${data.status ?? "fields"}`, previous);
  return { ...updated };
}

export async function deleteParty(id: string): Promise<void> {
  const idx = parties.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Party ${id} not found`);
  const previous = { ...parties[idx] };
  parties.splice(idx, 1);
  writeLog(id, "delete", previous);
}

export async function undoAction(id: string): Promise<WaitlistEntry> {
  const logs = actionLogs.filter((l) => l.party_id === id);
  if (logs.length === 0) throw new Error(`No action log found for party ${id}`);

  const lastLog = logs[logs.length - 1];
  if (!lastLog.previous_state) {
    throw new Error(`Cannot undo action ${lastLog.action}: no previous state`);
  }

  const restored: WaitlistEntry = JSON.parse(lastLog.previous_state);
  const idx = parties.findIndex((p) => p.id === id);
  if (idx !== -1) {
    parties[idx] = { ...restored, updated_at: new Date().toISOString() };
  } else {
    parties.push({ ...restored, updated_at: new Date().toISOString() });
  }

  writeLog(id, "undo", { ...restored });
  return { ...restored, updated_at: new Date().toISOString() };
}

export async function getTables(): Promise<Table[]> {
  return [...tables];
}

export async function createTable(
  data: CreateTableRequest,
): Promise<Table> {
  const table: Table = {
    id: crypto.randomUUID(),
    capacity: data.capacity,
    label: data.label,
    is_occupied: false,
    occupied_by_party_id: null,
    created_at: new Date().toISOString(),
  };
  tables.push(table);
  return { ...table };
}

export async function updateTable(
  id: string,
  data: UpdateTableRequest,
): Promise<Table> {
  const idx = tables.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`Table ${id} not found`);

  tables[idx] = { ...tables[idx], ...data };
  return { ...tables[idx] };
}

export async function deleteTable(id: string): Promise<void> {
  const idx = tables.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`Table ${id} not found`);
  tables.splice(idx, 1);
}

export async function getAvgTurnoverTime(): Promise<number> {
  return avgTurnoverTime;
}

export async function setAvgTurnoverTime(minutes: number): Promise<void> {
  avgTurnoverTime = minutes;
}

export async function getDailyReport(): Promise<DailyReportResponse> {
  const totalParties = parties.length;
  const seated = parties.filter((p) => p.status === "seated");
  const noShows = parties.filter((p) => p.status === "no_show");

  let avgWait = 0;
  if (seated.length > 0) {
    const totalWait = seated.reduce((sum, p) => {
      if (p.seated_at && p.created_at) {
        return (
          sum +
          (new Date(p.seated_at).getTime() -
            new Date(p.created_at).getTime()) /
            60000
        );
      }
      return sum;
    }, 0);
    avgWait = totalWait / seated.length;
  }

  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.is_occupied).length;

  return {
    date: new Date().toISOString().split("T")[0],
    total_parties: totalParties,
    average_wait_minutes: Math.round(avgWait * 100) / 100,
    no_show_rate:
      totalParties > 0
        ? Math.round((noShows.length / totalParties) * 100) / 100
        : 0,
    seat_utilization:
      totalTables > 0
        ? Math.round((occupiedTables / totalTables) * 100) / 100
        : 0,
  };
}

export async function verifyPin(
  data: PinVerifyRequest,
): Promise<{ valid: boolean }> {
  return { valid: data.pin === currentPin };
}

export async function changePin(data: PinChangeRequest): Promise<void> {
  if (data.current_pin !== currentPin) {
    throw new Error("Current PIN is incorrect");
  }
  currentPin = data.new_pin;
}

export async function getWaitlistPaused(): Promise<boolean> {
  return waitlistPaused;
}

export async function setWaitlistPaused(paused: boolean): Promise<void> {
  waitlistPaused = paused;
}

export async function getPartyByToken(
  token: string,
): Promise<WaitlistEntry | null> {
  const party = parties.find((p) => p.token === token);
  if (!party) return null;
  return { ...party };
}

export async function confirmWaiting(
  token: string,
): Promise<WaitlistEntry> {
  const idx = parties.findIndex((p) => p.token === token);
  if (idx === -1) throw new Error(`Party with token ${token} not found`);
  const previous = { ...parties[idx] };
  const now = new Date().toISOString();
  parties[idx] = {
    ...parties[idx],
    status: "seated",
    seated_at: now,
    updated_at: now,
  };
  writeLog(parties[idx].id, "confirm", previous);
  return { ...parties[idx] };
}

export async function cancelParty(
  token: string,
): Promise<WaitlistEntry> {
  const idx = parties.findIndex((p) => p.token === token);
  if (idx === -1) throw new Error(`Party with token ${token} not found`);
  const previous = { ...parties[idx] };
  const now = new Date().toISOString();
  parties[idx] = {
    ...parties[idx],
    status: "canceled",
    canceled_at: now,
    updated_at: now,
  };
  writeLog(parties[idx].id, "cancel", previous);
  return { ...parties[idx] };
}

export const mockApi = {
  getWaitlist,
  addParty,
  updateParty,
  deleteParty,
  undoAction,
  getTables,
  createTable,
  updateTable,
  deleteTable,
  getAvgTurnoverTime,
  setAvgTurnoverTime,
  getDailyReport,
  verifyPin,
  changePin,
  getWaitlistPaused,
  setWaitlistPaused,
  getPartyByToken,
  confirmWaiting,
  cancelParty,
  _reset: reset,
};
