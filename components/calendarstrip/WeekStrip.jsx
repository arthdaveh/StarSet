import React, { useState, useMemo } from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import WeekPills from "./WeekPills";
import WeekPager from "./WeekPager";
import WeekSwiper from "./WeekSwiper";

const SCREEN_W = Dimensions.get("window").width;

// utils nwidfrwdjle fvjwervow my head hurts
function parseLocalYMD(ymd) {
  const m = ymd?.match?.(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
function formatYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function WeekStrip({ selectedDate, onChange }) {
  const { width } = useWindowDimensions();
  const pageW = width - 24;

  const [anchorDateYMD, setAnchorDateYMD] = useState(() => {
    const sel = parseLocalYMD(selectedDate) ?? new Date();
    return formatYMD(startOfWeekMonday(sel));
  });

  const goPrevWeek = () => {
    const base = parseLocalYMD(anchorDateYMD) ?? new Date();
    const moved = addDays(base, -7);
    setAnchorDateYMD(formatYMD(startOfWeekMonday(moved)));
  };

  const goNextWeek = () => {
    const base = parseLocalYMD(anchorDateYMD) ?? new Date();
    const moved = addDays(base, +7);
    setAnchorDateYMD(formatYMD(startOfWeekMonday(moved)));
  };

  const handleChange = (nextYMD) => {
    onChange?.(nextYMD);
    const monday = startOfWeekMonday(parseLocalYMD(nextYMD));
    setAnchorDateYMD(formatYMD(monday));
  };

  return (
    // <View style={{ width: pageW, alignSelf: "center" }}>
    <View style={{ marginHorizontal: -12 }}>
      <WeekSwiper
        selectedDate={selectedDate}
        onChange={handleChange}
        pageWidth={pageW}
      />
      {/* <WeekPager selectedDate={selectedDate} onChange={handleChange} /> */}
      {/* <WeekPills 
        selectedDate={selectedDate}
        onChange={handleChange}
        anchorDateYMD={selectedDate}
      />
      */}

      {/* <View style={styles.controls}> 
        <Pressable style={styles.btn} onPress={goPrevWeek}>
          <Text style={styles.btnText}>‹ Prev</Text>
        </Pressable>

        <Pressable style={styles.btn} onPress={goNextWeek}>
          <Text style={styles.btnText}>Next ›</Text>
        </Pressable>
        
      </View>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
    paddingHorizontal: 4,
  },
  btn: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1a1a1a",
  },
  btnText: { color: "white", fontWeight: "600" },
});
