/**
 * СҮЛЖЭЭНИЙ ОНЬСОГО — тайл бүрийг эргүүлж бүх компьютерийг сервертэй
 * холбодог сонгодог «Net» тоглоом.
 *
 * ЯАГААД ЭНЭ ТОГЛООМ ВЭ: сүлжээний хамгийн үндсэн ойлголт бол «холболтын
 * зам» — өгөгдөл нь зөвхөн ТАСРАЛТГҮЙ кабелиар сервер хүртэл хүрнэ. Үүнийг
 * үг, зурагаар тайлбарлахаас илүү, кабелиа өөрөө холбож үзэхэд хүүхэд
 * шууд мэдэрдэг. Мөн оньсого нь логик сэтгэлгээ шаарддаг тул Codely
 * сургуулийн бусад хичээлтэй нэг гольдролд орно.
 *
 * ⚠ `server-only` БИШ: клиент компонент (тоглуулагч, админы урьдчилсан
 * харагдац) ба серверийн шалгалт хоёулаа импортолдог.
 */

/**
 * Чиглэлийн БИТ МАСК. Тайл бүр 4 бит — аль талдаа кабелийн үзүүртэй вэ.
 *
 * Битээр илэрхийлсэн шалтгаан: эргүүлэх нь энгийн битийн шилжүүлэлт болно
 * (90° = 1 бит зүүн тийш, дугуйлан), холболт шалгах нь `&` үйлдэл.
 */
export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;

export const ALL_DIRS = [NORTH, EAST, SOUTH, WEST] as const;

/** Тухайн чиглэлийн ЭСРЭГ тал — хоёр тайл бие бие рүүгээ харж байж холбогдоно. */
export function opposite(dir: number): number {
  return dir === NORTH ? SOUTH : dir === SOUTH ? NORTH : dir === EAST ? WEST : EAST;
}

/** Чиглэл бүрийн нүүрний шилжилт (багана, мөр). */
export function step(dir: number): { dc: number; dr: number } {
  if (dir === NORTH) return { dc: 0, dr: -1 };
  if (dir === SOUTH) return { dc: 0, dr: 1 };
  if (dir === EAST) return { dc: 1, dr: 0 };
  return { dc: -1, dr: 0 };
}

/**
 * Тайлыг 90° цагийн зүүний дагуу эргүүлнэ.
 *
 * Хойд→зүүн→урд→баруун гэсэн дараалал нь бит бүрийг НЭГ зүүн тийш
 * шилжүүлэхтэй тэнцүү; 4 битээс халих бит нь эргэж эхэнд орно.
 */
export function rotate(tile: number, times = 1): number {
  let value = tile & 0b1111;
  for (let i = 0; i < ((times % 4) + 4) % 4; i += 1) {
    value = ((value << 1) | (value >> 3)) & 0b1111;
  }
  return value;
}

export type NetPuzzle = {
  cols: number;
  rows: number;
  /** Серверийн байрлал — тайлуудын массив дахь индекс. */
  server: number;
  /** Тайл бүрийн холболтын маск (0 = хоосон нүд). */
  tiles: number[];
};

/**
 * Оньсогын ХАДГАЛАХ хэлбэр: "cols x rows : server : тайлууд(hex)".
 *
 *   "5x5:12:3a05..."
 *
 * Тайл бүр НЭГ hex тэмдэгт (0-f) — 4 битэд яг таарна. Ингэснээр 6×6
 * оньсого ч 40 орчим тэмдэгт эзлэх тул `varchar(300)`-д саадгүй багтана.
 */
export function encodePuzzle(puzzle: NetPuzzle): string {
  const tiles = puzzle.tiles.map((tile) => (tile & 0b1111).toString(16)).join("");
  return `${puzzle.cols}x${puzzle.rows}:${puzzle.server}:${tiles}`;
}

/** Оньсогын хэмжээний хязгаар — доод тал нь утга учиртай, дээд тал нь дэлгэцэд багтана. */
export const NET_MIN_SIZE = 3;
export const NET_MAX_SIZE = 7;

/**
 * Хадгалсан мөрийг задалж, БҮРЭН ШАЛГАНА.
 *
 * ЯАГААД ЗӨВХӨН ХЭЛБЭР ШАЛГАВАЛ ХАНГАЛТГҮЙ ВЭ: хэлбэрээрээ зөв ч
 * ХОЛБОГДООГҮЙ (эсвэл гогцоотой) сүлжээ нь сурагчийн хувьд ШИЙДЭГДЭХГҮЙ
 * оньсого болно — хичээл дунд бүрмөсөн гацна. Тиймээс энд:
 *
 *   • тайл бүрийн үзүүр хөршдөө ХАРИУ үзүүртэй тааралдаж байгаа эсэх
 *     (хаалтгүй үзүүр = хаашаа ч хүрэхгүй кабель)
 *   • сервер БАЙГАА эсэх
 *   • хоосон биш БҮХ тайл серверээс хүрэгддэг эсэх
 *   • ГОГЦОО (cycle) байхгүй эсэх — гогцоотой сүлжээ нь олон шийдэлтэй
 *     болж, «зөв» гэж юуг үзэхээ тодорхойлох боломжгүй болно
 *
 * бүгдийг шалгана.
 */
export function decodePuzzle(raw: string | null | undefined): NetPuzzle | null {
  if (typeof raw !== "string") return null;

  const match = /^(\d+)x(\d+):(\d+):([0-9a-f]+)$/.exec(raw.trim().toLowerCase());
  if (!match) return null;

  const cols = Number(match[1]);
  const rows = Number(match[2]);
  const server = Number(match[3]);
  const body = match[4];

  if (
    cols < NET_MIN_SIZE ||
    cols > NET_MAX_SIZE ||
    rows < NET_MIN_SIZE ||
    rows > NET_MAX_SIZE ||
    body.length !== cols * rows
  ) {
    return null;
  }

  const tiles = [...body].map((char) => parseInt(char, 16));
  if (server < 0 || server >= tiles.length || tiles[server] === 0) return null;

  const puzzle: NetPuzzle = { cols, rows, server, tiles };

  return isSolvable(puzzle) ? puzzle : null;
}

/** Индекс → (багана, мөр). */
export function toXY(puzzle: NetPuzzle, index: number): { col: number; row: number } {
  return { col: index % puzzle.cols, row: Math.floor(index / puzzle.cols) };
}

/** Хөрш тайлын индекс — хөлөгнөөс гарвал `null`. */
export function neighbour(puzzle: NetPuzzle, index: number, dir: number): number | null {
  const { col, row } = toXY(puzzle, index);
  const { dc, dr } = step(dir);
  const nextCol = col + dc;
  const nextRow = row + dr;

  if (nextCol < 0 || nextCol >= puzzle.cols || nextRow < 0 || nextRow >= puzzle.rows) {
    return null;
  }
  return nextRow * puzzle.cols + nextCol;
}

/**
 * Серверээс ХОЛБОГДСОН тайлуудын олонлог.
 *
 * Хоёр тайл нь ЗӨВХӨН хоёулаа бие рүүгээ үзүүртэй үед холбогдоно — нэг
 * талын кабель хөршийнхөө хаалттай хажууд тулбал холболт үүсэхгүй. Энэ бол
 * тоглоомын гол дүрэм бөгөөд дэлгэц дээр «гэрэлтсэн» хэсгийг тодорхойлно.
 */
export function connectedTiles(puzzle: NetPuzzle): Set<number> {
  const seen = new Set<number>([puzzle.server]);
  const queue = [puzzle.server];

  while (queue.length > 0) {
    const index = queue.shift()!;

    for (const dir of ALL_DIRS) {
      if ((puzzle.tiles[index] & dir) === 0) continue;

      const next = neighbour(puzzle, index, dir);
      if (next === null || seen.has(next)) continue;
      if ((puzzle.tiles[next] & opposite(dir)) === 0) continue;

      seen.add(next);
      queue.push(next);
    }
  }

  return seen;
}

/** Хоосон биш тайлуудын тоо — «бүгд холбогдсон уу» гэдгийг шалгахад. */
export function activeTileCount(puzzle: NetPuzzle): number {
  return puzzle.tiles.filter((tile) => tile !== 0).length;
}

/** Бүх тайл серверт холбогдсон эсэх — сурагчийн ялалтын нөхцөл. */
export function isSolved(puzzle: NetPuzzle): boolean {
  return connectedTiles(puzzle).size === activeTileCount(puzzle);
}

/**
 * Хадгалсан (ШИЙДСЭН) байрлал зөв бүтэцтэй эсэх.
 *
 * ⚠ Гогцоо шалгах нь чухал: мод хэлбэртэй сүлжээнд ирмэгийн тоо нь
 * `тайл - 1` байх ёстой. Илүү ирмэг = гогцоо, тэр нь оньсогыг олон
 * шийдэлтэй болгож, «дуусгасан» мэдрэмжийг бүрхэг болгоно.
 */
export function isSolvable(puzzle: NetPuzzle): boolean {
  const active = activeTileCount(puzzle);
  if (active < 2) return false;

  let halfEdges = 0;

  for (let index = 0; index < puzzle.tiles.length; index += 1) {
    const tile = puzzle.tiles[index];
    if (tile === 0) continue;

    for (const dir of ALL_DIRS) {
      if ((tile & dir) === 0) continue;

      const next = neighbour(puzzle, index, dir);
      // Хөлөгнөөс гадагш чиглэсэн, эсвэл хөрш нь хариу үзүүргүй кабель —
      // «хаашаа ч хүрэхгүй утас» тул зөвшөөрөхгүй.
      if (next === null || (puzzle.tiles[next] & opposite(dir)) === 0) return false;

      halfEdges += 1;
    }
  }

  if (halfEdges / 2 !== active - 1) return false; // гогцоотой эсвэл тасархай

  return connectedTiles(puzzle).size === active;
}

/** Тайл нь ТӨГСГӨЛИЙН зангилаа (компьютер) эсэх — ганц үзүүртэй. */
export function isEndpoint(tile: number): boolean {
  return tile !== 0 && (tile & (tile - 1)) === 0;
}

/* -------------------------------------------------------------------------
 * Үүсгэх ба холих
 * ---------------------------------------------------------------------- */

/**
 * Давтагдах санамсаргүй тоо — mulberry32.
 *
 * ⚠ `Math.random()` ХЭРЭГЛЭХГҮЙ: холилтыг дасгалын ID-гаар үрлэснээр
 * хуудсыг сэргээхэд ЯГ ИЖИЛ эхлэл гарна. Эс бөгөөс сурагч хүнд оньсого
 * тохиовол хуудсаа сэргээгээд амархныг нь авах болно — мөн багш "сурагч юу
 * харсан" гэдгийг давтаж чадахгүй.
 */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Мөрийг тогтвортой тоон үр болгоно (дасгалын ID → үр). */
export function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Санамсаргүй ШИЙДСЭН оньсого үүсгэнэ — бүх нүдийг хамарсан МОД.
 *
 * Алгоритм: санамсаргүй гүнзгий хайлт (randomized DFS). Мод учраас гогцоо
 * үүсэхгүй бөгөөд бүх нүд холбогдсон нь баталгаатай — өөрөөр хэлбэл
 * `isSolvable` ҮРГЭЛЖ үнэн байна.
 */
export function generatePuzzle(cols: number, rows: number, rng: () => number): NetPuzzle {
  const total = cols * rows;
  const tiles = new Array<number>(total).fill(0);
  const visited = new Array<boolean>(total).fill(false);

  const start = Math.floor(rng() * total);
  const stack = [start];
  visited[start] = true;

  const puzzle: NetPuzzle = { cols, rows, server: start, tiles };

  while (stack.length > 0) {
    const index = stack[stack.length - 1];

    const options = ALL_DIRS.filter((dir) => {
      const next = neighbour(puzzle, index, dir);
      return next !== null && !visited[next];
    });

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const dir = options[Math.floor(rng() * options.length)];
    const next = neighbour(puzzle, index, dir)!;

    tiles[index] |= dir;
    tiles[next] |= opposite(dir);
    visited[next] = true;
    stack.push(next);
  }

  /**
   * Сервер нь ОЛОН үзүүртэй (салаалсан) нүд байх нь зүйтэй — жинхэнэ
   * сүлжээнд сервер бол төв зангилаа. Ганц үзүүртэй буланд тавибал
   * зурган дээр компьютерээс ялгагдахгүй.
   */
  const hub = tiles.findIndex((tile) => !isEndpoint(tile));
  puzzle.server = hub >= 0 ? hub : start;

  return puzzle;
}

/**
 * Тайл бүрийг санамсаргүй эргүүлж, сурагчид өгөх ЭХЛЭЛ байрлалыг гаргана.
 *
 * ⚠ Эргэлтийн дараа санамсаргүйгээр АЛЬ ХЭДИЙН шийдэгдсэн байж болно
 * (ялангуяа жижиг оньсогод). Тийм тохиолдолд нэг тайлыг албадан эргүүлж,
 * сурагчид ядаж нэг үйлдэл үлдээнэ — эс бөгөөс "дасгал" нь өөрөө дуусчихсан
 * байдалтай нээгдэнэ.
 */
export function scramblePuzzle(puzzle: NetPuzzle, rng: () => number): NetPuzzle {
  const tiles = puzzle.tiles.map((tile) =>
    tile === 0 ? 0 : rotate(tile, Math.floor(rng() * 4))
  );

  const scrambled: NetPuzzle = { ...puzzle, tiles };

  if (isSolved(scrambled)) {
    const movable = tiles.findIndex((tile) => tile !== 0 && rotate(tile) !== tile);
    if (movable >= 0) tiles[movable] = rotate(tiles[movable]);
  }

  return scrambled;
}
