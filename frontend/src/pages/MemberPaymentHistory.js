import React from 'react';
import { Card } from '../components/ui/card';
import { History } from 'lucide-react';

export default function MemberPaymentHistory() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-6">Payment History</h1>
      <Card className="p-8 text-center">
        <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Payment history coming soon in Phase 3...</p>
      </Card>
    </div>
  );
}
