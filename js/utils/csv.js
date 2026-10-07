/**
 * Exportação de dados (RF11 — relatórios).
 *
 * Gera CSV a partir de uma lista de objetos ou matriz e dispara o download.
 * Também expõe a impressão (relatórios em PDF pelo diálogo do navegador).
 */

const formatCellValue = (value) => {
  if (value === null || value === undefined) return '';
  /* Números viram texto pt-BR (vírgula decimal) para abrir direto no Excel. */
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  return String(value);
};

const escapeCell = (value) => {
  const text = formatCellValue(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Lista de objetos → CSV (cabeçalho a partir das chaves informadas). */
export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCell(column.label)).join(';');
  const body = rows.map((row) =>
    columns
      .map((column) => escapeCell(typeof column.value === 'function' ? column.value(row) : row[column.key]))
      .join(';'),
  );
  return [header, ...body].join('\r\n');
}

export function downloadFile(filename, content, mime = 'text/csv;charset=utf-8') {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([`\uFEFF${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

export function exportCsv(filename, rows, columns) {
  if (!rows || rows.length === 0) return false;
  return downloadFile(filename, toCsv(rows, columns));
}

export function printReport() {
  if (typeof window === 'undefined') return;
  window.print();
}

export const timestampedName = (base, extension = 'csv') => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `${base}-${stamp}.${extension}`;
};
