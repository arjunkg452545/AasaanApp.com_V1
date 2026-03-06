// MAX 300 LINES
// Fund Report - PDF Export
import { toast } from 'sonner';

/**
 * Exports fund report data to a styled PDF file.
 * Uses jspdf and jspdf-autotable (dynamic import).
 */
export default async function exportToPDF({
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
    const { jsPDF } = await import('jspdf');
    const { applyPlugin } = await import('jspdf-autotable');
    applyPlugin(jsPDF);

    const { members, months } = await fetchReportData(
      api, category, duration, customFromMonth, customFromYear, customToMonth, customToYear, selectedEvent, events
    );

    // Landscape for 3+ months
    const isLandscape = months.length >= 3;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - Dark Blue title
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 95);
    doc.text(`FUND REPORT - ${categoryLabel}`, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Chapter: ${chapterName}`, pageWidth / 2, 22, { align: 'center' });

    const now = new Date();
    const generatedDate = `${now.getDate().toString().padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    doc.text(`Period: ${periodLabel} | Generated: ${generatedDate}`, pageWidth / 2, 28, { align: 'center' });

    // Check if Meeting Fee category (for Payment Mode column)
    const isMeetingFee = category === 'meetingfee';

    // Build table headers
    const headers = ['Sr', 'ID', 'Member Name'];
    months.forEach(m => {
      headers.push(`Amount (${m.label})`);
      headers.push('Status');
      if (isMeetingFee) {
        headers.push('Pay Mode');
      }
    });

    // Build table data
    const tableData = members.map((member) => {
      const row = [member.sr, member.id, member.name];
      months.forEach(m => {
        const payment = member.payments?.[m.key];
        row.push(payment ? `Rs.${payment.amount}` : '-');
        row.push(payment?.status || '-');
        if (isMeetingFee) {
          row.push(payment?.status === 'Paid' ? (payment?.paymentMode || '-') : '-');
        }
      });
      return row;
    });

    // Main table with proper colors
    doc.autoTable({
      startY: 35,
      head: [headers],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: isLandscape ? 7 : 9,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: isLandscape ? 35 : 45, halign: 'left' }
      },
      margin: { left: 10, right: 10 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const colIndex = data.column.index;
          const colsPerMonth = isMeetingFee ? 3 : 2;
          const relativeCol = (colIndex - 3) % colsPerMonth;
          const isAmountCol = relativeCol === 0 && colIndex >= 3;
          const isStatusCol = relativeCol === 1 && colIndex >= 3;
          const isPayModeCol = isMeetingFee && relativeCol === 2 && colIndex >= 3;

          if (isAmountCol) {
            data.cell.styles.halign = 'right';
          }

          if (isPayModeCol) {
            data.cell.styles.halign = 'center';
          }

          if (isStatusCol) {
            data.cell.styles.halign = 'center';
            const status = data.cell.raw;
            if (status === 'Paid') {
              data.cell.styles.fillColor = [212, 237, 218];
              data.cell.styles.textColor = [21, 87, 36];
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'Pending') {
              data.cell.styles.fillColor = [248, 215, 218];
              data.cell.styles.textColor = [114, 28, 36];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    // Summary Table with proper styling
    const summaryStartY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text('SUMMARY', pageWidth / 2, summaryStartY, { align: 'center' });

    const summaryHeaders = ['Month', 'Total', 'Paid', 'Pending', 'Target', 'Received', 'Pending Amt'];
    const summaryData = months.map(m => {
      const firstMember = members[0];
      const amount = firstMember?.payments?.[m.key]?.amount || 0;
      const summary = calculateSummary(members, m.key, amount);
      return [
        m.label,
        summary.total,
        summary.paid,
        summary.pending,
        `Rs.${summary.target.toLocaleString('en-IN')}`,
        `Rs.${summary.received.toLocaleString('en-IN')}`,
        `Rs.${summary.pendingAmt.toLocaleString('en-IN')}`
      ];
    });

    doc.autoTable({
      startY: summaryStartY + 5,
      head: [summaryHeaders],
      body: summaryData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: 'center',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Received column - Green text
          if (data.column.index === 5) {
            data.cell.styles.textColor = [21, 87, 36];
            data.cell.styles.fontStyle = 'bold';
          }
          // Pending Amt column - Red text
          if (data.column.index === 6) {
            data.cell.styles.textColor = [114, 28, 36];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Save
    const filename = `fund_report_${category}_${now.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast.success('PDF downloaded successfully');
  } catch (error) {
    console.error('PDF Export failed:', error);
    toast.error('Failed to export PDF');
  }
}
