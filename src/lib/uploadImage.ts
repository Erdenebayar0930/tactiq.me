import { apiFetch } from "@/lib/apiClient";

/**
 * Зургийг манай сервер рүү байршуулж, нийтэд харагдах хаягийг буцаана
 * (`POST /api/uploads`). Firebase Storage-ийн оронд.
 *
 * ⚠ Хаягийг профайл/төвд ӨӨРӨӨ бичихгүй — дуудагч `PATCH`-аар тавина.
 */
export async function uploadImage(
  kind: "profile" | "center-logo",
  file: File,
  extra: Record<string, string> = {}
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(extra)) form.append(key, value);

  const { url } = await apiFetch<{ url: string }>(`/api/uploads?kind=${kind}`, {
    method: "POST",
    body: form,
  });
  return url;
}
