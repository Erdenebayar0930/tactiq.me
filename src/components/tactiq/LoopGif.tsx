/**
 * ХӨДӨЛГӨӨНТ ЗУРАГ (GIF) — хөлдүү нөөцтэйгээр.
 *
 * ⚠ GIF-ийг ЗОГСООХ АРГАГҮЙ: `<video>` шиг `pause` байхгүй. Тиймээс
 * «хөдөлгөөнийг багасга» (`prefers-reduced-motion`) гэж тохируулсан
 * хэрэглэгчид ХӨЛДҮҮ зургийг тусад нь харуулна. Вестибуляр эмгэг,
 * ADHD-тай хүнд хөдөлгөөнийг зайлсхийх зам байх ЁСТОЙ.
 *
 * ⚠ `next/image` БИШ, ердийн `img`: `next/image` нь GIF-ийг
 * оптимизацлахгүй бөгөөд хөдөлгөөнт эсэхийг мэддэггүй. Мөн хэмжээ нь
 * дуудагч тал бүрд CSS-ээр өгөгддөг (`size-full`, `h-28`) — `next/image`
 * шаардах `width`/`height` нь тэдэнтэй зөрчилдөнө.
 *
 * ⚠ ХОЁР ЗУРАГ ижил классыг авна: хоёулаа ЯГ ижил хүрээнд сууж, зөвхөн
 * аль нь харагдахыг CSS шийднэ — эс бөгөөс тохиргоо солиход байрлал
 * үсэрнэ.
 */
export function LoopGif({
  src,
  still,
  className = "",
}: {
  /** Хөдөлгөөнт хувилбар. */
  src: string;
  /** Хөдөлгөөнгүй нөөц (JPEG) — `prefers-reduced-motion` үед. */
  still: string;
  className?: string;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`motion-reduce:hidden ${className}`} src={src} alt="" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`hidden motion-reduce:block ${className}`} src={still} alt="" aria-hidden />
    </>
  );
}

/**
 * ХОЖИГДСОН ҮЕИЙН ДҮРС — зоригжуулах робот.
 *
 * ⚠ ГУНИГТАЙ дүрс БИШ: хожигдсон хүүхдэд гунигтай дүр нь хожигдлыг
 * «том зүйл» болгоно. Робот инээмсэглэн дэвтрээ нээж сууна — «дараагийн
 * тоглолтод үзэцгээе».
 *
 * ⚠ 192×192, 10fps, 3 сек, 64 өнгө → 248 КБ (эх файл 794 КБ).
 */
export function EncourageGif({ className = "" }: { className?: string }) {
  return (
    <LoopGif src="/videos/encourage.gif" still="/videos/encourage.jpg" className={className} />
  );
}

/**
 * БҮРТГЭЛИЙН УРИЛГЫН ДҮРС — гараа өргөн мэндчилж буй робот.
 *
 * ⚠ ХӨДӨЛГӨӨНТ дүрс нь ХӨЛДҮҮ зургаас илүү: бүртгэлийн урилга нь
 * «хана» шиг мэдрэгддэг мөч бөгөөд хөдөлгөөн нь тэр хананд амь оруулж,
 * «энд хийх зүйл байна» гэдгийг хэлнэ.
 *
 * ⚠ Титэмтэй `Mascot`-ыг ОРЛОВ: титэм нь БАЯРЫН дохио (хичээл дуусгах,
 * ялах). Бүртгэлийн урилга нь баяр БИШ — хэрэглэгч юу ч хийгээгүй
 * байхад баярлах нь зөрүү үүсгэдэг.
 */
export function WelcomeRobotGif({ className = "" }: { className?: string }) {
  return <LoopGif src="/videos/welcome.gif" still="/videos/welcome.jpg" className={className} />;
}
