"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, Plus, Umbrella, Trash2, Coffee, Power, 
  Map, CreditCard, Banknote, CheckCircle, SplitSquareHorizontal, 
  Gift, Bell, Timer, ShoppingCart, Move, ChevronRight, ChevronLeft, 
  AlertTriangle, BarChart3, RefreshCw, List, Clock, X, QrCode, 
  Settings, LogOut, Copy, ArrowRight, ArrowUp, ArrowDown, Palette, 
  TrendingUp, DollarSign, Zap, Flame, Snowflake, CalendarDays, 
  PieChart, Activity, Crosshair, Building2, Utensils, Waves, Layers, MapPin
} from 'lucide-react';

type MenuItem = { id: number; name: string; price: number; category: string; description?: string; is_available: boolean; protein?: number; calories?: number; options?: string; };
type Order = { id: number; created_at: string; accepted_at?: string; umbrella_number: string; items: any[]; total_price: number; status: string; is_gift: boolean; from_umbrella: string; to_umbrella: string; };
type UmbrellaType = { id: number; number: string; x_pos: number; y_pos: number; zone_name: string; asset_type: string; is_available?: boolean; };
type ServiceRequest = { id: number; umbrella_number: string; request_type: string; payment_method: string; notes: string; status: string; created_at: string; };
type Sale = { id: number; created_at: string; product_name: string; quantity: number; price: number; category: string; umbrella_number: string; };
type StoreDetails = { id: string; name: string; slug: string; primary_color: string; bg_color: string; owner_id: string; category_prefs: any[]; store_type: string; saved_themes?: any[]; };

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
  
  const [setupName, setSetupName] = useState(''); 
  const [setupSlug, setSetupSlug] = useState('');
  const [setupType, setSetupType] = useState<'beach_bar' | 'cafe' | 'restaurant' | 'hotel'>('beach_bar');

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

  const [activeZone, setActiveZone] = useState<string>('Main');
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkStart, setBulkStart] = useState('1');
  // ⚡ Εδώ η αλλαγή: ξεκινάει από 1 για να δημιουργεί μόνο ένα ⚡
  const [bulkEnd, setBulkEnd] = useState('1');
  const [selectedAssetType, setSelectedAssetType] = useState('Τραπέζι');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  const assetTypes = [
      { id: 'Τραπέζι', icon: <Utensils size={14}/> },
      { id: 'Ξαπλώστρα', icon: <Waves size={14}/> },
      { id: 'Σταντ', icon: <Coffee size={14}/> },
      { id: 'Cabana', icon: <Umbrella size={14}/> },
      { id: 'Πουφ', icon: <Layers size={14}/> },
      { id: 'Δωμάτιο', icon: <Building2 size={14}/> },
      { id: 'Καρέκλα Bar', icon: <Zap size={14}/> }
  ];

  const mapRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const [settingsName, setSettingsName] = useState('');
  const [settingsColor, setSettingsColor] = useState('');
  const [settingsBgColor, setSettingsBgColor] = useState('');
  const [catSettings, setCatSettings] = useState<{name: string, bg_color: string, text_color: string, sort_order: number}[]>([]);
  const [savedThemes, setSavedThemes] = useState<{name: string, primary: string, bg: string}[]>([]);

  const [statsView, setStatsView] = useState<'daily' | 'insights'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInsightProduct, setSelectedInsightProduct] = useState<string>('');

  const getWaitTime = (createdAt: string) => { const diff = new Date().getTime() - new Date(createdAt).getTime(); return Math.floor(diff / 60000); };

  const getTerm = (type: string | undefined) => {
      switch(type) {
          case 'hotel': return { unit: 'Δωμάτιο', units: 'Δωμάτια', icon: <Building2 size={18}/> };
          case 'restaurant': return { unit: 'Τραπέζι', units: 'Τραπέζια', icon: <Utensils size={18}/> };
          case 'cafe': return { unit: 'Τραπέζι', units: 'Τραπέζια', icon: <Coffee size={18}/> };
          default: return { unit: 'Πόστο', units: 'Χωροταξία', icon: <Map size={18}/> };
      }
  };
  const term = getTerm(store?.store_type);

  // ⚡ ΛΟΓΙΚΗ ΔΙΑΓΡΑΦΗΣ ΖΩΝΗΣ ⚡
  const deleteZone = async (zoneName: string) => {
    if (zoneName === 'Main') return alert('Η ζώνη Main δεν διαγράφεται.');
    if (confirm(`Διαγραφή της ζώνης "${zoneName}" και όλων των αντικειμένων της;`)) {
        if (!store) return;
        await supabase.from('umbrellas').delete().eq('store_id', store.id).eq('zone_name', zoneName);
        fetchUmbrellas(store.id);
        setActiveZone('Main');
    }
  };

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

  useEffect(() => { if (store) fetchSales(store.id, selectedDate); }, [selectedDate, store]);

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
  
  const checkUserStore = async (userId: string) => { 
      const { data } = await supabase.from('stores').select('*').eq('owner_id', userId).single(); 
      if (data) { 
          setStore(data); 
          setSettingsName(data.name); 
          setSettingsColor(data.primary_color); 
          setSettingsBgColor(data.bg_color); 
          setSavedThemes(data.saved_themes || []);
          fetchDataForStore(data.id); 
      } else setStore(null); 
      setLoadingAuth(false); 
  };
  
  const createStore = async () => { 
      if (!setupName || !setupSlug) return alert("Συμπληρώστε τα πεδία!"); 
      const { data, error } = await supabase.from('stores').insert([{ name: setupName, slug: setupSlug.toLowerCase().replace(/\s+/g, '-'), primary_color: '#06b6d4', bg_color: '#020617', owner_id: session.user.id, store_type: setupType }]).select().single(); 
      if (error) alert("Το URL (slug) υπάρχει ήδη."); else checkUserStore(session.user.id); 
  };

  const updateSettings = async () => { if (!store) return; const { error } = await supabase.from('stores').update({ name: settingsName, primary_color: settingsColor, bg_color: settingsBgColor }).eq('id', store.id); if (!error) { alert("Αποθηκεύτηκαν!"); setStore({...store, name: settingsName, primary_color: settingsColor, bg_color: settingsBgColor}); } };
  const updateCategorySettings = async () => { if (!store) return; const { error } = await supabase.from('stores').update({ category_prefs: catSettings }).eq('id', store.id); if (!error) { alert("Οι κατηγορίες αποθηκεύτηκαν!"); setStore({...store, category_prefs: catSettings}); } };
  const fetchDataForStore = (storeId: string) => { fetchMenu(storeId); fetchOrders(storeId); fetchUmbrellas(storeId); fetchRequests(storeId); fetchSales(storeId, selectedDate); fetchAllSales(storeId); };

  async function fetchMenu(storeId: string) { const { data } = await supabase.from('menu').select('*').eq('store_id', storeId).order('category').order('name'); if (data) setMenu(data as MenuItem[]); }
  async function fetchOrders(storeId: string) { const { data } = await supabase.from('orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false }); if (data) setOrders(data as Order[]); }
  async function fetchUmbrellas(storeId: string) { const { data } = await supabase.from('umbrellas').select('*').eq('store_id', storeId); if (data) { const umbs = data as UmbrellaType[]; setUmbrellas(umbs); const uniqueZones = Array.from(new Set(umbs.map(u => u.zone_name || 'Main'))); if (!uniqueZones.includes(activeZone) && uniqueZones.length > 0) setActiveZone(uniqueZones[0] as string); } }
  async function fetchRequests(storeId: string) { const { data } = await supabase.from('service_requests').select('*').eq('store_id', storeId).eq('status', 'pending').order('created_at', { ascending: false }); if (data) setRequests(data as ServiceRequest[]); }
  async function fetchSales(storeId: string, dateStr: string) { const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString(); const endOfDay = new Date(`${dateStr}T23:59:59.999`).toISOString(); const { data } = await supabase.from('sales').select('*').eq('store_id', storeId).gte('created_at', startOfDay).lte('created_at', endOfDay).order('created_at', { ascending: false }); if (data) setSales(data as Sale[]); }
  async function fetchAllSales(storeId: string) { const { data } = await supabase.from('sales').select('*').eq('store_id', storeId).order('created_at', { ascending: false }); if (data) setAllSales(data as Sale[]); }

  const handleAddProduct = async () => { if (!newProduct.name || !newProduct.price || !newProduct.category || !store) return alert("Συμπληρώστε Όνομα, Κατηγορία και Τιμή!"); const optionsStr = newProductOptions.length > 0 ? newProductOptions.join(', ') : null; await supabase.from('menu').insert([{ store_id: store.id, name: newProduct.name, price: parseFloat(newProduct.price), category: newProduct.category, is_available: true, protein: parseInt(newProduct.protein) || null, calories: parseInt(newProduct.calories) || null, options: optionsStr }]); setNewProduct({ name: '', price: '', category: '', protein: '', calories: '' }); setNewProductOptions([]); fetchMenu(store.id); };
  
  const archiveOrder = async (order: Order) => { if (!store) return; const salesData = order.items.map(item => ({ store_id: store.id, product_name: item.uniqueName, quantity: item.quantity, price: item.price, category: item.category, umbrella_number: order.umbrella_number })); const { error } = await supabase.from('sales').insert(salesData); if (!error) { await supabase.from('orders').delete().eq('id', order.id); fetchOrders(store.id); fetchSales(store.id, selectedDate); fetchAllSales(store.id); } };
  
  const updateOrderStatus = async (order: Order) => { if (!store) return; if (order.status === 'new' || order.status === 'preparing') { await supabase.from('orders').update({ status: 'shipped', accepted_at: new Date().toISOString() }).eq('id', order.id); } else if (order.status === 'shipped') { await archiveOrder(order); } fetchOrders(store.id); };

  const resetTable = async (uNum: string) => { if (!store) return; if (confirm(`Καθαρισμός ${term.unit.toLowerCase()} ${uNum};`)) { const tableOrders = orders.filter(o => o.umbrella_number === uNum); for (const order of tableOrders) await archiveOrder(order); await supabase.from('service_requests').delete().eq('umbrella_number', uNum).eq('store_id', store.id); fetchRequests(store.id); fetchOrders(store.id); } };
  
  const handleBulkAdd = async () => {
      if (!store || !activeZone) return alert("Δημιουργήστε ή επιλέξτε μια Ζώνη πρώτα!");
      const start = parseInt(bulkStart); const end = parseInt(bulkEnd);
      if (isNaN(start) || isNaN(end) || start > end) return alert("Λάθος αρίθμηση!");
      
      const toInsert = [];
      for (let i = start; i <= end; i++) {
          toInsert.push({ store_id: store.id, number: `${bulkPrefix}${i}`, x_pos: 50 + (i * 10 % 300), y_pos: 50 + (i * 10 % 300), zone_name: activeZone, asset_type: selectedAssetType });
      }
      
      const { error } = await supabase.from('umbrellas').insert(toInsert);
      if (error) alert("Σφάλμα δημιουργίας. Μήπως υπάρχουν ήδη αυτά τα νούμερα;");
      else { setBulkPrefix(''); setBulkStart('1'); setBulkEnd('1'); fetchUmbrellas(store.id); }
  };

  const createNewZone = () => {
      const zone = prompt("Ονομασία νέας ζώνης (π.χ. Παραλία, Εστιατόριο, Ταράτσα):");
      if (zone && zone.trim() !== '') setActiveZone(zone.trim());
  };

  const handleMouseUp = async () => { if (draggingId === null) return; const moved = umbrellas.find(u => u.id === draggingId); if (moved) await supabase.from('umbrellas').update({ x_pos: moved.x_pos, y_pos: moved.y_pos }).eq('id', draggingId); setDraggingId(null); };
  const handleCopyLink = () => { if (!store) return; const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/?store=${store.slug}`; navigator.clipboard.writeText(url); alert("Το Link αντιγράφηκε!"); };
  const moveCatUp = (index: number) => { if (index === 0) return; const newCats = [...catSettings]; const temp = newCats[index].sort_order; newCats[index].sort_order = newCats[index - 1].sort_order; newCats[index - 1].sort_order = temp; setCatSettings(newCats.sort((a,b) => a.sort_order - b.sort_order).map((m,i) => ({...m, sort_order: i}))); };
  const moveCatDown = (index: number) => { if (index === catSettings.length - 1) return; const newCats = [...catSettings]; const temp = newCats[index].sort_order; newCats[index].sort_order = newCats[index + 1].sort_order; newCats[index + 1].sort_order = temp; setCatSettings(newCats.sort((a,b) => a.sort_order - b.sort_order).map((m,i) => ({...m, sort_order: i}))); };
  
  const handleSaveTheme = async () => {
      if (!store) return;
      const themeName = prompt("Ονομασία νέου Theme (π.χ. Summer, Dark Mode):");
      if (!themeName || themeName.trim() === '') return;
      
      const newTheme = { name: themeName.trim(), primary: settingsColor, bg: settingsBgColor };
      const updatedThemes = [...savedThemes, newTheme];
      
      const { error } = await supabase.from('stores').update({ saved_themes: updatedThemes }).eq('id', store.id);
      if (!error) {
          setSavedThemes(updatedThemes);
          alert("Το Theme αποθηκεύτηκε επιτυχώς!");
      } else {
          alert("Υπήρξε πρόβλημα στην αποθήκευση του Theme.");
      }
  };

  const handleDeleteTheme = async (index: number) => {
      if (!store || !confirm("Σίγουρα θέλετε να διαγράψετε αυτό το Theme;")) return;
      const updatedThemes = savedThemes.filter((_, i) => i !== index);
      const { error } = await supabase.from('stores').update({ saved_themes: updatedThemes }).eq('id', store.id);
      if (!error) setSavedThemes(updatedThemes);
  };

  const applyTheme = (primary: string, bg: string) => {
      setSettingsColor(primary);
      setSettingsBgColor(bg);
  };
  
  const changeDate = (days: number) => { const d = new Date(selectedDate); d.setDate(d.getDate() + days); setSelectedDate(d.toISOString().split('T')[0]); };
  let touchStartX = 0; const handleTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; }; const handleTouchEnd = (e: React.TouchEvent) => { const touchEndX = e.changedTouches[0].clientX; if (touchStartX - touchEndX > 50) changeDate(1); if (touchStartX - touchEndX < -50) changeDate(-1); };

  const dayRevenue = sales.reduce((acc, s) => acc + (s.price * s.quantity), 0);
  const itemsSold = sales.reduce((acc, s) => acc + s.quantity, 0);
  const avgTicket = itemsSold > 0 ? (dayRevenue / itemsSold) : 0;
  const bestSellersObj: Record<string, { name: string; qty: number; revenue: number }> = {};
  const categoryStatsObj: Record<string, number> = {};
  
  const hourlyRevenue: number[] = Array(24).fill(0);
  
  sales.forEach(sale => { 
      if (!bestSellersObj[sale.product_name]) bestSellersObj[sale.product_name] = { name: sale.product_name, qty: 0, revenue: 0 }; 
      bestSellersObj[sale.product_name].qty += sale.quantity; 
      bestSellersObj[sale.product_name].revenue += (sale.price * sale.quantity); 
      categoryStatsObj[sale.category] = (categoryStatsObj[sale.category] || 0) + (sale.price * sale.quantity); 
      
      const saleHour = new Date(sale.created_at).getHours();
      hourlyRevenue[saleHour] += (sale.price * sale.quantity);
  });
  
  const maxHourlyRev = Math.max(...hourlyRevenue, 1);
  const activeHours = hourlyRevenue.map((rev, idx) => ({ hour: idx, rev })).filter(h => h.rev > 0);
  const chartStartHour = activeHours.length > 0 ? Math.max(0, activeHours[0].hour - 1) : 8;
  const chartEndHour = activeHours.length > 0 ? Math.min(23, activeHours[activeHours.length - 1].hour + 1) : 23;

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

  const uniqueZones = Array.from(new Set(umbrellas.map(u => u.zone_name || 'Main')));
  if (activeZone && !uniqueZones.includes(activeZone)) uniqueZones.push(activeZone);

  const activeUmbrellas = Array.from(new Set([...orders.map(o => o.umbrella_number), ...requests.map(r => r.umbrella_number)]));
  const uniqueCategories = Array.from(new Set(menu.map(m => m.category)));

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
                <h2 className="text-3xl font-black tracking-tighter mb-2 text-white">Αρχικοποίηση Μονάδας</h2>
                <div className="space-y-4 my-8">
                    <input placeholder="Ονομασία (π.χ. Nammos Beach)" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-purple-500 text-center" value={setupName} onChange={e => setSetupName(e.target.value)} />
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-purple-500">
                        <span className="text-slate-500 pl-4 text-sm font-bold truncate">aqua.com/?store=</span>
                        <input placeholder="nammos" className="w-full bg-transparent p-2 text-white font-black outline-none lowercase min-w-0" value={setupSlug} onChange={e => setSetupSlug(e.target.value)} />
                    </div>
                    <div className="pt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">ΕΠΙΛΟΓΗ ΚΛΑΔΟΥ ΕΣΤΙΑΣΗΣ</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[ { id: 'beach_bar', label: 'Beach Bar', icon: <Waves/> }, { id: 'cafe', label: 'Café', icon: <Coffee/> }, { id: 'restaurant', label: 'Restaurant', icon: <Utensils/> }, { id: 'hotel', label: 'Hotel', icon: <Building2/> } ].map(t => (
                                <button key={t.id} onClick={() => setSetupType(t.id as any)} className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${setupType === t.id ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30 scale-105' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                                    {t.icon} <span className="font-black text-xs uppercase tracking-widest">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <button onClick={createStore} className="w-full bg-purple-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-500 transition-all active:scale-95 shadow-xl shadow-purple-600/20 text-lg">ΕΚΚΙΝΗΣΗ ΣΥΣΤΗΜΑΤΟΣ</button>
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
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] truncate">AQUA COMMAND CENTER • {store.store_type?.replace('_',' ') || 'DASHBOARD'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button onClick={handleLogout} className="bg-white/5 text-slate-400 hover:text-red-400 p-2 sm:p-3 rounded-[1rem] transition-colors border border-white/5"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-y-none p-4 sm:p-6 w-full max-w-7xl mx-auto flex flex-col">
        
        <div className="shrink-0 flex gap-2 mb-6 sm:mb-10 bg-white/5 p-1.5 rounded-[1.2rem] border border-white/5 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button onClick={() => setAdminTab('orders')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'orders' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'orders' ? { backgroundColor: store.primary_color } : {}}><Bell size={16}/> ΡΟΗ ΕΡΓΑΣΙΑΣ</button>
          <button onClick={() => setAdminTab('map')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'map' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'map' ? { backgroundColor: store.primary_color } : {}}><Layers size={16}/> ΖΩΝΕΣ & ΧΩΡΟΤΑΞΙΑ</button>
          <button onClick={() => setAdminTab('menu')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'menu' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'menu' ? { backgroundColor: store.primary_color } : {}}><Coffee size={16}/> ΟΠΛΟΣΤΑΣΙΟ</button>
          <button onClick={() => setAdminTab('stats')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'stats' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'stats' ? { backgroundColor: store.primary_color } : {}}><BarChart3 size={16}/> ΑΝΑΦΟΡΕΣ</button>
          <button onClick={() => setAdminTab('settings')} className={`px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${adminTab === 'settings' ? 'text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={adminTab === 'settings' ? { backgroundColor: store.primary_color } : {}}><Settings size={16}/> ΡΥΘΜΙΣΕΙΣ</button>
        </div>

        {/* TAB: ΡΟΗ ΕΡΓΑΣΙΑΣ */}
        {adminTab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {activeUmbrellas.length === 0 && <div className="col-span-full text-center py-20 opacity-50"><Coffee size={48} className="mx-auto mb-4"/> <p className="font-black uppercase tracking-widest text-sm">Ησυχα τα πραγματα προς το παρον...</p></div>}
            {activeUmbrellas.map(uNum => {
                const tableOrders = orders.filter(o => o.umbrella_number === uNum);
                const tableRequests = requests.filter(r => r.umbrella_number === uNum);
                const totalVal = tableOrders.reduce((acc, curr) => acc + curr.total_price, 0);
                const oldestTime = tableOrders.length > 0 ? Math.min(...tableOrders.map(o => new Date(o.created_at).getTime())) : 0;
                const maxWaitTime = oldestTime ? Math.floor((new Date().getTime() - oldestTime) / 60000) : 0;
                
                const uInfo = umbrellas.find(u => u.number === uNum);
                const uZone = uInfo?.zone_name || 'Άγνωστη Ζώνη';
                const uType = uInfo?.asset_type || term.unit;

                const isWhale = totalVal >= 50; 
                const isSquatter = maxWaitTime >= 45 && totalVal <= 12;
                const isCriticalAlert = tableRequests.length > 0 || tableOrders.some(o => o.status === 'new' || o.status === 'preparing');
                
                const hasGift = tableOrders.some(o => o.is_gift === true || String(o.is_gift) === 'true' || (o.to_umbrella != null && o.to_umbrella.trim() !== ''));
                
                let cardBorder = "border-white/10 shadow-xl"; let headerBg = "bg-black/20 border-white/5"; let badge = null;

                if (tableRequests.length > 0) { cardBorder = "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]"; headerBg = "bg-red-500/10 border-red-500/30"; } 
                else if (hasGift) { cardBorder = "border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.3)]"; headerBg = "bg-purple-500/10 border-purple-500/30"; badge = <span className="bg-purple-500 text-white px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(168,85,247,0.5)]"><Gift size={12} className="animate-pulse"/> ΕΧΕΙ ΚΕΡΑΣΜΑ</span>; }
                else if (isWhale) { cardBorder = "border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.3)]"; headerBg = "bg-amber-500/10 border-amber-400/30"; badge = <span className="bg-amber-500 text-amber-950 px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(251,191,36,0.5)]"><Flame size={12}/> VIP WHALE</span>; } 
                else if (isSquatter) { cardBorder = "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]"; headerBg = "bg-blue-500/10 border-blue-500/30"; badge = <span className="bg-blue-500 text-white px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(59,130,246,0.5)]"><Snowflake size={12}/> LOW SPEND</span>; } 
                else if (isCriticalAlert) { cardBorder = "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.2)]"; headerBg = "bg-cyan-500/10 border-cyan-500/30"; }

                return (
                    <div key={uNum} className={`rounded-[2rem] border overflow-hidden bg-white/5 backdrop-blur-xl transition-all duration-300 ${cardBorder}`}>
                        <div className={`p-5 flex justify-between items-center border-b ${headerBg}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center font-black text-2xl shadow-lg ${tableRequests.length > 0 ? 'bg-red-500 text-white' : hasGift ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]' : isWhale ? 'bg-amber-500 text-amber-950' : isSquatter ? 'bg-blue-500 text-white' : 'bg-white/10 text-white'}`}>{uNum}</div>
                                <div>
                                    <div className="flex items-center gap-2"><h2 className="text-sm font-black uppercase tracking-widest text-white">{uType} {uNum}</h2> {badge}</div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{uZone}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <p className="text-sm font-black text-white">{totalVal.toFixed(2)}€</p>
                                <button onClick={() => resetTable(uNum)} className="text-[8px] font-black uppercase bg-black/40 text-slate-400 border border-white/10 px-3 py-1.5 rounded-lg hover:text-white hover:bg-black/60 flex items-center gap-1"><RefreshCw size={10}/> ΕΚΚΕΝΩΣΗ</button>
                            </div>
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
                                
                                const isGiftOrder = o.is_gift === true || String(o.is_gift) === 'true' || (o.to_umbrella != null && o.to_umbrella.trim() !== '');

                                return (
                                <div key={o.id} className={`p-5 rounded-[1.5rem] border relative overflow-hidden backdrop-blur-md transition-all ${isNew ? 'bg-white/5 border-white/10 shadow-lg' : 'bg-transparent border-white/5 opacity-60 hover:opacity-100'}`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isNew ? 'bg-cyan-500' : 'bg-emerald-500'}`}></div>
                                    
                                    {isGiftOrder && (
                                        <div className="bg-purple-500/20 border border-purple-500/40 p-4 rounded-xl mb-4 shadow-lg relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_2s_infinite]"></div>
                                            <div className="flex justify-between items-center mb-2 relative z-10">
                                                <span className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] flex items-center gap-2"><Gift size={16} className="animate-pulse"/> ΚΕΡΑΣΜΑ</span>
                                                <span className="text-[8px] font-black bg-black/40 text-purple-300 px-2 py-1 rounded-md">ΠΛΗΡΩΝΕΙ: ΤΡΑΠΕΖΙ {o.umbrella_number}</span>
                                            </div>
                                            <div className="bg-purple-600 text-white font-black text-xs sm:text-sm uppercase tracking-widest p-2.5 rounded-lg text-center border border-purple-400 shadow-md relative z-10">
                                                ΠΑΡΑΔΟΣΗ ΣΤΟ: {o.to_umbrella || 'ΑΓΝΩΣΤΟ'}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-4 pl-3"><div className="flex items-center gap-2"><span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md text-slate-900 ${isNew ? 'bg-cyan-400' : 'bg-emerald-500 text-white'}`}>{isNew ? 'ΕΚΚΡΕΜΕΙ' : 'ΣΕΡΒΙΡΙΣΤΗΚΕ'}</span><span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {getWaitTime(o.created_at)}'</span></div></div>
                                    <div className={`space-y-2 mb-6 pl-3 ${isShipped ? 'opacity-70 grayscale' : ''}`}>{o.items.map((item, idx) => (<div key={idx} className="flex items-start gap-3 text-sm font-medium text-slate-200"><span className="font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md text-xs">{item.quantity}x</span><span className="leading-tight pt-0.5">{item.uniqueName}</span></div>))}</div>
                                    {isNew ? (<button onClick={() => updateOrderStatus(o)} className="w-full py-4 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"><Zap size={16}/> ΕΤΟΙΜΟ & ΣΕΡΒΙΡΙΣΜΑ</button>) : (<div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5"><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Αυτοματη Αρχειοθετηση σε 5'</p><button onClick={() => updateOrderStatus(o)} className="text-[9px] bg-white/5 border border-white/10 text-slate-400 px-3 py-2 rounded-lg font-black uppercase hover:text-white hover:bg-white/10 transition-colors">ΚΛΕΙΣΙΜΟ [X]</button></div>)}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
          </div>
        )}

        {/* TAB: ΖΩΝΕΣ & ΧΩΡΟΤΑΞΙΑ */}
        {adminTab === 'map' && (
          <div className="flex flex-col lg:flex-row gap-6 h-[80vh] animate-in fade-in slide-in-from-bottom-4 pb-10">
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-xl flex-1 flex flex-col">
                    <h3 className="font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><Layers size={18} className="text-purple-400"/> ΖΩΝΕΣ ΚΑΤΑΣΤΗΜΑΤΟΣ</h3>
                    <div className="space-y-2 flex-1 overflow-y-auto pr-2 no-scrollbar">
                        {uniqueZones.map(zone => (
                            <div key={zone} className={`w-full rounded-2xl flex items-center transition-all border ${activeZone === zone ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/20'}`}>
                                <button onClick={() => setActiveZone(zone)} className="flex-1 p-4 flex items-center justify-between text-left">
                                    <span className="font-black text-sm uppercase tracking-wider">{zone}</span>
                                    <span className="text-[10px] font-bold opacity-60">{umbrellas.filter(u => (u.zone_name || 'Main') === zone).length} ITEMS</span>
                                </button>
                                {zone !== 'Main' && (
                                    <button onClick={(e) => { e.stopPropagation(); deleteZone(zone); }} className={`p-4 hover:text-red-400 transition-colors ${activeZone === zone ? 'text-white/70' : 'text-slate-500'}`}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={createNewZone} className="mt-4 w-full py-4 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/50 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={14}/> ΝΕΑ ΖΩΝΗ</button>
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-xl shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-4 z-10 relative">
                    <div className="flex flex-wrap items-center gap-3">
                        <select value={selectedAssetType} onChange={(e) => setSelectedAssetType(e.target.value)} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white font-black text-xs uppercase tracking-widest outline-none focus:border-purple-500">
                            {assetTypes.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
                        </select>
                        <input placeholder="Prefix (π.χ. T-)" className="w-24 bg-black/40 p-4 rounded-xl outline-none border border-white/10 text-xs font-black text-white focus:border-purple-500 uppercase" value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} />
                        <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-2 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">ΑΠΟ</span>
                            <input type="number" className="w-12 bg-transparent text-white font-black text-xs outline-none text-center" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ΕΩΣ</span>
                            <input type="number" className="w-12 bg-transparent text-white font-black text-xs outline-none text-center" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} />
                        </div>
                        <button onClick={handleBulkAdd} className="bg-purple-600 text-white px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] flex items-center gap-2"><Zap size={14}/> ΜΑΖΙΚΗ ΔΗΜΙΟΥΡΓΙΑ</button>
                    </div>
                    <button onClick={() => setIsQRModalOpen(true)} className="bg-white text-slate-900 px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg transition-all hover:bg-slate-200"><QrCode size={16}/> ΕΚΤΥΠΩΣΗ ΖΩΝΗΣ</button>
                </div>
                <div ref={mapRef} onMouseMove={e => { if (draggingId === null || !mapRef.current) return; const rect = mapRef.current.getBoundingClientRect(); setUmbrellas(prev => prev.map(u => u.id === draggingId ? { ...u, x_pos: Math.round(e.clientX - rect.left - 40), y_pos: Math.round(e.clientY - rect.top - 40) } : u)); }} onMouseUp={handleMouseUp} onTouchMove={e => { if (draggingId === null || !mapRef.current) return; const rect = mapRef.current.getBoundingClientRect(); const touch = e.touches[0]; setUmbrellas(prev => prev.map(u => u.id === draggingId ? { ...u, x_pos: Math.round(touch.clientX - rect.left - 40), y_pos: Math.round(touch.clientY - rect.top - 40) } : u)); }} onTouchEnd={handleMouseUp} className="flex-1 w-full relative bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner cursor-crosshair backdrop-blur-xl" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                    <div className="absolute top-6 left-6 text-white/20 font-black text-6xl uppercase tracking-tighter mix-blend-overlay pointer-events-none select-none">{activeZone}</div>
                    {umbrellas.filter(u => (u.zone_name || 'Main') === activeZone).map(u => {
                        const icon = assetTypes.find(t => t.id === u.asset_type)?.icon || <MapPin size={14}/>;
                        const isDragging = draggingId === u.id;
                        return (
                            <div key={u.id} onMouseDown={() => setDraggingId(u.id)} onTouchStart={() => setDraggingId(u.id)} className={`absolute w-20 h-20 rounded-[1.2rem] border flex flex-col items-center justify-center cursor-grab transition-all duration-300 group backdrop-blur-md bg-white/5 border-white/10 text-slate-300 hover:border-purple-400 hover:text-white shadow-lg ${isDragging ? 'scale-110 opacity-80 z-50 ring-4 ring-purple-500/50' : ''}`} style={{ left: `${u.x_pos}px`, top: `${u.y_pos}px`, transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                <span className="opacity-50 mb-1">{icon}</span>
                                <span className="text-xl font-black tracking-tighter drop-shadow-md">{u.number}</span>
                                <button onClick={() => { if(confirm(`Διαγραφή ${u.asset_type} ${u.number};`)) supabase.from('umbrellas').delete().eq('id', u.id).then(()=>fetchUmbrellas(store.id)); }} className="absolute -top-3 -right-3 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center sm:hidden group-hover:flex z-50 hover:scale-110 shadow-lg"><X size={14}/></button>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}