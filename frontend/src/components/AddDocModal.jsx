import React, { useState } from 'react';
import { X, PlusCircle, CreditCard, FileCheck, Car, ShieldCheck, Award, Link, Check, AlertCircle, FileText, Upload, File, ScrollText, UserCheck, Vote } from 'lucide-react';
import { addDocument } from '../services/api';

const GOVT_CERTIFICATE_PRESETS = [
  { name: 'Aadhaar', category: 'Identity', icon: CreditCard, placeholder: '1234 5678 9012', sampleUrl: 'https://example.com/docs/aadhaar-sample.pdf' },
  { name: 'PAN Card', category: 'Taxation', icon: FileCheck, placeholder: 'ABCDE1234F', sampleUrl: 'https://example.com/docs/pan-sample.pdf' },
  { name: 'Driving Licence', category: 'Transport', icon: Car, placeholder: 'DL-1420110012345', sampleUrl: 'https://example.com/docs/dl-sample.pdf' },
  { name: 'Passport', category: 'Travel', icon: ShieldCheck, placeholder: 'Z1234567', sampleUrl: 'https://example.com/docs/passport-sample.pdf' },
  { name: 'Marksheet / Degree', category: 'Education', icon: Award, placeholder: 'CBSE-2023-887123', sampleUrl: 'https://example.com/docs/marksheet-sample.pdf' },
  { name: 'Income Certificate', category: 'Revenue', icon: FileText, placeholder: 'REV-INC-2026-09812', sampleUrl: 'https://example.com/docs/income-cert.pdf' },
  { name: 'Caste Certificate', category: 'Revenue', icon: UserCheck, placeholder: 'COMM-CST-441209', sampleUrl: 'https://example.com/docs/caste-cert.pdf' },
  { name: 'Birth Certificate', category: 'Civil', icon: ScrollText, placeholder: 'REG-BRTH-2024-811', sampleUrl: 'https://example.com/docs/birth-cert.pdf' },
  { name: 'Voter ID', category: 'Identity', icon: Vote, placeholder: 'EPIC-887123901', sampleUrl: 'https://example.com/docs/voterid-sample.pdf' },
  { name: 'Custom Certificate', category: 'Other Govt Doc', icon: PlusCircle, placeholder: 'DOC-NUM-99120', sampleUrl: '' }
];

export default function AddDocModal({ user, onClose, onDocAdded }) {
  const [selectedPreset, setSelectedPreset] = useState(GOVT_CERTIFICATE_PRESETS[0]);
  const [name, setName] = useState(GOVT_CERTIFICATE_PRESETS[0].name);
  const [identifier, setIdentifier] = useState('');
  const [url, setUrl] = useState(GOVT_CERTIFICATE_PRESETS[0].sampleUrl);
  const [fileName, setFileName] = useState('');
  const [uploadType, setUploadType] = useState('link'); // 'link' or 'file'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    if (preset.name === 'Custom Certificate') {
      setName('');
    } else {
      setName(preset.name);
    }
    setUrl(preset.sampleUrl || '');
    setIdentifier('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    
    // Auto populate document name if empty
    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, ""));
    }

    // Convert file to Base64 Data URL for instant storage
    const reader = new FileReader();
    reader.onload = () => {
      setUrl(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !identifier.trim() || !url.trim()) {
      setError('Please fill out document name, identifier number, and attach file or link.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addDocument({
        name: name.trim(),
        email: user.email,
        identifier: identifier.trim(),
        url: url.trim(),
        category: selectedPreset?.category || 'Government Certificate'
      });
      setLoading(false);
      onDocAdded();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to add document');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/40">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add Government Certificate to Vault</h3>
              <p className="text-[11px] text-slate-400">Upload or link any official government document or certificate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Category Pickers */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block">Document Category Presets</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {GOVT_CERTIFICATE_PRESETS.map((item) => {
                const ItemIcon = item.icon;
                const isSelected = selectedPreset?.name === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSelectPreset(item)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600/25 border-blue-500 text-cyan-300 shadow-md shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <ItemIcon className="w-4 h-4 mb-1" />
                    <span className="truncate w-full text-center text-[10px]">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Document Name Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Document Name</label>
              <span className="text-[10px] text-blue-400 font-mono">Editable / Custom Name</span>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Income Certificate, Community Certificate, Degree"
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-medium"
            />
          </div>

          {/* Document Identifier Field */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Document Identifier / Reference Number</label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={selectedPreset?.placeholder || 'Enter official document unique serial/reg number'}
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono tracking-wider"
            />
          </div>

          {/* File Upload Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">Document File or Link</label>
              <div className="flex space-x-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUploadType('link')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    uploadType === 'link' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  URL Link
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('file')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    uploadType === 'file' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {uploadType === 'link' ? (
              <div className="relative">
                <input
                  type="url"
                  required={uploadType === 'link'}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono"
                />
                <Link className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-900/50 rounded-2xl cursor-pointer transition-colors group">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400 mb-1 transition-colors" />
                  <span className="text-xs font-medium text-slate-300">
                    {fileName ? fileName : 'Click to upload PDF or Image file'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Supports PDF, JPG, PNG, WEBP</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Linked User Account */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Linked Account:</span>
            <span className="font-mono text-slate-200">{user?.email}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center space-x-1.5 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {loading ? (
                <span>Adding Document...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save to Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
