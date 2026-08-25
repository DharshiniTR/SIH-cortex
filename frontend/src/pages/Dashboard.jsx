import React from 'react';
import { ShieldCheck, FileText, PlusCircle, CreditCard, FileCheck, Car, Award, RefreshCw, Layers } from 'lucide-react';
import DocCard from '../components/DocCard';

const CATEGORIES = [
  { key: 'Aadhaar', label: 'Aadhaar Card', icon: CreditCard, color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
  { key: 'PAN', label: 'PAN Card', icon: FileCheck, color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  { key: 'Driving Licence', label: 'Driving Licence', icon: Car, color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  { key: 'Passport', label: 'Passport', icon: ShieldCheck, color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' },
  { key: 'Marksheet', label: 'Academic Marksheet', icon: Award, color: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
];

export default function Dashboard({ user, documents, loading, onRefresh, onViewDoc, onOpenAddDoc, onDeleteDoc }) {
  const userDisplayName = user?.name || user?.email?.split('@')[0] || 'User';

  const getDocCountForCategory = (catName) => {
    return documents.filter(d => d.name?.toLowerCase().includes(catName.toLowerCase())).length;
  };

  const getDocForCategory = (catName) => {
    return documents.find(d => d.name?.toLowerCase().includes(catName.toLowerCase()));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Welcome Banner */}
      <div className="relative rounded-3xl glass-panel p-6 sm:p-8 border border-blue-500/25 bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-indigo-950/60 overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DigiMocker Vault Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="text-cyan-400">{userDisplayName}</span> 👋
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Access your digital documents anytime, anywhere. All documents are cryptographically mapped to your user account.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors"
              title="Refresh Documents"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onOpenAddDoc}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/25 transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Add Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Documents</p>
            <p className="text-2xl font-black text-white">{documents.length}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Verified Badges</p>
            <p className="text-2xl font-black text-white">{documents.length}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Categories</p>
            <p className="text-2xl font-black text-white">5 Standard</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Account Status</p>
            <p className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider mt-1">Active Partner</p>
          </div>
        </div>
      </div>

      {/* Primary Category Quick Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Government & Identity Cards</h2>
            <p className="text-xs text-slate-400">Quick access to standard Indian identity documents</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => {
            const count = getDocCountForCategory(cat.key);
            const docInstance = getDocForCategory(cat.key);
            const Icon = cat.icon;

            return (
              <div
                key={cat.key}
                className={`glass-panel p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-44 ${
                  count > 0 ? cat.color : 'border-slate-800/80 bg-slate-950/40 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900/90 border border-slate-700/60 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    {count > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {count} Issued
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        Available
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-white">{cat.label}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {count > 0 ? docInstance?.identifier || 'Issued' : 'Not added yet'}
                  </p>
                </div>

                <div>
                  {count > 0 && docInstance ? (
                    <button
                      onClick={() => onViewDoc(docInstance)}
                      className="w-full py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border border-slate-700/60 text-xs font-semibold transition-colors"
                    >
                      View Card
                    </button>
                  ) : (
                    <button
                      onClick={onOpenAddDoc}
                      className="w-full py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors"
                    >
                      + Issue Doc
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Documents Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Recent Documents</h2>
            <p className="text-xs text-slate-400">All document passes currently stored in your account</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-panel rounded-2xl h-48 animate-pulse bg-slate-900/50 border border-slate-800"></div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center border border-slate-800 bg-slate-950/40 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No documents in your vault</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                Add your first document like Aadhaar, PAN Card, or Driving Licence to get started.
              </p>
            </div>
            <button
              onClick={onOpenAddDoc}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all inline-flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Document Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents.map((doc) => (
              <DocCard
                key={doc._id || doc.identifier || doc.name}
                doc={doc}
                onView={onViewDoc}
                onDelete={onDeleteDoc}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
