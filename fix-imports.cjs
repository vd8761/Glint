const fs = require('fs');

const files = [
  'src/components/CertificateViewer.tsx',
  'src/components/Dashboard.tsx',
  'src/components/AdminDashboard.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/import \{ toast \} from 'sonner';\nimport \{ toast \} from 'sonner';/, "import { toast } from 'sonner';");
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed duplicate imports');
