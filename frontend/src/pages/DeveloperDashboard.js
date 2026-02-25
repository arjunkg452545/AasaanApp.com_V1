import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  UserCheck, Building2, Users, IndianRupee,
  ChevronRight, Loader2, ArrowRight
} from 'lucide-react';

export default function DeveloperDashboard() {
  const [stats, setStats] = useState({
    total_eds: 0,
    total_chapters: 0,
    total_members: 0,
    total_revenue: 0,
  });
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, subsRes] = await Promise.all([
        api.get('/developer/dashboard/stats'),
        api.get('/developer/subscriptions'),
      ]);
      setStats(statsRes.data);
      setSubscriptions(subsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'expired':
        return 'bg-red-100 text-red-700 hover:bg-red-100';
      case 'pending':
        return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      default:
        return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const recentSubs = subscriptions.slice(0, 5);

  const quickLinks = [
    { label: 'Manage EDs', path: '/developer/eds' },
    { label: 'Subscriptions', path: '/developer/subscriptions' },
    { label: 'Settings', path: '/developer/settings' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your platform</p>
      </div>

      {/* Stats Grid — explicit classes for Tailwind JIT */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total EDs</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_eds}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Chapters</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_chapters}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-violet-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Members</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_members}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-violet-500" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.total_revenue)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <IndianRupee className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Subscriptions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Subscriptions</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-900"
            onClick={() => navigate('/developer/subscriptions')}
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {recentSubs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500 text-sm">No subscriptions yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentSubs.map((sub, idx) => (
              <Card key={sub.id || idx} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <UserCheck className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {sub.ed_name || sub.superadmin_name || 'Unknown ED'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Expires {formatDate(sub.expiry_date || sub.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {sub.plan_type || sub.plan || 'Standard'}
                    </Badge>
                    <Badge className={`text-xs ${statusColor(sub.status)}`}>
                      {sub.status || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.path} to={link.path} className="block">
              <Card className="p-5 hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 group-hover:text-slate-900">
                    {link.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
