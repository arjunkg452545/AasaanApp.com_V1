// MAX 300 LINES
// Fund Report Helpers - Constants, utility functions, and data fetching
import { toast } from 'sonner';

// ─── Constants ───────────────────────────────────────────────────────────────

export const DURATION_OPTIONS = [
  { value: 'current_month', label: 'Current Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'current_fy', label: 'Current Financial Year' },
  { value: 'last_fy', label: 'Last Financial Year' },
  { value: 'custom', label: 'Custom Month Range' },
];

export const CATEGORY_OPTIONS = [
  { value: 'kitty', label: 'Kitty' },
  { value: 'meetingfee', label: 'Meeting Fee' },
  { value: 'events', label: 'Events' },
];

export const MONTH_OPTIONS = [
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

// Year options (last 2 years + current year + next year)
const currentYearNow = new Date().getFullYear();
export const YEAR_OPTIONS = [currentYearNow - 2, currentYearNow - 1, currentYearNow, currentYearNow + 1];

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Returns an array of month objects { key, label, month, year } based on duration.
 */
export function getSelectedMonths(duration, customFromMonth, customFromYear, customToMonth, customToYear) {
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
}

/**
 * Returns a human-readable period label from the selected months.
 */
export function getPeriodLabel(duration, customFromMonth, customFromYear, customToMonth, customToYear) {
  const months = getSelectedMonths(duration, customFromMonth, customFromYear, customToMonth, customToYear);
  if (months.length > 3) {
    return `${months[0].label} to ${months[months.length - 1].label}`;
  }
  return months.map(m => m.label).join(', ');
}

/**
 * Calculates summary stats for a given month across all members.
 */
export function calculateSummary(members, monthKey, amount) {
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

  // Target = Sum of individual amounts (not bulk x count)
  const target = members.reduce((sum, member) => {
    const payment = member.payments?.[monthKey];
    return sum + (payment?.amount || 0);
  }, 0);

  return {
    total,
    paid,
    pending,
    kittyAmt: amount,
    target: target,
    received,
    pendingAmt
  };
}

/**
 * Fetches report data from backend. Returns { members, months }.
 */
export async function fetchReportData(api, category, duration, customFromMonth, customFromYear, customToMonth, customToYear, selectedEvent, events) {
  try {
    const months = getSelectedMonths(duration, customFromMonth, customFromYear, customToMonth, customToYear);

    // Fetch members
    const membersRes = await api.get('/admin/members');
    const allMembers = Array.isArray(membersRes.data) ? membersRes.data : [];
    const members = allMembers.filter(m => (m.status === 'Active' || m.membership_status === 'active'));

    // For each month, fetch all members with their individual amounts
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
          const monthData = monthPaymentsMap[key] || [];
          const mData = monthData.find(p => p.member_id === member.member_id);
          const amount = mData?.amount || 0;
          const status = mData?.status === 'paid' ? 'Paid' : 'Pending';

          memberPayments[key] = {
            amount: amount,
            status: status,
            paymentMode: mData?.payment_mode || '-'
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
  } catch (error) {
    toast.error('Failed to load report data');
    return { members: [], months: [] };
  }
}
