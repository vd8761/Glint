const fs = require('fs');

const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// In loadWorkspaces
content = content.replace(
  "const res = await fetch('/api/workspaces', { headers: authHeaders });",
  `const res = await fetch('/api/workspaces', { headers: authHeaders });
      if (res.status === 401 || res.status === 403) {
        toast.error('Session expired. Please log in again.');
        onLogout();
        return;
      }`
);

// In loadWorkspaceData
content = content.replace(
  "const [programsRes, templatesRes, certsRes, emailsRes, analyticsRes, workspaceRes] = await Promise.all([",
  `const [programsRes, templatesRes, certsRes, emailsRes, analyticsRes, workspaceRes] = await Promise.all([`
);

content = content.replace(
  "if (programsRes.ok) setPrograms(await programsRes.json());",
  `if (programsRes.status === 401 || programsRes.status === 403) {
        toast.error('Session expired. Please log in again.');
        onLogout();
        return;
      }
      if (programsRes.ok) setPrograms(await programsRes.json());`
);

fs.writeFileSync(file, content);
console.log('Fixed 401 handling');
