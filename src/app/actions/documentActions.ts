"use server";

/* eslint-disable @typescript-eslint/no-explicit-any -- generated_documents is not present in this app's generated Supabase type yet. */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_DOCUMENT_PUBLISHER,
  DOCUMENT_TYPES,
  initialEditableContent,
  isDocumentType,
} from "@/lib/documents";

const documentFields = [
  "title", "className", "departureTime", "arrivalTime", "clothing", "meal",
  "transportation", "emergencyContact", "teacherNotes", "guardianNotes",
  "paymentTerms", "validUntil", "notes", "educationPurpose", "educationAudience",
  "educationContent", "practiceMethod", "checklist",
] as const;

type ReservationOptionRow = {
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_option: { name: string; price: number } | null;
};

export async function createDocumentDraftAction(formData: FormData) {
  const reservationId = String(formData.get("reservationId") || "");
  const documentType = String(formData.get("documentType") || "");
  if (!reservationId || !isDocumentType(documentType)) throw new Error("INVALID_DOCUMENT_REQUEST");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/mypage/reservations/${reservationId}`);

  const db = supabase as any;
  const { data: reservation, error } = await db.from("reservations").select(`
    *,
    product:products!inner(
      *,
      business:businesses(id,name,business_number,representative,contact_name,contact_phone,address,address_detail),
      business_owner:business_owners(id,name,business_number,representative,contact_name,contact_phone,address,address_detail)
    ),
    daycare:daycares(id,name,representative,contact_name,contact_phone,address,address_detail,license_number),
    payments(id,pg_provider,pg_tid,amount,status,payment_method,paid_at,receipt_url),
    refunds(id,original_amount,refund_amount,reason,status,refunded_at),
    reservation_options(quantity,unit_price,subtotal,product_option:product_options(name,price))
  `).eq("id", reservationId).eq("daycare_id", user.id).maybeSingle();
  if (error || !reservation) throw new Error("RESERVATION_NOT_FOUND_OR_FORBIDDEN");

  const { data: publisherSetting } = await db.from("site_settings").select("value").eq("key", "document_publisher").maybeSingle();
  let configuredPublisher: Record<string, unknown> = {};
  if (publisherSetting?.value && typeof publisherSetting.value === "object") {
    configuredPublisher = publisherSetting.value as Record<string, unknown>;
  } else if (typeof publisherSetting?.value === "string") {
    try {
      const parsed = JSON.parse(publisherSetting.value);
      if (parsed && typeof parsed === "object") configuredPublisher = parsed as Record<string, unknown>;
    } catch {
      configuredPublisher = {};
    }
  }
  const publisher = { ...DEFAULT_DOCUMENT_PUBLISHER, ...configuredPublisher };
  const product = reservation.product || {};
  const business = product.business || product.business_owner || null;
  const payment = Array.isArray(reservation.payments) ? reservation.payments[0] : reservation.payments;
  const options = ((reservation.reservation_options || []) as ReservationOptionRow[]).map((item) => ({
    name: item.product_option?.name || "추가 옵션",
    quantity: item.quantity || 1,
    unitPrice: item.unit_price ?? item.product_option?.price ?? 0,
    amount: item.subtotal ?? 0,
  }));
  const snapshot = {
    reservationId: reservation.id,
    reservationNumber: reservation.reservation_number,
    reservedDate: reservation.reserved_date,
    reservedTime: reservation.reserved_time,
    participantCount: reservation.participant_count,
    unitPrice: product.sale_price || 0,
    originalUnitPrice: product.original_price || product.sale_price || 0,
    baseAmount: (product.sale_price || 0) * reservation.participant_count,
    optionItems: options,
    optionAmount: options.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0),
    discountAmount: Math.max(0, ((product.original_price || product.sale_price || 0) - (product.sale_price || 0)) * reservation.participant_count),
    supplyAmount: reservation.total_amount,
    taxApplied: false,
    taxAmount: 0,
    totalAmount: reservation.total_amount,
    payment: payment || null,
    refunds: reservation.refunds || [],
    productName: product.name,
    venueName: business?.name,
    venueAddress: [product.address || business?.address, product.address_detail || business?.address_detail].filter(Boolean).join(" "),
    provider: business,
    daycare: reservation.daycare,
    preparation: product.materials,
    teacherSupplies: product.teacher_supplies,
    childSupplies: product.child_supplies,
    providedSupplies: product.provided_supplies,
    rainOperation: product.operates_in_rain,
    rainAlternative: product.rain_alternative,
    fieldContact: product.field_contact || business?.contact_phone,
    clothingGuidance: product.clothing_guidance,
    mealGuidance: product.meal_guidance,
    transportationGuidance: product.transportation_guidance,
    teacherNotes: product.teacher_notes,
    guardianNotes: product.guardian_notes,
    refundNotice: product.refund_notice,
    createdFromReservationAt: new Date().toISOString(),
  };

  const { data: document, error: insertError } = await db.from("generated_documents").insert({
    document_number: "",
    document_type: documentType,
    title: DOCUMENT_TYPES[documentType],
    reservation_id: reservation.id,
    daycare_id: user.id,
    business_owner_id: reservation.business_owner_id,
    business_id: reservation.business_id,
    reservation_snapshot: snapshot,
    publisher_snapshot: publisher,
    editable_content: initialEditableContent(documentType, snapshot),
  }).select("id").single();
  if (insertError) throw new Error(insertError.message);
  redirect(`/mypage/documents/${document.id}`);
}

export async function saveDocumentDraftAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const content = Object.fromEntries(documentFields.map((field) => [field, String(formData.get(field) || "")]));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await (supabase as any).from("generated_documents").update({ editable_content: content }).eq("id", id).eq("daycare_id", user.id).eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidatePath(`/mypage/documents/${id}`);
}

export async function issueDocumentAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const content = Object.fromEntries(documentFields.map((field) => [field, String(formData.get(field) || "")]));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await (supabase as any).from("generated_documents").update({
    editable_content: content,
    status: "issued",
  }).eq("id", id).eq("daycare_id", user.id).eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidatePath(`/mypage/documents/${id}`);
}
