import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { ArrowLeft, FileText, FileSpreadsheet, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

export default function FundReports() {
  const navigate = useNavigate();
  
  // State
  const [duration, setDuration] = useState('current_month');
  const [customFromMonth, setCustomFromMonth] = useState(new Date().getMonth() + 1);
  const [customFromYear, setCustomFromYear] = useState(new Date().getFullYear());
  const [customToMonth, setCustomToMonth] = useState(new Date().getMonth() + 1);
  const [customToYear, setCustomToYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('kitty');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [events, setEvents] = useState([]);
  const [chapterName, setChapterName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Options
  const durationOptions = [
    { value: 'current_month', label: 'Current Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'current_fy', label: 'Current Financial Year' },
    { value: 'last_fy', label: 'Last Financial Year' },
    { value: 'custom', label: 'Custom Month Range' },
  ];

  const categoryOptions = [
    { value: 'kitty', label: 'Kitty' },
    { value: 'meetingfee', label: 'Meeting Fee' },
    { value: 'events', label: 'Events' },
  ];
  
  // Month options for custom range
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  
  // Year options (last 3 years + current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  // Load events and chapter info
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsRes, profileRes] = await Promise.all([
          api.get('/admin/fund/events'),
          api.get('/admin/profile')
        ]);
        setEvents(eventsRes.data || []);
        setChapterName(profileRes.data?.chapter_name || 'BNI Chapter');
      } catch (error) {
        console.error('Failed to load data');
      }
    };
    loadData();
  }, []);

  // Helper Functions
  const getSelectedMonths = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const formatKey = (y, m) => {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      return `${monthNames[m]}${String(y).slice(-2)}`;
    };
    
    const formatLabel = (y, m) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[m]}-${String(y).slice(-2)}`;
    };

    switch (duration) {
      case 'current_month':
        return [{ key: formatKey(currentYear, currentMonth), label: formatLabel(currentYear, currentMonth), month: currentMonth + 1, year: currentYear }];
      
      case 'last_month': {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return [{ key: formatKey(lastMonthYear, lastMonth), label: formatLabel(lastMonthYear, lastMonth), month: lastMonth + 1, year: lastMonthYear }];
      }
      
      case 'last_3_months': {
        const months = [];
        for (let i = 2; i >= 0; i--) {
          let m = currentMonth - i;
          let y = currentYear;
          if (m < 0) { m += 12; y -= 1; }
          months.push({ key: formatKey(y, m), label: formatLabel(y, m), month: m + 1, year: y });
        }
        return months;
      }
      
      case 'current_fy': {
        // Indian FY: April to March
        const fyMonths = [];
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        for (let i = 3; i <= 14; i++) {
          const m = i % 12;
          const y = i > 11 ? fyStartYear + 1 : fyStartYear;
          if (y < currentYear || (y === currentYear && m <= currentMonth)) {
            fyMonths.push({ key: formatKey(y, m), label: formatLabel(y, m), month: m + 1, year: y });
          }
        }
        return fyMonths.length > 0 ? fyMonths : [{ key: formatKey(currentYear, currentMonth), label: formatLabel(currentYear, currentMonth), month: currentMonth + 1, year: currentYear }];
      }
      
      case 'last_fy': {
        // Last Indian FY
        const fyMonths = [];
        const fyStartYear = currentMonth >= 3 ? currentYear - 1 : currentYear - 2;
        for (let i = 3; i <= 14; i++) {
          const m = i % 12;
          const y = i > 11 ? fyStartYear + 1 : fyStartYear;
          fyMonths.push({ key: formatKey(y, m), label: formatLabel(y, m), month: m + 1, year: y });
        }
        return fyMonths;
      }
      
      case 'custom': {
        // Custom month range
        const customMonths = [];
        let startYear = customFromYear;
        let startMonth = customFromMonth - 1; // 0-indexed
        let endYear = customToYear;
        let endMonth = customToMonth - 1; // 0-indexed
        
        // Loop through months from start to end
        let y = startYear;
        let m = startMonth;
        while (y < endYear || (y === endYear && m <= endMonth)) {
          customMonths.push({ 
            key: formatKey(y, m), 
            label: formatLabel(y, m), 
            month: m + 1, 
            year: y 
          });
          m++;
          if (m > 11) { m = 0; y++; }
          // Safety limit
          if (customMonths.length > 36) break;
        }
        return customMonths.length > 0 ? customMonths : [{ key: formatKey(currentYear, currentMonth), label: formatLabel(currentYear, currentMonth), month: currentMonth + 1, year: currentYear }];
      }
      
      default:
        return [{ key: formatKey(currentYear, currentMonth), label: formatLabel(currentYear, currentMonth), month: currentMonth + 1, year: currentYear }];
    }
  };

  const getPeriodLabel = () => {
    const months = getSelectedMonths();
    if (months.length > 3) {
      return `${months[0].label} to ${months[months.length - 1].label}`;
    }
    return months.map(m => m.label).join(', ');
  };

  // Fetch data from backend
  const fetchReportData = async () => {
    const months = getSelectedMonths();
    
    // Fetch members
    const membersRes = await api.get('/admin/members');
    const members = membersRes.data.filter(m => m.status === 'Active');
    
    // For each month, fetch all members with their individual amounts
    // Use the /payments?month=X&year=Y API which returns ALL members (both paid and pending)
    // with their individual amounts from member_amounts collection
    const monthPaymentsMap = {};
    
    for (const monthInfo of months) {
      const { month, year, key } = monthInfo;
      
      if (category === 'kitty') {
        const res = await api.get(`/admin/fund/kitty/payments?month=${month}&year=${year}`);
        monthPaymentsMap[key] = res.data || [];
      } else if (category === 'meetingfee') {
        const res = await api.get(`/admin/fund/meetingfee/payments?month=${month}&year=${year}`);
        monthPaymentsMap[key] = res.data || [];
      }
    }
    
    // For events, keep original logic
    let eventPayments = [];
    if (category === 'events') {
      const paymentsRes = await api.get('/admin/fund/events/payments');
      eventPayments = paymentsRes.data || [];
    }
    
    // Build member data with payments
    const memberData = members.map((member, idx) => {
      const memberPayments = {};
      
      months.forEach(monthInfo => {
        const { month, year, key } = monthInfo;
        
        if (category === 'events') {
          // For events, check if member paid for selected event
          const eventPayment = eventPayments.find(
            p => p.member_id === member.member_id && 
                 p.event_id === selectedEvent && 
                 p.status === 'paid'
          );
          const event = events.find(e => e.event_id === selectedEvent);
          memberPayments[key] = {
            amount: event?.amount || 0,
            status: eventPayment ? 'Paid' : 'Pending'
          };
        } else {
          // For kitty/meetingfee - use month-wise data which includes individual amounts
          const monthData = monthPaymentsMap[key] || [];
          const memberData = monthData.find(p => p.member_id === member.member_id);
          
          // memberData already has individual amount from member_amounts collection
          const amount = memberData?.amount || 0;
          const status = memberData?.status === 'paid' ? 'Paid' : 'Pending';
          
          memberPayments[key] = {
            amount: amount,
            status: status,
            paymentMode: memberData?.payment_mode || '-'
          };
        }
      });
      
      return {
        sr: idx + 1,
        id: member.unique_member_id || `BNI${String(idx + 1).padStart(2, '0')}`,
        name: member.full_name,
        payments: memberPayments
      };
    });
    
    return { members: memberData, months };
  };

  // Calculate summary for a month
  const calculateSummary = (members, monthKey, amount) => {
    let total = members.length;
    let paid = 0;
    let pending = 0;
    let received = 0;
    let pendingAmt = 0;

    members.forEach(member => {
      const payment = member.payments?.[monthKey];
      if (payment) {
        if (payment.status === 'Paid') {
          paid++;
          received += payment.amount || 0;
        } else {
          pending++;
          pendingAmt += payment.amount || 0;
        }
      }
    });

    // FIX: Target = Sum of individual amounts (not bulk × count)
    const target = members.reduce((sum, member) => {
      const payment = member.payments?.[monthKey];
      return sum + (payment?.amount || 0);
    }, 0);

    return {
      total,
      paid,
      pending,
      kittyAmt: amount,
      target: target,  // Now using sum of individual amounts
      received,
      pendingAmt
    };
  };

  // Preview Report
  const handlePreview = async () => {
    if (category === 'events' && !selectedEvent) {
      toast.error('Please select an event first');
      return;
    }
    
    setIsLoadingPreview(true);
    try {
      const { members, months } = await fetchReportData();
      const categoryLabel = categoryOptions.find(c => c.value === category)?.label || category;
      
      // Calculate summary for each month
      const summaryData = months.map(m => {
        const firstMember = members[0];
        const amount = firstMember?.payments?.[m.key]?.amount || 0;
        return {
          ...calculateSummary(members, m.key, amount),
          month: m.label
        };
      });
      
      setPreviewData({
        members,
        months,
        categoryLabel,
        summary: summaryData
      });
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      toast.error('Failed to load preview');
    }
    setIsLoadingPreview(false);
  };

  // PDF Export - With proper color styling
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { applyPlugin } = await import('jspdf-autotable');
      applyPlugin(jsPDF);
      
      const { members, months } = await fetchReportData();
      const categoryLabel = categoryOptions.find(c => c.value === category)?.label || category;
      
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
      doc.setTextColor(30, 58, 95); // Dark Blue
      doc.text(`FUND REPORT - ${categoryLabel}`, pageWidth / 2, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100); // Gray
      doc.text(`Chapter: ${chapterName}`, pageWidth / 2, 22, { align: 'center' });
      
      const now = new Date();
      const generatedDate = `${now.getDate().toString().padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      doc.text(`Period: ${getPeriodLabel()} | Generated: ${generatedDate}`, pageWidth / 2, 28, { align: 'center' });

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
          fillColor: [30, 58, 95],  // Dark Blue header
          textColor: [255, 255, 255], // White text
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 3
        },
        alternateRowStyles: { fillColor: [248, 249, 250] }, // Light gray alternate rows
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: isLandscape ? 35 : 45, halign: 'left' }
        },
        margin: { left: 10, right: 10 },
        didParseCell: (data) => {
          // Color status cells with proper colors
          if (data.section === 'body') {
            const colIndex = data.column.index;
            // Calculate columns per month: 2 for Kitty/Events, 3 for Meeting Fee (Amount, Status, PayMode)
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
                data.cell.styles.fillColor = [212, 237, 218]; // Light Green bg
                data.cell.styles.textColor = [21, 87, 36];    // Dark Green text
                data.cell.styles.fontStyle = 'bold';
              } else if (status === 'Pending') {
                data.cell.styles.fillColor = [248, 215, 218]; // Light Red/Pink bg
                data.cell.styles.textColor = [114, 28, 36];   // Dark Red text
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
          fillColor: [30, 58, 95],  // Dark Blue
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
    setIsExporting(false);
  };

  // Excel Export - With proper color styling
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const { saveAs } = await import('file-saver');
      
      const { members, months } = await fetchReportData();
      const categoryLabel = categoryOptions.find(c => c.value === category)?.label || category;
      
      const now = new Date();
      const generatedDate = `${now.getDate().toString().padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Check if Meeting Fee category (for Payment Mode column)
      const isMeetingFee = category === 'meetingfee';

      // Build rows
      const rows = [];
      
      // Header rows
      rows.push([`FUND REPORT - ${categoryLabel}`]);
      rows.push([`Chapter: ${chapterName}`]);
      rows.push([`Period: ${getPeriodLabel()} | Generated: ${generatedDate}`]);
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
        fill: { fgColor: { rgb: "1E3A5F" } },  // Dark Blue
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" }
      };
      
      const titleStyle = {
        font: { color: { rgb: "1E3A5F" }, bold: true, sz: 14 },
        alignment: { horizontal: "center" }
      };
      
      const paidStyle = {
        fill: { fgColor: { rgb: "D4EDDA" } },  // Light Green
        font: { color: { rgb: "155724" }, bold: true },  // Dark Green
        alignment: { horizontal: "center" }
      };
      
      const pendingStyle = {
        fill: { fgColor: { rgb: "F8D7DA" } },  // Light Red/Pink
        font: { color: { rgb: "721C24" }, bold: true },  // Dark Red
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
      // Calculate columns per month: 2 for Kitty/Events (Amount, Status), 3 for Meeting Fee (Amount, Status, PayMode)
      const colsPerMonth = isMeetingFee ? 3 : 2;
      
      for (let r = 0; r < members.length; r++) {
        const rowIndex = dataStartRow + r;
        for (let c = 0; c <= lastCol; c++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c });
          if (ws[cellRef]) {
            // Determine column type based on position
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
    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/fund-hub')} data-testid="back-btn">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">Fund Reports</h1>
              <p className="text-xs md:text-sm text-slate-500">Download fund reports</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6" data-testid="fund-reports-card">
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            {/* Duration Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Select Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                data-testid="duration-select"
              >
                {durationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Select Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSelectedEvent('');
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                data-testid="category-select"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Event Dropdown - Only for Events category */}
          {category === 'events' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Select Event
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer"
                data-testid="event-select"
              >
                <option value="">-- Select Event --</option>
                {events.map((event) => (
                  <option key={event.event_id} value={event.event_id}>
                    {event.event_name} - Rs.{event.amount}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Month Range */}
          {duration === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              {/* From Month/Year */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  From Month
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={customFromMonth}
                    onChange={(e) => setCustomFromMonth(parseInt(e.target.value))}
                    className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                    data-testid="custom-from-month"
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={customFromYear}
                    onChange={(e) => setCustomFromYear(parseInt(e.target.value))}
                    className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                    data-testid="custom-from-year"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* To Month/Year */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  To Month
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={customToMonth}
                    onChange={(e) => setCustomToMonth(parseInt(e.target.value))}
                    className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                    data-testid="custom-to-month"
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={customToYear}
                    onChange={(e) => setCustomToYear(parseInt(e.target.value))}
                    className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                    data-testid="custom-to-year"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-200 my-6"></div>

          {/* Preview Button */}
          <button
            onClick={handlePreview}
            disabled={isLoadingPreview || (category === 'events' && !selectedEvent)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md mb-4"
            data-testid="preview-btn"
          >
            <Eye className="w-5 h-5" />
            {isLoadingPreview ? 'Loading Preview...' : 'Preview Report'}
          </button>

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={exportToExcel}
              disabled={isExporting || (category === 'events' && !selectedEvent)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              data-testid="export-excel-btn"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Download Excel
            </button>
            
            <button
              onClick={exportToPDF}
              disabled={isExporting || (category === 'events' && !selectedEvent)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              data-testid="export-pdf-btn"
            >
              <FileText className="w-5 h-5" />
              Download PDF
            </button>
          </div>

          {/* Warning for Events */}
          {category === 'events' && !selectedEvent && (
            <p className="text-amber-600 text-sm mt-4 text-center" data-testid="event-warning">
              Please select an event to download report
            </p>
          )}

          {/* Loading indicator */}
          {isExporting && (
            <p className="text-indigo-600 text-sm mt-4 text-center animate-pulse" data-testid="exporting-indicator">
              Generating report...
            </p>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="preview-modal">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Report Preview - {previewData.categoryLabel}</h2>
                <p className="text-indigo-200 text-sm">{chapterName} | {getPeriodLabel()}</p>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-all"
                data-testid="close-preview-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4">
              {/* Member Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-3 py-2 text-left font-semibold border">Sr</th>
                      <th className="px-3 py-2 text-left font-semibold border">ID</th>
                      <th className="px-3 py-2 text-left font-semibold border">Member Name</th>
                      {previewData.months.map(m => (
                        <React.Fragment key={m.key}>
                          <th className="px-3 py-2 text-center font-semibold border">Amount ({m.label})</th>
                          <th className="px-3 py-2 text-center font-semibold border">Status</th>
                          {category === 'meetingfee' && (
                            <th className="px-3 py-2 text-center font-semibold border">Pay Mode</th>
                          )}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.members.slice(0, 10).map((member, idx) => (
                      <tr key={member.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-3 py-2 border text-center">{member.sr}</td>
                        <td className="px-3 py-2 border">{member.id}</td>
                        <td className="px-3 py-2 border font-medium">{member.name}</td>
                        {previewData.months.map(m => {
                          const payment = member.payments?.[m.key];
                          return (
                            <React.Fragment key={m.key}>
                              <td className="px-3 py-2 border text-right">
                                {payment ? `Rs.${payment.amount}` : '-'}
                              </td>
                              <td className={`px-3 py-2 border text-center font-semibold ${
                                payment?.status === 'Paid' 
                                  ? 'bg-green-100 text-green-700' 
                                  : payment?.status === 'Pending' 
                                    ? 'bg-red-100 text-red-700' 
                                    : ''
                              }`}>
                                {payment?.status || '-'}
                              </td>
                              {category === 'meetingfee' && (
                                <td className="px-3 py-2 border text-center">
                                  {payment?.status === 'Paid' ? (payment?.paymentMode || '-') : '-'}
                                </td>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                    {previewData.members.length > 10 && (
                      <tr className="bg-slate-100">
                        <td colSpan={3 + previewData.months.length * (category === 'meetingfee' ? 3 : 2)} className="px-3 py-2 text-center text-slate-500 italic">
                          ... and {previewData.members.length - 10} more members
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Summary Section */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">SUMMARY</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-700 text-white">
                        <th className="px-3 py-2 border font-semibold">Month</th>
                        <th className="px-3 py-2 border font-semibold">Total</th>
                        <th className="px-3 py-2 border font-semibold">Paid</th>
                        <th className="px-3 py-2 border font-semibold">Pending</th>
                        <th className="px-3 py-2 border font-semibold">Target</th>
                        <th className="px-3 py-2 border font-semibold text-green-300">Received</th>
                        <th className="px-3 py-2 border font-semibold text-red-300">Pending Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.summary.map((s, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2 border font-medium">{s.month}</td>
                          <td className="px-3 py-2 border text-center">{s.total}</td>
                          <td className="px-3 py-2 border text-center">{s.paid}</td>
                          <td className="px-3 py-2 border text-center">{s.pending}</td>
                          <td className="px-3 py-2 border text-right">Rs.{s.target.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 border text-right font-bold text-green-600">Rs.{s.received.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 border text-right font-bold text-red-600">Rs.{s.pendingAmt.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-slate-100 px-6 py-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { setShowPreview(false); exportToExcel(); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Download Excel
              </button>
              <button
                onClick={() => { setShowPreview(false); exportToPDF(); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-all"
              >
                <FileText className="w-5 h-5" />
                Download PDF
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-500 text-white rounded-xl font-semibold hover:bg-slate-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
