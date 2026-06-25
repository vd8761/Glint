const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Exact matches replacement
content = content.replace(/app\.get\('\/api\/workspaces',\s*async\s*\(req/g, "app.get('/api/workspaces', authenticateToken, async (req");
content = content.replace(/app\.post\('\/api\/workspaces',\s*async\s*\(req/g, "app.post('/api/workspaces', authenticateToken, async (req");
content = content.replace(/app\.get\('\/api\/programs',\s*async\s*\(req/g, "app.get('/api/programs', authenticateToken, async (req");
content = content.replace(/app\.get\('\/api\/templates',\s*async\s*\(req/g, "app.get('/api/templates', authenticateToken, async (req");
// For certificates, only protect the list route, not the by-id route
content = content.replace(/app\.get\('\/api\/certificates',\s*async\s*\(req/g, "app.get('/api/certificates', authenticateToken, async (req");
content = content.replace(/app\.get\('\/api\/email-logs',\s*async\s*\(req/g, "app.get('/api/email-logs', authenticateToken, async (req");
content = content.replace(/app\.get\('\/api\/analytics',\s*async\s*\(req/g, "app.get('/api/analytics', authenticateToken, async (req");

// Replace admin hardcode
content = content.replace(/req\.user\.email\s*===\s*'admin@gmail\.com'/g, "req.user.role === 'admin'");
content = content.replace(/req\.user\s*&&\s*req\.user\.email\s*===\s*'admin@gmail\.com'/g, "req.user && req.user.role === 'admin'");

// Replace err.message leakage in res.status().json()
content = content.replace(/error:\s*\(err\s+as\s+Error\)\.message/g, "error: 'Internal Server Error'");
content = content.replace(/error:\s*err\.message\s*\|\|\s*'([^']+)'/g, "error: '$1'");
content = content.replace(/error:\s*err\.message/g, "error: 'Internal Server Error'");

// Add rate limiter to public certificate endpoints
content = content.replace(/app\.get\('\/api\/certificates\/:id',\s*async\s*\(req/g, "app.get('/api/certificates/:id', apiLimiter, async (req");
content = content.replace(/app\.post\('\/api\/certificates\/:id\/stats',\s*async\s*\(req/g, "app.post('/api/certificates/:id/stats', apiLimiter, async (req");
content = content.replace(/app\.post\('\/api\/certificates\/:id\/verify',\s*async\s*\(req/g, "app.post('/api/certificates/:id/verify', apiLimiter, async (req");

fs.writeFileSync('server.ts', content);
console.log('Fixed auth and error messages');
