"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, Plus, Umbrella, Trash2, Coffee, Power, 
  Map, CreditCard, Banknote, CheckCircle, SplitSquareHorizontal, 
  Gift, Bell, Timer, ShoppingCart, Move, ChevronRight, AlertTriangle, BarChart3, RefreshCw, List, Clock, X, QrCode, Settings, LogOut, Copy
} from 'lucide-react';

type MenuItem = { id: number; name: string; price: number; category: string; description?: string; is_available: boolean; protein?: number; calories?: number; options?: string; };
type Order = { id: number; created_at: string; accepted_at?: string; umbrella_number: string; items: any[]; total_price: number; status: string; is_gift: boolean; from_umbrella: string; to_umbrella: string; };
type UmbrellaType = { id: number; number: string; x_pos: number; y_pos: number; };
type ServiceRequest = { id: number; umbrella_number: string; request_type: string; payment_method: string; notes: string; status: string; created_at: string; };
type Sale = { id: number; created_at: string; product_name: string; quantity: number; price: number; category: string; umbrella_number: string; };
type StoreDetails = { id: string; name: string; slug: string; primary_color: string; bg_color: string; owner_id: string; };

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const [setupName, setSetupName] = useState('');
  const [setupSlug, setSetupSlug] = useState('');

  const [adminTab, setAdminTab] = useState<'orders' | 'menu' | 'map' | 'stats' | 'settings'>('orders');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [umbrellas, setUmbrellas] = useState<UmbrellaType[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '', protein: '', calories: '' });
  const [newProductOptions, setNewProductOptions] = useState<string[]>([]);
  const [currentOption, setCurrentOption] = useState('');

  const [newUmbrella, setNewUmbrella] = useState('');
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const [settingsName, setSettingsName] = useState('');
  const [settingsColor, setSettingsColor] = useState('');
  const [settingsBgColor, setSettingsBgColor] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserStore(session.user.id);
      else setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserStore(session.user.id);
      else { setStore(null); setLoadingAuth(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!store) return;
    const ordersSub = supabase.channel(`orders_channel_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` }, () => fetchOrders(store.id)).subscribe();
    const requestsSub = supabase.channel(`requests_channel_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `store_id=eq.${store.id}` }, () => fetchRequests(store.id)).subscribe();
    const salesSub = supabase.channel(`sales_channel_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `store_id=eq.${store.id}` }, () => fetchSales(store.id)).subscribe();

    return () => { supabase.removeChannel(ordersSub); supabase.removeChannel(requestsSub); supabase.removeChannel(salesSub); };
  }, [store]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Επιτυχής εγγραφή! Τώρα μπορείς να συνδεθείς.");
    }
    setLoadingAuth(false);
  };

  const handleLogout = async () => await supabase.auth.signOut();

  const checkUserStore = async (userId: string) => {
    const { data } = await supabase.from('stores').select('*').eq('owner_id', userId).single();
    if (data) {
        setStore(data); setSettingsName(data.name); setSettingsColor(data.primary_color); setSettingsBgColor(data.bg_color); fetchDataForStore(data.id);
    } else setStore(null);
    setLoadingAuth(false);
  };

  const createStore = async () => {
    if (!setupName || !setupSlug) return alert("Συμπληρώστε όλα τα πεδία!");
    const { data, error } = await supabase.from('stores').insert([{ name: setupName, slug: setupSlug.toLowerCase().replace(/\s+/g, '-'), primary_color: '#06b6d4', bg_color: '#f8fafc', owner_id: session.user.id }]).select().single();
    if (error) alert("Το URL (slug) υπάρχει ήδη. Δοκιμάστε κάτι άλλο.");
    else checkUserStore(session.user.id);
  };

  const updateSettings = async () => {
      if (!store) return;
      const { error } = await supabase.from('stores').update({ name: settingsName, primary_color: settingsColor, bg_color: settingsBgColor }).eq('id', store.id);
      if (!error) { alert("Οι ρυθμίσεις αποθηκεύτηκαν!"); setStore({...store, name: settingsName, primary_color: settingsColor, bg_color: settingsBgColor}); }
  };

  const handleCopyLink = () => {
      if (!store) return;
      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/?store=${store.slug}`;
      navigator.clipboard.writeText(url);
      alert("Το Link αντιγράφηκε στο πρόχειρο!");
  };

  const fetchDataForStore = (storeId: string) => { fetchMenu(storeId); fetchOrders(storeId); fetchUmbrellas(storeId); fetchRequests(storeId); fetchSales(storeId); };

  async function fetchMenu(storeId: string) { const { data } = await supabase.from('menu').select('*').eq('store_id', storeId).order('category').order('name'); if (data) setMenu(data as MenuItem[]); }
  async function fetchOrders(storeId: string) { const { data } = await supabase.from('orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false }); if (data) setOrders(data as Order[]); }
  async function fetchUmbrellas(storeId: string) { const { data } = await supabase.from('umbrellas').select('*').eq('store_id', storeId); if (data) setUmbrellas(data as UmbrellaType[]); }
  async function fetchRequests(storeId: string) { const { data } = await supabase.from('service_requests').select('*').eq('store_id', storeId).eq('status', 'pending').order('created_at', { ascending: false }); if (data) setRequests(data as ServiceRequest[]); }
  async function fetchSales(storeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('sales').select('*').eq('store_id', storeId).gte('created_at', today).order('created_at', { ascending: false });
    if (data) setSales(data as Sale[]);
  }

  const addOption = () => { const opt = currentOption.trim(); if (opt && !newProductOptions.includes(opt)) { setNewProductOptions([...newProductOptions, opt]); setCurrentOption(''); }};
  const removeOption = (optToRemove: string) => setNewProductOptions(newProductOptions.filter(opt => opt !== optToRemove));

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category || !store) return alert("Παρακαλώ συμπληρώστε Όνομα, Κατηγορία και Τιμή!");
    const optionsStr = newProductOptions.length > 0 ? newProductOptions.join(', ') : null;
    await supabase.from('menu').insert([{ store_id: store.id, name: newProduct.name, price: parseFloat(newProduct.price), category: newProduct.category, is_available: true, protein: parseInt(newProduct.protein) || null, calories: parseInt(newProduct.calories) || null, options: optionsStr }]);
    setNewProduct({ name: '', price: '', category: '', protein: '', calories: '' }); setNewProductOptions([]); setCurrentOption(''); fetchMenu(store.id);
  };

  const archiveOrder = async (order: Order) => {
    if (!store) return;
    const salesData = order.items.map(item => ({ store_id: store.id, product_name: item.uniqueName, quantity: item.quantity, price: item.price, category: item.category, umbrella_number: order.umbrella_number }));
    const { error } = await supabase.from('sales').insert(salesData);
    if (!error) await supabase.from('orders').delete().eq('id', order.id);
  };

  const updateOrderStatus = async (order: Order) => {
    if (order.status === 'new') await supabase.from('orders').update({ status: 'preparing', accepted_at: new Date().toISOString() }).eq('id', order.id);
    else if (order.status === 'preparing') await supabase.from('orders').update({ status: 'shipped' }).eq('id', order.id);
    else if (order.status === 'shipped') await archiveOrder(order);
  };

  const resetTable = async (uNum: string) => {
    if (!store) return;
    if (confirm(`Καθαρισμός Ομπρέλας ${uNum};`)) {
        const tableOrders = orders.filter(o => o.umbrella_number === uNum);
        for (const order of tableOrders) await archiveOrder(order);
        await supabase.from('service_requests').delete().eq('umbrella_number', uNum).eq('store_id', store.id);
    }
  };

  const handleAddUmbrella = async () => {
    if (!newUmbrella || !store) return;
    const { error } = await supabase.from('umbrellas').insert([{ store_id: store.id, number: newUmbrella, x_pos: 50, y_pos: 50 }]);
    if (error) alert("Σφάλμα προσθήκης: " + error.message); else { setNewUmbrella(''); fetchUmbrellas(store.id); }
  };

  const handleMouseUp = async () => {
    if (draggingId === null) return;
    const moved = umbrellas.find(u => u.id === draggingId);
    if (moved) await supabase.from('umbrellas').update({ x_pos: moved.x_pos, y_pos: moved.y_pos }).eq('id', draggingId);
    setDraggingId(null);
  };

  const getWaitTime = (createdAt: string) => Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
  const todayRevenue = sales.reduce((acc, s) => acc + (s.price * s.quantity), 0);
  const activeUmbrellas = Array.from(new Set([...orders.map(o => o.umbrella_number), ...requests.map(r => r.umbrella_number)])).sort((a, b) => parseInt(a) - parseInt(b));
  const uniqueCategories = Array.from(new Set(['Καφέδες', 'Cocktails', 'Snacks', 'Αναψυκτικά', ...menu.map(m => m.category)]));

  if (loadingAuth) return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-cyan-500 font-black text-2xl uppercase tracking-widest animate-pulse">AQUA OS...</div>;

  if (!session) {
    return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-200 overflow-y-auto">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center shrink-0">
                <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/20"><LayoutDashboard size={32} className="text-slate-950" /></div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2 text-white">Aqua <span className="text-cyan-500">Business</span></h2>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Διαχειριση Καταστηματος</p>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md bg-slate-900 py-8 px-4 shadow sm:rounded-3xl sm:px-10 border border-slate-800 shrink-0">
                <form className="space-y-6" onSubmit={handleAuth}>
                    <div><input placeholder="Email" type="email" required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition-all font-bold" value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><input placeholder="Κωδικός" type="password" required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition-all font-bold" value={password} onChange={e => setPassword(e.target.value)} /></div>
                    <button type="submit" className="w-full bg-cyan-500 text-slate-950 p-4 rounded-xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-500/20">
                        {isLogin ? 'ΕΙΣΟΔΟΣ' : 'ΕΓΓΡΑΦΗ'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <button onClick={() => setIsLogin(!isLogin)} className="text-xs font-bold text-slate-500 hover:text-white transition-colors">{isLogin ? 'Δεν έχεις λογαριασμό; Εγγραφή' : 'Έχεις λογαριασμό; Είσοδος'}</button>
                </div>
            </div>
        </div>
    );
  }

  if (!store) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-200 overflow-y-auto">
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl bg-slate-900 py-10 px-8 shadow-2xl rounded-[3rem] border border-slate-800 text-center shrink-0">
                <div className="w-20 h-20 bg-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6"><Coffee size={40} className="text-purple-500"/></div>
                <h2 className="text-3xl font-black tracking-tighter mb-2 text-white">Στήσε το Μαγαζί σου!</h2>
                <p className="text-slate-500 text-sm font-bold mb-8">Επίλεξε το όνομα και το ψηφιακό σου URL.</p>
                
                <div className="space-y-4 mb-8">
                    <input placeholder="Όνομα Μαγαζιού (π.χ. Nammos Beach)" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-purple-500 text-center" value={setupName} onChange={e => setSetupName(e.target.value)} />
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-purple-500">
                        <span className="text-slate-500 pl-4 text-sm font-bold truncate">aqua.com/?store=</span>
                        <input placeholder="nammos" className="w-full bg-transparent p-2 text-white font-black outline-none lowercase min-w-0" value={setupSlug} onChange={e => setSetupSlug(e.target.value)} />
                    </div>
                </div>
                
                <button onClick={createStore} className="w-full bg-purple-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-500 transition-all active:scale-95 shadow-xl shadow-purple-600/20 text-lg">ΔΗΜΙΟΥΡΓΙΑ</button>
            </div>
        </div>
      );
  }

  return (
    // ΝΕΟ: fixed inset-0 flex flex-col overflow-hidden (App Wrapper)
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
      
      <header className="shrink-0 p-4 sm:p-6 border-b border-slate-800/50 flex justify-between items-center z-50 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0" style={{ backgroundColor: store.primary_color }}><LayoutDashboard size={20} className="text-white" /></div>
          <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white uppercase italic truncate">{store.name}</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] truncate">Διαχειριση AQUA</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-emerald-500/20 font-black text-[10px] sm:text-xs uppercase hidden sm:block">ΤΖΙΡΟΣ: {todayRevenue.toFixed(2)}€</div>
            <button onClick={handleLogout} className="bg-slate-900 text-slate-400 hover:text-red-400 p-2 sm:p-2.5 rounded-full transition-colors border border-slate-800"><LogOut size={16}/></button>
        </div>
      </header>

      {/* ΝΕΟ: Main container flex-1 overflow-y-auto overscroll-y-none */}
      <main className="flex-1 overflow-y-auto overscroll-y-none p-4 sm:p-6 w-full max-w-7xl mx-auto flex flex-col">
        
        {/* TABS (Κυλιόμενα αν δεν χωράνε, αλλά χωρίς scrollbar - hide scrollbar) */}
        <div className="shrink-0 flex gap-2 mb-6 sm:mb-10 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button onClick={() => setAdminTab('orders')} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'orders' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} style={adminTab === 'orders' ? { backgroundColor: store.primary_color } : {}}><Bell size={16}/> ΡΟΗ ΕΡΓΑΣΙΑΣ</button>
          <button onClick={() => setAdminTab('map')} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'map' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} style={adminTab === 'map' ? { backgroundColor: store.primary_color } : {}}><Map size={16}/> ΧΩΡΟΤΑΞΙΑ</button>
          <button onClick={() => setAdminTab('menu')} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'menu' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} style={adminTab === 'menu' ? { backgroundColor: store.primary_color } : {}}><Coffee size={16}/> ΜΕΝΟΥ</button>
          <button onClick={() => setAdminTab('stats')} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'stats' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} style={adminTab === 'stats' ? { backgroundColor: store.primary_color } : {}}><BarChart3 size={16}/> ΤΑΜΕΙΟ</button>
          <button onClick={() => setAdminTab('settings')} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'settings' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} style={adminTab === 'settings' ? { backgroundColor: store.primary_color } : {}}><Settings size={16}/> ΡΥΘΜΙΣΕΙΣ</button>
        </div>

        {/* --- SETTINGS TAB --- */}
        {adminTab === 'settings' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-3xl flex-1 pb-10">
             <div className="bg-slate-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-800 shadow-xl">
                <h3 className="text-lg sm:text-xl font-black mb-2 text-white">White-Labeling & Εμφάνιση</h3>
                <p className="text-slate-500 text-xs sm:text-sm font-bold mb-6 sm:mb-8">Προσάρμοσε την εφαρμογή του AQUA στα δικά σου χρώματα για να τη βλέπουν οι πελάτες σου.</p>
                
                <div className="space-y-6 mb-8">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Ονομα Μαγαζιου</label>
                        <input className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold outline-none focus:border-cyan-500" value={settingsName} onChange={e => setSettingsName(e.target.value)} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Χρώμα Κουμπιών (Primary)</label>
                            <div className="flex gap-4 items-center bg-slate-950 border border-slate-800 p-2 rounded-xl">
                                <input type="color" className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg cursor-pointer bg-transparent border-0 outline-none" value={settingsColor} onChange={e => setSettingsColor(e.target.value)} />
                                <span className="font-mono text-slate-400 text-sm">{settingsColor.toUpperCase()}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Χρώμα Φόντου (Background)</label>
                            <div className="flex gap-4 items-center bg-slate-950 border border-slate-800 p-2 rounded-xl">
                                <input type="color" className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg cursor-pointer bg-transparent border-0 outline-none" value={settingsBgColor} onChange={e => setSettingsBgColor(e.target.value)} />
                                <span className="font-mono text-slate-400 text-sm">{settingsBgColor.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="w-full min-w-0">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Το Link των πελατων σου</label>
                            <p className="font-mono text-cyan-400 text-xs sm:text-sm font-bold bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 truncate select-all">
                                {typeof window !== 'undefined' ? window.location.origin : ''}/?store={store.slug}
                            </p>
                        </div>
                        <button onClick={handleCopyLink} className="w-full sm:w-auto bg-slate-800 p-3 rounded-xl hover:bg-slate-700 transition-colors text-white shadow-sm flex items-center justify-center gap-2 font-bold text-xs shrink-0">
                            <Copy size={16}/> ΑΝΤΙΓΡΑΦΗ
                        </button>
                    </div>
                </div>

                <button onClick={updateSettings} className="w-full sm:w-auto bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 text-sm flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20">
                    ΑΠΟΘΗΚΕΥΣΗ ΑΛΛΑΓΩΝ
                </button>
             </div>
          </div>
        )}

        {/* --- ORDERS TAB --- */}
        {adminTab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {activeUmbrellas.map(uNum => {
                const tableOrders = orders.filter(o => o.umbrella_number === uNum);
                const tableRequests = requests.filter(r => r.umbrella_number === uNum);
                const isAlertActive = tableRequests.length > 0 || tableOrders.some(o => o.status === 'new');
                return (
                    <div key={uNum} className={`rounded-[2rem] border-2 transition-all flex flex-col overflow-hidden ${isAlertActive ? 'bg-red-950/40 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.2)] animate-pulse' : 'bg-slate-900 border-slate-800'}`}>
                        <div className={`p-4 sm:p-6 flex justify-between items-center ${isAlertActive ? 'bg-red-500 text-white' : 'bg-slate-800'}`} style={!isAlertActive ? { color: store.primary_color } : {}}>
                            <div className="flex items-center gap-3"><Umbrella size={24}/><h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter">ΟΜΠΡΕΛΑ {uNum}</h2></div>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1">
                            {tableRequests.map(r => (
                                <div key={r.id} className="bg-red-500/20 border border-red-500/30 p-4 rounded-2xl flex justify-between items-center">
                                    <span className="text-sm font-bold flex items-center gap-2 uppercase tracking-tight">{r.payment_method}</span>
                                    <button onClick={() => supabase.from('service_requests').delete().eq('id', r.id)} className="bg-red-500 text-white p-2 rounded-xl"><CheckCircle size={18}/></button>
                                </div>
                            ))}
                            {tableOrders.map(o => (
                                <div key={o.id} className={`p-4 rounded-2xl border transition-all ${o.status === 'shipped' ? 'bg-emerald-500/10 border-emerald-500/50' : o.status === 'new' ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-950/50 border-slate-800'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase"><Timer size={10} className="inline mr-1"/>{getWaitTime(o.created_at)}'</p>
                                        <p className="font-black" style={{ color: store.primary_color }}>{o.total_price.toFixed(2)}€</p>
                                    </div>
                                    <div className="space-y-1 mb-4">{o.items.map((item, idx) => <p key={idx} className={`text-xs font-medium tracking-tight ${o.status === 'shipped' ? 'text-emerald-400 opacity-60 line-through' : 'text-slate-300'}`}><span className="font-black" style={{ color: store.primary_color }}>{item.quantity}x</span> {item.uniqueName}</p>)}</div>
                                    <button onClick={() => updateOrderStatus(o)} className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${o.status === 'new' ? 'bg-red-500 text-white' : o.status === 'preparing' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'}`}>{o.status === 'new' ? 'ΑΠΟΔΟΧΗ' : o.status === 'preparing' ? 'ΕΤΟΙΜΑΣΤΗΚΕ' : 'ΣΕΡΒΙΡΙΣΤΗΚΕ'} <ChevronRight size={14} className="inline ml-1"/></button>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-800/50 border-t border-slate-800 space-y-4">
                            <div className="text-center"><p className="text-[10px] font-bold text-slate-500 uppercase">Λογαριασμος</p><p className="text-2xl font-black text-white">{tableOrders.reduce((acc, curr) => acc + curr.total_price, 0).toFixed(2)}€</p></div>
                            <button onClick={() => resetTable(uNum)} className="w-full bg-slate-950 text-slate-400 hover:text-white py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2"><RefreshCw size={14}/> ΚΑΘΑΡΙΣΜΟΣ</button>
                        </div>
                    </div>
                );
            })}
          </div>
        )}

        {/* --- MAP TAB --- */}
        {adminTab === 'map' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-4 sm:p-6 rounded-[2rem] border border-slate-800">
               <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
                  <input placeholder="Νούμερο" className="flex-1 sm:w-32 bg-slate-950 p-3 rounded-xl outline-none border border-slate-800 text-sm font-bold" value={newUmbrella} onChange={(e) => setNewUmbrella(e.target.value)} />
                  <button onClick={handleAddUmbrella} className="text-white px-6 rounded-xl font-black uppercase text-xs transition-all shrink-0" style={{ backgroundColor: store.primary_color }}>Προσθηκη</button>
               </div>
               <button onClick={() => setIsQRModalOpen(true)} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all shrink-0">
                  <QrCode size={18}/> ΕΚΤΥΠΩΣΗ QR
               </button>
            </div>
            {/* Ο Χάρτης παραμένει σταθερός */}
            <div ref={mapRef} onMouseMove={e => {
                if (draggingId === null || !mapRef.current) return;
                const rect = mapRef.current.getBoundingClientRect();
                setUmbrellas(prev => prev.map(u => u.id === draggingId ? { ...u, x_pos: Math.round(e.clientX - rect.left - 40), y_pos: Math.round(e.clientY - rect.top - 40) } : u));
            }} onMouseUp={handleMouseUp} onTouchMove={e => {
                if (draggingId === null || !mapRef.current) return;
                const rect = mapRef.current.getBoundingClientRect();
                const touch = e.touches[0];
                setUmbrellas(prev => prev.map(u => u.id === draggingId ? { ...u, x_pos: Math.round(touch.clientX - rect.left - 40), y_pos: Math.round(touch.clientY - rect.top - 40) } : u));
            }} onTouchEnd={handleMouseUp} className="relative w-full h-[500px] sm:h-[650px] bg-slate-900/40 rounded-[2rem] sm:rounded-[3rem] border-4 border-dashed border-slate-800/50 overflow-hidden shadow-inner cursor-crosshair">
              {umbrellas.map(u => {
                const hasOrder = orders.some(o => o.umbrella_number === u.number);
                const hasReq = requests.find(r => r.umbrella_number === u.number);
                let stateClass = "bg-slate-800 border-slate-700 text-slate-500";
                if (hasReq) stateClass = "bg-red-500 border-red-400 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-pulse z-30";
                else if (hasOrder) stateClass = "bg-amber-400 border-amber-300 text-amber-950 shadow-[0_10px_30px_rgba(251,191,36,0.3)] z-20";
                return (
                  <div key={u.id} onMouseDown={() => setDraggingId(u.id)} onTouchStart={() => setDraggingId(u.id)} className={`absolute w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2rem] border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-200 group ${stateClass} ${draggingId === u.id ? 'scale-110 opacity-70 z-50 ring-4 ring-cyan-500/20' : ''}`} style={{ left: `${u.x_pos}px`, top: `${u.y_pos}px`, transition: draggingId === u.id ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <span className="absolute top-2 text-lg sm:text-xl font-black tracking-tighter z-10">{u.number}</span>
                    <button onClick={() => { if(confirm("Διαγραφή ομπρέλας;")) supabase.from('umbrellas').delete().eq('id', u.id).then(()=>fetchUmbrellas(store.id)); }} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center sm:hidden group-hover:flex z-50 hover:scale-110"><X size={12}/></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- MENU TAB --- */}
        {adminTab === 'menu' && (
           <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-10">
              <div className="bg-slate-900 p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-800 shadow-xl">
                <h3 className="text-base sm:text-lg font-black mb-4 sm:mb-6 text-white flex items-center gap-2"><Plus style={{ color: store.primary_color }} /> ΠΡΟΣΘΗΚΗ ΠΡΟΪΟΝΤΟΣ</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
                  <input placeholder="Όνομα" className="col-span-2 bg-slate-950 p-3 sm:p-4 rounded-xl sm:rounded-2xl outline-none border border-slate-800 text-white font-bold focus:border-cyan-500 text-sm sm:text-base" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                  <input list="category-options" placeholder="Κατηγορία" className="col-span-2 sm:col-span-1 bg-slate-950 p-3 sm:p-4 rounded-xl sm:rounded-2xl outline-none border border-slate-800 text-white font-bold focus:border-cyan-500 text-sm sm:text-base" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} />
                  <datalist id="category-options">{uniqueCategories.map(cat => <option key={cat} value={cat} />)}</datalist>
                  <input placeholder="Τιμή (€)" type="number" step="0.1" className="col-span-2 sm:col-span-1 bg-slate-950 p-3 sm:p-4 rounded-xl sm:rounded-2xl outline-none border border-slate-800 text-white font-black text-sm sm:text-base" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                  <input placeholder="P (g)" type="number" className="bg-slate-950 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 text-white text-sm sm:text-base" value={newProduct.protein} onChange={(e) => setNewProduct({...newProduct, protein: e.target.value})} />
                  <input placeholder="Cal" type="number" className="bg-slate-950 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 text-white text-sm sm:text-base" value={newProduct.calories} onChange={(e) => setNewProduct({...newProduct, calories: e.target.value})} />
                </div>
                
                <div className="col-span-full bg-slate-950 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 mb-4">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-3">Επιλογες Προϊοντος (Προαιρετικα)</p>
                    <div className="flex gap-2 mb-3 flex-wrap">
                        {newProductOptions.map(opt => (
                            <span key={opt} className="bg-slate-800 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-lg font-bold text-[10px] sm:text-xs flex items-center gap-2 border border-slate-700">
                                {opt} <button onClick={() => removeOption(opt)} className="hover:text-red-400 transition-colors"><X size={14}/></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input placeholder="Επιλογή (π.χ. Σκέτο)" className="flex-1 bg-slate-900 p-3 sm:p-4 rounded-xl outline-none border border-slate-700 text-white font-bold text-xs sm:text-sm focus:border-cyan-500 transition-all" value={currentOption} onChange={(e) => setCurrentOption(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addOption()} />
                        <button onClick={addOption} className="bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white px-4 sm:px-6 rounded-xl transition-all font-black flex items-center justify-center"><Plus size={20}/></button>
                    </div>
                </div>

                <button onClick={handleAddProduct} className="w-full text-white p-4 sm:p-5 rounded-xl sm:rounded-2xl font-black uppercase transition-all active:scale-95 text-sm sm:text-lg" style={{ backgroundColor: store.primary_color }}>Αποθηκευση Προϊοντος</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {menu.map(p => (
                  <div key={p.id} className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-[1.5rem] sm:rounded-[2rem] flex justify-between items-center">
                    <div className="min-w-0 pr-2">
                        <p className="font-bold text-base sm:text-lg text-white truncate">{p.name}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                            <span className="text-[9px] font-black uppercase px-2 py-1 bg-slate-800 rounded truncate" style={{ color: store.primary_color }}>{p.category}</span>
                            {p.options && <span className="text-[9px] font-black uppercase px-2 py-1 bg-slate-800 rounded text-slate-400 border border-slate-700 truncate max-w-[100px] sm:max-w-none">ΕΠΙΛΟΓΕΣ: {p.options}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <input type="number" defaultValue={p.price} onBlur={(e) => supabase.from('menu').update({ price: parseFloat(e.target.value) }).eq('id', p.id)} className="w-16 sm:w-20 bg-slate-950 p-2 sm:p-3 rounded-lg sm:rounded-xl text-center text-white font-black border border-slate-800 outline-none text-sm" />
                      <button onClick={() => {if(confirm("Διαγραφή;")) supabase.from('menu').delete().eq('id', p.id).then(()=>fetchMenu(store.id));}} className="p-2 sm:p-3 text-slate-600 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

      </main>

      {/* --- MODAL QR CODES --- */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsQRModalOpen(false)}></div>
           <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative z-10 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-800 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 sm:p-3 rounded-xl"><QrCode className="text-purple-400" size={20}/></div>
                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter">QR Codes Μαγαζιου</h2>
                 </div>
                 <button onClick={() => setIsQRModalOpen(false)} className="text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-y-none pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                 {umbrellas.map(u => {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const qrUrl = `${baseUrl}/?store=${store.slug}&umbrella=${u.number}`;
                    const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&margin=10`;
                    
                    return (
                       <div key={u.id} className="flex flex-col items-center bg-slate-950 p-4 border border-slate-800 rounded-2xl group hover:border-purple-500/50 transition-colors">
                          <h3 className="font-black text-lg sm:text-xl text-slate-300 mb-3 tracking-tighter">ΟΜΠΡΕΛΑ {u.number}</h3>
                          <div className="bg-white p-2 rounded-xl mb-4 shadow-lg group-hover:scale-105 transition-transform"><img src={qrImageSrc} alt={`QR`} className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg" /></div>
                          <a href={qrImageSrc} download={`Aqua_QR_Umbrella_${u.number}.png`} target="_blank" rel="noreferrer" className="w-full text-center text-[10px] bg-purple-600 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-purple-500">ΛΗΨΗ</a>
                       </div>
                    )
                 })}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}