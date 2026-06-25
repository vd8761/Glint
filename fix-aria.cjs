const fs = require('fs');

const file = 'src/components/LandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<button onClick=\{onSelectWorkspace\} className="bg-slate-900 text-white/,
  '<button aria-label="Open your dashboard" onClick={onSelectWorkspace} className="bg-slate-900 text-white'
);

content = content.replace(
  /<button onClick=\{onStartFree\} className="bg-slate-950 text-white/,
  '<button aria-label="Start free trial" onClick={onStartFree} className="bg-slate-950 text-white'
);

content = content.replace(
  /<input\s+type="text"\s+placeholder="Enter Certificate ID"/,
  '<input aria-label="Certificate ID to verify" type="text" placeholder="Enter Certificate ID"'
);

fs.writeFileSync(file, content);
console.log('Added ARIA labels');
