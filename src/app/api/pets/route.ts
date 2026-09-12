import { NextResponse } from "next/server";

import { badRequest, requireActiveUser, serverError } from "@/lib/api/auth";
import { buyPet, carePet, claimMilestone, listPets, renamePet } from "@/lib/api/pets";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ТЭЖЭЭВЭР — жагсаалт, худалдан авалт, асаргаа, шагнал.
 *
 * ⚠ Бүх үйлдэл ЗӨВХӨН ӨӨРИЙН тэжээвэр дээр (`caller.uid`). Тэжээврийн ID
 * нь UUID боловч эзэмшлийг шалгахгүй бол таамагласан ID-гаар бусдын
 * тэжээврийг асарч, дарааллыг нь өсгөх боломжтой болно.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json({ pets: await listPets(result.caller.uid) });
  } catch (error) {
    return serverError(error, "Тэжээвэр татахад алдаа гарлаа");
  }
}

export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const uid = result.caller.uid;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;
    const petId = typeof body.petId === "string" ? body.petId : "";

    /* ---------- Худалдаж авах ---------- */
    if (action === "buy") {
      const species = typeof body.species === "string" ? body.species : "";
      const outcome = await buyPet(uid, species);

      if (!outcome.ok) {
        return badRequest(
          outcome.reason === "no-gems"
            ? "Зоос хүрэлцэхгүй байна."
            : outcome.reason === "limit"
              ? "Тэжээврийн тоо хязгаартаа хүрсэн байна."
              : "Танихгүй тэжээвэр."
        );
      }

      return NextResponse.json({ pet: outcome.pet, gems: outcome.gems });
    }

    /* ---------- Хооллох / услах ---------- */
    if (action === "care") {
      const outcome = await carePet(uid, petId);

      if (!outcome.ok) {
        return badRequest(
          outcome.reason === "no-gems"
            ? "Хоол авах зоос хүрэлцэхгүй байна."
            : outcome.reason === "too-soon"
              ? "Өнөөдөр аль хэдийн асарсан байна — маргааш дахин."
              : "Тэжээвэр олдсонгүй."
        );
      }

      return NextResponse.json({ pet: outcome.pet, gems: outcome.gems });
    }

    /* ---------- Шагнал авах ---------- */
    if (action === "claim") {
      const days = Math.round(Number(body.days));
      if (!Number.isFinite(days)) return badRequest("Шагналын хугацаа буруу.");

      const outcome = await claimMilestone(uid, petId, days);
      if (!outcome.ok) return badRequest("Энэ шагналыг авах боломжгүй байна.");

      return NextResponse.json({
        pet: outcome.pet,
        gems: outcome.gems,
        reward: outcome.reward,
      });
    }

    /* ---------- Нэрлэх ---------- */
    if (action === "rename") {
      const name = typeof body.name === "string" ? body.name : "";
      const pet = await renamePet(uid, petId, name);
      if (!pet) return badRequest("Тэжээвэр олдсонгүй.");
      return NextResponse.json({ pet });
    }

    return badRequest("Танихгүй үйлдэл.");
  } catch (error) {
    return serverError(error, "Үйлдэл гүйцэтгэхэд алдаа гарлаа");
  }
}
