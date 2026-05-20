const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FileScanResult {
  totalRows:     number;
  validEmails:   string[];
  invalidEntries: { row: number; value: string }[];
  duplicates:    number;
  detectedColumn: string | null;
  hasHeaderRow:  boolean;
}

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

    if (firstNonEmpty) {
      firstNonEmpty = false;
      const emailCellIdx = cells.findIndex((c) => EMAIL_RE.test(c.toLowerCase()));

      if (emailCellIdx === -1) {
        result.hasHeaderRow = true;
        const headerIdx = cells.findIndex((c) => /e?-?mail/i.test(c));
        emailColIdx = headerIdx === -1 ? 0 : headerIdx;
        result.detectedColumn = cells[emailColIdx] || "email";
        continue;
      }

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
