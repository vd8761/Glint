import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CanvaEditor } from './components/CanvaEditor';
import type { CertificateTemplate } from './types';
import './index.css';

const sampleTemplate: CertificateTemplate = {
  id: 'demo-tpl',
  workspaceId: 'demo-ws',
  name: 'Demo Template',
  layout: 'landscape',
  backgroundColor: '#FFFFFF',
  borderColor: '#C9A227',
  borderWidth: 4,
  borderRadius: 8,
  borderStyle: 'solid',
  showSeal: true,
  sealType: 'classic',
  showQrCode: true,
  qrCodeX: 88,
  qrCodeY: 82,
  qrCodeWidth: 32,
  logoX: 50,
  logoY: 12,
  logoWidth: 100,
  signatureX: 25,
  signatureY: 82,
  signatureWidth: 90,
  signatoryName: 'Jane Doe',
  signatoryTitle: 'Chancellor',
  textElements: [
    { id: 'et1', text: 'CERTIFICATE OF ACHIEVEMENT', fontSize: 30, fontFamily: 'Space Grotesk', fontWeight: 'bold', color: '#0F172A', xPercent: 50, yPercent: 26, align: 'center' },
    { id: 'et2', text: 'This is proudly presented to', fontSize: 12, fontFamily: 'Inter', fontWeight: 'normal', color: '#64748B', xPercent: 50, yPercent: 38, align: 'center' },
    { id: 'et3', text: '{{name}}', fontSize: 40, fontFamily: 'Playfair Display', fontWeight: 'bold', color: '#1a73e8', xPercent: 50, yPercent: 50, align: 'center', isPlaceholder: true },
    { id: 'et4', text: 'for outstanding completion of {{program}}', fontSize: 12, fontFamily: 'Inter', fontWeight: 'normal', color: '#64748B', xPercent: 50, yPercent: 62, align: 'center' },
  ],
};

function Harness() {
  // `template` + `mountKey` together simulate close+reopen: on save we swap in the
  // saved template and bump the key to force a fresh CanvaEditor mount.
  const [template, setTemplate] = useState<CertificateTemplate>(sampleTemplate);
  const [mountKey, setMountKey] = useState(0);
  (window as any).__reopenCount = mountKey;
  return (
    <div className="h-screen w-screen">
      <CanvaEditor
        key={mountKey}
        template={template}
        onSave={(t) => {
          (window as any).__lastSaved = t;
          setTemplate(JSON.parse(JSON.stringify(t))); // deep copy, like Dashboard
          setMountKey((k) => k + 1); // remount = reopen
        }}
        onCancel={() => console.log('cancel')}
        brandName="Demo"
        primaryColor="#4f46e5"
        token={null}
        programs={[]}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
