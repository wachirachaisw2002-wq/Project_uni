import { NextResponse } from "next/server";
import promptpay from "promptpay-qr";
import QRCode from "qrcode";

// กำหนดหมายเลขพร้อมเพย์ที่รับเงิน (เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน)
const PROMPTPAY_ID = "0968862156";

/**
 * API สำหรับสร้าง QR Code PromptPay
 * รับค่า amount ผ่าน Query Parameter
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get("amount");
    const amount = parseFloat(amountStr);

    // 1. ตรวจสอบความถูกต้องของจำนวนเงิน
    if (!amountStr || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "จำนวนเงินไม่ถูกต้อง (ต้องเป็นตัวเลขที่มากกว่า 0)" },
        { status: 400 }
      );
    }

    // 2. ปรับทศนิยมให้เป็น 2 ตำแหน่งตามมาตรฐานการเงิน
    const finalAmount = parseFloat(amount.toFixed(2));

    // 3. สร้าง Payload สำหรับ PromptPay
    // ใช้ไลบรารี promptpay-qr ในการสร้างข้อความตามมาตรฐาน EMVCo
    const payload = promptpay(PROMPTPAY_ID, { amount: finalAmount });

    // 4. แปลง Payload เป็นรูปภาพ QR Code ในรูปแบบ Data URL (Base64)
    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H', // ความละเอียดสูงเพื่อให้สแกนติดง่าย
      margin: 2,
      scale: 10,
      color: {
        dark: '#000000',
        light: '#ffffff',
      }
    });

    // 5. ส่งข้อมูลกลับไปยัง Frontend
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
          // ป้องกัน Browser เก็บ Cache เพื่อให้ได้ QR ล่าสุดเสมอ
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