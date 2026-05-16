// Client-side scan of a CSV/TXT email file.
//
// Splits on newlines, then on common delimiters (`,`, `;`, `\t`) so a CSV with
// extra columns (name, company, …) is still readable. Each cell is trimmed and
// classified as a valid email, an invalid token, an empty cell, or a header.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FileScanResult {
  totalRows:     number;
  validEmails:   string[];
  invalidEntries: { row: number; value: string }[];
  duplicates:    number;
  detectedColumn: string | null;
  /** True when the first non-empty row had no email-shaped cell. */
  hasHeaderRow:  boolean;
}

/** Strip surrounding quotes a CSV exporter may have wrapped a cell in. */
function unquote(s: string): string {
  return s.replace(/^"(.*)"$/, "$1").trim();
}

function splitRow(line: string): string[] {
  return line.split(/[,;\t]/).map(unquote);
}

export async function scanEmailFile(file: File): Promise<FileScanResult> {
  const text  = await file.text();
  const lines = text.split(/\r?\n/);

  const result: FileScanResult = {
    totalRows:      0,
    validEmails:    [],
    invalidEntries: [],
    duplicates:     0,
    detectedColumn: null,
    hasHeaderRow:   false,
  };

  const seen = new Set<string>();
  let emailColIdx: number | null = null;
  let firstNonEmpty = true;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;

    const cells = splitRow(raw);
    result.totalRows++;

    // First non-empty row: detect header vs. data.
    if (firstNonEmpty) {
      firstNonEmpty = false;
      const emailCellIdx = cells.findIndex((c) => EMAIL_RE.test(c.toLowerCase()));

      if (emailCellIdx === -1) {
        // No email in row 1 → treat as header.
        result.hasHeaderRow = true;
        const headerIdx = cells.findIndex((c) => /e?-?mail/i.test(c));
        emailColIdx = headerIdx === -1 ? 0 : headerIdx;
        result.detectedColumn = cells[emailColIdx] || "email";
        continue;
      }

      // Row 1 is data. Lock onto whichever column had the email.
      emailColIdx = emailCellIdx;
      result.detectedColumn = `column ${emailCellIdx + 1}`;
    }

    const cell = (cells[emailColIdx ?? 0] ?? "").toLowerCase();
    if (!cell) continue;

    if (EMAIL_RE.test(cell)) {
      if (seen.has(cell)) {
        result.duplicates++;
      } else {
        seen.add(cell);
        result.validEmails.push(cell);
      }
    } else {
      result.invalidEntries.push({ row: i + 1, value: cell });
    }
  }

  return result;
}
