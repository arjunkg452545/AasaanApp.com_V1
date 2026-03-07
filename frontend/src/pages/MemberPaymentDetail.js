import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Smartphone, Building2, CreditCard,
  Upload, Camera, CheckCircle2, Clock, XCircle, Copy,
  ExternalLink, AlertCircle, ImageIcon,
} from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  admin_confirmed: 'bg-indigo-100 text-indigo-700',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  waived: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS = {
  pending: 'Pending Payment',
  submitted: 'Proof Submitted',
  admin_confirmed: 'Admin Confirmed',
  verified: 'Payment Verified',
  rejected: 'Rejected - Resubmit',
  waived: 'Fee Waived',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function MemberPaymentDetail() {
  const { ledgerId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [fee, setFee] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Proof form state
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Section toggle
  const [showProofForm, setShowProofForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [ledgerId]); // eslint-disable-line

  const loadData = async () => {
    try {
      const [feeRes, infoRes] = await Promise.all([
        api.get(`/member/fees/${ledgerId}`),
        api.get('/member/payment-info'),
      ]);
      setFee(feeRes.data);
      setPaymentInfo(infoRes.data);

      // Auto-show proof form for pending/rejected
      if (['pending', 'rejected'].includes(feeRes.data.status)) {
        setShowProofForm(true);
      }
    } catch {
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpiPay = async () => {
    try {
      const res = await api.get(`/member/upi-link/${ledgerId}`);
      window.open(res.data.upi_link, '_blank');
      setPaymentMethod('upi');
      setShowProofForm(true);
      toast.success('UPI app opened! Submit proof after payment.');
    } catch {
      toast.error('UPI not configured');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleSubmitProof = async () => {
    if (!utrNumber.trim()) {
      toast.error('UTR/Reference number is required');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('payment_method', paymentMethod);
      formData.append('utr_number', utrNumber);
      formData.append('payment_date', paymentDate);
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      await api.post(`/member/fees/${ledgerId}/submit-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Payment proof submitted!');
      loadData();
      setShowProofForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
      </div>
    );
  }

  if (!fee) return null;

  const canSubmit = ['pending', 'rejected'].includes(fee.status);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto" style={{ background: 'var(--nm-bg)' }}>
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/member/payments')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payments
      </Button>

      {/* Fee Header */}
      <Card className="p-4 md:p-6 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>{fee.description}</h1>
          <Badge className={`${STATUS_COLORS[fee.status] || ''}`}>
            {STATUS_LABELS[fee.status] || fee.status}
          </Badge>
        </div>
        <p className="text-2xl font-bold text-[#CF2030]">{formatCurrency(fee.amount)}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--nm-text-muted)' }}>
          {fee.fee_type?.replace('_', ' ')} {fee.month && fee.year ? `| ${fee.month}/${fee.year}` : ''}
        </p>

        {fee.status === 'rejected' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700 font-medium">Payment was rejected</p>
            </div>
            {fee.timeline && fee.timeline.length > 0 && (
              <p className="text-xs text-red-600 mt-1">
                Reason: {fee.timeline[fee.timeline.length - 1]?.note || 'No reason provided'}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Payment Options (only for pending/rejected) */}
      {canSubmit && (
        <>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Payment Options</h2>
          <div className="grid grid-cols-1 gap-2 mb-4">
            {/* UPI Pay */}
            {paymentInfo?.upi_id && (
              <Card
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
                onClick={handleUpiPay}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Pay via UPI</p>
                      <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{paymentInfo.upi_id}</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                </div>
              </Card>
            )}

            {/* Bank Transfer */}
            {paymentInfo?.bank_enabled && paymentInfo?.bank_details && (
              <Card className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>NEFT / IMPS Transfer</p>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    ['Account Name', paymentInfo.bank_details.account_name],
                    ['Account No.', paymentInfo.bank_details.account_number],
                    ['IFSC', paymentInfo.bank_details.ifsc],
                    ['Bank', paymentInfo.bank_details.bank_name],
                    ['Branch', paymentInfo.bank_details.branch],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'var(--nm-bg)' }}>
                      <span style={{ color: 'var(--nm-text-secondary)' }}>{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{value}</span>
                        <button onClick={() => copyToClipboard(value, label)}>
                          <Copy className="h-3.5 w-3.5" style={{ color: 'var(--nm-text-muted)' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => { setPaymentMethod('neft'); setShowProofForm(true); }}
                >
                  I've transferred via NEFT/IMPS
                </Button>
              </Card>
            )}

            {/* Gateway (Coming Soon) */}
            {paymentInfo?.gateway_enabled === false && (
              <Card className="p-4 border-l-4 border-l-slate-300 opacity-60">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" style={{ color: 'var(--nm-text-muted)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--nm-text-secondary)' }}>Pay Online</p>
                    <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>Coming Soon</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Proof Submission Form */}
      {canSubmit && showProofForm && (
        <Card className="p-4 md:p-6 mb-4">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
            <Upload className="h-5 w-5 text-[#CF2030]" />
            Submit Payment Proof
          </h2>
          <div className="space-y-4">
            {/* Payment Method */}
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="neft">NEFT</SelectItem>
                  <SelectItem value="imps">IMPS</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* UTR */}
            <div>
              <Label>UTR / Reference Number *</Label>
              <Input
                value={utrNumber}
                onChange={e => setUtrNumber(e.target.value)}
                placeholder="Enter UTR or transaction reference"
                className="mt-1"
              />
            </div>

            {/* Payment Date */}
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Screenshot Upload */}
            <div>
              <Label>Payment Screenshot</Label>
              <div className="mt-1">
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Payment screenshot"
                      className="w-full max-h-48 object-contain rounded-lg border"
                    />
                    <button
                      onClick={() => { setScreenshot(null); setPreviewUrl(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-lg p-6 text-center hover:border-[#CF2030] hover:bg-red-50/30 transition-colors"
                    style={{ borderColor: 'var(--nm-text-muted)', background: 'var(--nm-surface)' }}
                  >
                    <Camera className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--nm-text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Tap to upload screenshot</p>
                    <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>JPG, PNG (max 5MB)</p>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmitProof}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {submitting ? 'Submitting...' : 'Submit Payment Proof'}
            </Button>
          </div>
        </Card>
      )}

      {/* Existing Proof (for submitted/confirmed) */}
      {fee.proof_file && !canSubmit && (
        <Card className="p-4 mb-4">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
            <ImageIcon className="h-4 w-4" /> Submitted Proof
          </h2>
          <img
            src={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${fee.proof_file.startsWith('/') ? '' : '/uploads/'}${fee.proof_file}`}
            alt="Payment proof"
            className="w-full max-h-64 object-contain rounded-lg border"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {fee.utr_number && (
            <p className="text-xs mt-2" style={{ color: 'var(--nm-text-secondary)' }}>UTR: {fee.utr_number}</p>
          )}
          {fee.payment_method && (
            <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Method: {fee.payment_method?.toUpperCase()}</p>
          )}
        </Card>
      )}

      {/* Payment Status Timeline */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--nm-text-primary)' }}>Payment Progress</h2>
        {/* 4-Step Progress */}
        <div className="flex items-center mb-6">
          {[
            { label: 'Generated', step: 1 },
            { label: 'Submitted', step: 2 },
            { label: 'Admin Verified', step: 3 },
            { label: 'Approved', step: 4 },
          ].map((s, i) => {
            const currentStep = fee.status === 'pending' ? 1 : fee.status === 'submitted' ? 2 : fee.status === 'admin_confirmed' ? 3 : fee.status === 'verified' ? 4 : fee.status === 'rejected' ? 0 : 1;
            const isComplete = s.step <= currentStep;
            const isCurrent = s.step === currentStep;
            return (
              <React.Fragment key={s.step}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isComplete ? 'bg-[#CF2030] text-white' : 'border-2'
                  }`} style={!isComplete ? { borderColor: 'var(--nm-border)', color: 'var(--nm-text-muted)' } : {}}>
                    {isComplete ? '\u2713' : s.step}
                  </div>
                  <span className={`text-[9px] mt-1 text-center ${isCurrent ? 'font-bold' : ''}`} style={{ color: isComplete ? 'var(--nm-text-primary)' : 'var(--nm-text-muted)' }}>
                    {s.label}
                  </span>
                </div>
                {i < 3 && <div className="flex-1 h-0.5 mx-1" style={{ background: s.step < currentStep ? '#CF2030' : 'var(--nm-border)' }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Detailed Timeline */}
        {fee.timeline && fee.timeline.length > 0 && (
          <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--nm-border)' }}>
            {fee.timeline.map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    event.action === 'verified' ? 'bg-green-500' :
                    event.action === 'rejected' ? 'bg-red-500' :
                    event.action === 'admin_confirmed' ? 'bg-indigo-500' :
                    event.action === 'submitted' || event.action === 'resubmitted' ? 'bg-blue-500' :
                    'bg-slate-300'
                  }`} />
                  {i < fee.timeline.length - 1 && <div className="w-px flex-1 my-1" style={{ background: 'var(--nm-border)' }} />}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-xs font-medium capitalize" style={{ color: 'var(--nm-text-primary)' }}>
                    {event.action === 'admin_confirmed' ? 'Verified by Admin' :
                     event.action === 'verified' ? 'Approved by ED/Accountant' :
                     event.action?.replace('_', ' ')}
                  </p>
                  {event.by && <p className="text-[10px]" style={{ color: 'var(--nm-text-secondary)' }}>By: {event.by} ({event.role})</p>}
                  {event.note && <p className="text-xs truncate" style={{ color: 'var(--nm-text-muted)' }}>{event.note}</p>}
                  <p className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>
                    {new Date(event.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
