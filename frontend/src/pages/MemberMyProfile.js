import React from 'react';
import { Card } from '../components/ui/card';
import { User } from 'lucide-react';

export default function MemberMyProfile() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-6">My Profile</h1>
      <Card className="p-8 text-center">
        <User className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Profile page coming soon in Phase 3...</p>
      </Card>
    </div>
  );
}
