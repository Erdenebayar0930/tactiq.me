import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { listDevices } from "@/lib/api/devices";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Өөрийн нэвтэрсэн төхөөрөмжүүд (Тохиргоо → Төхөөрөмжүүд). */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const currentDeviceId = request.headers.get("x-device-id") ?? "";
    const devices = await listDevices(result.caller.uid, currentDeviceId);

    return NextResponse.json({ devices });
  } catch (error) {
    return serverError(error, "Төхөөрөмжүүдийг уншихад алдаа гарлаа");
  }
}
