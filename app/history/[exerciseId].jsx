import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Calendar } from "react-native-calendars";
import {
  summarizeSession,
  formatPrettyDate,
  convertWeight,
  formatNum,
} from "../../components/general/metrics";
import { LineChart } from "react-native-gifted-charts";
import { Dimensions } from "react-native";

export default function HistoryScreen() {
  const { name, units, data } = useLocalSearchParams();
  const unitsObj = useMemo(() => {
    try {
      const raw = Array.isArray(units) ? units[0] : units;
      const u =
        typeof raw === "string" ? (raw ? JSON.parse(raw) : {}) : raw || {};
      return {
        qUnit: u.qUnit ?? u.quantityUnit ?? "",
        cUnit: u.cUnit ?? u.countUnit ?? "",
      };
    } catch {
      return { qUnit: "", cUnit: "" };
    }
  }, [units]);

  const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function utcKeyToLocalYMD(iso) {
    //wrong function name but whatever
    return iso;
  }

  const map = useMemo(() => {
    try {
      return JSON.parse(data || "{}");
    } catch {
      return {};
    }
  }, [data]);

  // CALENDAR-CALENDAR-CALENDAR-CALENDAR-CALENDAR-CALENDAR-CALENDAR
  const doneSet = useMemo(() => {
    const s = new Set();
    for (const iso of Object.keys(map || {})) {
      const ymd = utcKeyToLocalYMD(iso);
      const entry = map[iso];
      if ((entry?.sets?.length ?? 0) > 0 || entry?.notes) s.add(ymd);
    }
    return s;
  }, [map]);

  function hasContent(entry) {
    const hasSets = (entry?.sets?.length ?? 0) > 0;
    const hasNotes = (entry?.notes?.trim?.() ?? "") !== "";
    return hasSets || hasNotes;
  }

  const items = useMemo(() => {
    return Object.entries(map || {})
      .filter(([, entry]) => hasContent(entry))
      .map(([iso, entry]) => ({
        ymd: utcKeyToLocalYMD(iso),
        entry,
      }))
      .sort((a, b) => (a.ymd < b.ymd ? 1 : -1));
  }, [map]);

  //CHART--CHART--CHART--CHART--CHART--CHART--CHART--CHART--CHART--CHART
  function localNoonFromYMD(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0); // local tz, noon to avoid DST edges
  }
  const [range, setRange] = useState("30d"); // "30d", "12w", "1y", "all"

  const baseSeries = useMemo(() => {
    const points = [];

    for (const [iso, entry] of Object.entries(map || {})) {
      const sets = entry?.sets || [];
      if (!sets.length) continue;

      const ymd = utcKeyToLocalYMD(iso); // "YYYY-MM-DD"  USER_TZ
      const maxQty = Math.max(
        ...sets.map((s) =>
          formatNum(
            convertWeight(s.quantity, s.quantityUnitUsed, unitsObj.qUnit)
          )
        )
      );
      const date = localNoonFromYMD(ymd);

      // label for x-axis (M/D)
      const label = date.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
      });

      points.push({
        value: maxQty,
        label,
        date,
        dataPointText: String(maxQty), // show value above dot
      });
    }

    // sort by time ascending for the chart
    points.sort((a, b) => a.date - b.date);
    return points;
  }, [map]);

  //30DAYS-30DAYS-30DAYS-30DAYS-30DAYS-30DAYS-30DAYS-30DAYS
  function daysAgoDate(n) {
    const d = new Date();

    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  }
  const series30 = useMemo(() => {
    const cutoff = daysAgoDate(30);
    return baseSeries.filter((p) => p.date >= cutoff);
  }, [baseSeries]);

  //12WEEK-12WEEK-12WEEK-12WEEK-12WEEK-12WEEK-12WEEK-12WEEK
  function startOfWeek(d) {
    const x = new Date(d);
    x.setHours(12, 0, 0, 0); // stable noon
    const day = x.getDay(); // 0=Sun..6=Sat
    const offset = day === 0 ? 6 : day - 1; // Mon=0, Sun=6
    x.setDate(x.getDate() - offset);
    x.setHours(12, 0, 0, 0);
    return x;
  }
  const ymdLocal = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const series12w = useMemo(() => {
    const byWeek = new Map(); // key: YMD, val: { date, max }
    for (const p of baseSeries) {
      const ws = startOfWeek(p.date);
      const key = ymdLocal(ws);
      const cur = byWeek.get(key);
      if (!cur || p.value > cur.max)
        byWeek.set(key, { date: ws, max: p.value });
    }
    // to array, sort, map to chart points
    const weekly = Array.from(byWeek.values())
      .sort((a, b) => a.date - b.date)
      .map(({ date, max }) => ({
        value: max,
        label: date.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }), // week start label
        date,
        dataPointText: String(max),
      }));
    // keep last 12 weeks
    return weekly.slice(-12);
  }, [baseSeries]);

  //1YEAR-1YEAR-1YEAR-1YEAR-1YEAR-1YEAR-1YEAR-1YEAR-1YEAR-1YEAR
  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0);
  }

  const series1y = useMemo(() => {
    const byMonth = new Map(); // key = YYYY-MM, value = { date, max }

    for (const p of baseSeries) {
      const ms = startOfMonth(p.date);
      const key = ymdLocal(ms);
      const cur = byMonth.get(key);
      if (!cur || p.value > cur.max) {
        byMonth.set(key, { date: ms, max: p.value });
      }
    }

    return Array.from(byMonth.values())
      .sort((a, b) => a.date - b.date)
      .slice(-12) // last 12 months
      .map(({ date, max }) => ({
        value: max,
        label: date.toLocaleDateString("en-US", { month: "short" }),
        date,
        dataPointText: String(max),
      }));
  }, [baseSeries]);

  //ALL TIME-ALL TIME-ALL TIME-ALL TIME-ALL TIME-ALL TIME
  const fmtMDnum = (d) =>
    d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });

  const fmtMDnumMaybeYear = (d, prevD) => {
    const base = fmtMDnum(d);
    if (!prevD || d.getFullYear() !== prevD.getFullYear()) {
      return `0${base} '${String(d.getFullYear()).slice(-2)} `; // e.g. 7/6 '25
    }
    return base;
  };

  const seriesAll = useMemo(() => {
    return baseSeries.map((p, i, arr) => ({
      ...p,
      label: fmtMDnumMaybeYear(p.date, arr[i - 1]?.date),
    }));
  }, [baseSeries]);

  //CHART DATA--CHART DATA--CHART DATA--CHART DATA--CHART DATA
  const chartData =
    range === "30d"
      ? series30
      : range === "12w"
      ? series12w
      : range === "1y"
      ? series1y
      : seriesAll;

  const [mode, setMode] = useState("chart");
  const chartW = Dimensions.get("window").width - 32;
  const LEFT_RIGHT_GUTTER = 24;
  const MIN_POINT_SPACING = 36;
  const values = chartData
    .map((d) => d.value)
    .filter((v) => Number.isFinite(v));

  const pointSpacing =
    chartData.length > 1
      ? Math.max(
          MIN_POINT_SPACING,
          (chartW - LEFT_RIGHT_GUTTER * 1) / (chartData.length - 1)
        )
      : MIN_POINT_SPACING;

  /* const contentW = Math.max(
  chartW, 
    LEFT_RIGHT_GUTTER +
      Math.max(chartData.length - 1, 0) * pointSpacing +
      LEFT_RIGHT_GUTTER;
   ); */

  const yMax = values.length ? Math.max(...values, 0) : 0;
  const yMin = Math.min(...values);
  const yRange = yMax - yMin;
  const pad = Math.max(5, Math.ceil(yRange * 0.1));
  const xHeadroom = Math.max(5, Math.ceil(yMax * 0.1));
  const xMaxValue = yMax + xHeadroom;

  const yHeadroom = Math.max(5, Math.ceil(yMax * 0.1)); // ~10% breathing room
  const yMaxValue = yMax + yHeadroom;

  const isSingle = chartData.length === 1;
  const centerPad = Math.floor(chartW / 2);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{name || "History"}</Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>No history yet.</Text>
      ) : (
        <>
          {/* ANALYTICS ANALYTCIS ANALYTCIS ANALYTCIS */}
          <View>
            {/* mode switch */}
            <View style={styles.switchRow}>
              <Pressable
                onPress={() => setMode("chart")}
                style={[
                  styles.switchBtn,
                  mode === "chart" && styles.switchBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.switchText,
                    mode === "chart" && styles.switchTextActive,
                  ]}
                >
                  Chart
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("calendar")}
                style={[
                  styles.switchBtn,
                  mode === "calendar" && styles.switchBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.switchText,
                    mode === "calendar" && styles.switchTextActive,
                  ]}
                >
                  Calendar
                </Text>
              </Pressable>
            </View>

            {mode === "chart" ? (
              <View>
                <View style={styles.chartCard}>
                  <LineChart
                    data={chartData}
                    //width={10000} //
                    spacing={range == "all" ? pointSpacing + 11 : pointSpacing} //
                    initialSpacing={isSingle ? centerPad : LEFT_RIGHT_GUTTER}
                    endSpacing={isSingle ? centerPad : LEFT_RIGHT_GUTTER} //
                    adjustToWidth={false} //
                    height={269}
                    thickness={2}
                    // maxValue={yMaxValue}
                    color="#fff"
                    dataPointsColor="#fff"
                    dataPointsWidth={6}
                    curved={false}
                    // faint grid
                    showRules
                    rulesType="solid"
                    rulesColor="#222"
                    rulesThickness={1}
                    yAxisThickness={1}
                    xAxisThickness={1}
                    yAxisColor={"#222"}
                    xAxisColor={"#222"}
                    yAxisLabelWidth={42}
                    showVerticalLines
                    verticalLinesColor="#222"
                    verticalLinesThickness={1}
                    //verticalLinesSpacing={100}
                    // date labels along x
                    xAxisLabelTextStyle={{ color: "#aaa", fontSize: 10 }}
                    yAxisTextStyle={{ color: "#aaa", fontSize: 10 }}
                    yAxisLabelSuffix={` ${unitsObj.qUnit || ""}`}
                    // clean background
                    backgroundColor="#000"
                    //
                    //maxValue={yMaxValue}
                    yAxisOffset={Math.max(0, yMin - pad)}
                    //maxValue={maxValue}
                    noOfSections={6}
                    showDataPointText
                    dataPointTextStyle={{
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                    textShiftY={-8}
                  />
                </View>

                <View style={styles.rangeRow}>
                  {[
                    { key: "30d", label: "30D" },
                    { key: "12w", label: "12W" },
                    { key: "1y", label: "1Y" },
                    { key: "all", label: "All" },
                  ].map((opt) => (
                    <Pressable
                      key={opt.key}
                      onPress={() => setRange(opt.key)}
                      style={[
                        styles.rangeBtn,
                        range === opt.key && styles.rangeBtnActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: range === opt.key }}
                    >
                      <Text
                        style={[
                          styles.rangeBtnText,
                          range === opt.key && styles.rangeBtnTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.calendarWrapper}>
                <Calendar
                  firstDay={1}
                  dayComponent={({ date, state }) => {
                    const ymd = date.dateString;
                    const done = doneSet.has(ymd);
                    return (
                      <View style={[styles.dayCell, done && styles.dayDone]}>
                        <Text
                          style={[
                            styles.dayText,
                            state === "disabled" && styles.dayTextDisabled,
                          ]}
                        >
                          {date.day}
                        </Text>
                      </View>
                    );
                  }}
                  theme={{
                    backgroundColor: "#000",
                    calendarBackground: "#000",
                    dayTextColor: "#fff",
                    monthTextColor: "#fff",
                    textDisabledColor: "#555",
                    todayTextColor: "#e0e1e1",
                    arrowColor: "#fff",
                  }}
                />
              </View>
            )}
          </View>

          {/* HISTORY HISTORY HISTORY HISTORY HISTORY */}
          {(() => {
            const rows = [];
            let lastYear = null;

            for (const { ymd, entry } of items) {
              const year = ymd.slice(0, 4);
              if (year !== lastYear) {
                rows.push(
                  <Text key={`year-${year}`} style={styles.yearHeader}>
                    {year}
                  </Text>
                );
                lastYear = year;
              }

              const summary = summarizeSession(entry.sets, unitsObj);
              rows.push(
                <View key={ymd} style={styles.row}>
                  <Text style={styles.rowDate}>{formatPrettyDate(ymd)}</Text>
                  <Text style={styles.rowSummary}>{summary || "—"}</Text>
                  {!!entry.notes && (
                    <Text style={styles.rowNotes}>{entry.notes}</Text>
                  )}
                </View>
              );
            }

            return rows;
          })()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 42,
    paddingHorizontal: 0,
  },
  container: { paddingHorizontal: 8, paddingBottom: 24 },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 12,
  },
  empty: { color: "#888" },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "#222" },
  rowDate: { color: "#fff", fontWeight: "700" },
  rowSummary: { color: "#bbb", marginTop: 4 },
  rowNotes: { color: "#888", marginTop: 4, fontStyle: "italic" },
  yearHeader: {
    color: "#9aa0a6",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  dayCell: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayDone: {
    borderColor: "#fff", //#a44322
    borderWidth: 2,
  },
  dayText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  dayTextDisabled: { color: "#555" },

  calendarWrapper: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },

  chartCard: {
    backgroundColor: "#0", //#0a0a0a
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 0,
    marginBottom: 16,
    overflow: "hidden",
    paddingTop: 12,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  rangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#111",
  },
  rangeBtnActive: {
    borderColor: "#888",
    backgroundColor: "#1a1a1a",
  },
  rangeBtnText: { color: "#bbb", fontWeight: "600" },
  rangeBtnTextActive: { color: "#fff" },

  tooltip: {
    backgroundColor: "#111",
    borderColor: "#333",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tooltipTitle: { color: "#bbb", fontSize: 12, marginBottom: 2 },
  tooltipValue: { color: "#fff", fontWeight: "700" },

  switchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    // alignSelf: "center",
  },
  switchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#111",
  },
  switchBtnActive: {
    borderColor: "#888",
    backgroundColor: "#1a1a1a",
  },
  switchText: { color: "#bbb", fontWeight: "600" },
  switchTextActive: { color: "#fff" },
});
