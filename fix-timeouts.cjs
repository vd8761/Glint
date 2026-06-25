const fs = require('fs');

const fixSetTimeout = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('const timeoutRefs')) {
    // Add useRef import if needed
    if (!content.includes('useRef')) {
      content = content.replace(/import React, \{([^}]+)\}/, "import React, { useRef, $1 }");
    }
    
    // Add timeoutRefs inside component
    content = content.replace(/export function ([^()]+)\([^)]*\)\s*\{/, "export function $1(props: any) {\n  const timeoutRefs = useRef<any[]>([]);\n  React.useEffect(() => () => timeoutRefs.current.forEach(clearTimeout), []);");
    
    // Replace setTimeout with push
    content = content.replace(/setTimeout\(/g, "timeoutRefs.current.push(setTimeout(");
    
    // Fix the closing parentheses. This is tricky with regex. 
    // Wait, replacing setTimeout with a wrapper is better:
    // const safeSetTimeout = (cb, ms) => timeoutRefs.current.push(setTimeout(cb, ms));
  }
};

// Actually, rewriting the whole file with a script for nested parens is hard.
// Let's just do it manually with multi_replace_file_content.
