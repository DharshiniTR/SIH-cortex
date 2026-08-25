import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import MyDocuments from './pages/MyDocuments';
import Profile from './pages/Profile';
import ViewDocModal from './components/ViewDocModal';
import AddDocModal from './components/AddDocModal';
import { getUser, getAuthToken, clearAuthSession, fetchDocuments, deleteDocument } from './services/api';
import { Trash2, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(getUser());
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals
  const [viewingDoc, setViewingDoc] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);

  // Notification Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load documents on login or mount
  const loadUserDocuments = async (userEmail) => {
    const targetEmail = userEmail || user?.email;
    if (!targetEmail || !getAuthToken()) return;

    setLoadingDocs(true);
    try {
      const data = await fetchDocuments(targetEmail);
      if (Array.isArray(data)) {
        setDocuments(data);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      showToast(err.message || 'Failed to load documents', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (user && user.email) {
      loadUserDocuments(user.email);
    }
  }, [user]);

  const handleLoginSuccess = (authData) => {
    setUser(authData.user);
    showToast(`Welcome back, ${authData.user.name || 'User'}!`);
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setDocuments([]);
    showToast('Signed out of digital vault');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDoc) return;
    try {
      await deleteDocument({
        email: user.email,
        id: deletingDoc.id || deletingDoc._id,
        name: deletingDoc.name,
        identifier: deletingDoc.identifier
      });
      showToast(`Document "${deletingDoc.name}" deleted successfully`);
      setDeletingDoc(null);
      loadUserDocuments(user.email);
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete document', 'error');
      setDeletingDoc(null);
    }
  };

  if (!user || !getAuthToken()) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans relative">

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold border backdrop-blur-lg ${toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
              : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
            }`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddDoc={() => setShowAddModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            documents={documents}
            loading={loadingDocs}
            onRefresh={() => loadUserDocuments(user.email)}
            onViewDoc={(doc) => setViewingDoc(doc)}
            onOpenAddDoc={() => setShowAddModal(true)}
            onDeleteDoc={(doc) => setDeletingDoc(doc)}
          />
        )}

        {activeTab === 'documents' && (
          <MyDocuments
            documents={documents}
            loading={loadingDocs}
            onViewDoc={(doc) => setViewingDoc(doc)}
            onOpenAddDoc={() => setShowAddModal(true)}
            onDeleteDoc={(doc) => setDeletingDoc(doc)}
          />
        )}

        {activeTab === 'profile' && (
          <Profile
            user={user}
            onLogout={handleLogout}
          />
        )}
      </main>




      {/* View Document Modal */}
      {viewingDoc && (
        <ViewDocModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onDelete={(doc) => {
            setViewingDoc(null);
            setDeletingDoc(doc);
          }}
        />
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <AddDocModal
          user={user}
          onClose={() => setShowAddModal(false)}
          onDocAdded={() => {
            loadUserDocuments(user.email);
            showToast('New document saved to your vault!');
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm glass-panel border border-rose-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Delete Document?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="text-rose-300 font-semibold">{deletingDoc.name}</span> ({deletingDoc.identifier}) from your active view?
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/25"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
