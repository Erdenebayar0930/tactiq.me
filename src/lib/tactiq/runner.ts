"use client";

/**
 * Сурагчийн кодыг ажиллуулах.
 *
 * ХЯЗГААР: зөвхөн JavaScript-ийг ЖИНХЭНЭЭР ажиллуулна. Python-ыг ажиллуулах
 * нь Pyodide (~10MB WASM) татах эсвэл сервер тал дээр sandbox барихыг
 * шаардана — аль нь ч энэ шатанд ороогүй. Тиймээс Python төсөл дээр
 * "боломжгүй" гэж ИЛ хэлнэ. Хуурамч үр дүн үзүүлэх нь хамгийн муу сонголт:
 * сурагч кодоо ажиллаж байна гэж итгээд буруу зүйл сурна.
 */

export type RunOutcome = {
  /** Терминал дээр харагдах мөрүүд */
  lines: string[];
  /** Алдаа гарсан бол — улаанаар харагдана */
  error: string | null;
  /** Ажиллуулах боломжгүй хэл */
  unsupported: boolean;
};

/** Хязгааргүй давталт хөтчийг зогсоохоос сэргийлнэ */
const TIMEOUT_MS = 3000;

/** Хэт олон мөр хэвлэвэл хөтөч удаашрах тул таслана */
const MAX_LINES = 300;

/**
 * JavaScript-ийг Web Worker дотор ажиллуулна.
 *
 * ЯАГААД WORKER ВЭ: `eval` эсвэл `new Function` нь үндсэн урсгал дээр
 * ажиллах тул хязгааргүй давталт бүх хуудсыг МӨНХӨД царцаана — хэрэглэгч
 * табаа хаахаас өөр сонголтгүй болно. Worker-ыг гаднаас нь `terminate()`
 * хийж болно. Мөн worker-т DOM, `document.cookie`, `localStorage` байхгүй
 * тул сурагчийн код өөрийн сессэд хүрч чадахгүй.
 */
export function runJavaScript(code: string): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const source = `
      const lines = [];
      const format = (value) => {
        if (typeof value === "string") return value;
        try { return JSON.stringify(value); } catch { return String(value); }
      };
      const push = (args) => {
        if (lines.length < ${MAX_LINES}) lines.push(args.map(format).join(" "));
      };
      console.log = (...args) => push(args);
      console.info = (...args) => push(args);
      console.warn = (...args) => push(args);
      console.error = (...args) => push(args);

      self.onmessage = (event) => {
        try {
          // Хэрэглэгчийн кодыг функц болгож ороосон нь чухал: дээд түвшний
          // \`return\` зөвшөөрөгдөж, тунхаглалууд worker-ийн глобал орчинг
          // бохирдуулахгүй.
          new Function(event.data)();
          self.postMessage({ lines, error: null });
        } catch (error) {
          self.postMessage({
            lines,
            error: error && error.message ? String(error.message) : String(error),
          });
        }
      };
    `;

    let url: string;
    let worker: Worker;

    try {
      url = URL.createObjectURL(
        new Blob([source], { type: "application/javascript" })
      );
      worker = new Worker(url);
    } catch (error) {
      resolve({
        lines: [],
        error:
          error instanceof Error
            ? error.message
            : "Кодыг ажиллуулах орчин үүсгэж чадсангүй.",
        unsupported: false,
      });
      return;
    }

    // Цэвэрлэгээг НЭГ УДАА гүйцэтгэнэ — timeout ба хариу зэрэг ирж болно.
    let settled = false;
    const finish = (outcome: RunOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(outcome);
    };

    const timer = setTimeout(() => {
      finish({
        lines: [],
        error: `Код ${TIMEOUT_MS / 1000} секундээс удаан ажиллалаа. Хязгааргүй давталт байж магадгүй.`,
        unsupported: false,
      });
    }, TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<{ lines: string[]; error: string | null }>) => {
      finish({
        lines: event.data.lines ?? [],
        error: event.data.error,
        unsupported: false,
      });
    };

    worker.onerror = (event) => {
      finish({
        lines: [],
        error: event.message || "Кодыг ажиллуулахад алдаа гарлаа.",
        unsupported: false,
      });
    };

    worker.postMessage(code);
  });
}

/** Хэлээр нь зөв ажиллуулагч сонгоно. */
export async function runCode(
  language: string,
  code: string
): Promise<RunOutcome> {
  if (language === "javascript") return runJavaScript(code);

  if (language === "html") {
    // HTML-ийг терминал биш, урьдчилан харах цонхонд (iframe) харуулна —
    // энэ функц зөвхөн "терминал гаралт байхгүй" гэдгийг мэдэгдэнэ.
    return { lines: [], error: null, unsupported: false };
  }

  return {
    lines: [],
    error:
      "Python кодыг хөтөч дээр ажиллуулах боломж хараахан нэмэгдээгүй байна. " +
      "Кодоо хадгалаад дараа ажиллуулж болно.",
    unsupported: true,
  };
}
