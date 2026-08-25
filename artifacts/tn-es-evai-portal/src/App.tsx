import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from '@workspace/api-client-react';

/* ---------- Auth context ---------- */
interface AuthCtx { user: User | null; setUser: (u: User | null) => void; }
const AuthContext = createContext<AuthCtx>({ user: null, setUser: () => { } });
function useAuth() { return useContext(AuthContext); }
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ClipboardList,
  Download, FileCheck2, FileText, Home, Info, LogIn, Menu, Phone,
  ReceiptIndianRupee, Search, ShieldCheck, SlidersHorizontal, Upload, UserRound,
  X, QrCode, Trash2, type LucideIcon,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

import type { Application, Department, Service } from '@workspace/api-client-react';

/* ---------- Data context ---------- */
export interface VaultDoc { type: string; idNumber: string; name: string; fatherName?: string; dob?: string; address?: string; district?: string; taluk?: string; community?: string; uploadedAt?: string; blobUrl?: string; fileName?: string; }
interface DataCtx { apps: Application[]; setApps: (a: Application[]) => void; vault: VaultDoc[]; setVault: (v: VaultDoc[]) => void; }
const DataContext = createContext<DataCtx>({ apps: [], setApps: () => { }, vault: [], setVault: () => { } });
function useData() { return useContext(DataContext); }

/* ---------- Mock Hooks ---------- */
const getHealthCheckQueryKey = () => [];
const getGetDashboardQueryKey = () => [];
const getListDepartmentsQueryKey = () => [];
const getListServicesQueryKey = (p?: any) => [];
const getGetServiceQueryKey = (id: number) => [];
const getGetApplicationQueryKey = (id: number) => [];
const getGetReceiptQueryKey = (id: number) => [];
const getGetCertificateQueryKey = (id: number) => [];
function useHealthCheck(options?: any) { return { data: { status: 'ok' }, isLoading: false, isError: false }; }
function useGetDashboard(options?: any) { const { apps } = useData(); return { data: { recentApplications: apps, totalApplications: apps.length, pending: apps.filter(a => !a.status.toLowerCase().includes('approved') && !a.status.toLowerCase().includes('return')).length, completed: apps.filter(a => a.status.toLowerCase().includes('approved')).length, returned: apps.filter(a => a.status.toLowerCase().includes('return')).length }, isLoading: false, isError: false }; }
function useListDepartments(options?: any) { return { data: fallbackDepartments, isLoading: false, isError: false }; }
function useListServices(params?: any, options?: any) { return { data: { items: fallbackServices, totalPages: 1, total: fallbackServices.length }, isLoading: false, isError: false }; }
function useGetService(id: number, options?: any) { return { data: fallbackServices.find(s => s.id === id), isLoading: false, isError: false }; }
function useGetApplication(id: number, options?: any) { const { apps } = useData(); return { data: apps.find(a => a.id === id), isLoading: false, isError: false }; }
function useCreateApplication() { const { apps, setApps } = useData(); return { isPending: false, mutate: ({ data }: any, { onSuccess }: any) => { const service = fallbackServices.find(s => s.id === data.serviceId); const newApp: Application = { id: Date.now(), applicationNumber: `TN-${service?.departmentName.slice(0, 3).toUpperCase() || 'SVC'}-2026-${Date.now().toString().slice(-4)}`, serviceId: data.serviceId, serviceName: service?.name || 'Service', applicantName: data.applicantName, status: 'Application submitted', submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), remarks: '' }; setApps([newApp, ...apps]); onSuccess(newApp); } }; }
function useGetReceipt(id: number, options?: any) { const { apps } = useData(); const [data, setData] = useState<{ receiptNumber: string, amount: number, paidOn: string } | null>(null); const app = apps.find(a => a.id === id); return { data, isLoading: false, isError: false, refetch: () => { if (app) setData({ receiptNumber: `REC-${id}`, amount: fallbackServices.find(s => s.id === app.serviceId)?.fee || 60, paidOn: app.submittedAt }); } }; }
function useGetCertificate(id: number, options?: any) { const { apps } = useData(); const [data, setData] = useState<{ certificateNumber: string, issuedOn: string, serviceName: string } | null>(null); const app = apps.find(a => a.id === id); return { data, isLoading: false, isError: false, refetch: () => { if (app && app.status.toLowerCase().includes('approved')) setData({ certificateNumber: `CERT-${id}`, issuedOn: app.updatedAt, serviceName: app.serviceName }); } }; }
function useLogin() { return { isPending: false, mutate: ({ data }: any, { onSuccess }: any) => { onSuccess({ id: 1, email: data.email, firstName: 'Asuwath Kumaresh', lastName: 'V', role: 'citizen' }); } }; }


const fallbackDepartments: Department[] = [
  { id: 1, name: 'Revenue and Disaster Management', code: 'REV' },
  { id: 2, name: 'Social Welfare and Women Empowerment', code: 'SWE' },
  { id: 3, name: 'Adi Dravidar and Tribal Welfare', code: 'ADW' },
  { id: 4, name: 'Transport Department', code: 'TRN' },
];
const fallbackServices: Service[] = [
  { id: 1, code: 'REV-001', name: 'Nativity Certificate', departmentId: 1, departmentName: 'Revenue and Disaster Management', description: 'Certificate issued to establish the place of origin and permanent residence of a citizen in Tamil Nadu.', fee: 40, documents: ['Aadhaar card or identity proof', 'Address proof', 'Self declaration'], process: ['Submit citizen details and documents', 'Village Administrative Officer verification', 'Tahsildar approval and certificate issue'] },
  { id: 2, code: 'REV-002', name: 'Community Certificate', departmentId: 1, departmentName: 'Revenue and Disaster Management', description: 'Official certificate recording the community of a citizen for education, employment and welfare benefits.', fee: 40, documents: ['Aadhaar card', 'Parent or family community certificate', 'Address proof'], process: ['Complete the application form', 'Revenue inspection and verification', 'Certificate issued through e-Sevai'] },
  { id: 3, code: 'REV-003', name: 'Income Certificate', departmentId: 1, departmentName: 'Revenue and Disaster Management', description: 'Certificate showing the annual family income for scholarships, fee concessions and government schemes.', fee: 60, documents: ['Aadhaar card', 'Family card', 'Salary certificate or income declaration'], process: ['Enter income particulars', 'Upload supporting proof', 'Revenue official review and approval'] },
  { id: 4, code: 'SWE-004', name: 'First Graduate Certificate', departmentId: 2, departmentName: 'Social Welfare and Women Empowerment', description: 'Certificate for students who are the first graduate in their family to access higher education assistance.', fee: 40, documents: ['Aadhaar card', 'Transfer certificate', 'Parent declaration'], process: ['Submit family education details', 'Document verification', 'Certificate approval'] },
  { id: 5, code: 'TRN-006', name: 'Learner Licence Application', departmentId: 4, departmentName: 'Transport Department', description: 'Apply for a learner licence through the Tamil Nadu transport services counter.', fee: 150, documents: ['Aadhaar card', 'Age proof', 'Medical self declaration'], process: ['Complete applicant information', 'Upload proof documents', 'Schedule learner test'] },
];
function makeFallbackApps(name: string): Application[] {
  return [
    { id: 10842, applicationNumber: 'TN-REV-2026-10842', serviceId: 3, serviceName: 'Income Certificate', applicantName: name, status: 'In Progress: VAO Verification', submittedAt: '2026-02-18T09:30:00', updatedAt: '2026-02-22T14:10:00', remarks: 'Verification by Village Administrative Officer is in progress.' },
    { id: 10807, applicationNumber: 'TN-REV-2026-10807', serviceId: 2, serviceName: 'Community Certificate', applicantName: name, status: 'Approved', submittedAt: '2026-02-15T11:20:00', updatedAt: '2026-02-19T10:05:00', remarks: 'Certificate is ready for download.' },
    { id: 10754, applicationNumber: 'TN-SWE-2026-10754', serviceId: 4, serviceName: 'First Graduate Certificate', applicantName: name, status: 'Action Required', submittedAt: '2026-02-04T16:00:00', updatedAt: '2026-02-08T09:15:00', remarks: 'Please upload a clearer copy of the parent declaration.' },
  ];
}

function formatDate(date?: string) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}
function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes('approved') || s.includes('complete') || s.includes('issued')) return 'bg-[#dfeee1] text-[#21653e] border-[#a9cbb0]';
  if (s.includes('return') || s.includes('action required') || s.includes('reject')) return 'bg-[#f7e5da] text-[#9c3f2b] border-[#ddb5a7]';
  return 'bg-[#e1edf1] text-[#176074] border-[#aacbd4]';
}

function Button({ children, className = '', variant = 'primary', ...props }: { children: ReactNode; className?: string; variant?: 'primary' | 'outline' | 'gold' | 'danger'; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  const variants = {
    primary: 'bg-[#0a5c8a] text-white border-[#07436a] hover:bg-[#084a72]',
    outline: 'bg-white text-[#0a2240] border-[#cdd6e3] hover:bg-[#f2f4f8]',
    gold: 'bg-[#e8a020] text-[#0a2240] border-[#c4861a] hover:bg-[#d4901a]',
    danger: 'bg-[#922828] text-white border-[#7a2121] hover:bg-[#7a2121]',
  };
  return <button data-testid="button-action" className={`portal-focus inline-flex items-center justify-center gap-2 border px-4 py-2 text-[13px] font-semibold shadow-[0_1px_0_rgba(0,0,0,.08)] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>{children}</button>;
}
function Field({ label, name, value, onChange, required = false, type = 'text', placeholder = '', children }: { label: string; name: string; value?: string; onChange?: (value: string) => void; required?: boolean; type?: string; placeholder?: string; children?: ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[#18283a]" data-testid={`field-${name}`}>
    <span className="mb-1 block">{label}{required && <span className="text-[#922828]"> *</span>}</span>
    {children || <input data-testid={`input-${name}`} name={name} required={required} value={value} onChange={e => onChange?.(e.target.value)} type={type} placeholder={placeholder} className="portal-focus h-9 w-full border border-[#cdd6e3] bg-white px-2.5 text-[13px] font-normal text-[#18283a] outline-none focus:border-[#0a5c8a] focus:ring-1 focus:ring-[#0a5c8a]" />}
  </label>;
}

/* ── Indian Lion Capital / National Emblem SVG ── */
function EmblemSVG() {
  return (
    <svg viewBox="0 0 80 100" width="44" height="55" aria-label="Indian National Emblem" role="img">
      {/* Abacus base */}
      <rect x="8" y="85" width="64" height="8" rx="1" fill="#e8a020" />
      <rect x="12" y="79" width="56" height="7" rx="1" fill="#e8a020" opacity=".85" />
      {/* Chakra (wheel) on abacus */}
      <circle cx="40" cy="75" r="5" fill="none" stroke="#e8a020" strokeWidth="1.5" />
      <circle cx="40" cy="75" r="1.5" fill="#e8a020" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={40 + 2 * Math.cos(a)} y1={75 + 2 * Math.sin(a)} x2={40 + 4.5 * Math.cos(a)} y2={75 + 4.5 * Math.sin(a)} stroke="#e8a020" strokeWidth="1" />;
      })}
      {/* Bull (left) */}
      <ellipse cx="19" cy="68" rx="8" ry="5" fill="#e8a020" opacity=".9" />
      <ellipse cx="14" cy="64" rx="4" ry="5" fill="#e8a020" opacity=".9" />
      <line x1="10" y1="69" x2="8" y2="75" stroke="#e8a020" strokeWidth="1.5" />
      <line x1="14" y1="70" x2="12" y2="75" stroke="#e8a020" strokeWidth="1.5" />
      {/* Horse (right) */}
      <ellipse cx="61" cy="68" rx="8" ry="5" fill="#e8a020" opacity=".9" />
      <ellipse cx="66" cy="64" rx="4" ry="5" fill="#e8a020" opacity=".9" />
      <line x1="70" y1="69" x2="72" y2="75" stroke="#e8a020" strokeWidth="1.5" />
      <line x1="66" y1="70" x2="68" y2="75" stroke="#e8a020" strokeWidth="1.5" />
      {/* Front lion body */}
      <ellipse cx="40" cy="55" rx="13" ry="10" fill="#e8a020" />
      {/* Lion head */}
      <circle cx="40" cy="40" r="11" fill="#e8a020" />
      {/* Mane ring */}
      <circle cx="40" cy="40" r="14" fill="none" stroke="#e8a020" strokeWidth="3" opacity=".55" />
      {/* Eyes */}
      <circle cx="36" cy="38" r="1.5" fill="#0a2240" />
      <circle cx="44" cy="38" r="1.5" fill="#0a2240" />
      {/* Nose */}
      <ellipse cx="40" cy="43" rx="2.5" ry="1.5" fill="#0a2240" opacity=".6" />
      {/* Ears */}
      <ellipse cx="31" cy="32" rx="3" ry="4" fill="#e8a020" />
      <ellipse cx="49" cy="32" rx="3" ry="4" fill="#e8a020" />
      {/* Paws */}
      <ellipse cx="31" cy="65" rx="5" ry="3.5" fill="#e8a020" />
      <ellipse cx="49" cy="65" rx="5" ry="3.5" fill="#e8a020" />
      <line x1="29" y1="65" x2="27" y2="73" stroke="#e8a020" strokeWidth="2" />
      <line x1="33" y1="66" x2="31" y2="73" stroke="#e8a020" strokeWidth="2" />
      <line x1="47" y1="66" x2="49" y2="73" stroke="#e8a020" strokeWidth="2" />
      <line x1="51" y1="65" x2="53" y2="73" stroke="#e8a020" strokeWidth="2" />
      {/* सत्यमेव जयते – motto label */}
      <text x="40" y="98" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#e8a020" fontFamily="sans-serif">सत्यमेव जयते</text>
    </svg>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-50">
      {/* ① Tricolour identity stripe */}
      <div className="gov-stripe" />

      {/* ② Slim utility band – desktop only */}
      <div style={{ background: 'var(--tn-navy-dark)', color: '#8aaccc' }} className="hidden border-b border-[#0e254a] md:block">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-1 text-[11px] font-medium">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-[#c8d8ec]">Government of Tamil Nadu</span>
            <span className="opacity-40">|</span> Official Citizen Service Portal
          </span>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-[#8aaccc]"><Phone size={11} className="opacity-80" /> Helpline: 1800-425-1333</span>
            <span className="border-l border-[#1a3a5c] pl-5 text-[#8aaccc]">தமிழ் &nbsp;|&nbsp; English</span>
          </div>
        </div>
      </div>

      {/* ③ Main brand row with National Emblem */}
      <div style={{ background: 'var(--tn-navy)' }} className="border-b border-[#0e254a] text-white shadow-[0_2px_12px_rgba(6,22,38,.45)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5">

          {/* Left: hamburger + brand */}
          <div className="flex items-center gap-4">
            <button onClick={onMenu} aria-label="Open navigation menu" data-testid="button-open-menu"
              className="portal-focus -ml-1 p-1.5 text-[#e8a020] md:hidden">
              <Menu size={22} />
            </button>

            <Link href="/dashboard" data-testid="link-government-home" className="flex items-center gap-4 no-underline">
              {/* National Emblem badge */}
              <div className="gov-emblem-badge">
                <EmblemSVG />
              </div>

              {/* Portal identity text */}
              <div className="flex flex-col justify-center">
                <div className="text-[11px] font-medium tracking-[.14em] text-[#7eaad4]">
                  GOVERNMENT OF TAMIL NADU
                </div>
                <div className="mt-0.5 text-[24px] font-extrabold leading-none tracking-tight text-white">
                  e-Sevai
                </div>
                <div className="mt-1 text-[9px] font-semibold tracking-[.2em] text-[#5d8db8]">
                  CITIZEN SERVICE PORTAL
                </div>
              </div>
            </Link>
          </div>

          {/* Right: sign-out */}
          <Link href="/login" data-testid="link-sign-out"
            className="portal-focus flex items-center gap-2 border border-[#1e4878] bg-[#0d2d57] px-4 py-2 text-[12px] font-semibold text-[#e8a020] transition-all hover:border-[#e8a020] hover:text-white">
            <LogIn size={15} /> Sign out
          </Link>
        </div>
      </div>
    </header>
  );
}
const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/services', label: 'Find a Service', icon: BookOpen },
  { href: '/vault', label: 'Document Vault (CAN)', icon: ShieldCheck },
  { href: '/saved-applications', label: 'Saved Applications', icon: ClipboardList },
  { href: '/track', label: 'Track Status', icon: Search },
  { href: '/returned-applications', label: 'Returned Applications', icon: Info },
  { href: '/reprint-receipt', label: 'Reprint Receipt', icon: ReceiptIndianRupee },
  { href: '/certificate-download', label: 'Certificate Download', icon: FileCheck2 },
];
function Sidebar({ open, onClose, healthStatus }: { open: boolean; onClose: () => void; healthStatus?: string }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const displayName = user ? `${user.firstName} ${user.lastName}` : '—';
  return <><div onClick={onClose} className={`fixed inset-0 z-30 bg-[#071a30]/50 md:hidden ${open ? 'block' : 'hidden'}`} />
    <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] transform border-r border-[#d0d8e4] bg-white transition-transform md:static md:block md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#d0d8e4] px-4 py-4 md:hidden"><span className="font-bold" style={{ color: 'var(--tn-navy)' }}>Portal menu</span><button onClick={onClose} data-testid="button-close-menu"><X size={18} /></button></div>
        {/* User profile block */}
        <div className="border-b border-[#d0d8e4] px-4 py-4" style={{ background: 'var(--tn-navy)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-[#2a4a6c] bg-[#0d2d57] text-[#f5a623]"><UserRound size={20} /></div>
            <div>
              <div className="text-[13px] font-bold text-white">{displayName}</div>
              <div className="text-[11px] text-[#a8bcd4]">Citizen account</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#8a9bae]">Citizen services</div>
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={onClose} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`portal-link mb-1 flex items-center gap-3 border-l-4 px-3 py-2.5 text-[13px] font-medium ${location === href ? 'portal-nav-active' : 'border-transparent text-[#2a3f56]'}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Returned Applications' && <span className="ml-auto bg-red-600 px-1.5 text-[10px] text-white">1</span>}</Link>)}
          <div className="my-4 border-t border-[#d0d8e4]" />
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#8a9bae]">Information</div>
          <a href="/help" data-testid="link-help" className="portal-link flex items-center gap-3 border-l-4 border-transparent px-3 py-2.5 text-[13px] font-medium text-[#2a3f56]"><Phone size={17} strokeWidth={1.8} /> Help &amp; Contact</a>
        </nav>
        <div className="border-t border-[#d0d8e4] p-4 text-[11px] leading-5 text-[#5a6b7a]">
          <div className="mb-1 font-bold text-[#2a3f56]">Portal status</div>
          <span className={`mr-1 inline-block h-2 w-2 rounded-full ${healthStatus === 'ok' ? 'bg-green-500' : 'bg-amber-400'}`} />
          {healthStatus === 'ok' ? 'All services operational' : 'Checking service status'}
        </div>
      </div>
    </aside></>;
}
function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  return <div className="portal-grid min-h-[100dvh]" style={{ color: 'var(--tn-text)' }}>
    <TopBar onMenu={() => setOpen(true)} />
    <div className="mx-auto flex min-h-[calc(100dvh-88px)] max-w-[1440px]">
      <Sidebar open={open} onClose={() => setOpen(false)} healthStatus={health.data?.status} />
      <main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-7">{children}</main>
    </div>
    <footer className="border-t py-4 text-center text-[11px]" style={{ background: 'var(--tn-navy)', color: '#a8bcd4', borderColor: '#1a3a5c' }}>
      Government of Tamil Nadu &nbsp;|&nbsp; e-Sevai Citizen Service Portal &nbsp;|&nbsp; Content owned by Tamil Nadu e-Governance Agency
    </footer>
  </div>;
}
function PageHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#cdd6e3] pb-4 sm:flex-row sm:items-end"><div>{eyebrow && <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#0a5c8a]">{eyebrow}</div>}<h1 className="text-[23px] font-bold leading-tight text-[#0a2240] sm:text-[27px]">{title}</h1>{detail && <p className="mt-1 text-[12px] text-[#54687a]">{detail}</p>}</div>{action}</div>;
}
function LoadingRows({ count = 4 }: { count?: number }) { return <div className="space-y-2" data-testid="loading-state">{Array.from({ length: count }, (_, i) => <div key={i} className="skeleton h-12 w-full border border-[#ddd8c9]" />)}</div>; }
function ErrorState({ message = 'We could not load this information right now.' }: { message?: string }) { return <div data-testid="error-state" className="border border-[#ddb5a7] bg-[#fbede7] p-5 text-center"><div className="font-bold text-[#8e3b2e]">Unable to load the page</div><div className="mt-1 text-[12px] text-[#774b41]">{message}</div><Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try again</Button></div>; }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div data-testid="empty-state" className="border border-dashed border-[#b7baa9] bg-[#faf9f3] px-5 py-12 text-center"><FileText className="mx-auto mb-3 text-[#6c9b91]" size={28} /><div className="font-bold text-[#31564e]">{title}</div><div className="mt-1 text-[12px] text-[#758079]">{detail}</div></div>; }
function StatusBadge({ status }: { status: string }) { return <span data-testid={`status-${status.toLowerCase().replaceAll(' ', '-')}`} className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(status)}`}>{status}</span>; }

function RegistrationPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  function submit(e: FormEvent) { e.preventDefault(); setUser({ id: Math.floor(Math.random() * 10000) + 1, firstName, lastName, email, role: 'citizen' }); setLocation('/dashboard'); }
  return <div className="portal-grid flex min-h-[100dvh] flex-col"><div className="gov-stripe" /><header style={{ background: 'var(--tn-navy)' }} className="text-white"><div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-4"><Link href="/login" data-testid="link-login-brand" className="flex items-center gap-4"><div className="gov-emblem-badge"><EmblemSVG /></div><div><div className="text-[22px] font-extrabold leading-none">e-Sevai</div><div className="mt-1 text-[9px] font-semibold tracking-[.2em] text-[#5d8db8]">CITIZEN SERVICE PORTAL</div></div></Link><div className="hidden text-right text-[11px] text-[#7eaad4] md:block">Government of Tamil Nadu<br /><span className="text-[#4e7aa8]">தமிழ்நாடு மின் ஆளுமை முகமை</span></div></div></header><div className="flex flex-1 items-center justify-center px-4 py-10"><div className="grid w-full max-w-[900px] overflow-hidden border border-[#c8c2b3] bg-[#fffef9] shadow-[0_3px_0_rgba(20,83,69,.18),0_14px_35px_rgba(20,83,69,.08)] md:grid-cols-[1fr_1.08fr]"><div className="hidden bg-[#1b5a4d] p-9 text-[#f8f0d7] md:block"><div className="mb-12 text-[10px] font-bold uppercase tracking-[.22em] text-[#d9bf4e]">Official citizen counter</div><h1 className="max-w-[280px] text-[30px] font-bold leading-[1.14]">Services within reach.</h1><p className="mt-5 max-w-[280px] text-[13px] leading-6 text-[#d9e6d9]">Apply for certificates, follow your applications and download approved documents from one dependable place.</p><div className="mt-16 border-t border-[#5f8d80] pt-4 text-[11px] leading-5 text-[#d7e4d7]"><ShieldCheck className="mb-2 text-[#e3bc3e]" size={20} /><div className="font-bold text-[#f4e8c4]">A secure Government of Tamil Nadu service</div><div>Your information is used only to process your request.</div></div></div><div className="p-6 sm:p-9"><div className="mb-7"><div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#207179]">Citizen registration</div><h2 className="text-[23px] font-bold text-[#1d443e]">Create an account</h2><p className="mt-1 text-[12px] text-[#6a746d]">Register to access your applications and services.</p></div><form onSubmit={submit} className="space-y-4"><div className="grid grid-cols-2 gap-4"><Field label="First name" name="firstName" value={firstName} onChange={setFirstName} required placeholder="First name" /><Field label="Last name" name="lastName" value={lastName} onChange={setLastName} required placeholder="Last name" /></div><Field label="Email address" name="email" value={email} onChange={setEmail} required type="email" placeholder="yourname@example.com" /><Field label="Password" name="password" value={password} onChange={setPassword} required type="password" placeholder="Choose a password" /><Button type="submit" className="mt-3 w-full py-2.5">Create account <ArrowRight size={15} /></Button></form><div className="mt-6 border-t border-[#ded9ca] pt-5 text-center text-[12px] text-[#65756e]">Already have an account? <button type="button" onClick={() => setLocation('/login')} data-testid="button-login" className="portal-focus font-bold text-[#126874] underline">Sign in instead</button></div></div></div></div><div className="pb-5 text-center text-[11px] text-[#758079]">For assistance call 1800-425-1333 &nbsp;|&nbsp; Monday to Saturday, 8:00 AM – 8:00 PM</div></div>;
}

function LoginPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  function submit(e: FormEvent) { e.preventDefault(); setError(''); login.mutate({ data: { email, password } }, { onSuccess: (data: User) => { setUser(data); setLocation('/dashboard'); }, onError: () => setError('The email or password was not recognised. Please try again.') }); }
  return <div className="portal-grid flex min-h-[100dvh] flex-col"><div className="gov-stripe" /><header style={{ background: 'var(--tn-navy)' }} className="text-white"><div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-4"><Link href="/login" data-testid="link-login-brand" className="flex items-center gap-4"><div className="gov-emblem-badge"><EmblemSVG /></div><div><div className="text-[22px] font-extrabold leading-none">e-Sevai</div><div className="mt-1 text-[9px] font-semibold tracking-[.2em] text-[#5d8db8]">CITIZEN SERVICE PORTAL</div></div></Link><div className="hidden text-right text-[11px] text-[#7eaad4] md:block">Government of Tamil Nadu<br /><span className="text-[#4e7aa8]">தமிழ்நாடு மின் ஆளுமை முகமை</span></div></div></header><div className="flex flex-1 items-center justify-center px-4 py-10"><div className="grid w-full max-w-[900px] overflow-hidden border border-[#c8c2b3] bg-[#fffef9] shadow-[0_3px_0_rgba(20,83,69,.18),0_14px_35px_rgba(20,83,69,.08)] md:grid-cols-[1fr_1.08fr]"><div className="hidden bg-[#1b5a4d] p-9 text-[#f8f0d7] md:block"><div className="mb-12 text-[10px] font-bold uppercase tracking-[.22em] text-[#d9bf4e]">Official citizen counter</div><h1 className="max-w-[280px] text-[30px] font-bold leading-[1.14]">Services within reach.</h1><p className="mt-5 max-w-[280px] text-[13px] leading-6 text-[#d9e6d9]">Apply for certificates, follow your applications and download approved documents from one dependable place.</p><div className="mt-16 border-t border-[#5f8d80] pt-4 text-[11px] leading-5 text-[#d7e4d7]"><ShieldCheck className="mb-2 text-[#e3bc3e]" size={20} /><div className="font-bold text-[#f4e8c4]">A secure Government of Tamil Nadu service</div><div>Your information is used only to process your request.</div></div></div><div className="p-6 sm:p-9"><div className="mb-7"><div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#207179]">Citizen sign-in</div><h2 className="text-[23px] font-bold text-[#1d443e]">Welcome back</h2><p className="mt-1 text-[12px] text-[#6a746d]">Sign in to access your applications and services.</p></div>{error && <div data-testid="status-login-error" className="mb-4 border border-[#ddb5a7] bg-[#fbede7] px-3 py-2 text-[12px] text-[#8e3b2e]">{error}</div>}<form onSubmit={submit} className="space-y-4"><Field label="Email address" name="email" value={email} onChange={setEmail} required type="email" placeholder="yourname@example.com" /><Field label="Password" name="password" value={password} onChange={setPassword} required type="password" placeholder="Enter your password" /><div className="flex items-center justify-between pt-1"><label className="flex items-center gap-2 text-[12px] text-[#68736d]"><input data-testid="input-remember" type="checkbox" className="h-3.5 w-3.5 accent-[#116a73]" /> Remember this device</label><button type="button" onClick={() => setError('Password reset instructions can be requested from Citizen Support: 1800-425-1333.')} data-testid="button-forgot-password" className="portal-focus text-[12px] font-bold text-[#126874] underline">Forgot password?</button></div><Button type="submit" className="mt-3 w-full py-2.5" disabled={login.isPending}>{login.isPending ? 'Signing in…' : <>Sign in <ArrowRight size={15} /></>}</Button></form>      <div className="mt-6 border-t border-[#ded9ca] pt-5 text-center text-[12px] text-[#65756e]">New to e-Sevai? <button type="button" onClick={() => setLocation('/register')} data-testid="button-register" className="portal-focus font-bold text-[#126874] underline">Create a citizen account</button></div></div></div></div><div className="pb-5 text-center text-[11px] text-[#758079]">For assistance call 1800-425-1333 &nbsp;|&nbsp; Monday to Saturday, 8:00 AM – 8:00 PM</div></div>;
}

function ApplicationRow({ application }: { application: Application }) {
  return <div data-testid={`row-application-${application.id}`} className="grid gap-2 border-b border-[#e0dbce] px-3 py-3 text-[12px] last:border-0 sm:grid-cols-[1.3fr_1.6fr_1fr_1fr_auto] sm:items-center"><div><Link href={`/applications/${application.id}`} data-testid={`link-application-${application.id}`} className="font-bold text-[#126874] underline">{application.applicationNumber}</Link><div className="mt-0.5 text-[11px] text-[#758079]">Updated {formatDate(application.updatedAt)}</div></div><div className="font-semibold text-[#334e46]">{application.serviceName}</div><div className="text-[#627168]">{formatDate(application.submittedAt)}</div><div><StatusBadge status={application.status} /></div><Link href={`/applications/${application.id}`} data-testid={`link-view-application-${application.id}`} className="inline-flex items-center gap-1 font-bold text-[#126874]">View <ArrowRight size={13} /></Link></div>;
}
function DashboardPage() {
  const dashboardQuery = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const { user } = useAuth();
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Citizen';
  const dash = dashboardQuery.data;
  const apps = dash?.recentApplications || makeFallbackApps(userName);
  const cards = [{ label: 'Total applications', value: dash?.totalApplications ?? 12, icon: ClipboardList, color: 'bg-[#e0ece9]' }, { label: 'Under process', value: dash?.pending ?? 4, icon: SlidersHorizontal, color: 'bg-[#e4eef1]' }, { label: 'Completed', value: dash?.completed ?? 7, icon: Check, color: 'bg-[#e3efe1]' }, { label: 'Returned', value: dash?.returned ?? 1, icon: Info, color: 'bg-[#f4e5da]' }];
  return <><PageHeading eyebrow="Citizen dashboard" title={`Good morning, ${user?.firstName ?? 'Citizen'}`} detail="Here is the current status of your e-Sevai requests." action={<Link href="/services" data-testid="link-browse-services" className="inline-flex items-center gap-2 bg-[#116a73] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#0e5961]">Browse services <ArrowRight size={15} /></Link>} />{dashboardQuery.isLoading ? <LoadingRows count={3} /> : dashboardQuery.isError ? <ErrorState /> : <><div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ label, value, icon: Icon, color }) => <div key={label} data-testid={`card-${label.toLowerCase().replaceAll(' ', '-')}`} className={`tn-shadow border border-[#c9d0c6] ${color} p-4`}><div className="flex items-start justify-between"><div className="text-[11px] font-bold uppercase tracking-wide text-[#54655d]">{label}</div><Icon size={18} className="text-[#237267]" /></div><div className="mt-2 text-[28px] font-bold text-[#21483f]">{value}</div><div className="mt-1 text-[11px] text-[#65756e]">As of 24 February 2025</div></div>)}</div><div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]"><section className="tn-shadow border border-[#c9c3b3] bg-[#fffef9]"><div className="flex items-center justify-between border-b border-[#c9c3b3] bg-[#e4eef1] px-4 py-3"><div><h2 className="text-[15px] font-bold text-[#1d4f58]">Recent applications</h2><div className="text-[11px] text-[#5b7374]">Your five most recent service requests</div></div><Link href="/saved-applications" data-testid="link-view-all-applications" className="text-[12px] font-bold text-[#126874] underline">View all</Link></div><div className="hidden grid-cols-[1.3fr_1.6fr_1fr_1fr_auto] gap-2 border-b border-[#dad4c5] bg-[#f5f3eb] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#68756d] sm:grid"><span>Application no.</span><span>Service</span><span>Submitted</span><span>Status</span><span /></div>{apps.length ? apps.slice(0, 5).map(app => <ApplicationRow key={app.id} application={app} />) : <EmptyState title="No applications yet" detail="Choose a service to begin your first application." />}</section><section className="tn-shadow border border-[#c9c3b3] bg-[#fffef9]"><div className="border-b border-[#c9c3b3] bg-[#e8e4d7] px-4 py-3"><h2 className="text-[15px] font-bold text-[#264b43]">Useful links</h2></div><div className="divide-y divide-[#e0dbce]">{[{ icon: BookOpen, title: 'Find a government service', detail: 'Browse all certificates and applications', href: '/services' }, { icon: ReceiptIndianRupee, title: 'Reprint a receipt', detail: 'Retrieve your payment receipt', href: '/reprint-receipt' }, { icon: FileCheck2, title: 'Download certificate', detail: 'Get an approved digital certificate', href: '/certificate-download' }].map(({ icon: Icon, title, detail, href }) => <Link href={href} key={title} data-testid={`link-useful-${title.toLowerCase().replaceAll(' ', '-')}`} className="flex items-center gap-3 px-4 py-4 hover:bg-[#f4f2e9]"><span className="flex h-8 w-8 items-center justify-center bg-[#dcebea] text-[#116a73]"><Icon size={16} /></span><span className="flex-1"><span className="block text-[13px] font-bold text-[#31534b]">{title}</span><span className="block text-[11px] text-[#758079]">{detail}</span></span><ArrowRight size={15} className="text-[#73958d]" /></Link>)}</div></section></div></>}</>;
}

function ServicesPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [letter, setLetter] = useState('');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ search: search || undefined, departmentId: department ? Number(department) : undefined, letter: letter || undefined, page, pageSize: 8 }), [search, department, letter, page]);
  const servicesQuery = useListServices(params, { query: { queryKey: getListServicesQueryKey(params) } });
  const departmentsQuery = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });
  const items = servicesQuery.data?.items || fallbackServices;
  const totalPages = servicesQuery.data?.totalPages || 1;
  const letters = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
  return <><PageHeading eyebrow="Service directory" title="Find a service" detail="Search certificates and public services available through e-Sevai." /><div className="mb-5 border border-[#c9c3b3] bg-[#fffef9] p-4"><div className="grid gap-3 md:grid-cols-[1fr_230px]"><label className="relative block"><span className="sr-only">Search services</span><Search className="absolute left-3 top-2.5 text-[#6d847d]" size={17} /><input data-testid="input-service-search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by service name or code" className="portal-focus h-10 w-full border border-[#9fb2ab] bg-[#fcfbf6] pl-9 pr-3 text-[13px] outline-none focus:border-[#116a73]" /></label><label><span className="sr-only">Filter by department</span><select data-testid="select-service-department" value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }} className="portal-focus h-10 w-full border border-[#9fb2ab] bg-[#fcfbf6] px-2 text-[13px] outline-none"><option value="">All departments</option>{(departmentsQuery.data || fallbackDepartments).map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select></label></div><div className="mt-4 flex items-center gap-2 overflow-x-auto border-t border-[#e2ddd0] pt-3"><span className="mr-1 flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#63746c]"><SlidersHorizontal size={13} /> Filter by first letter</span>{letters.map(item => <button key={item} data-testid={`button-letter-${item.toLowerCase()}`} onClick={() => { setLetter(item === 'All' ? '' : item); setPage(1); }} className={`shrink-0 border px-2 py-1 text-[11px] font-bold ${letter === (item === 'All' ? '' : item) ? 'border-[#116a73] bg-[#116a73] text-white' : 'border-[#bdc5bb] bg-[#f8f7f0] text-[#4d665d] hover:bg-[#e4efee]'}`}>{item}</button>)}</div></div><div className="mb-3 flex items-center justify-between text-[12px] text-[#68756d]"><span data-testid="text-service-result-count"><b className="text-[#31564e]">{servicesQuery.data?.total ?? items.length}</b> services available</span><span className="hidden sm:block">Select a service to view eligibility and documents</span></div>{servicesQuery.isLoading ? <LoadingRows /> : servicesQuery.isError ? <ErrorState /> : items.length ? <div className="grid gap-3 lg:grid-cols-2">{items.map(service => <Link href={`/services/${service.id}`} key={service.id} data-testid={`card-service-${service.id}`} className="group tn-shadow border border-[#c9c3b3] bg-[#fffef9] p-4 hover:border-[#6ca0a0]"><div className="flex items-start justify-between gap-3"><div><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#7b8177]">{service.code} &nbsp;|&nbsp; {service.departmentName}</div><h2 className="text-[16px] font-bold text-[#1d554e] group-hover:text-[#116a73]">{service.name}</h2></div><ArrowRight size={17} className="mt-1 shrink-0 text-[#759890] group-hover:text-[#116a73]" /></div><p className="mt-3 line-clamp-2 text-[12px] leading-5 text-[#63736b]">{service.description}</p><div className="mt-4 flex items-center justify-between border-t border-[#e5e0d3] pt-3 text-[11px]"><span className="text-[#63736b]">Service fee <b className="text-[#294e45]">₹{service.fee.toFixed(2)}</b></span><span className="font-bold text-[#126874]">View details</span></div></Link>)}</div> : <EmptyState title="No services match your search" detail="Try a different service name, department or first letter." />}{items.length > 0 && <div className="mt-6 flex items-center justify-center gap-3"><Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}><ArrowLeft size={14} /> Previous</Button><span data-testid="text-service-page" className="text-[12px] font-bold text-[#596960]">Page {page} of {totalPages}</span><Button variant="outline" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next <ArrowRight size={14} /></Button></div>}</>;
}

function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const serviceId = Number(id);
  const query = useGetService(serviceId, { query: { enabled: !!id, queryKey: getGetServiceQueryKey(serviceId) } });
  const service = query.data || fallbackServices.find(s => s.id === serviceId) || fallbackServices[0];
  return <><div className="mb-5 text-[12px] text-[#60736a]"><Link href="/services" data-testid="link-back-services" className="font-bold text-[#126874] underline">Service directory</Link> &nbsp;/&nbsp; {service.name}</div>{query.isLoading ? <LoadingRows count={5} /> : query.isError && !service ? <ErrorState /> : <><PageHeading eyebrow={service.code} title={service.name} detail={service.departmentName} action={<Link href={`/apply/${service.id}`} data-testid="link-start-application" className="inline-flex items-center gap-2 bg-[#116a73] px-4 py-2.5 text-[13px] font-bold text-white">Start application <ArrowRight size={15} /></Link>} /><div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><div className="space-y-5"><section className="border border-[#c9c3b3] bg-[#fffef9] p-5"><h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[#1d554e]"><Info size={17} /> About this service</h2><p data-testid="text-service-description" className="text-[13px] leading-6 text-[#52645c]">{service.description}</p></section><section className="border border-[#c9c3b3] bg-[#fffef9] p-5"><h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[#1d554e]"><FileText size={17} /> Required documents</h2><ul className="space-y-2">{service.documents.map((doc, i) => <li key={doc} data-testid={`text-document-${i}`} className="flex items-start gap-2 text-[13px] text-[#52645c]"><Check size={15} className="mt-0.5 shrink-0 text-[#398356]" />{doc}</li>)}</ul></section></div><aside className="space-y-5"><section className="border border-[#c9c3b3] bg-[#e6efed] p-5"><div className="text-[10px] font-bold uppercase tracking-wide text-[#617870]">Government service fee</div><div className="mt-1 text-[26px] font-bold text-[#1b574d]">₹{service.fee.toFixed(2)}</div><div className="mt-1 text-[11px] text-[#617870]">Payable at the time of submission</div></section><section className="border border-[#c9c3b3] bg-[#fffef9] p-5"><h2 className="mb-3 text-[15px] font-bold text-[#1d554e]">How to apply</h2><ol className="space-y-3">{service.process.map((step, i) => <li key={step} className="flex gap-3 text-[12px] leading-5 text-[#52645c]"><span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#d5e7e3] text-[10px] font-bold text-[#1d655d]">{i + 1}</span>{step}</li>)}</ol></section><div className="border-l-4 border-[#d8ad37] bg-[#f7f0d8] p-4 text-[12px] leading-5 text-[#665b35]"><b>Before you begin:</b> Keep your mobile number and scanned documents ready. You can save and return to an incomplete application.</div></aside></div></>}</>;
}

function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const serviceId = Number(id);
  const serviceQuery = useGetService(serviceId, { query: { enabled: !!id, queryKey: getGetServiceQueryKey(serviceId) } });
  const service = serviceQuery.data || fallbackServices.find(s => s.id === serviceId) || fallbackServices[0];
  const create = useCreateApplication();
  const [, setLocation] = useLocation();
  const { vault } = useData();
  const { user } = useAuth();
  const userName = user ? `${user.firstName} ${user.lastName}` : '';
  const aadhaar = vault.find(v => v.type.toLowerCase().includes('aadhaar'));
  const [form, setForm] = useState({ applicantName: aadhaar?.name || userName, phone: '', address: aadhaar?.address || '', district: aadhaar?.district || 'Chennai', taluk: aadhaar?.taluk || '' });
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const update = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));
  function submit(e: FormEvent) { e.preventDefault(); setError(''); create.mutate({ data: { serviceId, ...form } }, { onSuccess: (app: any) => setLocation(`/applications/${app.id}`), onError: () => setError('We could not submit the application. Check the details and try again.') }); }
  return <><div className="mb-5 text-[12px] text-[#60736a]"><Link href={`/services/${service.id}`} data-testid="link-back-service" className="font-bold text-[#126874] underline">Service details</Link> &nbsp;/&nbsp; Apply</div><PageHeading eyebrow="New application" title={`Apply for ${service.name}`} detail={`${service.code} · ${service.departmentName}`} /><div className="mb-5 grid grid-cols-3 border border-[#bdc9c1] bg-[#e8efeb] text-[11px] font-bold text-[#45645a]"><div className="border-b-4 border-[#116a73] px-3 py-3 text-[#116a73]">1. Applicant details</div><div className="px-3 py-3">2. Documents</div><div className="px-3 py-3">3. Review & submit</div></div>{error && <div data-testid="status-application-error" className="mb-4 border border-[#ddb5a7] bg-[#fbede7] px-3 py-2 text-[12px] text-[#8e3b2e]">{error}</div>}<form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><section className="border border-[#c9c3b3] bg-[#fffef9] p-5"><div className="mb-4 border-b border-[#ded9ca] pb-3"><h2 className="text-[16px] font-bold text-[#1d554e]">Applicant details</h2><p className="mt-1 text-[11px] text-[#758079]">Enter the details exactly as shown on your identity documents.</p></div>{aadhaar && <div className="mb-4 bg-[#e8efeb] border border-[#a9cbb0] p-3 text-[12px] flex items-center gap-2 text-[#286342]"><ShieldCheck size={16} /> Data automatically pre-filled from your CAN Document Vault.</div>}<div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Applicant full name" name="applicant-name" value={form.applicantName} onChange={update('applicantName')} required /></div><Field label="Mobile number" name="phone" value={form.phone} onChange={update('phone')} required type="tel" placeholder="10 digit mobile number" /><Field label="District" name="district" value={form.district} onChange={update('district')} required /><div className="sm:col-span-2"><Field label="Residential address" name="address" value={form.address} onChange={update('address')} required><textarea data-testid="input-address" name="address" required value={form.address} onChange={e => update('address')(e.target.value)} rows={3} placeholder="Door number, street, village or town" className="portal-focus w-full resize-y border border-[#a9b6af] bg-[#fffef9] px-2.5 py-2 text-[13px] font-normal outline-none focus:border-[#116a73] focus:ring-1 focus:ring-[#116a73]" /></Field></div><Field label="Taluk" name="taluk" value={form.taluk} onChange={update('taluk')} required placeholder="Enter taluk" /></div></section><aside className="space-y-5"><section className="border border-[#c9c3b3] bg-[#fffef9] p-5"><h2 className="mb-1 text-[15px] font-bold text-[#1d554e]">Upload documents</h2><p className="mb-4 text-[11px] leading-5 text-[#758079]">PDF, JPG or PNG. Maximum file size 2 MB per document.</p><label data-testid="field-document-upload" className="flex cursor-pointer flex-col items-center border border-dashed border-[#8eaaa2] bg-[#f2f7f3] px-4 py-6 text-center hover:bg-[#e6f0eb]"><Upload size={21} className="mb-2 text-[#28766d]" /><span className="text-[12px] font-bold text-[#28766d]">{fileName || 'Choose a document'}</span><span className="mt-1 text-[10px] text-[#718078]">Browse from device</span><input data-testid="input-document-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFileName(e.target.files?.[0]?.name || '')} /></label><div className="mt-4 space-y-2">{service.documents.slice(0, 3).map((doc, i) => <div key={doc} className="flex items-center gap-2 border-b border-[#e5e0d3] pb-2 text-[11px] text-[#566a61]"><span className="flex h-5 w-5 items-center justify-center bg-[#e4efeb] text-[10px] font-bold text-[#297368]">{i + 1}</span>{doc}</div>)}</div></section><section className="border border-[#c9c3b3] bg-[#e8e4d7] p-4"><div className="flex items-center justify-between text-[12px]"><span>Service fee</span><b className="text-[16px] text-[#1d554e]">₹{service.fee.toFixed(2)}</b></div><p className="mt-2 text-[11px] leading-5 text-[#6e786f]">Payment instructions will be shown after your application is submitted.</p></section><Button type="submit" className="w-full py-2.5" disabled={create.isPending}>{create.isPending ? 'Submitting application…' : <>Save and continue <ArrowRight size={15} /></>}</Button></aside></form></>;
}

function CertificateModal({ open, onClose, app }: { open: boolean; onClose: () => void; app?: Application | null }) {
  const { vault } = useData();
  if (!open || !app) return null;
  const isIncome = app.serviceId === 3;
  const isCommunity = app.serviceId === 2;
  const aadhaar = vault.find(v => v.type.toLowerCase().includes('aadhaar'));
  const incomeAmount = 145000;
  const incomeWords = "One Lakh Forty Five Thousand";
  const fatherName = aadhaar?.fatherName || 'Murugan';
  const address = aadhaar?.address || '12/4 South Street, Villapuram';
  const district = aadhaar?.district || 'Madurai';
  const taluk = aadhaar?.taluk || 'Madurai South';
  const community = aadhaar?.community || 'Backward Class (BC)';

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a30]/80 p-4 overflow-y-auto">
    <style dangerouslySetInnerHTML={{
      __html: `
      @media print {
        body * { visibility: hidden; }
        #certificate-print-area, #certificate-print-area * { visibility: visible; }
        #certificate-print-area { position: absolute; left: 0; top: 0; width: 100%; min-height: 100vh; margin: 0; padding: 0; box-shadow: none; border: none; background: white; }
        .print-hidden { display: none !important; }
      }
    `}} />
    <div id="certificate-print-area" className="bg-white max-w-[800px] w-full min-h-[600px] shadow-2xl relative flex flex-col my-8">
      <button onClick={onClose} data-testid="button-close-certificate" className="absolute -right-12 top-0 text-white hover:text-[#e8a020] print-hidden"><X size={28} /></button>
      <div className="h-4 w-full bg-[#1e4878]" />
      <div className="p-10 flex-1 flex flex-col relative text-[#223] overflow-hidden">
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none transform scale-[2.5]"><EmblemSVG /></div>
        <div className="absolute top-10 right-10 flex flex-col items-end">
          <QrCode size={64} className="text-[#333]" />
          <div className="text-[10px] tracking-widest mt-1 text-[#555]">{app.applicationNumber}</div>
        </div>
        <div className="flex flex-col items-center mb-8 relative z-10">
          <EmblemSVG />
          <div className="mt-4 font-black text-[22px] tracking-wider text-[#06182c]">GOVERNMENT OF TAMIL NADU</div>
          <div className="text-[14px] font-bold tracking-[0.15em] text-[#1e4878] mt-1 space-x-2"><span>REVENUE DEPARTMENT</span></div>
          <div className="mt-6 font-bold text-[17px] bg-[#fdfaf2] px-6 py-2 border border-[#d6ccb0] uppercase tracking-wide shadow-sm">{app.serviceName}</div>
        </div>
        <div className="text-[15px] leading-8 text-[#142328] text-justify font-serif flex-1 relative z-10">
          {isIncome && <p>This is to certify that Selvan/Selvi <b className="uppercase">{app.applicantName}</b>, Son/Daughter of <b className="uppercase">{fatherName}</b>, residing at <b>{address}</b>, Taluk: <b>{taluk}</b>, District: <b>{district}</b>, Tamil Nadu, has an annual income of Rs. <b>{incomeAmount}</b> (Rupees <b>{incomeWords}</b> Only) for the financial year 2026-2027 based on the evaluation reports and field inspection by the Village Administrative Officer.</p>}
          {isCommunity && <p>This is to certify that Selvan/Selvi <b className="uppercase">{app.applicantName}</b>, Son/Daughter of <b className="uppercase">{fatherName}</b>, residing at <b>{address}</b>, Taluk: <b>{taluk}</b>, District: <b>{district}</b>, Tamil Nadu, belongs to the <b className="uppercase">{community}</b> community, which is recognized as a Backward Class under the relevant official government orders (G.O.) of Tamil Nadu.</p>}
          {(!isIncome && !isCommunity) && <p>This is to certify that Selvan/Selvi <b className="uppercase">{app.applicantName}</b> has fulfilled the administrative requirements for the {app.serviceName} as evaluated by the department. This document acts as official confirmation of the successful application process.</p>}
        </div>
        <div className="mt-14 flex justify-between items-end pb-2 relative z-10">
          <div className="text-[11px] text-[#555] font-mono leading-relaxed">
            <div>Certificate No: CERT-{app.id}</div>
            <div>Date of Issue: {formatDate(app.updatedAt)}</div>
          </div>
          <div className="text-center relative">
            <div className="mb-2 text-[#ab2e2e] absolute -left-12 -top-6 rotate-[-15deg] opacity-80"><ShieldCheck size={50} /></div>
            <div className="font-bold text-[14px] text-[#06182c] border-b border-[#06182c] pb-1 inline-block">Digitally Signed by Tahsildar</div>
            <div className="text-[10px] text-[#555] mt-2 italic">No physical signature is required as this is an electronically generated and digitally signed certificate.</div>
          </div>
        </div>
      </div>
      <div className="bg-[#f0f4f8] py-3 text-center border-t border-[#d8e2eb] print-hidden"><Button onClick={() => window.print()} className="bg-[#116a73] border-none text-white hover:bg-[#0c4e55]"><Download size={14} /> Print original copy</Button></div>
    </div>
  </div>;
}

function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);
  const query = useGetApplication(appId, { query: { enabled: !!id, queryKey: getGetApplicationQueryKey(appId) } });
  const { user } = useAuth();
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Citizen';
  const defaultApps = makeFallbackApps(userName);
  const application = query.data || defaultApps.find(a => a.id === appId) || defaultApps[0];
  const stages = [
    'Application Submitted',
    'Field Verification by VAO (Approved)',
    'Revenue Inspector Review (Approved)',
    'Digitally Signed by Tahsildar (Ready for Download)'
  ];
  const done = application.status.toLowerCase().includes('approved') ? 4 : application.status.toLowerCase().includes('verification') ? 2 : 1;
  const receiptQuery = useGetReceipt(appId, { query: { enabled: false, queryKey: getGetReceiptQueryKey(appId) } });
  const certificateQuery = useGetCertificate(appId, { query: { enabled: false, queryKey: getGetCertificateQueryKey(appId) } });
  const [showCertificate, setShowCertificate] = useState(false);
  return <><CertificateModal open={showCertificate} onClose={() => setShowCertificate(false)} app={application} /><div className="mb-5 text-[12px] text-[#60736a]"><Link href="/dashboard" data-testid="link-back-dashboard" className="font-bold text-[#126874] underline">Dashboard</Link> &nbsp;/&nbsp; Application status</div>{query.isLoading ? <LoadingRows count={5} /> : <><PageHeading eyebrow="Application status" title={application.serviceName} detail={`Application number: ${application.applicationNumber}`} action={<StatusBadge status={application.status} />} /><div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]"><section className="border border-[#c9c3b3] bg-[#fffef9]"><div className="border-b border-[#c9c3b3] bg-[#e4eef1] px-5 py-4"><h2 className="text-[15px] font-bold text-[#1d4f58]">Application timeline</h2><p className="mt-1 text-[11px] text-[#5b7374]">Last updated {formatDate(application.updatedAt)}</p></div><div className="p-5">{stages.map((stage, i) => <div key={stage} className="relative flex gap-4 pb-7 last:pb-0"><div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center border-2 border-[#80a89f] bg-[#fffef9] text-[11px] font-bold text-[#26756a]">{i < done ? <Check size={14} /> : i + 1}</div>{i < stages.length - 1 && <div className={`absolute left-[13px] top-7 h-full w-px ${i < done - 1 ? 'bg-[#4b9179]' : 'bg-[#cbd3c9]'}`} />}<div><div className={`text-[13px] font-bold ${i < done ? 'text-[#315b50]' : 'text-[#89918a]'}`}>{stage}</div><div className="mt-1 text-[11px] text-[#77847b]">{i === 0 ? formatDate(application.submittedAt) : i < done ? 'Completed' : 'Pending'}</div></div></div>)}</div>{application.remarks && <div data-testid="text-application-remarks" className="mx-5 mb-5 border-l-4 border-[#d8ad37] bg-[#f7f0d8] p-3 text-[12px] leading-5 text-[#665b35]"><b>Officer remarks:</b> {application.remarks}</div>}</section><aside className="space-y-5"><section className="border border-[#c9c3b3] bg-[#fffef9] p-5"><h2 className="mb-4 text-[15px] font-bold text-[#1d554e]">Application summary</h2><dl className="space-y-3 text-[12px]"><div className="flex justify-between gap-3"><dt className="text-[#77847b]">Applicant</dt><dd data-testid="text-applicant-name" className="font-bold text-[#31534b]">{application.applicantName}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#77847b]">Submitted</dt><dd className="font-bold text-[#31534b]">{formatDate(application.submittedAt)}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#77847b]">Reference</dt><dd data-testid="text-application-number" className="font-mono font-bold text-[#31534b]">{application.applicationNumber}</dd></div></dl></section><section className="border border-[#c9c3b3] bg-[#fffef9] p-5"><h2 className="mb-3 text-[15px] font-bold text-[#1d554e]">Documents and receipt</h2><div className="space-y-2"><Button variant="outline" className="w-full" onClick={() => receiptQuery.data ? window.print() : receiptQuery.refetch()}><Download size={15} /> {receiptQuery.data ? 'Print payment receipt' : 'Get payment receipt'}</Button><Button variant="outline" className="w-full bg-[#e8a020] border-[#c4861a] hover:bg-[#d4901a] text-[#0a2240]" onClick={() => certificateQuery.data ? setShowCertificate(true) : certificateQuery.refetch()} disabled={done < 4}><FileCheck2 size={15} /> {certificateQuery.data ? 'View digital certificate' : 'Download certificate'}</Button></div>{receiptQuery.data && <div data-testid="text-receipt-number" className="mt-3 border border-[#a9cbb0] bg-[#e8f3e8] p-3 text-[11px] text-[#286342]">Receipt {receiptQuery.data.receiptNumber} · ₹{receiptQuery.data.amount.toFixed(2)}</div>}{certificateQuery.data && <div data-testid="text-certificate-number" className="mt-3 border border-[#a9cbb0] bg-[#e8f3e8] p-3 text-[11px] text-[#286342]">Certificate {certificateQuery.data.certificateNumber}</div>}</section></aside></div></>}</>;
}

function ApplicationListPage({ returned = false }: { returned?: boolean }) {
  const dashboardQuery = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const { user } = useAuth();
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Citizen';
  const apps = (dashboardQuery.data?.recentApplications || makeFallbackApps(userName)).filter(app => returned ? app.status.toLowerCase().includes('return') : !app.status.toLowerCase().includes('return'));
  return <><PageHeading eyebrow={returned ? 'Action required' : 'My applications'} title={returned ? 'Returned applications' : 'Saved applications'} detail={returned ? 'Review the remarks and submit corrected information.' : 'Track requests you have submitted through the portal.'} action={!returned && <Link href="/services" data-testid="link-start-new-application" className="inline-flex items-center gap-2 bg-[#116a73] px-4 py-2.5 text-[13px] font-bold text-white">Start new application <ArrowRight size={15} /></Link>} />{dashboardQuery.isLoading ? <LoadingRows /> : dashboardQuery.isError ? <ErrorState /> : apps.length ? <section className="border border-[#c9c3b3] bg-[#fffef9]"><div className="hidden grid-cols-[1.3fr_1.6fr_1fr_1fr_auto] gap-2 border-b border-[#dad4c5] bg-[#e4eef1] px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#5b7374] sm:grid"><span>Application no.</span><span>Service</span><span>Submitted</span><span>Status</span><span /></div>{apps.map(app => <ApplicationRow key={app.id} application={app} />)}</section> : <EmptyState title={returned ? 'No returned applications' : 'No saved applications'} detail={returned ? 'There are no applications waiting for your correction.' : 'Your submitted applications will appear here.'} />}</>;
}
function LookupPage({ type }: { type: 'receipt' | 'certificate' }) {
  const [reference, setReference] = useState('');
  const [id, setId] = useState<number | null>(null);
  const receiptQuery = useGetReceipt(id || 0, { query: { enabled: type === 'receipt' && !!id, queryKey: getGetReceiptQueryKey(id || 0) } });
  const certificateQuery = useGetCertificate(id || 0, { query: { enabled: type === 'certificate' && !!id, queryKey: getGetCertificateQueryKey(id || 0) } });
  const appQuery = useGetApplication(id || 0, { query: { enabled: type === 'certificate' && !!id, queryKey: getGetApplicationQueryKey(id || 0) } });
  const query = type === 'receipt' ? receiptQuery : certificateQuery;
  const [showCertificate, setShowCertificate] = useState(false);
  function submit(e: FormEvent) { e.preventDefault(); const parsed = Number(reference); if (parsed) setId(parsed); }
  return <><CertificateModal open={showCertificate} onClose={() => setShowCertificate(false)} app={appQuery.data} /><PageHeading eyebrow={type === 'receipt' ? 'Payment services' : 'Certificate services'} title={type === 'receipt' ? 'Reprint receipt' : 'Certificate download'} detail={type === 'receipt' ? 'Retrieve a copy of the payment receipt for an application.' : 'Download a certificate that has been approved and issued.'} /><div className="mx-auto max-w-[720px]"><section className="border border-[#c9c3b3] bg-[#fffef9] p-5 sm:p-7"><div className="mb-5 flex h-12 w-12 items-center justify-center bg-[#dcebea] text-[#116a73]">{type === 'receipt' ? <ReceiptIndianRupee size={24} /> : <FileCheck2 size={24} />}</div><h2 className="text-[17px] font-bold text-[#1d554e]">Enter application reference</h2><p className="mt-1 text-[12px] leading-5 text-[#68756d]">Enter the numeric application ID shown in your acknowledgement. Example: 10842.</p><form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row"><input data-testid={`input-${type}-lookup`} value={reference} onChange={e => setReference(e.target.value)} required placeholder="Application ID" className="portal-focus h-10 flex-1 border border-[#9fb2ab] bg-[#fcfbf6] px-3 text-[13px] outline-none focus:border-[#116a73]" /><Button type="submit" disabled={query.isLoading}>{query.isLoading ? 'Looking up…' : 'Look up'}</Button></form>{query.isError && <div data-testid={`status-${type}-error`} className="mt-4 border border-[#ddb5a7] bg-[#fbede7] p-3 text-[12px] text-[#8e3b2e]">No record was found for this application ID.</div>}{type === 'receipt' && receiptQuery.data && <div data-testid="card-receipt-result" className="mt-6 border border-[#9fc3b0] bg-[#edf6ee] p-4"><div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#286342]"><Check size={16} /> Record found</div><dl className="grid gap-2 text-[12px] sm:grid-cols-2"><div><dt className="text-[#718078]">Receipt number</dt><dd data-testid="text-lookup-receipt-number" className="font-bold text-[#285443]">{receiptQuery.data.receiptNumber}</dd></div><div><dt className="text-[#718078]">Amount paid</dt><dd className="font-bold text-[#285443]">₹{receiptQuery.data.amount.toFixed(2)}</dd></div><div><dt className="text-[#718078]">Paid on</dt><dd className="font-bold text-[#285443]">{formatDate(receiptQuery.data.paidOn)}</dd></div></dl><Button variant="gold" className="mt-4" onClick={() => window.print()}><Download size={15} /> Print receipt</Button></div>}{type === 'certificate' && certificateQuery.data && <div data-testid="card-certificate-result" className="mt-6 border border-[#9fc3b0] bg-[#edf6ee] p-4"><div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#286342]"><Check size={16} /> Record found</div><dl className="grid gap-2 text-[12px] sm:grid-cols-2"><div><dt className="text-[#718078]">Certificate number</dt><dd data-testid="text-lookup-certificate-number" className="font-bold text-[#285443]">{certificateQuery.data.certificateNumber}</dd></div><div><dt className="text-[#718078]">Issued on</dt><dd className="font-bold text-[#285443]">{formatDate(certificateQuery.data.issuedOn)}</dd></div><div><dt className="text-[#718078]">Service</dt><dd className="font-bold text-[#285443]">{certificateQuery.data.serviceName}</dd></div></dl><Button variant="gold" className="mt-4" onClick={() => setShowCertificate(true)}><FileCheck2 size={15} /> View original certificate</Button></div>}</section></div></>;
}

function HelpPage() {
  return <><PageHeading eyebrow="Support" title="Help &amp; Contact" detail="Reach our citizen support team for assistance with e-Sevai services." />
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="portal-card tn-shadow p-6">
        <h2 className="mb-3 text-[15px] font-bold text-[#0a2240]">Citizen Helpline</h2>
        <p className="text-[13px] leading-6 text-[#54687a]">For technical support or application queries, call our toll-free helpline:</p>
        <div className="mt-4 text-[22px] font-extrabold text-[#0a5c8a]">1800-425-1333</div>
        <p className="mt-1 text-[11px] text-[#8a9bae]">Monday – Saturday · 8 AM to 8 PM</p>
      </section>
      <section className="portal-card tn-shadow p-6">
        <h2 className="mb-3 text-[15px] font-bold text-[#0a2240]">e-Sevai Centres</h2>
        <p className="text-[13px] leading-6 text-[#54687a]">Visit your nearest e-Sevai centre for in-person assistance with documents and applications.</p>
        <Link href="/services" className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-[#0a5c8a] underline"><ArrowRight size={14} /> Find a service online</Link>
      </section>
    </div>
  </>;
}

function VaultPage() {
  const { vault, setVault } = useData();
  const { user } = useAuth();
  const [printDoc, setPrintDoc] = useState<any | null>(null);

  const mockApp = printDoc ? {
    id: Date.now(),
    applicationNumber: printDoc.idNumber,
    serviceId: printDoc.type.toLowerCase().includes('income') ? 3 : printDoc.type.toLowerCase().includes('community') ? 2 : 1,
    serviceName: printDoc.type,
    applicantName: printDoc.name,
    status: 'Approved',
    submittedAt: printDoc.uploadedAt || new Date().toISOString(),
    updatedAt: printDoc.uploadedAt || new Date().toISOString(),
    remarks: ''
  } as Application : null;

  return <><CertificateModal open={!!printDoc} onClose={() => setPrintDoc(null)} app={mockApp} /><PageHeading eyebrow="Document Vault" title="Citizen Access Number (CAN) Data" detail="Store your certificates securely to automatically pre-fill applications." />
    <label className="border-2 border-dashed border-[#116a73] bg-[#f8fbfb] p-8 text-center cursor-pointer block mb-6 hover:bg-[#e4efef] transition-colors tn-shadow">
      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            let docType = file.name.split('.')[0] || 'Uploaded Document';
            docType = docType.length > 25 ? docType.substring(0, 25) + '...' : docType;
            const updatedDocs = [...vault, {
              type: docType,
              idNumber: `TN-CAN-${Math.floor(Math.random() * 10000)}`,
              name: user ? `${user.firstName} ${user.lastName}` : 'Citizen',
              uploadedAt: new Date().toISOString(),
              blobUrl: base64,
              fileName: file.name
            }];
            setVault(updatedDocs);
            localStorage.setItem('citizen_vault_docs', JSON.stringify(updatedDocs));
          };
          reader.readAsDataURL(file);
        }
      }} />
      <Upload size={32} className="mx-auto text-[#116a73] mb-3" />
      <div className="font-bold text-[#1d554e] text-[16px]">Upload Document / Link to CAN</div>
      <div className="text-[12px] text-[#63736b] mt-1">Select a PDF or image file from your device to append it to your active CAN data vault</div>
    </label>

    {vault.length ? <div className="grid gap-4 lg:grid-cols-2">{vault.map((v, i) => <div key={i} className="border border-[#c9c3b3] p-5 bg-[#fffef9] flex gap-4"><FileText className="text-[#116a73] shrink-0" size={36} /><div className="flex-1"><div className="font-bold text-[#1d554e] text-[15px]">{v.type}</div><div className="text-[12px] text-[#5b7374] font-mono mt-0.5">{v.idNumber}</div><div className="text-[12px] text-[#63736b] mt-3 space-y-1"><div className="flex justify-between gap-4"><span className="text-[#8c9c94]">Name</span><span className="font-semibold text-[#3a5248] text-right">{v.name}</span></div>{v.fatherName && <div className="flex justify-between gap-4"><span className="text-[#8c9c94]">Father's Name</span><span className="font-semibold text-[#3a5248] text-right">{v.fatherName}</span></div>}{v.community && <div className="flex justify-between gap-4"><span className="text-[#8c9c94]">Community</span><span className="font-semibold text-[#3a5248] text-right">{v.community}</span></div>}{v.dob && <div className="flex justify-between gap-4"><span className="text-[#8c9c94]">Date of Birth</span><span className="font-semibold text-[#3a5248] text-right">{v.dob}</span></div>}{v.district && <div className="flex justify-between gap-4"><span className="text-[#8c9c94]">District</span><span className="font-semibold text-[#3a5248] text-right">{v.district}</span></div>}</div><div className="flex gap-2 mt-4">{v.blobUrl ? <Button variant="outline" className="flex-1 text-[12px] py-1.5 h-auto text-[#116a73] border-[#116a73] hover:bg-[#116a73] hover:text-white" onClick={() => { const a = document.createElement('a'); a.href = v.blobUrl!; a.download = v.fileName || v.type; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100); }}><Download size={14} /> Download</Button> : <Button variant="outline" className="flex-1 text-[12px] py-1.5 h-auto text-[#116a73] border-[#116a73] hover:bg-[#116a73] hover:text-white" onClick={() => setPrintDoc(v)}><Download size={14} /> View</Button>}<Button variant="outline" className="text-[12px] py-1.5 h-auto px-3 bg-white text-[#922828] border-[#922828] hover:bg-[#922828] hover:text-white" onClick={() => { const filtered = vault.filter(doc => doc.idNumber !== v.idNumber); setVault(filtered); localStorage.setItem('citizen_vault_docs', JSON.stringify(filtered)); }}><Trash2 size={14} /> Remove</Button></div></div></div>)}</div> : <EmptyState title="No documents" detail="Upload your first document to sync with CAN." />}
  </>;
}
function TrackStatusPage() {
  const [reference, setReference] = useState('');
  const [searchedRef, setSearchedRef] = useState('');
  const { apps } = useData();
  const application = apps.find(a => a.applicationNumber === searchedRef);
  const [showCertificate, setShowCertificate] = useState(false);

  function submit(e: FormEvent) { e.preventDefault(); setSearchedRef(reference); }

  const stages = [
    'Application Submitted',
    'Field Verification by VAO (Approved)',
    'Revenue Inspector Review (Approved)',
    'Digitally Signed by Tahsildar (Ready for Download)'
  ];
  const done = application ? (application.status.toLowerCase().includes('approved') ? 4 : application.status.toLowerCase().includes('verification') ? 2 : 1) : 0;

  return <><CertificateModal open={showCertificate} onClose={() => setShowCertificate(false)} app={application} /><PageHeading eyebrow="Tracking" title="Track Application Status" detail="Enter your alphanumeric reference ID to track the real-time progress of your application." />
    <div className="mx-auto max-w-[720px]"><section className="border border-[#c9c3b3] bg-[#fffef9] p-5 sm:p-7"><div className="mb-5 flex h-12 w-12 items-center justify-center bg-[#dcebea] text-[#116a73]"><Search size={24} /></div><h2 className="text-[17px] font-bold text-[#1d554e]">Enter application reference</h2>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row"><input data-testid="input-track-lookup" value={reference} onChange={e => setReference(e.target.value)} required placeholder="e.g. TN-REV-2026-10807" className="portal-focus h-10 flex-1 border border-[#9fb2ab] bg-[#fcfbf6] px-3 text-[13px] outline-none focus:border-[#116a73]" /><Button type="submit">Track Status</Button></form>
      {searchedRef && !application && <div className="mt-4 border border-[#ddb5a7] bg-[#fbede7] p-3 text-[12px] text-[#8e3b2e]">No record found for this reference ID. Please check the number and try again.</div>}
      {application && <div className="mt-8 border-t border-[#e2ddd0] pt-6"><h3 className="font-bold text-[#1d4f58] mb-6">Tracking complete for {application.serviceName}</h3><div className="p-5 border border-[#c9d0c6] bg-[#fdfdfc]">{stages.map((stage, i) => <div key={stage} className="relative flex gap-4 pb-7 last:pb-0"><div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center border-2 border-[#80a89f] bg-[#fffef9] text-[11px] font-bold text-[#26756a]">{i < done ? <Check size={14} /> : i + 1}</div>{i < stages.length - 1 && <div className={`absolute left-[13px] top-7 h-full w-px ${i < done - 1 ? 'bg-[#4b9179]' : 'bg-[#cbd3c9]'}`} />}<div><div className={`text-[13px] font-bold ${i < done ? 'text-[#315b50]' : 'text-[#89918a]'}`}>{stage}</div><div className="mt-1 text-[11px] text-[#77847b]">{i === 0 ? formatDate(application.submittedAt) : i < done ? 'Completed' : 'Pending'}</div></div></div>)}
        {done === 4 && <div className="mt-6 pt-4 border-t border-[#e5e5dc]"><Button variant="gold" onClick={() => setShowCertificate(true)}><FileCheck2 size={15} /> Download Certificate</Button></div>}
      </div></div>}
    </section></div></>;
}

function Router() {
  return <ErrorBoundary resetKey={useLocation()[0]}><Switch>
    <Route path="/login" component={LoginPage} />
    <Route path="/register" component={RegistrationPage} />
    <Route path="/dashboard"><Shell><DashboardPage /></Shell></Route>
    <Route path="/services/:id"><Shell><ServiceDetailPage /></Shell></Route>
    <Route path="/services"><Shell><ServicesPage /></Shell></Route>
    <Route path="/apply/:id"><Shell><ApplyPage /></Shell></Route>
    <Route path="/applications/:id"><Shell><ApplicationDetailPage /></Shell></Route>
    <Route path="/saved-applications"><Shell><ApplicationListPage /></Shell></Route>
    <Route path="/returned-applications"><Shell><ApplicationListPage returned /></Shell></Route>
    <Route path="/vault"><Shell><VaultPage /></Shell></Route>
    <Route path="/track"><Shell><TrackStatusPage /></Shell></Route>
    <Route path="/reprint-receipt"><Shell><LookupPage type="receipt" /></Shell></Route>
    <Route path="/certificate-download"><Shell><LookupPage type="certificate" /></Shell></Route>
    <Route path="/help"><Shell><HelpPage /></Shell></Route>
    <Route path="/"><RedirectToDashboard /></Route>
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}
function RedirectToDashboard() { const [, setLocation] = useLocation(); useEffect(() => setLocation('/dashboard'), [setLocation]); return <div className="portal-grid min-h-[100dvh]" />; }
function App() {
  const [user, setUser] = useState<User | null>({ id: 1, email: 'asuwath@esevai.tn.gov.in', firstName: 'Asuwath Kumaresh', lastName: 'V', role: 'citizen' });
  const [apps, setApps] = useState<Application[]>([]);
  const [vault, setVault] = useState<VaultDoc[]>([]);
  useEffect(() => {
    if (user && apps.length === 0) {
      setApps(makeFallbackApps(user.firstName + ' ' + user.lastName));

      const savedVault = localStorage.getItem('citizen_vault_docs');
      if (savedVault) {
        try {
          setVault(JSON.parse(savedVault));
        } catch (e) {
          console.error("Failed to parse local vault config");
        }
      } else {
        const defaultVault: VaultDoc[] = [];
        setVault(defaultVault);
        localStorage.setItem('citizen_vault_docs', JSON.stringify(defaultVault));
      }
    }
  }, [user]);
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <DataContext.Provider value={{ apps, setApps, vault, setVault }}>
        <QueryClientProvider client={new QueryClient()}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}
export default App;