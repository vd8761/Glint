const fs = require('fs');
const glob = require('glob'); // Not available by default, I will just iterate known files

const files = [
  'src/components/AdminDashboard.tsx',
  'src/components/CanvaEditor.tsx',
  'src/components/CertificateViewer.tsx',
  'src/components/Dashboard.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Add import if not exists
  if (!content.includes("import { toast } from 'sonner';")) {
    // find the last import and add it after
    content = content.replace(/import .*?;\n/g, match => match); // just to match
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfImport = content.indexOf('\\n', lastImportIndex);
      content = content.slice(0, endOfImport + 1) + "import { toast } from 'sonner';\\n" + content.slice(endOfImport + 1);
    } else {
      content = "import { toast } from 'sonner';\\n" + content;
    }
    
    // Better way to add import
    content = "import { toast } from 'sonner';\n" + content;
  }
  
  // Replace alerts
  content = content.replace(/alert\((.*?(?:successfully|Success).*?)\)/gi, 'toast.success($1)');
  content = content.replace(/alert\(/g, 'toast.error(');
  
  fs.writeFileSync(file, content);
});

console.log('Fixed alerts');
