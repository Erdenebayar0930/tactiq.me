/**
 * Эрхийн дүрэм — сервер (API route) ба клиент (UI) хоёул ЭНЭ файлыг уншина.
 *
 * UI дээрх disabled төлөв нь зөвхөн тав тухын үүрэгтэй; жинхэнэ шийдвэрийг
 * /api/users/[uid] route энэ л функцүүдээр гаргана.
 */

/**
 * ⚠ "student" нь хуучин "user"-ийн орлого. Өмнөх бүртгэлүүд санд ЛИТЕРАЛЬ
 * "user" гэсэн утгатай хэвээр үлдэнэ (миграц хийгээгүй) — `asRole()` доор
 * түүнийг "student" рүү буулгаж, кодын бусад хэсэгт "user" гэдэг утга ХЭЗЭЭ Ч
 * гарч ирэхгүй байхыг баталгаажуулна.
 */
export type UserRole = "super" | "admin" | "teacher" | "parent" | "student";
/**
 * active — хэвийн. Tactiq дээр сурагч бүртгүүлмэгц ЭНЭ төлөвт орно.
 * pending — зөвшөөрөл хүлээж буй (сургуулийн хаалттай горимд).
 * blocked — админ түр хаасан.
 */
export type UserStatus = "active" | "pending" | "blocked";

/**
 * Том тоо = өндөр эрх. Харьцуулалт бүр энэ шатлалаар явна.
 *
 * Багш, эцэг эх, сурагч нь ЗЭРЭГЦЭЭ эрх — аль нь ч нөгөөгөө удирдахгүй,
 * зөвхөн admin/super л тэднийг удирдана (`canActOn` дараах жагсаалтад).
 */
export const roleRank: Record<UserRole, number> = {
  super: 3,
  admin: 2,
  teacher: 1,
  parent: 1,
  student: 1,
};

export const isAdminRole = (role?: string | null): boolean =>
  role === "admin" || role === "super";

export const isSuperRole = (role?: string | null): boolean => role === "super";

export const isTeacherRole = (role?: string | null): boolean => role === "teacher";

export const isParentRole = (role?: string | null): boolean => role === "parent";

export const isStudentRole = (role?: string | null): boolean =>
  role === "student" || role === "user";

export const asRole = (role?: string | null): UserRole => {
  if (
    role === "super" ||
    role === "admin" ||
    role === "teacher" ||
    role === "parent"
  ) {
    return role;
  }
  // "student" ба хуучин "user" (шилжилтийн өмнөх мөрүүд) хоёулаа сурагч.
  return "student";
};

/** Тухайн эрхийн хэрэглэгч нэвтэрч орох ёстой үндсэн хуудас. */
export const homeForRole = (_role: UserRole): string => "/profile";

/**
 * Нэмэлт эрх — зөвхөн "teacher" | "parent" хосын хоёр дахь тал. Эцэг эх
 * (үндсэн `role`) мөн багш байж болно гэдгийг илэрхийлнэ — эсвэл эсрэгээр.
 */
export type SecondaryRole = "teacher" | "parent";

export const asSecondaryRole = (value?: string | null): SecondaryRole | null =>
  value === "teacher" || value === "parent" ? value : null;

/** `hasRole`-д дамжуулах хамгийн бага мэдээлэл — сервер (UserRow), клиент (PublicUser) хоёул тохирно. */
export type RoleHolder = { role?: string | null; secondaryRole?: string | null };

/**
 * Хэрэглэгч ЭНЭ эрхээр (үндсэн эсвэл нэмэлт) ажиллаж чадах эсэх.
 *
 * ⚠ Зөвхөн ГАНЦ хос дэмжигдэнэ (teacher ↔ parent) — `secondaryRole` бусад
 * утгыг ХЭЗЭЭ Ч агуулахгүй тул `target` нь "student"/"admin"/"super" бол
 * үндсэн `role`-оор л шийдэгдэнэ (`asSecondaryRole` тэдгээрийг таньдаггүй).
 */
export const hasRole = (user: RoleHolder, target: UserRole): boolean =>
  asRole(user.role) === target || asSecondaryRole(user.secondaryRole) === target;

/** actor нь target-аас ЧАНД дээгүүр эрхтэй эсэх (ижил эрх → false). */
export const outranks = (actor: UserRole, target: UserRole): boolean =>
  roleRank[actor] > roleRank[target];

/** Шийдвэр гаргахад хэрэгтэй хамгийн бага мэдээлэл */
export type Actor = { uid: string; role: UserRole };
export type Target = { uid: string; role: UserRole };

/**
 * actor нь target дээр үйлдэл хийж болох эсэх (өөрийг нь тусад нь шалгана).
 *
 * Супер админ бол оройн эрх тул хэнийг ч удирдана — түүнийг барих ганц
 * хамгаалалт нь `keepsLastSuper`. Админ зөвхөн өөрөөсөө доогуурыг удирдана,
 * ингэснээр админууд бие биенээ хааж чадахгүй.
 */
export const canActOn = (actor: Actor, target: Target): boolean =>
  isSuperRole(actor.role) || outranks(actor.role, target.role);

export type Permission =
  | { allowed: true }
  | { allowed: false; reason: string };

const allow: Permission = { allowed: true };
const deny = (reason: string): Permission => ({ allowed: false, reason });

/**
 * Эрх (role) олгох — ЗӨВХӨН супер админ.
 *
 * Энгийн админд эрх олгох эрх өгвөл тэрээр хамтрагчаа super болгоод дамжуулан
 * өөрийгөө дэвшүүлэх боломжтой болно.
 */
export function canAssignRoles(actor: Actor, target: Target): Permission {
  if (!isSuperRole(actor.role)) {
    return deny("Эрх олгох, өөрчлөх нь зөвхөн супер админд боломжтой.");
  }

  if (actor.uid === target.uid) {
    return deny(
      "Өөрийн эрхийг өөрчлөх боломжгүй. Өөр супер админаар дамжуулна уу."
    );
  }

  return allow;
}

/** Тодорхой эрх рүү шилжүүлэх боломжтой эсэх. */
export function canChangeRole(
  actor: Actor,
  target: Target,
  nextRole: UserRole
): Permission {
  const base = canAssignRoles(actor, target);
  if (!base.allowed) return base;

  if (target.role === nextRole) {
    return deny("Хэрэглэгч аль хэдийн энэ эрхтэй байна.");
  }

  return allow;
}

/**
 * Төлөв солих (зөвшөөрөх / хаах) — админ ба супер админ хийнэ, гэхдээ зөвхөн
 * өөрөөсөө доогуур эрхтэй хэрэглэгч дээр. Ингэснээр админ нь супер админыг,
 * эсвэл өөр нэг админыг хааж чадахгүй.
 */
export function canChangeStatus(actor: Actor, target: Target): Permission {
  if (!isAdminRole(actor.role)) {
    return deny("Зөвхөн админ хийх боломжтой үйлдэл.");
  }

  if (actor.uid === target.uid) {
    return deny("Өөрийн бүртгэлийн төлөвийг өөрчлөх боломжгүй.");
  }

  if (!canActOn(actor, target)) {
    return deny(
      "Өөртэй чинь ижил буюу дээгүүр эрхтэй хэрэглэгчийг өөрчлөх боломжгүй."
    );
  }

  return allow;
}

/**
 * Систем эзэнгүй үлдэхээс сэргийлнэ — идэвхтэй супер админ хэзээ ч 0 болж
 * болохгүй. `activeSuperCount` нь өөрчлөлт хийхээс ӨМНӨХ тоо.
 */
export function keepsLastSuper(
  target: Target,
  activeSuperCount: number,
  change: { nextRole?: UserRole; nextStatus?: UserStatus }
): Permission {
  if (target.role !== "super" || activeSuperCount > 1) return allow;

  if (change.nextRole !== undefined && change.nextRole !== "super") {
    return deny("Системд дор хаяж нэг идэвхтэй супер админ байх ёстой.");
  }

  if (change.nextStatus !== undefined && change.nextStatus !== "active") {
    return deny("Системд дор хаяж нэг идэвхтэй супер админ байх ёстой.");
  }

  return allow;
}

export const roleLabels: Record<UserRole, string> = {
  super: "Супер админ",
  admin: "Админ",
  teacher: "Багш",
  parent: "Эцэг эх",
  student: "Сурагч",
};

export const roleDescriptions: Record<UserRole, string> = {
  super: "Бүх эрх — админ томилох, хэрэглэгч хаах, системийг бүрэн удирдах.",
  admin: "Хэрэглэгчийн бүртгэл, эрх, төлөв удирдах. Эрх олгох боломжгүй.",
  teacher: "Багшийн эрхтэй хэрэглэгч.",
  parent: "Эцэг эхийн эрхтэй хэрэглэгч.",
  student: "Энгийн хэрэглэгч.",
};

export const statusLabels: Record<UserStatus, string> = {
  active: "Идэвхтэй",
  pending: "Хүлээгдэж буй",
  blocked: "Хаагдсан",
};
