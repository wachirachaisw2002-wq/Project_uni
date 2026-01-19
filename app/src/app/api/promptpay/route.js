import { NextResponse } from "next/server";
import promptpay from "promptpay-qr";
import QRCode from "qrcode";

const PROMPTPAY_ID = "0968862156";
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get("amount");
    const amount = parseFloat(amountStr);

    if (!amountStr || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "จำนวนเงินไม่ถูกต้อง (ต้องเป็นตัวเลขที่มากกว่า 0)" },
        { status: 400 }
      );
    }

    const finalAmount = parseFloat(amount.toFixed(2));

    const payload = promptpay(PROMPTPAY_ID, { amount: finalAmount });

    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 10,
      color: {
        dark: '#000000',
        light: '#ffffff',
      }
    });

    return NextResponse.json(
      {
        qrCodeDataUrl,
        amount: finalAmount,
        promptpay_id: PROMPTPAY_ID
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );

  } catch (error) {
    console.error("PromptPay API Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้าง QR Code: " + error.message },
      { status: 500 }
    );
  }
}