import { createElement } from "react";
import {
  Award,
  Blocks,
  Boxes,
  Braces,
  Brain,
  Bug,
  Calculator,
  CircleDot,
  Code2,
  Compass,
  Cpu,
  Crown,
  Database,
  FileCode2,
  Flame,
  FolderGit2,
  Gamepad2,
  GitBranch,
  Globe,
  GraduationCap,
  Heart,
  Layers,
  Lightbulb,
  Medal,
  Music,
  Palette,
  Puzzle,
  Repeat,
  Rocket,
  Shapes,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Terminal,
  Trophy,
  Users,
  Variable,
  Zap,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

/**
 * Дүрсний НЭР → компонент.
 *
 * Курс, амжилтын дүрсийг өгөгдлийн санд нэрээр нь хадгалдаг (`icon: "boxes"`)
 * учир админ шинэ курс нэмэхэд код засах шаардлагагүй. Гэвч дурын нэрийг
 * динамикаар импортлох боломжгүй — тиймээс зөвшөөрөгдсөн жагсаалт энд байна.
 *
 * lucide-react-ын БҮХ дүрсийг (1000+) импортлохгүй байгаа нь зориуд: тэр нь
 * клиент бандлыг хэдэн зуун килобайтаар тэлнэ. Шинэ дүрс хэрэгтэй бол
 * ЭНД нэмнэ — админы сонголтын жагсаалт ч эндээс уншигдана.
 */
const ICONS = {
  award: Award,
  blocks: Blocks,
  boxes: Boxes,
  braces: Braces,
  brain: Brain,
  bug: Bug,
  calculator: Calculator,
  "circle-dot": CircleDot,
  code: Code2,
  compass: Compass,
  cpu: Cpu,
  crown: Crown,
  database: Database,
  "file-code": FileCode2,
  flame: Flame,
  folder: FolderGit2,
  game: Gamepad2,
  "git-branch": GitBranch,
  globe: Globe,
  graduation: GraduationCap,
  heart: Heart,
  layers: Layers,
  lightbulb: Lightbulb,
  medal: Medal,
  music: Music,
  palette: Palette,
  puzzle: Puzzle,
  repeat: Repeat,
  rocket: Rocket,
  shapes: Shapes,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  swords: Swords,
  target: Target,
  terminal: Terminal,
  trophy: Trophy,
  users: Users,
  variable: Variable,
  zap: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Админ талын сонголтод — цагаан толгойн дарааллаар */
export const ICON_NAMES = Object.keys(ICONS).sort() as IconName[];

export function resolveIcon(name: string | null | undefined): LucideIcon {
  return ICONS[(name ?? "") as IconName] ?? Code2;
}

/**
 * Нэрээр дүрс зурна. Танихгүй нэр ирвэл `code` рүү унана — хоосон нүх
 * үлдээхээс тодорхойгүй ч харагдах дүрс дээр нь дээр.
 */
export function Icon({
  name,
  className = "size-5",
  strokeWidth = 2,
}: {
  name: string | null | undefined;
  className?: string;
  strokeWidth?: number;
}) {
  // `createElement` ашигласан нь зориуд: JSX дотор `<Component />` гэж
  // бичвэл "render дотор компонент үүсгэлээ" гэсэн дүрэм асдаг. Энд дүрс нь
  // ТОГТМОЛ хүснэгтээс ирдэг тул төлөв дахин эхлэх эрсдэл байхгүй — гэвч
  // шалгагч үүнийг ялгаж чадахгүй. `createElement` нь ижил үр дүнг өгөөд
  // хуурамч анхааруулга үүсгэхгүй.
  return createElement(resolveIcon(name), {
    className,
    strokeWidth,
    "aria-hidden": true,
  });
}
