import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, User, Building, ArrowLeft, AlertCircle, X } from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBackToHome: () => void;
}

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

const getErrorTitle = (msg: string) => {
  const lowercaseMsg = msg.toLowerCase();
  if (lowercaseMsg.includes('email or password') || lowercaseMsg.includes('credentials')) {
    return 'Invalid Credentials';
  }
  if (lowercaseMsg.includes('already exists') || lowercaseMsg.includes('registered')) {
    return 'Account Already Exists';
  }
  return 'Authentication Error';
};

export function AuthPage({ onLoginSuccess, onBackToHome }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple validation
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isLogin && (!name || !workspaceName)) {
      setError('Please fill in your name and workspace name.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password }
        : { email, password, name, workspaceName };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        const isHtml = text.trim().startsWith('<') || text.includes('<html>');
        const errorMessage = isHtml 
          ? `Server error (${response.status}): The server encountered an unexpected error. Please check backend logs.`
          : text || `Server returned status ${response.status}`;
        throw new Error(errorMessage);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Trigger success callback
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      const friendlyMessage = err.message && err.message.includes('Unexpected token')
        ? 'Failed to parse server response. The server may have returned an unexpected error page.'
        : err.message || 'An unexpected error occurred during authentication.';
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 sm:p-6 relative overflow-hidden font-sans">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Back to Home button */}
      <button
        type="button"
        onClick={onBackToHome}
        className="sm:absolute sm:top-6 sm:left-6 mb-4 sm:mb-0 text-slate-600 hover:text-slate-900 flex items-center gap-2 text-xs font-semibold bg-white hover:bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 transition-all shadow-sm cursor-pointer relative z-20"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      {/* Core Auth Panel Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 select-none">
          <svg className="w-12 h-12" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 16H23" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
          </svg>
          <h2 className="font-display font-extrabold text-slate-950 text-xl tracking-wider uppercase">Glint Registry</h2>
          <p className="text-xs text-slate-500">Secure cryptographic credentials issuance portal</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl relative">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-slate-950 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-slate-950 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Create Account
          </button>
        </div>

        {/* Display Alert Banner */}
        {error && (
          <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5 text-xs flex gap-3 items-start animate-fade-in relative z-10 shadow-sm backdrop-blur-sm">
            <div className="bg-rose-100 rounded-lg p-1.5 text-rose-600 shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 space-y-0.5 pr-6">
              <h4 className="font-display font-extrabold uppercase tracking-wider text-[10px] text-rose-950">
                {getErrorTitle(error)}
              </h4>
              <p className="text-rose-850 leading-relaxed text-[11px] font-medium">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="absolute top-3.5 right-3.5 text-rose-400 hover:text-rose-700 transition-colors rounded-lg p-0.5 hover:bg-rose-100/50"
              title="Dismiss warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {/* Full Name field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(capitalizeWords(e.target.value))}
                    placeholder="Jane Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Organization/Workspace name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Organization Name</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(capitalizeWords(e.target.value))}
                    placeholder="Columbia Academy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Address field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organisation.com"
                autoComplete="email"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? undefined : 12}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-11 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Length, not composition rules — NIST SP 800-63B. The server enforces the same. */}
            {!isLogin && (
              <p className="text-[10px] text-slate-400">At least 12 characters. A passphrase is fine.</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Processing...
              </>
            ) : (
              <>{isLogin ? 'Access Workspace Console' : 'Initialize Enterprise Console'}</>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
