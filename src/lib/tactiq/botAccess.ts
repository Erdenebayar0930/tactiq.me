import { isAdminRole } from "@/lib/permissions";

/**
 * БОТООР ДАДЛАГАЖИХ ЭРХ — сервер ба клиент хоёулаа ЭНЭ функцийг уншина.
 *
 * ⚠ Найзтай / санамсаргүй тоглогчтой тоглох нь ҮНЭГҮЙ хэвээр — зөвхөн
 * ботын дадлага Premium. Premium нь `premiumUntil`-аас тооцогдох тул
 * бүртгүүлэхэд өгдөг туршилтын хоног, гэр бүлийн суудал ч орно.
 *
 * ⚠ Админ ҮРГЭЛЖ нээлттэй: ботыг шалгах, засах хүн өөрөө төлбөр төлөх
 * ёсгүй.
 */
export function canPracticeWithBot(user: { isPremium: boolean; role?: string | null } | null | undefined): boolean {
  return !!user && (user.isPremium || isAdminRole(user.role));
}
