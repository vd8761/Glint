const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Replace JWT_SECRET with SAFE_JWT_SECRET in jwt.sign calls
content = content.replace(/jwt\.sign\(\s*([\s\S]*?),\s*JWT_SECRET,\s*([\s\S]*?)\)/g, "jwt.sign($1, SAFE_JWT_SECRET, $2)");

fs.writeFileSync('server.ts', content);
console.log('Fixed JWT_SECRET inside jwt.sign');
