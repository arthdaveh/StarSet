// general/exerciseTypes.js
export const EXERCISE_TYPES = {
  weight_reps: {
    label: "Weight × Reps",
    display: { showQ: true, showC: true, qLabel: "Weight", cLabel: "Reps" },
    unitOptions: { quantity: ["kg", "lbs"], count: [] },
    defaultUnits: { quantityUnit: "kg" },
  },
  weight_only: {
    label: "Weight",
    display: { showQ: true, showC: false, qLabel: "Weight", cLabel: "—" },
    unitOptions: { quantity: ["kg", "lbs"], count: [] },
    defaultUnits: { quantityUnit: "kg" },
  },
  reps_only: {
    label: "Reps",
    display: { showQ: true, showC: false, qLabel: "Reps", cLabel: "-" },
    unitOptions: { quantity: [], count: [] },
    defaultUnits: {},
  },
  time: {
    label: "Time",
    display: { showQ: true, showC: false, qLabel: "Time", cLabel: "—" },
    unitOptions: { quantity: ["s", "min"], count: [] },
    defaultUnits: { quantityUnit: "s" },
  },
  distance: {
    label: "Distance",
    display: { showQ: true, showC: false, qLabel: "Distance", cLabel: "—" },
    unitOptions: { quantity: ["m", "km", "mi"], count: [] },
    defaultUnits: { quantityUnit: "km" },
  },
  distance_time: {
    label: "Distance × Time",
    display: { showQ: true, showC: true, qLabel: "Distance", cLabel: "Time" },
    unitOptions: { quantity: ["m", "km", "mi"], count: ["s", "min"] },
    defaultUnits: { quantityUnit: "km", countUnit: "min" },
  },
  quantity_only: {
    label: "Quantity (generic)",
    display: { showQ: true, showC: false, qLabel: "Quantity", cLabel: "—" },
    unitOptions: { quantity: [], count: [] },
    defaultUnits: { quantityUnit: "qty" },
  },
  quantity_count: {
    label: "Quantity × Count (generic)",
    display: { showQ: true, showC: true, qLabel: "Quantity", cLabel: "Count" },
    unitOptions: { quantity: [], count: [] },
    defaultUnits: { quantityUnit: "qty", countUnit: "ct" },
  },
};
