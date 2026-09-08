import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function formatPhone(phone: string): string {
  return phone.replace(/-/g, "");
}

function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  return time.substring(0, 5);
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

const CHANNEL_ADD_BUTTON = JSON.stringify({"button":[{"type":"AC","name":"채널추가"}]});
const REVIEW_BUTTON = JSON.stringify({"button":[{"name":"지금 리뷰 작성하기","linkType":"WL","linkTypeName":"웹링크","linkMo":"http://withdamda.kr/mypage","linkPc":"http://withdamda.kr/mypage"}]});
// 알리고에서 연락처 문구가 포함된 템플릿을 승인한 뒤에만 사용합니다.
// 미설정 상태에서는 기존 승인 템플릿과 문구를 그대로 전송합니다.
const RESERVATION_COMPLETED_CONTACT_TEMPLATE_CODE = Deno.env.get("ALIGO_RESERVATION_COMPLETED_CONTACT_TEMPLATE_CODE");

async function sendAlimtalk(params: {
  templateCode: string;
  phone: string;
  message: string;
  subject?: string;
  buttons?: string;
}): Promise<{ success: boolean; response: any; error?: string }> {
  try {
    const urlParams: Record<string, string> = {
      apikey: Deno.env.get("ALIGO_API_KEY")!,
      userid: Deno.env.get("ALIGO_USER_ID")!,
      senderkey: Deno.env.get("ALIGO_SENDER_KEY")!,
      tpl_code: params.templateCode,
      sender: Deno.env.get("ALIGO_SENDER_PHONE")!,
      receiver_1: formatPhone(params.phone),
      subject_1: params.subject || "담다 알림",
      message_1: params.message,
    };

    if (params.buttons) {
      urlParams.button_1 = params.buttons;
    }

    const body = new URLSearchParams(urlParams).toString();

    const { data, error } = await supabase.rpc("send_alimtalk_http", {
      p_body: body,
    });

    if (error) {
      return { success: false, response: null, error: error.message };
    }

    const result = data?.body || data;
    if (result.code === 0) {
      return { success: true, response: result };
    } else {
      return { success: false, response: result, error: result.message };
    }
  } catch (error) {
    return { success: false, response: null, error: (error as Error).message };
  }
}

async function sendAndLog(params: {
  notificationType: string;
  templateCode: string;
  recipientType: string;
  recipientId: string | null;
  phone: string;
  message: string;
  variables: Record<string, any>;
  referenceType: string | null;
  referenceId: string | null;
  subject?: string;
  testPhone?: string;
  buttons?: string;
}) {
  const targetPhone = params.testPhone || params.phone;
  if (params.notificationType === "reservation_completed" || params.notificationType === "new_reservation") {
    if (params.testPhone) throw new Error("Payment notifications cannot override recipients");
    const { data: claimed, error } = await supabase.rpc("claim_payment_notification", {
      p_reservation_id: params.referenceId, p_recipient_type: params.recipientType,
    });
    if (error) throw new Error("Payment notification claim failed");
    if (claimed !== true) return { success: true, response: null };
  }

  const result = await sendAlimtalk({
    templateCode: params.templateCode,
    phone: targetPhone,
    message: params.message,
    subject: params.subject,
    buttons: params.buttons,
  });

  await supabase.from("notification_logs").insert({
    notification_type: params.testPhone ? `[TEST] ${params.notificationType}` : params.notificationType,
    template_code: params.templateCode,
    recipient_type: params.recipientType,
    recipient_id: params.recipientId,
    recipient_phone: formatPhone(targetPhone),
    message_content: params.message,
    variables: params.variables,
    status: result.success ? "sent" : "failed",
    error_message: result.error || null,
    aligo_response: result.response,
    reference_type: params.referenceType,
    reference_id: params.referenceId,
    sent_at: result.success ? new Date().toISOString() : null,
  });

  if (!result.success && (params.notificationType === "reservation_completed" || params.notificationType === "new_reservation")) {
    throw new Error("Payment notification requires delivery review");
  }
  return result;
}

async function handleReservationPaid(reservationId: string, testPhone?: string) {
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select(`
      *,
      daycares!reservations_daycare_id_fkey (id, name, contact_name, contact_phone),
      products!reservations_product_id_fkey (id, name, address),
      business_owners!reservations_business_owner_id_fkey (id, contact_phone, contact_name)
    `)
    .eq("id", reservationId)
    .single();

  if (error || !reservation) {
    console.error("Failed to fetch reservation:", error);
    throw new Error("Payment notification reservation lookup failed");
  }

  const daycare = reservation.daycares as any;
  const product = reservation.products as any;
  const owner = reservation.business_owners as any;
  const dateStr = formatDate(reservation.reserved_date);
  const timeStr = formatTime(reservation.reserved_time);
  const reserverPhone = reservation.reserver_phone || daycare.contact_phone;
  const useContactTemplate = Boolean(RESERVATION_COMPLETED_CONTACT_TEMPLATE_CODE);
  const businessContactName = owner.contact_name || "사업장 담당자";
  const businessContactPhone = owner.contact_phone || "등록된 연락처 없음";

  const standardDaycareMessage = [
    "[담다] 예약이 완료되었습니다.",
    "",
    `${daycare.name}님, 체험 예약이 접수되었습니다.`,
    "",
    "■ 예약 정보",
    `- 체험: ${product.name}`,
    `- 일시: ${dateStr} ${timeStr}`,
    `- 인원: ${reservation.participant_count}명`,
    `- 장소: ${product.address}`,
    `- 결제금액: ${formatAmount(reservation.total_amount)}원`
  ].join("\n");

  const daycareMessage = useContactTemplate
    ? [
      standardDaycareMessage,
      "",
      "■ 사업장 담당자 연락처",
      `- 담당자: ${businessContactName}`,
      `- 연락처: ${businessContactPhone}`,
    ].join("\n")
    : standardDaycareMessage;

  await sendAndLog({
    notificationType: "reservation_completed",
    templateCode: useContactTemplate
      ? RESERVATION_COMPLETED_CONTACT_TEMPLATE_CODE!
      : "UF_3655",
    recipientType: "daycare",
    recipientId: daycare.id,
    phone: reserverPhone,
    message: daycareMessage,
    variables: {
      daycareName: daycare.name,
      productName: product.name,
      date: dateStr,
      time: timeStr,
      count: String(reservation.participant_count),
      address: product.address,
      amount: formatAmount(reservation.total_amount),
      businessContactName,
      businessContactPhone,
    },
    referenceType: "reservation",
    referenceId: reservationId,
    subject: "예약 완료",
    testPhone,
    buttons: CHANNEL_ADD_BUTTON,
  });

  const msg2 = [
    "[담다] 새로운 예약이 접수되었습니다.",
    "",
    "■ 예약 정보",
    `- 어린이집: ${daycare.name}`,
    `- 체험: ${product.name}`,
    `- 일시: ${dateStr} ${timeStr}`,
    `- 인원: ${reservation.participant_count}명`,
    `- 담당자: ${reservation.reserver_name || daycare.contact_name}`,
    `- 연락처: ${reserverPhone}`,
    "",
    "관리자 페이지에서 예약을 확정해주세요."
  ].join("\n");

  await sendAndLog({
    notificationType: "new_reservation",
    templateCode: "UF_3658",
    recipientType: "business_owner",
    recipientId: owner.id,
    phone: owner.contact_phone,
    message: msg2,
    variables: {
      daycareName: daycare.name,
      productName: product.name,
      date: dateStr,
      time: timeStr,
      count: String(reservation.participant_count),
      managerName: reservation.reserver_name || daycare.contact_name,
      phone: reserverPhone,
    },
    referenceType: "reservation",
    referenceId: reservationId,
    subject: "새 예약 접수",
    testPhone,
    buttons: CHANNEL_ADD_BUTTON,
  });
}

async function handleReservationCancelled(reservationId: string, testPhone?: string) {
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select(`
      *,
      daycares!reservations_daycare_id_fkey (id, name, contact_phone),
      products!reservations_product_id_fkey (id, name),
      business_owners!reservations_business_owner_id_fkey (id, contact_phone)
    `)
    .eq("id", reservationId)
    .single();

  if (error || !reservation) {
    console.error("Failed to fetch reservation:", error);
    return;
  }

  const daycare = reservation.daycares as any;
  const product = reservation.products as any;
  const owner = reservation.business_owners as any;
  const dateStr = formatDate(reservation.reserved_date);
  const timeStr = formatTime(reservation.reserved_time);
  const reserverPhone = reservation.reserver_phone || daycare.contact_phone;

  const { data: refund } = await supabase
    .from("refunds")
    .select("refund_amount")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: payment } = await supabase
    .from("payments")
    .select("payment_method")
    .eq("reservation_id", reservationId)
    .limit(1)
    .maybeSingle();

  const refundAmount = refund?.refund_amount ?? reservation.total_amount;
  const refundMethod = payment?.payment_method === "card" ? "카드 취소" : "계좌 환불";

  // 예약자(어린이집)에게 알림 - 버튼 없음 (UF_3659 템플릿에 버튼 미설정)
  const msg1 = [
    "[담다] 예약이 취소되었습니다.",
    "",
    "■ 취소된 예약",
    `- 체험: ${product.name}`,
    `- 일시: ${dateStr}`,
    "",
    "■ 환불 안내",
    `- 환불금액: ${formatAmount(refundAmount)}원`,
    `- 환불수단: ${refundMethod}`,
    "- 예상 소요: 카드사에 따라 3-5영업일",
    "",
    "새로운 체험을 찾아보세요!"
  ].join("\n");

  await sendAndLog({
    notificationType: "reservation_cancelled_user",
    templateCode: "UF_3659",
    recipientType: "daycare",
    recipientId: daycare.id,
    phone: reserverPhone,
    message: msg1,
    variables: {
      productName: product.name,
      date: dateStr,
      refundAmount: formatAmount(refundAmount),
      refundMethod: refundMethod,
    },
    referenceType: "reservation",
    referenceId: reservationId,
    subject: "예약 취소",
    testPhone,
  });

  // 사업주에게 알림
  const msg2 = [
    "[담다] 예약이 취소되었습니다.",
    "",
    "■ 취소된 예약",
    `- 어린이집: ${daycare.name}`,
    `- 체험: ${product.name}`,
    `- 일시: ${dateStr} ${timeStr}`,
    `- 인원: ${reservation.participant_count}명`
  ].join("\n");

  await sendAndLog({
    notificationType: "reservation_cancelled_owner",
    templateCode: "UF_3661",
    recipientType: "business_owner",
    recipientId: owner.id,
    phone: owner.contact_phone,
    message: msg2,
    variables: {
      daycareName: daycare.name,
      productName: product.name,
      date: dateStr,
      time: timeStr,
      count: String(reservation.participant_count),
    },
    referenceType: "reservation",
    referenceId: reservationId,
    subject: "예약 취소됨",
    testPhone,
  });
}

async function handleDaycareApproved(daycareId: string, testPhone?: string) {
  const { data: daycare, error } = await supabase
    .from("daycares")
    .select("*")
    .eq("id", daycareId)
    .single();

  if (error || !daycare) return;

  const msg = [
    "[담다] 가입이 승인되었습니다.",
    "",
    `${daycare.name} 선생님, 환영합니다!`,
    "",
    "이제 담다에서 다양한 현장체험을 예약하실 수 있습니다.",
    "",
    "아이들에게 특별한 경험을 선물해주세요."
  ].join("\n");

  await sendAndLog({
    notificationType: "signup_approved",
    templateCode: "UF_3671",
    recipientType: "daycare",
    recipientId: daycareId,
    phone: daycare.contact_phone,
    message: msg,
    variables: { daycareName: daycare.name },
    referenceType: "daycare",
    referenceId: daycareId,
    subject: "가입 승인",
    testPhone,
    buttons: CHANNEL_ADD_BUTTON,
  });
}

async function handleDaycareRejected(daycareId: string, testPhone?: string) {
  const { data: daycare, error } = await supabase
    .from("daycares")
    .select("*")
    .eq("id", daycareId)
    .single();

  if (error || !daycare) return;

  const reason = daycare.revision_reason || "서류 확인이 필요합니다.";
  const msg = [
    "[담다] 가입 신청이 반려되었습니다.",
    "",
    "■ 반려 사유",
    reason,
    "",
    "서류 보완 후 다시 신청해주세요.",
    "문의사항은 카카오톡 채널로 연락주세요."
  ].join("\n");

  await sendAndLog({
    notificationType: "signup_rejected",
    templateCode: "UF_3672",
    recipientType: "daycare",
    recipientId: daycareId,
    phone: daycare.contact_phone,
    message: msg,
    variables: { daycareName: daycare.name, rejectionReason: reason },
    referenceType: "daycare",
    referenceId: daycareId,
    subject: "가입 반려",
    testPhone,
    buttons: CHANNEL_ADD_BUTTON,
  });
}

async function handleScheduledD1Reminder(testPhone?: string) {
  const now = new Date();
  now.setHours(now.getHours() + 9);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select(`
      *,
      daycares!reservations_daycare_id_fkey (id, name, contact_phone),
      products!reservations_product_id_fkey (id, name, address)
    `)
    .eq("reserved_date", tomorrowStr)
    .in("status", ["paid", "confirmed"]);

  if (error || !reservations) {
    console.error("D-1 reminder fetch error:", error);
    return;
  }

  for (const r of reservations) {
    const daycare = r.daycares as any;
    const product = r.products as any;
    const reserverPhone = r.reserver_phone || daycare.contact_phone;

    if (!testPhone) {
      const { count } = await supabase
        .from("notification_logs")
        .select("*", { count: "exact", head: true })
        .eq("notification_type", "d1_reminder")
        .eq("reference_id", r.id)
        .eq("status", "sent");

      if (count && count > 0) continue;
    }

    const dateStr = formatDate(r.reserved_date);
    const timeStr = formatTime(r.reserved_time);

    const msg = [
      "[담다] 내일 체험이 있습니다.",
      "",
      `${daycare.name}님, 내일 체험 일정을 안내드립니다.`,
      "",
      "■ 체험 정보",
      `- 체험: ${product.name}`,
      `- 일시: ${dateStr} ${timeStr}`,
      `- 인원: ${r.participant_count}명`,
      `- 장소: ${product.address}`,
      "",
      "",
      "안전하고 즐거운 체험 되세요!"
    ].join("\n");

    await sendAndLog({
      notificationType: "d1_reminder",
      templateCode: "UF_3662",
      recipientType: "daycare",
      recipientId: daycare.id,
      phone: reserverPhone,
      message: msg,
      variables: {
        daycareName: daycare.name,
        productName: product.name,
        date: dateStr,
        time: timeStr,
        count: String(r.participant_count),
        address: product.address,
      },
      referenceType: "reservation",
      referenceId: r.id,
      subject: "체험 D-1 리마인더",
      testPhone,
    });
  }
}

async function handleScheduledReviewRequest(testPhone?: string) {
  const now = new Date();
  now.setHours(now.getHours() + 9);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select(`
      *,
      daycares!reservations_daycare_id_fkey (id, name, contact_phone),
      products!reservations_product_id_fkey (id, name)
    `)
    .eq("reserved_date", yesterdayStr)
    .in("status", ["paid", "confirmed", "completed"]);

  if (error || !reservations) {
    console.error("Review request fetch error:", error);
    return;
  }

  for (const r of reservations) {
    const daycare = r.daycares as any;
    const product = r.products as any;
    const reserverPhone = r.reserver_phone || daycare.contact_phone;

    if (!testPhone) {
      const { count: sentCount } = await supabase
        .from("notification_logs")
        .select("*", { count: "exact", head: true })
        .eq("notification_type", "review_request")
        .eq("reference_id", r.id)
        .eq("status", "sent");

      if (sentCount && sentCount > 0) continue;

      const { count: reviewCount } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("reservation_id", r.id);

      if (reviewCount && reviewCount > 0) continue;
    }

    const msg = [
      "[담다] 체험은 어떠셨나요?",
      "",
      `${daycare.name}님, ${product.name} 체험은 만족스러우셨나요?`,
      "",
      "소중한 후기를 남겨주시면 다른 어린이집 선생님들께 큰 도움이 됩니다."
    ].join("\n");

    await sendAndLog({
      notificationType: "review_request",
      templateCode: "UF_3668",
      recipientType: "daycare",
      recipientId: daycare.id,
      phone: reserverPhone,
      message: msg,
      variables: {
        daycareName: daycare.name,
        productName: product.name,
      },
      referenceType: "reservation",
      referenceId: r.id,
      subject: "리뷰 요청",
      testPhone,
      buttons: REVIEW_BUTTON,
    });
  }
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    const { event, reservation_id, daycare_id, test_phone } = body;

    if (event === "reservation_paid" && (test_phone || req.headers.get("authorization") !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`)) {
      return new Response("Forbidden", { status: 403 });
    }

    switch (event) {
      case "reservation_paid":
        if (reservation_id) await handleReservationPaid(reservation_id, test_phone);
        break;
      case "reservation_cancelled":
        if (reservation_id) await handleReservationCancelled(reservation_id, test_phone);
        break;
      case "daycare_approved":
        if (daycare_id) await handleDaycareApproved(daycare_id, test_phone);
        break;
      case "daycare_rejected":
        if (daycare_id) await handleDaycareRejected(daycare_id, test_phone);
        break;
      case "scheduled_d1_reminder":
        await handleScheduledD1Reminder(test_phone);
        break;
      case "scheduled_review_request":
        await handleScheduledReviewRequest(test_phone);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown event: " + event }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, event }), {
      headers: { "Content-Type": "application/json", "Connection": "keep-alive" },
    });
  } catch (error) {
    console.error("[send-alimtalk] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
