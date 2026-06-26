import { toast } from 'sonner';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Award, Users, Database, ShieldCheck, Settings, Globe, Mail, Landmark, 
  Trash2, Plus, ArrowUpRight, Upload, RefreshCw, Layers, Calendar, User, Search,
  AlertTriangle, Check, Sliders, Play, CheckCircle2, ShieldAlert, Sparkles, BookOpen,
  LogOut, Menu, X
} from 'lucide-react';
import { 
  OrganizationWorkspace, CertificateProgram, CertificateTemplate, 
  Certificate, Recipient, WorkspaceAnalytics, TextElement, EmailLog
} from '../types';
import { CanvaEditor } from './CanvaEditor';

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

interface DashboardProps {
  currentWorkspaceId: string;
  activeTab: 'overview' | 'programs' | 'templates' | 'recipients' | 'issued' | 'branding' | 'settings' | 'emails';
  onTabChange: (tab: 'overview' | 'programs' | 'templates' | 'recipients' | 'issued' | 'branding' | 'settings' | 'emails') => void;
  onWorkspaceChange: (id: string) => void;
  onViewCertificatePage: (id: string) => void;
  token: string | null;
  user: any;
  onLogout: () => void;
}

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
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'templates' | 'recipients' | 'issued' | 'branding' | 'settings' | 'emails'>(activeTabProp || 'overview');

  useEffect(() => {
    if (activeTabProp && activeTabProp !== activeTab) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);

  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    onTabChange(tab);
    setIsMobileSidebarOpen(false);
  };

  // Backend States
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
  const [progIssueDate, setProgIssueDate] = useState('2026-06-17');
  const [progExpiryDate, setProgExpiryDate] = useState('');
  const [fieldString, setFieldString] = useState('');
  const [editingProgram, setEditingProgram] = useState<CertificateProgram | null>(null);

  // Template Editor states
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [selectedTextElId, setSelectedTextElId] = useState<string | null>(null);

  // Bulk Recipient states & mapper
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [rawCsvInput, setRawCsvInput] = useState('');
  const [importStep, setImportStep] = useState<'input' | 'preview' | 'success'>('input');
  const [validatedRecipients, setValidatedRecipients] = useState<Recipient[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [mappedCertificates, setMappedCertificates] = useState<Certificate[]>([]);

  // Revocation workflow states
  const [revokingCertId, setRevokingCertId] = useState<string | null>(null);
  const [revocationReason, setRevocationReason] = useState('');

  // Single Recipient Issuance states
  const [showSingleIssueModal, setShowSingleIssueModal] = useState(false);
  const [singleProgramId, setSingleProgramId] = useState('');
  const [singleRecipientName, setSingleRecipientName] = useState('');
  const [singleRecipientEmail, setSingleRecipientEmail] = useState('');
  const [singleCustomFields, setSingleCustomFields] = useState<Record<string, string>>({});
  const [singleIssueDate, setSingleIssueDate] = useState('');

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 1. Initial Load & Dynamic Synchronization
  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (currentWorkspaceId) {
      loadWorkspaceData();
    }
  }, [currentWorkspaceId]);

  const loadWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces', { headers: authHeaders });
      if (res.status === 401 || res.status === 403) {
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

  const loadWorkspaceData = async () => {
    setLoading(true);
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

      if (programsRes.status === 401 || programsRes.status === 403) {
        toast.error('Session expired. Please log in again.');
        onLogout();
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
      setLoading(false);
    }
  };

  const triggerDataRefresh = async () => {
    setRefreshing(true);
    await loadWorkspaceData();
    setRefreshing(false);
  };

  // 2. Onboard Brand New Workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName || !newWsBrandName) return;

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
        // Switch to new
        onWorkspaceChange(created.id);
      }
    } catch (err) {
      console.error('Failed to register workspace', err);
    }
  };

  // 3. Create or Edit a Program
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName || !progTemplateId) return;

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
          templateId: progTemplateId,
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
        setProgExpiryDate('');
        setFieldString('');
        await triggerDataRefresh();
      }
    } catch (err) {
      console.error('Failed to save program', err);
    }
  };

  // 3b. Issue a Single Certificate (Single Issuer)
  const handleIssueSingleCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleProgramId || !singleRecipientName || !singleRecipientEmail) {
      toast.error('Name and Email are required.');
      return;
    }

    const matchedProg = programs.find(p => p.id === singleProgramId);
    if (!matchedProg) return;

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
        body: JSON.stringify({ recipients: [recipient] })
      });

      if (res.ok) {
        setShowSingleIssueModal(false);
        setSingleRecipientName('');
        setSingleRecipientEmail('');
        setSingleCustomFields({});
        changeTab('issued');
        await triggerDataRefresh();
        toast.success('Certificate issued and registered successfully!');
      } else {
        const errData = await res.json();
        toast.error(`Failed to issue certificate: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Single issuance failed', err);
      toast.error('An error occurred during issuance.');
    }
  };

  // 4. Visual Template Editor Tools
  const selectTemplateForEditor = (temp: CertificateTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(temp))); // Deep copy
    if (temp.textElements.length > 0) {
      setSelectedTextElId(temp.textElements[0].id);
    }
  };

  const handleUpdateTemplateProperty = (property: string, value: any) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      [property]: value
    });
  };

  const handleUpdateTextElementProperty = (property: string, value: any) => {
    if (!editingTemplate || !selectedTextElId) return;
    const updatedElements = editingTemplate.textElements.map(el => {
      if (el.id === selectedTextElId) {
        return { ...el, [property]: value };
      }
      return el;
    });
    setEditingTemplate({
      ...editingTemplate,
      textElements: updatedElements
    });
  };

  const handleSaveTemplateChanges = async () => {
    if (!editingTemplate) return;
    try {
      const res = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(editingTemplate)
      });
      if (res.ok) {
        setEditingTemplate(null);
        await triggerDataRefresh();
      }
    } catch (err) {
      console.error('Failed saving template edits', err);
    }
  };

  const handleSaveCanvaTemplate = async (updated: CertificateTemplate) => {
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
        setEditingTemplate(null);
        await triggerDataRefresh();
      }
    } catch (err) {
      console.error('Failed saving template edits', err);
    }
  };

  const handleAddNewTemplate = async () => {
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
      }
    } catch (err) {
      console.error('Failed creating template template', err);
    }
  };
  
  const handleUploadCertificateDesign = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      toast.error("Image is too large. Please select an image smaller than 3.5MB for fast loading.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      try {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            workspaceId: currentWorkspaceId,
            name: `Uploaded - ${file.name.split('.')[0]}`,
            layout: 'landscape',
            backgroundColor: '#FFFFFF',
            borderColor: '#0a0a0a',
            borderWidth: 0,
            showSeal: false,
            sealType: 'classic',
            signatoryName: 'Jane Doe',
            signatoryTitle: 'Chancellor, Education Unit',
            backgroundImageUrl: base64Data,
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
        }
      } catch (err) {
        console.error('Failed creating template from uploaded design', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to remove this template? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { 
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        await triggerDataRefresh();
      }
    } catch (err) {
      console.error(err);
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
    setImportStep('preview');
  };

  const handleIssueCertificates = async () => {
    if (validatedRecipients.length === 0 || !selectedProgramId) return;

    // Filter only valid entries to issue safely
    const activeIssuables = validatedRecipients.filter(r => r.isValid);
    if (activeIssuables.length === 0) {
      toast.error('There are no valid, clean recipient lines matching the template fields to issue.');
      return;
    }

    try {
      const res = await fetch(`/api/programs/${selectedProgramId}/issue`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ recipients: activeIssuables })
      });

      if (res.ok) {
        const output = await res.json();
        setMappedCertificates(output.certificates);
        setImportStep('success');
        setRawCsvInput('');
        await triggerDataRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Issuance failed: ${errData.error || 'The server encountered an error processing the certificate registry.'}`);
      }
    } catch (err) {
      console.error('Issuance failed', err);
      toast.error('An unexpected network error occurred while dispatching certificates.');
    }
  };

  // 6. Certificate Revoke Trigger
  const handleInitiateRevoke = (certId: string) => {
    setRevokingCertId(certId);
    setRevocationReason('Standard academic audit flags: Violation of integrity clauses');
  };

  const handleExecuteRevocation = async () => {
    if (!revokingCertId) return;

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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreCertificate = async (id: string) => {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Theme / Branding Update
  const handleUpdateBrandingConfig = async (brandingUpdates: any) => {
    if (!currentWorkspace) return;

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
        toast.success('Branding custom variables synchronized successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this program? All related certificates will be revoked.')) return;
    try {
      const res = await fetch(`/api/programs/${id}`, { 
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        await triggerDataRefresh();
      }
    } catch (err) {
      console.error(err);
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
  };

  // Filter Issued List
  const filteredCertificates = certificates.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.id.toLowerCase().includes(query) ||
      c.recipientName.toLowerCase().includes(query) ||
      c.recipientEmail.toLowerCase().includes(query) ||
      c.programName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-screen w-screen bg-[#F8F9FA] overflow-hidden font-sans relative">
      
      {/* Sidebar Control Deck */}
      {/* Translucent backdrop overlay for mobile view */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-[#E9ECEF] flex flex-col justify-between py-8 px-6 shrink-0 z-50 transition-transform duration-300 transform ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:relative md:z-30`}>
        <div className="space-y-8 overflow-y-auto">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Modern circular G lettermark */}
                <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 16H23" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                {/* Elegant golden glint spark on the shoulder of G */}
                <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
              </svg>
              <span className="font-display font-extrabold tracking-wider text-slate-950 text-sm uppercase">GLINT REGISTRY</span>
            </div>
            
            {/* Refresh state spinner */}
            <button 
              onClick={triggerDataRefresh}
              className={`text-slate-400 hover:text-slate-900 transition-colors p-1 rounded hover:bg-slate-50 ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh ledger state"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Tenant / Workspace Selector Dropdown with Addition toggle */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">Active Workspace</label>
            <div className="relative">
              <select
                value={currentWorkspaceId}
                onChange={(e) => onWorkspaceChange(e.target.value)}
                className="w-full bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-900 py-2.5 px-3 rounded-lg border-none focus:ring-1 focus:ring-slate-950 focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{capitalizeWords(ws.name)}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 text-[10px]">
                ▼
              </div>
            </div>
            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-950 flex items-center gap-1 transition-colors pt-1"
            >
              <Plus className="w-3 h-3" /> Onboard New Organization
            </button>
          </div>

          {/* Navigation Deck */}
          <nav className="space-y-1">
            <button
              onClick={() => { changeTab('overview'); setEditingTemplate(null); }}
              className={`w-full flex items-center justify-between py-2 px-3 rounded-lg font-medium text-xs transition-all ${activeTab === 'overview' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4" /> Workspace Overview
              </span>
            </button>

            <button
              onClick={() => { changeTab('programs'); setEditingTemplate(null); }}
              className={`w-full flex items-center py-2 px-3 rounded-lg font-medium text-xs transition-all ${activeTab === 'programs' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4" /> Certification Programs
              </span>
            </button>

            <button
              onClick={() => { changeTab('templates'); setEditingTemplate(null); }}
              className={`w-full flex items-center py-2 px-3 rounded-lg font-medium text-xs transition-all ${activeTab === 'templates' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" /> Layout Templates
              </span>
            </button>

            <button
              onClick={() => { changeTab('recipients'); setEditingTemplate(null); }}
              className={`w-full flex items-center py-2 px-3 rounded-lg font-medium text-xs transition-all ${activeTab === 'recipients' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Upload className="w-4 h-4" /> Bulk CSV Issuance
              </span>
            </button>

            <button
              onClick={() => { changeTab('issued'); setEditingTemplate(null); }}
              className={`w-full flex items-center py-2 px-3 rounded-lg font-medium text-xs transition-all ${activeTab === 'issued' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Award className="w-4 h-4" /> Issued Registry
              </span>
            </button>

            <button
              onClick={() => { changeTab('emails'); setEditingTemplate(null); }}
              className={`w-full flex items-center py-2 px-3 rounded-lg font-medium text-xs transition-all ${activeTab === 'emails' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" /> Email Logs Simulator
              </span>
            </button>

            <button
              onClick={() => { changeTab('branding'); setEditingTemplate(null); }}
              className={`w-full flex items-center justify-between py-2 px-3 rounded-lg font-medium text-xs transition-all ${activeTab === 'branding' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" /> Private Branding
              </span>
            </button>

            <button
              onClick={() => { changeTab('settings'); setEditingTemplate(null); }}
              className={`w-full flex items-center justify-between py-2 px-3 rounded-lg font-medium text-xs transition-all ${activeTab === 'settings' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" /> Workspace Limits
              </span>
            </button>
          </nav>
        </div>

        {/* Workspace Owner Card */}
        <div className="space-y-6 border-t border-slate-100 pt-6">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-mono">
              <span className="font-bold text-[#9CA3AF]">Plan State</span>
              <span className="font-bold text-slate-950 bg-slate-200 px-1 py-0.2 rounded uppercase">{currentWorkspace?.plan}</span>
            </div>
            <p className="text-xs font-semibold text-slate-900 truncate">{currentWorkspace?.branding?.brandName}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-inner">
              {(user?.name || currentWorkspace?.name || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'Administrator Account'}</p>
              <p className="text-[9px] font-mono text-slate-400 truncate">{user?.email || 'admin@glint.io'}</p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                id="btn-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8F9FA]">
        
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
            <h1 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">
              {activeTab === 'overview' && 'Overview Deck'}
              {activeTab === 'programs' && 'Certification Programs'}
              {activeTab === 'templates' && 'Layout Templates & Editor'}
              {activeTab === 'recipients' && 'Bulk CSV Recipient Import'}
              {activeTab === 'issued' && 'Issued Certificate Registry'}
              {activeTab === 'branding' && 'White-label Custom Branding'}
              {activeTab === 'settings' && 'Workspace Limits & SLA'}
              {activeTab === 'emails' && 'Email Logs'}
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded border border-green-150 font-mono">
              ★ {currentWorkspace?.plan.toUpperCase()} WORKSPACE
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="hidden md:inline-block text-slate-400 font-mono text-[10px]">Domain Bound: <strong className="text-slate-850 font-bold">{currentWorkspace?.branding?.customDomain || 'Standard Ledger'}</strong></span>
            {activeTab !== 'recipients' && (
              <button 
                onClick={() => {
                  if (programs.length > 0) {
                    setSelectedProgramId(programs[0].id);
                    changeTab('recipients');
                  } else {
                    toast.error('Please configure at least one certification program first.');
                  }
                }}
                className="bg-slate-950 text-white text-[10px] sm:text-[11px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold shadow-sm hover:bg-indigo-600 transition-all whitespace-nowrap"
              >
                + Bulk Issuer Pipeline
              </button>
            )}
          </div>
        </header>

        {/* Inner Content Area */}
        <div className={`flex-1 min-w-0 ${editingTemplate ? 'p-0 overflow-hidden' : 'p-4 sm:p-6 md:p-8 overflow-y-auto'}`}>
          
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <RefreshCw className="w-8 h-8 text-slate-800 animate-spin mb-3" />
              <p className="text-xs font-mono uppercase tracking-widest">Compiling live credential ledger...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Top Header Editorial Greeting */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pb-4 border-b border-slate-200">
                    <div className="lg:col-span-6 space-y-2">
                      <h2 className="font-serif text-5xl italic text-slate-950 leading-none">Authority Status.</h2>
                      <p className="text-slate-500 text-sm max-w-sm">
                        Credential registry for {currentWorkspace?.branding.brandName}. Secure multi-tenant tracking.
                      </p>
                    </div>
                    
                    {/* Big Stats Row */}
                    <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                      <div className="border-l border-slate-200 pl-4 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Total Issued</p>
                        <p className="font-display text-3xl font-bold text-slate-950 leading-none">{analytics?.issuedCount || 0}</p>
                      </div>
                      <div className="border-l border-slate-200 pl-4 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Checks Match</p>
                        <p className="font-display text-3xl font-bold text-slate-950 leading-none">{analytics?.verificationCount || 0}</p>
                      </div>
                      <div className="border-l border-slate-200 pl-4 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Engagement</p>
                        <p className="font-display text-3xl font-bold text-slate-950 leading-none">A+</p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white border border-[#E9ECEF] rounded-xl p-5 space-y-3 card-shadow">
                      <p className="text-[9px] uppercase tracking-widest text-[#9CA3AF] font-bold">ACTIVE PROGRAMS</p>
                      <div className="flex justify-between items-end">
                        <p className="font-display font-bold text-slate-950 text-3xl">{programs.filter(p => p.status === 'active').length}</p>
                        <span className="text-[10px] text-slate-400 font-mono">Programs total: {programs.length}</span>
                      </div>
                    </div>

                    <div className="bg-white border border-[#E9ECEF] rounded-xl p-5 space-y-3 card-shadow">
                      <p className="text-[9px] uppercase tracking-widest text-[#9CA3AF] font-bold">LEDGER VIEW RATE</p>
                      <div className="flex justify-between items-end">
                        <p className="font-display font-bold text-slate-950 text-3xl">{analytics?.viewCount || 0}</p>
                        <span className="text-[10px] text-emerald-600 font-bold font-mono">High Quality Activity</span>
                      </div>
                    </div>

                    <div className="bg-white border border-[#E9ECEF] rounded-xl p-5 space-y-3 card-shadow">
                      <p className="text-[9px] uppercase tracking-widest text-[#9CA3AF] font-bold">DIGITAL DOWNLOADS</p>
                      <div className="flex justify-between items-end">
                        <p className="font-display font-bold text-slate-950 text-3xl">{analytics?.downloadCount || 0}</p>
                        <span className="text-[10px] text-slate-400 font-mono">100% PDF Verified</span>
                      </div>
                    </div>

                    <div className="bg-white border border-[#E9ECEF] rounded-xl p-5 space-y-3 card-shadow">
                      <p className="text-[9px] uppercase tracking-widest text-[#9CA3AF] font-bold">SOCIAL RESHARES</p>
                      <div className="flex justify-between items-end">
                        <p className="font-display font-bold text-slate-950 text-3xl">{analytics?.shareCount || 0}</p>
                        <span className="text-[10px] text-slate-400 font-mono">LinkedIn matched</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Graphic representation & Recent Activity list */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Visual Chart Graphic simulation (High Quality SVG) */}
                    <div className="lg:col-span-8 bg-white border border-[#E9ECEF] rounded-2xl p-6 card-shadow space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Chronological Volume Scale</h3>
                        <div className="flex gap-4 text-[10px] font-mono text-slate-400">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-950"></span> Issued</span>
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verified</span>
                        </div>
                      </div>                      {/* Pure high quality CSS Grid SVG chart representations */}
                      <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
                        <div className="h-64 flex items-end justify-between gap-4 pt-10 border-b border-slate-100 relative min-w-[500px]">
                          {/* Background scale indicators */}
                          <div className="absolute left-0 right-0 top-1/4 border-t border-slate-50 border-dashed pointer-events-none"></div>
                          <div className="absolute left-0 right-0 top-2/4 border-t border-slate-5 border-dashed pointer-events-none"></div>
                          <div className="absolute left-0 right-0 top-3/4 border-t border-slate-5 border-dashed pointer-events-none"></div>
                          
                          {/* Render customized trend bars dynamically based on loaded database elements */}
                          {analytics?.issuanceTrend.map((pt, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group z-10">
                              <div className="w-full flex items-end justify-center gap-1.5 h-44">
                                {/* Issued representation */}
                                <div 
                                  style={{ height: `${Math.min(100, Math.max(15, (pt.count / (analytics.issuedCount || 100)) * 280))}%` }}
                                  className="w-6 bg-slate-900 group-hover:bg-slate-700 rounded-sm transition-all relative"
                                  title={`Issued: ${pt.count}`}
                                >
                                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 px-1 rounded shadow-sm shrink-0 whitespace-nowrap">{pt.count}</span>
                                </div>
                                {/* Verified representation */}
                                <div 
                                  style={{ height: `${Math.min(100, Math.max(10, ((analytics.verificationTrend[idx]?.count || 0) / (analytics.viewCount || 50)) * 200))}%` }}
                                  className="w-6 bg-emerald-500 group-hover:bg-emerald-400 rounded-sm transition-all relative"
                                  title={`Verified: ${analytics.verificationTrend[idx]?.count || 0}`}
                                >
                                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 px-1 rounded shadow-sm shrink-0 whitespace-nowrap">{analytics.verificationTrend[idx]?.count || 0}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">{pt.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl text-xs text-slate-500 border border-slate-100">
                        <Sparkles className="w-4 h-4 text-slate-900 shrink-0" />
                        <span>Interactive Telemetry: Hover trend components above to inspect precise authority check stats.</span>
                      </div>
                    </div>

                    {/* Quick Traffic breakdown box */}
                    <div className="lg:col-span-4 bg-white border border-[#E9ECEF] rounded-2xl p-6 card-shadow space-y-6">
                      <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Public Referral Channels</h3>
                      <div className="space-y-4">
                        {analytics?.trafficSources.map((source, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-800">{source.source}</span>
                              <span className="font-mono text-slate-400 font-bold">{source.count} clicks</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${Math.min(100, (source.count / (analytics.viewCount || 1)) * 100)}%` }} 
                                className="bg-slate-950 h-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity List */}
                  <div className="bg-white border border-[#E9ECEF] rounded-2xl p-6 card-shadow space-y-4">
                    <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Recent Authority Dispatches</h3>
                    <div className="divide-y divide-slate-100">
                      {certificates.slice(-5).map((cert, idx) => (
                        <div key={idx} className="py-3.5 flex justify-between items-center text-xs">
                          <div className="space-y-0.5 max-w-sm">
                            <p className="font-semibold text-slate-900 capitalize">{cert.recipientName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{cert.recipientEmail} • Verified ID {cert.id}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                              cert.status === 'valid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {cert.status}
                            </span>
                            <button
                              onClick={() => onViewCertificatePage(cert.id)}
                              className="text-[10px] text-slate-500 hover:text-slate-950 underline font-bold flex items-center justify-end gap-0.5"
                            >
                              Audit <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: PROGRAMS */}
              {activeTab === 'programs' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Title Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="font-serif text-4xl italic text-slate-950">Credential Program Registers</h2>
                      <p className="text-slate-500 text-sm">Organize cohort tracks, events, or academic courses.</p>
                    </div>
                    
                    {!showProgramForm && (
                      <button
                        onClick={() => {
                          if (templates.length === 0) {
                            toast.error('Create at least one template program layout before configuring certificate programs.');
                            return;
                          }
                          setEditingProgram(null);
                          setProgName('');
                          setProgDesc('');
                          setProgExpiryDate('');
                          setFieldString('');
                          setProgTemplateId(templates[0].id);
                          setShowProgramForm(true);
                        }}
                        className="bg-slate-950 text-white text-xs px-5 py-2.5 rounded-full font-bold shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Create Category Track
                      </button>
                    )}
                  </div>

                  {/* Create Program Block Form */}
                  {showProgramForm && (
                    <form onSubmit={handleCreateProgram} className="bg-white border border-[#E9ECEF] rounded-2xl p-8 card-shadow space-y-6 max-w-2xl">
                      <h3 className="text-sm font-bold text-slate-950 uppercase tracking-widest pb-3 border-b border-slate-100">
                        {editingProgram ? 'Edit Credential Program' : 'Configure Program Variable Matrix'}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Program / Course Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Executive MBA: Data Architecture"
                            value={progName}
                            onChange={(e) => setProgName(capitalizeWords(e.target.value))}
                            className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none focus:border-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Default Layout Template</label>
                          <select
                            value={progTemplateId}
                            onChange={(e) => setProgTemplateId(e.target.value)}
                            className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none focus:border-slate-900"
                          >
                            {templates.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Description of certification competencies</label>
                        <textarea
                          placeholder="Summary of modules verified by passing this track"
                          value={progDesc}
                          onChange={(e) => setProgDesc(e.target.value)}
                          className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none focus:border-slate-900 h-20"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Issue Date</label>
                          <input
                            type="date"
                            required
                            value={progIssueDate}
                            onChange={(e) => setProgIssueDate(e.target.value)}
                            className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expiry Date (Optional)</label>
                          <input
                            type="date"
                            value={progExpiryDate}
                            onChange={(e) => setProgExpiryDate(e.target.value)}
                            className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                          <span>Spreadsheet Variable Mapping Fields</span>
                          <span className="text-[9px] text-[#9CA3AF] lowercase">Comma separated values list</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fieldString}
                          onChange={(e) => setFieldString(e.target.value)}
                          className="w-full bg-slate-50 text-xs py-2.5 px-3 rounded border border-slate-200 focus:outline-none focus:border-slate-900 font-mono"
                        />
                        <p className="text-[10px] text-slate-400 leading-normal">
                          The CSV mapper will expect these column tags. Example: Map <code className="bg-slate-100 text-slate-700 px-1 rounded font-mono">Grade</code>, <code className="bg-slate-100 text-slate-700 px-1 rounded font-mono">Score</code> or <code className="bg-slate-100 text-slate-700 px-1 rounded font-mono">Instructors</code> to print dynamically.
                        </p>
                      </div>

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProgramForm(false);
                            setEditingProgram(null);
                            setProgName('');
                            setProgDesc('');
                            setProgExpiryDate('');
                            setFieldString('');
                          }}
                          className="bg-slate-100 text-slate-800 text-xs px-4 py-2 rounded-lg font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-slate-950 text-white text-xs px-5 py-2.5 rounded-lg font-bold hover:bg-slate-800"
                        >
                          {editingProgram ? 'Save Changes' : 'Register Program Track'}
                        </button>
                      </div>
                    </form>
                  )}

                  {programs.length === 0 ? (
                    <div className="px-8 py-16 text-center text-slate-500 bg-white border border-[#E9ECEF] rounded-2xl">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                          <Layers className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm">No Programs Found</h3>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">Create a certificate program to start issuing credentials to your recipients.</p>
                        <button onClick={() => setShowProgramForm(true)} className="mt-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold underline transition-colors">
                          Create First Program
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Program Table - Desktop */}
                      <div className="hidden md:block bg-white border border-[#E9ECEF] rounded-2xl overflow-hidden card-shadow overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <tr>
                              <th className="px-8 py-4">Event Track Metadata</th>
                              <th className="px-6 py-4">Associated template</th>
                              <th className="px-6 py-4">Custom Mapped Variables</th>
                              <th className="px-6 py-4">Dispatched Status</th>
                              <th className="px-8 py-4 text-right">Operations</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                            {programs.map((prog) => {
                              const associatedTemplate = templates.find(t => t.id === prog.templateId)?.name || 'Default';
                              const issueCount = certificates.filter(c => c.programId === prog.id).length;
                              
                              return (
                                <tr key={prog.id} className="hover:bg-slate-50/40">
                                  <td className="px-8 py-5 space-y-1.5">
                                    <p className="font-bold text-slate-950 text-sm leading-tight capitalize">{prog.name}</p>
                                    <p className="text-[10px] text-slate-400 leading-normal max-w-sm">{prog.description}</p>
                                    <p className="text-[9px] font-mono text-slate-400">UUID: {prog.id} • Created Date: {new Date(prog.createdTime).toLocaleDateString()}</p>
                                  </td>
                                  <td className="px-6 py-5 font-semibold text-slate-900">
                                    {associatedTemplate}
                                  </td>
                                  <td className="px-6 py-5 space-y-1.5">
                                    <div className="flex flex-wrap gap-1">
                                      {['name', 'email', 'date', ...prog.recipientFields.filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase()))].map((field, idx) => (
                                        <span key={idx} className="bg-slate-150 text-[9px] hover:bg-slate-200 transition-colors font-mono font-bold text-slate-800 px-1.5 py-0.5 rounded uppercase border">
                                          {field}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="space-y-1">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                        issueCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-405 border-slate-200'
                                      }`}>
                                        {issueCount > 0 ? 'Active Dispatched' : 'Pending Register'}
                                      </span>
                                      <p className="text-[10px] font-mono text-slate-400 font-bold">{issueCount} credentials issued</p>
                                    </div>
                                  </td>
                                  <td className="px-8 py-5 text-right space-x-3.5">
                                    <button
                                      type="button"
                                      onClick={() => handleEditProgram(prog)}
                                      className="text-[10px] uppercase text-[#1a73e8] hover:underline font-bold"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedProgramId(prog.id);
                                        setImportStep('input');
                                        changeTab('recipients');
                                      }}
                                      className="text-[10px] uppercase text-[#1a73e8] hover:underline font-bold"
                                    >
                                      Discharge CSV
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProgram(prog.id)}
                                      className="text-slate-400 hover:text-rose-600 transition-colors"
                                      title="Delete track"
                                    >
                                      <Trash2 className="w-4 h-4 inline" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Program Cards - Mobile */}
                      <div className="block md:hidden space-y-4">
                        {programs.map((prog) => {
                          const associatedTemplate = templates.find(t => t.id === prog.templateId)?.name || 'Default';
                          const issueCount = certificates.filter(c => c.programId === prog.id).length;
                          
                          return (
                            <div key={prog.id} className="bg-white border border-[#E9ECEF] rounded-xl p-5 card-shadow space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <h3 className="font-bold text-slate-955 text-sm capitalize">{prog.name}</h3>
                                  <p className="text-[10px] text-slate-400 font-mono">UUID: {prog.id}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                  issueCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-405 border-slate-200'
                                }`}>
                                  {issueCount > 0 ? 'Active' : 'Pending'}
                                </span>
                              </div>

                              {prog.description && (
                                <p className="text-[11px] text-slate-505 leading-normal">{prog.description}</p>
                              )}

                              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider text-slate-405 font-bold">Template</p>
                                  <p className="font-semibold text-slate-800 truncate">{associatedTemplate}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider text-slate-405 font-bold">Issued</p>
                                  <p className="font-semibold text-slate-800">{issueCount} credentials</p>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-[9px] uppercase tracking-wider text-slate-405 font-bold">Mapped Fields</p>
                                <div className="flex flex-wrap gap-1">
                                  {['name', 'email', 'date', ...prog.recipientFields.filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase()))].map((field, idx) => (
                                    <span key={idx} className="bg-slate-150 text-[9px] font-mono font-bold text-slate-800 px-1.5 py-0.5 rounded uppercase border">
                                      {field}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleEditProgram(prog)}
                                    className="text-[10px] uppercase text-[#1a73e8] hover:underline font-bold"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedProgramId(prog.id);
                                      setImportStep('input');
                                      changeTab('recipients');
                                    }}
                                    className="text-[10px] uppercase text-[#1a73e8] hover:underline font-bold"
                                  >
                                    CSV Issue
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProgram(prog.id)}
                                  className="text-slate-405 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                                  title="Delete track"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                </div>
              )}

              {/* TAB 3: LAYOUT TEMPLATES */}
              {activeTab === 'templates' && (
                editingTemplate ? (
                  <CanvaEditor 
                    template={editingTemplate} 
                    onSave={handleSaveCanvaTemplate} 
                    onCancel={() => setEditingTemplate(null)} 
                    brandName={currentWorkspace?.branding?.brandName || currentWorkspace?.name} 
                    primaryColor={currentWorkspace?.branding?.primaryColor || '#000000'}
                    token={token}
                    programs={programs}
                  />
                ) : (
                  <div className="space-y-8 animate-fade-in">
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <h2 className="font-serif text-3xl italic text-slate-950">Layout Template Blueprints</h2>
                          <p className="text-slate-500 text-sm">Choose and configure highly scalable CSS certificate canvases.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => document.getElementById('dashboard-design-upload')?.click()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 py-2.5 rounded-full font-bold shadow-sm flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          >
                            <Upload className="w-4 h-4" /> Upload Certificate Design
                          </button>
                          <input 
                            type="file"
                            id="dashboard-design-upload"
                            accept="image/*"
                            onChange={handleUploadCertificateDesign}
                            className="hidden"
                          />
                          <button
                            onClick={handleAddNewTemplate}
                            className="bg-slate-950 text-white text-xs px-5 py-2.5 rounded-full font-bold shadow-sm hover:bg-slate-800 whitespace-nowrap"
                          >
                            + Seed Professional Blueprint
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {templates.map(temp => (
                          <div key={temp.id} className="bg-white border border-[#E9ECEF] rounded-2xl p-6 space-y-4 shadow-sm card-shadow flex flex-col justify-between">
                            <div className="space-y-2">
                              <h3 className="font-bold text-slate-900 text-sm">{temp.name}</h3>
                              <p className="text-xs text-[#9CA3AF] font-mono uppercase">ID: {temp.id} • Mode: {temp.layout.toUpperCase()}</p>
                              
                              {/* Small blueprint visual representation */}
                              <div className="border border-slate-100 bg-[#F8F9FA] rounded p-4 flex flex-col justify-between h-36 relative overflow-hidden">
                                <div className="absolute top-2 right-2 px-1 text-[8px] border font-mono">1.414 : 1</div>
                                <div className="space-y-1">
                                  <div className="w-1/3 bg-slate-200 h-1 rounded-full"></div>
                                  <div className="w-1/2 bg-slate-300 h-2 rounded-full"></div>
                                </div>
                                <div className="w-3/4 mx-auto bg-slate-400 h-3 rounded-full mt-4"></div>
                                <div className="flex justify-between items-end border-t border-slate-200 pt-2 text-[7px] text-slate-405">
                                  <span>AUTHORITY SIGNED</span>
                                  <span>QR SEAL INTEGRATED</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                onClick={() => handleDeleteTemplate(temp.id)}
                                className="bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 p-2 rounded border text-xs"
                                title="Delete template form"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => selectTemplateForEditor(temp)}
                                className="bg-slate-950 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-lg font-bold"
                              >
                                Configure Blueprint Canvas
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* TAB 4: BULK CSV RECIPIENT IMPORT */}
              {activeTab === 'recipients' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Tab Title */}
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="font-serif text-3xl italic text-slate-950">Bulk Dispatch Hub</h2>
                    <p className="text-slate-500 text-sm">Issue hundreds of secure verification credentials in a single bulk action.</p>
                  </div>

                  {importStep === 'input' && (
                    <div className="bg-white border border-[#E9ECEF] rounded-2xl p-8 card-shadow space-y-6 max-w-3xl">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-950 uppercase tracking-widest block">1. Select Target Certification Track</label>
                          <select
                            value={selectedProgramId}
                            onChange={(e) => setSelectedProgramId(e.target.value)}
                            className="w-full bg-slate-50 text-xs py-2.5 px-3 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-slate-800 font-semibold cursor-pointer"
                          >
                            <option value="">-- Choose Program Course --</option>
                            {programs.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {selectedProgramId && (() => {
                          const matchedProg = programs.find(p => p.id === selectedProgramId);
                          if (!matchedProg) return null;
                          return (
                            <div className="p-3 bg-slate-50 border rounded-lg text-xs space-y-1">
                              <p className="font-bold text-slate-900 uppercase tracking-wide text-[10px]">Expected spreadsheet headers:</p>
                              <p className="font-mono text-[10px] text-slate-550 break-all pb-1 uppercase font-bold">
                                Email, Name, {matchedProg.recipientFields.filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase())).join(', ')}
                              </p>
                              <p className="text-[10px] text-slate-400">Match these headers exactly inside your paste area below to map dynamic scores or classes.</p>
                            </div>
                          );
                        })()}
                      </div>

                      {selectedProgramId ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1"><Database className="w-4 h-4 text-slate-950" /> 2. Paste CSV spreadsheet lines</label>
                            
                            {/* Insert clean sample helper click */}
                            <button
                              type="button"
                              onClick={() => {
                                const matchedProg = programs.find(p => p.id === selectedProgramId);
                                const fieldsString = matchedProg ? matchedProg.recipientFields.filter(f => !['name', 'email', 'date', 'id', 'program'].includes(f.toLowerCase())).join(',') : 'Score,Cohort';
                                const sampleRows = `Email,Name,${fieldsString}\nalex.rivera@trustops-mail.com,Alex Rivera,92%,C-Alpha\njordan.vance@trustops-mail.com,Jordan Vance,96%,C-Alpha\nkeiko.tanaka@trustops-mail.com,Keiko Tanaka,100%,C-Beta`;
                                setRawCsvInput(sampleRows);
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-900 underline font-bold"
                            >
                              Load Sample CSV Layout
                            </button>
                          </div>

                          <textarea
                            value={rawCsvInput}
                            onChange={(e) => setRawCsvInput(e.target.value)}
                            placeholder="Email,Name,Score,Cohort&#10;example@mail.com,John Doe,95%,A-Cohort&#10;test@verify.net,Alice Sterling,98%,B-Cohort"
                            className="w-full bg-slate-50 text-xs font-mono p-4 rounded-xl border border-slate-200 focus:outline-none h-48 focus:border-slate-800 focus:bg-white"
                          />

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              disabled={!rawCsvInput.trim()}
                              onClick={handleParseRecipients}
                              className="bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs px-6 py-2.5 rounded-full font-bold shadow-md transition-colors"
                            >
                              Audit Spreadsheet Data
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-8 text-[#9CA3AF] text-xs">
                          Choose a certification track list above to start mapping metadata.
                        </div>
                      )}
                    </div>
                  )}

                  {importStep === 'preview' && (
                    <div className="space-y-6">
                      
                      {/* Sub-header audit details */}
                      <div className="bg-white border border-[#E9ECEF] rounded-2xl p-6 card-shadow space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest bg-slate-100 p-2 rounded">Auditor Spreadsheet Preview Log</h3>
                          <button
                            onClick={() => setImportStep('input')}
                            className="text-xs text-slate-500 hover:text-slate-950 underline font-bold"
                          >
                            Edit CSV Data
                          </button>
                        </div>

                        {importErrors.length > 0 && (
                          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-800 space-y-1">
                            <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> Found spreadsheet structure alarms:</p>
                            <ul className="list-disc pl-5 font-mono text-[10px] space-y-0.5">
                              {importErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                            </ul>
                          </div>
                        )}

                        <p className="text-xs text-[#64748B]">
                          Matches found: <span className="font-bold text-slate-900">{validatedRecipients.filter(r => r.isValid).length} clean records</span>, 
                          Errors: <span className="font-bold text-rose-600">{validatedRecipients.filter(r => !r.isValid).length} faulty records</span>.
                        </p>
                      </div>

                      {/* Validated Recipients Table */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden card-shadow overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-[#F8F9FA] border-b border-slate-200 font-bold uppercase text-slate-400 text-[10px] tracking-wider">
                            <tr>
                              <th className="px-8 py-3.5">Assigned Name</th>
                              <th className="px-6 py-3.5">Recipient Routing Email</th>
                              <th className="px-6 py-3.5">Mapped spreadsheet attributes</th>
                              <th className="px-8 py-3.5 text-right">Row Check Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600">
                            {validatedRecipients.map((rec, idx) => (
                              <tr key={idx} className={rec.isValid ? 'hover:bg-slate-55' : 'bg-rose-50/40'}>
                                <td className="px-8 py-4 font-semibold text-slate-900 capitalize">{rec.name || 'N/A'}</td>
                                <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{rec.email}</td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(rec.customFields).map(([k, v], id) => (
                                      <span key={id} className="bg-slate-100 text-[9px] font-mono text-slate-700 px-1 py-0.2 rounded">
                                        {k}: {v}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-8 py-4 text-right">
                                  {rec.isValid ? (
                                    <span className="text-emerald-600 font-bold flex items-center justify-end gap-1 text-[10px]">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> READY
                                    </span>
                                  ) : (
                                    <span className="text-rose-600 font-bold flex items-center justify-end gap-1 text-[10px]" title={rec.errors?.join(', ')}>
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> FAULTY
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setImportStep('input')}
                          className="bg-slate-100 text-slate-700 text-xs px-5 py-2.5 rounded-lg font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleIssueCertificates}
                          disabled={validatedRecipients.filter(r => r.isValid).length === 0}
                          className="bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs px-6 py-2.5 rounded-full font-bold shadow-md flex items-center gap-1 shrink-0"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Initialize Automated Ledger Issuance
                        </button>
                      </div>

                    </div>
                  )}

                  {importStep === 'success' && (
                    <div className="bg-white border border-[#E9ECEF] rounded-2xl p-8 card-shadow space-y-6 text-center max-w-xl mx-auto">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-serif text-3xl italic text-slate-900">Ledger Dispatched Successfully</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Secure verification links and cryptographic certificate tokens have been successfully generated for this cohort.
                        </p>
                      </div>

                      {/* Display generated list summaries */}
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left space-y-3 font-mono text-[10px] text-slate-600">
                        <p className="font-bold uppercase text-[#9CA3AF]">BULK DISPATCH METRIC</p>
                        <div className="flex justify-between border-b pb-1">
                          <span>Total Dispatched:</span>
                          <strong>{mappedCertificates.length} credentials</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Ledger Registry Integrity:</span>
                          <strong className="text-emerald-600">SECURE sha256_ACTIVE</strong>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => {
                            changeTab('issued');
                            setImportStep('input');
                          }}
                          className="w-full bg-slate-900 text-white text-xs py-2.5 rounded-xl font-bold hover:bg-slate-800"
                        >
                          Inspect Issued Directory
                        </button>
                        <button
                          onClick={() => setImportStep('input')}
                          className="w-full bg-slate-100 text-slate-800 text-xs py-2.5 rounded-xl border font-bold hover:bg-slate-200"
                        >
                          Issue Another Batch
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 5: ISSUED DIRECTORY */}
              {activeTab === 'issued' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Table Control Header card */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="font-serif text-3xl italic text-slate-950">Dispatched Integrity Registry</h2>
                      <p className="text-slate-550 text-xs text-[#9CA3AF]">Query live certificate credentials, audit logs, or issue suspension flags.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        onClick={() => {
                          if (programs.length === 0) {
                            toast.error('Configure at least one certification program first.');
                            return;
                          }
                          setSingleProgramId(programs[0].id);
                          setSingleRecipientName('');
                          setSingleRecipientEmail('');
                          setSingleCustomFields({});
                          setSingleIssueDate(new Date().toISOString().split('T')[0]);
                          setShowSingleIssueModal(true);
                        }}
                        className="bg-slate-950 text-white text-[11px] px-4.5 py-2.5 rounded-full font-bold shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Issue Single Certificate
                      </button>

                      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-[#E9ECEF] shadow-sm max-w-xs w-full shrink-0">
                        <Search className="text-slate-455 w-4 h-4 ml-1.5 shrink-0" />
                        <input 
                          type="text" 
                          placeholder="Search student, ID, or course..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-800 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Revocation dialog overlays check */}
                  {revokingCertId && (
                    <div className="bg-rose-50 border border-rose-150 rounded-xl p-5 space-y-4 max-w-xl">
                      <div className="flex items-center gap-2 text-rose-800 font-bold font-sans text-xs">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                        SUSPENSION REGULATOR MECHANISM
                      </div>
                      <p className="text-xs text-rose-700 leading-relaxed">
                        Are you sure you want to flag ID: <strong className="font-mono text-slate-900">{revokingCertId}</strong> as revoked? The recipient, verification search boards, and public links will instantly return a RED NULLIFIED STATE and list this auditing reason.
                      </p>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-rose-800">Violation Audit Reason</label>
                        <input
                          type="text"
                          required
                          value={revocationReason}
                          onChange={(e) => setRevocationReason(e.target.value)}
                          placeholder="e.g. Non-completion of baseline prerequisites / integrity flag"
                          className="w-full bg-white border border-rose-200 rounded p-2 text-xs text-slate-800"
                        />
                      </div>
                      <div className="flex gap-2.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setRevokingCertId(null)}
                          className="bg-white border rounded text-slate-700 text-xs font-bold px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleExecuteRevocation}
                          className="bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold px-4 py-1.5"
                        >
                          Confirm Revocation State
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Issued Database Table - Desktop */}
                  <div className="hidden md:block bg-white border border-[#E9ECEF] rounded-2xl overflow-hidden card-shadow overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-8 py-4">Verification ID</th>
                          <th className="px-6 py-4">Recipient Info</th>
                          <th className="px-6 py-4">Course Registry</th>
                          <th className="px-6 py-4">Audit Engagement</th>
                          <th className="px-6 py-4">State</th>
                          <th className="px-8 py-4 text-right">Operational Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {filteredCertificates.map(c => (
                          <tr key={c.id} className="hover:bg-slate-55/40">
                            <td className="px-8 py-5">
                              <span className="font-mono font-bold text-slate-900">{c.id}</span>
                              <p className="text-[10px] text-slate-400 font-mono italic shrink-0 truncate max-w-[120px]">{c.securityHash.substring(0, 18)}...</p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="font-bold text-slate-955 text-sm leading-tight capitalize">{c.recipientName}</p>
                              <p className="text-[10px] text-[#9CA3AF] mt-0.5">{c.recipientEmail}</p>
                            </td>
                            <td className="px-6 py-5 space-y-1">
                              <p className="font-semibold text-slate-800">{c.programName}</p>
                              <p className="text-[10px] text-[#9CA3AF]">Issued Date: {c.issueDate}</p>
                            </td>
                            <td className="px-6 py-5 font-mono text-[10px]">
                              <span>Views: <strong className="text-slate-900">{c.viewCount}</strong></span> • 
                              <span> DLs: <strong className="text-slate-900">{c.downloadCount}</strong></span>
                            </td>
                            <td className="px-6 py-5">
                              {c.status === 'valid' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-100">
                                  Valid
                                </span>
                              )}
                              {c.status === 'revoked' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold uppercase border border-red-100">
                                  Revoked
                                </span>
                              )}
                              {c.status === 'expired' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase border border-amber-100">
                                  Expired
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right space-x-3.5">
                              <button
                                onClick={() => onViewCertificatePage(c.id)}
                                className="text-[10px] font-bold uppercase text-[#1a73e8] hover:underline"
                              >
                                View Portal
                              </button>
                              
                              {c.status === 'valid' ? (
                                <button
                                  onClick={() => handleInitiateRevoke(c.id)}
                                  className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-700"
                                >
                                  Revoke State
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestoreCertificate(c.id)}
                                  className="text-[10px] font-bold uppercase text-emerald-600 hover:text-emerald-800"
                                >
                                  Restore Valid
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Issued Card List - Mobile */}
                  <div className="block md:hidden space-y-4">
                    {filteredCertificates.map(c => (
                      <div key={c.id} className="bg-white border border-[#E9ECEF] rounded-xl p-5 card-shadow space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-slate-900 text-xs">{c.id}</span>
                            <p className="text-[9px] text-slate-400 font-mono break-all">{c.securityHash.substring(0, 32)}...</p>
                          </div>
                          {c.status === 'valid' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase border border-emerald-100">
                              Valid
                            </span>
                          )}
                          {c.status === 'revoked' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[9px] font-bold uppercase border border-red-100">
                              Revoked
                            </span>
                          )}
                          {c.status === 'expired' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-bold uppercase border border-amber-100">
                              Expired
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-slate-405 font-bold">Recipient</p>
                            <p className="font-bold text-slate-955 capitalize">{c.recipientName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{c.recipientEmail}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-slate-405 font-bold">Course / Track</p>
                            <p className="font-semibold text-slate-800 truncate">{c.programName}</p>
                            <p className="text-[10px] text-[#9CA3AF]">Issued: {c.issueDate}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-slate-405 font-bold">Auditing Stats</p>
                            <p className="text-[10px] text-slate-600">Views: <strong className="text-slate-900">{c.viewCount}</strong> • DLs: <strong className="text-slate-900">{c.downloadCount}</strong></p>
                          </div>
                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              onClick={() => onViewCertificatePage(c.id)}
                              className="text-[10px] font-bold uppercase text-[#1a73e8] hover:underline"
                            >
                              View
                            </button>
                            
                            {c.status === 'valid' ? (
                              <button
                                onClick={() => handleInitiateRevoke(c.id)}
                                className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-700"
                              >
                                Revoke
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestoreCertificate(c.id)}
                                className="text-[10px] font-bold uppercase text-emerald-600 hover:text-emerald-800"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* TAB 6: PRIVATE BRANDING */}
              {activeTab === 'branding' && (
                <div className="space-y-8 animate-fade-in max-w-3xl">
                  
                  {/* Title Bar */}
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="font-serif text-3xl italic text-slate-950">White-Label Branding Controls</h2>
                    <p className="text-slate-500 text-sm">Control colors, domains, and footers targeting verification lookups.</p>
                  </div>

                  <div className="bg-white border border-[#E9ECEF] rounded-2xl p-8 card-shadow space-y-6">
                    <h3 className="text-sm font-bold text-slate-950 uppercase tracking-widest bg-slate-50 p-2.5 rounded">Credentials Workspace Identity</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Workspace Public Title</label>
                        <input
                          type="text"
                          value={currentWorkspace?.branding.brandName}
                          onChange={(e) => handleUpdateBrandingConfig({ brandName: capitalizeWords(e.target.value) })}
                          className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Custom Search domain (TLS proxy)</label>
                        <input
                          type="text"
                          placeholder="e.g. credentials.stellaracademy.edu"
                          value={currentWorkspace?.branding.customDomain || ''}
                          onChange={(e) => handleUpdateBrandingConfig({ customDomain: e.target.value })}
                          className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Primary Theme Hex</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={currentWorkspace?.branding.primaryColor}
                            onChange={(e) => handleUpdateBrandingConfig({ primaryColor: e.target.value })}
                            className="h-8 w-12 bg-slate-50 border p-1 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={currentWorkspace?.branding.primaryColor}
                            onChange={(e) => handleUpdateBrandingConfig({ primaryColor: e.target.value })}
                            className="w-full bg-slate-50 text-xs py-1 px-2 rounded border border-slate-200 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Accent Emblem Hex</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={currentWorkspace?.branding.accentColor}
                            onChange={(e) => handleUpdateBrandingConfig({ accentColor: e.target.value })}
                            className="h-8 w-12 bg-slate-50 border p-1 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={currentWorkspace?.branding.accentColor}
                            onChange={(e) => handleUpdateBrandingConfig({ accentColor: e.target.value })}
                            className="w-full bg-slate-50 text-xs py-1 px-2 rounded border border-slate-200 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Branded Sender Full Name</label>
                        <input
                          type="text"
                          value={currentWorkspace?.branding.senderName}
                          onChange={(e) => handleUpdateBrandingConfig({ senderName: capitalizeWords(e.target.value) })}
                          className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Branded SMTP Sender Email</label>
                        <input
                          type="email"
                          value={currentWorkspace?.branding.senderEmail}
                          onChange={(e) => handleUpdateBrandingConfig({ senderEmail: e.target.value })}
                          className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3">
                      <label className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Custom Legal Footer Text (White-label footer)</label>
                      <input
                        type="text"
                        value={currentWorkspace?.branding.footerText || ''}
                        onChange={(e) => handleUpdateBrandingConfig({ footerText: capitalizeWords(e.target.value) })}
                        className="w-full bg-slate-50 text-xs py-2 px-3 rounded border border-slate-200 focus:outline-none"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900 uppercase">Hide Glint Watermarks</p>
                        <p className="text-[10px] text-slate-400">Completely wipes any link attribution from recipient printable certificate cards.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const state = !currentWorkspace?.branding.whiteLabel;
                          handleUpdateBrandingConfig({ whiteLabel: state });
                        }}
                        className={`text-xs px-4 py-1.5 font-bold rounded-full border transition-all ${
                          currentWorkspace?.branding.whiteLabel 
                            ? 'bg-slate-950 text-white border-slate-950' 
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-[#E9ECEF]'
                        }`}
                      >
                        {currentWorkspace?.branding.whiteLabel ? 'WHITE-LABEL ACTIVE' : 'STANDARD attribution ENABLED'}
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 7: SETTINGS & SLA LIMITS */}
              {activeTab === 'settings' && (
                <div className="space-y-8 animate-fade-in max-w-3xl">
                  
                  {/* Title Bar */}
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="font-serif text-3xl italic text-slate-950 font-sans">Workspace Settings & Integration Health</h2>
                    <p className="text-slate-500 text-sm">Review API keys, webhook triggers, and resource consumption caps.</p>
                  </div>

                  <div className="bg-white border border-[#E9ECEF] rounded-2xl p-6 shadow-sm card-shadow space-y-6">
                    <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Active Verification Integrations</h3>
                    
                    <div className="space-y-4 divide-y divide-slate-100">
                      <div className="pt-2 flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900">Email Delivery Sockets (SMTP)</p>
                          <p className="text-[10px] text-slate-400">Global DNS tracking and bounce notifications.</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded uppercase border border-emerald-100 font-mono">OPERATIONAL 99.9%</span>
                      </div>

                      <div className="pt-4 flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900">Google Workspace Integrations (Form triggers)</p>
                          <p className="text-[10px] text-slate-400">Issue credentials automatically on student form submit.</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded uppercase border">READY TO BIND</span>
                      </div>

                      <div className="pt-4 flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900">LMS Webhook Endpoints</p>
                          <p className="text-[10px] text-slate-400">Trigger on-the-fly certificate rendering on assessment pass.</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded uppercase border">READY TO LISTEN</span>
                      </div>
                    </div>
                  </div>

                  {/* Legal standard security details */}
                  <div className="bg-slate-900 text-white border border-[#E9ECEF] rounded-2xl p-8 shadow-sm card-shadow space-y-4">
                    <h3 className="font-serif italic text-2xl">Compliance & Trust Framework</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Glint registers verify using cryptographically secure peer-hashes. Individual certificate actions trigger atomic audit trail logging locked to universal NTP timestamps. Perfect for highly regulated certifications, universities, and compliance auditing bodies.
                    </p>
                    <div className="pt-4 border-t border-white/10 text-slate-400 text-[10px] font-mono flex flex-wrap gap-x-8 gap-y-2">
                      <span>• REGULATION: RFC-1962 LOCK</span>
                      <span>• STANDARDS: ISO-27001 SECURE</span>
                      <span>• KEYSTORES: ED25519 COMPLIANT</span>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 8: EMAIL LOGS SIMULATOR */}
              {activeTab === 'emails' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Title Bar */}
                  <div className="border-b border-slate-200 pb-3 flex justify-between items-end">
                    <div>
                      <h2 className="font-serif text-3xl italic text-slate-950">Email Dispatch Simulator Logs</h2>
                      <p className="text-slate-500 text-sm">Verify email notification delivery events, recipient claim links, and custom SMTP body wrappers.</p>
                    </div>
                            {/* Table Card */}
                  <div className="bg-white border border-[#E9ECEF] rounded-2xl shadow-sm overflow-hidden card-shadow">
                    {emailLogs.length === 0 ? (
                      <div className="p-16 text-center text-slate-400 space-y-4">
                        <Mail className="w-12 h-12 mx-auto text-slate-300" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-800">No dispatched emails found</p>
                          <p className="text-xs">Issue a batch of certificates via the "Bulk CSV Issuance" tab to trigger automated dispatch notification templates.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Desktop View Table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs divide-y divide-slate-100">
                            <thead className="bg-slate-550/5 text-[#9CA3AF] uppercase text-[10px] tracking-wider font-semibold font-mono">
                              <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Recipient</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {emailLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-slate-400">
                                    {new Date(log.sentTime).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-900 capitalize">{log.recipientName}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{log.recipientEmail}</div>
                                  </td>
                                  <td className="px-6 py-4 font-medium max-w-xs truncate">
                                    {log.subject}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-mono font-bold uppercase border border-emerald-100">
                                      ● DISPATCHED
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                    <button
                                      onClick={() => setSelectedEmailLog(log)}
                                      className="bg-slate-105 hover:bg-slate-100 text-slate-750 text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-all"
                                    >
                                      View Email
                                    </button>
                                    <button
                                      onClick={() => onViewCertificatePage(log.certificateId)}
                                      className="bg-slate-950 hover:bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm"
                                    >
                                      Verify Credential
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile View Cards list */}
                        <div className="block md:hidden divide-y divide-slate-100">
                          {emailLogs.map((log) => (
                            <div key={log.id} className="p-5 space-y-4">
                              <div className="flex justify-between items-start">
                                <span className="font-mono text-[10px] text-slate-405">
                                  {new Date(log.sentTime).toLocaleString()}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-mono font-bold uppercase border border-emerald-100">
                                  Dispatched
                                </span>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[9px] uppercase tracking-wider text-slate-405 font-bold">Recipient</p>
                                <div className="font-semibold text-slate-900 capitalize">{log.recipientName}</div>
                                <div className="text-[10px] text-slate-405 font-mono">{log.recipientEmail}</div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[9px] uppercase tracking-wider text-slate-405 font-bold">Subject</p>
                                <div className="text-xs text-slate-700 font-medium truncate">{log.subject}</div>
                              </div>

                              <div className="flex gap-3 pt-3 border-t border-slate-100">
                                <button
                                  onClick={() => setSelectedEmailLog(log)}
                                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-705 text-[10px] py-2 rounded-lg border font-bold transition-all"
                                >
                                  View Email
                                </button>
                                <button
                                  onClick={() => onViewCertificatePage(log.certificateId)}
                                  className="flex-1 bg-slate-950 hover:bg-slate-800 text-white text-[10px] py-2 rounded-lg font-bold transition-all text-center shadow-sm"
                                >
                                  Verify
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>              </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* MODAL: Email Preview Simulator Box overlay */}
      {selectedEmailLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border text-left border-slate-205 rounded-2xl max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
            {/* Window header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                <span className="font-mono text-xs text-slate-400 ml-2">SMTP Sandbox Email Dispatch Simulator</span>
              </div>
              <button
                onClick={() => setSelectedEmailLog(null)}
                className="text-slate-400 hover:text-white text-xs uppercase tracking-widest font-bold"
              >
                Close Window
              </button>
            </div>

            {/* Email Headers container */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0 space-y-2.5 text-xs text-slate-600 font-sans">
              <div className="flex">
                <span className="w-16 font-semibold text-slate-400 uppercase tracking-wider font-mono">From:</span>
                <span className="font-semibold text-slate-800">
                  {currentWorkspace?.branding?.senderName || "Glint Dispatch"} &lt;{currentWorkspace?.branding?.senderEmail || "noreply@glint.io"}&gt;
                </span>
              </div>
              <div className="flex">
                <span className="w-16 font-semibold text-slate-400 uppercase tracking-wider font-mono">To:</span>
                <span className="font-semibold text-slate-800">
                  {selectedEmailLog.recipientName} &lt;{selectedEmailLog.recipientEmail}&gt;
                </span>
              </div>
              <div className="flex">
                <span className="w-16 font-semibold text-slate-400 uppercase tracking-wider font-mono">Subject:</span>
                <span className="font-bold text-slate-900">
                  {selectedEmailLog.subject}
                </span>
              </div>
              <div className="flex">
                <span className="w-16 font-semibold text-slate-400 uppercase tracking-wider font-mono">Date:</span>
                <span className="text-slate-500">
                  {new Date(selectedEmailLog.sentTime).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Email Body content */}
            <div className="p-8 overflow-y-auto bg-white flex-1 text-slate-800 text-sm font-sans space-y-6">
              <div className="whitespace-pre-wrap leading-relaxed max-w-xl mx-auto border border-slate-100 p-8 rounded-xl shadow-sm bg-slate-550/5">
                {/* Simulated professional email container */}
                <div className="flex items-center gap-2 pb-4 border-b border-slate-150 mb-4 justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-slate-950 rounded flex items-center justify-center text-white text-[8px] font-bold">★</div>
                    <span className="font-display font-black text-slate-950 text-xs tracking-tight uppercase">{currentWorkspace?.branding?.brandName}</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#9CA3AF] uppercase">Ledger Notification</span>
                </div>

                <p className="text-slate-800 font-semibold">Hello {selectedEmailLog.recipientName},</p>
                
                <p className="text-slate-600 leading-relaxed text-xs">
                  Congratulations! Your official credential for completing <strong className="text-slate-900">"{programs.find(p => p.id === selectedEmailLog.workspaceId)?.name || "Academic Program"}"</strong> has been successfully issued and registered on the permanent public verification ledger.
                </p>

                <div className="bg-slate-900 text-white rounded-xl p-4 my-4 font-mono text-[10px] space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[8px] tracking-widest">Secure Verification Info</p>
                  <p>• Credential ID: {selectedEmailLog.certificateId}</p>
                  <p>• Ledger Status: ACTIVE / VALID</p>
                </div>

                <div className="py-4 text-center">
                  <button
                    onClick={() => {
                      setSelectedEmailLog(null);
                      onViewCertificatePage(selectedEmailLog.certificateId);
                    }}
                    className="inline-block bg-slate-950 hover:bg-slate-850 text-white text-xs px-6 py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all tracking-wide uppercase"
                  >
                    View & Claim Digital Certificate
                  </button>
                </div>

                <p className="text-slate-500 text-[11px] leading-relaxed pt-4 border-t border-slate-150">
                  This dispatch is a secure, authenticated message sent automatically by {currentWorkspace?.branding?.brandName} Certification Registry Services.
                </p>
              </div>
            </div>

            {/* Window footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-205 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedEmailLog(null)}
                className="bg-slate-950 text-white text-xs px-4 py-2 rounded-lg font-bold"
              >
                Close Simulator Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Onboard Organization Workspace overlay */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border text-left border-slate-200 rounded-2xl max-w-md w-full p-8 shadow-2xl relative space-y-6">
            <h3 className="font-serif text-3xl italic text-slate-950 pb-3 border-b">Onboard Organization</h3>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Workspace Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Columbia University Global"
                  value={newWsName}
                  onChange={(e) => setNewWsName(capitalizeWords(e.target.value))}
                  className="w-full bg-slate-50 text-xs py-2 px-3 rounded border focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-440 tracking-wider">Branded Registry Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Columbia Credentials Authority"
                  value={newWsBrandName}
                  onChange={(e) => setNewWsBrandName(capitalizeWords(e.target.value))}
                  className="w-full bg-slate-50 text-xs py-2 px-3 rounded border focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-440 tracking-wider">Primary Color</label>
                  <input
                    type="color"
                    value={newWsColor}
                    onChange={(e) => setNewWsColor(e.target.value)}
                    className="w-full h-8 bg-slate-50 p-1 rounded border cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-440 tracking-wider">Accent Color</label>
                  <input
                    type="color"
                    value={newWsAccent}
                    onChange={(e) => setNewWsAccent(e.target.value)}
                    className="w-full h-8 bg-slate-50 p-1 rounded border cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className="bg-slate-100 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-950 text-white text-xs px-5 py-2.5 rounded-lg font-bold hover:bg-slate-800"
                >
                  Onboard Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Single Recipient Issuance Overlay */}
      {showSingleIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white border text-left border-[#E9ECEF] rounded-2xl p-6 md:p-8 card-shadow space-y-6 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Plus className="w-4 h-4 text-indigo-650" /> Issue Single Certificate
              </h3>
              <button 
                type="button"
                onClick={() => setShowSingleIssueModal(false)}
                className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueSingleCertificate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Certification Program</label>
                <select
                  value={singleProgramId}
                  onChange={(e) => {
                    setSingleProgramId(e.target.value);
                    setSingleCustomFields({});
                  }}
                  className="w-full bg-slate-50 text-xs py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-900 cursor-pointer"
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Recipient Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={singleRecipientName}
                    onChange={(e) => setSingleRecipientName(capitalizeWords(e.target.value))}
                    className="w-full bg-slate-50 text-xs py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Recipient Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex@example.com"
                    value={singleRecipientEmail}
                    onChange={(e) => setSingleRecipientEmail(e.target.value)}
                    className="w-full bg-slate-50 text-xs py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Issue Date</label>
                <input
                  type="date"
                  required
                  value={singleIssueDate}
                  onChange={(e) => setSingleIssueDate(e.target.value)}
                  className="w-full bg-slate-50 text-xs py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-900"
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
                    <h4 className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Program Custom Variables</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredFields.map(field => (
                        <div key={field} className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{field}</label>
                          <input
                            type="text"
                            required
                            placeholder={`Enter ${field}`}
                            value={singleCustomFields[field] || ''}
                            onChange={(e) => setSingleCustomFields({
                              ...singleCustomFields,
                              [field]: e.target.value
                            })}
                            className="w-full bg-slate-50 text-xs py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSingleIssueModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2.5 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-950 hover:bg-slate-800 text-white text-xs px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
