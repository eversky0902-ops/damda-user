import {
  Accessibility,
  Armchair,
  Baby,
  Bus,
  CarFront,
  CloudRain,
  CookingPot,
  Droplets,
  MapPin,
  Milk,
  Phone,
  Sandwich,
  School,
  Shirt,
  Toilet,
  Trees,
  Utensils,
  Users,
} from "lucide-react";
import type { Product } from "@/services/productService";

const YES_NO = (value: boolean | null) => value === null ? null : value ? "가능" : "불가";
const ENVIRONMENT = { indoor: "실내", outdoor: "실외", mixed: "실내·실외" } as const;

const FACILITY_SERVICE_OPTIONS = [
  { code: "large_bus_parking", label: "대형버스 주차 가능", icon: Bus },
  { code: "lunchbox_allowed", label: "도시락 지참", icon: Sandwich },
  { code: "meal_space", label: "식사 공간", icon: Utensils },
  { code: "restroom", label: "화장실", icon: Toilet },
  { code: "indoor_waiting_area", label: "실내 대기실", icon: Armchair },
  { code: "operates_in_rain", label: "우천 시 진행", icon: CloudRain },
  { code: "nursing_room", label: "수유실", icon: Milk },
  { code: "diaper_changing_station", label: "기저귀 교환대", icon: Baby },
  { code: "passenger_car_parking", label: "승용차 주차", icon: CarFront },
  { code: "toddler_lounge", label: "유아 휴게실", icon: Users },
  { code: "drinking_water", label: "식수대", icon: Droplets },
  { code: "outdoor_activity_area", label: "야외 활동장", icon: Trees },
] as const;

export function TeacherPracticalInfo({ product }: { product: Product }) {
  const facilityServices = product.facility_services ?? {};
  // 새 시설·서비스 체크값이 있으면, 아래 상품별 레거시 항목과 중복 노출하지 않습니다.
  // 명시적으로 "불가(false)"만 저장된 경우도 체크값이 존재하는 것으로 취급합니다.
  const hasFacilityServices = Object.values(facilityServices).some((value) => typeof value === "boolean");
  const legacyFacilityServices: Partial<Record<(typeof FACILITY_SERVICE_OPTIONS)[number]["code"], boolean | null>> = {
    large_bus_parking: product.bus_parking_available,
    lunchbox_allowed: product.lunchbox_allowed,
    meal_space: product.meal_available,
    restroom: product.child_restroom_available,
    operates_in_rain: product.operates_in_rain,
  };
  const facilityRows = FACILITY_SERVICE_OPTIONS.map(({ code, label, icon }) => ({
    icon,
    label,
    available: typeof facilityServices[code] === "boolean" ? facilityServices[code] : Boolean(legacyFacilityServices[code]),
  }));
  const age = product.recommended_age_min != null || product.recommended_age_max != null
    ? `${product.recommended_age_min ?? ""}${product.recommended_age_min != null && product.recommended_age_max != null ? "~" : ""}${product.recommended_age_max ?? ""}세`
    : product.minimum_age != null ? `${product.minimum_age}세 이상` : null;
  const rows = ([
    { icon: School, label: "체험 환경", value: product.experience_environment ? ENVIRONMENT[product.experience_environment] : null },
    { icon: Users, label: "체험 가능 연령", value: age },
    { icon: CloudRain, label: "우천 시 운영", value: hasFacilityServices ? null : YES_NO(product.operates_in_rain) },
    { icon: CloudRain, label: "우천 대체 프로그램", value: product.rain_alternative },
    { icon: Bus, label: "버스 진입", value: YES_NO(product.bus_accessible) },
    { icon: Bus, label: "버스 주차", value: hasFacilityServices ? null : YES_NO(product.bus_parking_available) },
    { icon: Bus, label: "승하차 공간", value: YES_NO(product.dropoff_space_available) },
    { icon: CookingPot, label: "현장 식사", value: hasFacilityServices ? null : YES_NO(product.meal_available) },
    { icon: Sandwich, label: "도시락 지참", value: hasFacilityServices ? null : YES_NO(product.lunchbox_allowed) },
    { icon: Toilet, label: "유아용 화장실", value: hasFacilityServices ? null : YES_NO(product.child_restroom_available) },
    { icon: Toilet, label: "화장실 안내", value: product.restroom_info },
    { icon: Accessibility, label: "접근성", value: product.accessibility_info },
    { icon: MapPin, label: "집결 장소", value: product.meeting_point },
    { icon: Phone, label: "현장 연락처", value: product.field_contact },
    { icon: Shirt, label: "복장 안내", value: product.clothing_guidance },
    { icon: Bus, label: "이동 안내", value: product.transportation_guidance },
  ] as Array<{ icon: typeof School; label: string; value: string | null }>).filter(
    (item): item is { icon: typeof School; label: string; value: string } => Boolean(item.value)
  );
  const notes = [
    ["교사 준비물", product.teacher_supplies],
    ["원아 준비물", product.child_supplies],
    ["업체 제공 준비물", product.provided_supplies],
    ["식사·간식 안내", product.meal_guidance],
    ["교사 안내사항", product.teacher_notes],
    ["보호자 안내사항", product.guardian_notes],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  if (!rows.length && !facilityRows.length && !notes.length) return null;

  return (
    <section className="rounded-2xl border border-damda-teal/20 bg-damda-teal-light/30 p-4 sm:p-6" aria-labelledby="teacher-practical-info-title">
      <h3 id="teacher-practical-info-title" className="text-lg font-bold text-gray-950">선생님이 확인할 체험 실무 정보</h3>
      <p className="mt-1 text-sm text-gray-600">단체 체험 준비에 필요한 내용을 항목별로 확인하세요.</p>
      {rows.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ icon: Icon, label, value }) => <div key={label} className="rounded-xl bg-white p-3 shadow-sm"><span className="flex items-center gap-2 text-xs font-medium text-gray-500"><Icon className="h-4 w-4 text-damda-teal" />{label}</span><strong className="mt-1.5 block whitespace-pre-line text-sm text-gray-900">{value}</strong></div>)}
      </div>}
      {facilityRows.length > 0 && <div className="mt-4"><h4 className="text-sm font-semibold text-gray-900">시설·서비스</h4><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{facilityRows.map(({ icon: Icon, label, available }) => <div key={label} className={`rounded-xl border p-3 text-center transition ${available ? "border-damda-teal/40 bg-damda-teal-light/50" : "border-gray-200 bg-white"}`}><Icon className={`mx-auto h-6 w-6 ${available ? "text-damda-teal" : "text-gray-300"}`} aria-hidden="true" /><p className={`mt-2 text-xs font-bold leading-5 ${available ? "text-gray-900" : "text-gray-400"}`}>{label}</p><p className={`mt-1 text-[11px] font-semibold ${available ? "text-damda-teal-dark" : "text-gray-400"}`}>{available ? "가능" : "불가"}</p></div>)}</div></div>}
      {notes.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{notes.map(([label, value]) => <div key={label} className="rounded-xl border border-gray-100 bg-white p-4"><h4 className="text-sm font-semibold text-gray-900">{label}</h4><p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{value}</p></div>)}</div>}
    </section>
  );
}
