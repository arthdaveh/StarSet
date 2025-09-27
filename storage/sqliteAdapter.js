// storage/sqliteAdapter.js
import * as SQLite from "expo-sqlite";

const normalizeName = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

class SqliteAdapter {
  db = null;
  ready = false;

  async init() {
    if (this.ready) return;
    this.db = await SQLite.openDatabaseAsync("starset_v11.db");
    await this.db.execAsync("PRAGMA foreign_keys = ON;");

    //SQL TABLES--SQL TABLES--SQL TABLES--SQL TABLES--SQL TABLES--SQL TABLES--SQL TABLES-

    // --- schema versioning ---
    await this.db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
        value TEXT
    );
    `);

    const row = await this.db.getFirstAsync(
      `SELECT value FROM meta WHERE key='schema_version'`
    );
    const current = row ? parseInt(row.value) : 0;
    // create schema
    if (current < 1) {
      await this.db.execAsync(`
    -- ===== core lookups =====
      CREATE TABLE IF NOT EXISTS workouts (
        workoutId   TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        position    INTEGER  
      );

      CREATE TABLE IF NOT EXISTS exercises (
        exerciseId    TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        type          TEXT NOT NULL,     -- "weight_reps" | "reps_only" | ...
        quantityUnit  TEXT DEFAULT '',   -- e.g. "lbs" | "kg" | "" 
        countUnit     TEXT DEFAULT ''    -- e.g. "ct" | "sec" | "min" | ""
      );


      -- many-to-many: which exercises belong to which workout + ordering
      CREATE TABLE IF NOT EXISTS workout_exercises (
        workoutId  TEXT NOT NULL,
        exerciseId TEXT NOT NULL,
        position   INTEGER,              -- for ordering within the workout
        PRIMARY KEY (workoutId, exerciseId),
        FOREIGN KEY (workoutId)  REFERENCES workouts(workoutId)  ON DELETE CASCADE,
        FOREIGN KEY (exerciseId) REFERENCES exercises(exerciseId) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout
        ON workout_exercises (workoutId, position);

      -- ===== logging =====
      
      
      CREATE TABLE IF NOT EXISTS sessions (
        exerciseId TEXT NOT NULL,
        utcKey     TEXT NOT NULL,
        notes      TEXT DEFAULT '',
        PRIMARY KEY (exerciseId, utcKey),
        FOREIGN KEY (exerciseId) REFERENCES exercises(exerciseId) ON DELETE CASCADE
      );

      -- individual sets belonging to (exerciseId, utcKey)
      CREATE TABLE IF NOT EXISTS sets (
        setId            TEXT PRIMARY KEY,
        exerciseId       TEXT NOT NULL,
        utcKey           TEXT NOT NULL,
        quantity         REAL,           -- weight / distance / etc (primary)
        quantityUnitUsed TEXT,           -- unit at entry time (e.g., "lbs")
        count            REAL,           -- reps / seconds / etc (secondary)
        countUnitUsed    TEXT,
        orderIndex       INTEGER,        -- stable row order within the session
        FOREIGN KEY (exerciseId) REFERENCES exercises(exerciseId) ON DELETE CASCADE,
        FOREIGN KEY (exerciseId, utcKey) REFERENCES sessions(exerciseId, utcKey) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sets_exercise_day
        ON sets (exerciseId, utcKey, orderIndex);

      CREATE INDEX IF NOT EXISTS idx_sessions_exercise
        ON sessions (exerciseId);
    `);
      await this.db.runAsync(
        `INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version','1')`
      );
    }
    this.ready = true;
  }

  //SESSIONS CRUD-SESSIONS CRUD-SESSIONS CRUD-SESSIONS CRUD-SESSIONS CRUD-

  async getSessionsMapForExercise(exerciseId) {
    // sessions
    const sess = await this.db.getAllAsync(
      `SELECT utcKey, notes
         FROM sessions
        WHERE exerciseId=?`,
      [exerciseId]
    );

    // sets (ordered)
    const sets = await this.db.getAllAsync(
      `SELECT utcKey, setId, quantity, quantityUnitUsed, count, countUnitUsed, orderIndex
         FROM sets
        WHERE exerciseId=?
        ORDER BY utcKey ASC, orderIndex ASC`,
      [exerciseId]
    );

    const map = {};
    for (const { utcKey, notes } of sess) {
      map[utcKey] = { notes: notes ?? "", sets: [] };
    }
    for (const r of sets) {
      if (!map[r.utcKey]) map[r.utcKey] = { notes: "", sets: [] };
      map[r.utcKey].sets.push({
        id: r.setId,
        quantity: r.quantity,
        quantityUnitUsed: r.quantityUnitUsed,
        count: r.count,
        countUnitUsed: r.countUnitUsed,
      });
    }
    return map;
  }

  writeQueue = Promise.resolve();
  async saveSession(exerciseId, utcKey, { notes, sets }) {
    this.writeQueue = this.writeQueue.then(async () => {
      await this.db.withTransactionAsync(async () => {
        await this.db.runAsync(
          `INSERT INTO sessions (utcKey, exerciseId, notes)
           VALUES (?, ?, ?)
           ON CONFLICT(exerciseId, utcKey) DO UPDATE SET notes=excluded.notes`,
          [utcKey, exerciseId, notes ?? ""]
        );

        await this.db.runAsync(
          `DELETE FROM sets WHERE exerciseId=? AND utcKey=?`,
          [exerciseId, utcKey]
        );

        let idx = 0;
        for (const s of sets ?? []) {
          await this.db.runAsync(
            `INSERT INTO sets
               (setId, exerciseId, utcKey, quantity, quantityUnitUsed, count, countUnitUsed, orderIndex)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              s.id,
              exerciseId,
              utcKey,
              s.quantity ?? null,
              s.quantityUnitUsed ?? null,
              s.count ?? null,
              s.countUnitUsed ?? null,
              idx++,
            ]
          );
        }
      });
    });
    return this.writeQueue; // so callers can still await if they want
  }

  //WORKOUTS CRUD-WORKOUTS CRUD-WORKOUTS CRUD-WORKOUTS CRUD-WORKOUTS CRUD-
  async createWorkout(workoutId, name) {
    const max = await this.db.getFirstAsync(
      `SELECT COALESCE(MAX(position),0) AS m FROM workouts`
    );
    const nextPos = (max?.m ?? 0) + 1;

    await this.db.runAsync(
      `INSERT INTO workouts (workoutId, name, position) VALUES (?, ?, ?)`,
      [String(workoutId), String(name ?? "").trim(), nextPos]
    );
    return { workoutId, name: String(name ?? "").trim(), position: nextPos };
  }

  async getAllWorkouts() {
    if (!this.ready) throw new Error("DB not ready – call init() first");
    return await this.db.getAllAsync(
      `SELECT workoutId, name FROM workouts ORDER BY position ASC`
    );
  }

  async renameWorkout(workoutId, nextName) {
    await this.db.runAsync(`UPDATE workouts SET name=? WHERE workoutId=?`, [
      String(nextName ?? "").trim(),
      String(workoutId),
    ]);
  }

  async deleteWorkout(workoutId) {
    await this.db.runAsync(`DELETE FROM workouts WHERE workoutId=?`, [
      String(workoutId),
    ]);
  }

  async swapWorkoutPositions(idA, idB) {
    const a = await this.db.getFirstAsync(
      `SELECT position FROM workouts WHERE workoutId=?`,
      [idA]
    );
    const b = await this.db.getFirstAsync(
      `SELECT position FROM workouts WHERE workoutId=?`,
      [idB]
    );
    if (!a || !b) return;

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `UPDATE workouts SET position=? WHERE workoutId=?`,
        [b.position, idA]
      );
      await this.db.runAsync(
        `UPDATE workouts SET position=? WHERE workoutId=?`,
        [a.position, idB]
      );
    });
    console.log(
      "swap",
      idA,
      "posA=",
      a?.position,
      " <-> ",
      idB,
      "posB=",
      b?.position
    );
  }

  //EXERCISE CRUD-EXERCISE CRUD-EXERCISE CRUD-EXERCISE CRUD-EXERCISE CRUD-

  async ensureExercise(exerciseId, rawName, type, units = {}) {
    const name = normalizeName(rawName);

    const existing = await this.db.getFirstAsync(
      `SELECT exerciseId
         FROM exercises
        WHERE lower(name)=?
        LIMIT 1`,
      [name]
    );

    if (existing?.exerciseId) return existing.exerciseId;

    await this.db.runAsync(
      `INSERT INTO exercises (exerciseId, name, type, quantityUnit, countUnit)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(exerciseId),
        String(rawName ?? "").trim(),
        String(type ?? "weight_reps"),
        units.quantityUnit ?? "",
        units.countUnit ?? "",
      ]
    );
    return exerciseId;
  }

  async getAllExercises() {
    return await this.db.getAllAsync(
      `SELECT exerciseId, name, type, quantityUnit, countUnit FROM exercises`
    );
  }

  // WORKOUT EXERCISES LINK-WORKOUT EXERCISES LINK-WORKOUT EXERCISES LINK-
  async addExerciseToWorkout(workoutId, exerciseId) {
    const next = await this.db.getFirstAsync(
      `SELECT COALESCE(MAX(position),0)+1 AS m
         FROM workout_exercises
        WHERE workoutId=?`,
      [workoutId]
    );
    const nextPos = next?.m ?? 1;

    await this.db.runAsync(
      `INSERT INTO workout_exercises (workoutId, exerciseId, position)
       VALUES (?, ?, ?)`,
      [workoutId, exerciseId, nextPos]
    );
  }

  async getWorkoutExercisesWithMeta(workoutId) {
    return await this.db.getAllAsync(
      `SELECT we.position,
              e.exerciseId, e.name, e.type, e.quantityUnit, e.countUnit
         FROM workout_exercises we
         JOIN exercises e USING (exerciseId)
        WHERE we.workoutId=?
        ORDER BY we.position DESC`,
      [workoutId]
    );
  }

  async removeExerciseFromWorkout(workoutId, exerciseId) {
    await this.db.runAsync(
      `DELETE FROM workout_exercises WHERE workoutId=? AND exerciseId=?`,
      [workoutId, exerciseId]
    );
  }

  async swapExercisePositions(workoutId, exA, exB) {
    const a = await this.db.getFirstAsync(
      `SELECT position FROM workout_exercises WHERE workoutId=? AND exerciseId=?`,
      [workoutId, exA]
    );
    const b = await this.db.getFirstAsync(
      `SELECT position FROM workout_exercises WHERE workoutId=? AND exerciseId=?`,
      [workoutId, exB]
    );
    if (!a || !b) return;

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `UPDATE workout_exercises SET position=? WHERE workoutId=? AND exerciseId=?`,
        [b.position, workoutId, exA]
      );
      await this.db.runAsync(
        `UPDATE workout_exercises SET position=? WHERE workoutId=? AND exerciseId=?`,
        [a.position, workoutId, exB]
      );
    });
  }

  async renameExercise(exerciseId, nextName) {
    await this.db.runAsync(`UPDATE exercises SET name=? WHERE exerciseId=?`, [
      String(nextName ?? "").trim(),
      String(exerciseId),
    ]);
  }

  async updateExerciseUnits(exerciseId, unitsPatch = {}) {
    const q = unitsPatch.quantityUnit ?? null;
    const c = unitsPatch.countUnit ?? null;

    await this.db.runAsync(
      `UPDATE exercises
          SET quantityUnit = CASE WHEN ? IS NULL THEN quantityUnit ELSE ? END,
              countUnit    = CASE WHEN ? IS NULL THEN countUnit    ELSE ? END
        WHERE exerciseId=?`,
      [q, q, c, c, String(exerciseId)]
    );
  }

  //SETTINGS-SETTINGS-SETTINGS-SETTINGS-SETTINGS-SETTINGS-SETTINGS-
  // storage/sqliteAdapter.js
  async exportAll() {
    const exercises = await this.db.getAllAsync(
      `SELECT exerciseId, name, type, quantityUnit, countUnit
         FROM exercises
        ORDER BY name COLLATE NOCASE ASC`
    );

    const workouts = await this.db.getAllAsync(
      `SELECT workoutId, name, position
         FROM workouts
        ORDER BY position ASC, workoutId ASC`
    );

    const we = await this.db.getAllAsync(
      `SELECT workoutId, exerciseId, position
         FROM workout_exercises
        ORDER BY workoutId ASC, position ASC`
    );

    const sessions = await this.db.getAllAsync(
      `SELECT exerciseId, utcKey, notes
         FROM sessions
        ORDER BY exerciseId ASC, utcKey ASC`
    );

    const sets = await this.db.getAllAsync(
      `SELECT setId, exerciseId, utcKey, quantity, quantityUnitUsed, count, countUnitUsed, orderIndex
         FROM sets
        ORDER BY exerciseId ASC, utcKey ASC, orderIndex ASC`
    );

    const nameByExId = Object.fromEntries(
      exercises.map((e) => [e.exerciseId, e.name])
    );
    const nameByWorkoutId = Object.fromEntries(
      workouts.map((w) => [w.workoutId, w.name])
    );

    const sessionsPretty = sessions.map((s) => ({
      exerciseName: nameByExId[s.exerciseId] ?? null,
      ...s,
    }));

    const setsPretty = sets.map((s) => ({
      exerciseName: nameByExId[s.exerciseId] ?? null,
      ...s,
    }));

    const workoutExercisesPretty = we.map((x) => ({
      workoutName: nameByWorkoutId[x.workoutId] ?? null,
      exerciseName: nameByExId[x.exerciseId] ?? null,
      ...x,
    }));

    return {
      meta: { schemaVersion: 1, exportedAt: new Date().toISOString() },
      workouts,
      exercises,
      workout_exercises: workoutExercisesPretty,
      sessions: sessionsPretty,
      sets: setsPretty,
    };
  }

  async importAll(raw) {
    let data;
    if (typeof raw === "string") {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw new Error("Import: invalid JSON string");
      }
    }
    if (!data || typeof data !== "object") {
      throw new Error("Import: payload must be an object");
    }

    const arrayHelp = (x) => (Array.isArray(x) ? x : []);

    const inExercises = arrayHelp(data.exercises);
    const inSessions = arrayHelp(data.sessions);
    const inSets = arrayHelp(data.sets);

    const exercises = inExercises
      .map((e) => ({
        importExerciseId: String(e.exerciseId ?? e.id ?? "").trim(),
        name: String(e.name ?? "").trim(),
        type: String(e.type ?? "weight_reps"),
        quantityUnit: e.quantityUnit ?? "",
        countUnit: e.countUnit ?? "",
        nameKey: normalizeName(String(e.name ?? "")),
      }))
      .filter((e) => e.name.length > 0);

    const sessions = inSessions
      .map((s) => ({
        exerciseId: String(s.exerciseId ?? s.id ?? s._exerciseId ?? "").trim(),
        utcKey: String(s.utcKey ?? "").trim(),
        notes: String(s.notes ?? ""),
      }))
      .filter((s) => s.exerciseId && s.utcKey);

    const sets = inSets
      .map((x) => ({
        setId: String(x.setId ?? x.id ?? "").trim(),
        exerciseId: String(x.exerciseId ?? "").trim(),
        utcKey: String(x.utcKey ?? "").trim(),
        quantity: x.quantity ?? null,
        quantityUnitUsed: x.quantityUnitUsed ?? null,
        count: x.count ?? null,
        countUnitUsed: x.countUnitUsed ?? null,
        orderIndex:
          typeof x.orderIndex === "number" && Number.isFinite(x.orderIndex)
            ? x.orderIndex
            : null,
      }))
      .filter((s) => s.exerciseId && s.utcKey);

    // import exercises
    const localIdByNameKey = {};
    {
      const existing = await this.getAllExercises(); // [{exerciseId,name,type,quantityUnit,countUnit}]
      for (const e of existing) {
        localIdByNameKey[normalizeName(e.name)] = e.exerciseId;
      }
    }

    for (const e of exercises) {
      let localId = localIdByNameKey[e.nameKey];

      if (!localId) {
        localId = await this.ensureExercise(
          e.importExerciseId ||
            crypto.randomUUID?.() ||
            String(Date.now()) + Math.random(),
          e.name,
          e.type,
          { quantityUnit: e.quantityUnit, countUnit: e.countUnit }
        );
        localIdByNameKey[e.nameKey] = localId;
      }
    }

    const importIdToNameKey = {};
    for (const e of exercises) {
      if (e.importExerciseId) importIdToNameKey[e.importExerciseId] = e.nameKey;
    }

    const sessionsResolved = [];
    for (const s of sessions) {
      const nameKey = importIdToNameKey[s.exerciseId]; // get the exercise name for this session
      if (!nameKey) continue; // orphan in import → skip

      const localId = localIdByNameKey[nameKey]; // find local exercise id by name
      if (!localId) continue; // should never happen hopefully

      sessionsResolved.push({
        exerciseId: localId,
        utcKey: s.utcKey,
        notes: s.notes ?? "",
      });
    }

    const setsResolved = [];
    for (const x of sets) {
      const nameKey = importIdToNameKey[x.exerciseId];
      if (!nameKey) continue;
      const localId = localIdByNameKey[nameKey];
      if (!localId) continue;

      setsResolved.push({
        id: x.setId || String(Date.now()) + Math.random(),
        exerciseId: localId,
        utcKey: x.utcKey,
        quantity: x.quantity ?? null,
        quantityUnitUsed: x.quantityUnitUsed ?? null,
        count: x.count ?? null,
        countUnitUsed: x.countUnitUsed ?? null,
        orderIndex: Number.isFinite(x.orderIndex) ? x.orderIndex : null,
      });
    }

    // insert into sessions + sets into db
    for (const s of sessionsResolved) {
      const existing = await this.db.getFirstAsync(
        `SELECT notes FROM sessions WHERE exerciseId=? AND utcKey=?`,
        [s.exerciseId, s.utcKey]
      );

      if (!existing) {
        // brand new session
        await this.saveSession(s.exerciseId, s.utcKey, {
          notes: s.notes,
          sets: setsResolved.filter(
            (x) => x.exerciseId === s.exerciseId && x.utcKey === s.utcKey
          ),
        });
      } else {
        // session exists
        const existingSets = await this.db.getAllAsync(
          `SELECT setId FROM sets WHERE exerciseId=? AND utcKey=? LIMIT 1`,
          [s.exerciseId, s.utcKey]
        );

        if (existingSets.length === 0) {
          // only insert if no sets yet
          await this.saveSession(s.exerciseId, s.utcKey, {
            notes: existing.notes || s.notes,
            sets: setsResolved.filter(
              (x) => x.exerciseId === s.exerciseId && x.utcKey === s.utcKey
            ),
          });
        }
        // else: keep old sets, skip import
      }
    }
  }

  async resetAllData() {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(`DELETE FROM workout_exercises`);
      await this.db.runAsync(`DELETE FROM workouts`);
      await this.db.runAsync(`DELETE FROM sets`);
      await this.db.runAsync(`DELETE FROM sessions`);
      await this.db.runAsync(`DELETE FROM exercises`);
    });
  }

  async deleteExerciseEverywhere(exerciseId) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(`DELETE FROM sets WHERE exerciseId=?`, [
        exerciseId,
      ]);
      await this.db.runAsync(`DELETE FROM sessions WHERE exerciseId=?`, [
        exerciseId,
      ]);
      await this.db.runAsync(
        `DELETE FROM workout_exercises WHERE exerciseId=?`,
        [exerciseId]
      );
      await this.db.runAsync(`DELETE FROM exercises WHERE exerciseId=?`, [
        exerciseId,
      ]);
    });
  }

  async deleteExerciseHistoryInRange(exerciseId, fromUtcKey, toUtcKey) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `DELETE FROM sets
          WHERE exerciseId=? AND utcKey BETWEEN ? AND ?`,
        [exerciseId, fromUtcKey, toUtcKey]
      );

      await this.db.runAsync(
        `DELETE FROM sessions
          WHERE exerciseId=?
            AND utcKey BETWEEN ? AND ?
            AND utcKey NOT IN (
              SELECT DISTINCT utcKey FROM sets WHERE exerciseId=?
            )`,
        [exerciseId, fromUtcKey, toUtcKey, exerciseId]
      );
    });
  }
}

export const storage = new SqliteAdapter();
