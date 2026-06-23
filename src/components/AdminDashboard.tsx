/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, Award, ShieldAlert, LogOut, Search, Plus, Trash2, Edit2, 
  RefreshCw, Check, AlertTriangle, X, ShieldCheck, Layout, ExternalLink
} from 'lucide-react';

interface AdminDashboardProps {
  token: string | null;
  user: any;
  onLogout: () => void;
}

export function AdminDashboard({ token, user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'workspaces' | 'programs' | 'certificates'>('workspaces');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editingWorkspace, setEditingWorkspace] = useState<any | null>(null);
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [revokingCert, setRevokingCert] = useState<any | null>(null);
  const [revocationReason, setRevocationReason] = useState('');

  // Form states
  const [wsName, setWsName] = useState('');
  const [wsBrandName, setWsBrandName] = useState('');
  const [wsPlan, setWsPlan] = useState('free');

  const [progName, setProgName] = useState('');
  const [progDesc, setProgDesc] = useState('');

  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'workspaces') {
        const res = await fetch('/api/admin/workspaces', { headers: authHeaders });
        if (res.ok) setWorkspaces(await res.json());
      } else if (activeTab === 'programs') {
        const res = await fetch('/api/admin/programs', { headers: authHeaders });
        if (res.ok) setPrograms(await res.json());
      } else if (activeTab === 'certificates') {
        const res = await fetch('/api/admin/certificates', { headers: authHeaders });
        if (res.ok) setCertificates(await res.json());
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Workspace Actions
  const startEditWorkspace = (ws: any) => {
    setEditingWorkspace(ws);
    setWsName(ws.name);
    setWsBrandName(ws.brand_name || ws.name);
    setWsPlan(ws.plan || 'free');
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace) return;

    try {
      const res = await fetch(`/api/admin/workspaces/${editingWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ name: wsName, brand_name: wsBrandName, plan: wsPlan })
      });
      if (res.ok) {
        setEditingWorkspace(null);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update workspace');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWorkspace = async (id: string, name: string) => {
    if (!confirm(`WARNING: Are you sure you want to delete workspace "${name}"? This will delete all its templates, programs, and issued certificates cascade-style. This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/workspaces/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to delete workspace');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Program Actions
  const startEditProgram = (prog: any) => {
    setEditingProgram(prog);
    setProgName(prog.name);
    setProgDesc(prog.description || '');
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;

    try {
      const res = await fetch(`/api/admin/programs/${editingProgram.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ name: progName, description: progDesc })
      });
      if (res.ok) {
        setEditingProgram(null);
        await loadData();
      } else {
        alert('Failed to update program');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProgram = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete program "${name}"? All associated certificates will be permanently deleted.`)) return;
    try {
      const res = await fetch(`/api/admin/programs/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to delete program');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Certificate Actions
  const startRevokeCertificate = (cert: any) => {
    setRevokingCert(cert);
    setRevocationReason('Academic audit flags: Policy violation');
  };

  const handleExecuteRevocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingCert) return;

    try {
      const res = await fetch(`/api/certificates/${revokingCert.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: 'revoked', reason: revocationReason })
      });
      if (res.ok) {
        setRevokingCert(null);
        await loadData();
      } else {
        alert('Failed to revoke certificate');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreCertificate = async (id: string) => {
    try {
      const res = await fetch(`/api/certificates/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: 'valid' })
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to restore certificate');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredWorkspaces = workspaces.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.brand_name && w.brand_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.workspace_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCertificates = certificates.filter(c => 
    c.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.program_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-sans">
      
      {/* Sidebar Panel */}
      <aside className="w-72 bg-white border-r border-[#E9ECEF] flex flex-col justify-between p-6 z-10 shrink-0">
        <div className="space-y-8">
          
          {/* Logo Header */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 16H23" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold italic tracking-wide text-slate-950 leading-none">Glint</h2>
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#9CA3AF] font-bold block mt-1">Super Admin Console</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-4">
            <button
              onClick={() => { setActiveTab('workspaces'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl font-semibold text-xs transition-all ${activeTab === 'workspaces' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              id="tab-admin-workspaces"
            >
              <span className="flex items-center gap-2.5">
                <Building className="w-4 h-4" /> Organizations (Workspaces)
              </span>
              <span className="text-[10px] font-mono opacity-80">{workspaces.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab('programs'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl font-semibold text-xs transition-all ${activeTab === 'programs' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              id="tab-admin-programs"
            >
              <span className="flex items-center gap-2.5">
                <Award className="w-4 h-4" /> Certification Programs
              </span>
              <span className="text-[10px] font-mono opacity-80">{programs.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab('certificates'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl font-semibold text-xs transition-all ${activeTab === 'certificates' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              id="tab-admin-certificates"
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4" /> Issued Registry
              </span>
              <span className="text-[10px] font-mono opacity-80">{certificates.length}</span>
            </button>
          </nav>
        </div>

        {/* Profile Card / Logout */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
            <span className="text-[8px] font-mono font-bold uppercase text-indigo-500 tracking-widest block mb-0.5">Role State</span>
            <p className="text-xs font-bold text-indigo-900">System Superuser</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold text-xs select-none">
                A
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">Glint Owner</p>
                <p className="text-[9px] font-mono text-slate-400 truncate">admin@gmail.com</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Log Out Console"
              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              id="btn-admin-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Dynamic header */}
        <header className="h-16 bg-white border-b border-[#E9ECEF] flex items-center justify-between px-10 shrink-0 z-20">
          <div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
              {activeTab === 'workspaces' && 'Organizations Directory'}
              {activeTab === 'programs' && 'Platform Certifications'}
              {activeTab === 'certificates' && 'Global Registry Ledger'}
            </h1>
          </div>

          {/* Search bar & Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-slate-400 focus:bg-white w-64 transition-all placeholder:text-slate-400 text-slate-800"
                id="admin-search-input"
              />
            </div>
            <button
              onClick={triggerRefresh}
              className={`p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all ${refreshing ? 'animate-spin' : ''}`}
              title="Sync Database"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Scrollable Data Content Area */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#F8F9FA]">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <span className="w-6 h-6 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></span>
              <p className="text-xs font-mono text-slate-400">Loading ledger data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: WORKSPACES */}
              {activeTab === 'workspaces' && (
                <div className="space-y-6">
                  
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-4 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Total Workspaces</p>
                      <h4 className="text-3xl font-serif italic text-slate-950">{workspaces.length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Enterprise Tier</p>
                      <h4 className="text-3xl font-serif italic text-slate-950">{workspaces.filter(w => w.plan === 'enterprise').length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Pro Tier</p>
                      <h4 className="text-3xl font-serif italic text-slate-950">{workspaces.filter(w => w.plan === 'pro' || w.plan === 'premium').length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Free Tier</p>
                      <h4 className="text-3xl font-serif italic text-slate-950">{workspaces.filter(w => w.plan === 'free' || !w.plan).length}</h4>
                    </div>
                  </div>

                  {/* Workspaces Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">
                          <th className="py-4 px-6">Workspace ID</th>
                          <th className="py-4 px-6">Name</th>
                          <th className="py-4 px-6">Brand Name</th>
                          <th className="py-4 px-6">Tier</th>
                          <th className="py-4 px-6">Created At</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredWorkspaces.map((ws) => (
                          <tr key={ws.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400">{ws.id}</td>
                            <td className="py-3.5 px-6 font-semibold text-slate-900">{ws.name}</td>
                            <td className="py-3.5 px-6 text-slate-600">{ws.brand_name || '—'}</td>
                            <td className="py-3.5 px-6">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ws.plan === 'enterprise' ? 'bg-purple-50 text-purple-700 border border-purple-100' : ws.plan === 'pro' || ws.plan === 'premium' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                {ws.plan || 'free'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-slate-500 font-mono text-[10px]">
                              {new Date(ws.created_time || ws.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-6 text-right space-x-2">
                              <button
                                onClick={() => startEditWorkspace(ws)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all inline-flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                                className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all inline-flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredWorkspaces.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">No workspaces matching search query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: PROGRAMS */}
              {activeTab === 'programs' && (
                <div className="space-y-6">
                  
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Total Programs</p>
                      <h4 className="text-3xl font-serif italic text-slate-950">{programs.length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Active Templates Linked</p>
                      <h4 className="text-3xl font-serif italic text-slate-950">{programs.filter(p => p.template_id).length}</h4>
                    </div>
                  </div>

                  {/* Programs Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">
                          <th className="py-4 px-6">Program ID</th>
                          <th className="py-4 px-6">Name</th>
                          <th className="py-4 px-6">Organization</th>
                          <th className="py-4 px-6">Template ID</th>
                          <th className="py-4 px-6">Issue Date</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredPrograms.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400">{p.id}</td>
                            <td className="py-3.5 px-6 font-semibold text-slate-900">{p.name}</td>
                            <td className="py-3.5 px-6 text-slate-600 font-medium">{p.workspace_name}</td>
                            <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400">{p.template_id || 'None'}</td>
                            <td className="py-3.5 px-6 text-slate-500 font-mono text-[10px]">{p.issue_date}</td>
                            <td className="py-3.5 px-6 text-right space-x-2">
                              <button
                                onClick={() => startEditProgram(p)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all inline-flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProgram(p.id, p.name)}
                                className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all inline-flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredPrograms.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">No certification programs matching search query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CERTIFICATES */}
              {activeTab === 'certificates' && (
                <div className="space-y-6">
                  
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Issued Ledger Count</p>
                      <h4 className="text-3xl font-serif italic text-slate-950">{certificates.length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Valid Credentials</p>
                      <h4 className="text-3xl font-serif italic text-emerald-600">{certificates.filter(c => c.status === 'valid').length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Revoked Credentials</p>
                      <h4 className="text-3xl font-serif italic text-rose-600">{certificates.filter(c => c.status === 'revoked').length}</h4>
                    </div>
                  </div>

                  {/* Certificates Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">
                          <th className="py-4 px-6">Credential Hash ID</th>
                          <th className="py-4 px-6">Recipient</th>
                          <th className="py-4 px-6">Program</th>
                          <th className="py-4 px-6">Organization</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6 text-right">Revocation Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredCertificates.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400">{c.id}</td>
                            <td className="py-3.5 px-6">
                              <p className="font-semibold text-slate-900">{c.recipient_name}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{c.recipient_email}</p>
                            </td>
                            <td className="py-3.5 px-6 text-slate-600 font-medium">{c.program_name}</td>
                            <td className="py-3.5 px-6 text-slate-600">{c.workspace_name}</td>
                            <td className="py-3.5 px-6">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${c.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {c.status === 'valid' ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right space-x-2">
                              {c.status === 'valid' ? (
                                <button
                                  onClick={() => startRevokeCertificate(c)}
                                  className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all inline-flex items-center gap-1 text-[10px] font-bold"
                                >
                                  <ShieldAlert className="w-3 h-3" /> Revoke
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestoreCertificate(c.id)}
                                  className="p-1.5 rounded-lg border border-emerald-100 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-all inline-flex items-center gap-1 text-[10px] font-bold"
                                >
                                  <ShieldCheck className="w-3 h-3" /> Restore Valid
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredCertificates.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">No certificates matching search query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit Workspace Modal */}
      {editingWorkspace && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-slate-900">Modify Workspace Configuration</h3>
              <button onClick={() => setEditingWorkspace(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand Name</label>
                <input
                  type="text"
                  required
                  value={wsBrandName}
                  onChange={(e) => setWsBrandName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subscription Tier</label>
                <select
                  value={wsPlan}
                  onChange={(e) => setWsPlan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                >
                  <option value="free">Free Tier</option>
                  <option value="pro">Pro Tier</option>
                  <option value="enterprise">Enterprise Tier</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setEditingWorkspace(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 text-white rounded-xl hover:bg-slate-900 text-xs font-semibold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Program Modal */}
      {editingProgram && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-slate-900">Modify Certification Program</h3>
              <button onClick={() => setEditingProgram(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProgram} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Program Name</label>
                <input
                  type="text"
                  required
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  rows={3}
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 text-white rounded-xl hover:bg-slate-900 text-xs font-semibold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revocation Reason Modal */}
      {revokingCert && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-red-600 flex items-center gap-1.5"><ShieldAlert className="w-5 h-5" /> Revoke Certification</h3>
              <button onClick={() => setRevokingCert(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleExecuteRevocation} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                You are about to revoke the credential issued to <span className="font-semibold text-slate-900">{revokingCert.recipient_name}</span> for the program <span className="font-semibold text-slate-900">{revokingCert.program_name}</span>. This will immediately invalidate lookups on the verification page.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason for Revocation</label>
                <input
                  type="text"
                  required
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                  placeholder="e.g. Violation of integrity clauses, Academic audit flag"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setRevokingCert(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-xs font-semibold shadow-sm"
                >
                  Revoke Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
