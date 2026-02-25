import React from 'react';
import { Card } from '../components/ui/card';
import { Loader2 } from 'lucide-react';

export default function MemberDashboard() {
  const memberName = localStorage.getItem('member_name') || 'Member';

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
        Welcome, {memberName}
      </h1>
      <p className="text-sm text-slate-500 mb-6">Your payment dashboard</p>

      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Dashboard coming soon in Phase 3...</p>
      </Card>
    </div>
  );
}
