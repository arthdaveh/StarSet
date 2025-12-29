import { View, Text, StyleSheet, Pressable } from "react-native";

export default function WeekPills({ selectedDate, onChange, anchorDateYMD }) {
  const todayStr = formatLocalYYYYMMDD(new Date());
  const isTodaySelected = selectedDate === todayStr;

  function formatLocalYYYYMMDD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Parse "YYYY-MM-DD" as LOCAL date at midnight
  function parseLocalYMD(ymd) {
    if (typeof ymd !== "string") return null;
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]); // local midnight
  }

  const now = new Date();

  // base from selectedDate, parsed as local; fallback to now
  const parsedSelected = parseLocalYMD(selectedDate);
  const parsedAnchor = parseLocalYMD(anchorDateYMD);
  const base = parsedAnchor ?? parsedSelected ?? now;
  //const base = parsedSelected ?? now;

  const headerDate = parsedSelected ?? base;
  const headerText = headerDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  // Start week on Monday, from the (local) base
  const startOfWeek = new Date(base);
  const baseDay = startOfWeek.getDay(); // Sun=0, Mon=1
  const diff = baseDay === 0 ? -6 : 1 - baseDay;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);

    const dateStr = formatLocalYYYYMMDD(d);

    weekDays.push({
      key: i,
      day: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
      date: d.getDate(),
      dateStr,
      isToday: d.toDateString() === now.toDateString(),
      isSelected: dateStr === selectedDate,
    });
  }

  return (
    <View>
      <Pressable
        style={styles.header}
        onPress={() => {
          const today = new Date();
          const y = today.getFullYear();
          const m = String(today.getMonth() + 1).padStart(2, "0");
          const d = String(today.getDate()).padStart(2, "0");
          const todayStr = `${y}-${m}-${d}`;
          onChange?.(todayStr);
        }}
      >
        <Text style={styles.date}>{headerText}</Text>
      </Pressable>

      <View style={styles.weekRowWrapper}>
        {!isTodaySelected && (
          <View pointerEvents="none" style={styles.weekRowOutlineOverlay} />
        )}

        <View style={styles.weekRow}>
          {weekDays.map((d) => (
            <View key={d.key} style={styles.pillSlot}>
              <Pressable
                style={[
                  styles.pill,
                  d.isToday && styles.pillToday,
                  d.isSelected && styles.pillSelected,
                ]}
                onPress={() => {
                  const todayStr = formatLocalYYYYMMDD(new Date());
                  onChange?.(d.dateStr === selectedDate ? todayStr : d.dateStr);
                }}
              >
                <Text style={styles.pillDay}>{d.day}</Text>
                <Text style={styles.pillDate}>{d.date}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const PILL_H = 50;
const PILL_W = 42;
const PILL_RADIUS = PILL_H / 2;

const PILL_GAP = 10;
const ROW_W = 7 * PILL_W + 6 * PILL_GAP;

const styles = StyleSheet.create({
  header: { gap: 6, marginBottom: 16, alignItems: "center", marginTop: 12 },
  date: { color: "white", fontSize: 20, fontWeight: "600" },

  weekRow: {
    flexDirection: "row",

    //marginBottom: 8,
    //justifyContent: "space-between",
    //marginHorizontal: 10,
    //alignSelf: "center",
  },

  weekRowWrapper: {
    position: "relative",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 28,
  },

  weekRowOutlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#666",
  },

  pillSlot: {
    flex: 1,
    alignItems: "center",
  },

  pill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_RADIUS,
    borderWidth: 2,
    borderColor: "#444",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  pillToday: { borderColor: "#e0e1e1", borderWidth: 3 },
  pillSelected: { borderColor: "#959696", borderWidth: 4 },

  // text
  pillDay: { color: "white", fontSize: 12, marginBottom: 2, lineHeight: 14 },
  pillDate: { color: "white", fontSize: 14, fontWeight: "600", lineHeight: 16 },
});
