import React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Wallet } from 'lucide-react';

export default function MemberPaymentDetail() {
  const { ledgerId } = useParams();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-6">Payment Detail</h1>
      <Card className="p-8 text-center">
        <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Payment detail page coming in Phase 3...</p>
        <p className="text-xs text-slate-400 mt-2">Ledger ID: {ledgerId}</p>
      </Card>
    </div>
  );
}
