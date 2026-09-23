"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ТОГЛОЛТЫН ЦАГ — шатар, даам хоёуланд.
 *
 * ⚠ Урьд нь цаг нь ЗӨВХӨН ЗУРАГ байсан («10:00» гэж хатуу бичигдсэн,
 * `MatchHeader`). Одоо бодитоор буурна.
 *
 * ⚠ ХЭРЭГГҮЙ САНАМСАРГҮЙ БАЙДЛЫГ ЗАЙЛСХИЙВ: цагийг `setInterval`-ын
 * ДУУДАГДСАН ТООГООР бууруулбал (100мс × дуудалт) хөтөч таб хаалттай,
 * эсвэл процессор ачаалалтай үед интервал ХОЦОРЧ, цаг үнэндээ илүү
 * удаан буурна. Тиймээс ямагт `performance.now()`-ийн ЗӨРҮҮГ хасна —
 * интервал нь зөвхөн «дэлгэцээ шинэчил» гэсэн дохио.
 *
 * ⚠ НЭМЭЛТ (increment) нь ЭЭЛЖ СОЛИГДОХОД, нүүдэл хийсэн талд нэмэгдэнэ
 * (Fischer дүрэм). Нүүдэл хийхээс ӨМНӨ нэмбэл цаг хэзээ ч дуусахгүй.
 *
 * ⚠ ОНЛАЙН ТОГЛОЛТОД цаг нь ХОЁР ТАЛД ТУС ТУСДАА явна (сервер синк
 * байхгүй) — хоёр цагийн хооронд сүлжээний хоцролтын зөрүү үүснэ. Тэр
 * зөрүү нь шударга байхын тулд: ЦАГ ДУУССАНЫГ ЗӨВХӨН ЦАГ ДУУССАН ТАЛ
 * ӨӨРӨӨ мэдэгдэнэ (өөрөө хожигдлоо зарлана). Өрсөлдөгчийн цагийг
 * «дууслаа» гэж зарлах эрхийг хэнд ч өгөхгүй — эс бөгөөс сүлжээ
 * хоцорсон хүн хожигдох болно.
 */

export type ClockSide = "w" | "b";

export type GameClock = {
  /** Үлдсэн хугацаа (мс). */
  white: number;
  black: number;
  /** Цаг дууссан тал — `null` бол хэн ч дуусаагүй. */
  flagged: ClockSide | null;
  /** Нүүдэл хийгдсэн: нэмэлт олгож, ээлжийг сольж тоолно. */
  onMove: (mover: ClockSide) => void;
  /** Шинэ тоглолт — хоёр цагийг эхлэл рүү. */
  reset: () => void;
};

export type ClockOptions = {
  /** Үндсэн хугацаа (минут). */
  baseMin: number;
  /** Нүүдэл тутмын нэмэлт (секунд). */
  incrementSec: number;
  /** Ээлж — аль талын цаг явж байна. */
  turn: ClockSide;
  /** Цаг явах эсэх: тоглолт эхэлсэн, дуусаагүй, холболт хийгдсэн. */
  running: boolean;
  /** Цаг дуусахад НЭГ удаа дуудагдана. */
  onFlag?: (side: ClockSide) => void;
};

/** «7:05» — минут:секунд. 10 секундээс доош бол аравны нэг хүртэл. */
export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSec = safe / 1000;

  /*
   * ⚠ 10 секундээс доош АРАВНЫ НЭГ харуулна: «0:03» гэж гацсан тоо нь
   * тоглогчид хэр хугацаа үлдсэнийг хэлж чадахгүй. Блиц тоглолтод
   * тэр гурван секунд нь шийдвэрлэх мөч.
   */
  if (totalSec < 10) return totalSec.toFixed(1);

  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

/** Дэлгэц шинэчлэх давтамж — цаг нь `performance.now()`-оор тоологдоно. */
const TICK_MS = 100;

export function useGameClock({
  baseMin,
  incrementSec,
  turn,
  running,
  onFlag,
}: ClockOptions): GameClock {
  const baseMs = baseMin * 60_000;
  const [white, setWhite] = useState(baseMs);
  const [black, setBlack] = useState(baseMs);
  const [flagged, setFlagged] = useState<ClockSide | null>(null);

  /*
   * ⚠ Үлдэгдлийг REF-д ч барина: интервалын дотор `white`/`black`-ийг
   * уншвал тэр нь интервал ҮҮСЭХ мөчийн хуулбар болж («stale closure»)
   * цаг хоёр дахин хасагдах эсвэл огт хасагдахгүй болно.
   */
  const leftRef = useRef({ w: baseMs, b: baseMs });
  const lastTickRef = useRef<number | null>(null);
  /*
   * ⚠ `onFlag`-ийг REF-д хадгална, БИЧИЛТ нь ЭФФЕКТ дотор: render үед
   * ref бичих нь React-ийн дүрэм зөрчил (concurrent render давхар
   * дуудагдаж болно). Ref хэрэгтэй шалтгаан нь интервал үүсгэх
   * эффектийг `onFlag` солигдох бүрд ДАХИН УСТГАЖ, ДАХИН үүсгэхээс
   * сэргийлэх — тэгвэл цаг тик тутам тэглэгдэнэ.
   */
  const onFlagRef = useRef(onFlag);
  useEffect(() => {
    onFlagRef.current = onFlag;
  }, [onFlag]);

  const reset = useCallback(() => {
    leftRef.current = { w: baseMs, b: baseMs };
    lastTickRef.current = null;
    setWhite(baseMs);
    setBlack(baseMs);
    setFlagged(null);
  }, [baseMs]);

  const onMove = useCallback(
    (mover: ClockSide) => {
      /*
       * ⚠ НЭМЭЛТ нь нүүдэл ХИЙСЭН талд. Мөн `lastTick`-ийг тэглэнэ:
       * нүүдэл хийх хооронд өнгөрсөн хугацаа нь нүүдэл хийсэн талын
       * цагаас аль хэдийн хасагдсан, дараагийн ээлжид дахин хасагдах
       * ёсгүй.
       */
      if (incrementSec > 0) {
        leftRef.current[mover] += incrementSec * 1000;
        if (mover === "w") setWhite(leftRef.current.w);
        else setBlack(leftRef.current.b);
      }
      lastTickRef.current = performance.now();
    },
    [incrementSec]
  );

  useEffect(() => {
    if (!running || flagged) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();

    const id = setInterval(() => {
      const now = performance.now();
      const since = now - (lastTickRef.current ?? now);
      lastTickRef.current = now;

      const key = turn === "w" ? "w" : "b";
      const next = Math.max(0, leftRef.current[key] - since);
      leftRef.current[key] = next;

      if (key === "w") setWhite(next);
      else setBlack(next);

      if (next === 0) {
        setFlagged(turn);
        onFlagRef.current?.(turn);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [running, turn, flagged]);

  return { white, black, flagged, onMove, reset };
}
