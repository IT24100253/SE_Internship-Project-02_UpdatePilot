'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck, RefreshCw, Download, Search, History,
  LayoutDashboard, Package, CheckCircle2, AlertTriangle, LogOut, Terminal, Copy
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api/v1';

export default function UpdatePilotApp() {
  // Auth States
  const [token, setToken] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Navigation & Data States
  const [activeTab, setActiveTab] = useState<'overview' | 'apps' | 'updates' | 'history' | 'agent'>('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any>({ scans: [], updates: [] });

  // Filters & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [newDeviceName, setNewDeviceName] = useState('My-Windows-PC');
  const [generatedAgentToken, setGeneratedAgentToken] = useState<string | null>(null);
  const [confirmUpdateApp, setConfirmUpdateApp] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('up_token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 5000);
      return () => clearInterval(interval);
    }
  }, [token, searchQuery, statusFilter]);

  const apiHeaders = { Authorization: `Bearer ${token}` };

  const fetchAllData = async () => {
    try {
      const [dashRes, appsRes, updRes, histRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard`, { headers: apiHeaders }),
        axios.get(`${API_URL}/applications?search=${searchQuery}&status=${statusFilter}`, { headers: apiHeaders }),
        axios.get(`${API_URL}/updates`, { headers: apiHeaders }),
        axios.get(`${API_URL}/history`, { headers: apiHeaders }),
      ]);
      setDashboardData(dashRes.data);
      setApps(appsRes.data);
      setUpdates(updRes.data);
      setHistoryData(histRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { name, email, password } : { email, password };
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      localStorage.setItem('up_token', res.data.token);
      setToken(res.data.token);
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('up_token');
    setToken(null);
  };

  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/devices/pair`, { deviceName: newDeviceName }, { headers: apiHeaders });
      setGeneratedAgentToken(res.data.agentToken);
      fetchAllData();
    } catch (err) {
      alert('Failed to pair device');
    }
  };

  const handleStartScan = async (deviceId: string) => {
    try {
      await axios.post(`${API_URL}/devices/${deviceId}/scans`, {}, { headers: apiHeaders });
      showNotification('Scan job queued! Windows Agent will start scanning shortly.');
      fetchAllData();
    } catch (err) {
      alert('Failed to start scan');
    }
  };

  const handleConfirmUpdate = async () => {
    if (!confirmUpdateApp) return;
    try {
      await axios.post(
        `${API_URL}/updates/${confirmUpdateApp.id}/execute`,
        {
          packageId: confirmUpdateApp.packageId,
          displayName: confirmUpdateApp.displayName,
        },
        { headers: apiHeaders }
      );
      showNotification(`Update confirmed for ${confirmUpdateApp.displayName}! Agent will install it shortly.`);
      setConfirmUpdateApp(null);
      fetchAllData();
    } catch (err) {
      alert('Failed to start update');
    }
  };

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 5000);
  };

  // ==========================================
  // LOGIN / REGISTER SCREEN
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">UpdatePilot</h1>
              <p className="text-xs text-slate-400">Software Update Intelligence Platform</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-4">{isRegister ? 'Create an Account' : 'Sign in to Dashboard'}</h2>
          {authError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">{authError}</div>}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Sasangi Perera"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-medium rounded-lg transition">
              {isRegister ? 'Register' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setIsRegister(!isRegister)} className="text-blue-400 hover:underline font-medium">
              {isRegister ? 'Login here' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const primaryDevice = dashboardData?.devices?.[0];

  // ==========================================
  // MAIN DASHBOARD LAYOUT
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">UpdatePilot</span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'apps', label: 'Applications', icon: Package },
              { id: 'updates', label: `Updates (${updates.length})`, icon: Download },
              { id: 'history', label: 'History & Logs', icon: History },
              { id: 'agent', label: 'Agent Setup', icon: Terminal },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {actionMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center justify-between">
            <span>{actionMessage}</span>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">System Overview</h1>
                <p className="text-sm text-slate-400">Monitor installed software and pending updates</p>
              </div>
              {primaryDevice && (
                <button
                  onClick={() => handleStartScan(primaryDevice.id)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-sm transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Run New Scan
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <p className="text-sm text-slate-400">Installed Applications</p>
                <p className="text-3xl font-bold mt-2">{dashboardData?.stats?.totalApps || 0}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <p className="text-sm text-slate-400">Available Updates</p>
                <p className="text-3xl font-bold mt-2 text-amber-400">{dashboardData?.stats?.updatesAvailable || 0}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <p className="text-sm text-slate-400">Windows Agent Status</p>
                <div className="mt-2 flex items-center gap-2">
                  {primaryDevice ? (
                    <>
                      <span className={`w-3 h-3 rounded-full ${primaryDevice.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                      <span className="text-xl font-bold">{primaryDevice.status}</span>
                    </>
                  ) : (
                    <button onClick={() => setActiveTab('agent')} className="text-sm text-blue-400 underline">
                      Pair your Windows PC →
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Audit Events</h2>
              {dashboardData?.recentEvents?.length === 0 ? (
                <p className="text-sm text-slate-400">No events recorded yet. Pair your agent and run a scan.</p>
              ) : (
                <div className="space-y-3">
                  {dashboardData?.recentEvents?.map((ev: any) => (
                    <div key={ev.id} className="flex items-center justify-between text-sm border-b border-slate-800 pb-3">
                      <div>
                        <span className="font-medium text-blue-400">[{ev.eventType}]</span>{' '}
                        <span className="text-slate-300">{ev.details}</span>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(ev.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. APPLICATIONS INVENTORY TAB */}
        {activeTab === 'apps' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">Application Inventory</h1>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UPDATE_AVAILABLE">Update Available</option>
                  <option value="UP_TO_DATE">Up to Date</option>
                  <option value="UNMATCHED">Unmatched</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="p-4">Application Name</th>
                    <th className="p-4">Package ID</th>
                    <th className="p-4">Installed Version</th>
                    <th className="p-4">Available</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {apps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-medium">{app.displayName}</td>
                      <td className="p-4 text-slate-400 font-mono text-xs">{app.packageId || 'N/A'}</td>
                      <td className="p-4">{app.installedVersion}</td>
                      <td className="p-4 text-amber-400 font-medium">{app.availableVersion || '-'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            app.status === 'UPDATE_AVAILABLE'
                              ? 'bg-amber-500/10 text-amber-400'
                              : app.status === 'UP_TO_DATE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {apps.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No applications found. Run a scan from the Overview page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. UPDATES CENTER TAB */}
        {activeTab === 'updates' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Available Updates</h1>
              <p className="text-sm text-slate-400">Review release versions and confirm safe installation</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {updates.map((app) => (
                <div key={app.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{app.displayName}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {app.packageId}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-slate-400">Current: {app.installedVersion}</span>
                      <span>→</span>
                      <span className="text-emerald-400 font-semibold">Target: {app.availableVersion}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmUpdateApp(app)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
                  >
                    Review & Update
                  </button>
                </div>
              ))}
              {updates.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 p-12 rounded-xl text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium">All matched applications are up to date!</h3>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Scan & Update History</h1>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Update Jobs</h2>
              <div className="space-y-3">
                {historyData.updates?.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between border-b border-slate-800 pb-3 text-sm">
                    <div>
                      <p className="font-medium">{job.application?.displayName}</p>
                      <p className="text-xs text-slate-400">
                        {job.previousVersion} → {job.targetVersion} ({job.verificationResult || job.errorSummary || 'Processing'})
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        job.state === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : job.state === 'FAILED'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {job.state}
                    </span>
                  </div>
                ))}
                {historyData.updates?.length === 0 && <p className="text-sm text-slate-400">No update jobs executed yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* 5. AGENT SETUP & PAIRING TAB */}
        {activeTab === 'agent' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Windows Agent Pairing</h1>
              <p className="text-sm text-slate-400">Generate a secure token to connect your local Windows Agent</p>
            </div>

            <form onSubmit={handlePairDevice} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
                Generate Pairing Token
              </button>
            </form>

            {generatedAgentToken && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Copy this Agent Token now (It will not be shown again)</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <code className="text-xs text-emerald-400 break-all flex-1">{generatedAgentToken}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedAgentToken)}
                    className="p-2 hover:bg-slate-800 rounded"
                    title="Copy Token"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Run <code className="text-slate-200">npm start</code> inside the <code className="text-slate-200">agent</code> folder and paste this token when prompted.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CONFIRMATION MODAL FOR UPDATES */}
        {confirmUpdateApp && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Confirm Software Update</h3>
              <p className="text-sm text-slate-300">
                Are you sure you want to update <strong className="text-white">{confirmUpdateApp.displayName}</strong>?
              </p>
              <div className="bg-slate-950 p-3 rounded-lg text-xs space-y-1 font-mono text-slate-400">
                <p>Package ID: {confirmUpdateApp.packageId}</p>
                <p>Current Version: {confirmUpdateApp.installedVersion}</p>
                <p className="text-emerald-400">Target Version: {confirmUpdateApp.availableVersion}</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmUpdateApp(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpdate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
                >
                  Confirm & Install
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}