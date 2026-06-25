const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Inject the helper at the top after imports
const helper = `
// Tenant Isolation Helper
const enforceWorkspaceAccess = (req, resourceWorkspaceId, res) => {
  if (req.user && req.user.role === 'admin') return true;
  if (req.user && req.user.workspaceId === resourceWorkspaceId) return true;
  res.status(403).json({ error: 'Forbidden: Workspace access denied' });
  return false;
};
`;

if (!content.includes('enforceWorkspaceAccess')) {
  content = content.replace('const app = express();', helper + '\nconst app = express();');
}

// 1. GET /api/workspaces
content = content.replace(
  /app\.get\('\/api\/workspaces',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s+result\s*=\s*await\s+pool\.query\('SELECT\s+\*\s+FROM\s+workspaces'\);/g,
  `app.get('/api/workspaces', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user && req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM workspaces');
    } else {
      result = await pool.query('SELECT * FROM workspaces WHERE id = $1', [req.user.workspaceId]);
    }`
);

// 2. GET /api/workspaces/:id
content = content.replace(
  /app\.get\('\/api\/workspaces\/:id',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{/g,
  `app.get('/api/workspaces/:id', authenticateToken, async (req, res) => {
  try {
    if (!enforceWorkspaceAccess(req, req.params.id, res)) return;`
);

// 3. PUT /api/workspaces/:id
content = content.replace(
  /app\.put\('\/api\/workspaces\/:id',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{/g,
  `app.put('/api/workspaces/:id', authenticateToken, async (req, res) => {
  try {
    if (!enforceWorkspaceAccess(req, req.params.id, res)) return;`
);

// 4. GET /api/programs
content = content.replace(
  /app\.get\('\/api\/programs',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s*workspaceId\s*=\s*req\.query\.workspaceId;/g,
  `app.get('/api/programs', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId;
    if (workspaceId && !enforceWorkspaceAccess(req, workspaceId, res)) return;`
);

// 5. POST /api/programs
content = content.replace(
  /app\.post\('\/api\/programs',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s*\{\s*name,\s*description,\s*workspaceId,\s*templateId\s*\}\s*=\s*req\.body;/g,
  `app.post('/api/programs', authenticateToken, async (req, res) => {
  try {
    const { name, description, workspaceId, templateId } = req.body;
    if (!enforceWorkspaceAccess(req, workspaceId, res)) return;`
);

// 6. PUT /api/programs/:id
content = content.replace(
  /app\.put\('\/api\/programs\/:id',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s*result\s*=\s*await\s+pool\.query\('SELECT\s+\*\s+FROM\s+programs\s+WHERE\s+id\s*=\s*\$1',\s*\[req\.params\.id\]\);\s*if\s*\(result\.rows\.length\s*===\s*0\)\s*return\s*res\.status\(404\)\.json\(\{ error: 'Program not found' \}\);\s*const\s*current\s*=\s*result\.rows\[0\];/g,
  `app.put('/api/programs/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    const current = result.rows[0];
    if (!enforceWorkspaceAccess(req, current.workspace_id, res)) return;`
);

// 7. DELETE /api/programs/:id
content = content.replace(
  /app\.delete\('\/api\/programs\/:id',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s*result\s*=\s*await\s+pool\.query\('SELECT\s+\*\s+FROM\s+programs\s+WHERE\s+id\s*=\s*\$1',\s*\[req\.params\.id\]\);\s*if\s*\(result\.rows\.length\s*===\s*0\)\s*return\s*res\.status\(404\)\.json\(\{ error: 'Program not found' \}\);/g,
  `app.delete('/api/programs/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    if (!enforceWorkspaceAccess(req, result.rows[0].workspace_id, res)) return;`
);

// 8. GET /api/templates
content = content.replace(
  /app\.get\('\/api\/templates',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s*workspaceId\s*=\s*req\.query\.workspaceId;/g,
  `app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId;
    if (workspaceId && !enforceWorkspaceAccess(req, workspaceId, res)) return;`
);

// 9. POST /api/templates
content = content.replace(
  /app\.post\('\/api\/templates',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s*template\s*=\s*req\.body;/g,
  `app.post('/api/templates', authenticateToken, async (req, res) => {
  try {
    const template = req.body;
    if (!enforceWorkspaceAccess(req, template.workspaceId, res)) return;`
);

// 10. PUT /api/templates/:id
content = content.replace(
  /app\.put\('\/api\/templates\/:id',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s*result\s*=\s*await\s+pool\.query\('SELECT\s+\*\s+FROM\s+templates\s+WHERE\s+id\s*=\s*\$1',\s*\[req\.params\.id\]\);\s*if\s*\(result\.rows\.length\s*===\s*0\)\s*return\s*res\.status\(404\)\.json\(\{ error: 'Template not found' \}\);\s*const\s*current\s*=\s*result\.rows\[0\];/g,
  `app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    const current = result.rows[0];
    if (!enforceWorkspaceAccess(req, current.workspace_id, res)) return;`
);

// 11. DELETE /api/templates/:id
content = content.replace(
  /app\.delete\('\/api\/templates\/:id',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*try\s*\{\s*const\s*result\s*=\s*await\s+pool\.query\('SELECT\s+\*\s+FROM\s+templates\s+WHERE\s+id\s*=\s*\$1',\s*\[req\.params\.id\]\);\s*if\s*\(result\.rows\.length\s*===\s*0\)\s*return\s*res\.status\(404\)\.json\(\{ error: 'Template not found' \}\);/g,
  `app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    if (!enforceWorkspaceAccess(req, result.rows[0].workspace_id, res)) return;`
);

fs.writeFileSync('server.ts', content);
console.log('Fixed tenant isolation');
