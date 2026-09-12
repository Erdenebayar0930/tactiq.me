/**
 * Го (囲碁 / вэйчи / баду) — хамгийн бага хэрэгтэй дүрмийн хөдөлгүүр.
 *
 * Энэ бол СУРГАЛТЫН хөдөлгүүр: бүтэн тоглолт (оноо тоолох, дамжаа,
 * seki, хятад/япон тоолол) ЭНД БАЙХГҮЙ. Хичээлийн дасгал бүр «зөв цэг
 * дээр нэг чулуу тавь» гэсэн НЭГ АЛХАМ тул зөвхөн дараах зүйл хэрэгтэй:
 *   • амьсгал (liberty) тоолох,
 *   • бүлгийг барих (capture),
 *   • амиа хорлох (suicide) нүүдлийг хориглох.
 *
 * ⚠ КО-ГИЙН ДҮРЭМ ЭНД БАЙХГҮЙ: ко нь өмнөх БАЙРЛАЛУУДЫН түүх шаарддаг,
 * харин дасгал бүр цэвэр байрлалаас эхэлж НЭГ нүүдэл хийгээд дуусдаг тул
 * түүх гэж үгүй. Бүтэн тоглолт нэмэх өдөр ко-г тэндээ шийднэ.
 */

/** `null` = хоосон огтлолцол */
export type Stone = "b" | "w";

export type GoPosition = {
  /** Хөлгийн талын урт (9, 13, 19). Дасгалд ихэвчлэн 9. */
  size: number;
  /** `size × size` нүд, зүүн ДЭЭД буланг 0 гэж эхэлнэ (мөр эхэлж). */
  cells: (Stone | null)[];
  /** Нүүх ээлжтэй тал */
  turn: Stone;
};

/**
 * Кодчилол: `go:<хэмжээ>:<нүднүүд>:<ээлж>`
 *
 * Нүд бүр нэг тэмдэгт — `.` хоосон, `b` хар, `w` цагаан. Хичээлийн
 * `exercises.grid` баганад ижил мөрөөр хадгалагдана (`slide:`, `sudoku:`
 * зэрэг бусад оньсогын адил өөрийн угтвартай).
 */
export function encodeGo(position: GoPosition): string {
  const cells = position.cells.map((cell) => cell ?? ".").join("");
  return `go:${position.size}:${cells}:${position.turn}`;
}

export function decodeGo(raw: string | null | undefined): GoPosition | null {
  if (typeof raw !== "string") return null;

  const parts = raw.trim().split(":");
  if (parts.length !== 4 || parts[0] !== "go") return null;

  const size = Number(parts[1]);
  // Дасгалд 5×5-аас жижиг хөлөг утгагүй, 19-өөс том нь стандарт бус.
  if (!Number.isInteger(size) || size < 5 || size > 19) return null;

  const body = parts[2];
  if (body.length !== size * size) return null;

  const cells: (Stone | null)[] = [];
  for (const char of body) {
    if (char === ".") cells.push(null);
    else if (char === "b" || char === "w") cells.push(char);
    else return null;
  }

  const turn = parts[3];
  if (turn !== "b" && turn !== "w") return null;

  return { size, cells, turn };
}

export const indexOfPoint = (size: number, x: number, y: number) => y * size + x;

/** Огтлолцлын хөрш — хөлгийн зах дээр 2–3 л байна. */
function neighbors(size: number, index: number): number[] {
  const x = index % size;
  const y = Math.floor(index / size);
  const list: number[] = [];
  if (x > 0) list.push(index - 1);
  if (x < size - 1) list.push(index + 1);
  if (y > 0) list.push(index - size);
  if (y < size - 1) list.push(index + size);
  return list;
}

/**
 * Нэг чулууны БҮЛЭГ (хоорондоо шууд залгаа, ижил өнгийн чулуунууд) ба
 * тэдгээрийн амьсгал.
 *
 * Го-гийн бүх дүрэм үүн дээр тогтдог: амьсгалгүй бүлэг хөлгөөс АВАГДАНА.
 */
export function groupAt(
  position: GoPosition,
  index: number
): { stones: Set<number>; liberties: Set<number> } | null {
  const color = position.cells[index];
  if (!color) return null;

  const stones = new Set<number>();
  const liberties = new Set<number>();
  const queue = [index];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (stones.has(current)) continue;
    stones.add(current);

    for (const neighbor of neighbors(position.size, current)) {
      const cell = position.cells[neighbor];
      if (cell === null) liberties.add(neighbor);
      else if (cell === color && !stones.has(neighbor)) queue.push(neighbor);
    }
  }

  return { stones, liberties };
}

export type PlayResult = {
  position: GoPosition;
  /** Энэ нүүдлээр авагдсан дайсны чулуунуудын индекс */
  captured: number[];
};

/**
 * Нүүдэл хийнэ. Хууль бус бол `null`.
 *
 * ⚠ БАРИХЫГ ЭХЛЭЭД, амиа хорлохыг ДАРАА нь шалгана — энэ дараалал нь
 * го-гийн дүрмийн цөм: өөрөө амьсгалгүй мэт харагдах нүүдэл дайсны
 * бүлгийг барьж байвал ХУУЛЬ ЁСНЫ (барьсны дараа амьсгал нээгдэнэ).
 * Урвуугаар шалгавал го-гийн хамгийн чухал тактик болох «барих» нүүдлүүд
 * хууль бус гэж бууна.
 */
export function play(position: GoPosition, index: number, color?: Stone): PlayResult | null {
  if (index < 0 || index >= position.cells.length) return null;
  if (position.cells[index] !== null) return null;

  const stone = color ?? position.turn;
  const cells = [...position.cells];
  cells[index] = stone;

  const next: GoPosition = { ...position, cells, turn: stone === "b" ? "w" : "b" };
  const opponent: Stone = stone === "b" ? "w" : "b";

  const captured: number[] = [];
  for (const neighbor of neighbors(position.size, index)) {
    if (cells[neighbor] !== opponent) continue;
    const group = groupAt(next, neighbor);
    if (group && group.liberties.size === 0) {
      for (const point of group.stones) {
        cells[point] = null;
        captured.push(point);
      }
    }
  }

  const own = groupAt(next, index);
  if (own && own.liberties.size === 0) return null;

  return { position: next, captured };
}

/**
 * Огтлолцлын нэр — «A1» хэлбэр.
 *
 * ⚠ «I» үсгийг АЛГАСНА: го-гийн олон зуун жилийн уламжлал (I ба 1 нүдэнд
 * ялгагдахгүй). Мөр нь ДООДООС дээш тоологдоно — тиймээс дотоод `y` (дээрээс
 * доош) урвуугаар хөрвүүлэгдэнэ.
 */
const COLUMNS = "ABCDEFGHJKLMNOPQRST";

export function pointLabel(size: number, index: number): string {
  const x = index % size;
  const y = Math.floor(index / size);
  return `${COLUMNS[x]}${size - y}`;
}

export function parsePoint(size: number, label: string): number | null {
  const match = label.trim().toUpperCase().match(/^([A-HJ-T])(\d{1,2})$/);
  if (!match) return null;

  const x = COLUMNS.indexOf(match[1]);
  const row = Number(match[2]);
  if (x < 0 || x >= size || row < 1 || row > size) return null;

  return indexOfPoint(size, x, size - row);
}

/** Дасгалын зөв хариулт — нэг буюу хэд хэдэн цэг ("E5" эсвэл "E5 F5"). */
export function parsePointList(size: number, raw: string | null | undefined): number[] | null {
  if (typeof raw !== "string") return null;

  const points: number[] = [];
  for (const token of raw.trim().split(/[\s,]+/).filter(Boolean)) {
    const index = parsePoint(size, token);
    if (index === null) return null;
    points.push(index);
  }

  return points.length > 0 ? points : null;
}

export const formatPointList = (size: number, points: number[]) =>
  points.map((point) => pointLabel(size, point)).join(" ");

/**
 * «Од» цэгүүд (hoshi) — хөлөг дээр зурагддаг лавлах цэгүүд. Зөвхөн
 * ХАРАГДАЦАД зориулагдсан, дүрэмд ямар ч үүрэггүй.
 */
export function starPoints(size: number): number[] {
  if (size === 9) {
    const coords = [2, 6];
    const points = coords.flatMap((x) => coords.map((y) => indexOfPoint(size, x, y)));
    points.push(indexOfPoint(size, 4, 4));
    return points;
  }
  if (size === 13) {
    const coords = [3, 9];
    const points = coords.flatMap((x) => coords.map((y) => indexOfPoint(size, x, y)));
    points.push(indexOfPoint(size, 6, 6));
    return points;
  }
  if (size === 19) {
    const coords = [3, 9, 15];
    return coords.flatMap((x) => coords.map((y) => indexOfPoint(size, x, y)));
  }
  return [];
}
