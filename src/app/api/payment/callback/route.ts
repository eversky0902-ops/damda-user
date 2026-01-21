import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // NICE Pay에서 전달받는 파라미터들
    const authResultCode = formData.get("authResultCode") as string;
    const authResultMsg = formData.get("authResultMsg") as string;
    const tid = formData.get("tid") as string;
    const orderId = formData.get("orderId") as string;
    const amount = formData.get("amt") as string; // NICE Pay는 'amt'로 전달
    const signature = formData.get("signature") as string;
    const authToken = formData.get("authToken") as string;

    console.log("NICE Pay callback received:", {
      authResultCode,
      authResultMsg,
      tid,
      orderId,
      amount,
      signature,
      authToken,
    });

    // 쿼리 파라미터로 변환하여 콜백 페이지로 리다이렉트
    const params = new URLSearchParams();
    if (authResultCode) params.set("authResultCode", authResultCode);
    if (authResultMsg) params.set("authResultMsg", authResultMsg);
    if (tid) params.set("tid", tid);
    if (orderId) params.set("orderId", orderId);
    if (amount) params.set("amount", amount);
    if (signature) params.set("signature", signature);
    if (authToken) params.set("authToken", authToken);

    const redirectUrl = `/checkout/callback?${params.toString()}`;

    // 303 See Other: POST에서 GET으로 변환하여 리다이렉트
    return NextResponse.redirect(new URL(redirectUrl, request.url), 303);
  } catch (error) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(
      new URL("/checkout/callback?authResultCode=ERROR&authResultMsg=콜백 처리 오류", request.url),
      303
    );
  }
}

// GET도 지원 (테스트용)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectUrl = `/checkout/callback?${searchParams.toString()}`;
  return NextResponse.redirect(new URL(redirectUrl, request.url), 303);
}
