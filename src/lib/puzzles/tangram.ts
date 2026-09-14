/**
 * ТАНГРАМ — долоон хэсгээр дүрс нөхнө.
 *
 * ⚠ `server-only` БИШ: клиент компонент, серверийн шалгалт, seed script
 * гурвуулаа импортолдог.
 *
 * ГЕОМЕТРИЙН ЗАГВАР — яагаад НҮДЭЭР илэрхийлэв.
 *
 * Танграмын хэсгүүдийг чөлөөт олон өнцөгт болгон бодвол «дүрс бүрэн
 * нөхөгдсөн үү» гэдгийг ОЙРОЛЦООГООР (талбай, огтлолцлын зөвшөөрөгдөх
 * алдаа) шалгах болно — тэр үед хүүхэд зөв тавьсан ч «болоогүй» гэж
 * хэлэгдэж, эсрэгээр буруу тавьсныг зөвшөөрч мэднэ.
 *
 * Тиймээс бүх зүйлийг БҮХЭЛ ТООН ТОР дээр байрлуулна. Нэгж дөрвөлжин
 * бүрийг ХОЁР ДИАГОНАЛААР нь дөрвөн гурвалжин болгож хуваана:
 *
 *        +-------+      N = дээд, E = баруун,
 *        |\  N  /|      S = доод, W = зүүн
 *        | \   / |
 *        |W  X  E|      Нүд бүрийн талбай = 1/4
 *        | /   \ |
 *        |/  S  \|
 *        +-------+
 *
 * Танграмын ДОЛООН хэсэг бүр эдгээр нүднүүдийн НЭГДЭЛ болж яг буудаг
 * (доорх `PIECES`-ийг үзнэ үү). Ингэснээр «нөхөгдсөн эсэх» нь ердөө
 * олонлогийн тэнцэл болж, ойролцоо тооцоо огт хэрэггүй.
 *
 * ⚠ ЭРГҮҮЛЭЛТ 90°-ИЙН АЛХМААР. 45°-ийн эргүүлэлт нь энэ торыг өөр рүүгээ
 * буулгадаггүй (гурвалжны нүднүүд тор дээр таарахаа болино). Дүрсүүдийг
 * бид ӨӨРСДӨӨ үүсгэдэг тул зөвхөн 90°-ийн эргүүлэлт, толин тусгалаар
 * угсрагдах дүрс л сонгогдоно — өөрөөр хэлбэл бүх дүрс ЗААВАЛ
 * шийдэгдэнэ.
 */

/** Нэгж дөрвөлжин доторх гурвалжны чиглэл. */
export const DIRS = ["N", "E", "S", "W"] as const;
export type Dir = (typeof DIRS)[number];

/** Торын нэг нүд — (багана, мөр, чиглэл). */
export type Cell = { c: number; r: number; d: number };

export const PIECE_IDS = [
  "large1",
  "large2",
  "medium",
  "small1",
  "small2",
  "square",
  "para",
] as const;
export type PieceId = (typeof PIECE_IDS)[number];

const cell = (c: number, r: number, d: number): Cell => ({ c, r, d });

const N = 0;
const E = 1;
const S = 2;
const W = 3;

/**
 * Хэсэг бүрийн КАНОНИК нүднүүд.
 *
 * ⚠ Нүдний ТОО нь танграмын талбайн харьцааг ЯГ дагана (жижиг гурвалжин
 * = 4 нүд = 1 талбай):
 *   том гурвалжин 16, дунд 8, дөрвөлжин 8, параллелограм 8, жижиг 4.
 *   Нийт 16+16+8+4+4+8+8 = 64 нүд = 16 талбай = 4×4 дөрвөлжин.
 */
const PIECE_CELLS: Record<PieceId, Cell[]> = {
  /** Том гурвалжин — (0,0),(4,0),(2,2). Доош харсан, хөвч нь дээр. */
  large1: [
    cell(0, 0, N), cell(0, 0, E),
    cell(1, 0, N), cell(1, 0, E), cell(1, 0, S), cell(1, 0, W),
    cell(2, 0, N), cell(2, 0, E), cell(2, 0, S), cell(2, 0, W),
    cell(3, 0, N), cell(3, 0, W),
    cell(1, 1, E), cell(1, 1, N),
    cell(2, 1, W), cell(2, 1, N),
  ],
  large2: [
    cell(0, 0, N), cell(0, 0, E),
    cell(1, 0, N), cell(1, 0, E), cell(1, 0, S), cell(1, 0, W),
    cell(2, 0, N), cell(2, 0, E), cell(2, 0, S), cell(2, 0, W),
    cell(3, 0, N), cell(3, 0, W),
    cell(1, 1, E), cell(1, 1, N),
    cell(2, 1, W), cell(2, 1, N),
  ],
  /** Дунд гурвалжин — (0,0),(2,0),(0,2). Катет нь тэнхлэгийн дагуу. */
  medium: [
    cell(0, 0, N), cell(0, 0, E), cell(0, 0, S), cell(0, 0, W),
    cell(1, 0, N), cell(1, 0, W),
    cell(0, 1, N), cell(0, 1, W),
  ],
  /** Жижиг гурвалжин — (0,0),(2,0),(1,1). */
  small1: [cell(0, 0, N), cell(0, 0, E), cell(1, 0, N), cell(1, 0, W)],
  small2: [cell(0, 0, N), cell(0, 0, E), cell(1, 0, N), cell(1, 0, W)],
  /** Дөрвөлжин — 45° эргэсэн, оройнууд (1,0),(2,1),(1,2),(0,1). */
  square: [
    cell(0, 0, E), cell(0, 0, S),
    cell(1, 0, W), cell(1, 0, S),
    cell(0, 1, N), cell(0, 1, E),
    cell(1, 1, N), cell(1, 1, W),
  ],
  /** Параллелограм — (0,0),(1,1),(3,1),(2,0). */
  para: [
    cell(0, 0, N), cell(0, 0, E),
    cell(1, 0, N), cell(1, 0, E), cell(1, 0, S), cell(1, 0, W),
    cell(2, 0, S), cell(2, 0, W),
  ],
};

/** Хэсэг бүрийн өнгө — дэлгэц дээр ялгаатай байх ёстой. */
export const PIECE_COLORS: Record<PieceId, string> = {
  large1: "#eab308",
  large2: "#7e22ce",
  medium: "#2563eb",
  small1: "#dc2626",
  small2: "#f9a8d4",
  square: "#16a34a",
  para: "#f59e0b",
};

// ---------------------------------------------------------------------------
// Хувиргалтууд
// ---------------------------------------------------------------------------

/**
 * 90° цагийн зүүний дагуу (дэлгэцийн координат: y доошоо).
 *
 * Нэгж дөрвөлжин (c,r) → (−r−1, c); чиглэл N→E→S→W→N.
 */
function rotateCell({ c, r, d }: Cell): Cell {
  return { c: -r - 1, r: c, d: (d + 1) % 4 };
}

/** Хэвтээ толин тусгал: (c,r) → (−c−1, r); E ↔ W, N ба S хэвээр. */
function flipCell({ c, r, d }: Cell): Cell {
  const flipped = d === E ? W : d === W ? E : d;
  return { c: -c - 1, r, d: flipped };
}

/** Нүднүүдийг эерэг талбарт шахаж, тогтвортой эрэмбэлнэ. */
function normalize(cells: Cell[]): Cell[] {
  const minC = Math.min(...cells.map((x) => x.c));
  const minR = Math.min(...cells.map((x) => x.r));

  return cells
    .map((x) => ({ c: x.c - minC, r: x.r - minR, d: x.d }))
    .sort((a, b) => a.r - b.r || a.c - b.c || a.d - b.d);
}

export type Orientation = { rotation: number; flipped: boolean };

/** Хэсгийн нүднүүд өгөгдсөн эргэлт/тусгалд. */
export function orientedCells(piece: PieceId, orientation: Orientation): Cell[] {
  let cells = PIECE_CELLS[piece];
  if (orientation.flipped) cells = cells.map(flipCell);
  for (let i = 0; i < ((orientation.rotation % 4) + 4) % 4; i += 1) {
    cells = cells.map(rotateCell);
  }
  return normalize(cells);
}

/**
 * Хэсгийн ӨВӨРМӨЦ байрлалууд.
 *
 * ⚠ Тэгш хэмтэй хэсгүүд (дөрвөлжин) олон байрлалд ИЖИЛ дүрс өгдөг тул
 * давхардлыг хална — эс бөгөөс үүсгэгч ижил хувилбарыг дахин дахин
 * оролдож, хайлт удаашрана.
 */
export function uniqueOrientations(piece: PieceId): Orientation[] {
  const seen = new Map<string, Orientation>();

  for (const flipped of [false, true]) {
    for (let rotation = 0; rotation < 4; rotation += 1) {
      const key = orientedCells(piece, { rotation, flipped })
        .map((x) => `${x.c},${x.r},${x.d}`)
        .join("|");
      if (!seen.has(key)) seen.set(key, { rotation, flipped });
    }
  }

  return [...seen.values()];
}

export const cellKey = (c: number, r: number, d: number) => `${c},${r},${d}`;

// ---------------------------------------------------------------------------
// Дүрс (силуэт)
// ---------------------------------------------------------------------------

export type Placement = {
  piece: PieceId;
  /** Хэсгийн нүднүүдийг шилжүүлэх хэмжээ. */
  c: number;
  r: number;
  orientation: Orientation;
};

export type Figure = {
  /** Торны хэмжээ (нэгж дөрвөлжинөөр). */
  width: number;
  height: number;
  /** Нөхөх ёстой нүднүүд. */
  cells: Set<string>;
};

/** Байрлалын эзлэх нүднүүд. */
export function placedCells(placement: Placement): Cell[] {
  return orientedCells(placement.piece, placement.orientation).map((x) => ({
    c: x.c + placement.c,
    r: x.r + placement.r,
    d: x.d,
  }));
}

/** Хэд хэдэн байрлалын нэгдэл — давхцвал `null`. */
export function unionOf(placements: Placement[]): Set<string> | null {
  const out = new Set<string>();

  for (const placement of placements) {
    for (const x of placedCells(placement)) {
      const key = cellKey(x.c, x.r, x.d);
      if (out.has(key)) return null; // давхцал
      out.add(key);
    }
  }

  return out;
}

/**
 * Тавьсан хэсгүүд дүрсийг ЯГ нөхсөн эсэх.
 *
 * ⚠ «Багтсан» биш «ЯГ ТЭНЦҮҮ»: илүү гарсан ч, дутсан ч болохгүй.
 * Долоон хэсгийн нийт талбай нь дүрсийнхтэй тэнцүү тул аль нэг нь
 * зөрвөл нөгөө нь ч зөрнө — гэхдээ хоёуланг шалгах нь алдааны мессежийг
 * тодорхой болгоно.
 */
export function isSolved(figure: Figure, placements: Placement[]): boolean {
  if (placements.length !== PIECE_IDS.length) return false;

  const union = unionOf(placements);
  if (!union) return false;
  if (union.size !== figure.cells.size) return false;

  for (const key of union) if (!figure.cells.has(key)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Кодчлол
// ---------------------------------------------------------------------------

/** Хадгалах хэлбэр: "tangram:<өргөн>x<өндөр>:<hex битмаск>" */
export const TANGRAM_RE = /^tangram:(\d{1,2})x(\d{1,2}):([0-9a-f]+)$/;

function bitIndex(width: number, c: number, r: number, d: number): number {
  return (r * width + c) * 4 + d;
}

export function encodeTangram(figure: Figure): string {
  const bits = figure.width * figure.height * 4;
  const bytes = new Uint8Array(Math.ceil(bits / 8));

  for (const key of figure.cells) {
    const [c, r, d] = key.split(",").map(Number);
    const index = bitIndex(figure.width, c, r, d);
    bytes[index >> 3] |= 1 << (index & 7);
  }

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `tangram:${figure.width}x${figure.height}:${hex}`;
}

/**
 * Задалж ШАЛГАНА.
 *
 * ⚠ Зөвхөн хэлбэрийг биш, дүрсийн ТАЛБАЙГ ч шалгана: долоон хэсгийн нийт
 * талбай нь 64 нүд тул түүнээс өөр тоотой дүрс нь ШИЙДЭГДЭХГҮЙ. Тийм
 * дүрс сурагчид очвол хэчнээн оролдсон ч дуусахгүй.
 */
export function decodeTangram(raw: string | null | undefined): Figure | null {
  if (typeof raw !== "string") return null;

  const match = TANGRAM_RE.exec(raw.trim());
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 1 || height < 1) return null;

  const bytes = match[3].match(/../g) ?? [];
  const cells = new Set<string>();

  for (let index = 0; index < width * height * 4; index += 1) {
    const byte = parseInt(bytes[index >> 3] ?? "0", 16);
    if (!(byte & (1 << (index & 7)))) continue;
    const d = index % 4;
    const square = Math.floor(index / 4);
    cells.add(cellKey(square % width, Math.floor(square / width), d));
  }

  if (cells.size !== TOTAL_CELLS) return null;

  return { width, height, cells };
}

// ---------------------------------------------------------------------------
// Дүрс үүсгэгч
// ---------------------------------------------------------------------------

/**
 * ⚠ САНД байгаагийн шалтгаан: seed script БА админы редактор хоёул дүрс
 * үүсгэдэг. Хоёр газар тусад нь бичвэл нэг нь шийдэгдэхгүй дүрс гаргаж
 * эхэлсэн ч нөгөө нь мэдэхгүй өнгөрнө.
 */

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Нүдний ТАЛ хуваалцсан хөршүүд — дүрс салангид байхаас сэргийлэхэд. */
export function neighbourKeys(c: number, r: number, d: number): string[] {
  return [
    cellKey(c, r, (d + 1) % 4),
    cellKey(c, r, (d + 3) % 4),
    d === 0
      ? cellKey(c, r - 1, 2)
      : d === 1
        ? cellKey(c + 1, r, 3)
        : d === 2
          ? cellKey(c, r + 1, 0)
          : cellKey(c - 1, r, 1),
  ];
}

/** ТОМ хэсгээс эхэлнэ — хайлтын мод эрт нарийсна. */
const SEARCH_ORDER: PieceId[] = [
  "large1",
  "large2",
  "medium",
  "square",
  "para",
  "small1",
  "small2",
];

/**
 * Долоон хэсгийг давхцалгүй, ЗАЛГАА байрлуулна.
 *
 * Силуэтийг «зураад шийдэл нь байгаа болов уу» гэж найдахын оронд
 * ЭСРЭГЭЭР нь — шийдлээс нь эхэлж үүсгэдэг тул үр дүн нь ЗААВАЛ
 * шийдэгдэнэ.
 */
export function generatePlacements(
  seed: number,
  width: number,
  height: number
): Placement[] | null {
  const rng = makeRng(seed);
  const used = new Set<string>();
  const result: Placement[] = [];

  const place = (index: number): boolean => {
    if (index === SEARCH_ORDER.length) return true;
    const piece = SEARCH_ORDER[index];

    const options: Placement[] = [];
    for (const orientation of uniqueOrientations(piece)) {
      for (let c = 0; c < width; c += 1) {
        for (let r = 0; r < height; r += 1) options.push({ piece, c, r, orientation });
      }
    }

    for (const candidate of shuffled(options, rng)) {
      const cells = placedCells(candidate);
      if (cells.some((x) => x.c < 0 || x.r < 0 || x.c >= width || x.r >= height)) continue;

      const keys = cells.map((x) => cellKey(x.c, x.r, x.d));
      if (keys.some((key) => used.has(key))) continue;

      // ⚠ Эхнийхээс бусад нь БАЙГАА хэсэгтэй тал хуваалцана — эс бөгөөс
      // дүрс салангид хэдэн хэсэг болж «дүрс» гэж танигдахаа болино.
      if (index > 0 && !cells.some((x) => neighbourKeys(x.c, x.r, x.d).some((n) => used.has(n)))) {
        continue;
      }

      keys.forEach((key) => used.add(key));
      result.push(candidate);
      if (place(index + 1)) return true;
      keys.forEach((key) => used.delete(key));
      result.pop();
    }

    return false;
  };

  return place(0) ? result : null;
}

/** Байрлалуудаас силуэт. */
export function figureFrom(
  placements: Placement[],
  width: number,
  height: number
): Figure | null {
  const cells = unionOf(placements);
  if (!cells || cells.size !== TOTAL_CELLS) return null;
  return { width, height, cells };
}

/**
 * ЧАНАРЫН оноо — периметр (гадна ирмэгийн тоо). Бага нь ДЭЭР: цөөн
 * ирмэгтэй дүрс нягт, бүтэн бие шиг харагдана; их периметртэй нь олон
 * нарийн сүүлтэй, «санамсаргүй хаясан» мэт болж хүүхдэд танигдахгүй.
 */
export function perimeterOf(cells: Set<string>): number {
  let count = 0;
  for (const key of cells) {
    const [c, r, d] = key.split(",").map(Number);
    for (const n of neighbourKeys(c, r, d)) if (!cells.has(n)) count += 1;
  }
  return count;
}

/** Долоон хэсгийн нийт нүд — дүрс ЯГ ийм талбайтай байх ёстой. */
export const TOTAL_CELLS = PIECE_IDS.reduce(
  (sum, piece) => sum + PIECE_CELLS[piece].length,
  0
);
