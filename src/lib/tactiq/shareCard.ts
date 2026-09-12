/**
 * Хуваалцах ЗУРАГ — `<canvas>` дээр зурж PNG болгоно.
 *
 * ⚠ ХУУДСЫГ ЗУРАГЖУУЛАХГҮЙ (`html2canvas`, `dom-to-image` г.м.). Тэдгээр
 * сангууд DOM-ыг дахин тайлбарлаж зурдаг тул градиент, `clip-path`, вэб
 * фонт, `backdrop-filter` зэргийг байнга буруу гаргадаг — бидний тэмдэг,
 * медаль ЯГ ТЭДГЭЭР боломжууд дээр баригдсан. Дээрээс нь 50KB+ жин нэмнэ.
 *
 * Оронд нь зориулалтын карт зурна: дэлгэцийн байрлалаас хамаарахгүй,
 * нийгмийн сүлжээнд тохирсон дөрвөлжин хэмжээтэй, үр дүн нь урьдчилан
 * таамаглах боломжтой.
 *
 * ⚠ Клиент тал ЗААВАЛ. Сервер талд (`next/og`/satori) зурвал кирилл
 * үсэгтэй фонтын файлыг гараар ачаалах шаардлагатай болно; хөтөч дээр
 * системийн фонт шууд ажиллана.
 */

/** Instagram/Facebook-д тохирсон дөрвөлжин. */
const SIZE = 1080;

export type ShareCardData = {
  name: string;
  /** Нэрний эхний үсэг — зураг ОРОХГҮЙ (доорх тайлбар). */
  initial: string;
  level: number;
  xp: number;
  streakDays: number;
  leagueLabel: string;
  leagueColor: string;
  unlocked: number;
  total: number;
  brand: string;
  site: string;
};

/** Дугуй булантай тэгш өнцөгт — `roundRect` дэмжигдээгүй хөтчид ч ажиллана. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * Системийн фонтын овоолго.
 *
 * ⚠ Вэб фонт (`Nunito` г.м.) ашиглаж БОЛОХГҮЙ: canvas нь фонт ачаалагдсан
 * эсэхийг хүлээдэггүй тул зураг заримдаа нөөц фонтоор, заримдаа зөвөөр
 * гарч, үр дүн нь тогтворгүй болно. Системийн фонт үргэлж бэлэн байдаг ба
 * кирилл үсгийг бүрэн дэмжинэ.
 */
const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

const text = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: string,
  color: string,
  align: CanvasTextAlign = "center"
) => {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, x, y);
};

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Энэ хөтөч зураг үүсгэхийг дэмжихгүй байна.");

  // --- Дэвсгэр ---------------------------------------------------------
  const background = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  background.addColorStop(0, "#4f46e5");
  background.addColorStop(1, "#7c3aed");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Зөөлөн гэрэлтэлт — хавтгай дэвсгэрийг амьдруулна.
  const glow = ctx.createRadialGradient(SIZE / 2, 300, 0, SIZE / 2, 300, 620);
  glow.addColorStop(0, "rgba(255,255,255,0.18)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // --- Брэнд -----------------------------------------------------------
  text(ctx, data.brand, SIZE / 2, 110, 40, "700", "rgba(255,255,255,0.75)");

  // --- Аватар ----------------------------------------------------------
  /*
   * ⚠ ХЭРЭГЛЭГЧИЙН ЗУРГИЙГ ЗУРАХГҮЙ, зөвхөн эхний үсэг.
   *
   * Гадаад доменоос (Firebase Storage) зураг canvas дээр зурвал `origin-
   * clean` туг арилж, `toBlob()` нь SecurityError шидэнэ — CORS толгой
   * дутуу бол хуваалцах бүхэлдээ ажиллахаа болино. Үсэг нь энэ эрсдэлийг
   * бүрэн арилгаад зогсохгүй, хүүхдийн зургийг нийгмийн сүлжээнд
   * тараахаас ч сэргийлнэ.
   */
  ctx.beginPath();
  ctx.arc(SIZE / 2, 300, 100, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.stroke();
  text(ctx, data.initial, SIZE / 2, 336, 96, "800", "#ffffff");

  // --- Нэр, түвшин -----------------------------------------------------
  const nameSize = fitSize(ctx, data.name, 60, SIZE - 160);
  text(ctx, data.name, SIZE / 2, 470, nameSize, "800", "#ffffff");
  text(
    ctx,
    `${data.level}-р түвшин · ${data.unlocked}/${data.total} тэмдэг`,
    SIZE / 2,
    525,
    34,
    "600",
    "rgba(255,255,255,0.8)"
  );

  // --- Гурван үзүүлэлт -------------------------------------------------
  const tiles = [
    { label: "Оноо", value: data.xp.toLocaleString("mn-MN"), color: "#ffffff" },
    { label: "Дараалал", value: `${data.streakDays}`, color: "#fdba74" },
    { label: "Лиг", value: data.leagueLabel, color: data.leagueColor },
  ];

  const tileWidth = 290;
  const gap = 24;
  const totalWidth = tiles.length * tileWidth + (tiles.length - 1) * gap;
  let x = (SIZE - totalWidth) / 2;

  for (const tile of tiles) {
    roundRect(ctx, x, 600, tileWidth, 200, 36);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fill();

    const center = x + tileWidth / 2;
    const valueSize = fitSize(ctx, tile.value, 58, tileWidth - 48);
    text(ctx, tile.value, center, 700, valueSize, "800", tile.color);
    text(ctx, tile.label, center, 752, 28, "600", "rgba(255,255,255,0.75)");

    x += tileWidth + gap;
  }

  // --- Хаяг ------------------------------------------------------------
  text(ctx, data.site, SIZE / 2, 960, 36, "700", "rgba(255,255,255,0.85)");

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Зураг үүсгэж чадсангүй."));
    }, "image/png");
  });
}

/**
 * Өгөгдсөн өргөнд багтах ҮСГИЙН ХЭМЖЭЭГ буцаана.
 *
 * ⚠ ХЭМЖЭЭ буцаана, бичвэр биш — дуудагч түүнийг `text()`-д дамжуулах
 * ЁСТОЙ. (Эхний хувилбарт энэ функц бичвэрээ буцаадаг байсан тул `text()`
 * фонтоо ХУУЧИН хэмжээгээр дахин тавьж, багтаах ажил бүхэлдээ үрэгддэг
 * байв — canvas дээр ийм алдаа чимээгүй өнгөрдөг, зөвхөн үр дүнгээр нь
 * л мэдэгдэнэ.)
 *
 * ⚠ Таслах (`…`) нь энд тохирохгүй: багтахгүй байгаа зүйл нь ихэвчлэн
 * ХЭРЭГЛЭГЧИЙН НЭР бөгөөд түүнийг таслах нь картын гол зорилгыг сүйтгэнэ.
 */
function fitSize(
  ctx: CanvasRenderingContext2D,
  value: string,
  size: number,
  maxWidth: number
): number {
  let current = size;

  while (current > 20) {
    ctx.font = `800 ${current}px ${FONT}`;
    if (ctx.measureText(value).width <= maxWidth) break;
    current -= 2;
  }

  return current;
}
