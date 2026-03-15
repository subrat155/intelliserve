import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { deleteDoc, auth, googleProvider, signInWithPopup, signOut, db, collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, getDocs, addDoc, getDoc } from './firebase';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';

export interface User extends FirebaseAuthUser {
  employeeId?: string;
}


import { 
  MessageSquare, 
  LayoutDashboard, 
  BookOpen, 
  History, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Menu,
  X,
  Loader2,
  Briefcase,
  Headphones,
  Megaphone,
  User as UserIcon,
  Send,
  Search,
  FileText,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getChatResponse, generateEmbedding, cosineSimilarity } from './services/geminiService';
import axios from 'axios';

// --- Components ---

const Sidebar = ({ user, isAdmin, onLogout, theme, toggleTheme, isMobileMenuOpen, setIsMobileMenuOpen }: { user: User, isAdmin: boolean, onLogout: () => void, theme: 'light' | 'dark', toggleTheme: () => void, isMobileMenuOpen?: boolean, setIsMobileMenuOpen?: (open: boolean) => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  let navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: MessageSquare, label: 'Chatbot', path: '/chat' },
    { icon: BookOpen, label: 'Knowledge Base', path: '/kb' },
    { icon: Briefcase, label: 'Employee Services', path: '/services' },
    { icon: Headphones, label: 'IT Support', path: '/it' },
    { icon: History, label: 'Query History', path: '/history' },
    { icon: UserIcon, label: 'Profile', path: '/profile' },
  ];

  if (isAdmin) {
    navItems.push({ icon: ShieldCheck, label: 'Admin Panel', path: '/admin' });
  }

  if (localStorage.getItem('isHR') === 'true') {
    navItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: MessageSquare, label: 'Chatbot', path: '/chat' },
    ];
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen?.(false)}
        />
      )}
      <div className={`fixed md:static inset-y-0 left-0 z-50 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200 h-screen transition-all duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="https://cdn-icons-png.flaticon.com/128/3845/3845696.png" alt="IntelliServe Logo" className="w-8 h-8" referrerPolicy="no-referrer" />
            {isOpen && <h1 className="text-xl font-bold tracking-tighter text-emerald-400 dark:text-emerald-300">INTELLISERVE</h1>}
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className="hidden md:block p-1 hover:bg-slate-800 dark:hover:bg-slate-700 rounded">
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button onClick={() => setIsMobileMenuOpen?.(false)} className="md:hidden p-1 hover:bg-slate-800 dark:hover:bg-slate-700 rounded">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen?.(false)}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors group ${
                  isActive 
                    ? 'bg-slate-800 dark:bg-slate-700 text-emerald-400 dark:text-emerald-300' 
                    : 'hover:bg-slate-800 dark:hover:bg-slate-700'
                }`}
              >
                <item.icon size={20} className={`${isActive ? 'text-emerald-400 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500 group-hover:text-emerald-400 dark:group-hover:text-emerald-300'} animate-once shrink-0`} />
                {isOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 dark:border-slate-700 space-y-2">
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-4 p-3 w-full hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 rounded-xl transition-colors group"
          >
            {theme === 'light' ? <Moon size={20} className="shrink-0" /> : <Sun size={20} className="shrink-0" />}
            {isOpen && <span className="truncate">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 p-3 w-full hover:bg-red-900/20 text-red-400 rounded-xl transition-colors group"
          >
            <LogOut size={20} className="shrink-0" />
            {isOpen && <span className="truncate">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

// --- New Pages ---

const EmployeeServicesPage = ({ user }: { user: User }) => {
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let leavesLoaded = false;
    let payslipsLoaded = false;

    const q = query(collection(db, 'leaveRequests'), where('userId', '==', user.uid));
    const unsubLeaves = onSnapshot(q, snap => {
      setMyLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      leavesLoaded = true;
      if (payslipsLoaded) setLoading(false);
    });
    
    const qPayslips = query(collection(db, 'payslips'), where('userId', '==', user.uid));
    const unsubPayslips = onSnapshot(qPayslips, snap => {
      setMyPayslips(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      payslipsLoaded = true;
      if (leavesLoaded) setLoading(false);
    });

    return () => { unsubLeaves(); unsubPayslips(); };
  }, [user.uid]);

  const requestLeave = async () => {
    if (leaveReason.trim()) {
      setIsSubmitting(true);
      try {
        await addDoc(collection(db, 'leaveRequests'), {
          userId: user.uid,
          userName: user.displayName,
          reason: leaveReason.trim(),
          status: 'Pending',
          createdAt: serverTimestamp()
        });
        setLeaveReason('');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <iframe src="https://lottie.host/embed/d1a209ae-e74f-42fd-a485-de2bb136abdd/ks8Q6Q05Rc.lottie" width="300" height="300" title="Loading animation"></iframe>
      </div>
    );
  }

  return (
    <div className="p-8 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">Employee Services</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Leave Request</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Submit your leave application here.</p>
          
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Reason for leave..."
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button 
              onClick={requestLeave} 
              disabled={!leaveReason.trim() || isSubmitting}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl disabled:opacity-50"
            >
              Request
            </button>
          </div>
          
          {myLeaves.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">My Recent Requests</h3>
              <div className="space-y-2">
                {myLeaves.map(l => (
                  <div key={l.id} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl flex justify-between items-center">
                    <span className="text-sm font-medium dark:text-slate-200">{l.reason}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : l.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                      {l.status || 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4">Payroll Info</h2>
          <p className="text-slate-500 mb-4">View your recent payslips.</p>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {myPayslips.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-900">{p.month}</p>
                  <p className="text-xs text-slate-500">Uploaded: {p.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={() => setSelectedPayslip(p)} 
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  View Payslip
                </button>
              </div>
            ))}
            {myPayslips.length === 0 && <p className="text-slate-500 text-sm">No payslips available.</p>}
          </div>
        </div>
      </div>

      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg">Payslip: {selectedPayslip.month}</h2>
              <button onClick={() => setSelectedPayslip(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {selectedPayslip.fileData ? (
                <iframe src={selectedPayslip.fileData} className="w-full h-full border-0" title={`Payslip ${selectedPayslip.month}`} />
              ) : (
                <div className="prose max-w-none whitespace-pre-wrap">
                  No content available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ITSupportPage = () => (
  <div className="p-8 dark:text-white">
    <h1 className="text-3xl font-bold mb-6">IT Support</h1>
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-2xl">
      <h2 className="text-xl font-bold mb-4 dark:text-white">Intelliserve Support</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">For any technical issues or inquiries, please contact our support team using the details below.</p>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full text-emerald-600 dark:text-emerald-400">
            <Headphones size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Toll-Free Support Number</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">1800-474-474</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-400">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Email Support</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">support@intelliserve.com</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const EmployeeProfilePage = ({ user }: { user: User }) => (
  <div className="p-8 dark:text-white">
    <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Profile</h1>
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
      <p className="mb-2 text-slate-900 dark:text-white"><strong className="text-slate-900 dark:text-white">Employee ID:</strong> <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-emerald-700 dark:text-emerald-400 font-bold">{user.employeeId || '----'}</span></p>
      <p className="mb-2 text-slate-900 dark:text-white"><strong className="text-slate-900 dark:text-white">Name:</strong> {user.displayName}</p>
      <p className="text-slate-900 dark:text-white"><strong className="text-slate-900 dark:text-white">Email:</strong> {user.email}</p>
    </div>
    <div className="mt-8">
      <iframe src="https://lottie.host/embed/1374a9ef-4a4a-4a2e-b0d2-c9fe60740b20/M5xg1Y7qNK.lottie" width="100%" height="300px" title="Profile Animation"></iframe>
    </div>
  </div>
);

const HRAdminPage = ({ onLogout }: { onLogout: () => void }) => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [policyContent, setPolicyContent] = useState('');
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Payslip states
  const [payslipUser, setPayslipUser] = useState('');
  const [payslipMonth, setPayslipMonth] = useState('');
  const [payslipFile, setPayslipFile] = useState<File | null>(null);
  const [payslipError, setPayslipError] = useState('');
  const [isPayslipSubmitting, setIsPayslipSubmitting] = useState(false);

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    const unsubPolicies = onSnapshot(collection(db, 'documents'), (snap) => {
      setPolicies(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    const unsubLeaves = onSnapshot(collection(db, 'leaveRequests'), (snap) => {
      setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'employee')), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubPolicies(); unsubLeaves(); unsubUsers(); };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 800 * 1024) {
        setError('File size must be less than 800KB');
        setPolicyFile(null);
      } else {
        setError('');
        setPolicyFile(file);
      }
    }
  };

  const addPolicy = async () => {
    if (!newPolicyName.trim()) {
      setError('Policy name is required');
      return;
    }
    if (!policyContent.trim() && !policyFile) {
      setError('Please provide text content or upload a file');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let fileData = null;
      let fileType = null;

      if (policyFile) {
        const reader = new FileReader();
        fileData = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result);
          reader.readAsDataURL(policyFile);
        });
        fileType = policyFile.type;
      }

      await addDoc(collection(db, 'documents'), { 
        name: newPolicyName.trim(), 
        content: policyContent.trim(),
        fileData,
        fileType,
        category: 'Policy', 
        uploadedBy: 'HR', 
        createdAt: serverTimestamp() 
      });
      
      setNewPolicyName('');
      setPolicyContent('');
      setPolicyFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError('Failed to add policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLeaveStatus = async (id: string, status: string) => {
    await setDoc(doc(db, 'leaveRequests', id), { status }, { merge: true });
  };

  const handlePayslipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 800 * 1024) {
        setPayslipError('File size must be less than 800KB');
        setPayslipFile(null);
      } else {
        setPayslipError('');
        setPayslipFile(file);
      }
    }
  };

  const addPayslip = async () => {
    if (!payslipUser.trim() || !payslipMonth.trim() || !payslipFile) {
      setPayslipError('Please fill all fields and select a file');
      return;
    }

    setIsPayslipSubmitting(true);
    setPayslipError('');

    try {
      const reader = new FileReader();
      const fileData = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target?.result);
        reader.readAsDataURL(payslipFile);
      });

      await addDoc(collection(db, 'payslips'), { 
        userId: payslipUser.trim(),
        month: payslipMonth.trim(),
        fileData,
        fileType: payslipFile.type,
        uploadedBy: 'HR', 
        createdAt: serverTimestamp() 
      });
      
      setPayslipUser('');
      setPayslipMonth('');
      setPayslipFile(null);
      const fileInput = document.getElementById('payslip-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setPayslipError('Failed to upload payslip');
    } finally {
      setIsPayslipSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">HR Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Employee Directory</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-3 font-semibold text-slate-600">Employee ID</th>
                  <th className="p-3 font-semibold text-slate-600">Name</th>
                  <th className="p-3 font-semibold text-slate-600">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-sm font-bold text-emerald-600">{emp.employeeId || '----'}</td>
                    <td className="p-3 font-medium text-slate-900">{emp.displayName}</td>
                    <td className="p-3 text-slate-500 text-sm">{emp.email}</td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-500">No employees found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4">Add New Policy</h2>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="space-y-4">
            <input 
              type="text" 
              value={newPolicyName}
              onChange={(e) => setNewPolicyName(e.target.value)}
              placeholder="Policy Name"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold mb-2">Option 1: Upload File (PDF/DOCX, max 800KB)</p>
              <input 
                id="file-upload"
                type="file" 
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="text-sm w-full"
              />
            </div>

            <div className="text-center text-slate-400 font-medium">OR</div>

            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold mb-2">Option 2: Manual Text Entry</p>
              <textarea 
                value={policyContent}
                onChange={(e) => setPolicyContent(e.target.value)}
                placeholder="Type policy content here..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-32"
              />
            </div>

            <button 
              onClick={addPolicy} 
              disabled={isSubmitting}
              className="w-full bg-emerald-600 text-white px-4 py-3 font-semibold rounded-xl disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Policy'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4">Manage Policies</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {policies.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.fileData ? 'File Upload' : 'Text Entry'}</p>
                </div>
                <button onClick={() => deleteDoc(doc(db, 'documents', p.id))} className="text-red-500 text-sm font-semibold px-3 py-1 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
              </div>
            ))}
            {policies.length === 0 && <p className="text-slate-500 text-sm">No policies added yet.</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4">Leave Requests</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {leaveRequests.map(l => (
              <div key={l.id} className="p-4 bg-slate-50 rounded-xl">
                <p className="font-semibold text-sm text-slate-900">User ID: {l.userId}</p>
                <p className="text-sm text-slate-700 mt-1">Reason: {l.reason}</p>
                <p className="text-xs text-slate-400 mb-2 mt-1">{l.createdAt?.toDate().toLocaleString()}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {l.status || 'Pending'}
                  </span>
                  {(!l.status || l.status === 'Pending') && (
                    <div className="flex gap-2">
                      <button onClick={() => updateLeaveStatus(l.id, 'Approved')} className="text-emerald-600 text-xs font-bold hover:underline">Approve</button>
                      <button onClick={() => updateLeaveStatus(l.id, 'Rejected')} className="text-red-600 text-xs font-bold hover:underline">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {leaveRequests.length === 0 && <p className="text-slate-500 text-sm">No leave requests.</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4">Upload Payslip</h2>
          {payslipError && <p className="text-red-500 text-sm mb-4">{payslipError}</p>}
          <div className="space-y-4">
            <select 
              value={payslipUser}
              onChange={(e) => setPayslipUser(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.displayName} ({emp.employeeId || '----'})
                </option>
              ))}
            </select>
            <input 
              type="text" 
              value={payslipMonth}
              onChange={(e) => setPayslipMonth(e.target.value)}
              placeholder="Month/Year (e.g., March 2026)"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold mb-2">Upload Payslip (PDF, max 800KB)</p>
              <input 
                id="payslip-upload"
                type="file" 
                accept=".pdf"
                onChange={handlePayslipUpload}
                className="text-sm w-full"
              />
            </div>

            <button 
              onClick={addPayslip} 
              disabled={isPayslipSubmitting}
              className="w-full bg-blue-600 text-white px-4 py-3 font-semibold rounded-xl disabled:opacity-50"
            >
              {isPayslipSubmitting ? 'Uploading...' : 'Upload Payslip'}
            </button>
          </div>
        </div>
      </div>
      
      <button onClick={onLogout} className="mt-8 bg-red-600 text-white px-4 py-2 rounded-xl">Logout HR</button>
    </div>
  );
};

const LoginPage = ({ onHRLogin }: { onHRLogin: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [hrUsername, setHrUsername] = useState('');
  const [hrPassword, setHrPassword] = useState('');
  const [hrError, setHrError] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setLoginError('');
    console.log("Attempting Google Sign-in...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Sign-in result:", result);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const userSnap = await getDoc(userDocRef);
        let employeeId = '';
        if (userSnap.exists() && userSnap.data().employeeId && /^\d{4}$/.test(userSnap.data().employeeId)) {
          employeeId = userSnap.data().employeeId;
        } else {
          employeeId = Math.floor(1000 + Math.random() * 9000).toString();
        }

        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.email === 'kumarsubrat627@gmail.com' ? 'admin' : 'employee',
          employeeId: employeeId,
          createdAt: serverTimestamp()
        }, { merge: true });
        console.log("User document set successfully");
      } catch (firestoreError) {
        console.error("Firestore setDoc error:", firestoreError);
        setLoginError("Login successful, but failed to save user data. Please check console for details.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/cancelled-popup-request') {
        setLoginError("Sign-in was cancelled. Please try again.");
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError("The sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else {
        setLoginError("An error occurred during sign-in: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHrLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (hrUsername === 'hr00990099' && hrPassword === '909021') {
      onHRLogin();
    } else {
      setHrError('Invalid HR credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Interactive AI Lottie Animations */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 flex items-center justify-center opacity-10">
        <lottie-player 
          src="https://assets9.lottiefiles.com/packages/lf20_x1gjdldd.json"
          background="transparent" 
          speed="0.5" 
          style={{ width: '100%', height: '100%' }}
          loop 
          autoplay
        ></lottie-player>
      </div>
      
      {/* Interactive Floating Chatbot (Hover to play) */}
      <div className="absolute top-10 right-10 z-0 cursor-pointer hidden lg:block transition-transform hover:scale-110" title="Hover me!">
        <lottie-player 
          src="https://assets3.lottiefiles.com/packages/lf20_qp1q7mct.json"
          background="transparent" 
          speed="1" 
          style={{ width: '250px', height: '250px' }}
          hover
          loop
        ></lottie-player>
      </div>

      {/* Corner Styled Triangle (Top Left) */}
      <div className="absolute top-0 left-0 w-0 h-0 border-t-[100px] border-t-slate-900 border-r-[100px] border-r-transparent z-50"></div>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center items-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="claymorphism p-8 max-w-md w-full text-center border-4 border-red-500"
        >
          <h2 className="text-xl font-bold text-red-600 mb-4">Employee Sign In</h2>
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">INTELLISERVE</h1>
          <p className="text-slate-500 mb-8">AI-Driven Enterprise Support Chatbot</p>
          
          {loginError && <p className="text-red-500 text-sm mb-4">{loginError}</p>}

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                Sign in with Google
              </>
            )}
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="claymorphism p-8 max-w-md w-full"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-4">HR Login</h2>
          <form onSubmit={handleHrLogin} className="space-y-4">
            <input 
              type="text" 
              placeholder="HR User ID" 
              value={hrUsername}
              onChange={(e) => setHrUsername(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl"
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={hrPassword}
              onChange={(e) => setHrPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl"
            />
            {hrError && <p className="text-red-500 text-sm">{hrError}</p>}
            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700">
              HR Login
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

const Dashboard = ({ user }: { user: User }) => {
  const [latestPolicy, setLatestPolicy] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'documents'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      if (docs.length > 0) {
        setLatestPolicy(docs[0]);
      } else {
        setLatestPolicy(null);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, {user.displayName}</h1>
          <p className="text-slate-500 dark:text-slate-400">Here's what's happening in your support portal.</p>
        </div>
        <div className="bg-emerald-600 px-6 py-3 rounded-2xl text-center shadow-sm">
          <p className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">Employee ID</p>
          <p className="text-xl font-bold font-mono text-white">{user.employeeId || '----'}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Recent Queries', value: '12', icon: MessageSquare, color: 'bg-blue-500' },
          { label: 'Knowledge Base', value: '45 Docs', icon: BookOpen, color: 'bg-emerald-500' },
          { label: 'System Status', value: 'Active', icon: ShieldCheck, color: 'bg-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
            <motion.div 
              whileHover={{ y: -5 }}
              className="claymorphism p-6 flex items-center gap-4 h-full"
            >
              <div className={`${stat.color} p-4 rounded-2xl text-white`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="claymorphism p-6 animate-float" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/chat" className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl hover:bg-emerald-50 dark:hover:bg-slate-600 transition-colors flex flex-col items-center gap-2">
              <MessageSquare className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium dark:text-slate-200">Ask Question</span>
            </Link>
            <Link to="/kb" className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors flex flex-col items-center gap-2">
              <BookOpen className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium dark:text-slate-200">Browse Policies</span>
            </Link>
          </div>
        </div>

        <div className="claymorphism p-6 animate-float" style={{ animationDelay: '0.6s' }}>
          <h2 className="text-xl font-bold mb-4">Latest Policy Added</h2>
          <div className="space-y-4">
            {latestPolicy ? (
              <div className="flex gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-300">{latestPolicy.name}</h3>
                  <p className="text-sm text-emerald-800 dark:text-emerald-400 mt-1">Uploaded by {latestPolicy.uploadedBy}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">{latestPolicy.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No new policies at this time.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatbotPage = ({ user }: { user: User }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      // 1. Search for relevant context in Firestore
      const docsSnap = await getDocs(collection(db, 'documents'));
      const allDocs = docsSnap.docs.map(d => d.data());
      
      // In a real app, we'd use vector search. Here we'll do a simple keyword match for demo
      // or use the Gemini embedding service if we had a proper vector store.
      // For this applet, we'll simulate context retrieval.
      let context = "No specific context found.";
      if (allDocs.length > 0) {
        // Simple keyword search across all chunks
        const relevantChunks: string[] = [];
        allDocs.forEach(doc => {
          doc.chunks?.forEach((chunk: string) => {
            if (userMsg.toLowerCase().split(' ').some(word => chunk.toLowerCase().includes(word))) {
              relevantChunks.push(chunk);
            }
          });
        });
        if (relevantChunks.length > 0) {
          context = relevantChunks.slice(0, 3).join('\n\n');
        }
      }

      // 2. Get AI response
      const aiResponse = await getChatResponse(userMsg, context);
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse || "I'm sorry, I couldn't process that." }]);
      
      // 3. Save to history
      await addDoc(collection(db, 'queries'), {
        userId: user.uid,
        question: userMsg,
        answer: aiResponse,
        timestamp: serverTimestamp(),
        contextUsed: [context]
      });

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to AI service." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col max-w-4xl mx-auto p-4 w-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shrink-0">
              <MessageSquare size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white shrink-0">How can I help you today?</h2>
            <p className="text-slate-500 dark:text-slate-400 shrink-0">Ask me about HR policies, IT support, or company rules.</p>
            <div className="mt-4 w-full max-w-xs shrink-0">
              <iframe src="https://lottie.host/embed/bf00e926-7f55-4eed-8467-5b90f505847a/ssDtlyBD1T.lottie" width="100%" height="200px" title="Chatbot Animation" className="border-0"></iframe>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-600 rounded-tl-none'
            }`}>
              {msg.text}
              {msg.role === 'ai' && (
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerText = 'Adding...';
                    const name = msg.text.substring(0, 30) + '...';
                    await addDoc(collection(db, 'documents'), {
                      name,
                      chunks: [msg.text],
                      category: 'General',
                      uploadedBy: user.displayName,
                      createdAt: serverTimestamp()
                    });
                    btn.innerText = 'Added!';
                    setTimeout(() => {
                      btn.innerText = 'Add to Knowledge Base';
                      btn.disabled = false;
                    }, 2000);
                  }}
                  className="block mt-2 text-xs text-emerald-600 hover:underline font-semibold disabled:opacity-50"
                >
                  Add to Knowledge Base
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 rounded-tl-none flex items-center gap-2">
              <Loader2 className="animate-spin text-emerald-600" size={16} />
              <span className="text-sm text-slate-500">IntelliServe is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 flex gap-2">
        <input 
          ref={inputRef}
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your question here..."
          className="flex-1 bg-transparent outline-none px-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className="bg-emerald-600 text-white p-3 rounded-2xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

const KnowledgeBase = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'documents'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 dark:text-white">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Knowledge Base</h1>
          <p className="text-slate-500 dark:text-slate-400">Access all company policies and documents.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-emerald-500 transition-colors dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc, i) => (
          <div key={doc.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow animate-float" style={{ animationDelay: `${(i % 3) * 0.2}s` }}>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">{doc.name}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Uploaded by {doc.uploadedBy}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">{doc.category || 'General'}</span>
              <button onClick={() => setSelectedDoc(doc)} className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:underline">View Details</button>
            </div>
          </div>
        ))}
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h2 className="font-bold text-lg dark:text-white">{selectedDoc.name}</h2>
              <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full dark:text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {selectedDoc.fileData ? (
                <iframe src={selectedDoc.fileData} className="w-full h-full border-0" title={selectedDoc.name} />
              ) : (
                <div className="prose max-w-none whitespace-pre-wrap">
                  {selectedDoc.content || selectedDoc.chunks?.join('\n\n') || 'No content available.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryPage = ({ user }: { user: User }) => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'queries'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="p-4 md:p-8 dark:text-white">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6 md:mb-8">Query History</h1>
      <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Question</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">AI Response</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Date</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {history.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <td className="p-4 text-slate-900 dark:text-white font-medium">{item.question}</td>
                <td className="p-4 text-slate-500 dark:text-slate-400 text-sm max-w-xs md:max-w-md truncate">{item.answer}</td>
                <td className="p-4 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                  {item.timestamp?.toDate().toLocaleDateString()}
                </td>
                <td className="p-4">
                  <button 
                    onClick={async () => {
                      await deleteDoc(doc(db, 'queries', item.id));
                    }}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">No query history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App ---

console.log("App.tsx is loading...");

const FloatingChatButton = () => {
  const location = useLocation();
  if (location.pathname === '/chat') return null;
  
  return (
    <Link 
      to="/chat" 
      className="fixed bottom-6 right-6 bg-white dark:bg-slate-800 p-3 rounded-full shadow-xl hover:scale-110 transition-transform z-50 animate-float flex items-center justify-center border border-slate-200 dark:border-slate-700"
      style={{ animationDelay: '0s' }}
    >
      <img src="https://cdn-icons-gif.flaticon.com/19015/19015640.gif" alt="Chatbot" className="w-14 h-14" referrerPolicy="no-referrer" />
    </Link>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHR, setIsHR] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    console.log("Theme changed:", theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    console.log("App: Component mounted");
    const hr = localStorage.getItem('isHR') === 'true';
    setIsHR(hr);

    if (hr) {
      setUser({ uid: 'hr-admin', displayName: 'HR Admin', email: 'hr@example.com' } as any);
      setIsAdmin(true);
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log("App: Auth state changed:", u ? u.email : "No user");
      
      // If currently in HR mode, ignore Firebase auth changes for the UI
      if (localStorage.getItem('isHR') === 'true') {
        setLoading(false);
        return;
      }

      if (u) {
        try {
          console.log("App: Fetching user doc for", u.uid);
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          let customUser = { ...u } as User;
          if (userDoc.exists()) {
            const data = userDoc.data();
            const role = data.role;
            customUser.employeeId = data.employeeId;
            console.log("App: User role found:", role);
            setIsAdmin(role === 'admin');
          } else {
            console.log("App: No user doc found in Firestore for", u.uid);
            setIsAdmin(false);
          }
          setUser(customUser);
        } catch (e) {
          console.error("App: Error fetching user doc:", e);
          setUser(u as User);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    }, (error) => {
      console.error("App: Auth state change error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleHRLogin = () => {
    localStorage.setItem('isHR', 'true');
    setIsHR(true);
    setUser({ uid: 'hr-admin', displayName: 'HR Admin', email: 'hr@example.com' } as any);
    setIsAdmin(true);
  };

  const handleHRLogout = async () => {
    localStorage.removeItem('isHR');
    setIsHR(false);
    setIsAdmin(false);
    setUser(auth.currentUser); // Revert to Firebase user if any
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <iframe src="https://lottie.host/embed/d1a209ae-e74f-42fd-a485-de2bb136abdd/ks8Q6Q05Rc.lottie" width="300" height="300" title="Loading animation"></iframe>
          <p className="text-slate-400">Initializing INTELLISERVE...</p>
        </div>
      </div>
    );
  }

  if (!user && !isHR) {
    return <LoginPage onHRLogin={handleHRLogin} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {user && <Sidebar user={user} isAdmin={isAdmin} onLogout={handleHRLogout} theme={theme} toggleTheme={toggleTheme} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />}
        <main className="flex-1 overflow-y-auto dark:bg-slate-950 flex flex-col">
          {user && (
            <div className="md:hidden p-4 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <img src="https://cdn-icons-png.flaticon.com/128/3845/3845696.png" alt="IntelliServe Logo" className="w-8 h-8" referrerPolicy="no-referrer" />
                <h1 className="text-xl font-bold tracking-tighter text-emerald-600 dark:text-emerald-400">INTELLISERVE</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
                <Menu size={24} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 relative">
              <Routes>
                <Route path="/" element={isHR ? <HRAdminPage onLogout={handleHRLogout} /> : <Dashboard user={user!} />} />
                <Route path="/chat" element={<ChatbotPage user={user!} />} />
                <Route path="/kb" element={<KnowledgeBase />} />
                <Route path="/services" element={<EmployeeServicesPage user={user!} />} />
                <Route path="/it" element={<ITSupportPage />} />
                <Route path="/history" element={<HistoryPage user={user!} />} />
                <Route path="/profile" element={<EmployeeProfilePage user={user!} />} />
                <Route path="/admin" element={isAdmin ? <HRAdminPage onLogout={handleHRLogout} /> : <Navigate to="/" />} />
              </Routes>
            </div>
            <footer className="p-4 text-center text-sm text-slate-500 dark:text-slate-400 shrink-0">
              Design and Developed By Grp-255,GEC
            </footer>
          </div>
        </main>
        {user && <FloatingChatButton />}
      </div>
    </Router>
  );
}
