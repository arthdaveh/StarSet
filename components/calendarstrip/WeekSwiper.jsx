import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Dimensions } from "react-native";
import Swiper from "react-native-swiper";
import WeekPills from "./WeekPills";

const SCREEN_W = Dimensions.get("window").width;

function parseYMD(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}
function fmtYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function mondayOf(date) {
  const x = new Date(date);
  x.setHours(12, 0, 0, 0);
  const day = x.getDay();
  const offset = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - offset);
  x.setHours(12, 0, 0, 0);
  return x;
}
function addDays(ymd, deltaDays) {
  const d = parseYMD(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + deltaDays);
  return fmtYMD(d);
}

export default function WeekSwiper({ selectedDate, onChange, pageWidth }) {
  const swiperRef = useRef(null);
  const snappingRef = useRef(false);

  const initialMonday = useMemo(() => {
    const d = parseYMD(selectedDate);
    return d ? fmtYMD(mondayOf(d)) : selectedDate;
  }, [selectedDate]);

  const [anchorMondayYMD, setAnchorMondayYMD] = useState(initialMonday);

  //if selectedDate changes jumps back to today, and week is different, then update anchor and jump back to this week.
  useEffect(() => {
    const d = parseYMD(selectedDate);
    if (!d) return;
    const monday = fmtYMD(mondayOf(d));
    if (monday !== anchorMondayYMD) {
      setAnchorMondayYMD(monday);
      // recenter safely
      setTimeout(() => swiperRef.current?.scrollTo?.(1, false), 0);
    }
  }, [selectedDate]);

  const pages = useMemo(() => [-1, 0, 1], []);

  const handleIndexChanged = (ind) => {
    if (snappingRef.current) return;
    if (ind === 1) return;

    const dir = ind - 1; // 0->-1, 2->+1
    snappingRef.current = true;

    setAnchorMondayYMD((prev) => addDays(prev, dir * 7));

    // snap back to middle after state update starts
    setTimeout(() => {
      swiperRef.current?.scrollTo?.(1, false);
      snappingRef.current = false;
    }, 10);
  };

  return (
    <View style={{ height: 120, width: SCREEN_W }}>
      <Swiper
        ref={swiperRef}
        index={1}
        loop={false}
        showsPagination={false}
        onIndexChanged={handleIndexChanged}
      >
        {pages.map((off) => {
          const mondayYMD = addDays(anchorMondayYMD, off * 7);
          return (
            <View key={String(off)} style={{ width: SCREEN_W }}>
              <WeekPills
                selectedDate={selectedDate}
                onChange={onChange}
                anchorDateYMD={mondayYMD}
              />
            </View>
          );
        })}
      </Swiper>
    </View>
  );
}
