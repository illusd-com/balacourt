import { NextRequest, NextResponse } from "next/server";
import {
  getHearingSlip,
  updateHearingMessages,
  closeHearingSlip,
  parseMessages,
} from "@/lib/turso";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!/^\d{15}$/.test(id)) {
      return NextResponse.json({ error: "無效的開庭單 ID" }, { status: 400 });
    }
    const slip = await getHearingSlip(id, { publicView: true });
    if (!slip) {
      return NextResponse.json({ error: "找不到開庭單" }, { status: 404 });
    }
    return NextResponse.json({
      id: slip.id,
      status: slip.status,
      defendant: slip.defendant,
      plaintiff: slip.plaintiff,
      summary_title: slip.summary_title,
      messages: parseMessages(slip.messages_json),
      legal_text: slip.legal_text,
      judgment: slip.judgment,
      previous_slip_id: slip.previous_slip_id,
      created_at: slip.created_at,
      closed_at: slip.closed_at,
      test_mode: slip.test_mode,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!/^\d{15}$/.test(id)) {
      return NextResponse.json({ error: "無效的開庭單 ID" }, { status: 400 });
    }
    const body = await req.json();
    const slip = await getHearingSlip(id, { publicView: false });
    if (!slip) {
      return NextResponse.json({ error: "找不到開庭單" }, { status: 404 });
    }

    if (body.action === "save_messages" && Array.isArray(body.messages)) {
      if (slip.status !== "open") {
        return NextResponse.json({ error: "已完結，無法修改" }, { status: 403 });
      }
      await updateHearingMessages(id, body.messages);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "close") {
      if (slip.status !== "open") {
        return NextResponse.json({ error: "已完結" }, { status: 400 });
      }
      const closed = await closeHearingSlip({
        id,
        messages: body.messages || parseMessages(slip.messages_json),
        legalText: body.legal_text,
        judgment: body.judgment || "",
        summaryTitle: body.summary_title || "（未命名審判）",
      });
      return NextResponse.json({ ok: true, slip: closed });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}
