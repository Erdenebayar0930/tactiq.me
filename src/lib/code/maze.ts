/**
 * КОДЫН ЛАБИРИНТ — сурагч тушаалын дараалал угсарч дүрсээ зорилго руу
 * хүргэнэ (code.org, codeSpark маягийн блок-код).
 *
 * ЯАГААД ЭНЭ ХЭЛБЭР ВЭ: 7-10 насны хүүхэд бичвэр код бичиж чадахгүй ч
 * ДАРААЛАЛ, ДАВТАЛТ гэсэн хоёр үндсэн ойлголтыг бүрэн ойлгодог. Тушаалыг
 * товшиж угсарснаар зөв бичих (синтакс) ачаа арилж, зөвхөн СЭТГЭХҮЙ үлдэнэ.
 *
 * ⚠ `server-only` БИШ: клиент компонент ба серверийн шалгалт хоёулаа
 * импортолдог.
 */

/** Нүдний төрөл. */
export const EMPTY = ".";
export const WALL = "#";
export const START = "S";
export const GOAL = "G";

export type Direction = "N" | "E" | "S" | "W";

/**
 * Хадгалах хэлбэр: "maze:<багана>x<мөр>:<чиглэл>:<нүднүүд>[:<хязгаар>]"
 *
 *   "maze:5x5:E:S...#.###....G............:6"
 *
 * `хязгаар` (заавал биш) нь тушаалын ДЭЭД тоо — давталт заах хичээлд
 * шаардлагатай: хязгаараас богино программ бичихийн тулд сурагч давталт
 * ашиглахаас өөр аргагүй болно.
 */
export const MAZE_RE = /^maze:(\d+)x(\d+):([NESW]):([.#SG]+)(?::(\d+))?$/;

export const MAZE_MIN_SIZE = 3;
export const MAZE_MAX_SIZE = 8;

export type Maze = {
  cols: number;
  rows: number;
  /** Эхлэх нүдний индекс. */
  start: number;
  /** Эхлэх чиглэл. */
  facing: Direction;
  goal: number;
  /** Нүд бүр: `.` хоосон, `#` хана (`S`, `G` нь хоосон гэж тооцогдоно). */
  cells: string[];
  /** Тушаалын дээд тоо (`null` = хязгааргүй). */
  limit: number | null;
};

/* -------------------------------------------------------------------------
 * Программ
 * ---------------------------------------------------------------------- */

/** Энгийн тушаалууд. */
export type Command = "forward" | "left" | "right";

/**
 * Программын нэг зангилаа — тушаал ЭСВЭЛ давталт.
 *
 * ⚠ Давталт нь ЗӨВХӨН НЭГ ДАВХАР үүрлэнэ (`body` дотор дахин давталт
 * байхгүй). Шалтгаан нь сурган зүйн: хоёр давхар давталт нь энэ насны
 * хүүхдэд ойлгоход хүнд бөгөөд UI нь ч гүн модны засварлагч болж хувирна.
 * Хэрэв хожим шаардлагатай бол `body`-г `ProgramNode[]` болгоход хангалттай.
 */
export type ProgramNode =
  | { kind: "cmd"; cmd: Command }
  | { kind: "repeat"; times: number; body: { kind: "cmd"; cmd: Command }[] };

export type Program = ProgramNode[];

/** Давталтын дээд тоо — UI дээр 2..9. */
export const REPEAT_MIN = 2;
export const REPEAT_MAX = 9;

/**
 * Программ дахь ТУШААЛЫН тоо (хязгаартай харьцуулахад).
 *
 * ⚠ Давталтыг НЭГ блок гэж тоолно, дотоод тушаалуудыг ТУСАД нь. Өөрөөр
 * хэлбэл "давтах 4 [урагш]" = 2 блок. Хэрэв задалж (4 тушаал гэж) тоолвол
 * давталт ямар ч хэмнэлт өгөхгүй болж, түүнийг заах дасгал утгагүй болно.
 */
export function programSize(program: Program): number {
  return program.reduce(
    (total, node) => total + (node.kind === "cmd" ? 1 : 1 + node.body.length),
    0
  );
}

/* -------------------------------------------------------------------------
 * Задлах, шалгах
 * ---------------------------------------------------------------------- */

export function encodeMaze(maze: Maze): string {
  const cells = [...maze.cells];
  cells[maze.start] = START;
  cells[maze.goal] = GOAL;

  const limit = maze.limit === null ? "" : `:${maze.limit}`;
  return `maze:${maze.cols}x${maze.rows}:${maze.facing}:${cells.join("")}${limit}`;
}

/**
 * Хадгалсан мөрийг задалж БҮРЭН ШАЛГАНА.
 *
 * ⚠ Зөвхөн хэлбэрийг биш, ШИЙДЭГДЭХ эсэхийг шалгана: эхлэлээс зорилго руу
 * зам байхгүй лабиринт нь сурагчийг мөнхөд гацаана. Хязгаар өгсөн бол
 * ХАМГИЙН БОГИНО программ тэр хязгаарт багтаж байгаа эсэхийг ч шалгана —
 * эс бөгөөс дасгал нь математикийн хувьд шийдэгдэхгүй.
 */
export function decodeMaze(raw: string | null | undefined): Maze | null {
  if (typeof raw !== "string") return null;

  const match = MAZE_RE.exec(raw.trim());
  if (!match) return null;

  const cols = Number(match[1]);
  const rows = Number(match[2]);
  const facing = match[3] as Direction;
  const body = match[4];
  const limit = match[5] ? Number(match[5]) : null;

  if (
    cols < MAZE_MIN_SIZE ||
    cols > MAZE_MAX_SIZE ||
    rows < MAZE_MIN_SIZE ||
    rows > MAZE_MAX_SIZE ||
    body.length !== cols * rows
  ) {
    return null;
  }

  const cells = [...body];
  const start = cells.indexOf(START);
  const goal = cells.indexOf(GOAL);

  // Эхлэл, зорилго ЯГ НЭГ УДАА байх ёстой.
  if (start < 0 || goal < 0 || start === goal) return null;
  if (cells.indexOf(START, start + 1) >= 0 || cells.indexOf(GOAL, goal + 1) >= 0) return null;

  // `S`/`G` нь зөвхөн тэмдэглэгээ — алхахад хоосон нүд.
  cells[start] = EMPTY;
  cells[goal] = EMPTY;

  const maze: Maze = { cols, rows, start, facing, goal, cells, limit };

  // Зам огт байхгүй бол дасгал шийдэгдэхгүй.
  if (shortestProgram(maze) === null) return null;

  if (limit !== null) {
    if (limit > 40) return null;
    // ⚠ Хязгаарыг ЗАДГАЙ уртаар БИШ, ДАВТАЛТЫГ ТООЦСОН зардлаар шалгана —
    // эс бөгөөс давталт заах бүх түвшин татгалзагдана.
    const blocks = minimalBlocks(maze, limit);
    if (blocks === null) return null;
  }

  return maze;
}

/** Индекс → (багана, мөр). */
export function mazeXY(maze: Maze, index: number): { col: number; row: number } {
  return { col: index % maze.cols, row: Math.floor(index / maze.cols) };
}

const STEPS: Record<Direction, { dc: number; dr: number }> = {
  N: { dc: 0, dr: -1 },
  E: { dc: 1, dr: 0 },
  S: { dc: 0, dr: 1 },
  W: { dc: -1, dr: 0 },
};

const RIGHT: Record<Direction, Direction> = { N: "E", E: "S", S: "W", W: "N" };
const LEFT: Record<Direction, Direction> = { N: "W", W: "S", S: "E", E: "N" };

export function turn(facing: Direction, side: "left" | "right"): Direction {
  return side === "right" ? RIGHT[facing] : LEFT[facing];
}

/**
 * Нэг алхам урагш — хана эсвэл ирмэг бол ХӨДӨЛГӨӨНГҮЙ.
 *
 * ⚠ Хана мөргөхийг АЛДАА гэж үзэхгүй, зүгээр л зогсоно. Тоглоомын хувьд
 * "мөргөөд зогсох" нь хүүхдэд юу болсныг харуулдаг; программыг тэр дор нь
 * таслах нь юу болсныг нуух болно.
 */
export function forward(maze: Maze, index: number, facing: Direction): number {
  const { col, row } = mazeXY(maze, index);
  const { dc, dr } = STEPS[facing];
  const nextCol = col + dc;
  const nextRow = row + dr;

  if (nextCol < 0 || nextCol >= maze.cols || nextRow < 0 || nextRow >= maze.rows) {
    return index;
  }

  const next = nextRow * maze.cols + nextCol;
  return maze.cells[next] === WALL ? index : next;
}

/* -------------------------------------------------------------------------
 * Ажиллуулах
 * ---------------------------------------------------------------------- */

export type Frame = { index: number; facing: Direction; blocked: boolean };

/**
 * Программыг ажиллуулж, АЛХАМ БҮРИЙН төлөвийг буцаана.
 *
 * Бүх алхмыг урьдчилан тооцоод дараа нь дэлгэц дээр гүйлгэх нь хамгийн
 * энгийн: тоглуулагч нь зөвхөн массивын индексийг нэмэгдүүлнэ, симуляц ба
 * анимаци хоорондоо холилдохгүй.
 *
 * ⚠ Алхмын ДЭЭД тоо — давталтын тоо их үед (9 × 9 = 81) ч хязгаартай байна.
 * Хязгааргүй бол том давталттай программ хөтчийг түгжиж болзошгүй.
 */
export const MAX_STEPS = 300;

export function runProgram(maze: Maze, program: Program): Frame[] {
  const frames: Frame[] = [];
  let index = maze.start;
  let facing = maze.facing;

  const step = (cmd: Command) => {
    if (frames.length >= MAX_STEPS) return;

    let blocked = false;

    if (cmd === "forward") {
      const next = forward(maze, index, facing);
      blocked = next === index;
      index = next;
    } else {
      facing = turn(facing, cmd);
    }

    frames.push({ index, facing, blocked });
  };

  for (const node of program) {
    if (node.kind === "cmd") {
      step(node.cmd);
      continue;
    }

    for (let i = 0; i < node.times; i += 1) {
      for (const inner of node.body) step(inner.cmd);
    }
  }

  return frames;
}

/** Программ зорилгод хүрсэн эсэх — ялалтын нөхцөл. */
export function reachesGoal(maze: Maze, program: Program): boolean {
  const frames = runProgram(maze, program);
  const last = frames[frames.length - 1];
  return last ? last.index === maze.goal : maze.start === maze.goal;
}

/* -------------------------------------------------------------------------
 * Шийдэгдэх эсэх
 * ---------------------------------------------------------------------- */

/**
 * ХАМГИЙН БОГИНО программын урт (тушаалын тоо) — өргөн хайлтаар.
 *
 * Төлөв нь (нүд, чиглэл) хос: эргэлт нь ч тушаал зарцуулдаг тул зөвхөн
 * зайгаар хэмжвэл буруу хариу гарна. Зам огт байхгүй бол `null`.
 *
 * ⚠ Энэ нь ДАВТАЛТГҮЙ (задгай) программын урт. Хязгаарыг үүнтэй
 * харьцуулахад давталт ашигласан шийдэл нь ҮРГЭЛЖ богино эсвэл тэнцүү тул
 * "хязгаар ≥ хамгийн богино" гэсэн шалгалт нь аюулгүй тал руугаа алдана —
 * шийдэгдэхгүй дасгалыг хэзээ ч зөвшөөрөхгүй.
 */
export function shortestProgram(maze: Maze): number | null {
  const dirs: Direction[] = ["N", "E", "S", "W"];
  const key = (index: number, facing: Direction) => `${index}:${facing}`;

  const seen = new Set<string>([key(maze.start, maze.facing)]);
  let frontier: { index: number; facing: Direction }[] = [
    { index: maze.start, facing: maze.facing },
  ];
  let steps = 0;

  while (frontier.length > 0) {
    if (frontier.some((state) => state.index === maze.goal)) return steps;

    const next: { index: number; facing: Direction }[] = [];

    for (const state of frontier) {
      const moves = [
        { index: forward(maze, state.index, state.facing), facing: state.facing },
        { index: state.index, facing: turn(state.facing, "left") },
        { index: state.index, facing: turn(state.facing, "right") },
      ];

      for (const move of moves) {
        const id = key(move.index, move.facing);
        if (seen.has(id)) continue;
        seen.add(id);
        next.push(move);
      }
    }

    frontier = next;
    steps += 1;

    // Бүх төлөв (нүд × 4 чиглэл) шалгагдсаны дараа ч олдоогүй бол зам алга.
    if (steps > maze.cols * maze.rows * dirs.length) return null;
  }

  return null;
}

/**
 * ХАМГИЙН ЦӨӨН БЛОКИЙН тоо — давталтыг ТООЦСОН.
 *
 * ⚠ ЯАГААД `shortestProgram` ХАНГАЛТГҮЙ ВЭ: тэр нь ЗАДГАЙ (давталтгүй)
 * программын уртыг өгдөг. Давталт заах түвшин нь яг ЭНЭ ялгаан дээр
 * тогтдог — «6 удаа урагш» нь задгайгаар 6 блок, харин
 * «Давтах 6 × [Урагш]» нь ердөө 2 блок. Хязгаарыг задгай урттай
 * харьцуулбал давталтын бүх хичээл «шийдэгдэхгүй» гэж бүрмөсөн
 * татгалзагдана (энэ алдаа seed скрипт дээр бодитоор гарсан).
 *
 * ЗАРДЛЫН ЗАГВАР:
 *   • нэг тушаал                     → 1 блок
 *   • «Давтах k × [нэг тушаал]»      → 2 блок (давталтын блок + дотоод нэг)
 *
 * ⚠ ОЛОН тушаалтай давталтын бие (жишээ нь `Давтах 3 × [Урагш, Баруун]`)
 * энд ТООЦООГДООГҮЙ. Тийм шийдэл нь зөвхөн БАГА зардалтай байх тул энэ
 * тоо нь ДЭЭД хязгаарын үнэлгээ: `minimalBlocks ≤ limit` бол шийдэгдэх нь
 * ЗААВАЛ үнэн. Эсрэгээр нь буруу татгалзал гарч болзошгүй — тэр нь багшид
 * тэр дор нь харагдах тул аюулгүй тал руугаа алдсан нь зөв.
 */
export function minimalBlocks(maze: Maze, cap = 40): number | null {
  const key = (index: number, facing: Direction) => `${index}:${facing}`;

  const best = new Map<string, number>([[key(maze.start, maze.facing), 0]]);

  // Зардал нь зөвхөн 1 эсвэл 2 тул хувин (bucket) дараалал хангалттай —
  // бүрэн Dijkstra-гийн овоолго шаардлагагүй.
  const buckets: { index: number; facing: Direction }[][] = Array.from(
    { length: cap + 1 },
    () => []
  );
  buckets[0].push({ index: maze.start, facing: maze.facing });

  for (let cost = 0; cost <= cap; cost += 1) {
    for (let i = 0; i < buckets[cost].length; i += 1) {
      const state = buckets[cost][i];
      const id = key(state.index, state.facing);
      if ((best.get(id) ?? Infinity) < cost) continue;
      if (state.index === maze.goal) return cost;

      /** Нэг алхмын шилжилтүүд (зардал 1). */
      const singles: { index: number; facing: Direction }[] = [
        { index: forward(maze, state.index, state.facing), facing: state.facing },
        { index: state.index, facing: turn(state.facing, "left") },
        { index: state.index, facing: turn(state.facing, "right") },
      ];

      const moves: { index: number; facing: Direction; cost: number }[] = singles.map(
        (move) => ({ ...move, cost: 1 })
      );

      // «Давтах k × [Урагш]» — k алхам урагш, зардал нь ЯМАГТ 2.
      let walker = state.index;
      for (let k = 2; k <= REPEAT_MAX; k += 1) {
        const next = forward(maze, walker, state.facing);
        if (next === walker) break; // хана — цаашид урагшлахгүй
        walker = next;
        moves.push({ index: walker, facing: state.facing, cost: 2 });
      }

      /*
       * «Давтах k × [Зүүн]» гэх мэт эргэлтийн давталт нь 4-т хуваагдах
       * тохиолдолд л утгатай бөгөөд эргэлт нь дээд тал нь 2 тушаал
       * шаарддаг (3 эргэлт = эсрэг талын 1 эргэлт) тул хэзээ ч хямд
       * биш — зориуд тооцоогүй.
       */

      for (const move of moves) {
        const total = cost + move.cost;
        if (total > cap) continue;

        const moveId = key(move.index, move.facing);
        if ((best.get(moveId) ?? Infinity) <= total) continue;

        best.set(moveId, total);
        buckets[total].push(move);
      }
    }
  }

  // `cap` доторх ямар ч программ зорилгод хүрсэнгүй.
  return null;
}
