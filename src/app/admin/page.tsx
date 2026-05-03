"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, Plus, Umbrella, Trash2, Coffee, Power, 
  Map, CreditCard, Banknote, CheckCircle, SplitSquareHorizontal, 
  Gift, Bell, Timer, ShoppingCart, Move, ChevronRight, ChevronLeft, AlertTriangle, BarChart3, RefreshCw, List, Clock, X, QrCode, Settings, LogOut, Copy, ArrowRight, ArrowUp, ArrowDown, Palette, TrendingUp, DollarSign, Zap, Flame, Snowflake, CalendarDays, PieChart, Activity, Crosshair
} from 'lucide-react';

type MenuItem = { id: number; name: string; price: number; category: string; description?: string; is_available: boolean; protein?: number; calories?: number; options?: string; };
type Order = { id: number; created_at: string; accepted_at?: string; umbrella_number: string; items: any[]; total_price: number; status: string; is_gift: boolean; from_umbrella: string; to_umbrella: string; };
type UmbrellaType = { id: number; number: string; x_pos: number; y_pos: number; is_available?: boolean; };
type ServiceRequest = { id: number; umbrella_number: string; request_type: string; payment_method: string; notes: string; status: string; created_at: string; };
type Sale = { id: number; created_at: string; product_name: string; quantity: number; price: number; category: string; umbrella_number: string; };
type StoreDetails = { id: string; name: string; slug: string; primary_color: string; bg_color: string; owner_id: string; category_prefs: any[]; };

const AnimatedCounter = ({ value }: { value: number }) => {
    const [displayVal, setDisplayVal] = useState(value);
    useEffect(() => {
        if (value === displayVal) return;
        const step = (value - displayVal) / 10;
        let current = displayVal;
        const interval = setInterval(() => {
            current += step;
            if ((step > 0 && current >= value) || (step < 0 && current <= value)) { setDisplayVal(value); clearInterval(interval); }
            else setDisplayVal(current);
        }, 30);
        return () => clearInterval(interval);
    }, [value]);
    return <span>{displayVal.toFixed(2)}</span>;
};

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [isLogin, setIsLogin] = useState(true);
  const [setupName, setSetupName] = useState(''); const [setupSlug, setSetupSlug] = useState('');

  const [adminTab, setAdminTab] = useState<'orders' | 'menu' | 'map' | 'stats' | 'settings'>('orders');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [umbrellas, setUmbrellas] = useState<UmbrellaType[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  
  const [sales, setSales] = useState<Sale[]>([]); 
  const [allSales, setAllSales] = useState<Sale[]>([]); 

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
  const [catSettings, setCatSettings] = useState<{name: string, bg_color: string, text_color: string, sort_order: number}[]>([]);

  const [statsView, setStatsView] = useState<'daily' | 'insights'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInsightProduct, setSelectedInsightProduct] = useState<string>('');

  const prevOrderCount = useRef(0);
  const prevReqCount = useRef(0);
  
  useEffect(() => {
      if (orders.length > prevOrderCount.current || requests.length > prevReqCount.current) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.4;
          audio.play().catch(() => {});
      }
      prevOrderCount.current = orders.length;
      prevReqCount.current = requests.length;
  }, [orders.length, requests.length]);

  useEffect(() => {
      if (!store) return;
      const interval = setInterval(() => {
          const now = new Date().getTime();
          orders.forEach(o => {
              if (o.status === 'shipped' && o.accepted_at) {
                  const elapsed = now - new Date(o.accepted_at).getTime();
                  if (elapsed > 300000) archiveOrder(o);
              }
          });
      }, 60000); 
      return () => clearInterval(interval);
  }, [orders, store]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) checkUserStore(session.user.id); else setLoadingAuth(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) checkUserStore(session.user.id); else { setStore(null); setLoadingAuth(false); } });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!store) return;
    const ordersSub = supabase.channel(`orders_channel_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` }, () => fetchOrders(store.id)).subscribe();
    const requestsSub = supabase.channel(`requests_channel_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `store_id=eq.${store.id}` }, () => fetchRequests(store.id)).subscribe();
    const salesSub = supabase.channel(`sales_channel_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `store_id=eq.${store.id}` }, () => { fetchSales(store.id, selectedDate); fetchAllSales(store.id); }).subscribe();
    return () => { supabase.removeChannel(ordersSub); supabase.removeChannel(requestsSub); supabase.removeChannel(salesSub); };
  }, [store, selectedDate]);

  useEffect(() => {
      if (store) fetchSales(store.id, selectedDate);
  }, [selectedDate, store]);

  useEffect(() => {
      if (store && menu.length > 0) {
          const activeCategories = Array.from(new Set(menu.map(m => m.category)));
          let savedPrefs = store.category_prefs;
          if (typeof savedPrefs === 'string') { try { savedPrefs = JSON.parse(savedPrefs); } catch(e) { savedPrefs = []; } }
          if (!Array.isArray(savedPrefs)) savedPrefs = [];
          let merged = activeCategories.map(cat => {
              const existing = savedPrefs.find((p:any) => p.name === cat);
              if (existing) return existing;
              return { name: cat, bg_color: '#334155', text_color: '#ffffff', sort_order: 999 };
          });
          merged.sort((a,b) => a.sort_order - b.sort_order);
          setCatSettings(merged.map((m, i) => ({ ...m, sort_order: i })));
          
          if (!selectedInsightProduct && menu.length > 0) setSelectedInsightProduct(menu[0].name);
      }
  }, [store, menu.length]);

  const handleAuth = async (e: React.FormEvent) => { e.preventDefault(); setLoadingAuth(true); if (isLogin) { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) alert(error.message); } else { const { error } = await supabase.auth.signUp({ email, password }); if (error) alert(error.message); else alert("Επιτυχής εγγραφή!"); } setLoadingAuth(false); };
  const handleLogout = async () => await supabase.auth.signOut();
  const checkUserStore = async (userId: string) => { const { data } = await supabase.from('stores').select('*').eq('owner_id', userId).single(); if (data) { setStore(data); setSettingsName(data.name); setSettingsColor(data.primary_color); setSettingsBgColor(data.bg_color); fetchDataForStore(data.id); } else setStore(null); setLoadingAuth(false); };
  const createStore = async () => { if (!setupName || !setupSlug) return alert("Συμπληρώστε τα πεδία!"); const { data, error } = await supabase.from('stores').insert([{ name: setupName, slug: setupSlug.toLowerCase().replace(/\s+/g, '-'), primary_color: '#06b6d4', bg_color: '#020617', owner_id: session.user.id }]).select().single(); if (error) alert("Το URL (slug) υπάρχει ήδη."); else checkUserStore(session.user.id); };
  const updateSettings = async () => { if (!store) return; const { error } = await supabase.from('stores').update({ name: settingsName, primary_color: settingsColor, bg_color: settingsBgColor }).eq('id', store.id); if (!error) { alert("Αποθηκεύτηκαν!"); setStore({...store, name: settingsName, primary_color: settingsColor, bg_color: settingsBgColor}); } };
  const updateCategorySettings = async () => { if (!store) return; const { error } = await supabase.from('stores').update({ category_prefs: catSettings }).eq('id', store.id); if (!error) { alert("Οι κατηγορίες αποθηκεύτηκαν!"); setStore({...store, category_prefs: catSettings}); } };
  const fetchDataForStore = (storeId: string) => { fetchMenu(storeId); fetchOrders(storeId); fetchUmbrellas(storeId); fetchRequests(storeId); fetchSales(storeId, selectedDate); fetchAllSales(storeId); };

  async function fetchMenu(storeId: string) { const { data } = await supabase.from('menu').select('*').eq('store_id', storeId).order('category').order('name'); if (data) setMenu(data as MenuItem[]); }
  async function fetchOrders(storeId: string) { const { data } = await supabase.from('orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false }); if (data) setOrders(data as Order[]); }
  async function fetchUmbrellas(storeId: string) { const { data } = await supabase.from('umbrellas').select('*').eq('store_id', storeId); if (data) setUmbrellas(data as UmbrellaType[]); }
  async function fetchRequests(storeId: string) { const { data } = await supabase.from('service_requests').select('*').eq('store_id', storeId).eq('status', 'pending').order('created_at', { ascending: false }); if (data) setRequests(data as ServiceRequest[]); }
  
  async function fetchSales(storeId: string, dateStr: string) { 
      const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString();
      const endOfDay = new Date(`${dateStr}T23:59:59.999`).toISOString();
      const { data } = await supabase.from('sales').select('*').eq('store_id', storeId).gte('created_at', startOfDay).lte('created_at', endOfDay).order('created_at', { ascending: false }); 
      if (data) setSales(data as Sale[]); 
  }

  async function fetchAllSales(storeId: string) {
      const { data } = await supabase.from('sales').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      if (data) setAllSales(data as Sale[]);
  }

  const handleAddProduct = async () => { if (!newProduct.name || !newProduct.price || !newProduct.category || !store) return alert("Συμπληρώστε Όνομα, Κατηγορία και Τιμή!"); const optionsStr = newProductOptions.length > 0 ? newProductOptions.join(', ') : null; await supabase.from('menu').insert([{ store_id: store.id, name: newProduct.name, price: parseFloat(newProduct.price), category: newProduct.category, is_available: true, protein: parseInt(newProduct.protein) || null, calories: parseInt(newProduct.calories) || null, options: optionsStr }]); setNewProduct({ name: '', price: '', category: '', protein: '', calories: '' }); setNewProductOptions([]); fetchMenu(store.id); };
  
  const archiveOrder = async (order: Order) => { 
      if (!store) return; 
      const salesData = order.items.map(item => ({ store_id: store.id, product_name: item.uniqueName, quantity: item.quantity, price: item.price, category: item.category, umbrella_number: order.umbrella_number })); 
      const { error } = await supabase.from('sales').insert(salesData); 
      if (!error) { await supabase.from('orders').delete().eq('id', order.id); fetchOrders(store.id); fetchSales(store.id, selectedDate); fetchAllSales(store.id); } 
  };
  
  const updateOrderStatus = async (order: Order) => { 
      if (!store) return; 
      if (order.status === 'new' || order.status === 'preparing') {
          await supabase.from('orders').update({ status: 'shipped', accepted_at: new Date().toISOString() }).eq('id', order.id); 
      } else if (order.status === 'shipped') {
          await archiveOrder(order); 
      }
      fetchOrders(store.id); 
  };

  const resetTable = async (uNum: string) => { if (!store) return; if (confirm(`Καθαρισμός ομπρέλας ${uNum};`)) { const tableOrders = orders.filter(o => o.umbrella_number === uNum); for (const order of tableOrders) await archiveOrder(order); await supabase.from('service_requests').delete().eq('umbrella_number', uNum).eq('store_id', store.id); fetchRequests(store.id); fetchOrders(store.id); } };
  const handleAddUmbrella = async () => { if (!newUmbrella || !store) return; const { error } = await supabase.from('umbrellas').insert([{ store_id: store.id, number: newUmbrella, x_pos: 50, y_pos: 50 }]); if (error) alert("Σφάλμα προσθήκης"); else { setNewUmbrella(''); fetchUmbrellas(store.id); } };
  const handleMouseUp = async () => { if (draggingId === null) return; const moved = umbrellas.find(u => u.id === draggingId); if (moved) await supabase.from('umbrellas').update({ x_pos: moved.x_pos, y_pos: moved.y_pos }).eq('id', draggingId); setDraggingId(null); };

  const handleCopyLink = () => { if (!store) return; const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/?store=${store.slug}`; navigator.clipboard.writeText(url); alert("Το Link αντιγράφηκε!"); };
  const moveCatUp = (index: number) => { if (index === 0) return; const newCats = [...catSettings]; const temp = newCats[index].sort_order; newCats[index].sort_order = newCats[index - 1].sort_order; newCats[index - 1].sort_order = temp; setCatSettings(newCats.sort((a,b) => a.sort_order - b.sort_order).map((m,i) => ({...m, sort_order: i}))); };
  const moveCatDown = (index: number) => { if (index === catSettings.length - 1) return; const newCats = [...catSettings]; const temp = newCats[index].sort_order; newCats[index].sort_order = newCats[index + 1].sort_order; newCats[index + 1].sort_order = temp; setCatSettings(newCats.sort((a,b) => a.sort_order - b.sort_order).map((m,i) => ({...m, sort_order: i}))); };
  
  const getWaitTime = (createdAt: string) => Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
  
  const activeUmbrellas = Array.from(new Set([...orders.map(o => o.umbrella_number), ...requests.map(r => r.umbrella_number)])).sort((a, b) => parseInt(a) - parseInt(b));
  const uniqueCategories = Array.from(new Set([...menu.map(m => m.category)]));

  const changeDate = (days: number) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + days);
      setSelectedDate(d.toISOString().split('T')[0]);
  };
  let touchStartX = 0;
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      if (touchStartX - touchEndX > 50) changeDate(1); 
      if (touchStartX - touchEndX < -50) changeDate(-1); 
  };

  const dayRevenue = sales.reduce((acc, s) => acc + (s.price * s.quantity), 0);
  const itemsSold = sales.reduce((acc, s) => acc + s.quantity, 0);
  const avgTicket = itemsSold > 0 ? (dayRevenue / itemsSold) : 0;

  const bestSellersObj: Record<string, { name: string; qty: number; revenue: number }> = {};
  const categoryStatsObj: Record<string, number> = {};
  
  sales.forEach(sale => {
      if (!bestSellersObj[sale.product_name]) bestSellersObj[sale.product_name] = { name: sale.product_name, qty: 0, revenue: 0 };
      bestSellersObj[sale.product_name].qty += sale.quantity; 
      bestSellersObj[sale.product_name].revenue += (sale.price * sale.quantity);
      categoryStatsObj[sale.category] = (categoryStatsObj[sale.category] || 0) + (sale.price * sale.quantity);
  });
  
  const bestSellers = Object.values(bestSellersObj).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const categoryStats = Object.entries(categoryStatsObj).sort((a, b) => b[1] - a[1]);

  const productSales = allSales.filter(s => s.product_name.includes(selectedInsightProduct));
  const productTotalRev = productSales.reduce((acc, s) => acc + (s.price * s.quantity), 0);
  const productTotalQty = productSales.reduce((acc, s) => acc + s.quantity, 0);

  const hours = productSales.map(s => new Date(s.created_at).getHours());
  const hourCounts = hours.reduce((acc: Record<string, number>, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {});
  const peakHourStr = Object.keys(hourCounts).length > 0 ? Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b) : null;
  const peakHour = peakHourStr ? `${peakHourStr}:00 - ${parseInt(peakHourStr)+1}:00` : '-';

  const days = productSales.map(s => new Date(s.created_at).getDay());
  const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
  const dayCounts = days.reduce((acc: Record<string, number>, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {});
  const bestDayIndex = Object.keys(dayCounts).length > 0 ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b) : null;
  const bestDay = bestDayIndex !== null ? dayNames[parseInt(bestDayIndex)] : '-';

  // --- ⚡ OUT OF STOCK ENGINE ⚡ ---
  const toggleProductAvailability = async (id: number, currentStatus: boolean) => {
      const newStatus = !currentStatus;
      setMenu(prev => prev.map(item => item.id === id ? { ...item, is_available: newStatus } : item));
      await supabase.from('menu').update({ is_available: newStatus }).eq('id', id);
  };

  const toggleCategoryAvailability = async (category: string, currentStatus: boolean) => {
      const newStatus = !currentStatus;
      setMenu(prev => prev.map(item => item.category === category ? { ...item, is_available: newStatus } : item));
      if (!store) return;
      await supabase.from('menu').update({ is_available: newStatus }).eq('category', category).eq('store_id', store.id);
  };

  if (loadingAuth) return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-cyan-500 font-black text-2xl uppercase tracking-widest animate-pulse">AQUA SYSTEM BOOT...</div>;

  if (!session) {
    return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-200 overflow-y-auto">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center shrink-0 mb-8">
                <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(6,182,212,0.3)]"><LayoutDashboard size={32} className="text-slate-950" /></div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2 text-white">Aqua <span className="text-cyan-500">Command</span></h2>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Tactical Management Interface</p>
            </div>
            <div className="bg-slate-900/50 py-8 px-6 backdrop-blur-xl sm:rounded-3xl sm:px-10 border border-slate-800 w-full max-w-sm mx-auto shadow-2xl">
                <form className="space-y-6" onSubmit={handleAuth}>
                    <input placeholder="Email" type="email" required className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition-all font-bold" value={email} onChange={e => setEmail(e.target.value)} />
                    <input placeholder="Κωδικός" type="password" required className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition-all font-bold" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="submit" className="w-full bg-cyan-500 text-slate-950 p-4 rounded-xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-500/20">{isLogin ? 'ΕΙΣΟΔΟΣ' : 'ΕΓΓΡΑΦΗ'}</button>
                </form>
                <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-xs font-bold text-slate-500 hover:text-white transition-colors">{isLogin ? 'Εγγραφή νέας μονάδας' : 'Είσοδος σε υπάρχουσα'}</button>
            </div>
        </div>
    );
  }

  if (!store) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-200 overflow-y-auto">
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl bg-slate-900/50 backdrop-blur-xl py-10 px-8 shadow-2xl rounded-[3rem] border border-slate-800 text-center shrink-0">
                <div className="w-20 h-20 bg-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6"><Coffee size={40} className="text-purple-500"/></div>
                <h2 className="text-3xl font-black tracking-tighter mb-2 text-white">Αρχικοποίηση Βάσης</h2>
                <div className="space-y-4 my-8">
                    <input placeholder="Ονομασία (π.χ. Nammos Beach)" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-purple-500 text-center" value={setupName} onChange={e => setSetupName(e.target.value)} />
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-purple-500">
                        <span className="text-slate-500 pl-4 text-sm font-bold truncate">aqua.com/?store=</span>
                        <input placeholder="nammos" className="w-full bg-transparent p-2 text-white font-black outline-none lowercase min-w-0" value={setupSlug} onChange={e => setSetupSlug(e.target.value)} />
                    </div>
                </div>
                <button onClick={createStore} className="w-full bg-purple-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-500 transition-all active:scale-95 shadow-xl shadow-purple-600/20 text-lg">ΕΚΚΙΝΗΣΗ ΜΟΝΑΔΑΣ</button>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-[#020617] text-slate-200 font-sans flex flex-col overflow-hidden">
      <header className="shrink-0 p-4 sm:p-6 border-b border-white/5 flex justify-between items-center z-50 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0" style={{ backgroundColor: store.primary_color }}><LayoutDashboard size={20} className="text-slate-900" /></div>
          <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase italic truncate" style={{ fontFamily: 'Playfair Display, serif' }}>{store.name}</h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] truncate">AQUA COMMAND CENTER</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button onClick={handleLogout} className="bg-white/5 text-slate-400 hover:text-red-400 p-2 sm:p-3 rounded-[1rem] transition-colors border border-white/5"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-y-none p-4 sm:p-6 w-full max-w-7xl mx-auto flex flex-col">
        
        <div className="shrink-0 flex gap-2 mb-6 sm:mb-10 bg-white/5 p-1.5 rounded-[1.2rem] border border-white/5 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button onClick={() => setAdminTab('orders')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'orders' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'orders' ? { backgroundColor: store.primary_color } : {}}><Bell size={16}/> ΡΟΗ ΕΡΓΑΣΙΑΣ</button>
          <button onClick={() => setAdminTab('map')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'map' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'map' ? { backgroundColor: store.primary_color } : {}}><Map size={16}/> ΧΩΡΟΤΑΞΙΑ</button>
          <button onClick={() => setAdminTab('menu')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'menu' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'menu' ? { backgroundColor: store.primary_color } : {}}><Coffee size={16}/> ΟΠΛΟΣΤΑΣΙΟ</button>
          <button onClick={() => setAdminTab('stats')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'stats' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'stats' ? { backgroundColor: store.primary_color } : {}}><BarChart3 size={16}/> ΑΝΑΦΟΡΕΣ</button>
          <button onClick={() => setAdminTab('settings')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'settings' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'settings' ? { backgroundColor: store.primary_color } : {}}><Settings size={16}/> ΡΥΘΜΙΣΕΙΣ</button>
        </div>

        {/* TAB: ΡΟΗ ΕΡΓΑΣΙΑΣ */}
        {adminTab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {activeUmbrellas.map(uNum => {
                const tableOrders = orders.filter(o => o.umbrella_number === uNum);
                const tableRequests = requests.filter(r => r.umbrella_number === uNum);
                
                const totalVal = tableOrders.reduce((acc, curr) => acc + curr.total_price, 0);
                let maxWaitTime = 0;
                if (tableOrders.length > 0) {
                    const oldestTime = Math.min(...tableOrders.map(o => new Date(o.created_at).getTime()));
                    maxWaitTime = Math.floor((new Date().getTime() - oldestTime) / 60000);
                }

                const isWhale = totalVal >= 50; 
                const isSquatter = maxWaitTime >= 45 && totalVal <= 12;
                const isCriticalAlert = tableRequests.length > 0 || tableOrders.some(o => o.status === 'new' || o.status === 'preparing');
                
                let cardBorder = "border-white/10 shadow-xl";
                let headerBg = "bg-black/20 border-white/5";
                let badge = null;

                if (tableRequests.length > 0) {
                    cardBorder = "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]";
                    headerBg = "bg-red-500/10 border-red-500/30";
                } else if (isWhale) {
                    cardBorder = "border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.3)]";
                    headerBg = "bg-amber-500/10 border-amber-400/30";
                    badge = <span className="bg-amber-500 text-amber-950 px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(251,191,36,0.5)]"><Flame size={12}/> VIP WHALE</span>;
                } else if (isSquatter) {
                    cardBorder = "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]";
                    headerBg = "bg-blue-500/10 border-blue-500/30";
                    badge = <span className="bg-blue-500 text-white px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(59,130,246,0.5)]"><Snowflake size={12}/> LOW SPEND</span>;
                } else if (isCriticalAlert) {
                    cardBorder = "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.2)]";
                    headerBg = "bg-cyan-500/10 border-cyan-500/30";
                }

                return (
                    <div key={uNum} className={`rounded-[2rem] border overflow-hidden bg-white/5 backdrop-blur-xl transition-all duration-300 ${cardBorder}`}>
                        <div className={`p-5 flex justify-between items-center border-b ${headerBg}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center font-black text-2xl shadow-lg ${tableRequests.length > 0 ? 'bg-red-500 text-white' : isWhale ? 'bg-amber-500 text-amber-950' : isSquatter ? 'bg-blue-500 text-white' : 'bg-white/10 text-white'}`}>{uNum}</div>
                                <div>
                                    <div className="flex items-center gap-2"><h2 className="text-sm font-black uppercase tracking-widest text-white">Target {uNum}</h2> {badge}</div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{totalVal.toFixed(2)}€</p>
                                </div>
                            </div>
                            <button onClick={() => resetTable(uNum)} className="text-[10px] font-black uppercase bg-black/40 text-slate-400 border border-white/10 px-4 py-3 rounded-xl hover:text-white hover:bg-black/60 flex items-center gap-2 shrink-0"><RefreshCw size={14}/> ΕΚΚΕΝΩΣΗ</button>
                        </div>
                        <div className="p-5 flex-1 flex flex-col gap-4 bg-black/10">
                            {tableRequests.map(r => (
                                <div key={r.id} className="bg-red-500/10 border border-red-500/30 p-5 rounded-[1.5rem] flex justify-between items-center">
                                    <div><p className="text-[9px] text-red-400 font-black uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5"><AlertTriangle size={14}/> ΑΙΤΗΜΑ SERVICE</p><p className="text-sm text-white font-bold uppercase tracking-tight">ΠΛΗΡΩΜΗ ΜΕ {r.payment_method}</p></div>
                                    <button onClick={() => supabase.from('service_requests').delete().eq('id', r.id).then(() => fetchRequests(store.id))} className="bg-red-500 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-400">ΟΚ</button>
                                </div>
                            ))}
                            {tableOrders.map(o => {
                                const isNew = o.status === 'new' || o.status === 'preparing';
                                const isShipped = o.status === 'shipped';

                                return (
                                <div key={o.id} className={`p-5 rounded-[1.5rem] border relative overflow-hidden backdrop-blur-md transition-all ${isNew ? 'bg-white/5 border-white/10 shadow-lg' : 'bg-transparent border-white/5 opacity-60 hover:opacity-100'}`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isNew ? 'bg-cyan-500' : 'bg-emerald-500'}`}></div>
                                    
                                    {o.is_gift && (
                                        <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl mb-4 flex items-center justify-between text-purple-300">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"><Gift size={14} className="text-purple-400 animate-pulse"/> ΚΕΡΑΣΜΑ</div>
                                            <div className="text-[10px] font-bold bg-purple-900/50 px-2 py-1 rounded-md border border-purple-500/30">ΑΠΟ {o.from_umbrella} <ArrowRight size={10} className="inline"/> {o.to_umbrella}</div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4 pl-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md text-slate-900 ${isNew ? 'bg-cyan-400' : 'bg-emerald-500 text-white'}`}>
                                                {isNew ? 'ΕΚΚΡΕΜΕΙ' : 'ΣΕΡΒΙΡΙΣΤΗΚΕ'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {getWaitTime(o.created_at)}'</span>
                                        </div>
                                        <p className="font-black text-sm text-white">{o.total_price.toFixed(2)}€</p>
                                    </div>
                                    
                                    <div className={`space-y-2 mb-6 pl-3 ${isShipped ? 'opacity-70 grayscale' : ''}`}>
                                        {o.items.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-3 text-sm font-medium text-slate-200">
                                                <span className="font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md text-xs">{item.quantity}x</span> 
                                                <span className="leading-tight pt-0.5">{item.uniqueName}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {isNew ? (
                                        <button onClick={() => updateOrderStatus(o)} className="w-full py-4 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2">
                                            <Zap size={16}/> ΕΤΟΙΜΟ & ΣΕΡΒΙΡΙΣΜΑ
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Αυτοματη Αρχειοθετηση σε 5'</p>
                                            <button onClick={() => updateOrderStatus(o)} className="text-[9px] bg-white/5 border border-white/10 text-slate-400 px-3 py-2 rounded-lg font-black uppercase hover:text-white hover:bg-white/10 transition-colors">ΚΛΕΙΣΙΜΟ [X]</button>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
          </div>
        )}

        {/* ⚡ TAB: ΑΝΑΦΟΡΕΣ (TIME MACHINE & PRODUCT INSIGHTS) ⚡ */}
        {adminTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
             
             <div className="flex bg-white/5 p-1.5 rounded-[1.2rem] border border-white/5 w-fit">
                <button onClick={() => setStatsView('daily')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${statsView === 'daily' ? 'bg-cyan-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}>ΗΜΕΡΗΣΙΑ ΕΣΟΔΑ</button>
                <button onClick={() => setStatsView('insights')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${statsView === 'insights' ? 'bg-cyan-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}><Crosshair size={14}/> ΑΝΑΛΥΣΗ ΠΡΟΙΟΝΤΩΝ</button>
             </div>

             {statsView === 'daily' ? (
                 <>
                     <div 
                        onTouchStart={handleTouchStart} 
                        onTouchEnd={handleTouchEnd}
                        className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] shadow-xl relative overflow-hidden"
                     >
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                         <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
                             <div className="bg-cyan-500/20 p-2.5 rounded-xl"><CalendarDays className="text-cyan-400"/></div>
                             <div>
                                 <h2 className="text-sm font-black text-white tracking-widest uppercase">Χρονομηχανη Εσοδων</h2>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Swipe για αλλαγη ημερας</p>
                             </div>
                         </div>
                         <div className="flex items-center gap-2 w-full sm:w-auto bg-black/40 p-1.5 rounded-2xl border border-white/10 z-10">
                             <button onClick={() => changeDate(-1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white"><ChevronLeft size={20}/></button>
                             <input 
                                 type="date" 
                                 value={selectedDate} 
                                 onChange={(e) => setSelectedDate(e.target.value)} 
                                 className="bg-transparent text-white font-black text-sm px-4 outline-none text-center tracking-widest [color-scheme:dark]" 
                             />
                             <button onClick={() => changeDate(1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white"><ChevronRight size={20}/></button>
                         </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-6 rounded-[2rem] shadow-lg overflow-hidden relative">
                            <TrendingUp className="absolute -right-4 -top-4 text-emerald-500/20 w-32 h-32"/>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-2 relative z-10">ΕΣΟΔΑ ΗΜΕΡΑΣ</p>
                            <p className="text-4xl font-black text-white tracking-tighter relative z-10"><AnimatedCounter value={dayRevenue} />€</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-lg">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 flex items-center gap-2"><Activity size={14}/> ΟΓΚΟΣ ΠΩΛΗΣΕΩΝ</p>
                            <p className="text-4xl font-black text-white tracking-tighter">{itemsSold} <span className="text-base text-slate-500 font-bold tracking-widest uppercase">Τεμαχια</span></p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-lg">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 flex items-center gap-2"><DollarSign size={14}/> ΜΕΣΗ ΑΞΙΑ ΠΡΟΙΟΝΤΟΣ</p>
                            <p className="text-4xl font-black text-cyan-400 tracking-tighter">{avgTicket.toFixed(2)}€</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">TOP SELLERS (BEST VALUE)</p>
                             <div className="space-y-5">
                                 {bestSellers.map((item, idx) => (
                                     <div key={idx} className="flex flex-col">
                                         <div className="flex justify-between items-end mb-1.5">
                                             <p className="text-white font-black truncate">{item.name} <span className="text-[9px] font-bold text-slate-500 ml-2">x{item.qty}</span></p>
                                             <span className="text-sm font-black text-cyan-400">{item.revenue.toFixed(2)}€</span>
                                         </div>
                                         <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${(item.revenue / (bestSellers[0]?.revenue || 1)) * 100}%` }}></div></div>
                                     </div>
                                 ))}
                                 {bestSellers.length === 0 && <p className="text-slate-500 text-sm font-bold italic">Δεν υπάρχουν πωλήσεις για αυτή την ημερομηνία.</p>}
                             </div>
                         </div>

                         <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-2"><PieChart size={14}/> ΑΝΑΛΥΣΗ ΚΑΤΗΓΟΡΙΩΝ</p>
                             <div className="space-y-5">
                                 {categoryStats.map(([cat, rev], idx) => {
                                     const percentage = dayRevenue > 0 ? (rev / dayRevenue) * 100 : 0;
                                     return (
                                     <div key={idx} className="flex flex-col">
                                         <div className="flex justify-between items-end mb-1.5">
                                             <p className="text-white font-black truncate uppercase tracking-widest text-xs">{cat}</p>
                                             <div className="text-right">
                                                 <span className="text-xs font-black text-emerald-400 mr-2">{rev.toFixed(2)}€</span>
                                                 <span className="text-[10px] font-bold text-slate-500">{percentage.toFixed(1)}%</span>
                                             </div>
                                         </div>
                                         <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${percentage}%` }}></div></div>
                                     </div>
                                     );
                                 })}
                                 {categoryStats.length === 0 && <p className="text-slate-500 text-sm font-bold italic">Κανένα δεδομένο.</p>}
                             </div>
                         </div>
                     </div>

                     <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">FEED ΠΩΛΗΣΕΩΝ ΗΜΕΡΑΣ</p>
                            <RefreshCw size={14} className="text-slate-500 animate-spin-slow"/>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                            {sales.map((sale, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 hover:bg-black/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 font-black shrink-0">{sale.umbrella_number}</div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white leading-tight truncate">{sale.product_name} <span className="text-cyan-400 ml-1 text-xs">x{sale.quantity}</span></p>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{new Date(sale.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-emerald-400">+{(sale.price * sale.quantity).toFixed(2)}€</p>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{sale.category}</p>
                                    </div>
                                </div>
                            ))}
                            {sales.length === 0 && <p className="text-center py-10 text-slate-500 font-bold tracking-widest uppercase">Καμια πωληση</p>}
                        </div>
                     </div>
                 </>
             ) : (
                 <div className="animate-in slide-in-from-right-8 duration-500 space-y-6">
                     <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl">
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">ΕΠΙΛΟΓΗ ΣΤΟΧΟΥ (ΠΡΟΙΟΝ)</p>
                         <select 
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-black text-sm outline-none focus:border-cyan-500"
                            value={selectedInsightProduct}
                            onChange={(e) => setSelectedInsightProduct(e.target.value)}
                         >
                            {menu.map(m => <option key={m.id} value={m.name}>{m.name} ({m.category})</option>)}
                         </select>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-8 rounded-[2rem] shadow-xl">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-2">ΣΥΝΟΛΙΚΟΣ ΤΖΙΡΟΣ ΠΡΟΙΟΝΤΟΣ</p>
                             <p className="text-5xl font-black text-white tracking-tighter mb-6">{productTotalRev.toFixed(2)}€</p>
                             <div className="flex items-center gap-4 text-sm font-bold text-slate-300">
                                 <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/5">Τεμάχια: <span className="text-purple-400">{productTotalQty}</span></div>
                             </div>
                         </div>

                         <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col justify-center space-y-6">
                             <div>
                                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1 flex items-center gap-2"><Clock size={14} className="text-amber-400"/> ΩΡΑ ΑΙΧΜΗΣ (PEAK HOUR)</p>
                                 <p className="text-2xl font-black text-white tracking-widest">{peakHour}</p>
                             </div>
                             <div className="w-full h-px bg-white/10"></div>
                             <div>
                                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1 flex items-center gap-2"><CalendarDays size={14} className="text-cyan-400"/> ΚΑΛΥΤΕΡΗ ΜΕΡΑ</p>
                                 <p className="text-2xl font-black text-white uppercase tracking-widest">{bestDay}</p>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
          </div>
        )}

        {/* TAB: ΧΩΡΟΤΑΞΙΑ */}
        {adminTab === 'map' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-xl">
               <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  <input placeholder="Νούμερο" className="flex-1 sm:w-40 bg-black/40 p-4 rounded-xl outline-none border border-white/10 text-sm font-bold text-white focus:border-cyan-500 transition-colors" value={newUmbrella} onChange={(e) => setNewUmbrella(e.target.value)} />
                  <button onClick={handleAddUmbrella} className="bg-cyan-500 text-slate-950 px-6 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">ΠΡΟΣΘΗΚΗ</button>
               </div>
               <button onClick={() => setIsQRModalOpen(true)} className="w-full sm:w-auto bg-purple-500 hover:bg-purple-400 text-white px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg transition-all">
                  <QrCode size={18}/> ΕΚΤΥΠΩΣΗ QR
               </button>
            </div>
            <div ref={mapRef} onMouseMove={e => {
                if (draggingId === null || !mapRef.current) return;
                const rect = mapRef.current.getBoundingClientRect();
                setUmbrellas(prev => prev.map(u => u.id === draggingId ? { ...u, x_pos: Math.round(e.clientX - rect.left - 40), y_pos: Math.round(e.clientY - rect.top - 40) } : u));
            }} onMouseUp={handleMouseUp} onTouchMove={e => {
                if (draggingId === null || !mapRef.current) return;
                const rect = mapRef.current.getBoundingClientRect();
                const touch = e.touches[0];
                setUmbrellas(prev => prev.map(u => u.id === draggingId ? { ...u, x_pos: Math.round(touch.clientX - rect.left - 40), y_pos: Math.round(touch.clientY - rect.top - 40) } : u));
            }} onTouchEnd={handleMouseUp} className="relative w-full h-[600px] bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner cursor-crosshair backdrop-blur-xl" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
              {umbrellas.map(u => {
                const tableOrders = orders.filter(o => o.umbrella_number === u.number);
                const hasOrder = tableOrders.length > 0;
                const totalVal = tableOrders.reduce((acc, curr) => acc + curr.total_price, 0);
                const hasReq = requests.find(r => r.umbrella_number === u.number);
                
                let maxWaitTime = 0;
                if (tableOrders.length > 0) {
                    const oldestTime = Math.min(...tableOrders.map(o => new Date(o.created_at).getTime()));
                    maxWaitTime = Math.floor((new Date().getTime() - oldestTime) / 60000);
                }
                const isWhale = totalVal >= 50; 
                const isSquatter = maxWaitTime >= 45 && totalVal <= 12;

                let stateClass = "bg-white/5 border-white/10 text-slate-500";
                if (hasReq) {
                    stateClass = "bg-red-500 border-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.6)] z-30 animate-pulse";
                } else if (hasOrder) {
                    if (isWhale) stateClass = "bg-amber-500 border-yellow-300 text-amber-950 shadow-[0_0_40px_rgba(250,204,21,0.7)] z-20";
                    else if (isSquatter) stateClass = "bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] z-20 opacity-90";
                    else stateClass = "bg-emerald-500 border-emerald-400 text-white z-20";
                }

                return (
                  <div key={u.id} onMouseDown={() => setDraggingId(u.id)} onTouchStart={() => setDraggingId(u.id)} className={`absolute w-20 h-20 rounded-2xl border flex flex-col items-center justify-center cursor-grab transition-all duration-300 group backdrop-blur-md ${stateClass} ${draggingId === u.id ? 'scale-110 opacity-70 z-50 ring-4 ring-cyan-500/50' : ''}`} style={{ left: `${u.x_pos}px`, top: `${u.y_pos}px`, transition: draggingId === u.id ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <span className="text-2xl font-black tracking-tighter drop-shadow-md">{u.number}</span>
                    <button onClick={() => { if(confirm("Διαγραφή;")) supabase.from('umbrellas').delete().eq('id', u.id).then(()=>fetchUmbrellas(store.id)); }} className="absolute -top-3 -right-3 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center sm:hidden group-hover:flex z-50 hover:scale-110 shadow-lg"><X size={14}/></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ⚡ TAB: ΟΠΛΟΣΤΑΣΙΟ (ΜΕ ON/OFF & ΚΑΤΗΓΟΡΙΕΣ) ⚡ */}
        {adminTab === 'menu' && (
           <div className="space-y-6 sm:space-y-8 pb-10">
              <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                <h3 className="text-lg font-black mb-6 text-white flex items-center gap-3 tracking-wide"><Plus className="text-cyan-500" size={24} /> ΠΡΟΣΘΗΚΗ ΠΡΟΙΟΝΤΟΣ</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
                  <input placeholder="Ονομασία" className="col-span-2 bg-black/40 p-4 rounded-xl outline-none border border-white/5 text-white font-bold text-sm" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                  <input list="category-options" placeholder="Κατηγορία" className="col-span-2 sm:col-span-1 bg-black/40 p-4 rounded-xl border border-white/5 text-white font-bold text-sm" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} />
                  <datalist id="category-options">{uniqueCategories.map(cat => <option key={cat} value={cat} />)}</datalist>
                  <input placeholder="Τιμή" type="number" step="0.1" className="col-span-2 sm:col-span-1 bg-black/40 p-4 rounded-xl border border-white/5 text-white font-black text-sm" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                  <input placeholder="P (g)" type="number" className="bg-black/40 p-4 rounded-xl border border-white/5 text-white text-sm" value={newProduct.protein} onChange={(e) => setNewProduct({...newProduct, protein: e.target.value})} />
                  <input placeholder="Cal" type="number" className="bg-black/40 p-4 rounded-xl border border-white/5 text-white text-sm" value={newProduct.calories} onChange={(e) => setNewProduct({...newProduct, calories: e.target.value})} />
                </div>
                <div className="col-span-full bg-black/20 p-5 rounded-2xl border border-white/5 mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">ΠΡΟΑΙΡΕΤΙΚΕΣ ΕΠΙΛΟΓΕΣ / MODS</p>
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {newProductOptions.map(opt => (
                            <span key={opt} className="bg-white/10 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] flex items-center gap-2 border border-white/5">
                                {opt} <button onClick={() => { setNewProductOptions(newProductOptions.filter(o => o !== opt)); }} className="hover:text-red-400 transition-colors"><X size={14}/></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <input placeholder="π.χ. Γλυκός, Σκέτος" className="flex-1 bg-black/40 p-4 rounded-xl outline-none border border-white/5 text-white font-bold text-sm" value={currentOption} onChange={(e) => setCurrentOption(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { const opt = currentOption.trim(); if(opt && !newProductOptions.includes(opt)) { setNewProductOptions([...newProductOptions, opt]); setCurrentOption(''); } } }} />
                        <button onClick={() => { const opt = currentOption.trim(); if(opt && !newProductOptions.includes(opt)) { setNewProductOptions([...newProductOptions, opt]); setCurrentOption(''); } }} className="bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-white px-6 rounded-xl transition-all font-black flex items-center justify-center"><Plus size={20}/></button>
                    </div>
                </div>
                <button onClick={handleAddProduct} className="w-full bg-cyan-500 text-slate-950 p-5 rounded-xl font-black uppercase transition-all hover:bg-cyan-400 text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(6,182,212,0.3)]">ΠΡΟΣΘΗΚΗ ΣΤΟ ΜΕΝΟΥ</button>
              </div>
              
              <div className="space-y-8">
                {uniqueCategories.map(category => {
                    const categoryItems = menu.filter(m => m.category === category);
                    const isCategoryOn = categoryItems.some(i => i.is_available !== false);
                    
                    return (
                        <div key={category} className="space-y-4 animate-in fade-in duration-500">
                            {/* CATEGORY HEADER WITH MASTER SWITCH */}
                            <div className="flex justify-between items-center bg-white/5 border border-white/10 p-5 rounded-[1.5rem] backdrop-blur-md shadow-lg">
                                <h4 className="font-black text-white uppercase tracking-widest text-lg flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${isCategoryOn ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                                    {category}
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">{isCategoryOn ? 'ΕΝΕΡΓΗ' : 'ΕΞΑΝΤΛΗΘΗΚΕ'}</span>
                                    <button onClick={() => toggleCategoryAvailability(category, isCategoryOn)} className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${isCategoryOn ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${isCategoryOn ? 'left-8' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                            
                            {/* ITEMS GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2 sm:pl-4 border-l border-white/5">
                                {categoryItems.map(p => (
                                    <div key={p.id} className={`p-4 sm:p-5 rounded-[1.5rem] flex justify-between items-center transition-all duration-300 ${p.is_available !== false ? 'bg-white/5 border border-white/10 backdrop-blur-md hover:border-white/20' : 'bg-black/40 border border-transparent opacity-50 grayscale hover:grayscale-0'}`}>
                                        <div className="min-w-0 pr-2">
                                            <p className={`font-bold text-sm sm:text-base truncate transition-colors ${p.is_available !== false ? 'text-white' : 'text-slate-400 line-through decoration-red-500/50'}`}>{p.name}</p>
                                            <div className="flex gap-2 mt-2">
                                                {p.options && <span className="text-[9px] font-black uppercase tracking-[0.1em] px-2.5 py-1 bg-white/5 rounded-md text-slate-400 border border-white/10 truncate max-w-[120px]">MODS: {p.options}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                            <div className="flex flex-col items-center gap-1 mr-1">
                                                <button onClick={() => toggleProductAvailability(p.id, p.is_available !== false)} className={`w-10 h-5 rounded-full transition-all relative ${p.is_available !== false ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                                                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${p.is_available !== false ? 'left-[22px]' : 'left-[3px]'}`}></div>
                                                </button>
                                            </div>
                                            <div className="w-px h-8 bg-white/10 mx-0.5 sm:mx-1"></div>
                                            <input type="number" defaultValue={p.price} onBlur={(e) => supabase.from('menu').update({ price: parseFloat(e.target.value) }).eq('id', p.id)} className="w-14 sm:w-16 bg-black/40 p-2 rounded-xl text-center text-white font-black border border-white/10 outline-none text-xs sm:text-sm focus:border-cyan-500 transition-colors" />
                                            <button onClick={() => {if(confirm("Διαγραφή;")) supabase.from('menu').delete().eq('id', p.id).then(()=>fetchMenu(store.id));}} className="p-2 sm:p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
              </div>
           </div>
        )}

        {/* TAB: ΡΥΘΜΙΣΕΙΣ */}
        {adminTab === 'settings' && (
          <div className="space-y-8 pb-10">
             <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl max-w-3xl">
                <h3 className="text-xl font-black mb-2 text-white playfair tracking-wide">Brand Identity</h3>
                <div className="space-y-6 my-8">
                    <div className="bg-black/30 p-5 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="w-full min-w-0">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">ΔΗΜΟΣΙΟ LINK ΠΕΛΑΤΩΝ</label>
                            <p className="font-mono text-cyan-400 text-xs sm:text-sm font-bold bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 truncate select-all">
                                {typeof window !== 'undefined' ? window.location.origin : ''}/?store={store.slug}
                            </p>
                        </div>
                        <button onClick={handleCopyLink} className="w-full sm:w-auto bg-white/10 p-4 rounded-xl hover:bg-white/20 transition-colors text-white flex items-center justify-center gap-2 font-bold text-xs shrink-0 tracking-widest uppercase">
                            <Copy size={16}/> ΑΝΤΙΓΡΑΦΗ
                        </button>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">ΟΝΟΜΑΣΙΑ ΜΟΝΑΔΑΣ</label>
                        <input className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-white font-bold outline-none focus:border-cyan-500 transition-colors" value={settingsName} onChange={e => setSettingsName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">ΧΡΩΜΑ ΚΟΥΜΠΙΩΝ (ACCENT)</label>
                            <div className="flex gap-4 items-center bg-black/40 border border-white/5 p-2 rounded-xl">
                                <input type="color" className="w-14 h-14 rounded-lg cursor-pointer bg-transparent border-0 outline-none" value={settingsColor} onChange={e => setSettingsColor(e.target.value)} />
                                <span className="font-mono text-slate-300 text-sm font-bold">{settingsColor.toUpperCase()}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">ΧΡΩΜΑ ΦΟΝΤΟΥ (PREMIUM DARK)</label>
                            <div className="flex gap-4 items-center bg-black/40 border border-white/5 p-2 rounded-xl">
                                <input type="color" className="w-14 h-14 rounded-lg cursor-pointer bg-transparent border-0 outline-none" value={settingsBgColor} onChange={e => setSettingsBgColor(e.target.value)} />
                                <span className="font-mono text-slate-300 text-sm font-bold">{settingsBgColor.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={updateSettings} className="w-full bg-emerald-500 text-slate-950 px-8 py-5 rounded-xl font-black uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all active:scale-95 text-xs flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    ΑΠΟΘΗΚΕΥΣΗ BRANDING
                </button>
             </div>

             <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl max-w-4xl">
                <h3 className="text-xl font-black mb-2 text-white flex items-center gap-3 playfair tracking-wide"><Palette className="text-purple-500"/> Στήσιμο Κατηγοριών</h3>
                <div className="space-y-4 my-8">
                    {catSettings.map((cat, index) => (
                        <div key={cat.name} className="flex flex-col sm:flex-row sm:items-center gap-5 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => moveCatUp(index)} className="bg-white/5 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"><ArrowUp size={14}/></button>
                                    <button onClick={() => moveCatDown(index)} className="bg-white/5 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"><ArrowDown size={14}/></button>
                                </div>
                                <span className="font-black text-base text-white uppercase tracking-widest">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-5 bg-white/5 p-3 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Card</label><input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 outline-none" value={cat.bg_color} onChange={e => { const newArr = [...catSettings]; newArr[index].bg_color = e.target.value; setCatSettings(newArr); }} /></div>
                                <div className="w-px h-6 bg-white/10"></div>
                                <div className="flex items-center gap-3"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Text</label><input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 outline-none" value={cat.text_color} onChange={e => { const newArr = [...catSettings]; newArr[index].text_color = e.target.value; setCatSettings(newArr); }} /></div>
                            </div>
                            <div className="w-full sm:w-32 h-14 flex items-center justify-center font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg border border-white/10 relative overflow-hidden" style={{ backgroundColor: cat.bg_color, color: cat.text_color }}>
                                <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at top left, #ffffff 0%, transparent 80%)` }}></div>PREVIEW
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={updateCategorySettings} className="w-full sm:w-auto bg-purple-500 text-white px-8 py-5 rounded-xl font-black uppercase tracking-[0.2em] hover:bg-purple-400 transition-all active:scale-95 text-xs shadow-[0_0_20px_rgba(168,85,247,0.3)]">ΑΠΟΘΗΚΕΥΣΗ UI</button>
             </div>
          </div>
        )}

      </main>

      {/* QR MODAL */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsQRModalOpen(false)}></div>
           <div className="bg-slate-900/90 border border-white/10 p-6 sm:p-8 rounded-[3rem] relative z-10 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 backdrop-blur-2xl">
              <div className="flex justify-between items-center mb-6 shrink-0 border-b border-white/10 pb-6">
                 <div className="flex items-center gap-4"><div className="bg-purple-500/20 p-3 sm:p-4 rounded-2xl"><QrCode className="text-purple-400" size={24}/></div><h2 className="text-xl sm:text-3xl font-black text-white playfair tracking-wide">Εκτύπωση QR Ζωνών</h2></div>
                 <button onClick={() => setIsQRModalOpen(false)} className="text-slate-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors border border-white/5"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                 {umbrellas.map(u => {
                    const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?store=${store.slug}&umbrella=${u.number}`;
                    const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&margin=10`;
                    return (
                       <div key={u.id} className="flex flex-col items-center bg-black/40 p-5 border border-white/5 rounded-[2rem] group hover:border-purple-500/50 transition-colors shadow-lg">
                          <h3 className="font-black text-lg sm:text-xl text-white mb-4 tracking-widest uppercase">Target {u.number}</h3>
                          <div className="bg-white p-2 rounded-2xl mb-5 shadow-xl group-hover:scale-105 transition-transform"><img src={qrImageSrc} alt={`QR`} className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl" /></div>
                          <a href={qrImageSrc} download={`Aqua_QR_Target_${u.number}.png`} target="_blank" rel="noreferrer" className="w-full text-center text-[10px] bg-purple-500 text-white px-4 py-3 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg hover:bg-purple-400">ΛΗΨΗ HD</a>
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