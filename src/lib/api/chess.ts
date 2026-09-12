import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { chessRooms, users } from "@/lib/db/schema";

import type { ChessRoomRow } from "@/lib/db/schema";

/** Тоглогчид харагдах өрсөлдөгчийн мэдээлэл — зөвхөн НИЙТ, аюулгүй талбарууд. */
export type OpponentInfo = {
  uid: string;
  displayName: string;
  photoUrl: string;
};

/**
 * Өрөөг уншиж, дуудагч тал жинхэнэ оролцогч мөн эсэхийг шалгана.
 *
 * Гурван route (info, signals, end) БҮГД яг энэ шалгалтыг хийх ёстой тул нэг
 * газар цуглуулав — signaling мессеж, тоглолтын төлөв нь ЗӨВХӨН тэр хоёр
 * тоглогчид харагдах ёстой хувийн мэдээлэл.
 */
export async function getRoomForCaller(
  roomId: string,
  callerUid: string
): Promise<{ room: ChessRoomRow; color: "white" | "black" } | null> {
  const [room] = await db.select().from(chessRooms).where(eq(chessRooms.id, roomId)).limit(1);
  if (!room) return null;

  if (room.whiteUid === callerUid) return { room, color: "white" };
  if (room.blackUid === callerUid) return { room, color: "black" };
  return null;
}

/** Өрсөлдөгчийн НИЙТ мэдээлэл — зөвхөн харуулахад хэрэгтэй бага зэрэг талбар. */
export async function getOpponentInfo(uid: string): Promise<OpponentInfo | null> {
  const [row] = await db
    .select({ uid: users.uid, displayName: users.displayName, photoUrl: users.photoUrl })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  return row ?? null;
}
