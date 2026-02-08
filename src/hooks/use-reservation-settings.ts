"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface ReservationSettings {
  reservationAdvanceDays: number;
  minReservationNotice: number;
}

const DEFAULT_SETTINGS: ReservationSettings = {
  reservationAdvanceDays: 90,
  minReservationNotice: 0,
};

async function fetchReservationSettings(): Promise<ReservationSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["reservation_advance_days", "min_reservation_notice"]);

  if (!data) return DEFAULT_SETTINGS;

  const settings: Record<string, number> = {};
  for (const row of data) {
    try {
      settings[row.key] =
        typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    } catch {
      // ignore parse errors
    }
  }

  return {
    reservationAdvanceDays: settings.reservation_advance_days || DEFAULT_SETTINGS.reservationAdvanceDays,
    minReservationNotice: settings.min_reservation_notice || DEFAULT_SETTINGS.minReservationNotice,
  };
}

export function useReservationSettings() {
  const { data } = useQuery({
    queryKey: ["reservationSettings"],
    queryFn: fetchReservationSettings,
    staleTime: 1000 * 60 * 30, // 30분 캐시
  });

  return data || DEFAULT_SETTINGS;
}
