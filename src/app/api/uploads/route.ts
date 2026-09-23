import { NextResponse } from "next/server";

import { badRequest, requireActiveUser, requireAdmin, serverError } from "@/lib/api/auth";
import { saveImage } from "@/lib/api/uploads";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MB = 1024 * 1024;

/**
 * Байршуулах төрөл бүрийн эрх, хэмжээ, хавтас.
 *
 * ⚠ ХАВТСЫГ СЕРВЕР тогтооно, клиентээс авахгүй: профайл зураг ҮРГЭЛЖ
 * дуудагчийн өөрийн `profile_photos/{uid}` хавтсанд орно. Эс бөгөөс
 * бусдын хавтсыг дарж бичих, эсвэл `users/me` дээрх «зөвхөн өөрийн
 * хавтас» шалгалтыг тойрох боломжтой болно.
 */
const KINDS = {
  profile: { maxBytes: 5 * MB, admin: false },
  "center-logo": { maxBytes: 2 * MB, admin: true },
} as const;

type Kind = keyof typeof KINDS;

/**
 * POST /api/uploads?kind=profile|center-logo — зураг байршуулна
 * (multipart/form-data: `file`, "center-logo" үед `centerId`).
 * Хариу: `{ url }` — `/api/uploads/...` хаяг.
 *
 * ⚠ `kind` нь ХАЯГТ: эрхийг файлыг уншихаас ӨМНӨ шалгана — нэвтрээгүй
 * хүсэлтийн 10MB биеийг санах ойд авах шаардлагагүй.
 *
 * ⚠ Зураг хадгалах нь ХАЯГИЙГ профайлд БИЧИХГҮЙ: клиент дараа нь
 * `PATCH /api/users/me`-ээр тавина (тэнд хуучин зургийг устгана).
 */
export async function POST(request: NextRequest) {
  const kind = (request.nextUrl.searchParams.get("kind") ?? "") as Kind;
  const rule = Object.hasOwn(KINDS, kind) ? KINDS[kind] : null;
  if (!rule) return badRequest("Байршуулах төрөл буруу байна.");

  const result = rule.admin ? await requireAdmin(request) : await requireActiveUser(request);
  if ("error" in result) return result.error;

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest("Файл илгээгээгүй байна.");

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("Файл илгээгээгүй байна.");
  if (file.size > rule.maxBytes) {
    return badRequest(`Зургийн хэмжээ ${rule.maxBytes / MB}MB-ээс бага байх ёстой.`);
  }

  let folder: string[];
  if (kind === "center-logo") {
    const centerId = String(form.get("centerId") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(centerId)) return badRequest("Сургалтын төв буруу байна.");
    folder = ["training_centers", centerId];
  } else {
    folder = ["profile_photos", result.caller.uid];
  }

  try {
    const url = await saveImage(folder, Buffer.from(await file.arrayBuffer()));
    if (!url) return badRequest("Зөвхөн PNG, JPEG, WEBP, GIF зураг байршуулна.");
    return NextResponse.json({ url });
  } catch (error) {
    return serverError(error, "Зураг хадгалахад алдаа гарлаа");
  }
}
