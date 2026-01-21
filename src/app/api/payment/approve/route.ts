import { NextRequest, NextResponse } from "next/server";

const NICEPAY_API_URL = "https://api.nicepay.co.kr/v1/payments";

export async function POST(request: NextRequest) {
  try {
    const { tid, amount } = await request.json();

    if (!tid || !amount) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const clientKey = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_KEY;
    const secretKey = process.env.NICEPAY_SECRET_KEY;

    if (!clientKey || !secretKey) {
      console.error("NICEPAY keys are not configured");
      return NextResponse.json(
        { success: false, error: "결제 설정 오류입니다." },
        { status: 500 }
      );
    }

    // Basic 인증: clientKey:secretKey를 Base64 인코딩
    const authKey = Buffer.from(`${clientKey}:${secretKey}`).toString("base64");

    // 나이스페이 승인 API 호출
    const response = await fetch(`${NICEPAY_API_URL}/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authKey}`,
      },
      body: JSON.stringify({
        amount: amount,
      }),
    });

    const result = await response.json();

    if (result.resultCode === "0000") {
      // 결제 성공
      return NextResponse.json({
        success: true,
        data: {
          tid: result.tid,
          orderId: result.orderId,
          amount: result.amount,
          cardName: result.card?.cardName,
          cardNumber: result.card?.cardNumber,
          approvedAt: result.approvedAt,
        },
      });
    } else {
      // 결제 실패
      console.error("Payment approval failed:", result);
      return NextResponse.json({
        success: false,
        error: result.resultMsg || "결제 승인에 실패했습니다.",
        code: result.resultCode,
      });
    }
  } catch (error) {
    console.error("Payment approval error:", error);
    return NextResponse.json(
      { success: false, error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
