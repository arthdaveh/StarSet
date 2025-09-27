import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
} from "react-native";

import { EXERCISE_TYPES } from "../general/exerciseTypes";

const TYPE_ORDER = [
  "weight_reps",
  "weight_only",
  "reps_only",
  "time",
  "distance",
  "distance_time",
  "quantity_only",
  "quantity_count",
];

const AddExercise = ({
  value,
  onChange,
  onSave,
  onCancel,
  suggestions = [],
  onPickSuggestion = () => {},
}) => {
  const [typeDraft, setTypeDraft] = useState("weight_reps");
  const [showDropdown, setShowDropdown] = useState(false);

  const typeEntry = EXERCISE_TYPES[typeDraft] ?? EXERCISE_TYPES.weight_reps;
  const cfg = typeEntry.display;
  const unitOpts = typeEntry.unitOptions || {};
  const defaults = typeEntry.defaultUnits || {};

  const [quantityUnit, setQuantityUnit] = useState(defaults.quantityUnit);
  const [countUnit, setCountUnit] = useState(defaults.countUnit);

  useEffect(() => {
    // whenever type changes, reset to that type's defaults
    const d = (EXERCISE_TYPES[typeDraft] || {}).defaultUnits || {};
    setQuantityUnit(d.quantityUnit);
    setCountUnit(d.countUnit);
  }, [typeDraft]);

  //dropdown options
  const TYPE_OPTIONS = useMemo(() => {
    return TYPE_ORDER.filter((k) => EXERCISE_TYPES[k]).map((k) => [
      k,
      EXERCISE_TYPES[k].label,
    ]);
  }, []);

  const handleSave = () => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return;

    let units;
    if (typeDraft === "quantity_only") {
      units = { quantityUnit: "qty" };
    } else if (typeDraft === "quantity_count") {
      units = { quantityUnit: "qty", countUnit: "ct" };
    } else {
      units = {
        ...(cfg.showQ && (unitOpts.quantity?.length ?? 0)
          ? { quantityUnit }
          : {}),
        ...(cfg.showC && (unitOpts.count?.length ?? 0) ? { countUnit } : {}),
      };
    }

    onSave?.(trimmed, typeDraft, units);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View>
        {/* Name */}
        <TextInput
          style={styles.input}
          placeholder="Exercise name"
          placeholderTextColor="#888"
          value={value}
          onChangeText={onChange}
          autoFocus
          returnKeyType="done"
          maxLength={30}
          //onSubmitEditing={handleSave}
        />

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {suggestions.map(([eid, meta]) => (
              <Pressable
                key={eid}
                onPress={() => onPickSuggestion(eid)}
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ color: "#ccc" }}>{meta?.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Type dropdown */}
        <Text style={styles.sectionLabel}>Type</Text>
        <Pressable
          onPress={() => setShowDropdown(true)}
          style={styles.dropdownBtn}
        >
          <Text style={styles.dropdownBtnText}>
            {EXERCISE_TYPES[typeDraft]?.label ?? "Choose type"}
          </Text>
        </Pressable>

        <Modal
          visible={showDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDropdown(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDropdown(false)}
          >
            <View style={styles.dropdownMenu}>
              <FlatList
                data={TYPE_OPTIONS}
                keyExtractor={(item) => item[0]}
                renderItem={({ item: [key, label] }) => (
                  <Pressable
                    onPress={() => {
                      setTypeDraft(key);
                      setShowDropdown(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      typeDraft === key && styles.dropdownItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        typeDraft === key && styles.dropdownItemTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </Pressable>
        </Modal>

        {/* Unit chips — only for fields that exist & have selectable options */}
        {cfg.showQ && (unitOpts.quantity?.length ?? 0) > 0 && (
          <>
            <Text style={styles.sectionLabel}>{cfg.qLabel} unit</Text>
            <View style={styles.rowWrap}>
              {unitOpts.quantity.map((u) => (
                <Chip
                  key={u}
                  selected={quantityUnit === u}
                  onPress={() => setQuantityUnit(u)}
                  label={u}
                />
              ))}
            </View>
          </>
        )}

        {cfg.showC && (unitOpts.count?.length ?? 0) > 0 && (
          <>
            <Text style={styles.sectionLabel}>{cfg.cLabel} unit</Text>
            <View style={styles.rowWrap}>
              {unitOpts.count.map((u) => (
                <Chip
                  key={u}
                  selected={countUnit === u}
                  onPress={() => setCountUnit(u)}
                  label={u}
                />
              ))}
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.actionBtn,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.actionBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={handleSave}
          >
            <Text style={styles.actionBtnText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

function Chip({ selected, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? "white" : "#333", backgroundColor: "#111" },
      ]}
    >
      <Text style={{ color: "white" }}>{label}</Text>
    </Pressable>
  );
}

export default AddExercise;

const styles = StyleSheet.create({
  input: {
    marginTop: 12,
    backgroundColor: "#111",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  sectionLabel: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 12, marginBottom: 8 },
  actionBtn: {
    backgroundColor: "#222",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  actionBtnText: { color: "white", fontWeight: "600" },

  dropdownBtn: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dropdownBtnText: { color: "white", fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownMenu: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    width: "80%",
    maxHeight: "50%",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  dropdownItemActive: { backgroundColor: "#222" },
  dropdownItemText: { color: "#ccc" },
  dropdownItemTextActive: { color: "#fff", fontWeight: "700" },
});
