import React, { useState } from 'react';
import { X, ShieldCheck, ExternalLink, Copy, Check, Download, QrCode, Lock, Trash2 } from 'lucide-react';

// Helper: detect if URL is a base64 data URL
const isDataUrl = (url) => url && url.startsWith('data:');

// Helper: convert a base64 data URL to a Blob
const dataUrlToBlob = (dataUrl) => {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
};

// Helper: get a file extension from a mime type
const getExtFromMime = (dataUrl) => {
  if (dataUrl.includes('application/pdf')) return '.pdf';
  if (dataUrl.includes('image/png')) return '.png';
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return '.jpg';
  if (dataUrl.includes('image/webp')) return '.webp';
  return '.bin';
};

export default function ViewDocModal({ doc, onClose, onDelete }) {
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  const handleCopy = () => {
    if (doc.identifier) {
      navigator.clipboard.writeText(doc.identifier);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenUrl = () => {
    if (!doc.url) return;

    if (isDataUrl(doc.url)) {
      const blob = dataUrlToBlob(doc.url);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else {
      window.open(doc.url, '_blank');
    }
  };

  const handleDownload = () => {
    if (!doc.url) return;

    if (isDataUrl(doc.url)) {
      const blob = dataUrlToBlob(doc.url);
      const blobUrl = URL.createObjectURL(blob);
      const ext = getExtFromMime(doc.url);
      const fileName = `${doc.name || 'document'}${ext}`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } else {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Display-friendly URL text (truncate base64)
  const displayUrl = isDataUrl(doc.url)
    ? `${doc.url.substring(0, 45)}...`
    : doc.url || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/30">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Digital Wallet Pass</h3>
              <p className="text-[11px] text-slate-400">Verified by Government Digital Vault Mock</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pass Body Card */}
        <div className="p-6 space-y-6">
          <div className="relative rounded-2xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 p-6 border border-blue-500/30 shadow-inner overflow-hidden">
            
            {/* Background Seal watermark */}
            <div className="absolute right-3 top-3 opacity-10 pointer-events-none">
              <ShieldCheck className="w-44 h-44 text-white" />
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-800/50">
                  OFFICIAL DOCUMENT
                </span>
                <h2 className="text-2xl font-black text-white mt-2 tracking-tight">{doc.name}</h2>
              </div>
              <span className="badge-emerald text-xs px-3 py-1 rounded-full font-semibold flex items-center space-x-1">
                <Lock className="w-3 h-3 inline mr-1" /> Verified
              </span>
            </div>

            {/* Identifier Details */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Document Number / Identifier</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-base font-mono font-bold text-cyan-300 tracking-wider">
                    {doc.identifier}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                    title="Copy Identifier"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Issued To Email</p>
                <p className="text-sm font-medium text-slate-200 mt-1 truncate">{doc.email}</p>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-white p-1.5 rounded-lg flex items-center justify-center">
                  <QrCode className="w-full h-full text-slate-900" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">Scan for Verification</p>
                  <p className="text-[10px] text-slate-400">Cryptographically Signed Signature</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-slate-400">Export Status</p>
                <p className="text-xs font-bold text-slate-200">{doc.exported ? 'Exported' : 'Vault Stored'}</p>
              </div>
            </div>
          </div>

          {/* URL & Actions */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">Document Source</label>
            <div className="flex items-center space-x-2">
              <div className="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-slate-300 font-mono truncate">
                {isDataUrl(doc.url) ? '📎 Uploaded file (stored locally)' : displayUrl}
              </div>
              {doc.url && (
                <button
                  onClick={handleOpenUrl}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shrink-0 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                if (typeof onDelete === 'function') {
                  onDelete(doc);
                } else {
                  alert('Delete handler not available');
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-500 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            {doc.url && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
