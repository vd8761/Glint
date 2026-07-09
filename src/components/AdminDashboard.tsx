import { toast } from 'sonner';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, Award, ShieldAlert, LogOut, Search, Plus, Trash2, Edit2, 
  RefreshCw, Check, AlertTriangle, X, ShieldCheck, Layout, ExternalLink, Menu,
  ArrowLeft, Eye, MoreHorizontal, Mail
} from 'lucide-react';

interface AdminDashboardProps {
  token: string | null;
  user: any;
  onLogout: () => void;
}

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

export function AdminDashboard({ token, user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'workspaces' | 'programs' | 'certificates'>('workspaces');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  
  const [selectedProgramDetails, setSelectedProgramDetails] = useState<any | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
    setSelectedProgramDetails(null);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Always fetch all three datasets so counts and detail views work correctly
      const [wsRes, progRes, certRes] = await Promise.all([
        fetch('/api/admin/workspaces', { headers: authHeaders }),
        fetch('/api/admin/programs', { headers: authHeaders }),
        fetch('/api/admin/certificates', { headers: authHeaders })
      ]);
      
      if (wsRes.ok) setWorkspaces(await wsRes.json());
      if (progRes.ok) setPrograms(await progRes.json());
      if (certRes.ok) setCertificates(await certRes.json());
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
        toast.error(err.error || 'Failed to update workspace');
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
        toast.error('Failed to delete workspace');
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
        toast.error('Failed to update program');
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
        toast.error('Failed to delete program');
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
        toast.error('Failed to revoke certificate');
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
        toast.error('Failed to restore certificate');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [resendingCertId, setResendingCertId] = useState<string | null>(null);
  const [selectedAuditTrailCert, setSelectedAuditTrailCert] = useState<any | null>(null);
  // Certificate history lives in `certificate_events` now, not in an unbounded
  // `audit_trail` JSONB column on every certificate row.
  const [auditTrailLogs, setAuditTrailLogs] = useState<any[]>([]);
  const [auditTrailLoading, setAuditTrailLoading] = useState(false);

  useEffect(() => {
    if (!selectedAuditTrailCert) {
      setAuditTrailLogs([]);
      return;
    }
    let cancelled = false;
    setAuditTrailLoading(true);
    fetch(`/api/certificates/${encodeURIComponent(selectedAuditTrailCert.id)}/events`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : []))
      .then((logs) => !cancelled && setAuditTrailLogs(logs))
      .catch(() => !cancelled && setAuditTrailLogs([]))
      .finally(() => !cancelled && setAuditTrailLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedAuditTrailCert]);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [selectedCryptoProofCert, setSelectedCryptoProofCert] = useState<any | null>(null);
  const [selectedJsonEnvelopeCert, setSelectedJsonEnvelopeCert] = useState<any | null>(null);
  const [selectedPreviewCert, setSelectedPreviewCert] = useState<any | null>(null);

  const handleResendEmail = async (certId: string) => {
    setResendingCertId(certId);
    try {
      const res = await fetch(`/api/certificates/${certId}/resend`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        toast.success('Verification email successfully resent!');
        await loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to resend verification email.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred.');
    } finally {
      setResendingCertId(null);
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

  const renderProgramDetailView = (program: any) => {
    const programCerts = certificates.filter(c => c.program_id === program.id);
    const totalIssued = programCerts.length;
    const validCount = programCerts.filter(c => c.status === 'valid').length;
    const revokedCount = programCerts.filter(c => c.status === 'revoked').length;

    const filteredCandidates = programCerts.filter(c => 
      c.recipient_name.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
      c.recipient_email.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(candidateSearchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProgramDetails(null)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer"
              type="button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-3xl italic text-slate-955 capitalize">{program.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-55 text-indigo-700 border border-indigo-100">
                  Admin Control Mode
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-1">
                UUID: <span className="font-mono text-slate-800">{program.id}</span> • Organization: <span className="font-semibold text-slate-800 capitalize">{program.workspace_name}</span> • Issue Date: {program.issue_date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startEditProgram(program)}
              className="bg-slate-955 text-white text-xs px-5 py-2.5 rounded-full font-bold shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Configure Program
            </button>
          </div>
        </div>

        {program.description && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-normal max-w-3xl">
            <p className="font-bold text-slate-900 mb-1 uppercase tracking-wider text-[9px]">Competency Profile Summary</p>
            {program.description}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <p className="text-[9px] font-mono tracking-wider text-slate-400 font-bold uppercase">Total Issued</p>
            <h4 className="text-2xl font-bold text-slate-950">{totalIssued}</h4>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <p className="text-[9px] font-mono tracking-wider text-slate-400 font-bold uppercase">Valid Status</p>
            <h4 className="text-2xl font-bold text-emerald-600">{validCount}</h4>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <p className="text-[9px] font-mono tracking-wider text-slate-400 font-bold uppercase">Revoked Status</p>
            <h4 className="text-2xl font-bold text-rose-600">{revokedCount}</h4>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <p className="text-[9px] font-mono tracking-wider text-slate-400 font-bold uppercase">Template ID</p>
            <h4 className="text-xs font-semibold text-slate-850 truncate font-mono" title={program.template_id}>{program.template_id || 'None'}</h4>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Candidate Registry ({filteredCandidates.length})</h3>
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search candidate or email..."
                value={candidateSearchQuery}
                onChange={(e) => setCandidateSearchQuery(e.target.value)}
                className="w-full bg-white text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl font-mono text-xs">
              No matching candidate credentials found.
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white border border-[#E9ECEF] rounded-2xl overflow-hidden card-shadow">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3">Credential ID</th>
                      <th className="px-6 py-3">Candidate</th>
                      <th className="px-6 py-3">Email Address</th>
                      <th className="px-6 py-3">Issue Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                    {filteredCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/40">
                        <td className="px-6 py-3.5 font-mono text-[10px] text-slate-400">{c.id}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900 capitalize">{c.recipient_name}</td>
                        <td className="px-6 py-3.5 font-mono text-[11px]">{c.recipient_email}</td>
                        <td className="px-6 py-3.5 text-slate-505 font-mono text-[10px]">{c.issue_date ? c.issue_date.split('T')[0] : ''}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            c.status === 'valid' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right relative">
                          <div className="inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === c.id ? null : c.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="More Options"
                              type="button"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {activeActionMenuId === c.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveActionMenuId(null)} />
                                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-xl z-20 py-1 text-left divide-y divide-slate-100 animate-fade-in">
                                  <div className="py-1">
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        window.open(`/#credential=${c.id}`, '_blank');
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-400" /> View Public Page
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        navigator.clipboard.writeText(`${window.location.origin}/#credential=${c.id}`);
                                        toast.success('Verification URL copied to clipboard!');
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Copy Verify Link
                                    </button>
                                  </div>
                                  <div className="py-1">
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleResendEmail(c.id);
                                      }}
                                      disabled={resendingCertId === c.id}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                                    >
                                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {resendingCertId === c.id ? 'Sending...' : 'Resend Email'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setSelectedAuditTrailCert(c);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                    >
                                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Audit Trail Log
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setSelectedCryptoProofCert(c);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                    >
                                      <Check className="w-3.5 h-3.5 text-slate-400" /> Crypto Status
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setSelectedJsonEnvelopeCert(c);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                    >
                                      <Building className="w-3.5 h-3.5 text-slate-400" /> JSON Envelope
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setSelectedPreviewCert(c);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                    >
                                      <Award className="w-3.5 h-3.5 text-slate-400" /> Preview Card
                                    </button>
                                  </div>
                                  <div className="py-1">
                                    {c.status === 'valid' ? (
                                      <button
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          startRevokeCertificate(c);
                                        }}
                                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold cursor-pointer"
                                      >
                                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Revoke Credential
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          handleRestoreCertificate(c.id);
                                        }}
                                        className="w-full text-left px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-bold cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Restore Valid
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden space-y-3">
                {filteredCandidates.map((c) => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 card-shadow space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 capitalize text-sm">{c.recipient_name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {c.id}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        c.status === 'valid' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-slate-500"><span className="font-bold text-slate-700">Email:</span> {c.recipient_email}</p>
                      <p className="text-slate-500"><span className="font-bold text-slate-700">Issued:</span> {c.issue_date ? c.issue_date.split('T')[0] : ''}</p>
                    </div>                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-end relative">
                      <div className="inline-block text-left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(activeActionMenuId === c.id ? null : c.id);
                          }}
                          className="px-3 py-1.5 text-[10px] uppercase font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
                          type="button"
                        >
                          <MoreHorizontal className="w-3 h-3" /> Actions
                        </button>
                        {activeActionMenuId === c.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveActionMenuId(null)} />
                            <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl z-20 py-1 text-left divide-y divide-slate-100 animate-fade-in max-h-64 overflow-y-auto">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    window.open(`/#credential=${c.id}`, '_blank');
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" /> View Public Page
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    navigator.clipboard.writeText(`${window.location.origin}/#credential=${c.id}`);
                                    toast.success('Verification URL copied to clipboard!');
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Copy Verify Link
                                </button>
                              </div>
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleResendEmail(c.id);
                                  }}
                                  disabled={resendingCertId === c.id}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                                >
                                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Resend Mail
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setSelectedAuditTrailCert(c);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                >
                                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Audit Log
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setSelectedCryptoProofCert(c);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                >
                                  <Check className="w-3.5 h-3.5 text-slate-400" /> Crypto Status
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setSelectedJsonEnvelopeCert(c);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                >
                                  <Building className="w-3.5 h-3.5 text-slate-400" /> JSON Envelope
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setSelectedPreviewCert(c);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-semibold"
                                >
                                  <Award className="w-3.5 h-3.5 text-slate-400" /> Preview Card
                                </button>
                              </div>
                              <div className="py-1">
                                {c.status === 'valid' ? (
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      startRevokeCertificate(c);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold cursor-pointer"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Revoke
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleRestoreCertificate(c.id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-bold cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Restore
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-sans relative">
      
      {/* Sidebar Panel */}
      {/* Translucent backdrop overlay for mobile view */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-[#E9ECEF] flex flex-col justify-between p-6 z-50 transition-transform duration-300 transform ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:relative md:z-10`}>
        <div className="space-y-8">
          
          {/* Logo Header */}
          <div className="flex items-center gap-2.5 select-none">
            <svg className="w-8 h-8 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 16H23" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
            </svg>
            <div>
              <h2 className="font-display font-extrabold tracking-wider text-slate-950 text-sm uppercase">GLINT REGISTRY</h2>
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#9CA3AF] font-bold block mt-0.5">Super Admin Console</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-4">
            <button
              onClick={() => { setActiveTab('workspaces'); setSearchQuery(''); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl font-semibold text-xs transition-all ${activeTab === 'workspaces' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              id="tab-admin-workspaces"
            >
              <span className="flex items-center gap-2.5">
                <Building className="w-4 h-4" /> Organizations (Workspaces)
              </span>
              <span className="text-[10px] font-mono opacity-80">{workspaces.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab('programs'); setSearchQuery(''); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl font-semibold text-xs transition-all ${activeTab === 'programs' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              id="tab-admin-programs"
            >
              <span className="flex items-center gap-2.5">
                <Award className="w-4 h-4" /> Certification Programs
              </span>
              <span className="text-[10px] font-mono opacity-80">{programs.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab('certificates'); setSearchQuery(''); setIsMobileSidebarOpen(false); }}
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
              <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold text-xs select-none uppercase">
                {(user?.name ?? 'A').charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name ?? 'Administrator'}</p>
                <p className="text-[9px] font-mono text-slate-400 truncate">{user?.email ?? ''}</p>
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
        <header className="h-16 bg-white border-b border-[#E9ECEF] flex items-center justify-between px-4 md:px-10 shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button for mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">
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
                className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-slate-400 focus:bg-white w-28 sm:w-48 md:w-64 transition-all placeholder:text-slate-400 text-slate-800"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 space-y-8 bg-[#F8F9FA]">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Total Workspaces</p>
                      <h4 className="text-3xl font-display font-bold text-slate-950">{workspaces.length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Enterprise Tier</p>
                      <h4 className="text-3xl font-display font-bold text-slate-950">{workspaces.filter(w => w.plan === 'enterprise').length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Pro Tier</p>
                      <h4 className="text-3xl font-display font-bold text-slate-950">{workspaces.filter(w => w.plan === 'pro' || w.plan === 'premium').length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Free Tier</p>
                      <h4 className="text-3xl font-display font-bold text-slate-950">{workspaces.filter(w => w.plan === 'free' || !w.plan).length}</h4>
                    </div>
                  </div>

                  {/* Workspaces Table - Desktop */}
                  <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">
                          <th className="py-4 px-6">Workspace ID</th>
                          <th className="py-4 px-6">Name</th>
                          <th className="py-4 px-6">Brand Name</th>
                          <th className="py-4 px-6">Tier</th>
                          <th className="py-4 px-6">Programs</th>
                          <th className="py-4 px-6">Certificates</th>
                          <th className="py-4 px-6">Created At</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredWorkspaces.map((ws) => (
                          <tr key={ws.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400">{ws.id}</td>
                            <td className="py-3.5 px-6 font-semibold text-slate-900 capitalize">{ws.name}</td>
                            <td className="py-3.5 px-6 text-slate-600 capitalize">{ws.brand_name || '—'}</td>
                            <td className="py-3.5 px-6">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ws.plan === 'enterprise' ? 'bg-purple-50 text-purple-700 border border-purple-100' : ws.plan === 'pro' || ws.plan === 'premium' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                {ws.plan || 'free'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 font-semibold text-slate-800">{ws.program_count || 0}</td>
                            <td className="py-3.5 px-6 font-semibold text-slate-800">{ws.certificate_count || 0}</td>
                            <td className="py-3.5 px-6 text-slate-500 font-mono text-[10px]">
                              {new Date(ws.created_time || ws.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1 sm:gap-2">
                                <button
                                  onClick={() => startEditWorkspace(ws)}
                                  className="py-1 px-1.5 sm:p-1.5 w-16 sm:w-20 justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                                  className="py-1 px-1.5 sm:p-1.5 w-16 sm:w-20 justify-center rounded-lg border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredWorkspaces.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 font-mono">No workspaces matching search query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Workspaces Cards - Mobile */}
                  <div className="block md:hidden space-y-4">
                    {filteredWorkspaces.map((ws) => (
                      <div key={ws.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-950 text-sm capitalize">{ws.name}</h3>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {ws.id}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${ws.plan === 'enterprise' ? 'bg-purple-50 text-purple-700 border border-purple-100' : ws.plan === 'pro' || ws.plan === 'premium' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                            {ws.plan || 'free'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Brand Name</p>
                            <p className="font-semibold text-slate-800 truncate">{ws.brand_name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Programs/Certs</p>
                            <p className="font-semibold text-slate-800 font-mono text-[10px]">{ws.program_count || 0} / {ws.certificate_count || 0}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Created</p>
                            <p className="font-semibold text-slate-800">{new Date(ws.created_time || ws.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => startEditWorkspace(ws)}
                            className="flex-1 py-2 justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit Config
                          </button>
                          <button
                            onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                            className="flex-1 py-2 justify-center rounded-lg border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredWorkspaces.length === 0 && (
                      <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
                        No workspaces matching search query.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PROGRAMS */}
              {activeTab === 'programs' && (
                <div className="space-y-8 animate-fade-in">
                  {selectedProgramDetails ? (
                    renderProgramDetailView(selectedProgramDetails)
                  ) : (
                    <>
                      {/* Summary Metric Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                          <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Total Programs</p>
                          <h4 className="text-3xl font-display font-bold text-slate-950">{programs.length}</h4>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                          <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Active Templates Linked</p>
                          <h4 className="text-3xl font-display font-bold text-slate-950">{programs.filter(p => p.template_id).length}</h4>
                        </div>
                      </div>

                      {/* Programs Table - Desktop */}
                      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">
                              <th className="py-4 px-6">Program ID</th>
                              <th className="py-4 px-6">Name</th>
                              <th className="py-4 px-6">Organization</th>
                              <th className="py-4 px-6">Template ID</th>
                              <th className="py-4 px-6">Certificates Issued</th>
                              <th className="py-4 px-6">Issue Date</th>
                              <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredPrograms.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400">{p.id}</td>
                                <td className="py-3.5 px-6 font-semibold text-slate-900 capitalize">
                                  <span 
                                    onClick={() => setSelectedProgramDetails(p)}
                                    className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer font-bold animate-pulse-subtle"
                                  >
                                    {p.name}
                                  </span>
                                </td>
                                <td className="py-3.5 px-6 text-slate-600 font-medium capitalize">{p.workspace_name}</td>
                                <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400">{p.template_id || 'None'}</td>
                                <td className="py-3.5 px-6 font-semibold text-slate-800 font-mono">{p.certificate_count || 0}</td>
                                <td className="py-3.5 px-6 text-slate-500 font-mono text-[10px]">{p.issue_date}</td>
                                <td className="py-3.5 px-6">
                                  <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1 sm:gap-2">
                                    <button
                                      onClick={() => startEditProgram(p)}
                                      className="py-1 px-1.5 sm:p-1.5 w-16 sm:w-20 justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProgram(p.id, p.name)}
                                      className="py-1 px-1.5 sm:p-1.5 w-16 sm:w-20 justify-center rounded-lg border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredPrograms.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">No certification programs matching search query.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Programs Cards - Mobile */}
                      <div className="block md:hidden space-y-4">
                        {filteredPrograms.map((p) => (
                          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                            <div className="space-y-1">
                              <h3 
                                onClick={() => setSelectedProgramDetails(p)}
                                className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer text-sm capitalize"
                              >
                                {p.name}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-mono">Program ID: {p.id}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                              <div className="col-span-2">
                                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Organization</p>
                                <p className="font-semibold text-slate-800 capitalize truncate">{p.workspace_name}</p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Template</p>
                                <p className="font-semibold text-slate-800 font-mono text-[10px] truncate">{p.template_id || 'None'}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                              <div>
                                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Certs Issued</p>
                                <p className="font-semibold text-slate-800 font-mono text-[10px]">{p.certificate_count || 0}</p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Issue Date</p>
                                <p className="font-semibold text-slate-800 font-mono">{p.issue_date}</p>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 text-xs flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">UUID: {p.id.substring(0, 8)}...</span>
                              <div className="flex gap-2.5">
                                <button
                                  onClick={() => startEditProgram(p)}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                                  title="Edit Program"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProgram(p.id, p.name)}
                                  className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:text-red-700 transition-all cursor-pointer"
                                  title="Delete Program"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredPrograms.length === 0 && (
                          <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
                            No certification programs matching search query.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: CERTIFICATES */}
              {activeTab === 'certificates' && (
                <div className="space-y-6">
                  
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Issued Ledger Count</p>
                      <h4 className="text-3xl font-display font-bold text-slate-950">{certificates.length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Valid Credentials</p>
                      <h4 className="text-3xl font-display font-bold text-emerald-600">{certificates.filter(c => c.status === 'valid').length}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">Revoked Credentials</p>
                      <h4 className="text-3xl font-display font-bold text-rose-600">{certificates.filter(c => c.status === 'revoked').length}</h4>
                    </div>
                  </div>

                  {/* Certificates Table - Desktop */}
                  <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
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
                              <p className="font-semibold text-slate-900 capitalize">{c.recipient_name}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{c.recipient_email}</p>
                            </td>
                            <td className="py-3.5 px-6 text-slate-600 font-medium capitalize">{c.program_name}</td>
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

                  {/* Certificates Cards - Mobile */}
                  <div className="block md:hidden space-y-4">
                    {filteredCertificates.map((c) => (
                      <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-slate-900 text-xs">{c.id}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${c.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {c.status === 'valid' ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {c.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Recipient</p>
                            <p className="font-bold text-slate-900 capitalize">{c.recipient_name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{c.recipient_email}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Course / Org</p>
                            <p className="font-semibold text-slate-800 truncate">{c.program_name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{c.workspace_name}</p>
                          </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                          {c.status === 'valid' ? (
                            <button
                              onClick={() => startRevokeCertificate(c)}
                              className="w-full py-2 justify-center rounded-lg border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" /> Revoke Credential
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestoreCertificate(c.id)}
                              className="w-full py-2 justify-center rounded-lg border border-emerald-100 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-all inline-flex items-center gap-1.5 text-xs font-bold"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Restore Valid State
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredCertificates.length === 0 && (
                      <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
                        No certificates matching search query.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit Workspace Modal */}
      {editingWorkspace && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">Modify Workspace Configuration</h3>
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
                  onChange={(e) => setWsName(capitalizeWords(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand Name</label>
                <input
                  type="text"
                  required
                  value={wsBrandName}
                  onChange={(e) => setWsBrandName(capitalizeWords(e.target.value))}
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
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">Modify Certification Program</h3>
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
                  onChange={(e) => setProgName(capitalizeWords(e.target.value))}
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
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-red-600 flex items-center gap-1.5"><ShieldAlert className="w-5 h-5" /> Revoke Certification</h3>
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

      {selectedAuditTrailCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border text-left border-slate-200 rounded-2xl max-w-xl w-full p-8 shadow-2xl relative flex flex-col max-h-[80vh]">
            <button
              onClick={() => setSelectedAuditTrailCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              type="button"
              title="Close audit view"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-2xl italic text-slate-950 pb-3 border-b">
              Certificate history
            </h3>
            <p className="text-xs text-slate-500 mt-2 mb-4">
              Recorded events for credential <span className="font-mono text-slate-800">{selectedAuditTrailCert.id}</span> issued to <span className="font-bold text-slate-800">{selectedAuditTrailCert.recipient_name}</span>.
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {(() => {
                const logs = auditTrailLogs;
                if (auditTrailLoading) {
                  return <div className="text-center py-8 text-slate-400 font-mono text-xs">Loading history…</div>;
                }
                if (logs.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400 font-mono text-xs">
                      No events recorded yet.
                    </div>
                  );
                }
                return (
                  <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-6">
                    {logs.map((log: any, idx: number) => {
                      let Icon = Check;
                      let iconColor = 'text-emerald-500 bg-emerald-50';
                      if (log.event === 'REVOKED') {
                        Icon = ShieldAlert;
                        iconColor = 'text-rose-500 bg-rose-50';
                      } else if (log.event === 'EMAIL_DISPATCHED') {
                        Icon = Mail;
                        iconColor = 'text-blue-500 bg-blue-50';
                      } else if (log.event === 'METADATA_UPDATED') {
                        Icon = Check; // Check works well as replacement
                        iconColor = 'text-amber-500 bg-amber-50';
                      }

                      return (
                        <div key={idx} className="relative">
                          <span className={`absolute -left-[25px] top-0.5 rounded-full p-0.5 border-2 border-white ${iconColor}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{log.event || 'VERIFIED'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-normal">{log.details}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Operator: {log.performedBy}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <button
                onClick={() => setSelectedAuditTrailCert(null)}
                className="bg-slate-950 text-white text-xs px-5 py-2.5 rounded-lg font-bold hover:bg-slate-800"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cryptographic Status Check */}
      {selectedCryptoProofCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border text-left border-slate-200 rounded-2xl max-w-lg w-full p-8 shadow-2xl relative space-y-6 animate-scale-up">
            <button
              onClick={() => setSelectedCryptoProofCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              type="button"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="p-2 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h3 className="font-serif text-2xl italic text-slate-950">Signature</h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-wide uppercase mt-0.5">
                  {selectedCryptoProofCert.signature_alg} · v{selectedCryptoProofCert.signature_version}
                </p>
              </div>
            </div>

            {/* See the matching panel in Dashboard.tsx: this claimed Ed25519 and a
                Merkle-root "consensus anchor" over a Math.random() value. */}
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
                <Check className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900">Keyed message authentication code</h4>
                  <p className="text-slate-600 leading-normal">
                    Recipient, program, and dates are signed with a server-held secret key. Editing any
                    of them invalidates the signature. The key is symmetric, so only this registry can verify it.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 font-sans">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[9px] font-bold uppercase inline-block">
                    {selectedCryptoProofCert.status}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Algorithm</span>
                  <span className="font-mono text-slate-800 font-semibold block text-[10px]">{selectedCryptoProofCert.signature_alg}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Verified</span>
                  <span className="font-mono text-slate-800 font-semibold block text-[10px]">{selectedCryptoProofCert.verify_count}×</span>
                </div>
              </div>

              <div className="space-y-1.5 font-mono">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Signature (hex)</label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 break-all text-[10px] text-slate-700 font-semibold">
                  {selectedCryptoProofCert.signature}
                </div>
              </div>

              <div className="space-y-1.5 font-mono">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Signed fields</label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[10px] text-slate-700 leading-relaxed">
                  id · workspace · program · recipient name · recipient email · issue date · expiry date
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedCryptoProofCert(null)}
                className="bg-slate-950 hover:bg-slate-800 text-white text-xs px-5 py-2.5 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Close Status Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: JSON Envelope View */}
      {selectedJsonEnvelopeCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border text-left border-slate-200 rounded-2xl max-w-xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-up">
            <button
              onClick={() => setSelectedJsonEnvelopeCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              type="button"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-serif text-2xl italic text-slate-950">JSON Metadata Envelope</h3>
              <p className="text-xs text-slate-500 mt-1">
                Registry record for ID: <span className="font-mono text-slate-800">{selectedJsonEnvelopeCert.id}</span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto my-4 bg-slate-950 rounded-xl p-4 text-[11px] font-mono text-emerald-400 border border-slate-800 scrollbar-thin">
              <pre className="whitespace-pre-wrap leading-relaxed select-all">
                {/* Was a W3C Verifiable Credential with a forged Ed25519Signature2020
                    proof and a `did:glint:` verification method that does not exist. */}
                {JSON.stringify({
                  id: selectedJsonEnvelopeCert.id,
                  issuer: selectedJsonEnvelopeCert.workspace_id,
                  issuanceDate: selectedJsonEnvelopeCert.issue_date,
                  expiryDate: selectedJsonEnvelopeCert.expiry_date ?? null,
                  status: selectedJsonEnvelopeCert.status,
                  subject: {
                    name: selectedJsonEnvelopeCert.recipient_name,
                    email: selectedJsonEnvelopeCert.recipient_email,
                    programId: selectedJsonEnvelopeCert.program_id,
                    programName: selectedJsonEnvelopeCert.program_name,
                  },
                  signature: {
                    algorithm: selectedJsonEnvelopeCert.signature_alg,
                    version: selectedJsonEnvelopeCert.signature_version,
                    value: selectedJsonEnvelopeCert.signature,
                    note: 'Symmetric HMAC. Verifiable only by the issuing registry.',
                  },
                }, null, 2)}
              </pre>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedJsonEnvelopeCert, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `credential-${selectedJsonEnvelopeCert.id}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  toast.success('JSON metadata downloaded successfully!');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2.5 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Download Metadata
              </button>
              <button
                onClick={() => setSelectedJsonEnvelopeCert(null)}
                className="bg-slate-950 hover:bg-slate-800 text-white text-xs px-5 py-2.5 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Close Envelope View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Card / Certificate PDF Preview */}
      {selectedPreviewCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border text-left border-slate-200 rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative flex flex-col max-h-[90vh] animate-scale-up">
            <button
              onClick={() => setSelectedPreviewCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              type="button"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-serif text-2xl italic text-slate-950">Credential Design Preview (Admin Control)</h3>
              <p className="text-xs text-slate-500 mt-1">Exportable secure preview card for verification audits.</p>
            </div>

            <div className="flex-1 my-6 overflow-y-auto flex items-center justify-center bg-slate-50 border border-slate-250 rounded-xl p-6">
              <div className="bg-white w-full max-w-lg aspect-[1.6/1] border-8 border-double border-slate-800 p-8 flex flex-col justify-between text-center relative shadow-md font-serif">
                {/* Micro security watermark */}
                <div className="absolute top-2 right-3 font-mono text-[6px] text-slate-300">GLINT PUBLIC REGISTRY ANCHORED PROOF</div>
                
                <div className="space-y-1">
                  <h4 className="text-xl font-bold uppercase tracking-wider text-slate-900">Certificate of Achievement</h4>
                  <p className="text-[10px] italic text-slate-500 font-sans">This certifies that the recipient is officially registered in the Registry database.</p>
                </div>

                <div className="my-3 space-y-1">
                  <p className="text-[11px] text-slate-400 font-sans">This is proud credential validation of</p>
                  <h2 className="text-2xl font-bold text-slate-950 capitalize italic underline decoration-1 decoration-slate-400 underline-offset-8">{selectedPreviewCert.recipient_name}</h2>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400 font-sans">for completing the official program requirements in</p>
                  <h3 className="text-sm font-bold text-slate-800 font-sans uppercase tracking-wide">{selectedPreviewCert.program_name || "Certification Program"}</h3>
                </div>

                <div className="flex justify-between items-end border-t border-slate-150 pt-4 mt-2 text-[8px] text-slate-500 font-sans">
                  <div className="text-left space-y-0.5">
                    <p>VERIFICATION AUTHORITY ID</p>
                    <p className="font-mono text-slate-900 font-semibold">{selectedPreviewCert.id.substring(0, 16)}...</p>
                  </div>
                  <div className="text-center space-y-0.5">
                    <p>STATUS</p>
                    <p className={`font-bold uppercase ${selectedPreviewCert.status === 'valid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedPreviewCert.status}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p>DATE ISSUED</p>
                    <p className="font-mono text-slate-900 font-semibold">{selectedPreviewCert.issue_date ? selectedPreviewCert.issue_date.split('T')[0] : ""}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2.5 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Print / PDF Export
              </button>
              <button
                onClick={() => setSelectedPreviewCert(null)}
                className="bg-slate-950 hover:bg-slate-800 text-white text-xs px-5 py-2.5 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
