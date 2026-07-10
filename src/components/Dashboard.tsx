import { toast } from 'sonner';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award, BarChart3, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Database, Download, ExternalLink, Eye, Globe, Layers, List, LogOut, Mail, Menu,
  MoreHorizontal, PenLine, Play, Plus, RefreshCw, Search, Send, ShieldAlert,
  ShieldCheck, Sliders, Trash2, Upload, X, AlertTriangle, ArrowLeft, ArrowUpRight,
} from 'lucide-react';
import {
  OrganizationWorkspace, CertificateProgram, CertificateTemplate,
  Certificate, Recipient, WorkspaceAnalytics, EmailLog, EmailStatus,
  EmailDeliveryStatus, AuditLogEntry,
} from '../types';
import { CanvaEditor } from './CanvaEditor';
import { TemplatePreview, captureTemplatePreviewPng } from './TemplatePreview';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import {
  renderEmailHtml, sampleEmailVars, sampleDigestVars, type EmailTemplateDoc,
} from '../../lib/emailTemplateHtml';
import {
  GlintFileError, isGlintFileName, parseGlintFile,
  serializeGlintFile, glintFileNameFor, downloadTextFile,
} from '../lib/glintFile';

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Presentation for the outbox lifecycle — did WE hand the message to the
 * provider (pending → sending → sent / failed, or simulated when no transport
 * is configured). `sent` is deliberately "Sent", not "Delivered": handing a
 * message to Resend is not the same as it reaching an inbox. The real delivery
 * outcome comes from the webhook and overrides this (see EMAIL_DELIVERY_BADGE).
 */
const EMAIL_STATUS_BADGE: Record<EmailStatus, { label: string; className: string }> = {
  sent:      { label: 'Sent',       className: 'bg-sky-50 text-sky-700 border-sky-200' },
  pending:   { label: 'Queued',     className: 'bg-amber-50 text-amber-700 border-amber-200' },
  sending:   { label: 'Sending',    className: 'bg-sky-50 text-sky-700 border-sky-200' },
  failed:    { label: 'Failed',     className: 'bg-rose-50 text-rose-700 border-rose-200' },
  simulated: { label: 'Simulated',  className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/**
 * Presentation for the delivery outcome reported by Resend's webhook. When
 * present this is the truth — it supersedes the outbox status because it
 * describes what happened to the message after we sent it.
 */
const EMAIL_DELIVERY_BADGE: Record<EmailDeliveryStatus, { label: string; className: string }> = {
  delivered:        { label: 'Delivered',       className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  opened:           { label: 'Opened',          className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  clicked:          { label: 'Clicked',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sent:             { label: 'Sent',            className: 'bg-sky-50 text-sky-700 border-sky-200' },
  scheduled:        { label: 'Scheduled',       className: 'bg-slate-100 text-slate-600 border-slate-200' },
  delivery_delayed: { label: 'Delayed',         className: 'bg-amber-50 text-amber-700 border-amber-200' },
  bounced:          { label: 'Bounced',         className: 'bg-rose-50 text-rose-700 border-rose-200' },
  complained:       { label: 'Spam complaint',  className: 'bg-rose-50 text-rose-700 border-rose-200' },
  failed:           { label: 'Failed',          className: 'bg-rose-50 text-rose-700 border-rose-200' },
  suppressed:       { label: 'Suppressed',      className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const emailStatusBadge = (status: EmailStatus) =>
  EMAIL_STATUS_BADGE[status] ?? EMAIL_STATUS_BADGE.pending;

/** The status to actually show: provider delivery outcome if known, else outbox. */
const emailDisplayBadge = (log: EmailLog) =>
  (log.deliveryStatus && EMAIL_DELIVERY_BADGE[log.deliveryStatus]) || emailStatusBadge(log.status);

/** The most informative failure/detail string available for a message, if any. */
const emailDetailText = (log: EmailLog): string | undefined => {
  if (log.deliveryStatus === 'bounced' || log.deliveryStatus === 'complained' || log.deliveryStatus === 'failed') {
    return log.deliveryDetail || EMAIL_DELIVERY_BADGE[log.deliveryStatus].label;
  }
  // Show the send error even while the message is still retrying (status
  // 'pending' with a recorded error), so a rejected send — e.g. an unverified
  // sender domain — is visible immediately, not only once retries are exhausted.
  if (log.lastError) return log.lastError;
  return undefined;
};

type DashboardTab = 'overview' | 'programs' | 'templates' | 'issued' | 'emails' | 'branding';
type LegacyTab = DashboardTab | 'recipients' | 'settings';

/** Old bookmarks still say ?tab=recipients / ?tab=settings; land them somewhere sane. */
const normalizeTab = (tab: LegacyTab | undefined): DashboardTab => {
  if (tab === 'recipients') return 'issued';
  if (tab === 'settings') return 'branding';
  return (tab as DashboardTab) || 'overview';
};

interface DashboardProps {
  currentWorkspaceId: string;
  activeTab: LegacyTab;
  onTabChange: (tab: DashboardTab) => void;
  onWorkspaceChange: (id: string) => void;
  onViewCertificatePage: (id: string) => void;
  token: string | null;
  user: any;
  onLogout: () => void;
}

/* ── Shared design tokens (Cloudflare-flat) ──────────────────────────────── */

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed';
const btnSecondary =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed';
const btnDanger =
  'inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed';
const inputBase =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelBase = 'block text-[12px] font-medium text-slate-600';
const card = 'rounded-lg border border-slate-200 bg-white';
const th = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500';

const statusBadge = (status: Certificate['status']) => {
  const styles: Record<Certificate['status'], string> = {
    valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    revoked: 'bg-rose-50 text-rose-700 border-rose-200',
    expired: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${styles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

export function Dashboard({
  currentWorkspaceId,
  activeTab: activeTabProp,
  onTabChange,
  onWorkspaceChange,
  onViewCertificatePage,
  token,
  user,
  onLogout
}: DashboardProps) {
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
  const todayIso = () => new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<DashboardTab>(normalizeTab(activeTabProp));

  useEffect(() => {
    const normalized = normalizeTab(activeTabProp);
    if (normalized !== activeTab) setActiveTab(normalized);
  }, [activeTabProp]);

  const changeTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    onTabChange(tab);
    setIsMobileSidebarOpen(false);
    setSelectedProgramDetails(null);
  };

  // Backend States
  const [selectedProgramDetails, setSelectedProgramDetails] = useState<CertificateProgram | null>(null);
  const [workspaces, setWorkspaces] = useState<OrganizationWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<OrganizationWorkspace | null>(null);
  const [programs, setPrograms] = useState<CertificateProgram[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [selectedEmailLog, setSelectedEmailLog] = useState<EmailLog | null>(null);
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const actionLockRef = useRef<string | null>(null);

  // Workspace Creation modal state
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsBrandName, setNewWsBrandName] = useState('');
  const [newWsColor, setNewWsColor] = useState('#1a73e8');
  const [newWsAccent, setNewWsAccent] = useState('#22c55e');

  // Program Creation states
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [progName, setProgName] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [progTemplateId, setProgTemplateId] = useState('');
  const [progIssueDate, setProgIssueDate] = useState(todayIso);
  const [progExpiryDate, setProgExpiryDate] = useState('');
  const [fieldString, setFieldString] = useState('');
  const [editingProgram, setEditingProgram] = useState<CertificateProgram | null>(null);

  // Template Editor states
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [selectedTextElId, setSelectedTextElId] = useState<string | null>(null);

  // Email template designers (issuance + digest)
  const [showEmailDesigner, setShowEmailDesigner] = useState(false);
  const [showDigestDesigner, setShowDigestDesigner] = useState(false);

  // Registry multi-select + manual bulk send
  const [selectedCertIds, setSelectedCertIds] = useState<Set<string>>(new Set());
  const [sendingEmails, setSendingEmails] = useState(false);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [digestEmail, setDigestEmail] = useState('');
  const [digestName, setDigestName] = useState('');

  // Bulk issuance wizard (modal on the Issued tab)
  const [showBulkIssueModal, setShowBulkIssueModal] = useState(false);
  const [bulkStep, setBulkStep] = useState<'program' | 'input' | 'preview' | 'success'>('program');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [rawCsvInput, setRawCsvInput] = useState('');
  const [validatedRecipients, setValidatedRecipients] = useState<Recipient[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [mappedCertificates, setMappedCertificates] = useState<Certificate[]>([]);

  // Revocation workflow states
  const [revokingCertId, setRevokingCertId] = useState<string | null>(null);
  const [selectedAuditTrailCert, setSelectedAuditTrailCert] = useState<Certificate | null>(null);
  // The audit trail is no longer a JSONB blob carried on every certificate row —
  // it grew without bound on each public view. It lives in `certificate_events`
  // and is fetched when the modal opens.
  const [auditTrailLogs, setAuditTrailLogs] = useState<AuditLogEntry[]>([]);
  const [auditTrailLoading, setAuditTrailLoading] = useState(false);
  const [resendingCertId, setResendingCertId] = useState<string | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [selectedCryptoProofCert, setSelectedCryptoProofCert] = useState<Certificate | null>(null);
  const [selectedJsonEnvelopeCert, setSelectedJsonEnvelopeCert] = useState<Certificate | null>(null);
  const [selectedPreviewCert, setSelectedPreviewCert] = useState<Certificate | null>(null);

  // Single Recipient Issuance states
  const [showSingleIssueModal, setShowSingleIssueModal] = useState(false);
  const [singleProgramId, setSingleProgramId] = useState('');
  const [singleRecipientName, setSingleRecipientName] = useState('');
  const [singleRecipientEmail, setSingleRecipientEmail] = useState('');
  const [singleCustomFields, setSingleCustomFields] = useState<Record<string, string>>({});
  const [singleIssueDate, setSingleIssueDate] = useState('');

  // Filtering & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const PAGE_SIZE = pageSize;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Branding draft — edited locally, persisted with an explicit Save (the old
  // form fired a PUT + toast on every keystroke).
  const [brandingDraft, setBrandingDraft] = useState({
    brandName: '', primaryColor: '#0F172A', accentColor: '#F59E0B',
    senderName: '', senderEmail: '', footerText: '',
  });
  const [brandingDirty, setBrandingDirty] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    setBrandingDraft({
      brandName: currentWorkspace.branding.brandName || '',
      primaryColor: currentWorkspace.branding.primaryColor || '#0F172A',
      accentColor: currentWorkspace.branding.accentColor || '#F59E0B',
      senderName: currentWorkspace.branding.senderName || '',
      senderEmail: currentWorkspace.branding.senderEmail || '',
      footerText: currentWorkspace.branding.footerText || '',
    });
    setBrandingDirty(false);
  }, [currentWorkspace]);

  const setBranding = (patch: Partial<typeof brandingDraft>) => {
    setBrandingDraft((d) => ({ ...d, ...patch }));
    setBrandingDirty(true);
  };

  const pendingActionLabels: Record<string, string> = {
    'workspace:create': 'Creating workspace...',
    'program:save': editingProgram ? 'Saving program...' : 'Creating program...',
    'template:create': 'Creating template...',
    'template:save': 'Saving template...',
    'template:upload': 'Uploading template...',
    'certificates:bulk': 'Issuing certificates...',
    'certificate:single': 'Issuing certificate...',
    'certificate:revoke': 'Revoking certificate...',
    'branding:save': 'Saving branding...',
    'emailTemplate:save': 'Saving email template...',
  };
  const pendingActionLabel =
    pendingAction && (pendingActionLabels[pendingAction] || (pendingAction.startsWith('program:delete') ? 'Deleting program...' : pendingAction.startsWith('template:delete') ? 'Deleting template...' : pendingAction.startsWith('certificate:restore') ? 'Restoring certificate...' : 'Working...'));
  const isActionPending = (key: string) => pendingAction === key;
  const beginAction = (key: string) => {
    if (actionLockRef.current) return false;
    actionLockRef.current = key;
    setPendingAction(key);
    return true;
  };
  const endAction = (key: string) => {
    if (actionLockRef.current === key) {
      actionLockRef.current = null;
      setPendingAction(null);
    }
  };
  const readApiError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.error || fallback;
    } catch {
      try {
        const text = await res.text();
        return text || fallback;
      } catch {
        return fallback;
      }
    }
  };

  // 1. Initial Load & Dynamic Synchronization
  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (currentWorkspaceId) {
      loadWorkspaceData();
      setSelectedProgramDetails(null);
    }
  }, [currentWorkspaceId]);

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

  const loadWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces', { headers: authHeaders });
      if (res.status === 401) {
        toast.error('Session expired. Please log in again.');
        onLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
        const match = data.find((w: any) => w.id === currentWorkspaceId);
        if (match) {
          setCurrentWorkspace(match);
        } else if (data.length > 0) {
          setCurrentWorkspace(data[0]);
          onWorkspaceChange(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading workspaces', err);
    }
  };

  const loadWorkspaceData = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    try {
      // Parallel fetch to load workspace resources speed-first
      const [programsRes, templatesRes, certsRes, emailsRes, analyticsRes, workspaceRes] = await Promise.all([
        fetch(`/api/programs?workspaceId=${currentWorkspaceId}`, { headers: authHeaders }),
        fetch(`/api/templates?workspaceId=${currentWorkspaceId}`, { headers: authHeaders }),
        fetch(`/api/certificates?workspaceId=${currentWorkspaceId}`, { headers: authHeaders }),
        fetch(`/api/email-logs?workspaceId=${currentWorkspaceId}`, { headers: authHeaders }),
        fetch(`/api/analytics?workspaceId=${currentWorkspaceId}`, { headers: authHeaders }),
        fetch(`/api/workspaces/${currentWorkspaceId}`, { headers: authHeaders })
      ]);

      if (programsRes.status === 401) {
        toast.error('Session expired. Please log in again.');
        onLogout();
        return;
      }
      if (programsRes.status === 403) {
        // Workspace access denied — don't logout, just show error
        toast.error('Workspace access denied. You may not have access to this workspace.');
        return;
      }
      if (programsRes.ok) setPrograms(await programsRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (certsRes.ok) setCertificates(await certsRes.json());
      if (emailsRes.ok) setEmailLogs(await emailsRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (workspaceRes.ok) setCurrentWorkspace(await workspaceRes.json());

    } catch (err) {
      console.error('Error loading dashboard assets', err);
    } finally {
      if (!options.silent) setLoading(false);
    }
  };

  const triggerDataRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadWorkspaceData({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  // 2. Onboard Brand New Workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName || !newWsBrandName) return;
    const actionKey = 'workspace:create';
    if (!beginAction(actionKey)) return;

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          name: newWsName,
          brandName: newWsBrandName,
          primaryColor: newWsColor,
          accentColor: newWsAccent
        })
      });

      if (res.ok) {
        const created = await res.json();
        // Reload list
        const listRes = await fetch('/api/workspaces', { headers: authHeaders });
        if (listRes.ok) {
          const loadedList = await listRes.json();
          setWorkspaces(loadedList);
        }
        setShowWorkspaceModal(false);
        setNewWsName('');
        setNewWsBrandName('');
        setNewWsColor('#1a73e8');
        setNewWsAccent('#22c55e');
        toast.success(`Organization "${created.name}" created.`);
        // Switch to new
        onWorkspaceChange(created.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to create workspace.');
      }
    } catch (err) {
      console.error('Failed to register workspace', err);
      toast.error('Network error creating workspace. Please try again.');
    } finally {
      endAction(actionKey);
    }
  };

  // 3. Create or Edit a Program
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTemplateId = progTemplateId || templates[0]?.id || '';
    if (!progName || !selectedTemplateId) {
      toast.error('Add a program name and choose a certificate template.');
      return;
    }
    const actionKey = 'program:save';
    if (!beginAction(actionKey)) return;

    // Filter out standard base fields (name, email, date, id, program) and duplicates
    const baseFields = ['name', 'email', 'date', 'id', 'program'];
    const uniqueFields: string[] = [];
    fieldString.split(',').forEach(field => {
      const trimmed = field.trim();
      if (!trimmed) return;

      const lower = trimmed.toLowerCase();
      if (baseFields.includes(lower)) return;
      if (uniqueFields.some(f => f.toLowerCase() === lower)) return;

      uniqueFields.push(trimmed);
    });

    try {
      const url = editingProgram ? `/api/programs/${editingProgram.id}` : '/api/programs';
      const method = editingProgram ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          workspaceId: currentWorkspaceId,
          name: progName,
          description: progDesc,
          templateId: selectedTemplateId,
          issueDate: progIssueDate,
          expiryDate: progExpiryDate || undefined,
          recipientFields: uniqueFields
        })
      });

      if (res.ok) {
        setShowProgramForm(false);
        setEditingProgram(null);
        setProgName('');
        setProgDesc('');
        setProgIssueDate(todayIso());
        setProgExpiryDate('');
        setFieldString('');
        await triggerDataRefresh();
        toast.success(editingProgram ? 'Program updated.' : 'Program created.');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save program.');
      }
    } catch (err) {
      console.error('Failed to save program', err);
      toast.error('Network error saving program. Please try again.');
    } finally {
      endAction(actionKey);
    }
  };

  // 3b. Issue a Single Certificate (Single Issuer).
  // `sendEmail` picks between "Issue & send email" and "Issue only, send later".
  const issueSingleCertificate = async (sendEmail: boolean) => {
    if (!singleProgramId || !singleRecipientName || !singleRecipientEmail) {
      toast.error('Name and Email are required.');
      return;
    }
    const actionKey = 'certificate:single';
    if (!beginAction(actionKey)) return;

    const matchedProg = programs.find(p => p.id === singleProgramId);
    if (!matchedProg) {
      endAction(actionKey);
      return;
    }

    const issueDateVal = singleIssueDate || matchedProg.issueDate || new Date().toISOString().split('T')[0];

    const recipient: Recipient = {
      id: `rec-single-${Math.random().toString(36).substring(2, 7)}`,
      name: capitalizeWords(singleRecipientName),
      email: singleRecipientEmail.trim(),
      customFields: {
        ...singleCustomFields,
        date: issueDateVal,
        name: capitalizeWords(singleRecipientName),
        email: singleRecipientEmail.trim(),
        program: matchedProg.name
      },
      isValid: true,
      status: 'pending'
    };

    try {
      const res = await fetch(`/api/programs/${singleProgramId}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ recipients: [recipient], sendEmail })
      });

      if (res.ok) {
        setShowSingleIssueModal(false);
        setSingleRecipientName('');
        setSingleRecipientEmail('');
        setSingleCustomFields({});
        changeTab('issued');
        await triggerDataRefresh();
        toast.success(sendEmail ? 'Certificate issued and email sent.' : 'Certificate issued. Send the email later from the registry.');
      } else {
        const errData = await res.json();
        toast.error(`Failed to issue certificate: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Single issuance failed', err);
      toast.error('An error occurred during issuance.');
    } finally {
      endAction(actionKey);
    }
  };

  // 4. Visual Template Editor Tools
  const selectTemplateForEditor = (temp: CertificateTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(temp))); // Deep copy
    if (temp.textElements.length > 0) {
      setSelectedTextElId(temp.textElements[0].id);
    }
  };

  const handleSaveCanvaTemplate = async (updated: CertificateTemplate) => {
    const actionKey = 'template:save';
    if (!beginAction(actionKey)) return;
    try {
      const res = await fetch(`/api/templates/${updated.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const saved = await res.json();
        setTemplates((items) => items.map((item) => (item.id === saved.id ? saved : item)));
        setEditingTemplate(null);
        await triggerDataRefresh();
        toast.success('Template saved.');
      } else {
        toast.error(await readApiError(res, 'Failed to save template.'));
      }
    } catch (err) {
      console.error('Failed saving template edits', err);
      toast.error('Failed to save template changes.');
    } finally {
      endAction(actionKey);
    }
  };

  const handleAddNewTemplate = async () => {
    const actionKey = 'template:create';
    if (!beginAction(actionKey)) return;
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          workspaceId: currentWorkspaceId,
          name: 'New Custom Workspace Template',
          layout: 'landscape',
          backgroundColor: '#FFFFFF',
          borderColor: currentWorkspace?.branding.primaryColor || '#0a0a0a',
          borderWidth: 6,
          showSeal: true,
          sealType: 'classic',
          signatoryName: 'Jane Doe',
          signatoryTitle: 'Chancellor, Education Unit',
          textElements: [
            { id: 'et1', text: 'CERTIFICATE OF MASTERY', fontSize: 24, fontFamily: 'Space Grotesk', fontWeight: 'bold', color: '#0F172A', xPercent: 50, yPercent: 25, align: 'center' },
            { id: 'et2', text: 'Granted proud recipient', fontSize: 11, fontFamily: 'Inter', fontWeight: 'normal', color: '#64748B', xPercent: 50, yPercent: 36, align: 'center' },
            { id: 'et3', text: '{{name}}', fontSize: 34, fontFamily: 'Playfair Display', fontWeight: 'bold', color: currentWorkspace?.branding.accentColor || '#1a73e8', xPercent: 50, yPercent: 48, align: 'center', isPlaceholder: true },
            { id: 'et4', text: 'for dedicated program participation in', fontSize: 11, fontFamily: 'Inter', fontWeight: 'normal', color: '#64748B', xPercent: 50, yPercent: 58, align: 'center' },
            { id: 'et5', text: '{{program}}', fontSize: 18, fontFamily: 'Space Grotesk', fontWeight: 'bold', color: '#0F172A', xPercent: 50, yPercent: 66, align: 'center', isPlaceholder: true }
          ]
        })
      });
      if (res.ok) {
        await triggerDataRefresh();
        toast.success('Template created.');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to create template.');
      }
    } catch (err) {
      console.error('Failed creating template template', err);
      toast.error('Network error creating template.');
    } finally {
      endAction(actionKey);
    }
  };

  // The "Upload Certificate Design" control accepts Glint template (.glint)
  // files only. Background images are added from inside the blueprint editor.
  const handleUploadCertificateDesign = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input up front so the same file can be re-selected after any path.
    e.target.value = '';
    if (!file) return;

    if (!isGlintFileName(file.name)) {
      toast.error('Please upload a Glint template (.glint) file.');
      return;
    }

    await handleImportGlintFile(file);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to remove this template? This cannot be undone.')) return;
    const actionKey = `template:delete:${id}`;
    if (!beginAction(actionKey)) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        await triggerDataRefresh();
        toast.success('Template deleted.');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to delete template.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error deleting template.');
    } finally {
      endAction(actionKey);
    }
  };

  // Import a ".glint" template file uploaded through the "Upload Certificate
  // Design" control. The file carries a fully self-contained design (assets and
  // fonts inlined); we drop its embedded id/workspace, attach it to the current
  // workspace, and let the existing template endpoint persist it.
  const handleImportGlintFile = async (file: File) => {
    if (file.size > 12 * 1024 * 1024) {
      toast.error('This .glint file is too large to import (max 12MB).');
      return;
    }
    const actionKey = 'template:upload';
    if (!beginAction(actionKey)) return;
    try {
      const text = await file.text();
      const { name, template } = parseGlintFile(text);
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ ...template, workspaceId: currentWorkspaceId, name }),
      });
      if (res.ok) {
        await triggerDataRefresh();
        toast.success(`Imported "${name}" from .glint file.`);
      } else {
        toast.error(await readApiError(res, 'Failed to import the .glint template.'));
      }
    } catch (err) {
      if (err instanceof GlintFileError) {
        toast.error(err.message);
      } else {
        console.error('Failed importing .glint file', err);
        toast.error('Could not read the .glint file.');
      }
    } finally {
      endAction(actionKey);
    }
  };

  // Export a template as a downloadable ".glint" file. A best-effort PNG
  // thumbnail of the on-page preview is embedded for quick inspection; if the
  // capture fails the design still exports without it.
  const handleExportTemplate = async (temp: CertificateTemplate) => {
    const actionKey = `template:export:${temp.id}`;
    if (!beginAction(actionKey)) return;
    try {
      const node = document.getElementById(`tpl-preview-${temp.id}`);
      const preview = node ? await captureTemplatePreviewPng(node) : null;
      const content = serializeGlintFile(temp, preview ?? undefined);
      downloadTextFile(glintFileNameFor(temp.name), content);
      toast.success('Template exported as .glint file.');
    } catch (err) {
      console.error('Failed exporting .glint file', err);
      toast.error('Could not export this template.');
    } finally {
      endAction(actionKey);
    }
  };

  // 5. Bulk CSV parsing and dynamic field mapping
  const handleParseRecipients = () => {
    if (!selectedProgramId || !rawCsvInput.trim()) return;
    const program = programs.find(p => p.id === selectedProgramId);
    if (!program) return;

    setImportErrors([]);

    // Normalize newlines and split by lines
    const rawLines = rawCsvInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length === 0) return;

    const validated: Recipient[] = [];
    const errorsList: string[] = [];

    // Check if the first line contains headers (e.g. contains name or email keywords)
    const firstLine = rawLines[0];
    const firstLineParts = firstLine.split(',').map(p => p.trim().toLowerCase());
    const hasEmailHeader = firstLineParts.some(p => p.includes('email') || p.includes('mail'));
    const hasNameHeader = firstLineParts.some(p => p.includes('name') || p.includes('recipient') || p.includes('full'));

    if (hasEmailHeader && hasNameHeader) {
      // STANDARD CSV WITH HEADERS
      const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
      const emailColIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
      const nameColIdx = headers.findIndex(h => h.includes('name') || h.includes('recipient') || h.includes('full'));

      const customFieldIndices: Record<string, number> = {};
      program.recipientFields.forEach(field => {
        const idx = headers.findIndex(h => h === field.toLowerCase() || h.includes(field.toLowerCase()));
        if (idx !== -1) {
          customFieldIndices[field] = idx;
        }
      });

      for (let i = 1; i < rawLines.length; i++) {
        const rowElements = rawLines[i].split(',').map(r => r.trim());
        if (rowElements.length < Math.max(emailColIdx, nameColIdx) + 1) {
          errorsList.push(`Row ${i + 1}: Incomplete content columns mapping.`);
          continue;
        }

        const email = rowElements[emailColIdx];
        const name = capitalizeWords(rowElements[nameColIdx]);
        const rowErrors: string[] = [];

        if (!name) rowErrors.push('Missing recipient full name.');
        if (!email || !email.includes('@')) rowErrors.push('Invalid or missing email address.');

        const isDuplicate = validated.some(v => v.email.toLowerCase() === email.toLowerCase());
        if (isDuplicate) rowErrors.push('Duplicate recipient email encountered in list.');

        const customFields: Record<string, string> = {};
        program.recipientFields.forEach(field => {
          const flagIdx = customFieldIndices[field];
          customFields[field] = flagIdx !== undefined && rowElements[flagIdx] ? rowElements[flagIdx] : 'N/A';
        });

        validated.push({
          id: `rec-${i}`,
          email,
          name,
          customFields,
          isValid: rowErrors.length === 0,
          errors: rowErrors,
          status: 'pending'
        });
      }
    } else {
      // HEADERLESS INPUT (raw emails, comma-separated list, or newline-separated list)
      const items: string[] = [];

      rawLines.forEach((line) => {
        const parts = line.split(',').map(p => p.trim()).filter(p => p.length > 0);
        // If line is comma-separated emails
        if (parts.length > 1 && parts.every(p => p.includes('@') && !p.includes(' '))) {
          items.push(...parts);
        } else {
          items.push(line);
        }
      });

      items.forEach((item, idx) => {
        let email = '';
        let name = '';
        const rowErrors: string[] = [];

        // Check for Name <email@example.com> format
        const angleMatch = item.match(/^([^<]+)<([^>]+)>$/);
        if (angleMatch) {
          name = capitalizeWords(angleMatch[1].trim());
          email = angleMatch[2].trim();
        } else if (item.includes(',')) {
          // Check for Name, email or email, Name
          const parts = item.split(',').map(p => p.trim());
          const emailIdx = parts.findIndex(p => p.includes('@') && !p.includes(' '));
          if (emailIdx !== -1) {
            email = parts[emailIdx];
            const nameParts = parts.filter((_, i) => i !== emailIdx);
            name = capitalizeWords(nameParts.join(' '));
          } else {
            email = parts[0];
            name = capitalizeWords(parts.slice(1).join(' '));
          }
        } else {
          // Just email or just name
          if (item.includes('@')) {
            email = item;
            const localPart = item.split('@')[0];
            name = capitalizeWords(localPart.replace(/[\._-]/g, ' '));
          } else {
            email = item;
            name = 'Recipient';
          }
        }

        if (!name) name = 'Recipient';
        if (!email || !email.includes('@')) rowErrors.push('Invalid or missing email address.');

        const isDuplicate = validated.some(v => v.email.toLowerCase() === email.toLowerCase());
        if (isDuplicate) rowErrors.push('Duplicate recipient email encountered in list.');

        // Default all dynamic fields to 'N/A'
        const customFields: Record<string, string> = {};
        program.recipientFields.forEach(field => {
          customFields[field] = 'N/A';
        });

        validated.push({
          id: `rec-${idx + 1}`,
          email,
          name,
          customFields,
          isValid: rowErrors.length === 0,
          errors: rowErrors,
          status: 'pending'
        });
      });
    }

    setValidatedRecipients(validated);
    setImportErrors(errorsList);
    setBulkStep('preview');
  };

  // `sendEmail` picks "Issue & send emails" vs "Issue only, send later".
  const [bulkSentEmail, setBulkSentEmail] = useState(true);
  const runBulkIssue = async (sendEmail: boolean) => {
    if (validatedRecipients.length === 0 || !selectedProgramId) return;
    const actionKey = 'certificates:bulk';
    if (!beginAction(actionKey)) return;

    // Filter only valid entries to issue safely
    const activeIssuables = validatedRecipients.filter(r => r.isValid);
    if (activeIssuables.length === 0) {
      toast.error('There are no valid recipient rows to issue.');
      endAction(actionKey);
      return;
    }

    try {
      const res = await fetch(`/api/programs/${selectedProgramId}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ recipients: activeIssuables, sendEmail })
      });

      if (res.ok) {
        const output = await res.json();
        setMappedCertificates(output.certificates);
        setBulkSentEmail(sendEmail);
        setBulkStep('success');
        setRawCsvInput('');
        await triggerDataRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Issuance failed: ${errData.error || 'The server encountered an error processing the certificate registry.'}`);
      }
    } catch (err) {
      console.error('Issuance failed', err);
      toast.error('An unexpected network error occurred while dispatching certificates.');
    } finally {
      endAction(actionKey);
    }
  };

  const openBulkIssueModal = (programId?: string) => {
    if (programs.length === 0) {
      toast.error('Create at least one certification program first.');
      return;
    }
    setSelectedProgramId(programId || '');
    setRawCsvInput('');
    setValidatedRecipients([]);
    setImportErrors([]);
    setBulkStep(programId ? 'input' : 'program');
    setShowBulkIssueModal(true);
  };

  const closeBulkIssueModal = () => {
    setShowBulkIssueModal(false);
    setBulkStep('program');
    setValidatedRecipients([]);
    setImportErrors([]);
  };

  const openSingleIssueModal = (programId?: string) => {
    if (programs.length === 0) {
      toast.error('Create at least one certification program first.');
      return;
    }
    setSingleProgramId(programId || programs[0].id);
    setSingleRecipientName('');
    setSingleRecipientEmail('');
    setSingleCustomFields({});
    setSingleIssueDate(new Date().toISOString().split('T')[0]);
    setShowSingleIssueModal(true);
  };

  // 6. Certificate Revoke Trigger
  const handleInitiateRevoke = (certId: string) => {
    setRevokingCertId(certId);
    setRevocationReason('Standard academic audit flags: Violation of integrity clauses');
  };

  const handleExecuteRevocation = async () => {
    if (!revokingCertId) return;
    const actionKey = 'certificate:revoke';
    if (!beginAction(actionKey)) return;

    try {
      const res = await fetch(`/api/certificates/${revokingCertId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ status: 'revoked', reason: revocationReason })
      });

      if (res.ok) {
        setRevokingCertId(null);
        await triggerDataRefresh();
        toast.success('Certificate revoked.');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to revoke certificate.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error revoking certificate.');
    } finally {
      endAction(actionKey);
    }
  };

  const handleRestoreCertificate = async (id: string) => {
    const actionKey = `certificate:restore:${id}`;
    if (!beginAction(actionKey)) return;
    try {
      const res = await fetch(`/api/certificates/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ status: 'valid' })
      });
      if (res.ok) {
        await triggerDataRefresh();
        toast.success('Certificate restored.');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to restore certificate.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error restoring certificate.');
    } finally {
      endAction(actionKey);
    }
  };

  // 7. Branding & email template persistence
  const handleUpdateBrandingConfig = async (brandingUpdates: any, actionKey = 'branding:save') => {
    if (!currentWorkspace) return;
    if (!beginAction(actionKey)) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          branding: {
            ...currentWorkspace.branding,
            ...brandingUpdates
          }
        })
      });

      if (res.ok) {
        await triggerDataRefresh();
        toast.success('Branding saved.');
      } else {
        toast.error(await readApiError(res, 'Failed to save branding.'));
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error saving branding.');
    } finally {
      endAction(actionKey);
    }
  };

  const handleSaveBrandingDraft = () =>
    handleUpdateBrandingConfig({
      brandName: brandingDraft.brandName,
      primaryColor: brandingDraft.primaryColor,
      accentColor: brandingDraft.accentColor,
      senderName: brandingDraft.senderName,
      senderEmail: brandingDraft.senderEmail || undefined,
      footerText: brandingDraft.footerText,
    });

  const handleSaveEmailTemplate = async (doc: EmailTemplateDoc | null) => {
    if (!currentWorkspace) return;
    const actionKey = 'emailTemplate:save';
    if (!beginAction(actionKey)) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ emailTemplate: doc }),
      });
      if (res.ok) {
        setShowEmailDesigner(false);
        await triggerDataRefresh();
        toast.success(doc ? 'Email template saved. New issuance emails will use this design.' : 'Email template reset to default.');
      } else {
        toast.error(await readApiError(res, 'Failed to save the email template.'));
      }
    } catch (err) {
      console.error('Failed saving email template', err);
      toast.error('Network error saving the email template.');
    } finally {
      endAction(actionKey);
    }
  };

  const handleSaveDigestTemplate = async (doc: EmailTemplateDoc | null) => {
    if (!currentWorkspace) return;
    const actionKey = 'emailTemplate:save';
    if (!beginAction(actionKey)) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ digestEmailTemplate: doc }),
      });
      if (res.ok) {
        setShowDigestDesigner(false);
        await triggerDataRefresh();
        toast.success(doc ? 'Digest template saved.' : 'Digest template reset to default.');
      } else {
        toast.error(await readApiError(res, 'Failed to save the digest template.'));
      }
    } catch (err) {
      console.error('Failed saving digest template', err);
      toast.error('Network error saving the digest template.');
    } finally {
      endAction(actionKey);
    }
  };

  /* ── Manual bulk email from the registry ── */

  const clearSelection = () => setSelectedCertIds(new Set());

  const toggleCertSelected = (id: string) => {
    setSelectedCertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sendEmailsForSelection = async (mode: 'individual' | 'digest', extra?: { digestEmail: string; digestName: string }) => {
    const ids = [...selectedCertIds];
    if (ids.length === 0) return;
    setSendingEmails(true);
    try {
      const res = await fetch('/api/certificates/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          certificateIds: ids,
          mode,
          ...(mode === 'digest' ? { digestEmail: extra?.digestEmail, digestName: extra?.digestName || undefined } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (mode === 'digest') {
          toast.success(`Digest of ${data.certificateCount} certificate${data.certificateCount === 1 ? '' : 's'} queued to ${extra?.digestEmail}.`);
          setShowDigestModal(false);
          setDigestEmail('');
          setDigestName('');
        } else {
          const skipped = data.skippedRevoked ? ` (${data.skippedRevoked} revoked skipped)` : '';
          toast.success(`Queued ${data.queued} email${data.queued === 1 ? '' : 's'} to recipients${skipped}.`);
        }
        clearSelection();
        await triggerDataRefresh();
      } else {
        toast.error(await readApiError(res, 'Failed to queue emails.'));
      }
    } catch (err) {
      console.error('Bulk email failed', err);
      toast.error('Network error queuing emails.');
    } finally {
      setSendingEmails(false);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this program? All related certificates will be revoked.')) return;
    const actionKey = `program:delete:${id}`;
    if (!beginAction(actionKey)) return;
    try {
      const res = await fetch(`/api/programs/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        await triggerDataRefresh();
        toast.success('Program deleted.');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to delete program.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error deleting program.');
    } finally {
      endAction(actionKey);
    }
  };

  const handleEditProgram = (prog: CertificateProgram) => {
    setEditingProgram(prog);
    setProgName(prog.name);
    setProgDesc(prog.description);
    setProgTemplateId(prog.templateId);
    setProgIssueDate(prog.issueDate);
    setProgExpiryDate(prog.expiryDate || '');
    setFieldString(
      prog.recipientFields
        .filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase()))
        .join(', ')
    );
    setShowProgramForm(true);
    setSelectedProgramDetails(null);
    // Scroll the inner content container to top, not the window
    setTimeout(() => {
      const contentArea = document.getElementById('dashboard-content-area');
      if (contentArea) {
        contentArea.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');

  const handleResendEmail = async (certId: string) => {
    setResendingCertId(certId);
    try {
      const res = await fetch(`/api/certificates/${certId}/resend`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        toast.success('Verification email resent.');
        await triggerDataRefresh();
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

  /* ── Issued registry filter + pagination ── */

  const filteredCertificates = certificates.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.id.toLowerCase().includes(query) ||
      c.recipientName.toLowerCase().includes(query) ||
      c.recipientEmail.toLowerCase().includes(query) ||
      c.programName.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedCertificates = filteredCertificates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageStart = filteredCertificates.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredCertificates.length);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, currentWorkspaceId, pageSize]);

  // A selection is a set of certificate ids; drop any that vanish (deleted,
  // filtered out of the loaded set, or belonging to a workspace we switched away
  // from) so a manual send can never target a certificate the user can't see.
  useEffect(() => {
    setSelectedCertIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(certificates.map((c) => c.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [certificates]);

  const emailPreviewHtml = useMemo(() => {
    if (!currentWorkspace) return '';
    const doc = currentWorkspace.emailTemplate;
    if (!doc) return '';
    return renderEmailHtml(doc, sampleEmailVars(currentWorkspace.branding.brandName));
  }, [currentWorkspace]);

  const digestPreviewHtml = useMemo(() => {
    if (!currentWorkspace) return '';
    const doc = currentWorkspace.digestEmailTemplate;
    if (!doc) return '';
    return renderEmailHtml(doc, sampleDigestVars(currentWorkspace.branding.brandName));
  }, [currentWorkspace]);

  const MAX_BULK_EMAIL = 2000;
  const selectedOnPage = pagedCertificates.filter((c) => selectedCertIds.has(c.id)).length;
  const allOnPageSelected = pagedCertificates.length > 0 && selectedOnPage === pagedCertificates.length;
  const allFilteredSelected = filteredCertificates.length > 0 && filteredCertificates.every((c) => selectedCertIds.has(c.id));
  const toggleSelectPage = () => {
    setSelectedCertIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pagedCertificates.forEach((c) => next.delete(c.id));
      else pagedCertificates.forEach((c) => next.add(c.id));
      return next;
    });
  };
  // Selects every certificate matching the current search, not just this page —
  // capped at the number a single bulk send accepts.
  const selectAllFiltered = () => {
    const ids = filteredCertificates.slice(0, MAX_BULK_EMAIL).map((c) => c.id);
    setSelectedCertIds(new Set(ids));
    if (filteredCertificates.length > MAX_BULK_EMAIL) {
      toast.info(`Selected the first ${MAX_BULK_EMAIL} of ${filteredCertificates.length} — that is the most a single send allows.`);
    }
  };

  /** Kebab menu with every per-certificate operation. Used by both registries. */
  const renderCertActionsMenu = (c: Certificate, direction: 'down' | 'up' = 'down') => (
    <div className="inline-block text-left">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveActionMenuId(activeActionMenuId === c.id ? null : c.id);
        }}
        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
        title="Actions"
        type="button"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {activeActionMenuId === c.id && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setActiveActionMenuId(null)} />
          <div className={`absolute right-0 z-20 w-52 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white py-1 text-left shadow-lg ${direction === 'up' ? 'bottom-full mb-1' : 'mt-1'}`}>
            <div className="py-1">
              <button
                onClick={() => { setActiveActionMenuId(null); onViewCertificatePage(c.id); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5 text-slate-400" /> View public page
              </button>
              <button
                onClick={() => {
                  setActiveActionMenuId(null);
                  navigator.clipboard.writeText(`${window.location.origin}/c/${encodeURIComponent(c.id)}`);
                  toast.success('Verification URL copied to clipboard.');
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> Copy verify link
              </button>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setActiveActionMenuId(null); handleResendEmail(c.id); }}
                disabled={resendingCertId === c.id}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {resendingCertId === c.id ? 'Sending…' : 'Resend email'}
              </button>
              <button
                onClick={() => { setActiveActionMenuId(null); setSelectedAuditTrailCert(c); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <Sliders className="h-3.5 w-3.5 text-slate-400" /> Audit trail
              </button>
              <button
                onClick={() => { setActiveActionMenuId(null); setSelectedCryptoProofCert(c); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Signature status
              </button>
              <button
                onClick={() => { setActiveActionMenuId(null); setSelectedJsonEnvelopeCert(c); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <Database className="h-3.5 w-3.5 text-slate-400" /> JSON record
              </button>
              <button
                onClick={() => { setActiveActionMenuId(null); setSelectedPreviewCert(c); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <Award className="h-3.5 w-3.5 text-slate-400" /> Preview card
              </button>
            </div>
            <div className="py-1">
              {c.status === 'valid' ? (
                <button
                  onClick={() => { setActiveActionMenuId(null); handleInitiateRevoke(c.id); }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50"
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Revoke
                </button>
              ) : (
                <button
                  disabled={isActionPending(`certificate:restore:${c.id}`)}
                  onClick={() => { setActiveActionMenuId(null); handleRestoreCertificate(c.id); }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {isActionPending(`certificate:restore:${c.id}`) ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {isActionPending(`certificate:restore:${c.id}`) ? 'Restoring…' : 'Restore'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Render Program Candidate Registry Details Page
  const renderProgramDetailView = (program: CertificateProgram) => {
    const associatedTemplate = templates.find(t => t.id === program.templateId)?.name || 'Default';
    const programCerts = certificates.filter(c => c.programId === program.id);

    const totalIssued = programCerts.length;
    const validCount = programCerts.filter(c => c.status === 'valid').length;
    const revokedCount = programCerts.filter(c => c.status === 'revoked').length;

    const filteredCandidates = programCerts.filter(c =>
      c.recipientName.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
      c.recipientEmail.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(candidateSearchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProgramDetails(null)}
              className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold capitalize tracking-tight text-slate-900">{program.name}</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${totalIssued > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  {totalIssued > 0 ? 'Active' : 'No issuances'}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-500">
                <span className="font-mono">{program.id}</span> · Issue date {program.issueDate}{program.expiryDate ? ` · Expires ${program.expiryDate}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => handleEditProgram(program)} className={btnSecondary}>
              Edit program
            </button>
            <button onClick={() => openBulkIssueModal(program.id)} className={btnPrimary}>
              <Plus className="h-3.5 w-3.5" /> Issue certificates
            </button>
          </div>
        </div>

        {program.description && (
          <div className="max-w-3xl rounded-lg border border-slate-200 bg-white p-4 text-[13px] leading-relaxed text-slate-600">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
            {program.description}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total issued', value: String(totalIssued), tone: 'text-slate-900' },
            { label: 'Valid', value: String(validCount), tone: 'text-emerald-600' },
            { label: 'Revoked', value: String(revokedCount), tone: 'text-rose-600' },
            { label: 'Template', value: associatedTemplate, tone: 'text-slate-900' },
          ].map((stat) => (
            <div key={stat.label} className={`${card} space-y-1 p-4`}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{stat.label}</p>
              <p className={`truncate text-xl font-semibold ${stat.tone}`} title={stat.value}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h3 className="text-[13px] font-semibold text-slate-900">Recipients ({filteredCandidates.length})</h3>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, or ID"
                value={candidateSearchQuery}
                onChange={(e) => setCandidateSearchQuery(e.target.value)}
                className={`${inputBase} pl-9`}
              />
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className={`${card} py-12 text-center text-[13px] text-slate-400`}>
              No matching recipients found.
            </div>
          ) : (
            <div className={`${card} overflow-visible`}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className={th}>Certificate ID</th>
                      <th className={th}>Recipient</th>
                      <th className={th}>Email</th>
                      <th className={th}>Issued</th>
                      <th className={th}>Status</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[13px] text-slate-600">
                    {filteredCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{c.id}</td>
                        <td className="px-4 py-3 font-medium capitalize text-slate-900">{c.recipientName}</td>
                        <td className="px-4 py-3 font-mono text-[12px]">{c.recipientEmail}</td>
                        <td className="px-4 py-3 text-[12px] text-slate-500">{c.issueDate}</td>
                        <td className="px-4 py-3">{statusBadge(c.status)}</td>
                        <td className="relative px-4 py-3 text-right">{renderCertActionsMenu(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // A certificate template open in the editor takes over the entire screen.
  if (editingTemplate) {
    return (
      <CanvaEditor
        template={editingTemplate}
        onSave={handleSaveCanvaTemplate}
        onCancel={() => setEditingTemplate(null)}
        isSaving={isActionPending('template:save')}
        brandName={currentWorkspace?.branding?.brandName || currentWorkspace?.name}
        primaryColor={currentWorkspace?.branding?.primaryColor || '#000000'}
        token={token}
        programs={programs}
      />
    );
  }

  // Same takeover treatment for the email designer.
  if (showEmailDesigner) {
    return (
      <EmailTemplateEditor
        initial={currentWorkspace?.emailTemplate}
        brandName={currentWorkspace?.branding?.brandName || currentWorkspace?.name || 'Glint'}
        primaryColor={currentWorkspace?.branding?.primaryColor || '#0f172a'}
        isSaving={isActionPending('emailTemplate:save')}
        onSave={(doc) => handleSaveEmailTemplate(doc)}
        onCancel={() => setShowEmailDesigner(false)}
      />
    );
  }

  if (showDigestDesigner) {
    return (
      <EmailTemplateEditor
        mode="digest"
        initial={currentWorkspace?.digestEmailTemplate}
        brandName={currentWorkspace?.branding?.brandName || currentWorkspace?.name || 'Glint'}
        primaryColor={currentWorkspace?.branding?.primaryColor || '#0f172a'}
        isSaving={isActionPending('emailTemplate:save')}
        onSave={(doc) => handleSaveDigestTemplate(doc)}
        onCancel={() => setShowDigestDesigner(false)}
      />
    );
  }

  const NAV_GROUPS: { label?: string; items: { tab: DashboardTab; label: string; icon: React.ReactNode }[] }[] = [
    {
      items: [{ tab: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> }],
    },
    {
      label: 'Issuance',
      items: [
        { tab: 'programs', label: 'Certification Programs', icon: <Calendar className="h-4 w-4" /> },
        { tab: 'templates', label: 'Certificate Templates', icon: <Layers className="h-4 w-4" /> },
        { tab: 'issued', label: 'Issued Certificates', icon: <Award className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Delivery',
      items: [
        { tab: 'emails', label: 'Email Activity', icon: <Mail className="h-4 w-4" /> },
        { tab: 'branding', label: 'Branding & Email', icon: <Globe className="h-4 w-4" /> },
      ],
    },
  ];

  const TAB_META: Record<DashboardTab, { title: string; description: string }> = {
    overview: { title: 'Overview', description: 'Workspace activity at a glance' },
    programs: { title: 'Certification Programs', description: 'Cohorts, courses, and events you certify' },
    templates: { title: 'Certificate Templates', description: 'Design the printable certificate layouts' },
    issued: { title: 'Issued Certificates', description: 'Every certificate issued from this workspace' },
    emails: { title: 'Email Activity', description: 'Outbox and delivery status of issuance emails' },
    branding: { title: 'Branding & Email', description: 'Brand identity, sender details, and the issuance email design' },
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#f6f7f9] font-sans" aria-busy={pendingAction ? true : undefined}>
      {pendingActionLabel && (
        <div className="fixed bottom-4 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-800 shadow-lg">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
          {pendingActionLabel}
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 transform flex-col justify-between border-r border-slate-200 bg-white transition-transform duration-200 ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:z-30 md:translate-x-0`}>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {/* Brand */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <svg className="h-7 w-7 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 16H23" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
              </svg>
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">Glint</span>
            </div>
            <button
              onClick={triggerDataRefresh}
              disabled={refreshing || Boolean(pendingAction)}
              className={`rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Workspace selector */}
          <div className="space-y-1.5">
            <label className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Workspace</label>
            <div className="relative">
              <select
                value={currentWorkspaceId}
                onChange={(e) => onWorkspaceChange(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-md border border-slate-200 bg-white py-2 pl-3 pr-8 text-[13px] font-medium text-slate-900 transition-colors hover:bg-slate-50 focus:border-blue-500 focus:outline-none"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{capitalizeWords(ws.name)}</option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-400" />
            </div>
            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="flex items-center gap-1 px-1 pt-0.5 text-[12px] font-medium text-blue-600 transition-colors hover:text-blue-800"
            >
              <Plus className="h-3 w-3" /> Add organization
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-5">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className="space-y-1">
                {group.label && (
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                )}
                {group.items.map((item) => (
                  <button
                    key={item.tab}
                    onClick={() => { changeTab(item.tab); setEditingTemplate(null); }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                      activeTab === item.tab
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* User card */}
        <div className="shrink-0 space-y-3 border-t border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="truncate text-[12px] font-medium text-slate-700">{currentWorkspace?.branding?.brandName}</p>
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">{currentWorkspace?.plan}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-[12px] font-semibold text-white">
              {(user?.name || currentWorkspace?.name || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-900">{user?.name || 'Administrator'}</p>
              <p className="truncate text-[11px] text-slate-400">{user?.email ?? ''}</p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log out"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                id="btn-logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main frame */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 md:hidden"
              title="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{TAB_META[activeTab].title}</h1>
              <p className="hidden truncate text-[12px] text-slate-500 sm:block">{TAB_META[activeTab].description}</p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline-block">
            {currentWorkspace?.plan?.toUpperCase()} plan
          </span>
        </header>

        {/* Content */}
        <div id="dashboard-content-area" className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">

          {loading ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-500">
              <RefreshCw className="mb-3 h-7 w-7 animate-spin text-slate-400" />
              <p className="text-[13px]">Loading workspace…</p>
            </div>
          ) : (
            <>
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="mx-auto max-w-6xl space-y-6">

                  {/* Stat cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: 'Certificates issued', value: analytics?.issuedCount || 0, hint: `${programs.filter(p => p.status === 'active').length} active programs` },
                      { label: 'Verifications', value: analytics?.verificationCount || 0, hint: 'Public authenticity checks' },
                      { label: 'Page views', value: analytics?.viewCount || 0, hint: 'Certificate page visits' },
                      { label: 'Downloads', value: analytics?.downloadCount || 0, hint: `${analytics?.shareCount || 0} social shares` },
                    ].map((stat) => (
                      <div key={stat.label} className={`${card} space-y-2 p-5`}>
                        <p className="text-[12px] font-medium text-slate-500">{stat.label}</p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                        <p className="text-[12px] text-slate-400">{stat.hint}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart + referrals */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className={`${card} space-y-5 p-5 lg:col-span-8`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-slate-900">Issuance & verification volume</h3>
                        <div className="flex gap-4 text-[12px] text-slate-500">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600"></span> Issued</span>
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-300"></span> Verified</span>
                        </div>
                      </div>
                      <div className="w-full overflow-x-auto pb-1">
                        <div className="relative flex h-56 min-w-[480px] items-end justify-between gap-4 border-b border-slate-100 pt-8">
                          <div className="pointer-events-none absolute left-0 right-0 top-1/4 border-t border-dashed border-slate-100"></div>
                          <div className="pointer-events-none absolute left-0 right-0 top-2/4 border-t border-dashed border-slate-100"></div>
                          <div className="pointer-events-none absolute left-0 right-0 top-3/4 border-t border-dashed border-slate-100"></div>

                          {analytics?.issuanceTrend.map((pt, idx) => (
                            <div key={idx} className="group z-10 flex flex-1 flex-col items-center gap-2">
                              <div className="flex h-40 w-full items-end justify-center gap-1">
                                <div
                                  style={{ height: `${Math.min(100, Math.max(6, (pt.count / (analytics.issuedCount || 100)) * 280))}%` }}
                                  className="relative w-5 rounded-sm bg-blue-600 transition-colors group-hover:bg-blue-500"
                                  title={`Issued: ${pt.count}`}
                                >
                                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">{pt.count}</span>
                                </div>
                                <div
                                  style={{ height: `${Math.min(100, Math.max(4, ((analytics.verificationTrend[idx]?.count || 0) / (analytics.viewCount || 50)) * 200))}%` }}
                                  className="relative w-5 rounded-sm bg-sky-300 transition-colors group-hover:bg-sky-400"
                                  title={`Verified: ${analytics.verificationTrend[idx]?.count || 0}`}
                                >
                                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">{analytics.verificationTrend[idx]?.count || 0}</span>
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-400">{pt.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/*
                      Referrer attribution is not captured anywhere. This box used to
                      render fabricated percentages that moved with the view count.
                    */}
                    <div className={`${card} space-y-4 p-5 lg:col-span-4`}>
                      <h3 className="text-[13px] font-semibold text-slate-900">Referral channels</h3>
                      {analytics?.trafficSources?.length ? (
                        <div className="space-y-4">
                          {analytics.trafficSources.map((source, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-[13px]">
                                <span className="font-medium text-slate-700">{source.source}</span>
                                <span className="text-slate-400">{source.count}</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  style={{ width: `${Math.min(100, (source.count / (analytics.viewCount || 1)) * 100)}%` }}
                                  className="h-full bg-blue-600"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] leading-relaxed text-slate-400">
                          Referrer tracking is not enabled, so there is nothing to attribute yet.
                          Views, downloads, shares, and verifications are counted in the cards above.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className={`${card} p-5`}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold text-slate-900">Recent issuances</h3>
                      <button onClick={() => changeTab('issued')} className="flex items-center gap-0.5 text-[12px] font-medium text-blue-600 hover:text-blue-800">
                        View all <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </div>
                    {certificates.length === 0 ? (
                      <p className="py-6 text-center text-[13px] text-slate-400">No certificates issued yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {certificates.slice(0, 5).map((cert, idx) => (
                          <div key={idx} className="flex items-center justify-between py-3 text-[13px]">
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-medium capitalize text-slate-900">{cert.recipientName}</p>
                              <p className="truncate text-[12px] text-slate-400">{cert.recipientEmail} · {cert.programName}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              {statusBadge(cert.status)}
                              <button
                                onClick={() => onViewCertificatePage(cert.id)}
                                className="text-[12px] font-medium text-blue-600 hover:text-blue-800"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB: PROGRAMS */}
              {activeTab === 'programs' && (
                <div className="mx-auto max-w-6xl space-y-6">
                  {selectedProgramDetails ? (
                    renderProgramDetailView(selectedProgramDetails)
                  ) : (
                    <>
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <p className="text-[13px] text-slate-500">{programs.length} program{programs.length === 1 ? '' : 's'}</p>
                        {!showProgramForm && (
                          <button
                            onClick={() => {
                              if (templates.length === 0) {
                                toast.error('Create at least one certificate template before configuring programs.');
                                return;
                              }
                              setEditingProgram(null);
                              setProgName('');
                              setProgDesc('');
                              setProgExpiryDate('');
                              setFieldString('');
                              setProgTemplateId(templates[0].id);
                              setProgIssueDate(todayIso());
                              setShowProgramForm(true);
                            }}
                            className={btnPrimary}
                          >
                            <Plus className="h-3.5 w-3.5" /> Create program
                          </button>
                        )}
                      </div>

                      {showProgramForm && (
                        <form onSubmit={handleCreateProgram} className={`${card} max-w-2xl space-y-5 p-6`}>
                          <h3 className="border-b border-slate-100 pb-3 text-[14px] font-semibold text-slate-900">
                            {editingProgram ? 'Edit program' : 'New certification program'}
                          </h3>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className={labelBase}>Program name</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Executive MBA: Data Architecture"
                                value={progName}
                                onChange={(e) => setProgName(capitalizeWords(e.target.value))}
                                className={inputBase}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className={labelBase}>Certificate template</label>
                              <select
                                value={progTemplateId || templates[0]?.id || ''}
                                onChange={(e) => setProgTemplateId(e.target.value)}
                                className={`${inputBase} cursor-pointer`}
                              >
                                {templates.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className={labelBase}>Description</label>
                            <textarea
                              placeholder="Summary of what this program certifies"
                              value={progDesc}
                              onChange={(e) => setProgDesc(e.target.value)}
                              className={`${inputBase} h-20 resize-none`}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className={labelBase}>Issue date</label>
                              <input type="date" required value={progIssueDate} onChange={(e) => setProgIssueDate(e.target.value)} className={inputBase} />
                            </div>
                            <div className="space-y-1.5">
                              <label className={labelBase}>Expiry date (optional)</label>
                              <input type="date" value={progExpiryDate} onChange={(e) => setProgExpiryDate(e.target.value)} className={inputBase} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className={`${labelBase} flex items-center justify-between`}>
                              <span>Custom recipient fields</span>
                              <span className="text-[11px] font-normal text-slate-400">Comma separated</span>
                            </label>
                            <input
                              type="text"
                              value={fieldString}
                              onChange={(e) => setFieldString(e.target.value)}
                              placeholder="e.g. Grade, Score, Cohort"
                              className={`${inputBase} font-mono`}
                            />
                            <p className="text-[12px] leading-relaxed text-slate-400">
                              These become CSV columns during bulk issuance and can be printed on the certificate as {'{{placeholders}}'}.
                            </p>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                            <button
                              type="button"
                              disabled={isActionPending('program:save')}
                              onClick={() => {
                                setShowProgramForm(false);
                                setEditingProgram(null);
                                setProgName('');
                                setProgDesc('');
                                setProgIssueDate(todayIso());
                                setProgExpiryDate('');
                                setFieldString('');
                              }}
                              className={btnSecondary}
                            >
                              Cancel
                            </button>
                            <button type="submit" disabled={isActionPending('program:save')} className={btnPrimary}>
                              {isActionPending('program:save') && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                              {isActionPending('program:save') ? 'Saving…' : (editingProgram ? 'Save changes' : 'Create program')}
                            </button>
                          </div>
                        </form>
                      )}

                      {programs.length === 0 ? (
                        <div className={`${card} px-8 py-16 text-center`}>
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
                              <Layers className="h-5 w-5 text-blue-500" />
                            </div>
                            <h3 className="text-[14px] font-semibold text-slate-900">No programs yet</h3>
                            <p className="mx-auto max-w-xs text-[13px] text-slate-500">Create a certification program to start issuing certificates to recipients.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Desktop table */}
                          <div className={`${card} hidden overflow-hidden md:block`}>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-left">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                  <tr>
                                    <th className={th}>Program</th>
                                    <th className={th}>Template</th>
                                    <th className={th}>Fields</th>
                                    <th className={th}>Issued</th>
                                    <th className={`${th} text-right`}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[13px] text-slate-600">
                                  {programs.map((prog) => {
                                    const associatedTemplate = templates.find(t => t.id === prog.templateId)?.name || 'Default';
                                    const issueCount = certificates.filter(c => c.programId === prog.id).length;

                                    return (
                                      <tr key={prog.id} className="hover:bg-slate-50/60">
                                        <td className="max-w-sm px-4 py-4">
                                          <p
                                            onClick={() => setSelectedProgramDetails(prog)}
                                            className="cursor-pointer font-medium capitalize text-blue-600 hover:text-blue-800 hover:underline"
                                          >
                                            {prog.name}
                                          </p>
                                          {prog.description && <p className="mt-0.5 truncate text-[12px] text-slate-400">{prog.description}</p>}
                                          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{prog.id}</p>
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-800">{associatedTemplate}</td>
                                        <td className="px-4 py-4">
                                          <div className="flex max-w-[220px] flex-wrap gap-1">
                                            {['name', 'email', ...prog.recipientFields.filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase()))].map((field, idx) => (
                                              <span key={idx} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                                                {field}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="px-4 py-4">
                                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${issueCount > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                                            {issueCount} issued
                                          </span>
                                        </td>
                                        <td className="space-x-3 px-4 py-4 text-right">
                                          <button type="button" onClick={() => handleEditProgram(prog)} className="text-[12px] font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                            Edit
                                          </button>
                                          <button type="button" onClick={() => openBulkIssueModal(prog.id)} className="text-[12px] font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                            Bulk issue
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isActionPending(`program:delete:${prog.id}`)}
                                            onClick={() => handleDeleteProgram(prog.id)}
                                            className="text-slate-400 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                                            title="Delete program"
                                          >
                                            <Trash2 className="inline h-4 w-4" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Mobile cards */}
                          <div className="block space-y-3 md:hidden">
                            {programs.map((prog) => {
                              const associatedTemplate = templates.find(t => t.id === prog.templateId)?.name || 'Default';
                              const issueCount = certificates.filter(c => c.programId === prog.id).length;
                              return (
                                <div key={prog.id} className={`${card} space-y-3 p-4`}>
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0 space-y-0.5">
                                      <h3 onClick={() => setSelectedProgramDetails(prog)} className="cursor-pointer text-[14px] font-medium capitalize text-blue-600">
                                        {prog.name}
                                      </h3>
                                      <p className="font-mono text-[11px] text-slate-400">{prog.id}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${issueCount > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                                      {issueCount} issued
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-slate-500">Template: <span className="font-medium text-slate-700">{associatedTemplate}</span></p>
                                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                    <div className="flex gap-3">
                                      <button type="button" onClick={() => handleEditProgram(prog)} className="text-[12px] font-medium text-blue-600">Edit</button>
                                      <button type="button" onClick={() => openBulkIssueModal(prog.id)} className="text-[12px] font-medium text-blue-600">Bulk issue</button>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isActionPending(`program:delete:${prog.id}`)}
                                      onClick={() => handleDeleteProgram(prog.id)}
                                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                                      title="Delete program"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB: TEMPLATES */}
              {activeTab === 'templates' && (
                <div className="mx-auto max-w-6xl space-y-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <p className="text-[13px] text-slate-500">
                      Import or export designs as portable <span className="font-mono text-slate-600">.glint</span> files.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => document.getElementById('dashboard-design-upload')?.click()}
                        disabled={isActionPending('template:upload')}
                        title="Upload a Glint template (.glint) file"
                        className={btnSecondary}
                      >
                        {isActionPending('template:upload') ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {isActionPending('template:upload') ? 'Uploading…' : 'Import .glint'}
                      </button>
                      <input
                        type="file"
                        id="dashboard-design-upload"
                        accept=".glint"
                        onChange={handleUploadCertificateDesign}
                        className="hidden"
                      />
                      <button onClick={handleAddNewTemplate} disabled={isActionPending('template:create')} className={btnPrimary}>
                        {isActionPending('template:create') ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        {isActionPending('template:create') ? 'Creating…' : 'New template'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {templates.map(temp => (
                      <div key={temp.id} className={`${card} flex flex-col justify-between space-y-4 p-5`}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[14px] font-semibold text-slate-900">{temp.name}</h3>
                            <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">{temp.layout}</span>
                          </div>
                          <p className="font-mono text-[11px] text-slate-400">{temp.id}</p>

                          <div className="relative overflow-hidden rounded-md border border-slate-100 bg-slate-50 p-3">
                            <TemplatePreview
                              template={temp}
                              domId={`tpl-preview-${temp.id}`}
                              brandName={currentWorkspace?.branding?.brandName || currentWorkspace?.name}
                              className="rounded shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                          <button
                            onClick={() => handleDeleteTemplate(temp.id)}
                            disabled={isActionPending(`template:delete:${temp.id}`)}
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            {isActionPending(`template:delete:${temp.id}`) ? 'Deleting…' : 'Delete'}
                          </button>
                          <button
                            onClick={() => handleExportTemplate(temp)}
                            disabled={isActionPending(`template:export:${temp.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            title="Download this design as a .glint template file"
                          >
                            {isActionPending(`template:export:${temp.id}`)
                              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              : <Download className="h-3.5 w-3.5" />}
                            Export
                          </button>
                          <button
                            onClick={() => selectTemplateForEditor(temp)}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
                          >
                            Open editor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: ISSUED CERTIFICATES (registry + issuance entry points) */}
              {activeTab === 'issued' && (
                <div className="mx-auto max-w-6xl space-y-4">

                  {/* Controls: search left · issue buttons + pagination right */}
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search recipient, ID, or program"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${inputBase} pl-9`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button onClick={() => openSingleIssueModal()} className={btnSecondary}>
                        <Plus className="h-3.5 w-3.5" /> Issue certificate
                      </button>
                      <button onClick={() => openBulkIssueModal()} className={btnPrimary}>
                        <Upload className="h-3.5 w-3.5" /> Bulk issue certificates
                      </button>

                      {/* Rows per page */}
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-2 text-[12px] font-medium text-slate-600 focus:border-blue-500 focus:outline-none"
                        title="Rows per page"
                      >
                        {[10, 25, 50, 100].map((n) => (
                          <option key={n} value={n}>{n} / page</option>
                        ))}
                      </select>

                      {/* Pagination */}
                      <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-0.5">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-[90px] px-1 text-center text-[12px] font-medium text-slate-600">
                          {pageStart}–{pageEnd} of {filteredCertificates.length}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bulk selection action bar */}
                  {selectedCertIds.size > 0 && (
                    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3 text-[13px]">
                        <span className="font-medium text-blue-900">{selectedCertIds.size} selected</span>
                        {!allFilteredSelected && filteredCertificates.length > selectedCertIds.size && (
                          <button onClick={selectAllFiltered} className="text-[12px] font-medium text-blue-600 hover:text-blue-800">
                            Select all {filteredCertificates.length}{searchQuery ? ' matching' : ''}
                          </button>
                        )}
                        <button onClick={clearSelection} className="text-[12px] font-medium text-blue-600 hover:text-blue-800">Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => sendEmailsForSelection('individual')}
                          disabled={sendingEmails}
                          className={btnSecondary}
                        >
                          {sendingEmails ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          Email each recipient
                        </button>
                        <button
                          onClick={() => { setDigestEmail(''); setDigestName(''); setShowDigestModal(true); }}
                          disabled={sendingEmails}
                          className={btnPrimary}
                        >
                          <Send className="h-3.5 w-3.5" /> Send list to one address
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Revocation confirmation */}
                  {revokingCertId && (
                    <div className="max-w-xl space-y-4 rounded-lg border border-rose-200 bg-rose-50 p-5">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-rose-800">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                        Revoke certificate
                      </div>
                      <p className="text-[13px] leading-relaxed text-rose-700">
                        <strong className="font-mono text-slate-900">{revokingCertId}</strong> will immediately show as revoked on its public page and in every verification, along with the reason below.
                      </p>
                      <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-rose-800">Revocation reason</label>
                        <input
                          type="text"
                          required
                          value={revocationReason}
                          onChange={(e) => setRevocationReason(e.target.value)}
                          placeholder="e.g. Non-completion of prerequisites"
                          className="w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-rose-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isActionPending('certificate:revoke')}
                          onClick={() => setRevokingCertId(null)}
                          className={btnSecondary}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isActionPending('certificate:revoke')}
                          onClick={handleExecuteRevocation}
                          className={btnDanger}
                        >
                          {isActionPending('certificate:revoke') && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                          {isActionPending('certificate:revoke') ? 'Revoking…' : 'Confirm revocation'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Registry table */}
                  {filteredCertificates.length === 0 ? (
                    <div className={`${card} px-8 py-16 text-center`}>
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
                          <Award className="h-5 w-5 text-blue-500" />
                        </div>
                        <h3 className="text-[14px] font-semibold text-slate-900">
                          {certificates.length === 0 ? 'No certificates issued yet' : 'No matches'}
                        </h3>
                        <p className="mx-auto max-w-sm text-[13px] text-slate-500">
                          {certificates.length === 0
                            ? 'Use "Issue certificate" for a single recipient or "Bulk issue certificates" to import a CSV of recipients.'
                            : 'Try a different search term.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`${card} hidden md:block`}>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                              <tr>
                                <th className={`${th} w-10`}>
                                  <input
                                    type="checkbox"
                                    checked={allOnPageSelected}
                                    onChange={toggleSelectPage}
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                                    title="Select all on this page"
                                  />
                                </th>
                                <th className={th}>Certificate</th>
                                <th className={th}>Recipient</th>
                                <th className={th}>Program</th>
                                <th className={th}>Issued</th>
                                <th className={th}>Engagement</th>
                                <th className={th}>Status</th>
                                <th className={`${th} text-right`}>Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-600">
                              {pagedCertificates.map(c => (
                                <tr key={c.id} className={selectedCertIds.has(c.id) ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}>
                                  <td className="px-4 py-3.5">
                                    <input
                                      type="checkbox"
                                      checked={selectedCertIds.has(c.id)}
                                      onChange={() => toggleCertSelected(c.id)}
                                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                                    />
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="font-mono text-[12px] font-medium text-slate-900">{c.id}</span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <p className="font-medium capitalize text-slate-900">{c.recipientName}</p>
                                    <p className="text-[12px] text-slate-400">{c.recipientEmail}</p>
                                  </td>
                                  <td className="max-w-[180px] truncate px-4 py-3.5 font-medium text-slate-700" title={c.programName}>{c.programName}</td>
                                  <td className="px-4 py-3.5 text-[12px] text-slate-500">{c.issueDate}</td>
                                  <td className="px-4 py-3.5 text-[12px] text-slate-500">
                                    {c.viewCount} views · {c.downloadCount} downloads
                                  </td>
                                  <td className="px-4 py-3.5">{statusBadge(c.status)}</td>
                                  <td className="relative px-4 py-3.5 text-right">{renderCertActionsMenu(c)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Mobile cards */}
                      <div className="block space-y-3 md:hidden">
                        {pagedCertificates.map(c => (
                          <div key={c.id} className={`${card} space-y-3 p-4 ${selectedCertIds.has(c.id) ? 'ring-1 ring-blue-300' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedCertIds.has(c.id)}
                                  onChange={() => toggleCertSelected(c.id)}
                                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                                />
                                <span className="font-mono text-[12px] font-medium text-slate-900">{c.id}</span>
                              </label>
                              {statusBadge(c.status)}
                            </div>
                            <div className="space-y-0.5 text-[13px]">
                              <p className="font-medium capitalize text-slate-900">{c.recipientName}</p>
                              <p className="text-[12px] text-slate-400">{c.recipientEmail}</p>
                              <p className="text-[12px] text-slate-500">{c.programName} · {c.issueDate}</p>
                            </div>
                            <div className="relative flex items-center justify-between border-t border-slate-100 pt-2">
                              <span className="text-[12px] text-slate-400">{c.viewCount} views · {c.downloadCount} downloads</span>
                              {renderCertActionsMenu(c, 'up')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB: EMAIL ACTIVITY */}
              {activeTab === 'emails' && (
                <div className="mx-auto max-w-6xl space-y-4">
                  <div className={`${card} overflow-hidden`}>
                    {emailLogs.length === 0 ? (
                      <div className="space-y-3 p-16 text-center text-slate-400">
                        <Mail className="mx-auto h-10 w-10 text-slate-300" />
                        <div className="space-y-1">
                          <p className="text-[14px] font-semibold text-slate-800">No emails yet</p>
                          <p className="text-[13px]">Issue certificates from the "Issued Certificates" tab to send notification emails.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto md:block">
                          <table className="w-full border-collapse text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                              <tr>
                                <th className={th}>Time</th>
                                <th className={th}>Recipient</th>
                                <th className={th}>Subject</th>
                                <th className={th}>Status</th>
                                <th className={`${th} text-right`}>Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-600">
                              {emailLogs.map((log) => (
                                <tr key={log.id} className="transition-colors hover:bg-slate-50/60">
                                  <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-slate-500">
                                    {new Date(log.sentTime).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-medium capitalize text-slate-900">{log.recipientName}</div>
                                    <div className="text-[12px] text-slate-400">{log.recipientEmail}</div>
                                  </td>
                                  <td className="max-w-xs truncate px-4 py-3.5">{log.subject}</td>
                                  <td className="whitespace-nowrap px-4 py-3.5">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${emailDisplayBadge(log).className}`}>
                                      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {emailDisplayBadge(log).label}
                                    </span>
                                    {emailDetailText(log) && (
                                      <p className="mt-1 max-w-[220px] truncate text-[11px] text-rose-500" title={emailDetailText(log)}>
                                        {emailDetailText(log)}
                                      </p>
                                    )}
                                    {!log.deliveryStatus && log.status === 'pending' && log.attempts > 0 && (
                                      <p className="mt-1 text-[11px] text-amber-500">retry {log.attempts}</p>
                                    )}
                                  </td>
                                  <td className="space-x-2 whitespace-nowrap px-4 py-3.5 text-right">
                                    <button
                                      onClick={() => setSelectedEmailLog(log)}
                                      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                    >
                                      View email
                                    </button>
                                    <button
                                      onClick={() => onViewCertificatePage(log.certificateId)}
                                      className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
                                    >
                                      Certificate
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="block divide-y divide-slate-100 md:hidden">
                          {emailLogs.map((log) => (
                            <div key={log.id} className="space-y-3 p-4">
                              <div className="flex items-start justify-between">
                                <span className="text-[12px] text-slate-400">
                                  {new Date(log.sentTime).toLocaleString()}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${emailDisplayBadge(log).className}`}>
                                  {emailDisplayBadge(log).label}
                                </span>
                              </div>
                              {emailDetailText(log) && (
                                <p className="break-words text-[12px] text-rose-500">{emailDetailText(log)}</p>
                              )}
                              <div className="space-y-0.5 text-[13px]">
                                <div className="font-medium capitalize text-slate-900">{log.recipientName}</div>
                                <div className="text-[12px] text-slate-400">{log.recipientEmail}</div>
                                <div className="truncate text-slate-600">{log.subject}</div>
                              </div>
                              <div className="flex gap-2 border-t border-slate-100 pt-3">
                                <button onClick={() => setSelectedEmailLog(log)} className={`${btnSecondary} flex-1 justify-center`}>
                                  View email
                                </button>
                                <button onClick={() => onViewCertificatePage(log.certificateId)} className={`${btnPrimary} flex-1 justify-center`}>
                                  Certificate
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: BRANDING & EMAIL */}
              {activeTab === 'branding' && (
                <div className="mx-auto max-w-4xl space-y-6">

                  {/* Email template designer card — replaces the old plain-text email settings */}
                  <div className={`${card} overflow-hidden`}>
                    <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-slate-900">Issuance email design</h3>
                          {currentWorkspace?.emailTemplate ? (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Custom template</span>
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">Default template</span>
                          )}
                        </div>
                        <p className="max-w-lg text-[13px] leading-relaxed text-slate-500">
                          Design the email recipients receive when a certificate is issued. Drag and drop text, images, and buttons on a freeform canvas — the design is rendered as HTML for every send.
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {currentWorkspace?.emailTemplate && (
                          <button
                            onClick={() => {
                              if (confirm('Discard the custom email design and go back to the default template?')) {
                                handleSaveEmailTemplate(null);
                              }
                            }}
                            disabled={isActionPending('emailTemplate:save')}
                            className={btnSecondary}
                          >
                            Reset to default
                          </button>
                        )}
                        <button onClick={() => setShowEmailDesigner(true)} className={btnPrimary}>
                          <PenLine className="h-3.5 w-3.5" /> Open email designer
                        </button>
                      </div>
                    </div>

                    {currentWorkspace?.emailTemplate && emailPreviewHtml && (
                      <div className="bg-slate-50 p-6">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Current design (sample data)</p>
                        <iframe
                          title="Current email template"
                          sandbox=""
                          srcDoc={emailPreviewHtml}
                          className="h-72 w-full rounded-md border border-slate-200 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Digest email designer card — for "send list to one address" */}
                  <div className={`${card} overflow-hidden`}>
                    <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-slate-900">Digest email design</h3>
                          {currentWorkspace?.digestEmailTemplate ? (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Custom template</span>
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">Default template</span>
                          )}
                        </div>
                        <p className="max-w-lg text-[13px] leading-relaxed text-slate-500">
                          Used when you select certificates in the registry and send the whole list to one address. The <span className="font-medium text-slate-700">certificate list</span> block expands into one link per certificate.
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {currentWorkspace?.digestEmailTemplate && (
                          <button
                            onClick={() => {
                              if (confirm('Discard the custom digest design and go back to the default template?')) {
                                handleSaveDigestTemplate(null);
                              }
                            }}
                            disabled={isActionPending('emailTemplate:save')}
                            className={btnSecondary}
                          >
                            Reset to default
                          </button>
                        )}
                        <button onClick={() => setShowDigestDesigner(true)} className={btnPrimary}>
                          <List className="h-3.5 w-3.5" /> Open digest designer
                        </button>
                      </div>
                    </div>

                    {currentWorkspace?.digestEmailTemplate && digestPreviewHtml && (
                      <div className="bg-slate-50 p-6">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Current design (sample data)</p>
                        <iframe
                          title="Current digest template"
                          sandbox=""
                          srcDoc={digestPreviewHtml}
                          className="h-72 w-full rounded-md border border-slate-200 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Brand & sender identity */}
                  <div className={`${card} space-y-5 p-6`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-[14px] font-semibold text-slate-900">Brand & sender identity</h3>
                        <p className="text-[13px] text-slate-500">Applied to certificate pages and email headers.</p>
                      </div>
                      <button
                        onClick={handleSaveBrandingDraft}
                        disabled={!brandingDirty || isActionPending('branding:save')}
                        className={btnPrimary}
                      >
                        {isActionPending('branding:save') && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        {isActionPending('branding:save') ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelBase}>Public brand name</label>
                      <input
                        type="text"
                        value={brandingDraft.brandName}
                        onChange={(e) => setBranding({ brandName: capitalizeWords(e.target.value) })}
                        className={inputBase}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className={labelBase}>Primary color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={brandingDraft.primaryColor}
                            onChange={(e) => setBranding({ primaryColor: e.target.value })}
                            className="h-9 w-11 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                          />
                          <input
                            type="text"
                            value={brandingDraft.primaryColor}
                            onChange={(e) => setBranding({ primaryColor: e.target.value })}
                            className={`${inputBase} font-mono`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={labelBase}>Accent color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={brandingDraft.accentColor}
                            onChange={(e) => setBranding({ accentColor: e.target.value })}
                            className="h-9 w-11 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                          />
                          <input
                            type="text"
                            value={brandingDraft.accentColor}
                            onChange={(e) => setBranding({ accentColor: e.target.value })}
                            className={`${inputBase} font-mono`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className={labelBase}>Sender name</label>
                        <input
                          type="text"
                          value={brandingDraft.senderName}
                          onChange={(e) => setBranding({ senderName: capitalizeWords(e.target.value) })}
                          className={inputBase}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={labelBase}>Sender email</label>
                        <input
                          type="email"
                          value={brandingDraft.senderEmail}
                          onChange={(e) => setBranding({ senderEmail: e.target.value })}
                          className={`${inputBase} font-mono`}
                        />
                        <p className="text-[12px] leading-snug text-slate-400">Only the name part is used; the domain is set by the address verified with your mail provider (MAIL_FROM).</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelBase}>Email footer text</label>
                      <input
                        type="text"
                        value={brandingDraft.footerText}
                        onChange={(e) => setBranding({ footerText: capitalizeWords(e.target.value) })}
                        className={inputBase}
                      />
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* MODAL: Bulk issue wizard */}
      {showBulkIssueModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900">Bulk issue certificates</h3>
                <p className="text-[12px] text-slate-500">
                  {bulkStep === 'program' && 'Step 1 of 3 — choose a certification program'}
                  {bulkStep === 'input' && 'Step 2 of 3 — paste recipient data'}
                  {bulkStep === 'preview' && 'Step 3 of 3 — review and issue'}
                  {bulkStep === 'success' && 'Done'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeBulkIssueModal}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {/* Step 1: program selection */}
              {bulkStep === 'program' && (
                <div className="space-y-2">
                  {programs.map((p) => {
                    const fields = p.recipientFields.filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase()));
                    const isActive = selectedProgramId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProgramId(p.id)}
                        className={`w-full rounded-md border p-4 text-left transition-colors ${
                          isActive ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[14px] font-medium capitalize text-slate-900">{p.name}</p>
                          {isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />}
                        </div>
                        {p.description && <p className="mt-0.5 truncate text-[12px] text-slate-500">{p.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {['Email', 'Name', ...fields].map((f, i) => (
                            <span key={i} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-500">{f}</span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 2: CSV input, placeholder derived from the chosen program */}
              {bulkStep === 'input' && (() => {
                const program = programs.find(p => p.id === selectedProgramId);
                if (!program) return null;
                const fields = program.recipientFields.filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase()));
                const headerLine = ['Email', 'Name', ...fields].join(',');
                const exampleValues = fields.map((f, i) => `${f} value ${i + 1}`.replace(/,/g, ' '));
                const placeholder = `${headerLine}\nalex.rivera@example.com,Alex Rivera${exampleValues.length ? ',' + exampleValues.join(',') : ''}\njordan.vance@example.com,Jordan Vance${exampleValues.length ? ',' + exampleValues.join(',') : ''}`;
                return (
                  <div className="space-y-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[12px] font-medium text-slate-700">
                        Program: <span className="capitalize text-blue-700">{program.name}</span>
                      </p>
                      <p className="mt-1 text-[12px] text-slate-500">
                        Expected columns: <span className="font-mono text-slate-700">{headerLine}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className={labelBase}>Recipient rows (CSV)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const sampleRows = `${headerLine}\nalex.rivera@trustops-mail.com,Alex Rivera${fields.length ? ',' + fields.map(() => 'Sample').join(',') : ''}\njordan.vance@trustops-mail.com,Jordan Vance${fields.length ? ',' + fields.map(() => 'Sample').join(',') : ''}`;
                          setRawCsvInput(sampleRows);
                        }}
                        className="text-[12px] font-medium text-blue-600 hover:text-blue-800"
                      >
                        Load sample
                      </button>
                    </div>
                    <textarea
                      value={rawCsvInput}
                      onChange={(e) => setRawCsvInput(e.target.value)}
                      placeholder={placeholder}
                      className={`${inputBase} h-48 resize-y font-mono text-[12px]`}
                    />
                    <p className="text-[12px] text-slate-400">
                      A header row is optional — plain lists of emails, "Name &lt;email&gt;", or "name, email" rows also work.
                    </p>
                  </div>
                );
              })()}

              {/* Step 3: validation preview */}
              {bulkStep === 'preview' && (
                <div className="space-y-4">
                  {importErrors.length > 0 && (
                    <div className="space-y-1 rounded-md border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-800">
                      <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" /> Structure issues found:</p>
                      <ul className="list-disc space-y-0.5 pl-5 text-[12px]">
                        {importErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                      </ul>
                    </div>
                  )}

                  <p className="text-[13px] text-slate-600">
                    <span className="font-semibold text-emerald-600">{validatedRecipients.filter(r => r.isValid).length} valid</span>
                    {' · '}
                    <span className={`font-semibold ${validatedRecipients.filter(r => !r.isValid).length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {validatedRecipients.filter(r => !r.isValid).length} invalid
                    </span>
                    {' '}rows. Only valid rows will be issued.
                  </p>

                  <div className="overflow-hidden rounded-md border border-slate-200">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full border-collapse text-left text-[13px]">
                        <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
                          <tr>
                            <th className={th}>Name</th>
                            <th className={th}>Email</th>
                            <th className={th}>Fields</th>
                            <th className={`${th} text-right`}>Check</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {validatedRecipients.map((rec, idx) => (
                            <tr key={idx} className={rec.isValid ? '' : 'bg-rose-50/50'}>
                              <td className="px-4 py-2.5 font-medium capitalize text-slate-900">{rec.name || 'N/A'}</td>
                              <td className="px-4 py-2.5 font-mono text-[12px] text-slate-500">{rec.email}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex max-w-[200px] flex-wrap gap-1">
                                  {Object.entries(rec.customFields).map(([k, v], id) => (
                                    <span key={id} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-600">
                                      {k}: {v}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {rec.isValid ? (
                                  <span className="inline-flex items-center justify-end gap-1 text-[11px] font-semibold text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-end gap-1 text-[11px] font-semibold text-rose-600" title={rec.errors?.join(', ')}>
                                    <AlertTriangle className="h-3.5 w-3.5" /> Invalid
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: success */}
              {bulkStep === 'success' && (
                <div className="space-y-5 py-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                    <Check className="h-6 w-6 stroke-[3]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-[16px] font-semibold text-slate-900">Certificates issued</h3>
                    <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-slate-500">
                      {mappedCertificates.length} certificate{mappedCertificates.length === 1 ? '' : 's'} generated with verification links.{' '}
                      {bulkSentEmail
                        ? 'Notification emails are being sent in the background.'
                        : 'No emails were sent — select them in the registry to email recipients later.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard footer */}
            <div className="flex shrink-0 justify-between gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                {bulkStep === 'input' && (
                  <button type="button" onClick={() => setBulkStep('program')} className={btnSecondary}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>
                )}
                {bulkStep === 'preview' && (
                  <button type="button" disabled={isActionPending('certificates:bulk')} onClick={() => setBulkStep('input')} className={btnSecondary}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Edit data
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {bulkStep === 'program' && (
                  <button
                    type="button"
                    disabled={!selectedProgramId}
                    onClick={() => setBulkStep('input')}
                    className={btnPrimary}
                  >
                    Continue <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {bulkStep === 'input' && (
                  <button
                    type="button"
                    disabled={!rawCsvInput.trim()}
                    onClick={handleParseRecipients}
                    className={btnPrimary}
                  >
                    Validate rows <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {bulkStep === 'preview' && (() => {
                  const validCount = validatedRecipients.filter(r => r.isValid).length;
                  const busy = isActionPending('certificates:bulk');
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => runBulkIssue(false)}
                        disabled={busy || validCount === 0}
                        className={btnSecondary}
                        title="Create the certificates now; send emails later from the registry"
                      >
                        Issue only
                      </button>
                      <button
                        type="button"
                        onClick={() => runBulkIssue(true)}
                        disabled={busy || validCount === 0}
                        className={btnPrimary}
                      >
                        {busy ? (
                          <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Issuing…</>
                        ) : (
                          <><Play className="h-3.5 w-3.5 fill-current" /> Issue &amp; send {validCount} email{validCount === 1 ? '' : 's'}</>
                        )}
                      </button>
                    </>
                  );
                })()}
                {bulkStep === 'success' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setBulkStep('program'); setSelectedProgramId(''); setValidatedRecipients([]); }}
                      className={btnSecondary}
                    >
                      Issue another batch
                    </button>
                    <button type="button" onClick={closeBulkIssueModal} className={btnPrimary}>
                      Done
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Email Preview */}
      {selectedEmailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-[15px] font-semibold text-slate-900">Outbox message</h3>
              <button
                onClick={() => setSelectedEmailLog(null)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="shrink-0 space-y-2 border-b border-slate-100 bg-slate-50 p-6 text-[13px] text-slate-600">
              <div className="flex">
                <span className="w-16 shrink-0 text-[12px] font-medium text-slate-400">From</span>
                <span className="font-medium text-slate-800">
                  {currentWorkspace?.branding?.senderName || "Glint"} &lt;{currentWorkspace?.branding?.senderEmail || "sender not configured"}&gt;
                </span>
              </div>
              <div className="flex">
                <span className="w-16 shrink-0 text-[12px] font-medium text-slate-400">To</span>
                <span className="font-medium text-slate-800">
                  {selectedEmailLog.recipientName} &lt;{selectedEmailLog.recipientEmail}&gt;
                </span>
              </div>
              <div className="flex">
                <span className="w-16 shrink-0 text-[12px] font-medium text-slate-400">Subject</span>
                <span className="font-semibold text-slate-900">{selectedEmailLog.subject}</span>
              </div>
              <div className="flex">
                <span className="w-16 shrink-0 text-[12px] font-medium text-slate-400">Date</span>
                <span>{new Date(selectedEmailLog.sentTime).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="w-16 shrink-0 text-[12px] font-medium text-slate-400">Status</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${emailDisplayBadge(selectedEmailLog).className}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" /> {emailDisplayBadge(selectedEmailLog).label}
                  {selectedEmailLog.attempts > 0 && ` · ${selectedEmailLog.attempts} attempt${selectedEmailLog.attempts === 1 ? '' : 's'}`}
                </span>
              </div>
              {emailDetailText(selectedEmailLog) && (
                <div className="flex">
                  <span className="w-16 shrink-0 text-[12px] font-medium text-slate-400">Detail</span>
                  <span className="break-words font-mono text-[12px] text-rose-600">{emailDetailText(selectedEmailLog)}</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-white p-6 text-[13px] text-slate-800">
              <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-6">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <span className="text-[13px] font-semibold text-slate-900">{currentWorkspace?.branding?.brandName}</span>
                  <span className="text-[11px] text-slate-400">Certificate notification</span>
                </div>

                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-700">{selectedEmailLog.body}</pre>

                <div className="py-1 text-center">
                  <button
                    onClick={() => {
                      setSelectedEmailLog(null);
                      onViewCertificatePage(selectedEmailLog.certificateId);
                    }}
                    className={btnPrimary}
                  >
                    View certificate page
                  </button>
                </div>

                <p className="border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-400">
                  This is the plain-text body recorded in the outbox. The delivered email is rendered with your {currentWorkspace?.emailTemplate ? 'custom email template' : 'workspace branding'}.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button onClick={() => setSelectedEmailLog(null)} className={btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Workspace */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="relative w-full max-w-md space-y-5 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-2xl">
            <h3 className="border-b border-slate-100 pb-3 text-[15px] font-semibold text-slate-900">Add organization</h3>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelBase}>Organization name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Columbia University Global"
                  value={newWsName}
                  onChange={(e) => setNewWsName(capitalizeWords(e.target.value))}
                  className={inputBase}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelBase}>Public brand name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Columbia Certificate Authority"
                  value={newWsBrandName}
                  onChange={(e) => setNewWsBrandName(capitalizeWords(e.target.value))}
                  className={inputBase}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelBase}>Primary color</label>
                  <input
                    type="color"
                    value={newWsColor}
                    onChange={(e) => setNewWsColor(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelBase}>Accent color</label>
                  <input
                    type="color"
                    value={newWsAccent}
                    onChange={(e) => setNewWsAccent(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={isActionPending('workspace:create')}
                  onClick={() => setShowWorkspaceModal(false)}
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" disabled={isActionPending('workspace:create')} className={btnPrimary}>
                  {isActionPending('workspace:create') && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {isActionPending('workspace:create') ? 'Creating…' : 'Create organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Audit trail */}
      {selectedAuditTrailCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="relative flex max-h-[80vh] w-full max-w-xl flex-col rounded-lg border border-slate-200 bg-white p-6 text-left shadow-2xl">
            <button
              onClick={() => setSelectedAuditTrailCert(null)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
              type="button"
              title="Close audit view"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="border-b border-slate-100 pb-3 text-[15px] font-semibold text-slate-900">
              Certificate history
            </h3>
            <p className="mb-4 mt-2 text-[13px] text-slate-500">
              Recorded events for <span className="font-mono text-slate-800">{selectedAuditTrailCert.id}</span> issued to <span className="font-medium text-slate-800">{selectedAuditTrailCert.recipientName}</span>.
            </p>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {(() => {
                const logs = auditTrailLogs;
                if (auditTrailLoading) {
                  return (
                    <div className="py-8 text-center text-[13px] text-slate-400">Loading history…</div>
                  );
                }
                if (logs.length === 0) {
                  return (
                    <div className="py-8 text-center text-[13px] text-slate-400">
                      No events recorded yet.
                    </div>
                  );
                }
                return (
                  <div className="relative ml-2 space-y-6 border-l-2 border-slate-100 pl-4">
                    {logs.map((log: any, idx: number) => {
                      let Icon = CheckCircle2;
                      let iconColor = 'text-emerald-500 bg-emerald-50';
                      if (log.event === 'REVOKED') {
                        Icon = ShieldAlert;
                        iconColor = 'text-rose-500 bg-rose-50';
                      } else if (log.event === 'EMAIL_DISPATCHED') {
                        Icon = Mail;
                        iconColor = 'text-blue-500 bg-blue-50';
                      } else if (log.event === 'METADATA_UPDATED') {
                        Icon = Sliders;
                        iconColor = 'text-amber-500 bg-amber-50';
                      }

                      return (
                        <div key={idx} className="relative">
                          <span className={`absolute -left-[25px] top-0.5 rounded-full border-2 border-white p-0.5 ${iconColor}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-900">{log.event || 'VERIFIED'}</span>
                              <span className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-[13px] leading-normal text-slate-600">{log.details}</p>
                            <p className="text-[11px] text-slate-400">Operator: {log.performedBy}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setSelectedAuditTrailCert(null)} className={btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Single Certificate Issuance */}
      {showSingleIssueModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 text-left shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-[15px] font-semibold text-slate-900">Issue certificate</h3>
              <button
                type="button"
                onClick={() => setShowSingleIssueModal(false)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); issueSingleCertificate(true); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelBase}>Certification program</label>
                <select
                  value={singleProgramId}
                  onChange={(e) => {
                    setSingleProgramId(e.target.value);
                    setSingleCustomFields({});
                  }}
                  className={`${inputBase} cursor-pointer`}
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelBase}>Recipient name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={singleRecipientName}
                    onChange={(e) => setSingleRecipientName(capitalizeWords(e.target.value))}
                    className={inputBase}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelBase}>Recipient email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex@example.com"
                    value={singleRecipientEmail}
                    onChange={(e) => setSingleRecipientEmail(e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelBase}>Issue date</label>
                <input
                  type="date"
                  required
                  value={singleIssueDate}
                  onChange={(e) => setSingleIssueDate(e.target.value)}
                  className={inputBase}
                />
              </div>

              {/* Dynamic custom fields */}
              {(() => {
                const selectedProg = programs.find(p => p.id === singleProgramId);
                if (!selectedProg) return null;
                const filteredFields = selectedProg.recipientFields.filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase()));
                if (filteredFields.length === 0) return null;
                return (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Program fields</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {filteredFields.map(field => (
                        <div key={field} className="space-y-1.5">
                          <label className={labelBase}>{field}</label>
                          <input
                            type="text"
                            required
                            placeholder={`Enter ${field}`}
                            value={singleCustomFields[field] || ''}
                            onChange={(e) => setSingleCustomFields({
                              ...singleCustomFields,
                              [field]: e.target.value
                            })}
                            className={inputBase}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isActionPending('certificate:single')}
                  onClick={() => setShowSingleIssueModal(false)}
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isActionPending('certificate:single')}
                  onClick={() => issueSingleCertificate(false)}
                  className={btnSecondary}
                  title="Create the certificate now; send the email later from the registry"
                >
                  Issue only
                </button>
                <button
                  type="button"
                  disabled={isActionPending('certificate:single')}
                  onClick={() => issueSingleCertificate(true)}
                  className={btnPrimary}
                >
                  {isActionPending('certificate:single') && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {isActionPending('certificate:single') ? 'Issuing…' : 'Issue & send email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Send digest to one address */}
      {showDigestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-5 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-[15px] font-semibold text-slate-900">Send list to one address</h3>
              <button
                type="button"
                onClick={() => setShowDigestModal(false)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[13px] leading-relaxed text-slate-500">
              One email listing the verification links for the <strong className="text-slate-800">{selectedCertIds.size}</strong> selected certificate{selectedCertIds.size === 1 ? '' : 's'} will be sent to the address below. The individual recipients are not emailed.
            </p>
            {!currentWorkspace?.digestEmailTemplate && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                Using the default digest layout. Customise it under <span className="font-medium text-slate-700">Branding &amp; Email → Digest email design</span>.
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (digestEmail.trim()) sendEmailsForSelection('digest', { digestEmail: digestEmail.trim(), digestName: digestName.trim() });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className={labelBase}>Recipient email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. program.office@example.com"
                  value={digestEmail}
                  onChange={(e) => setDigestEmail(e.target.value)}
                  className={inputBase}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelBase}>Recipient name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Program Office"
                  value={digestName}
                  onChange={(e) => setDigestName(capitalizeWords(e.target.value))}
                  className={inputBase}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowDigestModal(false)} className={btnSecondary}>
                  Cancel
                </button>
                <button type="submit" disabled={sendingEmails || !digestEmail.trim()} className={btnPrimary}>
                  {sendingEmails ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sendingEmails ? 'Sending…' : 'Send digest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Signature Status */}
      {selectedCryptoProofCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="relative w-full max-w-lg space-y-5 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-2xl">
            <button
              onClick={() => setSelectedCryptoProofCert(null)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
              type="button"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 p-2 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900">Signature</h3>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  {selectedCryptoProofCert.signatureAlg} · v{selectedCryptoProofCert.signatureVersion}
                </p>
              </div>
            </div>

            {/*
              This panel claimed "ECC-Ed25519", a "Consensus Block Anchor" with a
              Merkle root, and that no tampering had been detected — over a value
              produced by Math.random(). There is no blockchain, no Ed25519, and
              no asymmetric key. What exists is an HMAC, and it is described as one.
            */}
            <div className="space-y-4 text-[13px]">
              <div className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900">Keyed message authentication code</h4>
                  <p className="leading-normal text-slate-600">
                    The recipient, program, and dates are signed with a secret key held on this server.
                    Any edit to those fields invalidates the signature. Because the key is symmetric,
                    only this registry can verify it — a third party cannot check it independently.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-y border-slate-100 py-3">
                <div className="space-y-0.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Status</span>
                  {statusBadge(selectedCryptoProofCert.status)}
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Algorithm</span>
                  <span className="block font-mono text-[12px] font-medium text-slate-800">{selectedCryptoProofCert.signatureAlg}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Verified</span>
                  <span className="block font-mono text-[12px] font-medium text-slate-800">{selectedCryptoProofCert.verifyCount}×</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Signature (hex)</label>
                <div className="break-all rounded-md border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] font-medium text-slate-700">
                  {selectedCryptoProofCert.signature}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Signed fields</label>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] leading-relaxed text-slate-700">
                  id · workspace · program · recipient name · recipient email · issue date · expiry date
                  <p className="mt-1 text-slate-400">
                    Status is not signed. Revoking a certificate does not invalidate its signature.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setSelectedCryptoProofCert(null)} className={btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: JSON Record */}
      {selectedJsonEnvelopeCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg border border-slate-200 bg-white p-6 text-left shadow-2xl">
            <button
              onClick={() => setSelectedJsonEnvelopeCert(null)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
              type="button"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-[15px] font-semibold text-slate-900">Certificate JSON</h3>
              <p className="mt-1 text-[13px] text-slate-500">
                Registry record for <span className="font-mono text-slate-800">{selectedJsonEnvelopeCert.id}</span>
              </p>
            </div>

            {/*
              This used to emit a W3C Verifiable Credential with an
              "Ed25519Signature2020" proof, a `did:glint:` verification method,
              and a multibase `proofValue` faked by prefixing "z" to a random
              string. None of it was real, and anything consuming it as a VC would
              have failed — or worse, trusted it. This is the actual record.
            */}
            <div className="my-4 flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-400">
              <pre className="select-all whitespace-pre-wrap leading-relaxed">
                {JSON.stringify({
                  id: selectedJsonEnvelopeCert.id,
                  issuer: currentWorkspaceId,
                  issuanceDate: selectedJsonEnvelopeCert.issueDate,
                  expiryDate: selectedJsonEnvelopeCert.expiryDate ?? null,
                  status: selectedJsonEnvelopeCert.status,
                  subject: {
                    name: selectedJsonEnvelopeCert.recipientName,
                    email: selectedJsonEnvelopeCert.recipientEmail,
                    programId: selectedJsonEnvelopeCert.programId,
                    programName: selectedJsonEnvelopeCert.programName,
                    customFields: selectedJsonEnvelopeCert.customFields ?? {},
                  },
                  signature: {
                    algorithm: selectedJsonEnvelopeCert.signatureAlg,
                    version: selectedJsonEnvelopeCert.signatureVersion,
                    value: selectedJsonEnvelopeCert.signature,
                    signedFields: [
                      'id', 'workspaceId', 'programId', 'programName',
                      'recipientName', 'recipientEmail', 'issueDate', 'expiryDate',
                    ],
                    note: 'Symmetric HMAC. Verifiable only by the issuing registry.',
                  },
                }, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedJsonEnvelopeCert, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `certificate-${selectedJsonEnvelopeCert.id}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  toast.success('JSON metadata downloaded.');
                }}
                className={btnSecondary}
              >
                Download JSON
              </button>
              <button onClick={() => setSelectedJsonEnvelopeCert(null)} className={btnPrimary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Certificate Preview Card */}
      {selectedPreviewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white p-6 text-left shadow-2xl">
            <button
              onClick={() => setSelectedPreviewCert(null)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
              type="button"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-[15px] font-semibold text-slate-900">Certificate preview</h3>
              <p className="mt-1 text-[13px] text-slate-500">Print-ready preview card for verification audits.</p>
            </div>

            <div className="my-6 flex flex-1 items-center justify-center overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-6">
              <div className="relative flex aspect-[1.6/1] w-full max-w-lg flex-col justify-between border-8 border-double border-slate-800 bg-white p-8 text-center font-serif shadow-md">
                <div className="absolute right-3 top-2 font-mono text-[6px] text-slate-300">GLINT PUBLIC REGISTRY ANCHORED PROOF</div>

                <div className="space-y-1">
                  <h4 className="text-xl font-bold uppercase tracking-wider text-slate-900">Certificate of Achievement</h4>
                  <p className="font-sans text-[10px] italic text-slate-500">This certifies that the recipient is officially registered in the Registry database.</p>
                </div>

                <div className="my-3 space-y-1">
                  <p className="font-sans text-[11px] text-slate-400">This is proud certificate validation of</p>
                  <h2 className="text-2xl font-bold capitalize italic text-slate-950 underline decoration-slate-400 decoration-1 underline-offset-8">{selectedPreviewCert.recipientName}</h2>
                </div>

                <div className="space-y-1">
                  <p className="font-sans text-[11px] text-slate-400">for completing the official program requirements in</p>
                  <h3 className="font-sans text-sm font-bold uppercase tracking-wide text-slate-800">{selectedPreviewCert.programName || "Certification Program"}</h3>
                </div>

                <div className="mt-2 flex items-end justify-between border-t border-slate-200 pt-4 font-sans text-[8px] text-slate-500">
                  <div className="space-y-0.5 text-left">
                    <p>VERIFICATION AUTHORITY ID</p>
                    <p className="font-mono font-semibold text-slate-900">{selectedPreviewCert.id.substring(0, 16)}...</p>
                  </div>
                  <div className="space-y-0.5 text-center">
                    <p>STATUS</p>
                    <p className={`font-bold uppercase ${selectedPreviewCert.status === 'valid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedPreviewCert.status}
                    </p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p>DATE ISSUED</p>
                    <p className="font-mono font-semibold text-slate-900">{selectedPreviewCert.issueDate}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button onClick={() => window.print()} className={btnSecondary}>
                Print / PDF
              </button>
              <button onClick={() => setSelectedPreviewCert(null)} className={btnPrimary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
