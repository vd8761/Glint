const fs = require('fs');

const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add empty state for programs
content = content.replace(
  /<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*\)}/s,
  (match) => {
    if (match.includes('No Programs Found')) return match;
    return `{programs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-8 py-16 text-center text-slate-500 bg-white">
                              <div className="flex flex-col items-center justify-center space-y-3">
                                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                                  <Layers className="w-6 h-6 text-indigo-400" />
                                </div>
                                <h3 className="font-bold text-slate-700 text-sm">No Programs Found</h3>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">Create a certificate program to start issuing credentials to your recipients.</p>
                                <button onClick={() => setShowProgramForm(true)} className="mt-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold underline transition-colors">
                                  Create First Program
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      ` + match;
  }
);

fs.writeFileSync(file, content);
console.log('Added empty state');
