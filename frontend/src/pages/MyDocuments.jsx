import React, { useState } from 'react';
import { Search, Filter, PlusCircle, FileText, AlertCircle } from 'lucide-react';
import DocCard from '../components/DocCard';

export default function MyDocuments({ documents, loading, onViewDoc, onOpenAddDoc, onDeleteDoc }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      (doc.name && doc.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.identifier && doc.identifier.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'id') {
      const name = (doc.name || '').toLowerCase();
      return name.includes('aadhar') || name.includes('pan') || name.includes('dl') || name.includes('passport');
    }
    if (categoryFilter === 'education') {
      const name = (doc.name || '').toLowerCase();
      return name.includes('mark') || name.includes('certif') || name.includes('degree');
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">My Documents</h1>
          <p className="text-xs text-slate-400">View and manage all stored digital document passes</p>
        </div>

        <button
          onClick={onOpenAddDoc}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/25 transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Document</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by document name or ID..."
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Docs ({documents.length})
          </button>

          <button
            onClick={() => setCategoryFilter('id')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === 'id'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Identity Cards
          </button>

          <button
            onClick={() => setCategoryFilter('education')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === 'education'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Certificates
          </button>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel rounded-2xl h-48 animate-pulse bg-slate-900/50 border border-slate-800"></div>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 bg-slate-950/40 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No matching documents found</h3>
            <p className="text-slate-400 text-xs mt-1">
              Try adjusting your search criteria or add a new document to your vault.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
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
  );
}
