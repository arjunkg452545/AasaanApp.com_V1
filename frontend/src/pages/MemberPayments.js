import React from 'react';
import { Card } from '../components/ui/card';
import { Wallet } from 'lucide-react';

export default function MemberPayments() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-6">My Payments</h1>
      <Card className="p-8 text-center">
        <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Payment list coming soon in Phase 3...</p>
      </Card>
    </div>
  );
}
