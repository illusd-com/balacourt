import { NextRequest, NextResponse } from "next/server";
import {
  createHearingSlip,
  listClosedHearings,
  getHearingSlip,
} from "@/lib/turso";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const defendant = String(body.defendant || "").trim();
    const plaintiff = String(body.plaintiff || "").trim();
    if (!defendant || !plaintiff) {
      return NextResponse.json(
        { error: "必須填寫被告與提告人姓名" },
        { status: 400 }
      );
    }

    let previousSlipId: string | undefined;
    if (body.previousSlipId || body.previousUrl) {
      const raw = String(body.previousSlipId || body.previousUrl || "");
      const m = raw.match(/(\d{15})/);
      if (m) {
        const prev = await getHearingSlip(m[1], { publicView: true });
        if (prev && prev.status === "closed") {
          previousSlipId = prev.id;
        }
      }
    }

    const slip = await createHearingSlip({
      defendant,
      plaintiff,
      defendantId: body.defendantId ? String(body.defendantId).trim() : undefined,
      plaintiffId: body.plaintiffId ? String(body.plaintiffId).trim() : undefined,
      testMode: Boolean(body.testMode),
      previousSlipId,
    });

    if (!slip) {
      return NextResponse.json(
        {
          error:
            "無法建立開庭單（請確認已設定 TURSO_DATABASE_URL 與 TURSO_AUTH_TOKEN）",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      id: slip.id,
      status: slip.status,
      previous_slip_id: slip.previous_slip_id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    const limit = Number(req.nextUrl.searchParams.get("limit") || "50");
    const list = await listClosedHearings({ q, limit });
    return NextResponse.json({
      items: list.map((s) => ({
        id: s.id,
        summary_title: s.summary_title,
        defendant: s.defendant,
        plaintiff: s.plaintiff,
        closed_at: s.closed_at,
        created_at: s.created_at,
        previous_slip_id: s.previous_slip_id,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}
