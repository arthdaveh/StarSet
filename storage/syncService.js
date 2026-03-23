import { supabase } from "../lib/supabase";
import { storage } from "./sqliteAdapter";

const nowMs = () => Date.now();

let syncPromise = null;

export async function syncData() {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    await storage.init();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) throw userErr;
    if (!user) return { ok: false, skipped: true };

    const lastSyncMs = await storage.getLastSyncMs();

    await pushDirtyExercises(user.id);
    await pullExercisesSince(lastSyncMs);

    await pushDirtySessions(user.id);
    await pullSessionsSince(lastSyncMs);

    await pushDirtySets(user.id);
    await pullSetsSince(lastSyncMs);

    await storage.setLastSyncMs(nowMs());

    return { ok: true };
  })();

  try {
    return await syncPromise;
  } finally {
    syncPromise = null;
  }
}

let syncTimer = null;
const SYNC_DEBOUNCE_MS = 1500;

export function requestSync() {
  if (syncTimer) clearTimeout(syncTimer);

  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncData().catch((e) => {
      console.warn("background sync failed:", e);
    });
  }, SYNC_DEBOUNCE_MS);
}

//SYNC EXERCISES - SYNC EXERCISES - SYNC EXERCISES - SYNC EXERCISES - SYNC EXERCISES - SYNC EXERCISES

function toRemoteExercise(row, userId) {
  return {
    exerciseId: row.exerciseId,
    user_id: userId,
    name: row.name,
    type: row.type,
    quantityUnit: row.quantityUnit ?? "",
    countUnit: row.countUnit ?? "",
    client_updated_ms: Number(row.updatedAt || 0),
    deleted_at: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
  };
}

async function pushDirtyExercises(userId) {
  const dirtyRows = await storage.getDirtyExercises();
  if (!dirtyRows.length) return;

  //console.log("DIRTY EXERCISES BEFORE PUSH", dirtyRows);
  const payload = dirtyRows.map((r) => toRemoteExercise(r, userId));

  const { error } = await supabase
    .from("exercises")
    .upsert(payload, { onConflict: "exerciseId" });

  if (error) throw error;

  for (const row of dirtyRows) {
    await storage.markExerciseClean(row.exerciseId);
  }
}

async function pullExercisesSince(lastSyncMs) {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "exerciseId, name, type, quantityUnit, countUnit, deleted_at, client_updated_ms"
    )
    .gt("client_updated_ms", Number(lastSyncMs || 0))
    .order("client_updated_ms", { ascending: true });

  if (error) throw error;
  if (!data?.length) return;

  for (const remote of data) {
    const local = await storage.getExerciseRow(remote.exerciseId);

    const remoteMs = Number(remote.client_updated_ms || 0);

    if (local?.dirty && Number(local.updatedAt || 0) > remoteMs) {
      continue;
    }

    await storage.upsertExerciseFromRemote(remote);
  }
}

// SYNC SESSIONS - SYNC SESSIONS - SYNC SESSIONS - SYNC SESSIONS - SYNC SESSIONS - SYNC SESSIONS

function toRemoteSession(row, userId) {
  return {
    exerciseId: row.exerciseId,
    utcKey: row.utcKey,
    user_id: userId,
    notes: row.notes ?? "",
    client_updated_ms: Number(row.updatedAt || 0),
    deleted_at: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
  };
}

async function pushDirtySessions(userId) {
  const dirtyRows = await storage.getDirtySessions();
  if (!dirtyRows.length) return;

  const payload = dirtyRows.map((r) => toRemoteSession(r, userId));

  const { error } = await supabase
    .from("sessions")
    .upsert(payload, { onConflict: "exerciseId,utcKey" });

  if (error) throw error;

  for (const row of dirtyRows) {
    await storage.markSessionClean(row.exerciseId, row.utcKey);
  }
}

async function pullSessionsSince(lastSyncMs) {
  const { data, error } = await supabase
    .from("sessions")
    .select("exerciseId, utcKey, notes, deleted_at, client_updated_ms")
    .gt("client_updated_ms", Number(lastSyncMs || 0))
    .order("client_updated_ms", { ascending: true });

  if (error) throw error;
  if (!data?.length) return;

  for (const remote of data) {
    const local = await storage.getSessionRow(remote.exerciseId, remote.utcKey);

    const remoteMs = Number(remote.client_updated_ms || 0);

    if (local?.dirty && Number(local.updatedAt || 0) > remoteMs) {
      continue;
    }

    await storage.upsertSessionFromRemote(remote);
  }
}

//SYNC SETS - SYNC SETS - SYNC SETS - SYNC SETS - SYNC SETS - SYNC SETS - SYNC SETS - SYNC SETS

function toRemoteSet(row, userId) {
  return {
    setId: row.setId,
    exerciseId: row.exerciseId,
    utcKey: row.utcKey,
    user_id: userId,
    quantity: row.quantity ?? null,
    quantityUnitUsed: row.quantityUnitUsed ?? null,
    count: row.count ?? null,
    countUnitUsed: row.countUnitUsed ?? null,
    orderIndex: row.orderIndex ?? null,
    client_updated_ms: Number(row.updatedAt || 0),
    deleted_at: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
  };
}

async function pushDirtySets(userId) {
  const dirtyRows = await storage.getDirtySets();
  if (!dirtyRows.length) return;

  const payload = dirtyRows.map((r) => toRemoteSet(r, userId));

  const { error } = await supabase
    .from("sets")
    .upsert(payload, { onConflict: "setId" });

  if (error) throw error;

  for (const row of dirtyRows) {
    await storage.markSetClean(row.setId);
  }
}

async function pullSetsSince(lastSyncMs) {
  const { data, error } = await supabase
    .from("sets")
    .select(
      "setId, exerciseId, utcKey, quantity, quantityUnitUsed, count, countUnitUsed, orderIndex, deleted_at, client_updated_ms"
    )
    .gt("client_updated_ms", Number(lastSyncMs || 0))
    .order("client_updated_ms", { ascending: true });

  if (error) throw error;
  if (!data?.length) return;

  for (const remote of data) {
    const local = await storage.getSetRow(remote.setId);
    const remoteMs = Number(remote.client_updated_ms || 0);

    if (local?.dirty && Number(local.updatedAt || 0) > remoteMs) {
      continue;
    }

    await storage.upsertSetFromRemote(remote);
  }
}
