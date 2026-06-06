/** Shared rules for ticket attachment selection. Mirrors the backend allow-list. */

export const ATTACHMENT_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function getAttachmentFileType(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

export function isAllowedAttachment(file: File): boolean {
  return (ATTACHMENT_MIMES as readonly string[]).includes(file.type);
}

export interface ValidateResult {
  accepted: File[];
  errors:   string[];
}

/**
 * Merge `incoming` into `existing` while enforcing all attachment rules.
 * Returns the next files array + an array of human-readable error messages
 * for anything we rejected. The caller decides how to display them (toast etc).
 */
export function validateTicketAttachments(
  existing: File[],
  incoming: File[],
): ValidateResult {
  const accepted = [...existing];
  const errors: string[] = [];
  let runningTotal = existing.reduce((s, f) => s + f.size, 0);

  for (const f of incoming) {
    if (accepted.length >= MAX_FILES) {
      errors.push(`Maximum ${MAX_FILES} attachments per ticket.`);
      break;
    }
    if (!isAllowedAttachment(f)) {
      errors.push(`${f.name || "file"}: file type not allowed.`);
      continue;
    }
    if (runningTotal + f.size > MAX_TOTAL_BYTES) {
      errors.push(
        `${f.name || "file"}: would exceed the 5 MB combined limit.`,
      );
      continue;
    }
    if (
      accepted.some((e) => e.name === f.name && e.size === f.size && e.type === f.type)
    ) {
      // Silent de-dupe — picking the same file twice is almost always accidental.
      continue;
    }
    accepted.push(f);
    runningTotal += f.size;
  }

  return { accepted, errors };
}

/** Give a clipboard-pasted blob a safe, predictable filename. */
export function namePastedFile(file: File, index: number): File {
  if (file.name && file.name !== "image.png" && file.name !== "blob") {
    return file;
  }
  const ext = file.type.split("/")[1] ?? "png";
  const stamp = Date.now() + (index ? `-${index}` : "");
  return new File([file], `pasted-image-${stamp}.${ext}`, { type: file.type });
}
