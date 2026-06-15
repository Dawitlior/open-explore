/**
 * UIE edge: File → SheetInput[].
 * The ONLY place that knows about XLSX/CSV bytes. Engine core operates on the matrix.
 *
 * Per master plan §"קריאת קבצים":
 *   - .xlsx/.xls → SheetJS, every sheet (table-score picks the right one)
 *   - .csv/.txt/.tsv → PapaParse, single sheet
 *   - .json → not handled here (legacy JSON path still runs in Index.tsx)
 */
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { SheetInput } from './types';

function toCell(c: unknown): string {
  return c == null ? '' : String(c);
}

function isXlsx(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.xlsm') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel';
}

function isCsvLike(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith('.csv') || n.endsWith('.txt') || n.endsWith('.tsv') || file.type === 'text/csv';
}

export async function fileToSheets(file: File): Promise<SheetInput[]> {
  if (isXlsx(file)) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { raw: false });
    return wb.SheetNames.map((name) => ({
      name,
      matrix: (XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' }) as unknown[][])
        .map((r) => (r || []).map(toCell)),
    }));
  }
  if (isCsvLike(file)) {
    const text = await file.text();
    const parsed = Papa.parse<unknown[]>(text, { skipEmptyLines: false });
    return [{
      name: file.name || 'csv',
      matrix: ((parsed.data as unknown[][]) || []).map((r) => (r || []).map(toCell)),
    }];
  }
  // Unknown — try XLSX first (binary), fall back to CSV text
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { raw: false });
    return wb.SheetNames.map((name) => ({
      name,
      matrix: (XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' }) as unknown[][])
        .map((r) => (r || []).map(toCell)),
    }));
  } catch {
    const text = await file.text();
    const parsed = Papa.parse<unknown[]>(text, { skipEmptyLines: false });
    return [{ name: file.name || 'file', matrix: ((parsed.data as unknown[][]) || []).map((r) => (r || []).map(toCell)) }];
  }
}
