// MAX 300 LINES
// Fund Report - Excel Export
import { toast } from 'sonner';

/**
 * Exports fund report data to a styled Excel file.
 * Uses xlsx-js-style and file-saver (dynamic import).
 */
export default async function exportToExcel({
  api,
  category,
  categoryLabel,
  chapterName,
  periodLabel,
  getSelectedMonths,
  calculateSummary,
  fetchReportData,
  duration,
  customFromMonth,
  customFromYear,
  customToMonth,
  customToYear,
  selectedEvent,
  events
}) {
  try {
    const XLSX = await import('xlsx-js-style');
    const { saveAs } = await import('file-saver');

    const { members, months } = await fetchReportData(
      api, category, duration, customFromMonth, customFromYear, customToMonth, customToYear, selectedEvent, events
    );

    const now = new Date();
    const generatedDate = `${now.getDate().toString().padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Check if Meeting Fee category (for Payment Mode column)
    const isMeetingFee = category === 'meetingfee';

    // Build rows
    const rows = [];

    // Header rows
    rows.push([`FUND REPORT - ${categoryLabel}`]);
    rows.push([`Chapter: ${chapterName}`]);
    rows.push([`Period: ${periodLabel} | Generated: ${generatedDate}`]);
    rows.push([]);

    // Table headers
    const headers = ['Sr', 'ID', 'Member Name'];
    months.forEach(m => {
      headers.push(`Amount (${m.label})`);
      headers.push('Status');
      if (isMeetingFee) {
        headers.push('Pay Mode');
      }
    });
    rows.push(headers);

    // Table data
    members.forEach(member => {
      const row = [member.sr, member.id, member.name];
      months.forEach(m => {
        const payment = member.payments?.[m.key];
        row.push(payment ? `Rs.${payment.amount}` : '-');
        row.push(payment?.status || '-');
        if (isMeetingFee) {
          row.push(payment?.status === 'Paid' ? (payment?.paymentMode || '-') : '-');
        }
      });
      rows.push(row);
    });

    // Empty row before summary
    rows.push([]);
    rows.push(['SUMMARY']);

    // Summary headers
    const summaryHeaders = ['Month', 'Total', 'Paid', 'Pending', 'Target', 'Received', 'Pending Amt'];
    rows.push(summaryHeaders);

    // Summary data
    months.forEach(m => {
      const firstMember = members[0];
      const amount = firstMember?.payments?.[m.key]?.amount || 0;
      const summary = calculateSummary(members, m.key, amount);
      rows.push([
        m.label,
        summary.total,
        summary.paid,
        summary.pending,
        `Rs.${summary.target.toLocaleString('en-IN')}`,
        `Rs.${summary.received.toLocaleString('en-IN')}`,
        `Rs.${summary.pendingAmt.toLocaleString('en-IN')}`
      ]);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 5 },   // Sr
      { wch: 14 },  // ID
      { wch: 28 },  // Name
      { wch: 16 },  // Amount 1
      { wch: 12 },  // Status 1
      { wch: 16 },  // Amount 2
      { wch: 12 },  // Status 2
      { wch: 16 },  // Amount 3
      { wch: 12 },  // Status 3
    ];

    // Merge header cells
    const lastCol = headers.length - 1;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    ];

    // Define styles
    const headerStyle = {
      fill: { fgColor: { rgb: "1E3A5F" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const titleStyle = {
      font: { color: { rgb: "1E3A5F" }, bold: true, sz: 14 },
      alignment: { horizontal: "center" }
    };

    const paidStyle = {
      fill: { fgColor: { rgb: "D4EDDA" } },
      font: { color: { rgb: "155724" }, bold: true },
      alignment: { horizontal: "center" }
    };

    const pendingStyle = {
      fill: { fgColor: { rgb: "F8D7DA" } },
      font: { color: { rgb: "721C24" }, bold: true },
      alignment: { horizontal: "center" }
    };

    const summaryReceivedStyle = {
      font: { color: { rgb: "155724" }, bold: true },
      alignment: { horizontal: "right" }
    };

    const summaryPendingStyle = {
      font: { color: { rgb: "721C24" }, bold: true },
      alignment: { horizontal: "right" }
    };

    // Apply title styles (rows 0-2)
    for (let c = 0; c <= lastCol; c++) {
      const cellRef0 = XLSX.utils.encode_cell({ r: 0, c });
      const cellRef1 = XLSX.utils.encode_cell({ r: 1, c });
      const cellRef2 = XLSX.utils.encode_cell({ r: 2, c });
      if (ws[cellRef0]) ws[cellRef0].s = titleStyle;
      if (ws[cellRef1]) ws[cellRef1].s = { ...titleStyle, font: { ...titleStyle.font, sz: 11 } };
      if (ws[cellRef2]) ws[cellRef2].s = { ...titleStyle, font: { ...titleStyle.font, sz: 10, bold: false } };
    }

    // Apply header styles (row 4 - index 4 because of empty row)
    const headerRow = 4;
    for (let c = 0; c <= lastCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow, c });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    }

    // Apply data styles (rows 5 to 5 + members.length - 1)
    const dataStartRow = 5;
    const colsPerMonth = isMeetingFee ? 3 : 2;

    for (let r = 0; r < members.length; r++) {
      const rowIndex = dataStartRow + r;
      for (let c = 0; c <= lastCol; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c });
        if (ws[cellRef]) {
          if (c >= 3) {
            const relativeCol = (c - 3) % colsPerMonth;
            const isStatusCol = relativeCol === 1;

            if (isStatusCol) {
              const cellValue = ws[cellRef].v;
              if (cellValue === 'Paid') {
                ws[cellRef].s = paidStyle;
              } else if (cellValue === 'Pending') {
                ws[cellRef].s = pendingStyle;
              }
            }
          }
        }
      }
    }

    // Summary header row
    const summaryTitleRow = dataStartRow + members.length + 1; // +1 for empty row
    const summaryHeaderRow = summaryTitleRow + 1;

    // Style SUMMARY title
    const summaryTitleRef = XLSX.utils.encode_cell({ r: summaryTitleRow, c: 0 });
    if (ws[summaryTitleRef]) {
      ws[summaryTitleRef].s = { ...titleStyle, font: { ...titleStyle.font, sz: 12 } };
    }

    // Style summary headers
    for (let c = 0; c < 7; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: summaryHeaderRow, c });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    }

    // Style summary data rows
    const summaryDataStartRow = summaryHeaderRow + 1;
    for (let r = 0; r < months.length; r++) {
      const rowIndex = summaryDataStartRow + r;
      // Received column (index 5)
      const receivedRef = XLSX.utils.encode_cell({ r: rowIndex, c: 5 });
      if (ws[receivedRef]) ws[receivedRef].s = summaryReceivedStyle;

      // Pending Amt column (index 6)
      const pendingRef = XLSX.utils.encode_cell({ r: rowIndex, c: 6 });
      if (ws[pendingRef]) ws[pendingRef].s = summaryPendingStyle;
    }

    XLSX.utils.book_append_sheet(wb, ws, `${categoryLabel} Report`);

    // Save
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `fund_report_${category}_${now.toISOString().split('T')[0]}.xlsx`;
    saveAs(data, filename);
    toast.success('Excel downloaded successfully');
  } catch (error) {
    console.error('Excel Export failed:', error);
    toast.error('Failed to export Excel');
  }
}
