/**
 * АНХНЫ КОД (4-7 нас) — СУМААР зам угсарч зорилгод хүрнэ.
 *
 * ⚠ `server-only` БИШ: клиент компонент, серверийн шалгалт, seed script
 * гурвуулаа импортолдог.
 *
 * ⚠ ЯАГААД `code-maze`-ИЙГ ХЭРЭГЛЭЭГҮЙ ВЭ: тэр дасгал нь «урагш / зүүн
 * эргэх / баруун эргэх» гэсэн ЭРГЭЛТЭН командтай. Эргэлт нь хүүхдээс
 * дүрийн ЧИГЛЭЛИЙГ толгойдоо эргүүлэхийг шаарддаг — 4-7 насанд тэр нь
 * кодчилол биш, орон зайн сэтгэлгээний бие даасан сорилт. Энд харин
 * ҮНЭМЛЭХҮЙ сум (↑↓←→) — хүүхэд дэлгэц дээр харж байгаагаа шууд дарна.
 *
 * ⚠ ЯМАР Ч ЗӨВ ЗАМ ТОХИРНО. Хамгийн богиныг шаардвал хүүхэд зорилгод
 * хүрсэн ч «буруу» гэж хэлэгдэнэ — энэ насанд «хүрлээ» гэдэг нь өөрөө
 * амжилт. Алхмын дээд хязгаар нь зөвхөн мөнхийн гогцоонаас хамгаална.
 */

export const ARROWS = ["U", "D", "L", "R"] as const;
export type Arrow = (typeof ARROWS)[number];

/**
 * Хадгалах хэлбэр: "arrows:<багана>x<мөр>:<эхлэл>:<зорилго>:<нүднүүд>"
 *
 * ⚠ Хэмжээ нь 1-ээс эхэлнэ: 1×N НАРИЙН КОРИДОР нь эхний хичээлүүдэд
 * зориудаар хэрэгтэй — «Дээш» гэж заахад зөвхөн дээш л явж болдог хөлөг
 * нь сумны утгыг үгээр тайлбарлахгүйгээр ойлгуулна. 1×1 нь эхлэл,
 * зорилго давхцах тул доорх шалгалтаар татгалзана.
 */
export const ARROWS_RE = /^arrows:([1-5])x([1-5]):(\d+):(\d+):([.#]+)$/;

export const ARROWS_MIN = 1;
export const ARROWS_MAX = 5;

export type ArrowMaze = {
  cols: number;
  rows: number;
  start: number;
  goal: number;
  /** `true` = хана (орж болохгүй). */
  walls: boolean[];
};

/** Алхмын дээд тоо — мөнхийн оролдлогоос хамгаална. */
export const MAX_STEPS = 12;

export function encodeArrows(maze: ArrowMaze): string {
  const cells = maze.walls.map((wall) => (wall ? "#" : ".")).join("");
  return `arrows:${maze.cols}x${maze.rows}:${maze.start}:${maze.goal}:${cells}`;
}

/**
 * Задалж ШАЛГАНА.
 *
 * ⚠ Зам БАЙГАА эсэхийг ч шалгана: хана нь зорилгыг таслаад байвал хүүхэд
 * хэчнээн оролдсон ч хүрэхгүй.
 */
export function decodeArrows(raw: string | null | undefined): ArrowMaze | null {
  if (typeof raw !== "string") return null;

  const match = ARROWS_RE.exec(raw.trim());
  if (!match) return null;

  const cols = Number(match[1]);
  const rows = Number(match[2]);
  const start = Number(match[3]);
  const goal = Number(match[4]);
  const cells = match[5];

  if (cells.length !== cols * rows) return null;
  if (start === goal) return null;
  if (start < 0 || start >= cols * rows) return null;
  if (goal < 0 || goal >= cols * rows) return null;

  const walls = [...cells].map((cell) => cell === "#");
  if (walls[start] || walls[goal]) return null;

  const maze: ArrowMaze = { cols, rows, start, goal, walls };
  return reachable(maze) ? maze : null;
}

/** Эхлэлээс зорилго руу зам байгаа эсэх (өргөнөөр хайх). */
export function reachable(maze: ArrowMaze): boolean {
  const seen = new Set<number>([maze.start]);
  const queue = [maze.start];

  while (queue.length > 0) {
    const index = queue.shift()!;
    if (index === maze.goal) return true;

    for (const arrow of ARROWS) {
      const next = step(maze, index, arrow);
      if (next === null || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  return false;
}

/**
 * Нэг алхам. Хана эсвэл хөлгийн зах бол `null`.
 *
 * ⚠ Захаас гарахыг АЛДАА гэж үзэхгүй, зүгээр л хөдлөхгүй гэж үзэх ч
 * боломжтой байсан — гэхдээ `null` буцаах нь дэлгэцэнд «болохгүй» гэдгийг
 * шууд харуулах боломж өгнө, хүүхэд яагаад хөдлөөгүйг гайхахгүй.
 */
export function step(maze: ArrowMaze, index: number, arrow: Arrow): number | null {
  const col = index % maze.cols;
  const row = Math.floor(index / maze.cols);

  const nextCol = arrow === "L" ? col - 1 : arrow === "R" ? col + 1 : col;
  const nextRow = arrow === "U" ? row - 1 : arrow === "D" ? row + 1 : row;

  if (nextCol < 0 || nextCol >= maze.cols) return null;
  if (nextRow < 0 || nextRow >= maze.rows) return null;

  const next = nextRow * maze.cols + nextCol;
  return maze.walls[next] ? null : next;
}

export type RunResult = {
  /** Алхам бүрийн дараах байрлал (эхлэл ороогүй). */
  path: number[];
  /** Хэддэх алхам дээр хана мөргөв — мөргөөгүй бол `null`. */
  blockedAt: number | null;
  reachedGoal: boolean;
};

/** Программыг ажиллуулна. */
export function run(maze: ArrowMaze, program: Arrow[]): RunResult {
  const path: number[] = [];
  let at = maze.start;

  for (const [index, arrow] of program.entries()) {
    const next = step(maze, at, arrow);
    if (next === null) return { path, blockedAt: index, reachedGoal: false };
    at = next;
    path.push(at);
  }

  return { path, blockedAt: null, reachedGoal: at === maze.goal };
}

export function isCorrect(maze: ArrowMaze, program: Arrow[]): boolean {
  if (program.length === 0 || program.length > MAX_STEPS) return false;
  return run(maze, program).reachedGoal;
}

/** Хамгийн богино замын алхмын тоо — сэжүүр харуулахад. */
export function shortestSteps(maze: ArrowMaze): number | null {
  const distance = new Map<number, number>([[maze.start, 0]]);
  const queue = [maze.start];

  while (queue.length > 0) {
    const index = queue.shift()!;
    if (index === maze.goal) return distance.get(index)!;

    for (const arrow of ARROWS) {
      const next = step(maze, index, arrow);
      if (next === null || distance.has(next)) continue;
      distance.set(next, distance.get(index)! + 1);
      queue.push(next);
    }
  }

  return null;
}
