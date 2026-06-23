import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, User, Building, ArrowLeft } from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBackToHome: () => void;
}

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Trigger success callback
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-6 relative overflow-hidden font-sans">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Back to Home button */}
      <button
        type="button"
        onClick={onBackToHome}
        className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-2 text-xs font-semibold bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-lg border border-white/10 transition-all backdrop-blur-md cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      {/* Core Auth Panel Card */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 select-none">
          <svg className="w-12 h-12" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 16H23" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
          </svg>
          <h2 className="font-display font-extrabold text-white text-xl tracking-wider uppercase">Glint Registry</h2>
          <p className="text-xs text-slate-400">Secure cryptographic credentials issuance portal</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white/5 border border-white/5 p-1 rounded-xl relative">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${isLogin ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${!isLogin ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Create Account
          </button>
        </div>

        {/* Display Alert Banner */}
        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs flex gap-2.5 items-start">
            <span className="font-bold">⚠️</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {/* Full Name field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              {/* Organization/Workspace name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Organization Name</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Columbia Academy"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Address field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@glint.io"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-11 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
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

        {/* Demo Account Tip Box */}
        {isLogin && (
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-[10px] text-slate-400 space-y-1 select-none">
            <p className="font-bold text-amber-400 uppercase tracking-wider">💡 Seed Administrator Account</p>
            <p className="leading-relaxed">To access the default workspaces (Google Cloud, Stellar Academy, etc.), log in with:</p>
            <p className="font-mono mt-1 text-white"><span className="text-slate-400">User:</span> admin@glint.io</p>
            <p className="font-mono text-white"><span className="text-slate-400">Pass:</span> glintadmin2026</p>
          </div>
        )}

      </div>
    </div>
  );
}
