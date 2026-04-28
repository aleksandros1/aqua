"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BellRing, Coffee, CheckCircle2, ChevronRight, AlertTriangle, 
  Banknote, CreditCard, Clock, LogOut, Navigation
} from 'lucide-react';

type Order = { id: number; created_at: string; umbrella_number: string; items: any[]; total_price: number; status: string; is_gift: boolean; from_umbrella: string; to_umbrella: string; };
type ServiceRequest = { id: number; umbrella_number: string; request_type: string; payment_method: string; notes: string; status: string; created_at: string; };
type StoreDetails = { id: string; name: string; slug: string; primary_color: string; };

export default function WaiterPage() {
  const [session, setSession] = useState<any>(null);
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'action' | 'preparing'>('action');

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
    const ordersSub = supabase.channel(`waiter_orders_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` }, () => fetchOrders(store.id)).subscribe();
    const requestsSub = supabase.channel(`waiter_requests_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `store_id=eq.${store.id}` }, () => fetchRequests(store.id)).subscribe();

    return () => { supabase.removeChannel(ordersSub); supabase.removeChannel(requestsSub); };
  }, [store]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Λάθος στοιχεία!");
    setLoadingAuth(false);
  };

  const handleLogout = async () => await supabase.auth.signOut();

  const checkUserStore = async (userId: string) => {
    const { data } = await supabase.from('stores').select('id, name, slug, primary_color').eq('owner_id', userId).single();
    if (data) { setStore(data); fetchDataForStore(data.id); } 
    else setStore(null);
    setLoadingAuth(false);
  };

  const fetchDataForStore = (storeId: string) => { fetchOrders(storeId); fetchRequests(storeId); };

  async function fetchOrders(storeId: string) { 
      const { data } = await supabase.from('orders').select('*').eq('store_id', storeId).in('status', ['new', 'preparing', 'shipped']).order('created_at', { ascending: true }); 
      if (data) setOrders(data as Order[]); 
  }
  
  async function fetchRequests(storeId: string) { 
      const { data } = await supabase.from('service_requests').select('*').eq('store_id', storeId).order('created_at', { ascending: true }); 
      if (data) setRequests(data as ServiceRequest[]); 
  }

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    if (!store) return;
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (newStatus === 'completed') {
        const salesData = order.items.map(item => ({ store_id: store.id, product_name: item.uniqueName, quantity: item.quantity, price: item.price, category: item.category, umbrella_number: order.umbrella_number }));
        await supabase.from('sales').insert(salesData);
        await supabase.from('orders').delete().eq('id', order.id);
    }
    fetchOrders(store.id);
  };

  const completeRequest = async (id: number) => {
      if (!store) return;
      await supabase.from('service_requests').delete().eq('id', id);
      fetchRequests(store.id);
  };

  const getWaitTime = (createdAt: string) => Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);

  // Διαχωρισμός εργασιών
  const actionRequiredOrders = orders.filter(o => o.status === 'new' || o.status === 'shipped');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

  if (loadingAuth) return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-cyan-500 font-black text-xl uppercase tracking-widest animate-pulse">ΣΥΓΧΡΟΝΙΣΜΟΣ...</div>;

  if (!session || !store) {
    return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col justify-center py-12 px-6 font-sans text-slate-200">
            <div className="mx-auto w-full max-w-sm text-center">
                <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6"><Navigation size={32} className="text-cyan-500" /></div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2 text-white">AQUA <span className="text-cyan-500">WAITER</span></h2>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs mb-8">ΟΘΟΝΗ ΠΡΟΣΩΠΙΚΟΥ</p>
                
                <form className="space-y-4" onSubmit={handleLogin}>
                    <input placeholder="Email Καταστήματος" type="email" required className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-cyan-500 font-bold" value={email} onChange={e => setEmail(e.target.value)} />
                    <input placeholder="Κωδικός πρόσβασης" type="password" required className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-cyan-500 font-bold" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="submit" className="w-full bg-cyan-500 text-slate-950 p-4 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all mt-4">ΣΥΝΔΕΣΗ</button>
                </form>
            </div>
        </div>
    );
  }

  const hasAlerts = requests.length > 0 || actionRequiredOrders.length > 0;

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
      
      {/* HEADER ΣΕΡΒΙΤΟΡΟΥ */}
      <header className="shrink-0 p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${hasAlerts ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
          <div>
              <h1 className="text-lg font-black tracking-tighter text-white uppercase italic leading-none">{store.name}</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ΣΕΡΒΙΤΟΡΟΣ</p>
          </div>
        </div>
        <button onClick={handleLogout} className="bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white"><LogOut size={18}/></button>
      </header>

      {/* TABS */}
      <div className="shrink-0 flex p-2 bg-slate-950 border-b border-slate-800 gap-2">
          <button onClick={() => setActiveTab('action')} className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'action' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-500'}`}>
              <BellRing size={14}/> ΔΡΑΣΗ ({(requests.length + actionRequiredOrders.length)})
          </button>
          <button onClick={() => setActiveTab('preparing')} className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'preparing' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-500'}`}>
              <Coffee size={14}/> BAR/ΚΟΥΖΙΝΑ ({preparingOrders.length})
          </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto overscroll-y-none p-4 space-y-4 pb-20">
        
        {activeTab === 'action' && (
            <>
                {requests.length === 0 && actionRequiredOrders.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 mt-20">
                        <CheckCircle2 size={64} className="mb-4" />
                        <p className="font-black uppercase tracking-widest">ΟΛΑ ΚΑΘΑΡΑ</p>
                    </div>
                )}

                {/* 1. ΑΙΤΗΜΑΤΑ ΛΟΓΑΡΙΑΣΜΟΥ (ΥΨΗΛΗ ΠΡΟΤΕΡΑΙΟΤΗΤΑ) */}
                {requests.map(r => (
                    <div key={r.id} className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 animate-in slide-in-from-left-4">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-500 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg">{r.umbrella_number}</div>
                                <div>
                                    <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-0.5">ΛΟΓΑΡΙΑΣΜΟΣ</p>
                                    <p className="text-sm text-white font-bold uppercase flex items-center gap-1">
                                        {r.payment_method === 'pos' ? <CreditCard size={14} className="text-slate-300"/> : <Banknote size={14} className="text-emerald-400"/>}
                                        {r.payment_method === 'pos' ? 'ΚΑΡΤΑ (POS)' : 'ΜΕΤΡΗΤΑ'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock size={10}/> {getWaitTime(r.created_at)}'</span>
                        </div>
                        <button onClick={() => completeRequest(r.id)} className="w-full bg-red-500 hover:bg-red-400 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-500/20">
                            ΟΛΟΚΛΗΡΩΣΗ ΠΛΗΡΩΜΗΣ
                        </button>
                    </div>
                ))}

                {/* 2. ΕΤΟΙΜΕΣ ΠΑΡΑΓΓΕΛΙΕΣ (ΓΙΑ ΣΕΡΒΙΡΙΣΜΑ) */}
                {actionRequiredOrders.filter(o => o.status === 'shipped').map(o => (
                    <div key={o.id} className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 animate-in slide-in-from-right-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">{o.umbrella_number}</div>
                                <div>
                                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-0.5">ΕΤΟΙΜΗ ΣΤΟ ΜΠΑΡ</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase">ΠΡΟΣ ΠΑΡΑΔΟΣΗ</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl mb-4 space-y-1">
                            {o.items.map((item, idx) => (
                                <p key={idx} className="text-sm font-medium text-slate-200"><span className="font-black text-emerald-400">{item.quantity}x</span> {item.uniqueName}</p>
                            ))}
                        </div>
                        <button onClick={() => updateOrderStatus(o, 'completed')} className="w-full bg-emerald-500 text-slate-950 py-4 rounded-xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                            ΠΑΡΑΔΟΘΗΚΕ ΣΤΟ ΤΡΑΠΕΖΙ
                        </button>
                    </div>
                ))}

                {/* 3. ΝΕΕΣ ΠΑΡΑΓΓΕΛΙΕΣ (ΠΟΥ ΠΡΕΠΕΙ ΝΑ ΣΤΑΛΟΥΝ ΣΤΟ ΜΠΑΡ) */}
                {actionRequiredOrders.filter(o => o.status === 'new').map(o => (
                    <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase px-2 py-1 rounded">ΝΕΑ ΠΑΡΑΓΓΕΛΙΑ</span>
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock size={10}/> {getWaitTime(o.created_at)}'</span>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-slate-800 text-slate-300 rounded-lg flex items-center justify-center font-black text-lg">{o.umbrella_number}</div>
                            <p className="text-sm font-bold text-white uppercase">ΤΡΑΠΕΖΙ {o.umbrella_number}</p>
                        </div>
                        <div className="space-y-1 mb-4">
                            {o.items.map((item, idx) => (
                                <p key={idx} className="text-sm font-medium text-slate-400"><span className="font-black text-white">{item.quantity}x</span> {item.uniqueName}</p>
                            ))}
                        </div>
                        <button onClick={() => updateOrderStatus(o, 'preparing')} className="w-full bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all border border-slate-700">
                            ΑΠΟΔΟΧΗ (ΣΤΕΙΛΕ ΣΤΟ ΜΠΑΡ)
                        </button>
                    </div>
                ))}
            </>
        )}

        {/* TAB 2: BAR / ΚΟΥΖΙΝΑ (ΑΥΤΑ ΠΟΥ ΕΤΟΙΜΑΖΟΝΤΑΙ) */}
        {activeTab === 'preparing' && (
            <>
                {preparingOrders.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 mt-20">
                        <Coffee size={64} className="mb-4" />
                        <p className="font-black uppercase tracking-widest text-center">ΤΟ ΜΠΑΡ ΕΙΝΑΙ ΑΔΕΙΟ</p>
                    </div>
                )}
                
                {preparingOrders.map(o => (
                    <div key={o.id} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 opacity-80 grayscale-[30%]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">ΕΤΟΙΜΑΖΕΤΑΙ ΣΤΟ ΜΠΑΡ</span>
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock size={10}/> {getWaitTime(o.created_at)}'</span>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-950 text-amber-500 border border-amber-500/30 rounded-lg flex items-center justify-center font-black text-lg">{o.umbrella_number}</div>
                            <div className="space-y-1 flex-1">
                                {o.items.map((item, idx) => (
                                    <p key={idx} className="text-xs font-medium text-slate-300"><span className="font-black text-amber-500">{item.quantity}x</span> {item.uniqueName}</p>
                                ))}
                            </div>
                        </div>
                        {/* Κουμπί παράκαμψης σε περίπτωση που ο σερβιτόρος είναι και barista */}
                        <button onClick={() => updateOrderStatus(o, 'shipped')} className="w-full bg-transparent border border-amber-500/50 text-amber-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                            ΕΤΟΙΜΑΣΤΗΚΕ (ΧΕΙΡΟΚΙΝΗΤΑ)
                        </button>
                    </div>
                ))}
            </>
        )}
      </main>
    </div>
  );
}