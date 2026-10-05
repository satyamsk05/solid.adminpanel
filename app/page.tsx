'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  X,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  CircleDot,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface PaymentStats {
  totalDepositsCount: number;
  pendingDepositsCount: number;
  pendingDepositsAmount: number;
  approvedDepositsAmount: number;
  totalWithdrawalsCount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  approvedWithdrawalsAmount: number;
}

interface DepositItem {
  id: string;
  userId: string;
  userPhone?: string;
  amount: number;
  utrNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

interface WithdrawalItem {
  id: string;
  userId: string;
  userPhone?: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('super-admin-secret-2026');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'settings'>('deposits');

  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [activeRounds, setActiveRounds] = useState<number>(16);
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);

  const [upiId, setUpiId] = useState<string>('');
  const [upiName, setUpiName] = useState<string>('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const API_BASE = 'http://localhost:5001/api';

  useEffect(() => {
    const saved = localStorage.getItem('crypto_admin_key');
    if (saved) {
      setAdminKey(saved);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && adminKey) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, adminKey]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    localStorage.setItem('crypto_admin_key', inputKey.trim());
    setAdminKey(inputKey.trim());
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('crypto_admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
  };

  const fetchData = async () => {
    if (!adminKey) return;
    setIsRefreshing(true);
    try {
      const headers = { 'x-admin-key': adminKey };

      // 1. Stats
      const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers });
      if (statsRes.status === 401) {
        handleLogout();
        return;
      }
      const statsData = await statsRes.json();
      setStats(statsData.payments);
      setActiveRounds(statsData.activeRounds);

      // 2. Deposits
      const depRes = await fetch(`${API_BASE}/admin/deposits`, { headers });
      const depData = await depRes.json();
      setDeposits(depData);

      // 3. Withdrawals
      const withRes = await fetch(`${API_BASE}/admin/withdrawals`, { headers });
      const withData = await withRes.json();
      setWithdrawals(withData);

      // 4. UPI Config
      const upiRes = await fetch(`${API_BASE}/admin/upi-config`, { headers });
      const upiData = await upiRes.json();
      setUpiId(upiData.upiId || '');
      setUpiName(upiData.upiName || '');
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const approveDeposit = async (id: string) => {
    if (!confirm('Confirm you have received the INR and want to credit user balance?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/deposits/${id}/approve`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Deposit approved! User balance credited.');
        fetchData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const rejectDeposit = async (id: string) => {
    if (!confirm('Reject this deposit request?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/deposits/${id}/reject`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (data.success) {
        showToast('❌ Deposit rejected.');
        fetchData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const approveWithdrawal = async (id: string) => {
    if (!confirm('Confirm you have sent the UPI transfer to user?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Withdrawal marked as Paid!');
        fetchData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const rejectWithdrawal = async (id: string) => {
    if (!confirm('Reject withdrawal and refund balance back to user?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (data.success) {
        showToast('⚠️ Withdrawal rejected & balance refunded.');
        fetchData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const saveUpiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/upi-config`, {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upiId, upiName }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ UPI settings updated successfully!');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied UPI ID: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Auth Modal
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg)'
      }}>
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '36px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            color: 'var(--primary)'
          }}>
            <Lock size={22} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Admin Console
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Enter your secret key to manage UTR deposits, UPI payouts, and platform operations.
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Enter ADMIN_SECRET_KEY"
              style={{
                width: '100%',
                backgroundColor: '#09090b',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: 'var(--text-main)',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '16px'
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'var(--text-main)',
                color: 'var(--bg)',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 18px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          fontSize: '13px',
          zIndex: 1000,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Top Navbar */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'rgba(9, 9, 11, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Solidgame
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '6px'
            }}>
              ADMIN
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={fetchData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text-dim)',
                border: '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', flex: 1, width: '100%' }}>
        {/* Metric Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {/* Card 1 */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Pending Deposits
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--amber)', letterSpacing: '-0.03em' }}>
              {stats?.pendingDepositsCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ₹{(stats?.pendingDepositsAmount || 0).toFixed(2)} to verify
            </div>
          </div>

          {/* Card 2 */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Pending Withdrawals
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#60a5fa', letterSpacing: '-0.03em' }}>
              {stats?.pendingWithdrawalsCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ₹{(stats?.pendingWithdrawalsAmount || 0).toFixed(2)} to payout
            </div>
          </div>

          {/* Card 3 */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Total Approved Deposits
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.03em' }}>
              ₹{(stats?.approvedDepositsAmount || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Lifetime platform volume
            </div>
          </div>

          {/* Card 4 */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Active Crypto Rounds
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
              {activeRounds}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              1m, 3m, 5m, 15m Binance WS
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '24px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('deposits')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 0',
              fontSize: '14px',
              fontWeight: activeTab === 'deposits' ? 600 : 500,
              color: activeTab === 'deposits' ? 'var(--text-main)' : 'var(--text-dim)',
              cursor: 'pointer',
              borderBottom: activeTab === 'deposits' ? '2px solid var(--text-main)' : '2px solid transparent'
            }}
          >
            Deposit Approvals (UTR)
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 0',
              fontSize: '14px',
              fontWeight: activeTab === 'withdrawals' ? 600 : 500,
              color: activeTab === 'withdrawals' ? 'var(--text-main)' : 'var(--text-dim)',
              cursor: 'pointer',
              borderBottom: activeTab === 'withdrawals' ? '2px solid var(--text-main)' : '2px solid transparent'
            }}
          >
            Withdrawal Payouts (UPI)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 0',
              fontSize: '14px',
              fontWeight: activeTab === 'settings' ? 600 : 500,
              color: activeTab === 'settings' ? 'var(--text-main)' : 'var(--text-dim)',
              cursor: 'pointer',
              borderBottom: activeTab === 'settings' ? '2px solid var(--text-main)' : '2px solid transparent'
            }}
          >
            UPI Settings
          </button>
        </div>

        {/* TAB 1: DEPOSITS */}
        {activeTab === 'deposits' && (
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Deposit Requests</span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{deposits.length} total</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UTR Number</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                      No deposit requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  deposits.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {new Date(d.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                        {d.userPhone || d.userId.slice(0, 8)}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, color: 'var(--emerald)' }}>
                        ₹{d.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: '#818cf8',
                          border: '1px solid var(--border)'
                        }}>
                          {d.utrNumber}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: d.status === 'approved' ? 'var(--emerald-bg)' : d.status === 'rejected' ? 'var(--rose-bg)' : 'var(--amber-bg)',
                          color: d.status === 'approved' ? 'var(--emerald)' : d.status === 'rejected' ? 'var(--rose)' : 'var(--amber)',
                          border: `1px solid ${d.status === 'approved' ? 'var(--emerald-border)' : d.status === 'rejected' ? 'var(--rose-border)' : 'var(--amber-border)'}`
                        }}>
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {d.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => approveDeposit(d.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: 'var(--emerald)',
                                color: '#000',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectDeposit(d.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                borderRadius: '6px',
                                backgroundColor: 'transparent',
                                color: 'var(--rose)',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                cursor: 'pointer'
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: WITHDRAWALS */}
        {activeTab === 'withdrawals' && (
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Withdrawal Requests (Payouts)</span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{withdrawals.length} total</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User UPI ID</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                      No withdrawal requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {new Date(w.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                        {w.userPhone || w.userId.slice(0, 8)}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
                        ₹{w.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => copyToClipboard(w.upiId, w.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer'
                          }}
                        >
                          {w.upiId}
                          {copiedId === w.id ? <Check size={12} color="var(--emerald)" /> : <Copy size={12} color="var(--text-dim)" />}
                        </button>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: w.status === 'approved' ? 'var(--emerald-bg)' : w.status === 'rejected' ? 'var(--rose-bg)' : 'var(--amber-bg)',
                          color: w.status === 'approved' ? 'var(--emerald)' : w.status === 'rejected' ? 'var(--rose)' : 'var(--amber)',
                          border: `1px solid ${w.status === 'approved' ? 'var(--emerald-border)' : w.status === 'rejected' ? 'var(--rose-border)' : 'var(--amber-border)'}`
                        }}>
                          {w.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {w.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => approveWithdrawal(w.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: 'var(--emerald)',
                                color: '#000',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => rejectWithdrawal(w.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                borderRadius: '6px',
                                backgroundColor: 'transparent',
                                color: 'var(--rose)',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                cursor: 'pointer'
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '560px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px', letterSpacing: '-0.01em' }}>
              Platform Receiving UPI Configuration
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              This UPI ID and Display Name are sent to the Android App when users click "Add Funds" to deposit money.
            </p>

            <form onSubmit={saveUpiConfig}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  Receiving UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourbusiness@okhdfcbank"
                  style={{
                    width: '100%',
                    backgroundColor: '#09090b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  Payee / Business Name
                </label>
                <input
                  type="text"
                  value={upiName}
                  onChange={(e) => setUpiName(e.target.value)}
                  placeholder="e.g. Solidgame"
                  style={{
                    width: '100%',
                    backgroundColor: '#09090b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--text-main)',
                  color: 'var(--bg)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Save UPI Configuration
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
