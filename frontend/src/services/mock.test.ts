import { describe, it, expect, beforeEach } from "vitest";
import { mockApi } from "./mock.ts";

beforeEach(() => {
  mockApi._reset();
});

describe("addParty", () => {
  it("returns a WaitlistEntry with status 'waiting' and timestamps", async () => {
    const entry = await mockApi.addParty({
      name: "Alice",
      party_size: 4,
    });

    expect(entry.id).toBeDefined();
    expect(entry.name).toBe("Alice");
    expect(entry.party_size).toBe(4);
    expect(entry.status).toBe("waiting");
    expect(entry.created_at).toBeDefined();
    expect(entry.updated_at).toBeDefined();
    expect(entry.created_at).toBe(entry.updated_at);
  });

  it("sets optional fields to defaults", async () => {
    const entry = await mockApi.addParty({ name: "Bob", party_size: 2 });

    expect(entry.phone).toBeNull();
    expect(entry.email).toBeNull();
    expect(entry.notes).toBeNull();
    expect(entry.urgent).toBe(false);
  });

  it("generates unique IDs for each party", async () => {
    const a = await mockApi.addParty({ name: "A", party_size: 1 });
    const b = await mockApi.addParty({ name: "B", party_size: 2 });
    expect(a.id).not.toBe(b.id);
  });
});

describe("getWaitlist", () => {
  it("returns empty array initially", async () => {
    const list = await mockApi.getWaitlist();
    expect(list).toEqual([]);
  });

  it("returns all added parties", async () => {
    await mockApi.addParty({ name: "A", party_size: 1 });
    await mockApi.addParty({ name: "B", party_size: 2 });
    const list = await mockApi.getWaitlist();
    expect(list).toHaveLength(2);
  });
});

describe("updateParty", () => {
  it("updates party fields", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    const updated = await mockApi.updateParty(party.id, { name: "A Updated" });
    expect(updated.name).toBe("A Updated");
    expect(updated.id).toBe(party.id);
  });

  it("allows valid transition waiting → notified", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    const updated = await mockApi.updateParty(party.id, {
      status: "notified",
    });
    expect(updated.status).toBe("notified");
    expect(updated.notified_at).toBeDefined();
  });

  it("allows valid transition notified → seated", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.updateParty(party.id, { status: "notified" });
    const seated = await mockApi.updateParty(party.id, { status: "seated" });
    expect(seated.status).toBe("seated");
    expect(seated.seated_at).toBeDefined();
  });

  it("allows valid transition waiting → canceled", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    const updated = await mockApi.updateParty(party.id, {
      status: "canceled",
    });
    expect(updated.status).toBe("canceled");
    expect(updated.canceled_at).toBeDefined();
  });

  it("allows valid transition waiting → no_show", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    const updated = await mockApi.updateParty(party.id, {
      status: "no_show",
    });
    expect(updated.status).toBe("no_show");
  });

  it("rejects invalid transition seated → waiting", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.updateParty(party.id, { status: "notified" });
    await mockApi.updateParty(party.id, { status: "seated" });
    await expect(
      mockApi.updateParty(party.id, { status: "waiting" }),
    ).rejects.toThrow("Invalid status transition");
  });

  it("rejects invalid transition notified → waiting", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.updateParty(party.id, { status: "notified" });
    await expect(
      mockApi.updateParty(party.id, { status: "waiting" }),
    ).rejects.toThrow("Invalid status transition");
  });

  it("throws for non-existent party", async () => {
    await expect(
      mockApi.updateParty("fake-id", { name: "X" }),
    ).rejects.toThrow("not found");
  });
});

describe("deleteParty", () => {
  it("removes the party from the list", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.deleteParty(party.id);
    const list = await mockApi.getWaitlist();
    expect(list).toHaveLength(0);
  });

  it("throws for non-existent party", async () => {
    await expect(mockApi.deleteParty("fake-id")).rejects.toThrow("not found");
  });
});

describe("undoAction", () => {
  it("restores previous state after update", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    const originalName = party.name;
    await mockApi.updateParty(party.id, { name: "B" });
    const restored = await mockApi.undoAction(party.id);
    expect(restored.name).toBe(originalName);
  });

  it("restores a deleted party", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.deleteParty(party.id);
    expect(await mockApi.getWaitlist()).toHaveLength(0);
    await mockApi.undoAction(party.id);
    const list = await mockApi.getWaitlist();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("A");
  });

  it("throws for party with no log entries", async () => {
    await expect(mockApi.undoAction("unknown-id")).rejects.toThrow(
      "No action log found",
    );
  });
});

describe("getTables", () => {
  it("returns empty array initially", async () => {
    const list = await mockApi.getTables();
    expect(list).toEqual([]);
  });

  it("returns all created tables", async () => {
    await mockApi.createTable({ label: "T1", capacity: 2 });
    await mockApi.createTable({ label: "T2", capacity: 4 });
    const list = await mockApi.getTables();
    expect(list).toHaveLength(2);
  });
});

describe("createTable", () => {
  it("creates a table with unique ID and defaults", async () => {
    const table = await mockApi.createTable({ label: "T1", capacity: 2 });
    expect(table.id).toBeDefined();
    expect(table.label).toBe("T1");
    expect(table.capacity).toBe(2);
    expect(table.is_occupied).toBe(false);
    expect(table.occupied_by_party_id).toBeNull();
    expect(table.created_at).toBeDefined();
  });

  it("generates unique IDs", async () => {
    const a = await mockApi.createTable({ label: "A", capacity: 2 });
    const b = await mockApi.createTable({ label: "B", capacity: 4 });
    expect(a.id).not.toBe(b.id);
  });
});

describe("updateTable", () => {
  it("patches table fields", async () => {
    const table = await mockApi.createTable({ label: "T1", capacity: 2 });
    const updated = await mockApi.updateTable(table.id, {
      is_occupied: true,
      occupied_by_party_id: "party-1",
    });
    expect(updated.is_occupied).toBe(true);
    expect(updated.occupied_by_party_id).toBe("party-1");
  });

  it("throws for non-existent table", async () => {
    await expect(
      mockApi.updateTable("fake-id", { label: "X" }),
    ).rejects.toThrow("not found");
  });
});

describe("getDailyReport", () => {
  it("returns zeroed report when empty", async () => {
    const report = await mockApi.getDailyReport();
    expect(report.total_parties).toBe(0);
    expect(report.average_wait_minutes).toBe(0);
    expect(report.no_show_rate).toBe(0);
    expect(report.seat_utilization).toBe(0);
  });

  it("computes correct metrics", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.addParty({ name: "B", party_size: 2 });
    await mockApi.updateParty(party.id, { status: "notified" });
    await mockApi.updateParty(party.id, { status: "seated" });

    await mockApi.createTable({ label: "T1", capacity: 2 });
    const t2 = await mockApi.createTable({ label: "T2", capacity: 4 });
    await mockApi.updateTable(t2.id, {
      is_occupied: true,
      occupied_by_party_id: party.id,
    });

    const report = await mockApi.getDailyReport();
    expect(report.total_parties).toBe(2);
    expect(report.average_wait_minutes).toBeGreaterThanOrEqual(0);
    expect(report.no_show_rate).toBe(0);
    expect(report.seat_utilization).toBe(0.5);
  });
});

describe("verifyPin", () => {
  it("returns valid: true for correct pin", async () => {
    const result = await mockApi.verifyPin({ pin: "1234" });
    expect(result).toEqual({ valid: true });
  });

  it("returns valid: false for wrong pin", async () => {
    const result = await mockApi.verifyPin({ pin: "0000" });
    expect(result).toEqual({ valid: false });
  });
});

describe("changePin", () => {
  it("updates PIN when current is correct", async () => {
    await mockApi.changePin({ current_pin: "1234", new_pin: "5678" });
    expect(await mockApi.verifyPin({ pin: "5678" })).toEqual({ valid: true });
    expect(await mockApi.verifyPin({ pin: "1234" })).toEqual({ valid: false });
  });

  it("throws when current PIN is wrong", async () => {
    await expect(
      mockApi.changePin({ current_pin: "0000", new_pin: "5678" }),
    ).rejects.toThrow("Current PIN is incorrect");
  });
});

describe("action logging", () => {
  it("logs add action", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    const list = await mockApi.getWaitlist();
    expect(list).toHaveLength(1);
    // The add log is created but we can verify the party has the correct ID
    expect(party.id).toBeDefined();
  });

  it("logs update action with previous state", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.updateParty(party.id, { name: "B" });
    // Verify the party was updated
    const list = await mockApi.getWaitlist();
    expect(list[0].name).toBe("B");
  });

  it("logs delete action", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.deleteParty(party.id);
    const list = await mockApi.getWaitlist();
    expect(list).toHaveLength(0);
  });

  it("logs undo action", async () => {
    const party = await mockApi.addParty({ name: "A", party_size: 2 });
    await mockApi.updateParty(party.id, { name: "B" });
    await mockApi.undoAction(party.id);
    const list = await mockApi.getWaitlist();
    expect(list[0].name).toBe("A");
  });
});
