/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Sprout, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  History, 
  Map as MapIcon,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  ClipboardList,
  Calendar,
  ChevronDown,
  ChevronRight,
  LogOut,
  Lock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Firebase Imports
import { 
  auth, 
  db, 
  loginWithGoogle, 
  loginWithEmail,
  registerWithEmail,
  logout, 
  onAuthStateChanged, 
  User,
  OperationType,
  handleFirestoreError
} from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  Timestamp
} from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Mock Data ---

const INITIAL_SUMMARY = {
  totalRevenue: 45200,
  totalCosts: 28450,
  netProfit: 16750,
  revenueTrend: 12.5,
  costsTrend: -4.2,
};

const INITIAL_ACTIVITIES = [
  { id: 1, date: '2026-03-18', field: 'Campo Nord', type: 'Concimazione', resource: 'Urea', quantity: '50L', cost: 120 },
  { id: 2, date: '2026-03-17', field: 'Lotto Sud', type: 'Semina', resource: 'Sementi Mais', quantity: '20kg', cost: 450 },
  { id: 3, date: '2026-03-16', field: 'Vigneto Est', type: 'Raccolta', resource: 'Manodopera', quantity: '8h', cost: 160 },
  { id: 4, date: '2026-03-15', field: 'Campo Nord', type: 'Irrigazione', resource: 'Acqua', quantity: '1000L', cost: 30 },
  { id: 5, date: '2026-03-14', field: 'Lotto Ovest', type: 'Trattamento', resource: 'Fungicida', quantity: '10L', cost: 85 },
];

const MOCK_CHART_DATA = [
  { name: 'Campo Nord', profit: 4200, costs: 1800 },
  { name: 'Lotto Sud', profit: 3100, costs: 2200 },
  { name: 'Vigneto Est', profit: 5800, costs: 1500 },
  { name: 'Lotto Ovest', profit: 2400, costs: 1200 },
  { name: 'Serra A', profit: 1250, costs: 1750 },
];

const INITIAL_FIELDS = [
  { id: 1, name: 'Campo Nord', size: 12.5, cropType: 'Mais' },
  { id: 2, name: 'Lotto Sud', size: 8.2, cropType: 'Grano' },
  { id: 3, name: 'Vigneto Est', size: 5.0, cropType: 'Uva' },
  { id: 4, name: 'Lotto Ovest', size: 10.0, cropType: 'Orzo' },
  { id: 5, name: 'Serra A', size: 0.5, cropType: 'Pomodori' },
];

const ACTIVITY_TYPES = ['Concimazione', 'Semina', 'Raccolta', 'Irrigazione', 'Trattamento', 'Manodopera'];

// --- Components ---

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Login failed:", error);
      setError("Accesso con Google fallito.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError("Email o password non corretti.");
      } else if (error.code === 'auth/email-already-in-use') {
        setError("Email già in uso.");
      } else if (error.code === 'auth/weak-password') {
        setError("La password deve avere almeno 6 caratteri.");
      } else {
        setError("Si è verificato un errore durante l'autenticazione.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://picsum.photos/seed/farm/1920/1080?blur=10')] bg-cover bg-center">
      <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm" />
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-10 text-center border border-white/20 relative z-10">
        <div className="w-16 h-16 bg-emerald-800 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-900/20">
          <Sprout size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">AgroFix</h1>
        <p className="text-slate-500 mb-8 text-sm font-medium">Gestione Aziendale Agricola</p>
        
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div className="text-left">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="nome@azienda.it"
              required
            />
          </div>
          <div className="text-left">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-orange-600 bg-orange-50 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-800 text-white font-bold rounded-xl hover:bg-emerald-900 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              isRegistering ? 'Crea Account' : 'Accedi'
            )}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold"><span className="bg-white/95 px-2 text-slate-400">Oppure</span></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Google
        </button>

        <div className="mt-8">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            {isRegistering ? 'Hai già un account? Accedi' : 'Nuovo utente? Registrati ora'}
          </button>
        </div>
        
        <div className="flex items-center gap-2 justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
          <Lock size={12} />
          Multi-Tenancy Active
        </div>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, trend, type, onClick }: { 
  title: string, 
  value: string, 
  trend?: number, 
  type: 'revenue' | 'cost' | 'profit',
  onClick?: () => void
}) => {
  const isPositive = trend && trend > 0;
  
  const colors = {
    revenue: 'border-emerald-200 bg-white text-emerald-900',
    cost: 'border-orange-200 bg-white text-orange-900',
    profit: 'border-slate-200 bg-slate-900 text-white',
  };

  const iconColors = {
    revenue: 'text-emerald-600 bg-emerald-50',
    cost: 'text-orange-600 bg-orange-50',
    profit: 'text-white bg-slate-800',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md", 
        colors[type],
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2 rounded-lg", iconColors[type])}>
          {type === 'revenue' && <TrendingUp size={20} />}
          {type === 'cost' && <TrendingDown size={20} />}
          {type === 'profit' && <DollarSign size={20} />}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center text-xs font-bold px-2 py-1 rounded-full",
            isPositive ? "text-emerald-600 bg-emerald-50" : "text-orange-600 bg-orange-50"
          )}>
            {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className={cn("text-xs font-semibold uppercase tracking-wider opacity-70 mb-1")}>{title}</p>
        <h3 className="text-3xl font-bold font-mono">{value}</h3>
        {onClick && (
          <p className="text-[10px] mt-2 font-bold uppercase tracking-widest opacity-50 flex items-center gap-1">
            <Plus size={10} /> Vedi Dettagli
          </p>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([2025, 2026]);
  const [resourceTab, setResourceTab] = useState<'inventory' | 'sales'>('inventory');
  
  const [activities, setActivities] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [machinery, setMachinery] = useState<any[]>([]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
  }, []);

  // Firestore Listeners (Strict Multi-Tenancy: WHERE uid = user.uid)
  useEffect(() => {
    if (!user) return;

    const qFields = query(collection(db, 'fields'), where('uid', '==', user.uid));
    const unsubFields = onSnapshot(qFields, (snapshot) => {
      setFields(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'fields'));

    const qActivities = query(collection(db, 'activities'), where('uid', '==', user.uid));
    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'activities'));

    const qResources = query(collection(db, 'resources'), where('uid', '==', user.uid));
    const unsubResources = onSnapshot(qResources, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'resources'));

    const qSales = query(collection(db, 'sales'), where('uid', '==', user.uid));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));

    return () => {
      unsubFields();
      unsubActivities();
      unsubResources();
      unsubSales();
    };
  }, [user]);

  // Computed Dashboard Data (Filtered by Year)
  
  // Computed Dashboard Data (Filtered by Year)
  const filteredActivities = useMemo(() => 
    activities.filter(a => a.date.startsWith(selectedYear.toString())),
    [activities, selectedYear]
  );
  
  const filteredSales = useMemo(() => 
    sales.filter(s => s.date.startsWith(selectedYear.toString())),
    [sales, selectedYear]
  );

  const totalCosts = filteredActivities.reduce((sum, act) => sum + act.cost, 0);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
  const netProfit = totalRevenue - totalCosts;

  const chartData = fields.map(field => {
    const fieldCosts = filteredActivities
      .filter(act => act.field === field.name)
      .reduce((sum, act) => sum + act.cost, 0);
    const fieldRevenue = filteredSales
      .filter(sale => sale.field === field.name)
      .reduce((sum, sale) => sum + sale.totalRevenue, 0);
    return {
      name: field.name,
      profit: fieldRevenue - fieldCosts,
      costs: fieldCosts
    };
  });

  // Most efficient field
  const fieldEfficiencies = fields.map(field => {
    const fieldCosts = filteredActivities
      .filter(act => act.field === field.name)
      .reduce((sum, act) => sum + act.cost, 0);
    const fieldRevenue = filteredSales
      .filter(sale => sale.field === field.name)
      .reduce((sum, sale) => sum + sale.totalRevenue, 0);
    const profit = fieldRevenue - fieldCosts;
    return { name: field.name, profit };
  }).sort((a, b) => b.profit - a.profit);

  const bestField = fieldEfficiencies[0] || { name: 'Nessun campo', profit: 0 };

  const generateReport = useCallback(() => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text('AgroFix - Report Aziendale', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data Generazione: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30);
    doc.text(`Proprietario: ${user?.displayName || user?.email || 'N/A'}`, 14, 35);
    doc.text(`Anno di Riferimento: ${selectedYear}`, 14, 40);

    // Summary Section
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Riepilogo Finanziario', 14, 55);
    
    const summaryData = [
      ['Totale Ricavi', `€${totalRevenue.toLocaleString()}`],
      ['Totale Costi', `€${totalCosts.toLocaleString()}`],
      ['Utile Netto', `€${netProfit.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 60,
      head: [['Voce', 'Valore']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });

    // Activities Section
    doc.setFontSize(16);
    doc.text('Ultime Attività', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const activitiesData = filteredActivities.map(a => [
      a.date,
      a.field,
      a.type,
      a.resource,
      a.quantity,
      `€${a.cost.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Data', 'Campo', 'Tipo', 'Risorsa', 'Quantità', 'Costo']],
      body: activitiesData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Sales Section
    doc.setFontSize(16);
    doc.text('Vendite Prodotti', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const salesData = filteredSales.map(s => [
      s.date,
      s.product,
      s.field,
      s.quantity,
      `€${s.pricePerUnit.toLocaleString()}`,
      `€${s.totalRevenue.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Data', 'Prodotto', 'Campo', 'Quantità', 'Prezzo/Unità', 'Totale']],
      body: salesData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Fields Section
    doc.setFontSize(16);
    doc.text('Anagrafica Campi', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const fieldsData = fields.map(f => [
      f.name,
      `${f.size} ha`,
      f.cropType
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Nome Campo', 'Dimensione', 'Coltura']],
      body: fieldsData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Save PDF
    doc.save(`AgroFix_Report_${selectedYear}_${new Date().getTime()}.pdf`);
  }, [user, selectedYear, totalRevenue, totalCosts, netProfit, filteredActivities, filteredSales, fields]);

  // Breakdown Calculations
  const costsByActivity = filteredActivities.reduce((acc, act) => {
    acc[act.type] = (acc[act.type] || 0) + act.cost;
    return acc;
  }, {} as Record<string, number>);

  const costsByResource = filteredActivities.reduce((acc, act) => {
    const resName = act.resource || 'Altro';
    acc[resName] = (acc[resName] || 0) + act.cost;
    return acc;
  }, {} as Record<string, number>);

  const revenueByProduct = filteredSales.reduce((acc, sale) => {
    acc[sale.product] = (acc[sale.product] || 0) + sale.totalRevenue;
    return acc;
  }, {} as Record<string, number>);

  const revenueByField = filteredSales.reduce((acc, sale) => {
    acc[sale.field] = (acc[sale.field] || 0) + sale.totalRevenue;
    return acc;
  }, {} as Record<string, number>);
  
  // Modals state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isCostBreakdownOpen, setIsCostBreakdownOpen] = useState(false);
  const [isRevenueBreakdownOpen, setIsRevenueBreakdownOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isActivitiesMenuOpen, setIsActivitiesMenuOpen] = useState(false);
  const [isFieldDetailsModalOpen, setIsFieldDetailsModalOpen] = useState(false);
  const [selectedFieldDetails, setSelectedFieldDetails] = useState<typeof INITIAL_FIELDS[0] | null>(null);
  const [editingField, setEditingField] = useState<typeof INITIAL_FIELDS[0] | null>(null);
  const [editingResource, setEditingResource] = useState<any | null>(null);

  const [activityTypes, setActivityTypes] = useState(ACTIVITY_TYPES);
  const [isNewActivityType, setIsNewActivityType] = useState(false);
  const [customActivityType, setCustomActivityType] = useState('');

  const [newActivity, setNewActivity] = useState({
    field: INITIAL_FIELDS[0].name,
    type: ACTIVITY_TYPES[0],
    resource: 'Urea',
    quantity: '',
    cost: '',
  });

  const [fieldForm, setFieldForm] = useState({
    name: '',
    size: '',
    cropType: '',
  });

  const [resourceForm, setResourceForm] = useState({
    name: '',
    unitCost: '',
    unit: '',
  });

  const [saleForm, setSaleForm] = useState({
    product: '',
    quantity: '',
    pricePerUnit: '',
    priceUnit: 'kg', // 'kg' or 'q' (quintale)
    totalRevenue: '',
    field: INITIAL_FIELDS[0].name,
  });

  const [laborEntries, setLaborEntries] = useState([{ field: INITIAL_FIELDS[0].name, hours: '' }]);
  const [laborDate, setLaborDate] = useState(`${selectedYear}-03-19`);
  const [newYearInput, setNewYearInput] = useState('');

  // Update labor date when year changes
  useEffect(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setLaborDate(`${selectedYear}-${month}-${day}`);
  }, [selectedYear]);

  // Auto-calculate total revenue for sales
  useEffect(() => {
    const qty = Number(saleForm.quantity) || 0;
    const price = Number(saleForm.pricePerUnit) || 0;
    let total = 0;
    
    if (saleForm.priceUnit === 'kg') {
      total = qty * price;
    } else {
      // Quintale = 100kg
      total = (qty / 100) * price;
    }
    
    setSaleForm(prev => ({ ...prev, totalRevenue: total.toFixed(2) }));
  }, [saleForm.quantity, saleForm.pricePerUnit, saleForm.priceUnit]);

  const closeActivityModal = () => {
    setIsActivityModalOpen(false);
    setIsNewActivityType(false);
    setCustomActivityType('');
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const finalType = isNewActivityType ? customActivityType : newActivity.type;
    
    if (isNewActivityType && customActivityType && !activityTypes.includes(customActivityType)) {
      setActivityTypes([...activityTypes, customActivityType]);
    }

    const activityData = {
      date: `${selectedYear}-${month}-${day}`,
      ...newActivity,
      type: finalType,
      cost: Number(newActivity.cost),
      uid: user.uid,
      createdAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'activities'), activityData);
      closeActivityModal();
      setNewActivity({
        field: fields[0]?.name || '',
        type: activityTypes[0],
        resource: '',
        quantity: '',
        cost: '',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'activities');
    }
  };

  const handleAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(newYearInput);
    if (!isNaN(year) && !availableYears.includes(year)) {
      setAvailableYears([...availableYears, year].sort((a, b) => b - a));
      setSelectedYear(year);
      setIsYearModalOpen(false);
      setNewYearInput('');
    }
  };

  const handleFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const fieldData = {
      name: fieldForm.name,
      size: Number(fieldForm.size),
      cropType: fieldForm.cropType,
      uid: user.uid
    };

    try {
      if (editingField) {
        await updateDoc(doc(db, 'fields', editingField.id), fieldData);
      } else {
        await addDoc(collection(db, 'fields'), fieldData);
      }
      setIsFieldModalOpen(false);
      setEditingField(null);
      setFieldForm({ name: '', size: '', cropType: '' });
    } catch (err) {
      handleFirestoreError(err, editingField ? OperationType.UPDATE : OperationType.CREATE, 'fields');
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!user) return;
    const fieldToDelete = fields.find(f => f.id === id);
    if (!fieldToDelete) return;
    
    if (window.confirm(`Sei sicuro di voler eliminare il campo "${fieldToDelete.name}"? Tutte le attività associate rimarranno ma non saranno più collegate a un campo esistente.`)) {
      try {
        await deleteDoc(doc(db, 'fields', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'fields');
      }
    }
  };

  const openEditField = (field: typeof INITIAL_FIELDS[0]) => {
    setEditingField(field);
    setFieldForm({
      name: field.name,
      size: field.size.toString(),
      cropType: field.cropType,
    });
    setIsFieldModalOpen(true);
  };

  const openAddField = () => {
    setEditingField(null);
    setFieldForm({ name: '', size: '', cropType: '' });
    setIsFieldModalOpen(true);
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const resourceData = {
      name: resourceForm.name,
      unitCost: Number(resourceForm.unitCost),
      unit: resourceForm.unit,
      uid: user.uid
    };

    try {
      if (editingResource) {
        await updateDoc(doc(db, 'resources', editingResource.id), resourceData);
      } else {
        await addDoc(collection(db, 'resources'), resourceData);
      }
      setIsResourceModalOpen(false);
      setEditingResource(null);
      setResourceForm({ name: '', unitCost: '', unit: '' });
    } catch (err) {
      handleFirestoreError(err, editingResource ? OperationType.UPDATE : OperationType.CREATE, 'resources');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa risorsa?")) {
      try {
        await deleteDoc(doc(db, 'resources', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'resources');
      }
    }
  };

  const openEditResource = (res: any) => {
    setEditingResource(res);
    setResourceForm({
      name: res.name,
      unitCost: res.unitCost.toString(),
      unit: res.unit,
    });
    setIsResourceModalOpen(true);
  };

  const openAddResource = () => {
    setEditingResource(null);
    setResourceForm({ name: '', unitCost: '', unit: '' });
    setIsResourceModalOpen(true);
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const saleData = {
      date: `${selectedYear}-${month}-${day}`,
      product: saleForm.product,
      quantity: Number(saleForm.quantity),
      totalRevenue: Number(saleForm.totalRevenue),
      field: saleForm.field,
      uid: user.uid,
      createdAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'sales'), saleData);
      setIsSaleModalOpen(false);
      setSaleForm({ 
        product: '', 
        quantity: '', 
        pricePerUnit: '', 
        priceUnit: 'kg', 
        totalRevenue: '', 
        field: fields[0]?.name || '' 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sales');
    }
  };

  const handleAddLabor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const laborResource = resources.find(r => r.name === 'Manodopera');
    const unitCost = laborResource?.unitCost || 20;

    const entries = laborEntries.filter(entry => entry.field && Number(entry.hours) > 0);
    if (entries.length === 0) return;

    try {
      for (const entry of entries) {
        const activityData = {
          date: laborDate,
          field: entry.field,
          type: 'Manodopera',
          resource: 'Manodopera',
          quantity: `${entry.hours}h`,
          cost: Number(entry.hours) * unitCost,
          uid: user.uid,
          createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'activities'), activityData);
      }
      setIsLaborModalOpen(false);
      setLaborEntries([{ field: fields[0]?.name || '', hours: '' }]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'activities');
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa vendita?")) {
      try {
        await deleteDoc(doc(db, 'sales', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'sales');
      }
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-white shrink-0">
            <Sprout size={24} />
          </div>
          <span className="hidden md:block font-bold text-xl tracking-tight text-emerald-900">AgroFix</span>
        </div>

        <div className="flex-1 px-4 py-6 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'fields', icon: MapIcon, label: 'Campi' },
            { id: 'resources', icon: Package, label: 'Risorse' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === item.id 
                  ? "bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon size={20} />
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          ))}

          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('history');
                setIsActivitiesMenuOpen(!isActivitiesMenuOpen);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all",
                activeTab === 'history'
                  ? "bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={20} />
                <span className="hidden md:block font-medium">Attività</span>
              </div>
              <ChevronDown size={16} className={cn("hidden md:block transition-transform", isActivitiesMenuOpen && "rotate-180")} />
            </button>
            
            {isActivitiesMenuOpen && (
              <div className="hidden md:block ml-9 space-y-1 py-1 border-l-2 border-emerald-100 pl-4">
                <button 
                  onClick={() => setIsActivityModalOpen(true)}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  Nuova Attività
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                >
                  Registro Storico
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button 
            onClick={() => setIsActivityModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
          >
            <Plus size={20} />
            <span className="hidden md:block font-bold uppercase text-xs tracking-widest">Nuova Attività</span>
          </button>
          <button 
            onClick={() => setIsLaborModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Users size={20} />
            <span className="hidden md:block font-bold uppercase text-xs tracking-widest">Manodopera</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pl-20 md:pl-64 min-h-screen">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-6 flex justify-between items-center z-40">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Dashboard Aziendale'}
              {activeTab === 'fields' && 'Gestione Campi'}
              {activeTab === 'resources' && 'Magazzino Risorse'}
              {activeTab === 'history' && 'Registro Storico'}
            </h1>
            <p className="text-slate-500 text-sm">
              {activeTab === 'dashboard' && 'Panoramica delle performance agricole'}
              {activeTab === 'fields' && 'Monitoraggio lotti e colture'}
              {activeTab === 'resources' && 'Inventario e costi unitari'}
              {activeTab === 'history' && 'Tutte le operazioni effettuate'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer px-2"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>Anno {year}</option>
                ))}
              </select>
              <button 
                onClick={() => setIsYearModalOpen(true)}
                className="p-2 bg-white text-emerald-800 rounded-lg shadow-sm hover:bg-emerald-50 transition-all"
                title="Aggiungi Anno"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Oggi</p>
              <p className="text-sm font-semibold text-slate-700">19 Marzo {selectedYear}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden group relative cursor-pointer">
              <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="Avatar" referrerPolicy="no-referrer" />
              <button 
                onClick={() => logout()}
                className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Ricavi Totali" 
                  value={`€${totalRevenue.toLocaleString()}`} 
                  trend={12.5}
                  type="revenue"
                  onClick={() => setIsRevenueBreakdownOpen(true)}
                />
                <StatCard 
                  title="Costi Totali" 
                  value={`€${totalCosts.toLocaleString()}`} 
                  trend={-4.2}
                  type="cost"
                  onClick={() => setIsCostBreakdownOpen(true)}
                />
                <StatCard 
                  title="Profitto Netto" 
                  value={`€${netProfit.toLocaleString()}`} 
                  type="profit"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-600" />
                      Performance per Campo
                    </h2>
                    <select className="bg-slate-50 border-none text-xs font-bold rounded-lg px-3 py-2 text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option>Ultimi 30 giorni</option>
                      <option>Ultimo trimestre</option>
                      <option>Anno corrente</option>
                    </select>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="profit" radius={[4, 4, 0, 0]} barSize={32}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit > 0 ? '#065f46' : '#c2410c'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quick Stats / Info */}
                <div className="bg-emerald-900 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-800 rounded-full blur-3xl opacity-50" />
                  <div className="relative z-10">
                    <h2 className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-4">Focus Efficienza</h2>
                    <div className="space-y-6">
                      <div>
                        <p className="text-3xl font-bold font-mono">€{(totalCosts / (fields.reduce((s, f) => s + f.size, 0) || 1)).toFixed(2)}</p>
                        <p className="text-emerald-400 text-xs font-medium">Costo medio per ettaro</p>
                      </div>
                      <div className="h-1 w-full bg-emerald-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 w-3/4" />
                      </div>
                      <p className="text-sm text-emerald-100 leading-relaxed">
                        Il campo <span className="font-bold text-white">{bestField.name}</span> è attualmente il più redditizio con un margine di <span className="font-bold text-white">€{bestField.profit.toLocaleString()}</span>.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={generateReport}
                    className="relative z-10 mt-8 w-full py-3 bg-white text-emerald-900 font-bold rounded-xl hover:bg-emerald-50 transition-colors"
                  >
                    Genera Report PDF
                  </button>
                </div>
              </div>

              {/* Activity Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <History size={18} className="text-slate-400" />
                    Ultime Attività
                  </h2>
                  <button onClick={() => setActiveTab('history')} className="text-xs font-bold text-emerald-700 hover:underline">Vedi tutto</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Campo</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Operazione</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Risorsa</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Quantità</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Costo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActivities.slice(0, 5).map((activity) => (
                        <tr key={activity.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">{activity.date}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900">{activity.field}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-md",
                              activity.type === 'Concimazione' ? "bg-blue-50 text-blue-700" :
                              activity.type === 'Semina' ? "bg-emerald-50 text-emerald-700" :
                              activity.type === 'Raccolta' ? "bg-purple-50 text-purple-700" :
                              activity.type === 'Irrigazione' ? "bg-cyan-50 text-cyan-700" :
                              activity.type === 'Manodopera' ? "bg-amber-50 text-amber-700" :
                              "bg-slate-100 text-slate-600"
                            )}>
                              {activity.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{activity.resource}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{activity.quantity}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">€{activity.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Elenco Lotti di Terreno</h2>
                <button 
                  onClick={openAddField}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-900 transition-all"
                >
                  <Plus size={18} />
                  Aggiungi Campo
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fields.map((field) => (
                  <div key={field.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700">
                        <MapIcon size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openEditField(field)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <span className="text-xs font-bold">Modifica</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteField(field.id)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >
                          <span className="text-xs font-bold">Elimina</span>
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{field.name}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Dimensione:</span>
                        <span className="font-bold text-slate-700">{field.size} ha</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Coltura:</span>
                        <span className="font-bold text-emerald-700">{field.cropType}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedFieldDetails(field);
                        setIsFieldDetailsModalOpen(true);
                      }}
                      className="w-full mt-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <ClipboardList size={14} />
                      Dettagli Attività
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History size={18} className="text-slate-400" />
                  Registro Storico Completo
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Campo</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Operazione</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Risorsa</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Quantità</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">{activity.date}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{activity.field}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-1 rounded-md",
                            activity.type === 'Concimazione' ? "bg-blue-50 text-blue-700" :
                            activity.type === 'Semina' ? "bg-emerald-50 text-emerald-700" :
                            activity.type === 'Raccolta' ? "bg-purple-50 text-purple-700" :
                            activity.type === 'Irrigazione' ? "bg-cyan-50 text-cyan-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {activity.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{activity.resource}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{activity.quantity}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">€{activity.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setResourceTab('inventory')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      resourceTab === 'inventory' ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Inventario
                  </button>
                  <button 
                    onClick={() => setResourceTab('sales')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      resourceTab === 'sales' ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Vendite
                  </button>
                </div>
                
                {resourceTab === 'inventory' ? (
                  <button 
                    onClick={openAddResource}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-900 transition-all"
                  >
                    <Plus size={18} />
                    Aggiungi Risorsa
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsSaleModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-900 transition-all"
                  >
                    <Plus size={18} />
                    Registra Vendita
                  </button>
                )}
              </div>

              {resourceTab === 'inventory' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources.map((res) => (
                    <div key={res.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                          <Package size={24} />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openEditResource(res)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          >
                            <span className="text-xs font-bold">Modifica</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteResource(res.id)}
                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                          >
                            <span className="text-xs font-bold">Elimina</span>
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{res.name}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Costo Unitario:</span>
                          <span className="font-bold text-slate-700">€{res.unitCost} / {res.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                      <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Ricavo Totale Vendite</p>
                      <h3 className="text-3xl font-bold text-emerald-900 font-mono">€{totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Profitto Netto Aziendale</p>
                      <h3 className="text-3xl font-bold text-white font-mono">€{netProfit.toLocaleString()}</h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Prodotto</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Campo Origine</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Quantità</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Guadagno (Ricavo)</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Azioni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4 text-sm font-mono text-slate-500">{sale.date}</td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-900">{sale.product}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{sale.field}</td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-700">{sale.quantity.toLocaleString()} kg/unità</td>
                              <td className="px-6 py-4 text-sm font-bold text-emerald-700 text-right">€{sale.totalRevenue.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                >
                                  <span className="text-xs font-bold">Elimina</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* New Activity Modal */}
      <Modal 
        isOpen={isActivityModalOpen} 
        onClose={closeActivityModal} 
        title="Registra Nuova Attività"
      >
        <form onSubmit={handleAddActivity} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Campo</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={newActivity.field}
              onChange={(e) => setNewActivity({...newActivity, field: e.target.value})}
            >
              {fields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo Operazione</label>
            <div className="space-y-2">
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={isNewActivityType ? 'NEW' : newActivity.type}
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    setIsNewActivityType(true);
                  } else {
                    setIsNewActivityType(false);
                    setNewActivity({...newActivity, type: e.target.value});
                  }
                }}
              >
                {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="NEW" className="font-bold text-emerald-700">+ Nuovo...</option>
              </select>
              
              {isNewActivityType && (
                <input 
                  type="text" 
                  placeholder="Inserisci nuovo tipo operazione"
                  required
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none animate-in slide-in-from-top-2 duration-200"
                  value={customActivityType}
                  onChange={(e) => setCustomActivityType(e.target.value)}
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Risorsa</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={newActivity.resource}
                onChange={(e) => {
                  const res = resources.find(r => r.name === e.target.value);
                  setNewActivity({
                    ...newActivity, 
                    resource: e.target.value,
                    cost: res ? (Number(newActivity.quantity) * res.unitCost).toString() : newActivity.cost
                  });
                }}
              >
                {resources.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quantità</label>
              <input 
                type="number" 
                placeholder="es. 50"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={newActivity.quantity}
                onChange={(e) => {
                  const res = resources.find(r => r.name === newActivity.resource);
                  setNewActivity({
                    ...newActivity, 
                    quantity: e.target.value,
                    cost: res ? (Number(e.target.value) * res.unitCost).toString() : newActivity.cost
                  });
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Costo (€)</label>
            <input 
              type="number" 
              placeholder="0.00"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={newActivity.cost}
              onChange={(e) => setNewActivity({...newActivity, cost: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-900 transition-all mt-4"
          >
            Salva Attività
          </button>
        </form>
      </Modal>

      {/* Field Modal (Add/Edit) */}
      <Modal 
        isOpen={isFieldModalOpen} 
        onClose={() => setIsFieldModalOpen(false)} 
        title={editingField ? "Modifica Campo" : "Aggiungi Nuovo Campo"}
      >
        <form onSubmit={handleFieldSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Campo</label>
            <input 
              type="text" 
              placeholder="es. Campo Nord"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={fieldForm.name}
              onChange={(e) => setFieldForm({...fieldForm, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dimensione (Ettari)</label>
            <input 
              type="number" 
              step="0.1"
              placeholder="0.0"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={fieldForm.size}
              onChange={(e) => setFieldForm({...fieldForm, size: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo di Coltura</label>
            <input 
              type="text" 
              placeholder="es. Mais"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={fieldForm.cropType}
              onChange={(e) => setFieldForm({...fieldForm, cropType: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-900 transition-all mt-4"
          >
            {editingField ? "Salva Modifiche" : "Crea Campo"}
          </button>
        </form>
      </Modal>
      {/* Resource Modal (Add/Edit) */}
      <Modal 
        isOpen={isResourceModalOpen} 
        onClose={() => setIsResourceModalOpen(false)} 
        title={editingResource ? "Modifica Risorsa" : "Aggiungi Nuova Risorsa"}
      >
        <form onSubmit={handleResourceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Risorsa</label>
            <input 
              type="text" 
              placeholder="es. Gasolio"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={resourceForm.name}
              onChange={(e) => setResourceForm({...resourceForm, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Costo Unitario (€)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={resourceForm.unitCost}
                onChange={(e) => setResourceForm({...resourceForm, unitCost: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unità (es. L, kg, h)</label>
              <input 
                type="text" 
                placeholder="L"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={resourceForm.unit}
                onChange={(e) => setResourceForm({...resourceForm, unit: e.target.value})}
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-900 transition-all mt-4"
          >
            {editingResource ? "Salva Modifiche" : "Crea Risorsa"}
          </button>
        </form>
      </Modal>

      {/* Labor Modal */}
      <Modal 
        isOpen={isLaborModalOpen} 
        onClose={() => setIsLaborModalOpen(false)} 
        title="Registra Manodopera"
      >
        <form onSubmit={handleAddLabor} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data</label>
            <input 
              type="date" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={laborDate}
              onChange={(e) => setLaborDate(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Distribuzione Ore per Campo</label>
              <button 
                type="button"
                onClick={() => setLaborEntries([...laborEntries, { field: fields[0]?.name || '', hours: '' }])}
                className="text-emerald-700 hover:text-emerald-800 p-1"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
              {laborEntries.map((entry, index) => (
                <div key={index} className="flex gap-3 items-end animate-in slide-in-from-left-2 duration-200">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campo</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={entry.field}
                      onChange={(e) => {
                        const newEntries = [...laborEntries];
                        newEntries[index].field = e.target.value;
                        setLaborEntries(newEntries);
                      }}
                    >
                      {fields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ore</label>
                    <input 
                      type="number" 
                      step="0.5"
                      placeholder="h"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={entry.hours}
                      onChange={(e) => {
                        const newEntries = [...laborEntries];
                        newEntries[index].hours = e.target.value;
                        setLaborEntries(newEntries);
                      }}
                    />
                  </div>
                  {laborEntries.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => setLaborEntries(laborEntries.filter((_, i) => i !== index))}
                      className="p-2 text-slate-400 hover:text-orange-600 mb-0.5"
                    >
                      <Plus size={18} className="rotate-45" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-500 uppercase">Totale Ore:</span>
              <span className="text-xl font-bold text-slate-900 font-mono">
                {laborEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0)}h
              </span>
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all"
            >
              Registra Manodopera
            </button>
          </div>
        </form>
      </Modal>

      {/* Sale Modal */}
      <Modal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        title="Registra Nuova Vendita"
      >
        <form onSubmit={handleAddSale} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prodotto Venduto</label>
            <input 
              type="text" 
              placeholder="es. Mais"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={saleForm.product}
              onChange={(e) => setSaleForm({...saleForm, product: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Campo di Origine</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={saleForm.field}
              onChange={(e) => setSaleForm({...saleForm, field: e.target.value})}
            >
              {fields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quantità (kg)</label>
              <input 
                type="number" 
                placeholder="es. 5000"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={saleForm.quantity}
                onChange={(e) => setSaleForm({...saleForm, quantity: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unità di Prezzo</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={saleForm.priceUnit}
                onChange={(e) => setSaleForm({...saleForm, priceUnit: e.target.value})}
              >
                <option value="kg">al kg</option>
                <option value="q">al quintale</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prezzo (€)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="es. 0.25 o 25.00"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={saleForm.pricePerUnit}
                onChange={(e) => setSaleForm({...saleForm, pricePerUnit: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ricavo Totale (€)</label>
              <input 
                type="number" 
                placeholder="0.00"
                readOnly
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-emerald-700 outline-none cursor-not-allowed"
                value={saleForm.totalRevenue}
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-900 transition-all mt-4"
          >
            Salva Vendita
          </button>
        </form>
      </Modal>

      {/* New Year Modal */}
      <Modal 
        isOpen={isYearModalOpen} 
        onClose={() => setIsYearModalOpen(false)} 
        title="Genera Nuovo Anno"
      >
        <form onSubmit={handleAddYear} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Inserisci Anno</label>
            <input 
              type="number" 
              placeholder="es. 2027"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500 italic">
            Verrà creata una nuova sessione per l'anno inserito. I dati degli anni precedenti rimarranno accessibili per il confronto tramite il selettore in alto.
          </p>
          <button 
            type="submit"
            className="w-full py-4 bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-900 transition-all mt-4"
          >
            Conferma e Genera
          </button>
        </form>
      </Modal>

      {/* Field Details Modal */}
      <Modal 
        isOpen={isFieldDetailsModalOpen} 
        onClose={() => setIsFieldDetailsModalOpen(false)} 
        title={`Dettagli: ${selectedFieldDetails?.name}`}
      >
        {selectedFieldDetails && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dimensione</p>
                <p className="text-xl font-bold text-slate-900">{selectedFieldDetails.size} ha</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Costo Manodopera</p>
                <p className="text-xl font-bold text-emerald-900">
                  €{activities
                    .filter(a => a.field === selectedFieldDetails.name && a.type === 'Manodopera')
                    .reduce((sum, a) => sum + a.cost, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Cronologia Attività</h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {activities
                  .filter(a => a.field === selectedFieldDetails.name)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(activity => (
                    <div key={activity.id} className="p-4 bg-white border border-slate-100 rounded-xl flex justify-between items-center hover:border-slate-200 transition-all">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                            activity.type === 'Concimazione' ? "bg-blue-50 text-blue-700" :
                            activity.type === 'Semina' ? "bg-emerald-50 text-emerald-700" :
                            activity.type === 'Raccolta' ? "bg-purple-50 text-purple-700" :
                            activity.type === 'Irrigazione' ? "bg-cyan-50 text-cyan-700" :
                            activity.type === 'Manodopera' ? "bg-amber-50 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {activity.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{activity.date}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{activity.resource || 'Nessuna risorsa'}</p>
                        {activity.quantity && <p className="text-[10px] text-slate-500">{activity.quantity}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">€{activity.cost.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                {activities.filter(a => a.field === selectedFieldDetails.name).length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic text-sm">
                    Nessuna attività registrata per questo campo.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cost Breakdown Modal */}
      <Modal 
        isOpen={isCostBreakdownOpen} 
        onClose={() => setIsCostBreakdownOpen(false)} 
        title="Dettaglio Costi"
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Per Tipo Attività</h4>
            <div className="space-y-3">
              {Object.entries(costsByActivity).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([type, cost]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500" 
                        style={{ width: `${((cost as number) / (totalCosts || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900 font-mono">€{(cost as number).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Per Risorsa</h4>
            <div className="space-y-3">
              {Object.entries(costsByResource).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([res, cost]) => (
                <div key={res} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">{res}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600" 
                        style={{ width: `${((cost as number) / (totalCosts || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900 font-mono">€{(cost as number).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900 uppercase">Totale Complessivo</span>
            <span className="text-xl font-bold text-orange-600 font-mono">€{totalCosts.toLocaleString()}</span>
          </div>
        </div>
      </Modal>

      {/* Revenue Breakdown Modal */}
      <Modal 
        isOpen={isRevenueBreakdownOpen} 
        onClose={() => setIsRevenueBreakdownOpen(false)} 
        title="Dettaglio Ricavi"
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Per Prodotto</h4>
            <div className="space-y-3">
              {Object.entries(revenueByProduct).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([prod, rev]) => (
                <div key={prod} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">{prod}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${((rev as number) / (totalRevenue || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900 font-mono">€{(rev as number).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Per Campo</h4>
            <div className="space-y-3">
              {Object.entries(revenueByField).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([f, rev]) => (
                <div key={f} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">{f}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600" 
                        style={{ width: `${((rev as number) / (totalRevenue || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900 font-mono">€{(rev as number).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900 uppercase">Totale Complessivo</span>
            <span className="text-xl font-bold text-emerald-600 font-mono">€{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </Modal>
    </div>
    </ErrorBoundary>
  );
}
