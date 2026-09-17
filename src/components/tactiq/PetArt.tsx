import Image from "next/image";

import type { PetSpecies } from "@/lib/tactiq/pets";

/**
 * Тэжээвэр амьтан / ургамлын ЗУРАГ — дэлгүүр, тэжээврийн хуудас,
 * профайл гурвуулаа эндээс зурна.
 *
 * ⚠ НЭГ Л ГАЗАР: урьд нь гурван хуудас тус тусдаа `{species.emoji}`
 * гэж бичдэг байсан тул зургийг эможиор солиход гурвыг нь тус тусад нь
 * засах шаардлагатай байв — нэгийг мартвал нэг хуудсанд эможи, нөгөөд нь
 * зураг гарч, ижил тэжээвэр хоёр өөр биет мэт харагдана.
 *
 * ⚠ `alt` нь ХООСОН, эможи БИШ: зургийн хажууд тэжээврийн НЭР үргэлж
 * бичигдсэн байдаг тул дэлгэц уншигчид давхардуулж хэлэх нь шуугиан.
 */
export function PetArt({
  species,
  size,
  className = "",
}: {
  species: PetSpecies;
  /** Талын урт (px) — дөрвөлжин. */
  size: number;
  className?: string;
}) {
  return (
    <Image
      src={species.image}
      alt=""
      aria-hidden
      width={size}
      height={size}
      /*
       * ⚠ `object-contain`: зураг нь 256×256 дөрвөлжин ч дүрс нь дотор
       * ГОЛЛУУЛСАН, захад тунгалаг зай бий (`scripts`-ийн cut_pets.py).
       * `cover` бол мод, цэцэг зэрэг өргөн дүрсний хажуу тал тайрагдана.
       */
      className={`shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
