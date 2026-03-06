// MAX 300 LINES
// Fund Report - Preview Modal Component
import React from 'react';
import { FileText, FileSpreadsheet, X } from 'lucide-react';

/**
 * Renders a preview modal showing member payment table (first 10) + summary table + export buttons.
 */
export default function FundReportPreview({ previewData, category, chapterName, periodLabel, onClose, onExportExcel, onExportPDF }) {
  if (!previewData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="preview-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Report Preview - {previewData.categoryLabel}</h2>
            <p className="text-indigo-200 text-sm">{chapterName} | {periodLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-all"
            data-testid="close-preview-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-4">
          {/* Member Table */}
          <div className="overflow-x-auto mb-6 -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-sm border-collapse" style={{ minWidth: '600px' }}>
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-2 md:px-3 py-2 text-left font-semibold border whitespace-nowrap">Sr</th>
                  <th className="px-2 md:px-3 py-2 text-left font-semibold border whitespace-nowrap">ID</th>
                  <th className="px-2 md:px-3 py-2 text-left font-semibold border whitespace-nowrap sticky left-0 bg-slate-800 z-10">Member Name</th>
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
                    <td className="px-2 md:px-3 py-2 border text-center">{member.sr}</td>
                    <td className="px-2 md:px-3 py-2 border">{member.id}</td>
                    <td className={`px-2 md:px-3 py-2 border font-medium sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>{member.name}</td>
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
            onClick={onExportExcel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#CF2030] text-white rounded-xl font-semibold hover:bg-[#A61926] transition-all"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Download Excel
          </button>
          <button
            onClick={onExportPDF}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#CF2030] text-white rounded-xl font-semibold hover:bg-[#A61926] transition-all"
          >
            <FileText className="w-5 h-5" />
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-500 text-white rounded-xl font-semibold hover:bg-slate-600 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
