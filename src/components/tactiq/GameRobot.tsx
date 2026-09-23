import Image from "next/image";

import { playGameRobot } from "@/lib/tactiq/playGame";

import type { PlayGame } from "@/lib/tactiq/playGame";

/**
 * ТОГЛООМЫН РОБОТ — лобби, өрсөлдөгч хайх, урилгын дэлгэц.
 *
 * ⚠ `Mascot`-ыг ОРЛОВ (тоглох урсгалд): аппын ерөнхий mascot нь титэмтэй,
 * тогоон дээр суусан дүр бөгөөд тоглоомын аль нь ч гэдгийг хэлдэггүй.
 * Тоглогч хайж байх хэдэн секундэд хэрэглэгч «би юу хайж байна?» гэдгээ
 * дүрснээс мэдэх ёстой.
 *
 * ⚠ Баярын дэлгэцэнд `CelebrationVideo`, хожигдолд `EncourageGif`: тэнд
 * дүрс нь тоглоомыг биш, ҮР ДҮНГ илэрхийлдэг — робот нь ямагт нэг
 * хэвийн тул тэр мэдээллийг алдана.
 *
 * ⚠ ЗОЧИНД ХААЛТТАЙ дэлгэцэнд ч робот (`Protected.tsx`): тэнд титэмтэй
 * `Mascot` байсан бөгөөд титэм нь БАЯРЫН дохио тул «юу ч хийгээгүй
 * байхад яагаад баярлав?» гэсэн зөрүү үүсгэж байв.
 *
 * ⚠ Зураг нь ЗАМЫН ДҮРСНҮҮДЭЭС — шинэ файл нэмээгүй (`playGameRobot`).
 */
export function GameRobot({
  game,
  className = "h-24 w-auto",
}: {
  game: PlayGame;
  /** ⚠ ӨНДРӨӨР нь хэмжинэ (`h-*`), өргөнөөр биш: шатар, даамын робот өөр өргөнтэй. */
  className?: string;
}) {
  const robot = playGameRobot(game);

  return (
    <Image
      src={robot.src}
      alt=""
      aria-hidden
      width={robot.width}
      height={robot.height}
      className={`select-none drop-shadow-md ${className}`}
    />
  );
}
