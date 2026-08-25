import React, { useState } from 'react';
import { User, Mail, ShieldCheck, Key, Copy, Check, LogOut, Lock, Terminal } from 'lucide-react';
import { getAuthToken } from '../services/api';

export default function Profile({ user, onLogout }) {
  const [copied, setCopied] = useState(false);
  const token = getAuthToken() || 'No token active';

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Account & Security Profile</h1>
        <p className="text-xs text-slate-400">Manage your digital vault session and access credentials</p>
      </div>

      {/* User Details Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-indigo-950/40 shadow-xl space-y-6">
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-600/30">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name || user?.email?.split('@')[0]}</h2>
            <p className="text-xs text-cyan-400 font-mono mt-0.5">{user?.email}</p>
            <span className="inline-flex items-center space-x-1 mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full badge-emerald">
              <ShieldCheck className="w-3 h-3 inline mr-1" /> Verified DigiMocker Partner Account
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
              <Mail className="w-4 h-4 text-blue-400" />
              <span>Registered Email</span>
            </div>
            <p className="text-sm font-semibold text-white font-mono">{user?.email}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Session Type</span>
            </div>
            <p className="text-sm font-semibold text-white">JWT Encrypted Bearer Token</p>
          </div>
        </div>
      </div>

      {/* Auth Token Inspector Box */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Authentication Header Token</h3>
          </div>
          <button
            onClick={handleCopyToken}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Token</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          This token is automatically attached to request headers as <code className="text-cyan-300">auth-token</code> for all DigiMocker backend API calls.
        </p>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 font-mono break-all max-h-24 overflow-y-auto">
          {token}
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={onLogout}
          className="px-6 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center space-x-2 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Vault</span>
        </button>
      </div>

    </div>
  );
}
