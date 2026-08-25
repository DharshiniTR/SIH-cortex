import React, { useState } from 'react';
import { Wallet, ShieldCheck, Lock, Mail, User, AlertCircle, ArrowRight, Key, Sparkles } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function Auth({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [mobile, setMobile] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation matching backend Joi constraints
    if (isRegister && name.trim().length < 6) {
      setError('Name must be at least 6 characters long');
      return;
    }
    if (email.trim().length < 6 || !email.includes('@')) {
      setError('Email must be a valid email address (at least 6 characters)');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (isRegister && mobile.length !== 10) {
      setError('Mobile must be exactly 10 digits');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await registerUser(name.trim(), email.trim(), password, mobile);
        setSuccessMsg('Registration successful! Logging you in...');
        setTimeout(async () => {
          const authData = await loginUser(email.trim(), password);
          setLoading(false);
          onLoginSuccess(authData);
        }, 1200);
      } else {
        const authData = await loginUser(email.trim(), password);
        setLoading(false);
        onLoginSuccess(authData);
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#090d16] relative overflow-hidden">

      {/* Dynamic Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">

        {/* Left Hero Card */}
        <div className="hidden md:flex flex-col justify-between h-full p-8 rounded-3xl glass-panel border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-indigo-950/40 shadow-2xl">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">DigiMocker</h1>
                <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Digital Document Wallet</p>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-white leading-tight mb-3">
              Your Complete Government & Personal Document Vault
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Store, view, export, and manage mock Aadhaar, PAN Card, Driving Licence, and credentials safely with instant API integration.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-800">
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>JWT Auth Token Secured Sessions</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>AES Encryption Ready Schema Storage</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Instant Verification & Download Actions</span>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-700/60 shadow-2xl bg-slate-950/80">

          {/* Header Mobile Brand */}
          <div className="md:hidden flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">DigiMocker Vault</span>
          </div>

          {/* Form Switcher Tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800 mb-6">
            <button
              onClick={() => { setIsRegister(false); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${!isRegister
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isRegister
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {isRegister && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@email.com"
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                  autoComplete="off"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                  autoComplete="new-password"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Mobile Number</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    placeholder="10-digit Mobile Number"
                    className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    autoComplete="off"
                  />
                  <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>
            )}


            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Register Account' : 'Access Digital Vault'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>



        </div>
      </div>
    </div>
  );
}
