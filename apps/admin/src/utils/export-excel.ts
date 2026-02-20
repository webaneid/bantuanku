import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: "currency" | "date" | "number" | "text";
}

export function exportToExcel(params: {
  data: Record<string, any>[];
  columns: ExportColumn[];
  filename: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  summaryRow?: Record<string, any>;
}) {
  const { data, columns, filename, sheetName = "Laporan", title, subtitle, summaryRow } = params;

  const wb = XLSX.utils.book_new();

  // Build rows
  const rows: any[][] = [];

  // Title row
  if (title) {
    rows.push([title]);
    rows.push([]); // empty spacer
  }

  // Subtitle row (period info)
  if (subtitle) {
    rows.push([subtitle]);
    rows.push([]); // empty spacer
  }

  // Header row
  rows.push(columns.map((col) => col.header));

  // Data rows
  for (const item of data) {
    const row = columns.map((col) => {
      const val = item[col.key];
      if (val === null || val === undefined) return "";
      if (col.format === "currency" && typeof val === "number") {
        return val;
      }
      if (col.format === "date" && val) {
        return typeof val === "string" ? val : new Date(val).toLocaleDateString("id-ID");
      }
      return val;
    });
    rows.push(row);
  }

  // Summary/total row
  if (summaryRow) {
    const totalRow = columns.map((col) => {
      const val = summaryRow[col.key];
      return val !== undefined ? val : "";
    });
    rows.push(totalRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws["!cols"] = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length, 15),
  }));

  // Merge title row across all columns
  if (title) {
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Generate and download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportMultiSheetExcel(params: {
  sheets: {
    name: string;
    data: Record<string, any>[];
    columns: ExportColumn[];
    title?: string;
    subtitle?: string;
    summaryRow?: Record<string, any>;
  }[];
  filename: string;
}) {
  const { sheets, filename } = params;
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const rows: any[][] = [];

    if (sheet.title) {
      rows.push([sheet.title]);
      rows.push([]);
    }

    if (sheet.subtitle) {
      rows.push([sheet.subtitle]);
      rows.push([]);
    }

    rows.push(sheet.columns.map((col) => col.header));

    for (const item of sheet.data) {
      const row = sheet.columns.map((col) => {
        const val = item[col.key];
        if (val === null || val === undefined) return "";
        if (col.format === "currency" && typeof val === "number") return val;
        if (col.format === "date" && val) {
          return typeof val === "string" ? val : new Date(val).toLocaleDateString("id-ID");
        }
        return val;
      });
      rows.push(row);
    }

    if (sheet.summaryRow) {
      const totalRow = sheet.columns.map((col) => {
        const val = sheet.summaryRow![col.key];
        return val !== undefined ? val : "";
      });
      rows.push(totalRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    ws["!cols"] = sheet.columns.map((col) => ({
      wch: col.width || Math.max(col.header.length, 15),
    }));

    if (sheet.title) {
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: sheet.columns.length - 1 } }];
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
