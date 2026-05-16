// Authenticated file download helper.
//
// Backend download endpoints sit behind JwtAuthGuard, which only reads the
// Bearer token from the Authorization header. Plain `<a href>` links can't
// carry headers, so we fetch via the shared axios instance (which injects
// the token) and trigger a browser download from the resulting blob.

import { api } from "@/src/services/api";

export async function downloadFile(
  url: string,
  fallbackFilename: string,
): Promise<void> {
  const response = await api.get(url, { responseType: "blob" });

  // Try to honour the server-supplied filename (Content-Disposition: attachment; filename="…")
  const disposition = response.headers?.["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = new Blob([response.data as BlobPart], {
    type: (response.headers?.["content-type"] as string) ?? "application/octet-stream",
  });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href     = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
