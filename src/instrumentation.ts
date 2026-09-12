/**
 * Next.js энэ файлыг сервер асахад НЭГ УДАА дуудна (Node ба Edge хоёуланд).
 *
 * Бодит ажил нь `instrumentation.node.ts` дотор — түүнийг ДИНАМИКААР
 * импортолсон нь зориуд: `process.on` зэрэг Node-ын API-г энд шууд бичвэл
 * бандлагч Edge хувилбарт нь олж, компиляц бүрд анхааруулга өгдөг. Динамик
 * импорт нь нөхцөл биелэхгүй үед огт ачаалагдахгүй.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { registerProcessHandlers } = await import("./instrumentation.node");
  registerProcessHandlers();
}
