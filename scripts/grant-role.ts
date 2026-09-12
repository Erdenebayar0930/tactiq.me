/**
 * Хэрэглэгчид эрх олгох CLI — системд супер админ БАЙХГҮЙ үед л хэрэгтэй.
 *
 * Ажиллуулах:
 *   npm run grant:role -- <email> [super|admin|teacher|parent|student]
 *   npm run grant:role -- erdenebayar0930@gmail.com super
 *
 * Эрхийг өгснөөр бүртгэл нь `active` болно. Супер админ гарсны дараа бусад
 * хүнд эрх олгохдоо энэ скриптийг биш, Хэрэглэгчид хуудсыг ашиглана —
 * тэнд эрхийн шатлалын бүх шалгалт хэрэгжинэ.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { appConfig, users } from "../src/lib/db/schema";
import { roleLabels, type UserRole } from "../src/lib/permissions";

const [emailArg, roleArg = "super"] = process.argv.slice(2);

const VALID_ROLES = ["super", "admin", "teacher", "parent", "student"] as const;

if (!emailArg) {
  console.error(
    "Хэрэглээ: npm run grant:role -- <email> [super|admin|teacher|parent|student]"
  );
  process.exit(1);
}

if (!VALID_ROLES.includes(roleArg as (typeof VALID_ROLES)[number])) {
  console.error(`Эрх буруу байна: ${roleArg}. ${VALID_ROLES.join(" | ")} байна.`);
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const role = roleArg as UserRole;

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна (.env.local).");
  process.exit(1);
}

const pool = createDbPool(connectionString);
const db = drizzle(pool);

async function main() {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!existing) {
    console.error(
      `${email} хаягтай бүртгэл Postgres дээр алга. Эхлээд аппаар бүртгүүлнэ үү.`
    );
    process.exitCode = 1;
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ role, status: "active", updatedAt: new Date() })
    .where(eq(users.uid, existing.uid))
    .returning();

  // Анхны админ үүссэн гэдгийг тэмдэглэнэ — бүртгэлийн форм үүнийг уншина
  if (role === "super" || role === "admin") {
    await db
      .insert(appConfig)
      .values({ id: "app", hasAdmin: true })
      .onConflictDoUpdate({ target: appConfig.id, set: { hasAdmin: true } });
  }

  console.log(
    `${updated.email}: ${existing.role} → ${updated.role} (${roleLabels[role]}), төлөв: ${updated.status}`
  );
}

main()
  .catch((error) => {
    console.error("Эрх олгоход алдаа гарлаа:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
