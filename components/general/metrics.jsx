export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 1 / KG_PER_LB;

export function convertWeight(value, from, to) {
  if (value == null || Number.isNaN(+value) || from === to) return value;
  if (from === "kg" && to === "lbs") return value * LB_PER_KG;
  if (from === "lbs" && to === "kg") return value * KG_PER_LB;
  return value;
}

export function formatNum(n) {
  if (n == null || Number.isNaN(+n)) return "";
  const fixed = Math.round(n * 10) / 10;
  return fixed % 1 === 0 ? fixed.toFixed(0) : fixed.toFixed(1);
}

export function formatPrettyDate(input) {
  let d;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, day] = input.split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(input);
  }
  const base = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const dd = d.getDate();
  const suffix =
    dd % 10 === 1 && dd !== 11
      ? "st"
      : dd % 10 === 2 && dd !== 12
      ? "nd"
      : dd % 10 === 3 && dd !== 13
      ? "rd"
      : "th";
  return base + suffix;
}

export function getDisplayUnits(exId, exercisesById) {
  const meta = exercisesById?.[exId];
  return {
    qUnit: meta?.unit?.quantityUnit || "", // e.g. "kg" | "lbs" | "qty" | ""
    cUnit: meta?.unit?.countUnit || "", // e.g. "min" | "ct" | ""
  };
}

// summarize

export function summarizeSession(sets = [], { qUnit = "", cUnit = "" } = {}) {
  if (!Array.isArray(sets) || sets.length === 0) return "";

  // group consecutive equal-quantity segments
  const segments = []; // [{ labelQ: "90kg", counts:[8,7], seenQ: 90 }]
  for (const s of sets) {
    const hasQ = typeof s.quantity === "number" && !Number.isNaN(s.quantity);
    const hasC = typeof s.count === "number" && !Number.isNaN(s.count);

    // quantity label
    let qLabel = "";
    if (hasQ) {
      const dispQ = convertWeight(
        s.quantity,
        s.quantityUnitUsed ?? qUnit,
        qUnit
      );
      qLabel = qUnit ? `${formatNum(dispQ)}${qUnit}` : `${formatNum(dispQ)}`;
    }


    const showCU = cUnit && cUnit !== "ct" ? cUnit : "";
    const cLabel = `${formatNum(s.count)}${showCU}`;

    const last = segments[segments.length - 1];

    if (hasQ && hasC) {
      if (last && last.labelQ === qLabel) last.counts.push(cLabel);
      else segments.push({ labelQ: qLabel, counts: [cLabel] });
    } else if (hasQ && !hasC) {
      segments.push({ labelQ: qLabel, counts: [] });
    } else if (!hasQ && hasC) {
      segments.push({ labelQ: null, counts: [cLabel] });
    }
  }

  if (!segments.length) return "";

  // render cases:
  // 1) Q + C: "90kg - 8×7 × [95kg - 5]" ...
  // 2) Q only: "30kg × 40kg × 50kg"
  // 3) C only: "12 × 10 × 8"
  const hasAnyCounts = segments.some((s) => s.counts.length > 0);
  const hasAnyQ = segments.some((s) => s.labelQ);

  if (hasAnyQ && hasAnyCounts) {
    const [first, ...rest] = segments;
    let out = `${first.labelQ} - ${first.counts.join("×")}`;
    for (const seg of rest)
      out += ` × [${seg.labelQ} - ${seg.counts.join("×")}]`;
    return out;
  }

  if (hasAnyQ && !hasAnyCounts) {
    // quantity-only list
    return segments.map((s) => s.labelQ).join(" × ");
  }

  // count-only
  return segments
    .map((s) => (Array.isArray(s.counts) ? s.counts.join("×") : ""))
    .join(" × ");
}
