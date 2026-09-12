/**
 * ГУЛСДАГ ОНЬСОГО (15-puzzle) — тоонуудыг хоосон нүд рүү гулгуулж эмхэлнэ.
 *
 * ⚠ `server-only` БИШ: клиент компонент ба серверийн шалгалт хоёулаа
 * импортолдог.
 */

/** Хадгалах хэлбэр: "slide:<тал>" — жишээ нь "slide:4" (4×4). */
export const SLIDE_RE = /^slide:([3-5])$/;

export const SLIDE_MIN_SIZE = 3;
export const SLIDE_MAX_SIZE = 5;

export type SlideState = {
  size: number;
  /**
   * Нүд бүрийн ЗҮЙ ЁСНЫ дугаар. `0` = хоосон нүд.
   *
   * Шийдсэн байдал: [1, 2, …, n²-1, 0] — сүүлийн нүд хоосон.
   */
  tiles: number[];
};

export function encodeSlide(size: number): string {
  return `slide:${size}`;
}

/** Хадгалсан мөрийг задлаад ШИЙДСЭН байрлал буцаана. */
export function decodeSlide(raw: string | null | undefined): SlideState | null {
  if (typeof raw !== "string") return null;

  const match = SLIDE_RE.exec(raw.trim().toLowerCase());
  if (!match) return null;

  const size = Number(match[1]);
  return solvedSlide(size);
}

export function solvedSlide(size: number): SlideState {
  const total = size * size;
  const tiles = Array.from({ length: total }, (_, index) => (index + 1) % total);
  return { size, tiles };
}

export function isSlideSolved(state: SlideState): boolean {
  const solved = solvedSlide(state.size).tiles;
  return state.tiles.every((tile, index) => tile === solved[index]);
}

/** Хоосон нүдний индекс. */
export function emptyIndex(state: SlideState): number {
  return state.tiles.indexOf(0);
}

/** Тухайн нүд хоосон нүдтэй ХАЖУУГААР зэргэлдээ эсэх — зөвхөн тэр үед гулсана. */
export function canSlide(state: SlideState, index: number): boolean {
  const empty = emptyIndex(state);
  const { size } = state;

  const row = Math.floor(index / size);
  const col = index % size;
  const emptyRow = Math.floor(empty / size);
  const emptyCol = empty % size;

  // Зөвхөн НЭГ тэнхлэгээр, НЭГ нүдээр зөрөх ёстой (диагональ зөвшөөрөхгүй).
  return Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;
}

/** Гулсуулна. Боломжгүй бол ижил төлөв буцаана (мутац хийхгүй). */
export function slide(state: SlideState, index: number): SlideState {
  if (!canSlide(state, index)) return state;

  const tiles = [...state.tiles];
  const empty = emptyIndex(state);
  tiles[empty] = tiles[index];
  tiles[index] = 0;

  return { ...state, tiles };
}

/**
 * Холих — ШИЙДСЭН байрлалаас ХУУЛЬ ЁСНЫ нүүдлүүд хийж холино.
 *
 * ⚠ Тоонуудыг ЗҮГЭЭР Л САНАМСАРГҮЙ байрлуулж БОЛОХГҮЙ: гулсдаг оньсогын
 * зөвшөөрөгдөх байрлалуудын ЯГ ТЭН ХАГАС нь шийдэгдэхГҮЙ (сэлгэлтийн тэгш
 * бус чанар). Тийм байрлал өгвөл сурагч хэдэн цаг оролдоод ч чадахгүй.
 * Шийдсэн байрлалаас нүүдлээр холих нь шийдэгдэх нь БАТАЛГААТАЙ — учир нь
 * нүүдэл бүр буцаагдах боломжтой.
 */
export function scrambleSlide(size: number, rng: () => number, moves = 0): SlideState {
  let state = solvedSlide(size);
  // Хэмжээ том байх тусам илүү их холилт хэрэгтэй — эс бөгөөс 5×5 нь
  // хэдхэн нүүдлээр шийдэгдэх "хуурамч" хүнд харагдана.
  const count = moves || size * size * 8;

  let previousEmpty = -1;

  for (let i = 0; i < count; i += 1) {
    const empty = emptyIndex(state);
    const options: number[] = [];

    for (let index = 0; index < state.tiles.length; index += 1) {
      // Саяхан буцаж очсон нүүдлийг давтахгүй — эс бөгөөс холилт нэг
      // хэсэгт эргэлдэж, оньсого бараг эмхтэй хэвээр үлдэнэ.
      if (index !== previousEmpty && canSlide(state, index)) options.push(index);
    }

    if (options.length === 0) break;

    const pick = options[Math.floor(rng() * options.length)];
    previousEmpty = empty;
    state = slide(state, pick);
  }

  // Санамсаргүйгээр эмхтэй гарвал нэг нүүдэл нэмнэ — «дасгал» нь өөрөө
  // дуусчихсан байдалтай нээгдэхээс сэргийлнэ.
  if (isSlideSolved(state)) {
    const empty = emptyIndex(state);
    const neighbour = state.tiles.findIndex(
      (_, index) => index !== empty && canSlide(state, index)
    );
    if (neighbour >= 0) state = slide(state, neighbour);
  }

  return state;
}

/** Зөв байрандаа буусан тооны тоо — сурагчид явцаа харуулахад. */
export function correctCount(state: SlideState): number {
  const solved = solvedSlide(state.size).tiles;
  return state.tiles.filter((tile, index) => tile !== 0 && tile === solved[index]).length;
}
