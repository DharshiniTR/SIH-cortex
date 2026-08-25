import React from 'react';
import { ShieldCheck, Eye, Download, Trash2, ExternalLink, CreditCard, FileCheck, Car, Award, FileText } from 'lucide-react';

const getDocTypeMeta = (docName = '') => {
  const nameLower = docName.toLowerCase();
  if (nameLower.includes('aadhar') || nameLower.includes('aadhaar')) {
    return {
      label: 'Aadhaar Card',
      icon: CreditCard,
      color: 'from-amber-500/20 via-orange-600/10 to-amber-900/30',
      borderColor: 'border-amber-500/30',
      badgeClass: 'badge-amber',
      typeCode: 'UIDAI Verified'
    };
  } else if (nameLower.includes('pan')) {
    return {
      label: 'PAN Card',
      icon: FileCheck,
      color: 'from-blue-500/20 via-indigo-600/10 to-blue-900/30',
      borderColor: 'border-blue-500/30',
      badgeClass: 'badge-blue',
      typeCode: 'Income Tax Dept'
    };
  } else if (nameLower.includes('dl') || nameLower.includes('driving')) {
    return {
      label: 'Driving Licence',
      icon: Car,
      color: 'from-emerald-500/20 via-teal-600/10 to-emerald-900/30',
      borderColor: 'border-emerald-500/30',
      badgeClass: 'badge-emerald',
      typeCode: 'Transport Dept'
    };
  } else if (nameLower.includes('passport')) {
    return {
      label: 'Passport',
      icon: ShieldCheck,
      color: 'from-cyan-500/20 via-blue-600/10 to-cyan-900/30',
      borderColor: 'border-cyan-500/30',
      badgeClass: 'badge-blue',
      typeCode: 'Ministry of External Affairs'
    };
  } else if (nameLower.includes('mark') || nameLower.includes('certificate')) {
    return {
      label: 'Academic Marksheet',
      icon: Award,
      color: 'from-purple-500/20 via-violet-600/10 to-purple-900/30',
      borderColor: 'border-purple-500/30',
      badgeClass: 'badge-blue',
      typeCode: 'Education Board'
    };
  }
  return {
    label: docName || 'Government Document',
    icon: FileText,
    color: 'from-slate-700/30 via-slate-800/20 to-slate-900/40',
    borderColor: 'border-slate-700/50',
    badgeClass: 'badge-emerald',
    typeCode: 'Digital Vault Verified'
  };
};

export default function DocCard({ doc, onView, onDelete }) {
  const meta = getDocTypeMeta(doc.name);
  const IconComponent = meta.icon;

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!doc.url) {
      alert('Document URL not available for download.');
      return;
    }

    if (doc.url.startsWith('data:')) {
      // Base64 data URL — convert to blob and download
      const [header, base64] = doc.url.split(',');
      const mimeMatch = header.match(/data:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      let ext = '.bin';
      if (mime.includes('pdf')) ext = '.pdf';
      else if (mime.includes('png')) ext = '.png';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
      else if (mime.includes('webp')) ext = '.webp';

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${doc.name || 'document'}${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } else {
      window.open(doc.url, '_blank');
    }
  };

  return (
    <div 
      onClick={() => onView(doc)}
      className={`glass-panel glass-panel-hover rounded-2xl p-5 border ${meta.borderColor} bg-gradient-to-br ${meta.color} relative overflow-hidden group cursor-pointer flex flex-col justify-between h-full`}
    >
      {/* Background Decorator Circle */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-all"></div>

      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-700/50 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <IconComponent className="w-6 h-6 text-blue-400" />
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1 ${meta.badgeClass}`}>
            <ShieldCheck className="w-3 h-3 inline mr-1" />
            {meta.typeCode}
          </span>
        </div>

        {/* Title & Identifier */}
        <h3 className="text-lg font-bold text-white tracking-wide mb-1 group-hover:text-cyan-300 transition-colors">
          {doc.name}
        </h3>
        <p className="text-xs text-slate-400 font-mono tracking-wider mb-4">
          ID: {doc.identifier || 'XXXXXXXXXXXX'}
        </p>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between mt-auto">
        <span className="text-[11px] text-slate-400 flex items-center space-x-1">
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          <span>Issued Digitally</span>
        </span>

        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onView(doc)}
            title="View Document"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-blue-600/30 border border-slate-700/50 transition-all"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDownload}
            title="Download / Open Link"
            className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/20 border border-slate-700/50 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>

          {onDelete && (
            <button
              onClick={() => onDelete(doc)}
              title="Delete Document"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 border border-slate-700/50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
