import React, { useState, useEffect, useRef } from 'react';
import { 
  Undo2, Redo2, Sliders, Plus, Trash2, Save, ArrowLeft, Sparkles, 
  Layers, Type, QrCode, Award, Check, Grid, Image, Info, User,
  MousePointerClick, AlignLeft, AlignCenter, AlignRight, Bold, HelpCircle, Eye, EyeOff, Upload
} from 'lucide-react';
import { CertificateTemplate, TextElement } from '../types';

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

interface CanvaEditorProps {
  template: CertificateTemplate;
  onSave: (updatedTemplate: CertificateTemplate) => void;
  onCancel: () => void;
  brandName?: string;
  primaryColor?: string;
  token?: string | null;
  programs?: any[];
}

// 6+ Beautiful Canva Designer Presets
const BEAUTIFUL_PRESETS = [
  {
    name: 'Google Cloud Certified Professional',
    layout: 'landscape' as const,
    backgroundColor: '#FFFFFF',
    borderColor: '#1A73E8',
    borderWidth: 4,
    borderRadius: 4,
    borderStyle: 'solid' as const,
    backgroundGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
    decorFlourish: 'minimal' as const,
    sealType: 'gold_medallion' as const,
    logoIconType: 'tech',
    logoX: 50,
    logoY: 14,
    logoWidth: 80,
    signatureUrl: '',
    signatureX: 30,
    signatureY: 78,
    signatureWidth: 100,
    signatoryName: 'Sundar Pichai',
    signatoryTitle: 'CEO, Google LLC',
    showSecondarySignatory: true,
    secondarySignatoryName: 'Thomas Kurian',
    secondarySignatoryTitle: 'CEO, Google Cloud',
    secondarySignatureX: 70,
    secondarySignatureY: 78,
    secondarySignatureWidth: 100,
    textElements: [
      { id: 't1', text: 'GOOGLE CLOUD PROFESSIONAL CERTIFICATION', fontSize: 11, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#1A73E8', xPercent: 50, yPercent: 26, align: 'center' as const },
      { id: 't2', text: 'This confirms that', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#64748B', xPercent: 50, yPercent: 34, align: 'center' as const },
      { id: 't3', text: '{{name}}', fontSize: 34, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#0F172A', xPercent: 50, yPercent: 45, align: 'center' as const, isPlaceholder: true },
      { id: 't4', text: 'has successfully demonstrated proficiency and met all requirements to be certified as', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#64748B', xPercent: 50, yPercent: 53, align: 'center' as const },
      { id: 't5', text: '{{program}}', fontSize: 20, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#1A73E8', xPercent: 50, yPercent: 61, align: 'center' as const, isPlaceholder: true },
      { id: 't6', text: 'Credential ID: {{id}}', fontSize: 8, fontFamily: 'JetBrains Mono' as const, fontWeight: 'normal' as const, color: '#94A3B8', xPercent: 12, yPercent: 88, align: 'left' as const },
      { id: 't7', text: 'Issued: {{date}}', fontSize: 8, fontFamily: 'JetBrains Mono' as const, fontWeight: 'normal' as const, color: '#94A3B8', xPercent: 88, yPercent: 88, align: 'right' as const }
    ]
  },
  {
    name: 'Microsoft Solutions Expert',
    layout: 'landscape' as const,
    backgroundColor: '#FCFCFC',
    borderColor: '#00A4EF',
    borderWidth: 5,
    borderRadius: 0,
    borderStyle: 'solid' as const,
    backgroundGradient: 'linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 100%)',
    decorFlourish: 'minimal' as const,
    sealType: 'stellar' as const,
    logoIconType: 'tech',
    logoX: 12,
    logoY: 12,
    logoWidth: 70,
    signatureUrl: '',
    signatureX: 50,
    signatureY: 78,
    signatureWidth: 100,
    signatoryName: 'Satya Nadella',
    signatoryTitle: 'CEO, Microsoft Corporation',
    showSecondarySignatory: false,
    textElements: [
      { id: 't1', text: 'MICROSOFT CERTIFICATION OF EXPERTISE', fontSize: 11, fontFamily: 'JetBrains Mono' as const, fontWeight: 'bold' as const, color: '#00A4EF', xPercent: 50, yPercent: 22, align: 'center' as const },
      { id: 't2', text: 'This is to certify that', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#4B5563', xPercent: 50, yPercent: 32, align: 'center' as const },
      { id: 't3', text: '{{name}}', fontSize: 32, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#1F2937', xPercent: 50, yPercent: 44, align: 'center' as const, isPlaceholder: true },
      { id: 't4', text: 'has met the rigorous academic and practical requirements of the specialization track', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#4B5563', xPercent: 50, yPercent: 53, align: 'center' as const },
      { id: 't5', text: '{{program}}', fontSize: 20, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#111827', xPercent: 50, yPercent: 62, align: 'center' as const, isPlaceholder: true },
      { id: 't6', text: 'Verification Hash: {{id}}', fontSize: 8, fontFamily: 'JetBrains Mono' as const, fontWeight: 'normal' as const, color: '#9CA3AF', xPercent: 50, yPercent: 89, align: 'center' as const }
    ]
  },
  {
    name: 'IBM Cognitive Solutions Specialist',
    layout: 'landscape' as const,
    backgroundColor: '#FFFFFF',
    borderColor: '#0F62FE',
    borderWidth: 3,
    borderRadius: 0,
    borderStyle: 'solid' as const,
    backgroundGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F2F4F8 100%)',
    decorFlourish: 'none' as const,
    sealType: 'classic' as const,
    logoIconType: 'corp',
    logoX: 85,
    logoY: 12,
    logoWidth: 60,
    signatureUrl: '',
    signatureX: 25,
    signatureY: 78,
    signatureWidth: 100,
    signatoryName: 'Arvind Krishna',
    signatoryTitle: 'Chairman & CEO, IBM',
    showSecondarySignatory: true,
    secondarySignatoryName: 'Dr. John Kelly III',
    secondarySignatoryTitle: 'SVP, Cognitive Solutions',
    secondarySignatureX: 75,
    secondarySignatureY: 78,
    secondarySignatureWidth: 100,
    textElements: [
      { id: 't1', text: 'IBM Cognitive Enterprise Certification', fontSize: 12, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#0F62FE', xPercent: 12, yPercent: 22, align: 'left' as const },
      { id: 't2', text: 'Awarded to', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#525252', xPercent: 12, yPercent: 34, align: 'left' as const },
      { id: 't3', text: '{{name}}', fontSize: 34, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#161616', xPercent: 12, yPercent: 45, align: 'left' as const, isPlaceholder: true },
      { id: 't4', text: 'for high-performing mastery in the enterprise technology curriculum of', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#525252', xPercent: 12, yPercent: 55, align: 'left' as const },
      { id: 't5', text: '{{program}}', fontSize: 18, fontFamily: 'JetBrains Mono' as const, fontWeight: 'bold' as const, color: '#0F62FE', xPercent: 12, yPercent: 63, align: 'left' as const, isPlaceholder: true },
      { id: 't6', text: 'SYSTEM AUDIT ID: {{id}}', fontSize: 8, fontFamily: 'JetBrains Mono' as const, fontWeight: 'normal' as const, color: '#8D8D8D', xPercent: 12, yPercent: 89, align: 'left' as const }
    ]
  },
  {
    name: 'Harvard Business Leadership Executive',
    layout: 'landscape' as const,
    backgroundColor: '#FAF8F5',
    borderColor: '#A51C30',
    borderWidth: 12,
    borderRadius: 0,
    borderStyle: 'double' as const,
    backgroundGradient: 'linear-gradient(180deg, #FAF8F5 0%, #F5EFEB 100%)',
    decorFlourish: 'ornate' as const,
    sealType: 'crimson_wax' as const,
    logoIconType: 'edu',
    logoX: 50,
    logoY: 14,
    logoWidth: 75,
    signatureUrl: '',
    signatureX: 30,
    signatureY: 78,
    signatureWidth: 100,
    signatoryName: 'Prof. Lawrence S. Bacow',
    signatoryTitle: 'President of the University',
    showSecondarySignatory: true,
    secondarySignatoryName: 'Dean Srikant Datar',
    secondarySignatoryTitle: 'Dean of the Business Faculty',
    secondarySignatureX: 70,
    secondarySignatureY: 78,
    secondarySignatureWidth: 100,
    textElements: [
      { id: 't1', text: 'HARVARD BUSINESS SCHOOL', fontSize: 14, fontFamily: 'Playfair Display' as const, fontWeight: 'bold' as const, color: '#A51C30', xPercent: 50, yPercent: 26, align: 'center' as const },
      { id: 't2', text: 'Executive Education', fontSize: 11, fontFamily: 'Playfair Display' as const, fontWeight: 'normal' as const, color: '#1E293B', xPercent: 50, yPercent: 31, align: 'center' as const },
      { id: 't3', text: 'This is to certify that', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#64748B', xPercent: 50, yPercent: 37, align: 'center' as const },
      { id: 't4', text: '{{name}}', fontSize: 34, fontFamily: 'Playfair Display' as const, fontWeight: 'bold' as const, color: '#1E293B', xPercent: 50, yPercent: 47, align: 'center' as const, isPlaceholder: true },
      { id: 't5', text: 'has successfully completed the program of studies in', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#64748B', xPercent: 50, yPercent: 56, align: 'center' as const },
      { id: 't6', text: '{{program}}', fontSize: 18, fontFamily: 'Playfair Display' as const, fontWeight: 'bold' as const, color: '#A51C30', xPercent: 50, yPercent: 64, align: 'center' as const, isPlaceholder: true },
      { id: 't7', text: 'VERITAS ID: {{id}}', fontSize: 8, fontFamily: 'JetBrains Mono' as const, fontWeight: 'normal' as const, color: '#94A3B8', xPercent: 12, yPercent: 89, align: 'left' as const }
    ]
  },
  {
    name: 'McKinsey Strategy Fellowship',
    layout: 'landscape' as const,
    backgroundColor: '#06122C',
    borderColor: '#C5A880',
    borderWidth: 6,
    borderRadius: 2,
    borderStyle: 'solid' as const,
    backgroundGradient: 'radial-gradient(circle, #0D2046 0%, #030815 100%)',
    decorFlourish: 'minimal' as const,
    sealType: 'emerald_shield' as const,
    logoIconType: 'corp',
    logoX: 50,
    logoY: 14,
    logoWidth: 70,
    signatureUrl: '',
    signatureX: 50,
    signatureY: 80,
    signatureWidth: 100,
    signatoryName: 'Bob Sternfels',
    signatoryTitle: 'Global Managing Partner',
    showSecondarySignatory: false,
    textElements: [
      { id: 't1', text: 'MCKINSEY & COMPANY GLOBAL FELLOWSHIP', fontSize: 11, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#C5A880', xPercent: 50, yPercent: 24, align: 'center' as const },
      { id: 't2', text: 'In recognition of excellent strategy formulation, awarded to', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#94A3B8', xPercent: 50, yPercent: 34, align: 'center' as const },
      { id: 't3', text: '{{name}}', fontSize: 34, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#FFFFFF', xPercent: 50, yPercent: 46, align: 'center' as const, isPlaceholder: true },
      { id: 't4', text: 'upon successful completion of the global leadership training module in', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#94A3B8', xPercent: 50, yPercent: 56, align: 'center' as const },
      { id: 't5', text: '{{program}}', fontSize: 18, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#C5A880', xPercent: 50, yPercent: 64, align: 'center' as const, isPlaceholder: true },
      { id: 't6', text: 'Fellowship Registry Code: {{id}}', fontSize: 8, fontFamily: 'JetBrains Mono' as const, fontWeight: 'normal' as const, color: '#475569', xPercent: 50, yPercent: 90, align: 'center' as const }
    ]
  },
  {
    name: 'Scrum Alliance Certified Product Owner',
    layout: 'landscape' as const,
    backgroundColor: '#FFFFFF',
    borderColor: '#0F766E',
    borderWidth: 12,
    borderRadius: 6,
    borderStyle: 'solid' as const,
    backgroundGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 100%)',
    decorFlourish: 'minimal' as const,
    sealType: 'gold_medallion' as const,
    logoIconType: 'corp',
    logoX: 50,
    logoY: 14,
    logoWidth: 70,
    signatureUrl: '',
    signatureX: 30,
    signatureY: 78,
    signatureWidth: 100,
    signatoryName: 'Howard Sublett',
    signatoryTitle: 'Chief Product Owner, Scrum Alliance',
    showSecondarySignatory: true,
    secondarySignatoryName: 'Melissa Boggs',
    secondarySignatoryTitle: 'Chief Agile Officer',
    secondarySignatureX: 70,
    secondarySignatureY: 78,
    secondarySignatureWidth: 100,
    textElements: [
      { id: 't1', text: 'CERTIFIED PRODUCT OWNER', fontSize: 22, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#0F766E', xPercent: 50, yPercent: 26, align: 'center' as const },
      { id: 't2', text: 'Scrum Alliance certifies that', fontSize: 11, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#475569', xPercent: 50, yPercent: 35, align: 'center' as const },
      { id: 't3', text: '{{name}}', fontSize: 34, fontFamily: 'Playfair Display' as const, fontWeight: 'bold' as const, color: '#0F172A', xPercent: 50, yPercent: 47, align: 'center' as const, isPlaceholder: true },
      { id: 't4', text: 'has successfully met all validation criteria and is registered as a certified', fontSize: 10, fontFamily: 'Inter' as const, fontWeight: 'normal' as const, color: '#475569', xPercent: 50, yPercent: 57, align: 'center' as const },
      { id: 't5', text: '{{program}}', fontSize: 18, fontFamily: 'Space Grotesk' as const, fontWeight: 'bold' as const, color: '#0F766E', xPercent: 50, yPercent: 65, align: 'center' as const, isPlaceholder: true },
      { id: 't6', text: 'Certification Seal ID: {{id}}', fontSize: 8, fontFamily: 'JetBrains Mono' as const, fontWeight: 'normal' as const, color: '#94A3B8', xPercent: 12, yPercent: 89, align: 'left' as const }
    ]
  }
];

// Beautiful Predefined Background Gradients list
const GRADIENT_OPTIONS = [
  { name: 'Pure White Space', value: '#FFFFFF', isGradient: false },
  { name: 'Warm Parchment', value: '#FAF8F5', isGradient: false },
  { name: 'Obsidian Slate', value: '#0A0F1D', isGradient: false },
  { name: 'Light Ivory Pearl', value: 'linear-gradient(135deg, #FAF8F5 0%, #EAE0D5 100%)', isGradient: true },
  { name: 'Deep Cosmic Marine', value: 'linear-gradient(135deg, #091E3A 0%, #2F80ED 50%, #2D9EE0 100%)', isGradient: true },
  { name: 'Royal Amethyst Pearl', value: 'radial-gradient(circle, #2E1065 0%, #0F051D 100%)', isGradient: true },
  { name: 'Emerald Forest Gold', value: 'radial-gradient(circle, #064E3B 0%, #022C22 100%)', isGradient: true },
  { name: 'Vibrant Warm Sunset', value: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 30%, #FDE68A 100%)', isGradient: true },
  { name: 'Minimal Cool Grid', value: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', isGradient: true },
  { name: 'Rosewood Petals', value: 'linear-gradient(135deg, #FAF5F5 0%, #FEE2E2 50%, #FCE7F3 100%)', isGradient: true },
];

export function CanvaEditor({ template, onSave, onCancel, brandName = 'Workspace', primaryColor = '#0F172A', token, programs = [] }: CanvaEditorProps) {
  // Current active template editing state
  const [currentTemplate, setCurrentTemplate] = useState<CertificateTemplate>(JSON.parse(JSON.stringify(template)));
  
  // High quality History Stack for Undo/Redo (Think Advance)
  const [history, setHistory] = useState<CertificateTemplate[]>([JSON.parse(JSON.stringify(template))]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  // Active Sidebar Nav Tab inside Canva Editor
  const [activeSideTab, setActiveSideTab] = useState<'templates' | 'text' | 'borders' | 'backdrop' | 'seals' | 'sign' | 'layers' | 'ai' | 'uploads'>('templates');
  
  // Currently highlighted / selected element ID on visual canvas
  const [selectedElId, setSelectedElId] = useState<string | null>(null);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSampleImage, setAiSampleImage] = useState<{ data: string; mimeType: string } | null>(null);

  // Selected program for field insertion helpers
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  
  // Custom uploaded assets library
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);

  // Interactive Canva Workspace helper tip state (one-time dismissible popup)
  const [showCanvaTip, setShowCanvaTip] = useState<boolean>(() => {
    return !localStorage.getItem('glint_canva_tip_dismissed');
  });

  useEffect(() => {
    if (showCanvaTip) {
      const timer = setTimeout(() => {
        setShowCanvaTip(false);
        localStorage.setItem('glint_canva_tip_dismissed', 'true');
      }, 10000); // Auto-dismiss after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [showCanvaTip]);
  
  const getPlaceholderTags = () => {
    const baseTags = ['name', 'program', 'date', 'id'];
    if (!selectedProgramId || !programs) return baseTags;
    const selectedProg = programs.find(p => p.id === selectedProgramId);
    if (!selectedProg || !selectedProg.recipientFields) return baseTags;
    return [...baseTags, ...selectedProg.recipientFields];
  };

  const addUploadedImageToCanvas = (imageUrl: string) => {
    const id = `t-img-${Math.random().toString(36).substring(2, 7)}`;
    const newElement: TextElement = {
      id,
      type: 'image',
      imageUrl,
      text: '',
      xPercent: 50,
      yPercent: 50,
      width: 120,
      fontSize: 12, // default for framework resizing safety
      fontWeight: 'normal',
      fontFamily: 'Inter',
      color: '#000000',
      align: 'center'
    };
    
    const updated = {
      ...currentTemplate,
      textElements: [...currentTemplate.textElements, newElement]
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
    setSelectedElId(id);
  };

  const handleCustomImageElementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setUploadedAssets(prev => [base64Data, ...prev]);
        addUploadedImageToCanvas(base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop state manager
  const [draggedItem, setDraggedItem] = useState<{
    id: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Undo / Redo stack tracker pushes
  const pushToHistory = (newTemplateState: CertificateTemplate) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    setHistory([...updatedHistory, JSON.parse(JSON.stringify(newTemplateState))]);
    setHistoryIndex(updatedHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentTemplate(JSON.parse(JSON.stringify(history[prevIndex])));
      // Reset selected element just in case
      setSelectedElId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentTemplate(JSON.parse(JSON.stringify(history[nextIndex])));
      setSelectedElId(null);
    }
  };

  // Resizing state manager
  const [resizingItem, setResizingItem] = useState<{
    id: string;
    handle: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    startX: number;
    startY: number;
    startWidth: number;
    startFontSize?: number;
  } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetId: string | null;
  } | null>(null);

  // Close context menu on click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetId: id
    });
    if (id) {
      setSelectedElId(id);
    }
  };

  const getCanvasRelativeCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { xPercent: 50, yPercent: 50 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      xPercent: Math.round(Math.min(100, Math.max(0, x))),
      yPercent: Math.round(Math.min(100, Math.max(0, y)))
    };
  };

  const insertTextAtCoords = (type: 'heading' | 'subheading' | 'body', xPercent: number, yPercent: number) => {
    const id = `t-custom-${Math.random().toString(36).substring(2, 7)}`;
    let text = 'New Custom Text Layer';
    let fontSize = 14;
    let fontWeight: 'normal' | 'medium' | 'bold' = 'medium';
    let fontFamily: TextElement['fontFamily'] = 'Inter';
    let color = '#0F172A';
    
    if (type === 'heading') {
      text = 'DOUBLE CLICK TO EDIT HEADING';
      fontSize = 24;
      fontWeight = 'bold';
      fontFamily = 'Space Grotesk';
    } else if (type === 'subheading') {
      text = 'Custom subtitle template text';
      fontSize = 14;
      fontWeight = 'medium';
    }

    const newElement: TextElement = {
      id,
      text,
      fontSize,
      fontFamily,
      fontWeight,
      color,
      xPercent,
      yPercent,
      align: 'center'
    };

    updateTemplateProperties({
      textElements: [...currentTemplate.textElements, newElement]
    });
    setSelectedElId(id);
  };

  const bringToFront = (id: string) => {
    const el = currentTemplate.textElements.find(item => item.id === id);
    if (!el) return;
    const remains = currentTemplate.textElements.filter(item => item.id !== id);
    updateTemplateProperty('textElements', [...remains, el]);
  };

  const sendToBack = (id: string) => {
    const el = currentTemplate.textElements.find(item => item.id === id);
    if (!el) return;
    const remains = currentTemplate.textElements.filter(item => item.id !== id);
    updateTemplateProperty('textElements', [el, ...remains]);
  };

  const duplicateElement = (id: string) => {
    const el = currentTemplate.textElements.find(item => item.id === id);
    if (!el) return;
    const newId = `t-custom-${Math.random().toString(36).substring(2, 7)}`;
    const duplicated: TextElement = {
      ...el,
      id: newId,
      xPercent: Math.min(95, el.xPercent + 5),
      yPercent: Math.min(95, el.yPercent + 5)
    };
    updateTemplateProperties({
      textElements: [...currentTemplate.textElements, duplicated]
    });
    setSelectedElId(newId);
  };

  const alignCenterHorizontally = (id: string) => {
    if (id === 'logo') {
      updateTemplateProperty('logoX', 50);
    } else if (id === 'signature') {
      updateTemplateProperty('signatureX', 50);
    } else if (id === 'secondarySignature') {
      updateTemplateProperty('secondarySignatureX', 50);
    } else if (id === 'seal') {
      updateTemplateProperty('qrCodeX', 50);
    } else {
      const updated = currentTemplate.textElements.map(el => {
        if (el.id === id) return { ...el, xPercent: 50 };
        return el;
      });
      updateTemplateProperty('textElements', updated);
    }
  };

  const alignCenterVertically = (id: string) => {
    if (id === 'logo') {
      updateTemplateProperty('logoY', 50);
    } else if (id === 'signature') {
      updateTemplateProperty('signatureY', 50);
    } else if (id === 'secondarySignature') {
      updateTemplateProperty('secondarySignatureY', 50);
    } else if (id === 'seal') {
      updateTemplateProperty('qrCodeY', 50);
    } else {
      const updated = currentTemplate.textElements.map(el => {
        if (el.id === id) return { ...el, yPercent: 50 };
        return el;
      });
      updateTemplateProperty('textElements', updated);
    }
  };

  // Generic multiple properties batch update helper
  const updateTemplateProperties = (properties: Partial<CertificateTemplate>) => {
    const updated = {
      ...currentTemplate,
      ...properties
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  // Generic direct property updates
  const updateTemplateProperty = (property: keyof CertificateTemplate, value: any) => {
    updateTemplateProperties({ [property]: value });
  };

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    id: string,
    handle: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    currentWidth: number,
    currentFontSize?: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizingItem({
      id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startFontSize: currentFontSize
    });
  };

  const resizingItemRef = useRef(resizingItem);
  useEffect(() => {
    resizingItemRef.current = resizingItem;
  }, [resizingItem]);

  const currentResizeWidthRef = useRef<number | null>(null);
  const currentResizeFontSizeRef = useRef<number | null>(null);

  // Document level mouse listeners to ensure smooth resizing
  useEffect(() => {
    if (!resizingItem) return;

    let rafId: number;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const currentResize = resizingItemRef.current;
      if (!currentResize) return;

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const deltaX = e.clientX - currentResize.startX;
        const deltaY = e.clientY - currentResize.startY;
        
        let newWidth = currentResize.startWidth;
        let newFontSize = currentResize.startFontSize;

        if (currentResize.id.startsWith('t-')) {
          if (currentResize.handle === 'right') {
            newWidth = currentResize.startWidth + deltaX * 2;
          } else if (currentResize.handle === 'left') {
            newWidth = currentResize.startWidth - deltaX * 2;
          } else if (currentResize.handle === 'top-right') {
            newWidth = currentResize.startWidth + deltaX * 2;
            if (currentResize.startFontSize) newFontSize = currentResize.startFontSize - deltaY * 0.5;
          } else if (currentResize.handle === 'top-left') {
            newWidth = currentResize.startWidth - deltaX * 2;
            if (currentResize.startFontSize) newFontSize = currentResize.startFontSize - deltaY * 0.5;
          } else if (currentResize.handle === 'bottom-right') {
            newWidth = currentResize.startWidth + deltaX * 2;
            if (currentResize.startFontSize) newFontSize = currentResize.startFontSize + deltaY * 0.5;
          } else if (currentResize.handle === 'bottom-left') {
            newWidth = currentResize.startWidth - deltaX * 2;
            if (currentResize.startFontSize) newFontSize = currentResize.startFontSize + deltaY * 0.5;
          } else if (currentResize.handle === 'top') {
            if (currentResize.startFontSize) newFontSize = currentResize.startFontSize - deltaY * 0.5;
          } else if (currentResize.handle === 'bottom') {
            if (currentResize.startFontSize) newFontSize = currentResize.startFontSize + deltaY * 0.5;
          }
          
          if (newFontSize !== undefined) {
            newFontSize = Math.min(120, Math.max(8, newFontSize));
            currentResizeFontSizeRef.current = newFontSize;
            
            const elementDom = document.getElementById(`canvas-item-${currentResize.id}`);
            if (elementDom) {
              elementDom.style.fontSize = `${newFontSize * 0.72}px`;
            }
          }
          
          newWidth = Math.min(1000, Math.max(30, newWidth));
          currentResizeWidthRef.current = newWidth;
          
          const elementDom = document.getElementById(`canvas-item-${currentResize.id}`);
          if (elementDom && currentResize.handle !== 'top' && currentResize.handle !== 'bottom') {
            elementDom.style.maxWidth = `${newWidth}px`;
          }
        } else {
          if (currentResize.handle === 'right' || currentResize.handle === 'top-right' || currentResize.handle === 'bottom-right') {
            newWidth = currentResize.startWidth + deltaX * 2;
          } else if (currentResize.handle === 'left' || currentResize.handle === 'top-left' || currentResize.handle === 'bottom-left') {
            newWidth = currentResize.startWidth - deltaX * 2;
          } else if (currentResize.handle === 'bottom') {
            newWidth = currentResize.startWidth + deltaY * 2;
          } else if (currentResize.handle === 'top') {
            newWidth = currentResize.startWidth - deltaY * 2;
          }

          newWidth = Math.min(1000, Math.max(30, newWidth));
          currentResizeWidthRef.current = newWidth;

          const elementDom = document.getElementById(`canvas-item-${currentResize.id}`);
          if (elementDom) {
            elementDom.style.width = `${newWidth}px`;
            const imgDom = elementDom.querySelector('img');
            if (imgDom) {
              imgDom.style.width = `${newWidth}px`;
            }
          }
        }
      });
    };

    const handleGlobalMouseUp = () => {
      const currentResize = resizingItemRef.current;
      const finalWidth = currentResizeWidthRef.current;
      const finalFontSize = currentResizeFontSizeRef.current;

      if (currentResize) {
        setCurrentTemplate(prev => {
          const updated = { ...prev };
          
          if (currentResize.id === 'logo') {
            if (finalWidth !== null) updated.logoWidth = finalWidth;
          } else if (currentResize.id === 'signature') {
            if (finalWidth !== null) updated.signatureWidth = finalWidth;
          } else if (currentResize.id === 'secondarySignature') {
            if (finalWidth !== null) updated.secondarySignatureWidth = finalWidth;
          } else {
            updated.textElements = prev.textElements.map(el => {
              if (el.id === currentResize.id) {
                const updatedEl = { ...el };
                if (finalWidth !== null) updatedEl.width = finalWidth;
                if (finalFontSize !== null) updatedEl.fontSize = finalFontSize;
                return updatedEl;
              }
              return el;
            });
          }
          
          pushToHistory(updated);
          return updated;
        });
      }
      
      currentResizeWidthRef.current = null;
      currentResizeFontSizeRef.current = null;
      setResizingItem(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [resizingItem !== null]);

  // Helper to remove signature background (off-white to pure white pixels)
  // and make them transparent on client-side using Canvas.
  const removeSignatureBackground = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const brightness = (r + g + b) / 3;
            // Threshold of 210 for background stripping
            if (brightness > 210) {
              data[i + 3] = 0; // Transparent
            } else {
              // Increase contrast/darken ink slightly
              data[i] = Math.max(0, r - 30);
              data[i + 1] = Math.max(0, g - 30);
              data[i + 2] = Math.max(0, b - 30);
            }
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          console.error("Canvas pixel read failed: ", err);
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
    });
  };

  // Image Upload handler for Custom Assets (Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'secondarySignature' | 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      alert("Image is too large. Please select an image smaller than 3.5MB for fast database encoding.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (type === 'logo') {
        const updated = {
          ...currentTemplate,
          logoUrl: base64Data,
          logoIconType: 'none' // Clear vector logo when custom image is uploaded
        };
        setCurrentTemplate(updated);
        pushToHistory(updated);
      } else if (type === 'signature') {
        removeSignatureBackground(base64Data).then(cleanedBase64 => {
          const updated = {
            ...currentTemplate,
            signatureUrl: cleanedBase64
          };
          setCurrentTemplate(updated);
          pushToHistory(updated);
        });
      } else if (type === 'secondarySignature') {
        removeSignatureBackground(base64Data).then(cleanedBase64 => {
          const updated = {
            ...currentTemplate,
            secondarySignatureUrl: cleanedBase64
          };
          setCurrentTemplate(updated);
          pushToHistory(updated);
        });
      } else if (type === 'backgroundImage') {
        const updated = {
          ...currentTemplate,
          backgroundImageUrl: base64Data
        };
        setCurrentTemplate(updated);
        pushToHistory(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  // Text element specific updates
  const updateTextElementProperty = (id: string, property: keyof TextElement, value: any) => {
    const updatedElements = currentTemplate.textElements.map(el => {
      if (el.id === id) {
        return { ...el, [property]: value };
      }
      return el;
    });
    const updated = {
      ...currentTemplate,
      textElements: updatedElements
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  // Custom visual template preset applicator
  const applyPresetDesign = (presetIndex: number) => {
    const preset = BEAUTIFUL_PRESETS[presetIndex];
    if (!preset) return;
    const updated: CertificateTemplate = {
      ...currentTemplate,
      backgroundColor: preset.backgroundColor,
      borderColor: preset.borderColor,
      borderWidth: preset.borderWidth,
      borderRadius: preset.borderRadius,
      borderStyle: preset.borderStyle,
      backgroundGradient: preset.backgroundGradient,
      decorFlourish: preset.decorFlourish,
      sealType: preset.sealType,
      logoIconType: preset.logoIconType,
      logoX: preset.logoX,
      logoY: preset.logoY,
      logoWidth: preset.logoWidth,
      signatureX: preset.signatureX,
      signatureY: preset.signatureY,
      signatureWidth: preset.signatureWidth,
      signatoryName: preset.signatoryName,
      signatoryTitle: preset.signatoryTitle,
      showSecondarySignatory: preset.showSecondarySignatory,
      secondarySignatoryName: preset.secondarySignatoryName,
      secondarySignatoryTitle: preset.secondarySignatoryTitle,
      secondarySignatureX: preset.secondarySignatureX || 70,
      secondarySignatureY: preset.secondarySignatureY || 78,
      secondarySignatureWidth: preset.secondarySignatureWidth || 100,
      textElements: JSON.parse(JSON.stringify(preset.textElements))
    };
    
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  const handleSampleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      const data = result.substring(commaIdx + 1);
      const mimeType = file.type || 'image/png';
      setAiSampleImage({ data, mimeType });
    };
    reader.readAsDataURL(file);
  };

  const generateTemplateWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          sampleImage: aiSampleImage
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error generating design');
      }
      const data = await res.json();
      applyAiGeneratedDesign(data);
      setAiPrompt('');
      setAiSampleImage(null);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Error communicating with AI service');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const applyAiGeneratedDesign = (design: any) => {
    const updated: CertificateTemplate = {
      ...currentTemplate,
      backgroundColor: design.backgroundColor,
      borderColor: design.borderColor,
      borderWidth: design.borderWidth,
      backgroundImageUrl: design.backgroundImageUrl,
      textElements: design.textElements,
      // Logo settings
      ...(design.logoX !== undefined ? { logoX: design.logoX } : {}),
      ...(design.logoY !== undefined ? { logoY: design.logoY } : {}),
      ...(design.logoWidth !== undefined ? { logoWidth: design.logoWidth } : {}),
      // Signature settings
      ...(design.signatureX !== undefined ? { signatureX: design.signatureX } : {}),
      ...(design.signatureY !== undefined ? { signatureY: design.signatureY } : {}),
      ...(design.signatureWidth !== undefined ? { signatureWidth: design.signatureWidth } : {}),
      ...(design.signatoryName !== undefined ? { signatoryName: design.signatoryName } : {}),
      ...(design.signatoryTitle !== undefined ? { signatoryTitle: design.signatoryTitle } : {}),
      // Secondary signatory settings
      ...(design.showSecondarySignatory !== undefined ? { showSecondarySignatory: design.showSecondarySignatory } : {}),
      ...(design.secondarySignatureX !== undefined ? { secondarySignatureX: design.secondarySignatureX } : {}),
      ...(design.secondarySignatureY !== undefined ? { secondarySignatureY: design.secondarySignatureY } : {}),
      ...(design.secondarySignatureWidth !== undefined ? { secondarySignatureWidth: design.secondarySignatureWidth } : {}),
      ...(design.secondarySignatoryName !== undefined ? { secondarySignatoryName: design.secondarySignatoryName } : {}),
      ...(design.secondarySignatoryTitle !== undefined ? { secondarySignatoryTitle: design.secondarySignatoryTitle } : {}),
      // QR Code and Seal settings
      ...(design.showQrCode !== undefined ? { showQrCode: design.showQrCode } : {}),
      ...(design.qrCodeX !== undefined ? { qrCodeX: design.qrCodeX } : {}),
      ...(design.qrCodeY !== undefined ? { qrCodeY: design.qrCodeY } : {}),
      ...(design.qrCodeWidth !== undefined ? { qrCodeWidth: design.qrCodeWidth } : {}),
      ...(design.showSeal !== undefined ? { showSeal: design.showSeal } : {}),
      ...(design.sealType !== undefined ? { sealType: design.sealType } : {}),
      ...(design.sealWidth !== undefined ? { sealWidth: design.sealWidth } : {})
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  const nudgeSelectedElement = (direction: 'up' | 'down' | 'left' | 'right', shiftKey: boolean) => {
    if (!selectedElId) return;
    const amount = shiftKey ? 5 : 1;
    
    // Check if it's a text element
    const isTextEl = currentTemplate.textElements.some(el => el.id === selectedElId);
    
    if (isTextEl) {
      const updatedElements = currentTemplate.textElements.map(el => {
        if (el.id === selectedElId) {
          let newX = el.xPercent;
          let newY = el.yPercent;
          if (direction === 'left') newX = Math.max(0, el.xPercent - amount);
          else if (direction === 'right') newX = Math.min(100, el.xPercent + amount);
          else if (direction === 'up') newY = Math.max(0, el.yPercent - amount);
          else if (direction === 'down') newY = Math.min(100, el.yPercent + amount);
          return { ...el, xPercent: newX, yPercent: newY };
        }
        return el;
      });
      const updated = { ...currentTemplate, textElements: updatedElements };
      setCurrentTemplate(updated);
      pushToHistory(updated);
    } else {
      // Non-text elements: logo, signature, secondarySignature, seal
      const updated = { ...currentTemplate };
      if (selectedElId === 'logo') {
        if (direction === 'left') updated.logoX = Math.max(0, updated.logoX - amount);
        else if (direction === 'right') updated.logoX = Math.min(100, updated.logoX + amount);
        else if (direction === 'up') updated.logoY = Math.max(0, updated.logoY - amount);
        else if (direction === 'down') updated.logoY = Math.min(100, updated.logoY + amount);
      } else if (selectedElId === 'signature') {
        if (direction === 'left') updated.signatureX = Math.max(0, updated.signatureX - amount);
        else if (direction === 'right') updated.signatureX = Math.min(100, updated.signatureX + amount);
        else if (direction === 'up') updated.signatureY = Math.max(0, updated.signatureY - amount);
        else if (direction === 'down') updated.signatureY = Math.min(100, updated.signatureY + amount);
      } else if (selectedElId === 'secondarySignature') {
        const currentX = updated.secondarySignatureX ?? 70;
        const currentY = updated.secondarySignatureY ?? 78;
        if (direction === 'left') updated.secondarySignatureX = Math.max(0, currentX - amount);
        else if (direction === 'right') updated.secondarySignatureX = Math.min(100, currentX + amount);
        else if (direction === 'up') updated.secondarySignatureY = Math.max(0, currentY - amount);
        else if (direction === 'down') updated.secondarySignatureY = Math.min(100, currentY + amount);
      } else if (selectedElId === 'seal') {
        if (direction === 'left') updated.qrCodeX = Math.max(0, updated.qrCodeX - amount);
        else if (direction === 'right') updated.qrCodeX = Math.min(100, updated.qrCodeX + amount);
        else if (direction === 'up') updated.qrCodeY = Math.max(0, updated.qrCodeY - amount);
        else if (direction === 'down') updated.qrCodeY = Math.min(100, updated.qrCodeY + amount);
      } else {
        return;
      }
      setCurrentTemplate(updated);
      pushToHistory(updated);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in input, textarea, select or contenteditable
      const activeEl = document.activeElement;
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.hasAttribute('contenteditable') ||
          (activeEl as HTMLElement).isContentEditable
        )
      ) {
        return;
      }

      // Ctrl+Z or Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Cmd+Y: Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+D or Cmd+D: Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedElId && selectedElId.startsWith('t-')) {
          e.preventDefault();
          duplicateElement(selectedElId);
        }
        return;
      }

      // Backspace or Delete: Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElId) {
          e.preventDefault();
          deleteSelectedElement(selectedElId);
        }
        return;
      }

      // Arrow Keys nudging
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElId) {
          e.preventDefault();
          const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
          };
          nudgeSelectedElement(dirMap[e.key], e.shiftKey);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElId, currentTemplate, history, historyIndex]);

  // Drag operations math
  const handleMouseDown = (e: React.MouseEvent, id: string, startXPercent: number, startYPercent: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElId(id);
    
    setDraggedItem({
      id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: startXPercent,
      startTop: startYPercent
    });
  };

  const draggedItemRef = useRef(draggedItem);
  useEffect(() => {
    draggedItemRef.current = draggedItem;
  }, [draggedItem]);

  const currentCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Document level mouse listeners to ensure smooth drags outside canvas bounds
  useEffect(() => {
    if (!draggedItem) return;

    let rafId: number;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const currentDrag = draggedItemRef.current;
      if (!currentDrag || !canvasRef.current) return;

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = canvasRef.current!.getBoundingClientRect();
        
        const deltaX = e.clientX - currentDrag.startX;
        const deltaY = e.clientY - currentDrag.startY;
        
        const percentDeltaX = (deltaX / rect.width) * 100;
        const percentDeltaY = (deltaY / rect.height) * 100;
        
        let newX = Math.round(currentDrag.startLeft + percentDeltaX);
        let newY = Math.round(currentDrag.startTop + percentDeltaY);
        
        // Keep boundaries safe
        newX = Math.min(100, Math.max(0, newX));
        newY = Math.min(100, Math.max(0, newY));

        currentCoordsRef.current = { x: newX, y: newY };

        // Update DOM element position directly for buttery-smooth dragging
        const elementDom = document.getElementById(`canvas-item-${currentDrag.id}`);
        if (elementDom) {
          elementDom.style.left = `${newX}%`;
          elementDom.style.top = `${newY}%`;
        }

        // Update guidelines directly
        const guidelineV = document.getElementById('guideline-v');
        const guidelineH = document.getElementById('guideline-h');
        if (guidelineV) guidelineV.style.left = `${newX}%`;
        if (guidelineH) guidelineH.style.top = `${newY}%`;
      });
    };

    const handleGlobalMouseUp = () => {
      const currentDrag = draggedItemRef.current;
      const finalCoords = currentCoordsRef.current;

      if (currentDrag && finalCoords) {
        setCurrentTemplate(prev => {
          const updated = { ...prev };
          const { x: newX, y: newY } = finalCoords;

          if (currentDrag.id === 'logo') {
            updated.logoX = newX;
            updated.logoY = newY;
          } else if (currentDrag.id === 'signature') {
            updated.signatureX = newX;
            updated.signatureY = newY;
          } else if (currentDrag.id === 'secondarySignature') {
            updated.secondarySignatureX = newX;
            updated.secondarySignatureY = newY;
          } else if (currentDrag.id === 'seal') {
            updated.qrCodeX = newX;
            updated.qrCodeY = newY;
          } else {
            updated.textElements = prev.textElements.map(el => {
              if (el.id === currentDrag.id) {
                return { ...el, xPercent: newX, yPercent: newY };
              }
              return el;
            });
          }
          pushToHistory(updated);
          return updated;
        });
      }
      currentCoordsRef.current = null;
      setDraggedItem(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedItem !== null]);

  // Insert custom placeholder tags into chosen text block
  const insertPlaceholderTag = (tag: string) => {
    if (!selectedElId) return;
    const activeTextEl = currentTemplate.textElements.find(el => el.id === selectedElId);
    if (!activeTextEl) return;
    
    const insertion = `{{${tag}}}`;
    const newTextValue = activeTextEl.text + ' ' + insertion;
    updateTextElementProperty(selectedElId, 'text', newTextValue);
  };

  // Add a brand new Canva text layer
  const addNewTextLayer = (type: 'heading' | 'subheading' | 'body' | 'meta') => {
    const id = `t-custom-${Math.random().toString(36).substring(2, 7)}`;
    let text = 'New Custom Text Layer';
    let fontSize = 14;
    let fontWeight: 'normal' | 'medium' | 'bold' = 'medium';
    let fontFamily: TextElement['fontFamily'] = 'Inter';
    let color = '#0F172A';
    
    if (type === 'heading') {
      text = 'DOUBLE CLICK TO EDIT HEADING';
      fontSize = 24;
      fontWeight = 'bold';
      fontFamily = 'Space Grotesk';
    } else if (type === 'subheading') {
      text = 'Custom subtitle template text';
      fontSize = 14;
      fontWeight = 'medium';
    } else if (type === 'meta') {
      text = 'VERIFICATION NO: {{id}}';
      fontSize = 9;
      fontFamily = 'JetBrains Mono';
    }

    const newElement: TextElement = {
      id,
      text,
      fontSize,
      fontFamily,
      fontWeight,
      color,
      xPercent: 50,
      yPercent: 50,
      align: 'center'
    };

    const updated = {
      ...currentTemplate,
      textElements: [...currentTemplate.textElements, newElement]
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
    setSelectedElId(id);
  };

  const deleteSelectedElement = (id?: string) => {
    const targetId = id || selectedElId;
    if (!targetId) return;
    
    // Check if it's text element
    const remains = currentTemplate.textElements.filter(el => el.id !== targetId);
    if (remains.length === currentTemplate.textElements.length) {
      // Trying to delete something else, like logo or signature or seal
      if (targetId === 'logo') {
        updateTemplateProperties({ logoIconType: 'none', logoUrl: '' });
      } else if (targetId === 'signature') {
        updateTemplateProperties({ signatoryName: '', signatureUrl: '' });
      } else if (targetId === 'secondarySignature') {
        updateTemplateProperties({ showSecondarySignatory: false, secondarySignatureUrl: '' });
      } else if (targetId === 'seal') {
        updateTemplateProperties({ showQrCode: false, showSeal: false });
      }
      setSelectedElId(null);
      return;
    }

    const updated = {
      ...currentTemplate,
      textElements: remains
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
    setSelectedElId(null);
  };

  const resetElementSize = (id: string) => {
    if (id === 'logo') {
      updateTemplateProperty('logoWidth', 100);
    } else if (id === 'signature') {
      updateTemplateProperty('signatureWidth', 90);
    } else if (id === 'secondarySignature') {
      updateTemplateProperty('secondarySignatureWidth', 100);
    } else if (id.startsWith('t-')) {
      const updated = currentTemplate.textElements.map(el => {
        if (el.id === id) return { ...el, width: undefined, fontSize: el.isPlaceholder ? 12 : 14 };
        return el;
      });
      updateTemplateProperty('textElements', updated);
    }
  };

  // Logo rendering vector styles
  const renderLogoVector = (type: string, width: number) => {
    if (!type || type === 'none') return null;
    return (
      <div style={{ width: `${width * 0.125}cqw` }} className="flex items-center justify-center pointer-events-none select-none">
        {type === 'tech' && (
          <div className="w-full aspect-square bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-lg p-2 shadow-sm flex items-center justify-center text-white">
            <Sparkles className="w-2/3 h-2/3" />
          </div>
        )}
        {type === 'edu' && (
          <div className="w-full aspect-square bg-gradient-to-tr from-amber-600 to-rose-700 rounded-full p-2 shadow-sm flex items-center justify-center text-white">
            <Award className="w-2/3 h-2/3" />
          </div>
        )}
        {type === 'corp' && (
          <div className="w-full aspect-square bg-slate-900 border border-slate-600 rounded-sm p-2 shadow-sm flex items-center justify-center text-white">
            <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">★</div>
          </div>
        )}
        {type === 'science' && (
          <div className="w-full aspect-square bg-indigo-950 border border-indigo-400 rounded-full p-2 flex items-center justify-center text-sky-400">
            <QrCode className="w-2/3 h-2/3" />
          </div>
        )}
        {type === 'art' && (
          <div className="w-full aspect-square bg-rose-50 border border-rose-200 rounded-xl p-2 flex items-center justify-center text-rose-500">
            <div className="text-xl">❀</div>
          </div>
        )}
      </div>
    );
  };

  // Simulated handwriting scripts
  const renderHandwrittenSignature = (name: string, styleId: string = 'elegant') => {
    let fontStyle = { fontFamily: '"Playfair Display", serif', fontStyle: 'italic' };
    if (styleId === 'bold_brush') {
      fontStyle = { fontFamily: 'sans-serif', fontStyle: 'italic' };
    } else if (styleId === 'executive') {
      fontStyle = { fontFamily: '"JetBrains Mono", monospace', fontStyle: 'italic' };
    }
    return (
      <div 
        style={fontStyle}
        className="text-center font-serif text-lg tracking-wide border-b border-slate-300 pb-1 text-slate-800"
      >
        {name || 'Thomas Kurian'}
      </div>
    );
  };

  // Ornate frame corner decorations
  const renderCornerFlourish = (style: string, color: string) => {
    if (!style || style === 'none') return null;
    return (
      <>
        {/* Top-Left */}
        <div style={{ borderColor: color }} className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 pointer-events-none rounded-tl-sm opacity-60"></div>
        {/* Top-Right */}
        <div style={{ borderColor: color }} className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 pointer-events-none rounded-tr-sm opacity-60"></div>
        {/* Bottom-Left */}
        <div style={{ borderColor: color }} className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 pointer-events-none rounded-bl-sm opacity-60"></div>
        {/* Bottom-Right */}
        <div style={{ borderColor: color }} className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 pointer-events-none rounded-br-sm opacity-60"></div>
      </>
    );
  };

  return (
    <div className="bg-[#F8F9FA] text-slate-800 h-full flex flex-col overflow-hidden relative z-30 font-sans">
      
      {/* Editor Action Top bar */}
      <div className="h-14 bg-white border-b border-slate-200 px-6 flex justify-between items-center z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="text-xs hover:bg-slate-100 text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded transition-all flex items-center gap-1.5 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Editor
          </button>
          <span className="text-slate-200 font-mono">/</span>
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={currentTemplate.name}
              onChange={(e) => updateTemplateProperty('name', capitalizeWords(e.target.value))}
              className="bg-slate-50 text-sm font-bold text-slate-900 max-w-sm border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white rounded py-1 px-2.5 transition-all"
              placeholder="Enter Template Title..."
            />
          </div>
        </div>

        {/* Undo, Redo, Save Deck */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded p-0.5 shadow-inner">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className={`p-1.5 rounded transition-colors ${historyIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-650 hover:bg-slate-200 hover:text-slate-900'}`}
              title="Undo last change"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              className={`p-1.5 rounded transition-colors ${historyIndex === history.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-655 hover:bg-slate-200 hover:text-slate-900'}`}
              title="Redo previous change"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onSave(currentTemplate)}
            className="bg-slate-950 hover:bg-slate-850 text-white text-xs px-5 py-2 rounded font-bold shadow transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Canva Slate
          </button>
        </div>
      </div>      {/* Split core workspace content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0">
        
        {/* Sidebar Nav Category Rail (Canva Style) */}
        <div className="w-full h-16 md:w-16 md:h-full bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-row md:flex-col items-center justify-between px-4 md:px-0 py-2 md:py-4 shrink-0 z-10 overflow-hidden">
          <div 
            className="flex flex-row md:flex-col gap-1 md:gap-1.5 md:space-y-1.5 w-full justify-between md:justify-start overflow-x-auto md:overflow-x-hidden md:overflow-y-auto md:flex-1 md:py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              { id: 'templates', icon: Award, label: 'Design presets' },
              { id: 'ai', icon: Sparkles, label: 'AI Design Agent' },
              { id: 'text', icon: Type, label: 'Add Text' },
              { id: 'uploads', icon: Upload, label: 'Upload Elements' },
              { id: 'backdrop', icon: Image, label: 'Backgrounds' },
              { id: 'borders', icon: Sliders, label: 'Borders' },
              { id: 'seals', icon: QrCode, label: 'Stamps' },
              { id: 'sign', icon: User, label: 'Signatories' },
              { id: 'layers', icon: Layers, label: 'Layers List' },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSideTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSideTab(tab.id as any)}
                  className={`flex-1 md:w-full flex flex-col items-center justify-center py-2 px-1 md:py-3 transition-all outline-none border-t-2 md:border-t-0 md:border-l-2 relative ${
                    isActive ? 'border-indigo-650 text-indigo-650 bg-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-800'
                  }`}
                  title={tab.label}
                >
                  <Icon className="w-5 h-5 mb-0.5 md:mb-1" />
                  <span className="text-[8px] font-bold text-center scale-90 truncate max-w-full">{tab.id.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
          
          <div className="text-center hidden md:block md:mt-2">
            <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer mx-auto" />
          </div>
        </div>

        {/* Floating properties drawer specific to the active side tab */}
        <div className="w-full h-48 md:w-80 md:h-full bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 z-10 shadow-sm text-xs leading-normal text-slate-700 font-sans">
          <div className="p-5 space-y-6">
            
            {/* TAB: TEMPLATES */}
            {activeSideTab === 'templates' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-650" /> Pre-designed Presets
                  </h3>
                  <p className="text-[10px] text-slate-500">Clicking apply overwrites layout parameters to match gorgeous curated styles instantly.</p>
                </div>
                
                <div className="space-y-3 pt-2">
                  {BEAUTIFUL_PRESETS.map((it, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPresetDesign(idx)}
                      className="w-full text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-3 transition-all duration-200 flex flex-col gap-1 hover:border-indigo-500 shadow-sm"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-slate-800">{it.name}</span>
                        <ChevronSign />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono capitalize">Border: {it.borderStyle} • Seal: {it.sealType}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: AI Certificate Generator */}
            {activeSideTab === 'ai' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> AI Certificate Generator
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Use AI to automatically design a stunning vector certificate background and layout based on your prompt.
                  </p>
                </div>
                
                <div className="space-y-3 pt-2">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g., Cyber security award with neon green and dark slate theme..."
                    rows={4}
                    className="w-full text-xs border border-slate-200 rounded p-2 focus:indigo-500 outline-none resize-none text-slate-800"
                  />

                  {/* Certificate Style Sample Upload */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block">Guide AI with Sample Certificate Image (Optional)</label>
                    <input
                      id="ai-sample-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleSampleImageUpload}
                      className="hidden"
                    />
                    {aiSampleImage ? (
                      <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex flex-col items-center gap-1.5 relative">
                        <img
                          src={`data:${aiSampleImage.mimeType};base64,${aiSampleImage.data}`}
                          alt="Uploaded template preview"
                          className="max-h-24 object-contain rounded border border-white shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setAiSampleImage(null)}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-sm transition-transform hover:scale-105"
                          title="Remove Sample Image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className="text-[8px] font-mono text-slate-400 font-bold uppercase font-bold">Certificate Sample Attached</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById('ai-sample-upload-input')?.click()}
                        className="w-full bg-white hover:bg-slate-50 text-slate-700 p-2 border border-slate-200 rounded text-center text-[10px] font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload Sample Certificate Image
                      </button>
                    )}
                  </div>

                  <button
                    onClick={generateTemplateWithAi}
                    disabled={isGeneratingAi || !aiPrompt.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2.5 rounded font-bold transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isGeneratingAi ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        AI Designing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Generate Design
                      </>
                    )}
                  </button>
                  {aiError && (
                    <div className="text-[10px] text-red-500 bg-red-50 border border-red-200 rounded p-2 font-mono whitespace-pre-wrap">
                      {aiError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TEXT */}
            {activeSideTab === 'text' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-indigo-650" /> Vector Text Elements
                  </h3>
                  <p className="text-[10px] text-slate-500">Add customizable dynamic typography layers on the canvas stage.</p>
                </div>

                {/* Program Selector for Dynamic Fields */}
                <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-700 shadow-sm">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Certificate Program Fields Context
                  </label>
                  <p className="text-[9px] text-slate-550 mb-1.5 leading-relaxed">
                    Select a program to load its custom spreadsheet mapping variables.
                  </p>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">None (Default Fields Only)</option>
                    {programs && programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => addNewTextLayer('heading')}
                    className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg text-center font-bold text-slate-800 border border-slate-200 hover:border-indigo-500 transition-colors shadow-sm cursor-pointer"
                  >
                    + Add Heading
                  </button>
                  <button
                    onClick={() => addNewTextLayer('subheading')}
                    className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg text-center font-semibold text-slate-700 border border-slate-200 hover:border-indigo-500 transition-colors shadow-sm cursor-pointer"
                  >
                    + Add Subtitle
                  </button>
                  <button
                    onClick={() => addNewTextLayer('body')}
                    className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg text-center text-slate-700 border border-slate-200 hover:border-indigo-500 transition-colors col-span-2 shadow-sm cursor-pointer"
                  >
                    + Add Body Paragraph Block
                  </button>
                </div>

                {/* Inline text element editor */}
                {selectedElId && !['logo', 'signature', 'secondarySignature', 'seal'].includes(selectedElId) ? (
                  (() => {
                    const el = currentTemplate.textElements.find(item => item.id === selectedElId);
                    if (!el) return null;
                    return (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 shadow-sm animate-fade-in text-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-indigo-600">Selected Layer Controls</span>
                          <button
                            onClick={() => deleteSelectedElement()}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 p-1.5 rounded transition-colors cursor-pointer"
                            title="Delete this text layer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Text Editor Box */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Edit Text</label>
                          <textarea
                            value={el.text}
                            onChange={(e) => updateTextElementProperty(el.id, 'text', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-500 text-xs h-16"
                          />
                        </div>

                        {/* Dynamic Tag Injector helpers */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Insert Spreadsheet Placeholder Fields</span>
                          <div className="flex flex-wrap gap-1.5">
                            {getPlaceholderTags().map(tag => (
                              <button
                                key={tag}
                                onClick={() => insertPlaceholderTag(tag)}
                                className="bg-white hover:bg-slate-100 text-slate-700 text-[9px] font-mono px-2 py-0.5 rounded transition-colors border border-slate-200 shadow-sm cursor-pointer animate-fade-in"
                              >
                                {"{{" + tag + "}}"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Styling parameters */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Typography</label>
                            <select
                               value={el.fontFamily}
                               onChange={(e) => updateTextElementProperty(el.id, 'fontFamily', e.target.value)}
                               className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                            >
                              <option value="Inter">Inter (Sans-Serif)</option>
                              <option value="Space Grotesk">Space Grotesk (Tech Heading)</option>
                              <option value="Playfair Display">Playfair Display (Serif)</option>
                              <option value="JetBrains Mono">JetBrains Mono (Monospace)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Size (pt)</label>
                            <input
                              type="number"
                              min="6"
                              max="80"
                              value={el.fontSize}
                              onChange={(e) => updateTextElementProperty(el.id, 'fontSize', parseInt(e.target.value) || 12)}
                              className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Color</label>
                            <input
                              type="color"
                              value={el.color}
                              onChange={(e) => updateTextElementProperty(el.id, 'color', e.target.value)}
                              className="w-full h-8 bg-white rounded border border-slate-200 cursor-pointer p-0.5 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Weight & Align</label>
                            <div className="flex gap-1.5">
                              {/* Weight toggles */}
                              <button
                                onClick={() => updateTextElementProperty(el.id, 'fontWeight', el.fontWeight === 'bold' ? 'normal' : 'bold')}
                                className={`flex-1 p-1.5 rounded border transition-colors cursor-pointer ${el.fontWeight === 'bold' ? 'bg-indigo-600 border-indigo-550 text-white font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-105 hover:text-slate-900'}`}
                              >
                                <strong>B</strong>
                              </button>
                              <button
                                onClick={() => updateTextElementProperty(el.id, 'fontWeight', el.fontWeight === 'medium' ? 'normal' : 'medium')}
                                className={`flex-1 p-1.5 rounded border transition-colors cursor-pointer ${el.fontWeight === 'medium' ? 'bg-indigo-600 border-indigo-550 text-white font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-105 hover:text-slate-900'}`}
                              >
                                <strong>M</strong>
                              </button>
                              
                              {/* Alignments */}
                              <button
                                onClick={() => updateTextElementProperty(el.id, 'align', 'left')}
                                className={`p-1.5 rounded border transition-colors cursor-pointer ${el.align === 'left' ? 'bg-indigo-600 border-indigo-550 text-white' : 'bg-white border-slate-200 text-slate-550'}`}
                              >
                                <AlignLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateTextElementProperty(el.id, 'align', 'center')}
                                className={`p-1.5 rounded border transition-colors cursor-pointer ${el.align === 'center' ? 'bg-indigo-600 border-indigo-550 text-white' : 'bg-white border-slate-200 text-slate-550'}`}
                              >
                                <AlignCenter className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateTextElementProperty(el.id, 'align', 'right')}
                                className={`p-1.5 rounded border transition-colors cursor-pointer ${el.align === 'right' ? 'bg-indigo-600 border-indigo-550 text-white' : 'bg-white border-slate-200 text-slate-555'}`}
                              >
                                <AlignRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] uppercase text-slate-500 font-bold">Box Width: {el.width || 512}px</label>
                              <button 
                                onClick={() => updateTextElementProperty(el.id, 'width', undefined)}
                                className="text-[9px] text-indigo-650 font-bold hover:underline cursor-pointer"
                              >
                                Auto/Reset
                              </button>
                            </div>
                            <input
                              type="range"
                              min="100"
                              max="1000"
                              value={el.width || 512}
                              onChange={(e) => updateTextElementProperty(el.id, 'width', parseInt(e.target.value))}
                              className="w-full cursor-pointer mt-1"
                            />
                          </div>

                          <div className="col-span-2 pt-1 border-t border-slate-200">
                            <span className="text-[10px] text-slate-400 font-mono italic block text-center">Coordinate: Left {el.xPercent}% • Top {el.yPercent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl text-slate-500 text-center border border-slate-200 shadow-sm">
                    <p className="text-xs">Click on any text block on the live canvas to unlock full style properties!</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPLOADS */}
            {activeSideTab === 'uploads' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-650" /> Uploaded Elements
                  </h3>
                  <p className="text-[10px] text-slate-500">Upload custom graphics, badges, or seals (PNG/JPG) to add them to your certificate template.</p>
                </div>

                <div className="pt-2">
                  <label
                    htmlFor="custom-element-upload-input"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 hover:bg-slate-50 hover:border-indigo-500 transition-all cursor-pointer shadow-sm group"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mb-2 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">
                      Upload Custom Graphic Element
                    </span>
                    <span className="text-[8px] text-slate-400 mt-1">PNG, JPG, or SVG max 2MB</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomImageElementUpload}
                    className="hidden"
                    id="custom-element-upload-input"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
                      Upload Entire Certificate Design
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Use a complete pre-designed certificate image (JPEG/PNG) as your template background. Existing overlay placeholders will remain editable.
                    </p>
                  </div>
                  
                  <label
                    htmlFor="editor-backdrop-upload-input"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-5 hover:bg-slate-50 hover:border-indigo-500 transition-all cursor-pointer shadow-sm group"
                  >
                    <Image className="w-5 h-5 text-slate-400 group-hover:text-indigo-650 mb-1.5 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-650 transition-colors">
                      Select Backdrop Image
                    </span>
                    <span className="text-[8px] text-slate-400 mt-0.5">PNG or JPG max 3.5MB</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'backgroundImage')}
                    className="hidden"
                    id="editor-backdrop-upload-input"
                  />
                  {currentTemplate.backgroundImageUrl && (
                    <div className="flex items-center justify-between bg-slate-50 border rounded-lg p-2 mt-1">
                      <span className="text-[9px] font-mono truncate max-w-[150px] text-slate-600">Backdrop is Active</span>
                      <button
                        type="button"
                        onClick={() => updateTemplateProperty('backgroundImageUrl', '')}
                        className="text-[9px] text-rose-600 hover:text-rose-800 font-bold underline"
                      >
                        Remove Backdrop
                      </button>
                    </div>
                  )}
                </div>

                {uploadedAssets.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Your Assets Library</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedAssets.map((asset, idx) => (
                        <button
                          key={idx}
                          onClick={() => addUploadedImageToCanvas(asset)}
                          className="aspect-square bg-slate-50 border border-slate-200 hover:border-indigo-500 rounded-lg p-1.5 transition-all overflow-hidden flex items-center justify-center hover:scale-105 shadow-sm cursor-pointer"
                        >
                          <img src={asset} className="max-h-full max-w-full object-contain pointer-events-none" alt={`Asset ${idx}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BACKDROP/THEME */}
            {activeSideTab === 'backdrop' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-indigo-650" /> Canvas Backdrops
                  </h3>
                  <p className="text-[10px] text-slate-500">Adjust colors and render linear/radial master gradients under authority frames.</p>
                </div>

                {/* CUSTOM CERTIFICATE TEMPLATE BACKGROUND UPLOAD */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                  <span className="text-[9px] font-bold uppercase text-indigo-600">Custom Template Background Image</span>
                  <input 
                    id="bg-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'backgroundImage')}
                    className="hidden"
                  />
                  {currentTemplate.backgroundImageUrl ? (
                    <div className="space-y-2 border border-slate-200 bg-white p-2 rounded flex flex-col items-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Uploaded Template Preview</span>
                      <img 
                        src={currentTemplate.backgroundImageUrl} 
                        alt="Custom template background preview"
                        className="max-h-16 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => updateTemplateProperty('backgroundImageUrl', '')}
                        className="text-[9px] text-rose-600 hover:text-rose-800 font-bold underline"
                      >
                        Remove template image
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => document.getElementById('bg-upload-input')?.click()}
                      className="border border-dashed border-slate-300 rounded p-4 text-center cursor-pointer hover:bg-slate-100/50 text-[10px] text-slate-500 bg-white font-semibold"
                    >
                      Click to upload custom template background image
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {GRADIENT_OPTIONS.map((grad, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (grad.isGradient) {
                          updateTemplateProperties({
                            backgroundImageUrl: '',
                            backgroundGradient: grad.value,
                            backgroundColor: '#FFFFFF'
                          });
                        } else {
                          updateTemplateProperties({
                            backgroundImageUrl: '',
                            backgroundGradient: '',
                            backgroundColor: grad.value
                          });
                        }
                      }}
                      style={{
                        background: grad.isGradient ? grad.value : grad.value,
                        borderColor: (grad.isGradient && currentTemplate.backgroundGradient === grad.value) || (!grad.isGradient && !currentTemplate.backgroundGradient && currentTemplate.backgroundColor === grad.value) ? '#6366F1' : '#E2E8F0'
                      }}
                      className="h-16 rounded-lg text-left text-[9px] font-bold p-2 text-slate-800 flex flex-col justify-end border-2 hover:opacity-90 shadow transition-all"
                    >
                      <span className="bg-white/90 text-slate-800 px-1 py-0.5 rounded-sm truncate select-none scale-90 w-full block border shadow-sm">{grad.name}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Background Color Hex</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentTemplate.backgroundColor}
                        onChange={(e) => {
                          updateTemplateProperties({
                            backgroundColor: e.target.value,
                            backgroundGradient: '',
                            backgroundImageUrl: ''
                          });
                        }}
                        className="w-10 h-8 rounded border border-slate-200 cursor-pointer focus:outline-none bg-white p-0.5"
                      />
                      <input
                        type="text"
                        value={currentTemplate.backgroundColor}
                        onChange={(e) => {
                          updateTemplateProperties({
                            backgroundColor: e.target.value,
                            backgroundGradient: '',
                            backgroundImageUrl: ''
                          });
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded p-1.5 text-slate-900 font-mono uppercase focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BORDERS */}
            {activeSideTab === 'borders' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-650" /> Borders & Frames
                  </h3>
                  <p className="text-[10px] text-slate-500">Configure certificate perimeter layouts and aesthetics.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Border style</label>
                    <select
                      value={currentTemplate.borderStyle || 'solid'}
                      onChange={(e) => updateTemplateProperty('borderStyle', e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none"
                    >
                      <option value="solid">Single Solid Line</option>
                      <option value="double">Double Ornate Scroll Rim</option>
                      <option value="dashed">Modern Tech Dashed Outline</option>
                      <option value="ornate">Vintage Border Flourish</option>
                      <option value="none">No Border Frame</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Border Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentTemplate.borderColor}
                        onChange={(e) => updateTemplateProperty('borderColor', e.target.value)}
                        className="w-10 h-8 rounded border border-slate-200 cursor-pointer focus:outline-none bg-white p-0.5"
                      />
                      <input
                        type="text"
                        value={currentTemplate.borderColor}
                        onChange={(e) => updateTemplateProperty('borderColor', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded p-1.5 text-slate-900 font-mono uppercase focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Border Width (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={currentTemplate.borderWidth}
                        onChange={(e) => updateTemplateProperty('borderWidth', parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Border Radius (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={currentTemplate.borderRadius || 0}
                        onChange={(e) => updateTemplateProperty('borderRadius', parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Corner Ornaments</label>
                    <select
                      value={currentTemplate.decorFlourish || 'none'}
                      onChange={(e) => updateTemplateProperty('decorFlourish', e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none"
                    >
                      <option value="none">No Corner Accents</option>
                      <option value="minimal">Minimal Corner Corner Blocks</option>
                      <option value="classic">Symmetrical Classic brackets</option>
                      <option value="ornate">Imperial Golden Scrolls</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SEALS & CERT STAMPS */}
            {activeSideTab === 'seals' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-650" /> Stamps & Seals
                  </h3>
                  <p className="text-[10px] text-slate-500">Configure trust verification elements, custom stamps, or dynamic QR codes.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Verification Display Mode</label>
                    <select
                      value={
                        currentTemplate.showQrCode && currentTemplate.showSeal
                          ? 'both'
                          : currentTemplate.showQrCode
                          ? 'qrcode'
                          : currentTemplate.showSeal
                          ? 'seal'
                          : 'none'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'both') {
                          updateTemplateProperties({ showQrCode: true, showSeal: true });
                        } else if (val === 'qrcode') {
                          updateTemplateProperties({ showQrCode: true, showSeal: false });
                        } else if (val === 'seal') {
                          updateTemplateProperties({ showQrCode: false, showSeal: true });
                        } else {
                          updateTemplateProperties({ showQrCode: false, showSeal: false });
                        }
                      }}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none"
                    >
                      <option value="both">Both QR Code & Seal Badge</option>
                      <option value="qrcode">QR Code Only</option>
                      <option value="seal">Seal Badge Only</option>
                      <option value="none">Disabled (Hide both)</option>
                    </select>
                  </div>

                  {currentTemplate.showSeal && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Seal Style Emblem</label>
                      <select
                        value={currentTemplate.sealType}
                        onChange={(e) => updateTemplateProperty('sealType', e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none"
                      >
                        <option value="classic">Classic Seal</option>
                        <option value="stellar">Stellar Emblem</option>
                        <option value="modern">Modern Stamp</option>
                        <option value="crimson_wax">Imperial Crimson Wax</option>
                        <option value="emerald_shield">Emerald Shield</option>
                        <option value="gold_medallion">Gold Medallion</option>
                      </select>
                    </div>
                  )}

                  {currentTemplate.showQrCode && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">QR Code Size</label>
                        <span className="text-[10px] font-mono font-bold text-indigo-650">{currentTemplate.qrCodeWidth || 32}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="80"
                        value={currentTemplate.qrCodeWidth || 32}
                        onChange={(e) => updateTemplateProperty('qrCodeWidth', parseInt(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  )}

                  {currentTemplate.showSeal && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Seal Badge Size</label>
                        <span className="text-[10px] font-mono font-bold text-indigo-650">{currentTemplate.sealWidth || 40}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={currentTemplate.sealWidth || 40}
                        onChange={(e) => updateTemplateProperty('sealWidth', parseInt(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  )}

                  <div className="space-y-1 border-t border-slate-200 pt-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Audit Ledger QR Code</span>
                    <label className="text-[10px] font-mono text-slate-500 flex items-center gap-1 leading-normal">
                      <Info className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                      Click on the QR Code / Seal elements in the visual canvas to drag position.
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SIGNATURES */}
            {activeSideTab === 'sign' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-650" /> Branding & Signatories
                  </h3>
                  <p className="text-[10px] text-slate-500">Configure organization custom logo branding and official signatory signatures.</p>
                </div>

                <div className="space-y-4 pt-2">
                  
                  {/* ORGANIZATIONAL LOGO BRANDING */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                    <span className="text-[9px] font-bold uppercase text-indigo-600">Organization Branding Logo</span>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Logo Asset Type</label>
                      <select
                        value={currentTemplate.logoUrl ? 'custom' : (currentTemplate.logoIconType || 'corp')}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            document.getElementById('logo-upload-input')?.click();
                          } else {
                            // Use preset vector shape
                            setCurrentTemplate(prev => ({
                              ...prev,
                              logoUrl: '',
                              logoIconType: e.target.value
                            }));
                          }
                        }}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                      >
                        <option value="custom">★ Custom Uploaded Logo Image</option>
                        <option value="corp">Standard Corporate Star Shield</option>
                        <option value="edu">Classical Academic Mortar Laurel</option>
                        <option value="tech">Modern Glowing Spark Tech</option>
                        <option value="science">Quantum Orbital Rings</option>
                        <option value="art">Fine Arts Floral Lotus</option>
                        <option value="none">No Logo Asset</option>
                      </select>
                    </div>

                    {/* Hidden file input */}
                    <input 
                      id="logo-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="hidden"
                    />

                    {currentTemplate.logoUrl ? (
                      <div className="space-y-2 border border-slate-200 bg-white p-2 rounded flex flex-col items-center">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Uploaded Logo Preview</span>
                        <img 
                          src={currentTemplate.logoUrl} 
                          alt="Uploaded logo preview"
                          className="max-h-16 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => updateTemplateProperty('logoUrl', '')}
                          className="text-[9px] text-rose-600 hover:text-rose-800 font-bold underline"
                        >
                          Remove custom logo
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => document.getElementById('logo-upload-input')?.click()}
                        className="border border-dashed border-slate-300 rounded p-4 text-center cursor-pointer hover:bg-slate-100/50 text-[10px] text-slate-500 bg-white"
                      >
                        Click to upload custom logo image
                      </div>
                    )}

                    {(currentTemplate.logoUrl || currentTemplate.logoIconType !== 'none') && (
                      <div className="pt-1">
                        <label className="text-[9px] text-slate-500 font-bold">Logo Width: {currentTemplate.logoWidth}px</label>
                        <input
                          type="range"
                          min="40"
                          max="160"
                          value={currentTemplate.logoWidth}
                          onChange={(e) => updateTemplateProperty('logoWidth', parseInt(e.target.value))}
                          className="w-full cursor-pointer mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* SIGNATORY 1 BLOCK */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                    <span className="text-[9px] font-bold uppercase text-indigo-600">Primary Authority Signatory</span>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">First Signatory Name</label>
                      <input
                        type="text"
                        value={currentTemplate.signatoryName || ''}
                        onChange={(e) => updateTemplateProperty('signatoryName', capitalizeWords(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">First Signatory Title</label>
                      <input
                        type="text"
                        value={currentTemplate.signatoryTitle || ''}
                        onChange={(e) => updateTemplateProperty('signatoryTitle', capitalizeWords(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900"
                        placeholder="Chancellor"
                      />
                    </div>

                    {/* Signature Image Upload */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Signatory 1 Signature Image</label>
                      <input 
                        id="sig1-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'signature')}
                        className="hidden"
                      />
                      {currentTemplate.signatureUrl ? (
                        <div className="space-y-1 bg-white p-2 border border-slate-200 rounded flex flex-col items-center">
                          <img 
                            src={currentTemplate.signatureUrl} 
                            alt="Signature 1 preview"
                            className="max-h-12 object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => updateTemplateProperty('signatureUrl', '')}
                            className="text-[8px] text-rose-600 hover:underline font-bold"
                          >
                            Remove uploaded signature
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => document.getElementById('sig1-upload-input')?.click()}
                          className="w-full bg-white hover:bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded text-center text-[10px] font-semibold"
                        >
                          Upload Custom Signature Image
                        </button>
                      )}

                      {(currentTemplate.signatureUrl || currentTemplate.signatoryName) && (
                        <div className="pt-2">
                          <label className="text-[9px] text-slate-500 font-bold">Signature Width: {currentTemplate.signatureWidth}px</label>
                          <input
                            type="range"
                            min="40"
                            max="200"
                            value={currentTemplate.signatureWidth}
                            onChange={(e) => updateTemplateProperty('signatureWidth', parseInt(e.target.value))}
                            className="w-full cursor-pointer mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DOUBLE SIGNATORY OPTION */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-indigo-600">Secondary Signatory (Double)</span>
                      <button
                        onClick={() => updateTemplateProperty('showSecondarySignatory', !currentTemplate.showSecondarySignatory)}
                        className={`text-[8px] font-bold px-2 py-0.5 rounded border ${currentTemplate.showSecondarySignatory ? 'bg-indigo-650 border-indigo-650 text-white font-bold' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}
                      >
                        {currentTemplate.showSecondarySignatory ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>

                    {currentTemplate.showSecondarySignatory && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Second Signatory Name</label>
                          <input
                            type="text"
                            value={currentTemplate.secondarySignatoryName || ''}
                            onChange={(e) => updateTemplateProperty('secondarySignatoryName', capitalizeWords(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900"
                            placeholder="Dr. Clara Masters"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Second Signatory Title</label>
                          <input
                            type="text"
                            value={currentTemplate.secondarySignatoryTitle || ''}
                            onChange={(e) => updateTemplateProperty('secondarySignatoryTitle', capitalizeWords(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900"
                            placeholder="Admissions Registrar"
                          />
                        </div>

                        {/* Secondary Signature Image Upload */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/60">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">Signatory 2 Signature Image</label>
                          <input 
                            id="sig2-upload-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'secondarySignature')}
                            className="hidden"
                          />
                          {currentTemplate.secondarySignatureUrl ? (
                            <div className="space-y-1 bg-white p-2 border border-slate-200 rounded flex flex-col items-center">
                              <img 
                                src={currentTemplate.secondarySignatureUrl} 
                                alt="Signature 2 preview"
                                className="max-h-12 object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => updateTemplateProperty('secondarySignatureUrl', '')}
                                className="text-[8px] text-rose-600 hover:underline font-bold"
                              >
                                Remove uploaded signature
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById('sig2-upload-input')?.click()}
                              className="w-full bg-white hover:bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded text-center text-[10px] font-semibold"
                            >
                              Upload Custom Signature Image
                            </button>
                          )}

                          {(currentTemplate.secondarySignatureUrl || currentTemplate.secondarySignatoryName) && (
                            <div className="pt-2">
                              <label className="text-[9px] text-slate-500 font-bold">Signature Width: {currentTemplate.secondarySignatureWidth || 100}px</label>
                              <input
                                type="range"
                                min="40"
                                max="200"
                                value={currentTemplate.secondarySignatureWidth || 100}
                                onChange={(e) => updateTemplateProperty('secondarySignatureWidth', parseInt(e.target.value))}
                                className="w-full cursor-pointer mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                    <span className="text-[9px] font-bold uppercase text-indigo-650">Preset Signature Graphic Font</span>
                    <select
                      value={currentTemplate.signatureStyle || 'elegant'}
                      onChange={(e) => updateTemplateProperty('signatureStyle', e.target.value)}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-800 focus:outline-none"
                    >
                      <option value="elegant">Graceful Edwardian Script</option>
                      <option value="bold_brush">Bold Stroke Brush</option>
                      <option value="executive">Flowing Executive Pen</option>
</select>
                  </div>

                  {/* Predefined Logo icon override */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                    <span className="text-[9px] font-bold uppercase text-indigo-650">Predefined Template Logo Shapes</span>
                    <select
                      value={currentTemplate.logoIconType || 'corp'}
                      onChange={(e) => updateTemplateProperty('logoIconType', e.target.value)}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-800 focus:outline-none"
                    >
                      <option value="none">None (Hide)</option>
                      <option value="corp">Corporate Shield</option>
                      <option value="star">Academic Star</option>
                      <option value="leaf">Laurel Leaf</option>
                      <option value="medal">Excellence Medal</option>
                      <option value="stamp">Official Stamp</option>
                    </select>

                    {currentTemplate.logoIconType !== 'none' && (
                      <div className="pt-2">
                        <label className="text-[9px] text-slate-500 font-bold">Logo Width: {currentTemplate.logoWidth}px</label>
                        <input
                          type="range"
                          min="40"
                          max="160"
                          value={currentTemplate.logoWidth}
                          onChange={(e) => updateTemplateProperty('logoWidth', parseInt(e.target.value))}
                          className="w-full cursor-pointer mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LAYERS MANAGEMENT */}
            {activeSideTab === 'layers' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-650" /> Layers & Structure Map
                  </h3>
                  <p className="text-[10px] text-slate-500">Align elements, remove redundant blocks, or reset canvas items.</p>
                </div>

                <div className="space-y-2 pt-2">
                  
                  {/* Logo Layer Indicator */}
                  {(currentTemplate.logoUrl || (currentTemplate.logoIconType && currentTemplate.logoIconType !== 'none')) && (
                    <div
                      onClick={() => setSelectedElId('logo')}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === 'logo' ? 'bg-indigo-50 border-indigo-500 text-indigo-950' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="font-bold flex items-center gap-1.5 text-[11px]"><Sparkles className="w-3.5 h-3.5 text-sky-600" /> Organization Logo</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold font-bold font-bold font-bold font-bold font-bold font-bold">L: {currentTemplate.logoX}% T: {currentTemplate.logoY}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement('logo'); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete logo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Text layers */}
                  {currentTemplate.textElements.map((el) => (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElId(el.id)}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === el.id ? 'bg-indigo-50 border-indigo-500 text-indigo-955' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <div className="truncate max-w-[140px] flex items-center gap-1.5 font-semibold text-[11px]">
                        <Type className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                        <span className="truncate">{el.text}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold font-bold font-bold font-bold font-bold font-bold font-bold">L: {el.xPercent}% T: {el.yPercent}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement(el.id); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete layer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Signatures */}
                  {(currentTemplate.signatureUrl || currentTemplate.signatoryName) && (
                    <div
                      onClick={() => setSelectedElId('signature')}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === 'signature' ? 'bg-indigo-50 border-indigo-500 text-indigo-955' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="font-bold flex items-center gap-1.5 text-[11px]">✍ Primary Signatory</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">L: {currentTemplate.signatureX}% T: {currentTemplate.signatureY}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement('signature'); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete primary signature"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {(currentTemplate.secondarySignatureUrl || currentTemplate.showSecondarySignatory) && (
                    <div
                      onClick={() => setSelectedElId('secondarySignature')}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === 'secondarySignature' ? 'bg-indigo-50 border-indigo-500 text-indigo-955' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="font-bold flex items-center gap-1.5 text-[11px]">✍ Secondary Signatory</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold font-bold font-bold font-bold font-bold font-bold font-bold">L: {currentTemplate.secondarySignatureX || 70}% T: {currentTemplate.secondarySignatureY || 78}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement('secondarySignature'); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete secondary signature"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audit Seals */}
                  {(currentTemplate.showQrCode || currentTemplate.showSeal) && (
                    <div
                      onClick={() => setSelectedElId('seal')}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === 'seal' ? 'bg-indigo-50 border-indigo-500 text-indigo-955' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="font-bold flex items-center gap-1.5 text-[11px]">🛡 Audit Seals & QR Code</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold">L: {currentTemplate.qrCodeX}% T: {currentTemplate.qrCodeY}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement('seal'); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete audit seals"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </div>

        {/* Outer Designer Stage canvas container */}
        <div className="flex-1 bg-[#E2E8F0] p-4 sm:p-12 flex flex-col items-center justify-center overflow-y-auto selection:bg-slate-200 relative">
          
          {showCanvaTip && (
            <div className="hidden md:block absolute top-4 left-4 bg-white border border-slate-200 p-3 rounded-lg text-[10px] text-slate-500 max-w-sm space-y-1.5 shadow-md z-10 transition-all duration-300">
              <div className="flex justify-between items-start gap-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" /> Interactive Canva Workspace
                </h4>
                <button
                  onClick={() => {
                    setShowCanvaTip(false);
                    localStorage.setItem('glint_canva_tip_dismissed', 'true');
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  title="Dismiss Tip"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="leading-relaxed">Click and drag <strong>ANY element</strong> (logos, signatures, seals, or text blocks) directly on the canvas to visually adjust their placement coordinates in real-time!</p>
            </div>
          )}

          {/* <div className="hidden sm:flex absolute top-4 right-4 flex gap-2 font-mono text-[9px] text-slate-500 bg-white border border-slate-200 p-2 rounded-lg select-none z-10 shadow-sm">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Vector precision lock: bound</span>
          </div> */}

          {/* Core Interactive visual frame */}
          <div className="w-full max-w-4xl bg-white/80 border border-slate-250 rounded-xl p-8 shadow-sm flex items-center justify-center">
            
            <div 
              ref={canvasRef}
              onContextMenu={(e) => handleContextMenu(e, null)}
              style={{
                background: currentTemplate.backgroundImageUrl 
                  ? `url(${currentTemplate.backgroundImageUrl})` 
                  : (currentTemplate.backgroundGradient || currentTemplate.backgroundColor),
                backgroundSize: currentTemplate.backgroundImageUrl ? 'cover' : undefined,
                backgroundPosition: currentTemplate.backgroundImageUrl ? 'center' : undefined,
                backgroundRepeat: currentTemplate.backgroundImageUrl ? 'no-repeat' : undefined,
                borderColor: currentTemplate.borderColor,
                borderWidth: `${currentTemplate.borderWidth}px`,
                borderStyle: currentTemplate.borderStyle === 'double' ? 'double' : (currentTemplate.borderStyle === 'dashed' ? 'dashed' : (currentTemplate.borderStyle === 'none' ? 'none' : 'solid')),
                borderRadius: `${currentTemplate.borderRadius || 0}px`,
                containerType: 'inline-size'
              }}
              className="aspect-[1.414/1] w-full bg-white relative shadow-2xl transition-all duration-150 overflow-hidden select-none border-indigo-400 cursor-default"
            >
              
              {/* Symmetrical Corner Accents */}
              {renderCornerFlourish(currentTemplate.decorFlourish || 'none', currentTemplate.borderColor)}
              
              {/* Drag Alignment floating guideline simulation */}
              {draggedItem && (
                <>
                  {/* Vertical coordinate guideline */}
                  <div 
                    style={{ left: `${currentTemplate.logoX}%` }} 
                    className="absolute inset-y-0 border-l border-indigo-500/30 border-dashed pointer-events-none z-30"
                  />
                  {/* Horizontal coordinate guideline */}
                  <div 
                    style={{ top: `${currentTemplate.logoY}%` }} 
                    className="absolute inset-x-0 border-t border-indigo-500/30 border-dashed pointer-events-none z-30"
                  />
                </>
              )}

              {/* Watermark watermark background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.02] border border-slate-900 rounded-full flex items-center justify-center pointer-events-none">
                <Award className="w-24 h-24" />
              </div>

              {/* Top watermark tags */}
              <div className="absolute top-4 left-6 pointer-events-none text-slate-400 font-mono text-[6px] tracking-widest uppercase">
                {brandName} AUTHORIZED DISPATCH
              </div>
              <div className="absolute top-4 right-6 pointer-events-none text-slate-400 font-mono text-[6px] tracking-widest uppercase">
                AUTHENTIC_LEDGER_MATCH
              </div>

              {/* DYNAMIC CANVAS LOGO ITEM */}
              {(currentTemplate.logoUrl || (currentTemplate.logoIconType && currentTemplate.logoIconType !== 'none')) && (
                <div
                  id="canvas-item-logo"
                  onMouseDown={(e) => handleMouseDown(e, 'logo', currentTemplate.logoX, currentTemplate.logoY)}
                  onContextMenu={(e) => handleContextMenu(e, 'logo')}
                  style={{
                    position: 'absolute',
                    left: `${currentTemplate.logoX}%`,
                    top: `${currentTemplate.logoY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`cursor-pointer group z-30 ${selectedElId === 'logo' ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-4 rounded px-1' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-350 hover:outline-offset-4'}`}
                >
                  {currentTemplate.logoUrl ? (
                    <img 
                      src={currentTemplate.logoUrl} 
                      style={{ width: `${currentTemplate.logoWidth * 0.125}cqw` }} 
                      className="pointer-events-none select-none max-h-32 object-contain"
                      alt="Uploaded Logo"
                    />
                  ) : (
                    renderLogoVector(currentTemplate.logoIconType, currentTemplate.logoWidth)
                  )}
                  
                  {/* Hover visual coordinates tag */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 select-none pointer-events-none">
                    <span>Logo (L:{currentTemplate.logoX}%, T:{currentTemplate.logoY}%)</span>
                  </div>

                  {selectedElId === 'logo' && (
                    <>
                      {/* Quick Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteSelectedElement();
                        }}
                        className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                        title="Delete Logo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Left handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'logo', 'left', currentTemplate.logoWidth)}
                        className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize logo width"
                      />
                      {/* Right handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'logo', 'right', currentTemplate.logoWidth)}
                        className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize logo width"
                      />
                      {/* Top handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'logo', 'top', currentTemplate.logoWidth)}
                        className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-3 h-1.5 bg-indigo-600 rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize logo width"
                      />
                      {/* Bottom handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'logo', 'bottom', currentTemplate.logoWidth)}
                        className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-3 h-1.5 bg-indigo-600 rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize logo width"
                      />
                      {/* Corners */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'logo', 'top-left', currentTemplate.logoWidth)}
                        className="absolute left-[-8px] top-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'logo', 'top-right', currentTemplate.logoWidth)}
                        className="absolute right-[-8px] top-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'logo', 'bottom-left', currentTemplate.logoWidth)}
                        className="absolute left-[-8px] bottom-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'logo', 'bottom-right', currentTemplate.logoWidth)}
                        className="absolute right-[-8px] bottom-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                    </>
                  )}
                </div>
              )}

              {/* DYNAMIC TEXT LAYERS WYSIWYG ABSOLUTE COORDINATES MAP */}
              {currentTemplate.textElements.map(el => {
                if (el.imageUrl) {
                  const isSelected = el.id === selectedElId;
                  return (
                    <div
                      key={el.id}
                      id={`canvas-item-${el.id}`}
                      onMouseDown={(e) => handleMouseDown(e, el.id, el.xPercent, el.yPercent)}
                      onContextMenu={(e) => handleContextMenu(e, el.id)}
                      style={{
                        position: 'absolute',
                        left: `${el.xPercent}%`,
                        top: `${el.yPercent}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${(el.width || 120) * 0.125}cqw`,
                        zIndex: isSelected ? 40 : 20,
                      }}
                      className={`cursor-pointer group select-none border-box transition-all px-1 py-1 ${
                        isSelected ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-2 bg-indigo-500/5 rounded-md' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400 hover:outline-offset-2'
                      }`}
                    >
                      <img
                        src={el.imageUrl}
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }}
                        className="pointer-events-none select-none mx-auto"
                        alt="Uploaded Element"
                      />

                      {/* Floating context label */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[7px] bg-slate-900 border border-slate-700 text-slate-300 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pointer-events-none select-none flex items-center gap-1 whitespace-nowrap flex items-center gap-1">
                        <span>IMAGE (L:{el.xPercent}%, T:{el.yPercent}%)</span>
                      </div>

                      {isSelected && (
                        <>
                          {/* Quick Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteSelectedElement();
                            }}
                            className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto cursor-pointer"
                            title="Delete Element"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          {/* Top-left handle */}
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'top-left', el.width || 120)}
                            className="absolute left-[-5px] top-[-5px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                            title="Drag to resize"
                          />
                          {/* Top-right handle */}
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'top-right', el.width || 120)}
                            className="absolute right-[-5px] top-[-5px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                            title="Drag to resize"
                          />
                          {/* Bottom-left handle */}
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'bottom-left', el.width || 120)}
                            className="absolute left-[-5px] bottom-[-5px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                            title="Drag to resize"
                          />
                          {/* Bottom-right handle */}
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'bottom-right', el.width || 120)}
                            className="absolute right-[-5px] bottom-[-5px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                            title="Drag to resize"
                          />
                          {/* Left edge handle */}
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'left', el.width || 120)}
                            className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                            title="Drag to resize width"
                          />
                          {/* Right edge handle */}
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'right', el.width || 120)}
                            className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                            title="Drag to resize width"
                          />
                        </>
                      )}
                    </div>
                  );
                }

                let value = el.text;
                if (el.text.includes('{{name}}')) value = value.replace('{{name}}', 'Alex Rivera (Recipient Name)');
                if (el.text.includes('{{program}}')) value = value.replace('{{program}}', 'Gemini Developer Mastery Program');
                if (el.text.includes('{{id}}')) value = value.replace('{{id}}', 'CERT-2026-XMOCK');
                if (el.text.includes('{{date}}')) value = value.replace('{{date}}', '2026-06-18');

                // Fonts mapping classes
                let fontClass = 'font-sans';
                if (el.fontFamily === 'Space Grotesk') fontClass = 'font-display tracking-tight';
                if (el.fontFamily === 'Playfair Display') fontClass = 'font-serif italic';
                if (el.fontFamily === 'JetBrains Mono') fontClass = 'font-mono uppercase tracking-wider text-[10px]';

                let weightClass = 'font-normal';
                if (el.fontWeight === 'medium') weightClass = 'font-medium';
                if (el.fontWeight === 'bold') weightClass = 'font-bold';

                const isSelected = el.id === selectedElId;

                return (
                  <div
                    key={el.id}
                    id={`canvas-item-${el.id}`}
                    onMouseDown={(e) => handleMouseDown(e, el.id, el.xPercent, el.yPercent)}
                    onContextMenu={(e) => handleContextMenu(e, el.id)}
                    style={{
                      position: 'absolute',
                      left: `${el.xPercent}%`,
                      top: `${el.yPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      color: el.color,
                      fontSize: `${el.fontSize * 0.09}cqw`,
                      textAlign: el.align,
                      zIndex: isSelected ? 40 : 20,
                      maxWidth: el.width ? `${el.width}px` : '512px'
                    }}
                    className={`${fontClass} ${weightClass} cursor-pointer break-words leading-snug select-none group border-box transition-all px-2.5 py-1 ${
                      isSelected ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-2 bg-indigo-500/5 rounded-md' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400 hover:outline-offset-2'
                    }`}
                  >
                    {value}

                    {/* Floating context label */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[7px] bg-slate-900 border border-slate-700 text-slate-300 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pointer-events-none select-none flex items-center gap-1 whitespace-nowrap">
                      <span>{el.fontWeight.toUpperCase()} (L:{el.xPercent}%, T:{el.yPercent}%)</span>
                    </div>

                    {isSelected && (
                      <>
                        {/* Quick Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteSelectedElement();
                          }}
                          className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                          title="Delete Element"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        {/* Top-left handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'top-left', el.width || 512, el.fontSize)}
                          className="absolute left-[-5px] top-[-5px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                          title="Drag to resize"
                        />
                        {/* Top-right handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'top-right', el.width || 512, el.fontSize)}
                          className="absolute right-[-5px] top-[-5px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                          title="Drag to resize"
                        />
                        {/* Bottom-left handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'bottom-left', el.width || 512, el.fontSize)}
                          className="absolute left-[-5px] bottom-[-5px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                          title="Drag to resize"
                        />
                        {/* Bottom-right handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'bottom-right', el.width || 512, el.fontSize)}
                          className="absolute right-[-5px] bottom-[-5px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                          title="Drag to resize"
                        />
                        {/* Left edge handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'left', el.width || 512)}
                          className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                          title="Drag to resize width"
                        />
                        {/* Right edge handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'right', el.width || 512)}
                          className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                          title="Drag to resize width"
                        />
                        {/* Top edge handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'top', el.width || 512, el.fontSize)}
                          className="absolute top-[-5px] left-1/2 -translate-x-1/2 w-3 h-1.5 bg-indigo-600 rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                          title="Drag to resize font size"
                        />
                        {/* Bottom edge handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'bottom', el.width || 512, el.fontSize)}
                          className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-3 h-1.5 bg-indigo-600 rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                          title="Drag to resize font size"
                        />
                      </>
                    )}
                  </div>
                );
              })}

              {/* DYNAMIC PRIMARY SIGNATORY */}
              {(currentTemplate.signatureUrl || currentTemplate.signatoryName) && (
                <div
                  id="canvas-item-signature"
                  onMouseDown={(e) => handleMouseDown(e, 'signature', currentTemplate.signatureX, currentTemplate.signatureY)}
                  onContextMenu={(e) => handleContextMenu(e, 'signature')}
                  style={{
                    position: 'absolute',
                    left: `${currentTemplate.signatureX}%`,
                    top: `${currentTemplate.signatureY}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${currentTemplate.signatureWidth * 0.125}cqw`,
                  }}
                  className={`cursor-pointer group z-30 p-2 text-center select-none ${selectedElId === 'signature' ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-4 rounded' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400'}`}
                >
                  {currentTemplate.signatureUrl ? (
                    <img 
                      src={currentTemplate.signatureUrl}
                      style={{ width: `${currentTemplate.signatureWidth * 0.125}cqw` }}
                      className="pointer-events-none select-none object-contain mx-auto max-h-16"
                      alt="Signature"
                    />
                  ) : (
                    renderHandwrittenSignature(currentTemplate.signatoryName || '', currentTemplate.signatureStyle || 'elegant')
                  )}
                  <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mt-1.5 leading-tight">{currentTemplate.signatoryTitle || 'CEO, Authority'}</p>
                  
                  {/* Coordinate Tag */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none shrink-0 whitespace-nowrap">
                    <span>Signature 1 (L:{currentTemplate.signatureX}%, T:{currentTemplate.signatureY}%)</span>
                  </div>

                  {selectedElId === 'signature' && (
                    <>
                      {/* Quick Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteSelectedElement();
                        }}
                        className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                        title="Delete Signature"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Left handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'signature', 'left', currentTemplate.signatureWidth)}
                        className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize signature width"
                      />
                      {/* Right handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'signature', 'right', currentTemplate.signatureWidth)}
                        className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize signature width"
                      />
                      {/* Top handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'signature', 'top', currentTemplate.signatureWidth)}
                        className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-3 h-1.5 bg-indigo-600 rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize signature width"
                      />
                      {/* Bottom handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'signature', 'bottom', currentTemplate.signatureWidth)}
                        className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-3 h-1.5 bg-indigo-600 rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize signature width"
                      />
                      {/* Corners */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'signature', 'top-left', currentTemplate.signatureWidth)}
                        className="absolute left-[-8px] top-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'signature', 'top-right', currentTemplate.signatureWidth)}
                        className="absolute right-[-8px] top-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'signature', 'bottom-left', currentTemplate.signatureWidth)}
                        className="absolute left-[-8px] bottom-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'signature', 'bottom-right', currentTemplate.signatureWidth)}
                        className="absolute right-[-8px] bottom-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                    </>
                  )}
                </div>
              )}

              {/* DYNAMIC SECONDARY SIGNATORY */}
              {(currentTemplate.secondarySignatureUrl || currentTemplate.showSecondarySignatory) && (
                <div
                  id="canvas-item-secondarySignature"
                  onMouseDown={(e) => handleMouseDown(e, 'secondarySignature', currentTemplate.secondarySignatureX || 70, currentTemplate.secondarySignatureY || 78)}
                  onContextMenu={(e) => handleContextMenu(e, 'secondarySignature')}
                  style={{
                    position: 'absolute',
                    left: `${currentTemplate.secondarySignatureX || 70}%`,
                    top: `${currentTemplate.secondarySignatureY || 78}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${(currentTemplate.secondarySignatureWidth || 100) * 0.125}cqw`,
                  }}
                  className={`cursor-pointer group z-30 p-2 text-center select-none ${selectedElId === 'secondarySignature' ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-4 rounded' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400'}`}
                >
                  {currentTemplate.secondarySignatureUrl ? (
                    <img 
                      src={currentTemplate.secondarySignatureUrl}
                      style={{ width: `${(currentTemplate.secondarySignatureWidth || 100) * 0.125}cqw` }}
                      className="pointer-events-none select-none object-contain mx-auto max-h-16"
                      alt="Secondary Signature"
                    />
                  ) : (
                    renderHandwrittenSignature(currentTemplate.secondarySignatoryName || 'Dr. Clara Masters', currentTemplate.signatureStyle || 'elegant')
                  )}
                  <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mt-1.5 leading-tight">{currentTemplate.secondarySignatoryTitle || 'Admissions Registrar'}</p>
                  
                  {/* Coordinate Tag */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none shrink-0 whitespace-nowrap">
                    <span>Signature 2 (L:{currentTemplate.secondarySignatureX || 70}%, T:{currentTemplate.secondarySignatureY || 78}%)</span>
                  </div>

                  {selectedElId === 'secondarySignature' && (
                    <>
                      {/* Quick Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteSelectedElement();
                        }}
                        className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                        title="Delete Signature"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Left handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'secondarySignature', 'left', currentTemplate.secondarySignatureWidth || 100)}
                        className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize signature width"
                      />
                      {/* Right handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'secondarySignature', 'right', currentTemplate.secondarySignatureWidth || 100)}
                        className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-600 rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize signature width"
                      />
                      {/* Top handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'secondarySignature', 'top', currentTemplate.secondarySignatureWidth || 100)}
                        className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-3 h-1.5 bg-indigo-600 rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize signature width"
                      />
                      {/* Bottom handle */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'secondarySignature', 'bottom', currentTemplate.secondarySignatureWidth || 100)}
                        className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-3 h-1.5 bg-indigo-600 rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize signature width"
                      />
                      {/* Corners */}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'secondarySignature', 'top-left', currentTemplate.secondarySignatureWidth || 100)}
                        className="absolute left-[-8px] top-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'secondarySignature', 'top-right', currentTemplate.secondarySignatureWidth || 100)}
                        className="absolute right-[-8px] top-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'secondarySignature', 'bottom-left', currentTemplate.secondarySignatureWidth || 100)}
                        className="absolute left-[-8px] bottom-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, 'secondarySignature', 'bottom-right', currentTemplate.secondarySignatureWidth || 100)}
                        className="absolute right-[-8px] bottom-[-8px] w-2 h-2 bg-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-50 border border-white shadow-sm"
                        title="Drag to resize"
                      />
                    </>
                  )}
                </div>
              )}

              {/* DYNAMIC STAMP / QR CODE */}
              {(currentTemplate.showQrCode || currentTemplate.showSeal) && (
                <div
                  id="canvas-item-seal"
                  onMouseDown={(e) => handleMouseDown(e, 'seal', currentTemplate.qrCodeX, currentTemplate.qrCodeY)}
                  onContextMenu={(e) => handleContextMenu(e, 'seal')}
                  style={{
                    position: 'absolute',
                    left: `${currentTemplate.qrCodeX}%`,
                    top: `${currentTemplate.qrCodeY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`cursor-pointer group z-30 flex items-center gap-1.5 select-none ${selectedElId === 'seal' ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-4 rounded' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-indigo-400 hover:outline-offset-2'}`}
                >
                  
                  {/* Elegant Simulated Stamp/Seal rendering */}
                  {currentTemplate.showSeal && (
                    <div 
                      style={{
                        width: `${(currentTemplate.sealWidth || 40) * 0.125}cqw`,
                        height: `${(currentTemplate.sealWidth || 40) * 0.125}cqw`,
                      }}
                      className="pointer-events-none select-none shrink-0"
                    >
                      {currentTemplate.sealType === 'classic' && (
                        <div className="w-full h-full rounded-full border-2 border-indigo-500/40 bg-indigo-500/5 text-indigo-500 flex items-center justify-center font-bold text-[1.2cqw] shadow-sm">
                          ★
                        </div>
                      )}
                      {currentTemplate.sealType === 'stellar' && (
                        <div className="w-full h-full bg-slate-900 border-2 border-dashed border-cyan-400 text-cyan-400 rounded-full flex items-center justify-center font-bold text-[1.2cqw] select-none">
                          ✧
                        </div>
                      )}
                      {currentTemplate.sealType === 'modern' && (
                        <div className="w-full h-full bg-emerald-500 text-neutral-900 p-1 flex items-center justify-center text-[0.8cqw] font-bold border rounded w-full h-full select-none">
                          SEAL
                        </div>
                      )}
                      {currentTemplate.sealType === 'crimson_wax' && (
                        <div className="w-full h-full bg-rose-700/80 border border-amber-500/30 text-amber-300 rounded-full flex items-center justify-center font-serif font-bold text-[0.9cqw] shadow-md select-none">
                          SEAL
                        </div>
                      )}
                      {currentTemplate.sealType === 'emerald_shield' && (
                        <div className="w-full h-full bg-emerald-900 border-2 border-amber-400 text-amber-300 rounded-md flex items-center justify-center font-bold text-[1.2cqw] select-none shadow">
                          ⛨
                        </div>
                      )}
                      {currentTemplate.sealType === 'gold_medallion' && (
                        <div className="w-full h-full bg-gradient-to-tr from-yellow-600 via-amber-400 to-yellow-600 border border-yellow-300 rounded-full flex items-center justify-center text-yellow-950 font-serif font-bold text-[0.9cqw] shadow-lg select-none">
                          🏆
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trust QR */}
                  {currentTemplate.showQrCode && (
                    <div 
                      style={{
                        width: `${(currentTemplate.qrCodeWidth || 32) * 0.125}cqw`,
                        height: `${(currentTemplate.qrCodeWidth || 32) * 0.125}cqw`,
                      }}
                      className="bg-white p-0.5 rounded-sm border border-slate-200 shadow-sm flex items-center justify-center select-none shrink-0"
                    >
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://glint.io/%23preview&color=0f172a" 
                        alt="Verification QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Coordinate Tag */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none shrink-0 whitespace-nowrap">
                    <span>Audit Seals (L:{currentTemplate.qrCodeX}%, T:{currentTemplate.qrCodeY}%)</span>
                  </div>

                  {selectedElId === 'seal' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteSelectedElement('seal');
                      }}
                      className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                      title="Delete Audit Seals"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                </div>
              )}

            </div>
          </div>

          {/* Guidelines hint footer */}
          <div className="mt-6 flex gap-4 text-xs text-slate-500 text-center font-semibold">
            <span className="flex items-center gap-1.5"><Grid className="w-4 h-4 text-slate-650" /> Alignment Assistant Connected</span>
            <span className="text-slate-800">|</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-slate-650" /> Fluid responsive visual coordinates mapping</span>
          </div>

        </div>

      </div>

      {/* Custom right-click context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 1000,
          }}
          className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-xl p-1.5 min-w-[160px] animate-fade-in text-slate-800 text-xs font-semibold select-none flex flex-col pointer-events-auto"
        >
          {contextMenu.targetId ? (
            <>
              <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400">
                Layer Operations
              </div>
              <button
                onClick={() => alignCenterHorizontally(contextMenu.targetId!)}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <AlignCenter className="w-3.5 h-3.5" /> Align Horizontally
              </button>
              <button
                onClick={() => alignCenterVertically(contextMenu.targetId!)}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <AlignCenter className="w-3.5 h-3.5 rotate-90" /> Align Vertically
              </button>
              <button
                onClick={() => resetElementSize(contextMenu.targetId!)}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <Sliders className="w-3.5 h-3.5" /> Reset Size
              </button>
              
              {contextMenu.targetId.startsWith('t-') && (
                <>
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400">
                    Text Alignment
                  </div>
                  <button
                    onClick={() => {
                      updateTextElementProperty(contextMenu.targetId!, 'align', 'left');
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" /> Align Left
                  </button>
                  <button
                    onClick={() => {
                      updateTextElementProperty(contextMenu.targetId!, 'align', 'center');
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <AlignCenter className="w-3.5 h-3.5" /> Align Center
                  </button>
                  <button
                    onClick={() => {
                      updateTextElementProperty(contextMenu.targetId!, 'align', 'right');
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <AlignRight className="w-3.5 h-3.5" /> Align Right
                  </button>

                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => bringToFront(contextMenu.targetId!)}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <Layers className="w-3.5 h-3.5" /> Bring to Front
                  </button>
                  <button
                    onClick={() => sendToBack(contextMenu.targetId!)}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <Layers className="w-3.5 h-3.5 opacity-60" /> Send to Back
                  </button>
                  <button
                    onClick={() => duplicateElement(contextMenu.targetId!)}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <Plus className="w-3.5 h-3.5" /> Duplicate Layer
                  </button>
                </>
              )}
              
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => {
                  deleteSelectedElement(contextMenu.targetId!);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-rose-50 hover:text-rose-600 text-rose-600 rounded-lg text-left"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Element
              </button>
            </>
          ) : (
            <>
              <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400">
                Insert Element
              </div>
              <button
                onClick={() => {
                  const { xPercent, yPercent } = getCanvasRelativeCoords(contextMenu.x, contextMenu.y);
                  insertTextAtCoords('heading', xPercent, yPercent);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <Type className="w-3.5 h-3.5 font-bold" /> Add Heading
              </button>
              <button
                onClick={() => {
                  const { xPercent, yPercent } = getCanvasRelativeCoords(contextMenu.x, contextMenu.y);
                  insertTextAtCoords('subheading', xPercent, yPercent);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left flex"
              >
                <Type className="w-3.5 h-3.5" /> Add Subheading
              </button>
              <button
                onClick={() => {
                  const { xPercent, yPercent } = getCanvasRelativeCoords(contextMenu.x, contextMenu.y);
                  insertTextAtCoords('body', xPercent, yPercent);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <Type className="w-3.5 h-3.5 opacity-60" /> Add Body Text
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Internal SVG Helper Chevron arrow
function ChevronSign() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}
