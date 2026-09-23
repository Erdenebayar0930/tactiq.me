import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * СЕРВЕРИЙН ДИСКЭН ДЭЭРХ ЗУРАГ — Firebase Storage-ийн оронд.
 *
 * Профайл зураг, сургалтын төвийн лого зэргийг `UPLOAD_DIR` дотор хадгалж,
 * `/api/uploads/...` route-оор буцааж өгнө.
 *
 * ⚠ `public/` БИШ: Next.js production горимд build-ийн ДАРАА `public/`-д
 * нэмэгдсэн файлыг өгдөггүй. Бас deploy бүрд `git reset --hard` хийгддэг
 * тул репо доторх хавтас эрсдэлтэй — серверт `UPLOAD_DIR`-ийг репогийн
 * ГАДНА (жишээ нь `/var/lib/tactiq/uploads`) тавина.
 *
 * ⚠ Нөөцлөлтөд ОРУУЛНА: энэ хавтас нь сангийн адил орлох боломжгүй.
 */
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), ".uploads")
);

/** Нийтэд харагдах хаягийн угтвар — `app/api/uploads/[...path]/route.ts`. */
export const UPLOAD_URL_PREFIX = "/api/uploads/";

/**
 * Зөвшөөрөгдсөн зургийн төрлүүд — ФАЙЛЫН ЭХНИЙ БАЙТААР танина.
 *
 * ⚠ Клиентийн `file.type`, файлын өргөтгөлд ИТГЭХГҮЙ: `.png` нэртэй HTML
 * файл байршуулж, `text/html`-ээр өгүүлбэл манай домэйн дээр скрипт
 * ажиллана (XSS). SVG-г ч мөн ийм шалтгаанаар хүлээж авахгүй.
 */
const IMAGE_TYPES = [
  { ext: "png", mime: "image/png", test: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", mime: "image/jpeg", test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "gif", mime: "image/gif", test: (b: Buffer) => b.subarray(0, 4).toString("latin1") === "GIF8" },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b: Buffer) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
] as const;

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  IMAGE_TYPES.map((type) => [type.ext, type.mime])
);

/** Хавтасны нэр зөвхөн үсэг, тоо, `_`, `-` — `..` зэргээр гадагш гарахаас сэргийлнэ. */
const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Зургийг хадгалж, нийтэд харагдах хаягийг буцаана.
 *
 * @param folder Жишээ нь `["profile_photos", uid]`.
 * @returns `null` — танигдаагүй (зураг биш) файл.
 */
export async function saveImage(folder: string[], data: Buffer): Promise<string | null> {
  const type = IMAGE_TYPES.find((candidate) => candidate.test(data));
  if (!type) return null;
  if (!folder.every((segment) => SAFE_SEGMENT.test(segment))) return null;

  // Цаг + санамсаргүй — таах боломжгүй, давхардахгүй, файл бүр өөрчлөгдөхгүй
  // тул хөтөч үүрд кэшилж болно.
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${type.ext}`;
  const dir = path.join(UPLOAD_DIR, ...folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), data, { mode: 0o644 });

  return `${UPLOAD_URL_PREFIX}${[...folder, name].join("/")}`;
}

/**
 * `/api/uploads/...` хаягийн хэсгүүдээс дискэн дээрх бүтэн замыг гаргана.
 *
 * @returns `null` — аюултай эсвэл танигдаагүй зам.
 */
export function resolveUploadPath(segments: string[]): { file: string; mime: string } | null {
  if (segments.length < 2) return null;
  const name = segments[segments.length - 1];
  const match = /^[A-Za-z0-9_-]+\.([a-z0-9]+)$/.exec(name);
  const mime = match ? MIME_BY_EXT[match[1]] : undefined;
  if (!mime) return null;
  if (!segments.slice(0, -1).every((segment) => SAFE_SEGMENT.test(segment))) return null;

  const file = path.join(UPLOAD_DIR, ...segments);
  // Давхар хамгаалалт: ямар ч тохиолдолд UPLOAD_DIR-ээс гадагш гарахгүй.
  if (!file.startsWith(UPLOAD_DIR + path.sep)) return null;
  return { file, mime };
}

export async function readUpload(segments: string[]) {
  const resolved = resolveUploadPath(segments);
  if (!resolved) return null;
  try {
    return { data: await readFile(resolved.file), mime: resolved.mime };
  } catch {
    return null;
  }
}

/**
 * Хаяг нь `folder` доторх манай байршуулсан файл эсэх.
 *
 * `folder` нь `["profile_photos", uid]` — ӨӨР хүний хавтсыг зааж буй
 * хаягийг таслахад хэрэглэнэ.
 */
export function isUploadIn(url: string, folder: string[]): boolean {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return false;
  const segments = url.slice(UPLOAD_URL_PREFIX.length).split("/");
  return (
    segments.length === folder.length + 1 &&
    folder.every((segment, index) => segments[index] === segment) &&
    resolveUploadPath(segments) !== null
  );
}

/** Хаяг нь `top` хавтас (жишээ нь "training_centers") доторх манай файл эсэх. */
export function isUploadUnder(url: string, top: string): boolean {
  if (!url.startsWith(`${UPLOAD_URL_PREFIX}${top}/`)) return false;
  return resolveUploadPath(url.slice(UPLOAD_URL_PREFIX.length).split("/")) !== null;
}

/** Манай байршуулсан файлыг устгана — байхгүй бол чимээгүй өнгөрнө. */
export async function deleteUpload(url: string): Promise<void> {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return;
  const resolved = resolveUploadPath(url.slice(UPLOAD_URL_PREFIX.length).split("/"));
  if (!resolved) return;
  await unlink(resolved.file).catch(() => {});
}
