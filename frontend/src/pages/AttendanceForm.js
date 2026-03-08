import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, Info } from 'lucide-react';

// Use REACT_APP_API_URL (full URL with /api) or fall back to REACT_APP_BACKEND_URL + /api
const API = process.env.REACT_APP_API_URL || (process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '');

export default function AttendanceForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [type, setType] = useState('substitute');
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  const [selectedForMember, setSelectedForMember] = useState('');
  const [substituteName, setSubstituteName] = useState('');
  const [substituteMobile, setSubstituteMobile] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [visitorBusinessCategory, setVisitorBusinessCategory] = useState('');
  const [visitorBusinessCategoryOther, setVisitorBusinessCategoryOther] = useState('');
  const [invitedByMember, setInvitedByMember] = useState('');

  const navigate = useNavigate();

  // Helper function to scroll submit button into view after dropdown selection
  const scrollToSubmitButton = () => {
    setTimeout(() => {
      const submitBtn = document.querySelector('[data-testid="submit-attendance-btn"]');
      if (submitBtn) {
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300); // Small delay to allow keyboard to close on mobile
  };

  useEffect(() => {
    if (!token) {
      setError(true);
      setLoading(false);
      return;
    }

    // Check if this token was already used (localStorage check)
    const usedTokens = JSON.parse(localStorage.getItem('usedAttendanceTokens') || '[]');
    if (usedTokens.includes(token)) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    // OPTIMIZED: Verify QR first (critical path), then load other things in background
    verifyQR();

    // Non-blocking: Load fingerprint and IP in background (not needed for initial render)
    setTimeout(() => {
      initFingerprint();
      getIPAddress();
    }, 100);
  }, [token]);

  const initFingerprint = async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setDeviceFingerprint(result.visitorId);
    } catch (error) {
      // Silent fallback - don't block UI
      setDeviceFingerprint('device-' + Date.now());
    }
  };

  const getIPAddress = async () => {
    try {
      // Quick timeout - don't wait too long
      const response = await axios.get('https://api.ipify.org?format=json', { timeout: 1500 });
      setIpAddress(response.data.ip);
    } catch (error) {
      // Silent fallback - IP not critical
      setIpAddress('unknown');
    }
  };

  const verifyQR = async () => {
    try {
      // Step 1: Verify QR token (fast)
      const qrResponse = await axios.get(`${API}/qr/verify/${token}`);
      setMeetingInfo(qrResponse.data);

      // Step 2: Fetch members list
      const membersRes = await axios.get(`${API}/members/${qrResponse.data.chapter_id}`);

      // Step 3: Sort alphabetically (A-Z) - quick operation
      const sortedMembers = [...membersRes.data].sort((a, b) =>
        (a.full_name || '').toLowerCase().localeCompare((b.full_name || '').toLowerCase())
      );
      setMembers(sortedMembers);

      // Done - show form immediately
      setLoading(false);
    } catch (err) {
      console.error('QR verification failed:', err);
      setError(true);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let attendanceData = {
        meeting_id: meetingInfo.meeting_id,
        type: type,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress
      };

      if (type === 'substitute') {
        const member = members.find(m => m.member_id === selectedForMember);
        if (!member) {
          toast.error('Please select member');
          setSubmitting(false);
          return;
        }
        attendanceData.unique_member_id = member.unique_member_id;
        attendanceData.substitute_name = substituteName;
        attendanceData.substitute_mobile = substituteMobile;
      } else if (type === 'visitor') {
        const member = members.find(m => m.member_id === invitedByMember);
        if (!member) {
          toast.error('Please select inviting member');
          setSubmitting(false);
          return;
        }
        attendanceData.visitor_name = visitorName;
        attendanceData.visitor_mobile = visitorMobile;
        attendanceData.visitor_email = visitorEmail || undefined;
        attendanceData.visitor_company = visitorCompany;
        attendanceData.visitor_business_category = visitorBusinessCategory === 'Other'
          ? visitorBusinessCategoryOther
          : visitorBusinessCategory || undefined;
        attendanceData.invited_by_member_id = member.unique_member_id;
      }

      const response = await axios.post(`${API}/attendance/mark`, attendanceData);

      // Mark token as used in localStorage to prevent resubmission
      const usedTokens = JSON.parse(localStorage.getItem('usedAttendanceTokens') || '[]');
      usedTokens.push(token);
      // Keep only last 100 tokens to prevent localStorage bloat
      if (usedTokens.length > 100) {
        usedTokens.shift();
      }
      localStorage.setItem('usedAttendanceTokens', JSON.stringify(usedTokens));

      setSuccess(true);
      toast.success('Attendance marked successfully!');

      // Clear URL to prevent resubmission on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state with fast skeleton
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
        <div className="bg-gradient-to-r from-[#CF2030] to-[#A61926] text-white p-6 rounded-b-3xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 bg-white/30 rounded-lg animate-pulse"></div>
            <div>
              <h1 className="text-xl font-bold mb-1">Aasaan App</h1>
              <div className="h-4 w-32 bg-white/30 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="px-4 mt-6 space-y-4">
          <div className="nm-raised rounded-xl p-5">
            <div className="h-5 w-24 rounded animate-pulse" style={{ background: 'var(--nm-border)' }}></div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="h-10 nm-inset rounded animate-pulse"></div>
              <div className="h-10 nm-inset rounded animate-pulse"></div>
            </div>
          </div>
          <div className="nm-raised rounded-xl p-5">
            <div className="h-5 w-32 rounded animate-pulse" style={{ background: 'var(--nm-border)' }}></div>
            <div className="h-12 nm-inset rounded animate-pulse mt-3"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state only if error is set
  if (error || !meetingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--nm-bg)' }}>
        <div className="nm-raised rounded-3xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full nm-pressed flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <span className="text-4xl">&#x274C;</span>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#CF2030' }}>Invalid or Expired QR Code</h2>
          <p className="mb-4" style={{ color: 'var(--nm-text-secondary)' }}>Please scan a valid QR code from the meeting display.</p>
          <div className="nm-inset rounded-lg p-3" style={{ background: 'rgba(234, 179, 8, 0.08)' }}>
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Make sure you're scanning the latest QR code from the meeting screen</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--nm-bg)' }}>
        <Card className="p-8 text-center max-w-md w-full">
          <div className="h-20 w-20 rounded-full nm-pressed flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Attendance Marked!</h2>
          <p className="mb-6" style={{ color: 'var(--nm-text-secondary)' }}>Your attendance has been recorded successfully.</p>

          <div className="nm-inset rounded-lg p-4 mb-4" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--nm-accent)' }}>Thank you for attending</p>
            <p className="text-xs mt-1" style={{ color: 'var(--nm-text-muted)' }}>You may close this page now</p>
          </div>

          <div className="nm-inset rounded-lg p-3" style={{ background: 'rgba(234, 179, 8, 0.08)' }}>
            <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
              This QR code has been used. Scan a new QR code to mark attendance again.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--nm-bg)' }}>
      <div className="bg-gradient-to-r from-[#CF2030] to-[#A61926] text-white p-6 rounded-b-3xl shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-3">
          <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-14 w-auto rounded-lg shadow-md" />
          <div>
            <h1 className="text-xl font-bold mb-0.5">Aasaan App</h1>
            <p className="text-white/90 text-sm">Meeting: {new Date(meetingInfo.date).toLocaleDateString()}</p>
            <div className="mt-1 bg-white/20 backdrop-blur-sm rounded px-2 py-0.5 inline-block">
              <p className="text-xs font-semibold">Verified</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Info banner for members */}
        <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Members:</span> Open your AasaanApp and tap <span className="font-semibold">"Scan QR for Attendance"</span> to mark attendance.
          </p>
        </div>

        <Card className="p-5">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Select Type</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button
              data-testid="type-substitute-btn"
              type="button"
              variant={type === 'substitute' ? 'default' : 'outline'}
              onClick={() => setType('substitute')}
              className={type === 'substitute' ? 'bg-[#CF2030] hover:bg-[#A61926]' : ''}
            >
              Substitute
            </Button>
            <Button
              data-testid="type-visitor-btn"
              type="button"
              variant={type === 'visitor' ? 'default' : 'outline'}
              onClick={() => setType('visitor')}
              className={type === 'visitor' ? 'bg-[#CF2030] hover:bg-[#A61926]' : ''}
            >
              Visitor
            </Button>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          {type === 'substitute' && (
            <Card className="p-6 space-y-4">
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Substituting For (Member Name)</Label>
                <select
                  data-testid="substitute-for-select"
                  value={selectedForMember}
                  onChange={(e) => {
                    setSelectedForMember(e.target.value);
                    scrollToSubmitButton();
                  }}
                  required
                  className="mt-2 w-full min-h-[44px] px-3 py-2 rounded-lg nm-input focus:outline-none"
                  style={{ background: 'var(--nm-surface)', color: 'var(--nm-text-primary)' }}
                >
                  <option value="">-- Select Member --</option>
                  {members.map((member) => (
                    <option key={member.member_id} value={member.member_id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Substitute Name</Label>
                <Input
                  data-testid="substitute-name-input"
                  value={substituteName}
                  onChange={(e) => setSubstituteName(e.target.value)}
                  required
                  className="mt-2 min-h-[44px]"
                />
              </div>
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Substitute Mobile</Label>
                <Input
                  data-testid="substitute-mobile-input"
                  type="tel"
                  value={substituteMobile}
                  onChange={(e) => setSubstituteMobile(e.target.value)}
                  required
                  className="mt-2 min-h-[44px]"
                />
              </div>
            </Card>
          )}

          {type === 'visitor' && (
            <Card className="p-6 space-y-4">
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Visitor Name</Label>
                <Input
                  data-testid="visitor-name-input"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  required
                  className="mt-2 min-h-[44px]"
                />
              </div>
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Visitor Mobile</Label>
                <Input
                  data-testid="visitor-mobile-input"
                  type="tel"
                  value={visitorMobile}
                  onChange={(e) => setVisitorMobile(e.target.value)}
                  required
                  className="mt-2 min-h-[44px]"
                />
              </div>
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Email <span className="text-xs font-normal" style={{ color: 'var(--nm-text-muted)' }}>(optional)</span></Label>
                <Input
                  data-testid="visitor-email-input"
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder="visitor@example.com"
                  className="mt-2 min-h-[44px]"
                />
              </div>
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Visitor Company</Label>
                <Input
                  data-testid="visitor-company-input"
                  value={visitorCompany}
                  onChange={(e) => setVisitorCompany(e.target.value)}
                  required
                  className="mt-2 min-h-[44px]"
                />
              </div>
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Business Category</Label>
                <select
                  data-testid="visitor-category-select"
                  value={visitorBusinessCategory}
                  onChange={(e) => {
                    setVisitorBusinessCategory(e.target.value);
                    if (e.target.value !== 'Other') setVisitorBusinessCategoryOther('');
                    scrollToSubmitButton();
                  }}
                  required
                  className="mt-2 w-full min-h-[44px] px-3 py-2 rounded-lg nm-input focus:outline-none"
                  style={{ background: 'var(--nm-surface)', color: 'var(--nm-text-primary)' }}
                >
                  <option value="">-- Select Category --</option>
                  <option value="Accounting & Finance">Accounting & Finance</option>
                  <option value="Architecture & Interior Design">Architecture & Interior Design</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Banking & Insurance">Banking & Insurance</option>
                  <option value="Construction & Real Estate">Construction & Real Estate</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Education & Training">Education & Training</option>
                  <option value="Food & Hospitality">Food & Hospitality</option>
                  <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                  <option value="IT & Software">IT & Software</option>
                  <option value="Legal Services">Legal Services</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Marketing & Advertising">Marketing & Advertising</option>
                  <option value="Photography & Media">Photography & Media</option>
                  <option value="Printing & Stationery">Printing & Stationery</option>
                  <option value="Retail & E-commerce">Retail & E-commerce</option>
                  <option value="Telecom & Networking">Telecom & Networking</option>
                  <option value="Travel & Tourism">Travel & Tourism</option>
                  <option value="Other">Other</option>
                </select>
                {visitorBusinessCategory === 'Other' && (
                  <Input
                    data-testid="visitor-category-other-input"
                    value={visitorBusinessCategoryOther}
                    onChange={(e) => setVisitorBusinessCategoryOther(e.target.value)}
                    placeholder="Enter business category"
                    required
                    className="mt-2 min-h-[44px]"
                  />
                )}
              </div>
              <div>
                <Label style={{ color: 'var(--nm-text-primary)' }}>Invited By (Member Name)</Label>
                <select
                  data-testid="invited-by-select"
                  value={invitedByMember}
                  onChange={(e) => {
                    setInvitedByMember(e.target.value);
                    scrollToSubmitButton();
                  }}
                  required
                  className="mt-2 w-full min-h-[44px] px-3 py-2 rounded-lg nm-input focus:outline-none"
                  style={{ background: 'var(--nm-surface)', color: 'var(--nm-text-primary)' }}
                >
                  <option value="">-- Select Member --</option>
                  {members.map((member) => (
                    <option key={member.member_id} value={member.member_id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          )}

          <Button
            data-testid="submit-attendance-btn"
            type="submit"
            disabled={submitting || loading}
            className="w-full min-h-[44px] bg-[#CF2030] hover:bg-[#A61926] text-white font-semibold"
          >
            {loading ? 'Loading...' : submitting ? 'Submitting...' : 'Mark Attendance'}
          </Button>
        </form>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 nm-header backdrop-blur-sm py-3" style={{ borderTop: '1px solid var(--nm-border)' }}>
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--nm-text-secondary)' }}>Developed by SIPL</p>
        </div>
      </div>
    </div>
  );
}
