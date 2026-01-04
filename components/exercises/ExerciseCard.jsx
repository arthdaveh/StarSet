import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { EXERCISE_TYPES } from "../general/exerciseTypes";
import { newId } from "../../storage/id";

//this is getting so messy i am cooked lmaooooooo sorry

const ExerciseCard = ({
  id,
  name,
  onRemove,
  onReadSession,
  onPersistSession,
  selectedDate,
  onRename,
  onMove,
  unit,
  onChangeUnits,
  onReadPrevSession,
  onOpenHistory,
  display,
  unitOptions,
  utils,
  type,
  onReorder,
  selectedForReorder,
  isReordering,
  onSelectForReorder,
}) => {
  const KG_PER_LB = 0.45359237;
  const LB_PER_KG = 1 / KG_PER_LB;

  const [isAddingSet, setIsAddingSet] = useState(false);

  const [quantityText, setQuantityText] = useState("");
  const [countText, setCountText] = useState("");
  const [sets, setSets] = useState([]);
  const [rowDrafts, setRowDrafts] = useState({});
  const [notesText, setNotesText] = useState("");
  const [notes, setNotes] = useState("");

  const countRefs = useRef({});
  const newCountRef = useRef(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);

  const cfg = display || {
    showQ: true,
    showC: true,
    qLabel: "Quantity",
    cLabel: "Count",
  };
  const uopts = unitOptions ?? { quantity: [], count: [] };

  const fallbackQ = EXERCISE_TYPES?.[type]?.defaultUnits?.quantityUnit;
  const fallbackC = EXERCISE_TYPES?.[type]?.defaultUnits?.countUnit;
  const qUnit = unit?.quantityUnit ?? fallbackQ ?? "";
  const cUnit = unit?.countUnit ?? fallbackC ?? "";
  const units = { qUnit, cUnit };

  const isKgOrLbs = qUnit === "kg" || qUnit === "lbs";

  const displayQUnit = unit?.quantityUnit || "";
  const notesSuggestion = utils.summarizeSession(sets, units);

  const prev = onReadPrevSession?.(id);
  const prevSummary = prev?.entry?.sets?.length
    ? utils.summarizeSession(prev.entry.sets, units)
    : "--";
  const prevNotes = prev?.entry?.notes;

  useEffect(() => {
    const session = onReadSession?.(id);
    const updatedSets = session?.sets ?? [];
    setSets(session?.sets ?? []);
    setNotes(session?.notes ?? "");
    setNotesText(session?.notes ?? "");
    setRenameDraft(name);
    //if (sets.length === 0) setIsAddingSet(true);
  }, [id, selectedDate, onReadSession, name]);

  const showNewRow = isAddingSet || sets.length === 0;
  const showAddBtn = !showNewRow && sets.length >= 1;

  function openRename() {
    if (Platform.OS === "ios" && Alert.prompt) {
      Alert.prompt(
        "Rename exercise",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (text) => {
              const next = String(text ?? "").trim();
              if (next) onRename?.(id, next);
            },
          },
        ],
        "plain-text",
        name
      );
    } else {
      setRenameDraft(name);
      setIsRenaming(true);
    }
  }

  function handleSetSaveAll() {
    let qNew = parseFloat(String(quantityText ?? "").trim());
    let cNew = parseFloat(String(countText ?? "").trim());
    const nextNotes = String(notesText ?? "").trim();

    //if (Number.isNaN(qNew)) return;
    //if (display && display.showC && Number.isNaN(cNew)) return;

    // 1) compute updatedSets from current state
    const updatedSets = (() => {
      const updated = sets.map((s) => {
        const d = rowDrafts[s.id];
        if (!d) return s;
        let q = parseFloat(String(d.quantityDraft ?? "").trim());
        let r = parseFloat(String(d.countDraft ?? "").trim());

        const patch = {};
        if (cfg.showQ && !Number.isNaN(q)) {
          patch.quantity = q;
          if (qUnit && s.quantityUnitUsed !== qUnit) {
            patch.quantityUnitUsed = qUnit;
          }
        }
        if (cfg.showC && !Number.isNaN(r)) {
          patch.count = r;
          if (cUnit && s.countUnitUsed !== cUnit) {
            patch.countUnitUsed = cUnit;
          }
        }

        return Object.keys(patch).length ? { ...s, ...patch } : s;
      });

      const canPushQ = cfg.showQ ? !Number.isNaN(qNew) : true;
      const canPushC = cfg.showC ? !Number.isNaN(cNew) : true;

      //NEW SETS
      if (canPushQ && canPushC) {
        updated.push({
          id: newId(),
          ...(cfg.showQ ? { quantity: qNew, quantityUnitUsed: qUnit } : {}),
          ...(cfg.showC ? { count: cNew, countUnitUsed: cUnit } : {}),
        });
      }
      return updated;
    })();

    const prevLen = sets.length;

    const prevWasEmpty = prevLen === 0 && String(notes ?? "").trim() === "";
    const nowIsEmpty = updatedSets.length === 0 && nextNotes === "";

    if (prevWasEmpty && nowIsEmpty) {
      return;
    }

    // 2) update local UI state
    setSets(updatedSets);
    setNotes(nextNotes);

    // 3) persist using the SAME computed values
    onPersistSession(id, { sets: updatedSets, notes: nextNotes });

    // 4) cleanup UI scratchpads / next-row prefills
    setRowDrafts({});
    if (cfg.showQ && cfg.showC) {
      if (!Number.isNaN(qNew)) setQuantityText(String(qNew));
      if (!Number.isNaN(cNew)) setCountText("");
    } else {
      // single-field: clear the only field after save
      if (cfg.showQ && !Number.isNaN(qNew)) setQuantityText("");
      if (cfg.showC && !Number.isNaN(cNew)) setCountText("");
    }

    const added = updatedSets.length > prevLen;
    if (added) setIsAddingSet(false);
  }

  function deleteSet(targetId) {
    setSets((prev) => {
      const next = prev.filter((s) => s.id !== targetId);
      onPersistSession?.(id, { sets: next });
      return next;
    });

    setRowDrafts((prev) => {
      const out = { ...prev };
      delete out[targetId];
      return out;
    });
  }

  return (
    <Pressable
      onPress={() => {
        if (isReordering) {
          onSelectForReorder?.(id);
          return;
        }
      }}
    >
      <View
        key={id}
        style={[styles.card, selectedForReorder && { borderColor: "white" }]}
      >
        <View style={styles.setRow}>
          {/* <Text style={styles.cardTitle}></Text> */}
          {isRenaming ? (
            <View style={styles.renameRow}>
              <TextInput
                style={styles.renameInput}
                value={renameDraft}
                onChangeText={setRenameDraft}
                placeholder="Exercise name"
                placeholderTextColor="#888"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  const next = renameDraft.trim();
                  if (next) onRename?.(id, next);
                  setIsRenaming(false);
                }}
              />
              <Pressable
                style={styles.renameBtn}
                onPress={() => setIsRenaming(false)}
              >
                <Text style={styles.renameBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.renameBtn}
                onPress={() => {
                  const next = renameDraft.trim();
                  if (next) onRename?.(id, next);
                  setIsRenaming(false);
                }}
              >
                <Text style={styles.renameBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* <Text style={styles.cardTitle}>{name}</Text> */}
              <Pressable
                hitSlop={8}
                onLongPress={() => {
                  Alert.alert(name, "What do you like to do?", [
                    //{ text: "Move up", onPress: () => onMove?.(id, "up") },
                    //{ text: "Move down", onPress: () => onMove?.(id, "down") },
                    { text: "Reorder", onPress: () => onReorder?.(id) },
                    {
                      text: "Rename",
                      onPress: openRename,
                    },
                    {
                      text: "Remove from workout",
                      style: "destructive",
                      onPress: () => onRemove?.(id),
                    },
                    { text: "Cancel", style: "cancel" },
                  ]);
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
              >
                <Text style={styles.cardTitle}>{name}</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          onPress={() => onOpenHistory?.(id)}
        >
          <Text style={styles.previousSetTitle}>History ›</Text>
          <Text style={styles.previousSet}>
            {prev
              ? `${utils.formatPrettyDate(prev.date)} : ${prevSummary}`
              : "--"}
          </Text>
          {prevNotes ? (
            <Text style={styles.previousSet}>{prevNotes}</Text>
          ) : null}
        </Pressable>

        <View style={styles.setsBlock}>
          {/* Previous Sets Display */}
          {sets.map((s, i) => {
            const storedQ = s.quantity;
            const storedUnitQ = s.quantityUnitUsed ?? qUnit;
            let displayQ = storedQ;
            if (cfg.showQ && qUnit && storedQ != null) {
              displayQ = utils.convertWeight(storedQ, storedUnitQ, qUnit);
            }

            const draft = rowDrafts[s.id] ?? {};
            const quantityValue = cfg.showQ
              ? draft.quantityDraft ?? String(utils.formatNum(displayQ))
              : "";
            const countValue = cfg.showC
              ? draft.countDraft ?? String(s.count ?? "")
              : "";

            return (
              <Pressable
                key={s.id}
                onLongPress={() => {
                  Alert.alert(
                    "Delete set?",
                    `Set ${i + 1}: ${draft.quantityDraft || s.quantity} × ${
                      draft.countDraft || s.count
                    }`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteSet(s.id),
                      },
                    ]
                  );
                }}
                style={({ pressed }) => [
                  styles.setRow,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <View style={styles.setNumber}>
                  <Text style={styles.setNumberText}>{i + 1}</Text>
                </View>

                {cfg.showQ && (
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.setInput}
                      value={quantityValue}
                      onChangeText={(t) =>
                        setRowDrafts((prev) => ({
                          ...prev,
                          [s.id]: { ...(prev[s.id] ?? {}), quantityDraft: t },
                        }))
                      }
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={handleSetSaveAll}
                      onBlur={handleSetSaveAll}
                    />
                    {qUnit ? (
                      <Pressable
                        disabled={!isKgOrLbs}
                        hitSlop={8}
                        onLongPress={() => {
                          const opts = uopts.quantity;
                          if (!opts.length) return;
                          Alert.alert("Weight unit", "Choose unit", [
                            ...opts.map((u) => ({
                              text: u,
                              onPress: () =>
                                onChangeUnits?.(id, { quantityUnit: u }),
                            })),
                            { text: "Cancel", style: "cancel" },
                          ]);
                        }}
                        style={({ pressed }) => [
                          styles.setRow,
                          { opacity: pressed ? 0.5 : 1 },
                        ]}
                      >
                        <Text style={styles.unitBadge}>{qUnit}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}

                {cfg.showC && cfg.showQ && <Text style={styles.times}>×</Text>}

                {cfg.showC && (
                  <View style={styles.inputGroup}>
                    <TextInput
                      ref={(el) => (countRefs.current[s.id] = el)}
                      style={styles.setInput}
                      value={countValue}
                      onChangeText={(t) =>
                        setRowDrafts((prev) => ({
                          ...prev,
                          [s.id]: { ...(prev[s.id] ?? {}), countDraft: t },
                        }))
                      }
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={handleSetSaveAll}
                      onBlur={handleSetSaveAll}
                    />
                    {cUnit ? (
                      <Pressable
                        disabled={!isKgOrLbs}
                        hitSlop={8}
                        onLongPress={() => {
                          const opts = uopts.count;
                          if (!opts.length) return;
                          Alert.alert("Time unit", "Choose unit", [
                            ...opts.map((u) => ({
                              text: u,
                              onPress: () =>
                                onChangeUnits?.(id, { countUnit: u }),
                            })),
                            { text: "Cancel", style: "cancel" },
                          ]);
                        }}
                      >
                        <Text style={styles.unitBadge}>{cUnit}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
                <View style={styles.dotBox}>
                  {rowDrafts[s.id] ? <Text style={styles.dot}>•</Text> : null}
                </View>
              </Pressable>
            );
          })}

          {/* Current Row Display */}
          {showAddBtn && (
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.addButtonPressed,
              ]}
              onPress={() => setIsAddingSet(true)}
            >
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          )}
          {showNewRow && (
            <View style={styles.setRow}>
              <View style={styles.setNumber}>
                <Text style={styles.newSetNumberText}>{sets.length + 1}?</Text>
              </View>

              {cfg.showQ && (
                <View style={styles.newInputGroup}>
                  <TextInput
                    style={styles.newSetInput}
                    placeholder={cfg.qLabel}
                    placeholderTextColor="#888"
                    value={quantityText}
                    onChangeText={setQuantityText}
                    keyboardType="decimal-pad"
                    returnKeyType={cfg.showC ? "next" : "done"}
                    //blurOnSubmit={false}
                    onSubmitEditing={() => newCountRef.current?.focus()}
                    onBlur={handleSetSaveAll}
                  />
                  {qUnit ? (
                    <Pressable
                      disabled={!isKgOrLbs}
                      hitSlop={8}
                      onLongPress={() => {
                        const opts = uopts.quantity;
                        if (!opts.length) return;
                        Alert.alert("Weight unit", "Choose unit", [
                          ...opts.map((u) => ({
                            text: u,
                            onPress: () =>
                              onChangeUnits?.(id, { quantityUnit: u }),
                          })),
                          { text: "Cancel", style: "cancel" },
                        ]);
                      }}
                      style={({ pressed }) => [
                        styles.setRow,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Text style={styles.unitBadge}>{qUnit}</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
              {cfg.showC && cfg.showQ && <Text style={styles.times}>×</Text>}
              {cfg.showC && (
                <View style={styles.newInputGroup}>
                  <TextInput
                    ref={newCountRef}
                    style={styles.newSetInput}
                    placeholder={cfg.cLabel}
                    placeholderTextColor="#888"
                    value={countText}
                    onChangeText={setCountText}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={() =>
                      requestAnimationFrame(handleSetSaveAll)
                    }
                    onBlur={handleSetSaveAll}
                  />
                  {cUnit ? (
                    <Pressable
                      disabled={!isKgOrLbs}
                      hitSlop={8}
                      onLongPress={() => {
                        const opts = uopts.count;
                        if (!opts.length) return;
                        Alert.alert("Time unit", "Choose unit", [
                          ...opts.map((u) => ({
                            text: u,
                            onPress: () =>
                              onChangeUnits?.(id, { countUnit: u }),
                          })),
                          { text: "Cancel", style: "cancel" },
                        ]);
                      }}
                    >
                      <Text style={styles.unitBadge}>{cUnit}</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
              {/*  
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSetSaveAll}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
          */}
              <View style={styles.dotBox}>
                {quantityText !== "" || countText !== "" ? (
                  <Text style={styles.dot}>•</Text>
                ) : null}
              </View>
            </View>
          )}

          <Text style={styles.notesTitle}>Notes</Text>
          <View style={styles.setRow}>
            <TextInput
              style={styles.notesInput}
              placeholder={notesSuggestion || "Notes"}
              placeholderTextColor="#888"
              value={notesText}
              onChangeText={setNotesText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onBlur={handleSetSaveAll}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default ExerciseCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: "#666",
    minHeight: 100,
    justifyContent: "center",
  },
  cardTitle: { color: "white", fontSize: 22, fontWeight: "600" },
  notesTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  previousSetTitle: {
    color: "white",
    fontSize: 14,
    opacity: 1,
    marginTop: 3,
    fontWeight: "600",
  },
  previousSet: { color: "white", opacity: 0.6, marginTop: 2 },
  setsBlock: { marginTop: 10 },
  setsEmpty: { color: "white", opacity: 0.5, fontSize: 14 },

  setRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  setInput: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexGrow: 1,
    backgroundColor: "#0D0D0D",
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  newSetInput: {
    flexGrow: 1,
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    backgroundColor: "#0D0D0D",
    color: "#888",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  setNumber: {
    width: 28, // fixed so rows align
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberText: {
    color: "white",
    fontWeight: "600",
  },
  newSetNumberText: {
    color: "#888",
    fontWeight: "600",
  },

  inputGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newInputGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },
  unitBadge: {
    color: "#bbb",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    overflow: "hidden",
  },

  times: { color: "white", opacity: 0.6, fontSize: 16, paddingHorizontal: 4 },
  saveButton: {
    marginTop: 5,
    backgroundColor: "#222",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center", // centers vertically
    alignItems: "center", // centers horizontally
    alignSelf: "stretch",
  },
  saveButtonPressed: { borderColor: "white" },
  saveBtnText: { color: "white", fontWeight: "700" },
  saveRightWrapper: {
    flexGrow: 1,
  },

  dotBox: {
    width: 5,
    alignItems: "center", // center the dot
    justifyContent: "center",
  },
  dot: { color: "#aaa" },

  notesInput: {
    marginTop: 5,
    backgroundColor: "#0D0D0D",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    borderColor: "#222",
    minHeight: 30, // ~3 lines
  },

  renameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  renameInput: {
    flex: 1,
    backgroundColor: "#111",
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  renameBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1a1a1a",
  },
  renameBtnText: { color: "white", fontWeight: "600" },
  addButton: {
    backgroundColor: "#000",
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",

    marginTop: 8,
  },
  addButtonPressed: { borderColor: "white" },
  addButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
