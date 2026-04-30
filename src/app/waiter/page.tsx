"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle2, BellRing, Clock, AlertTriangle, 
  Map, List, Coffee, RefreshCw, LogOut, ArrowRight, Gift
} from 'lucide-react';

type Order = { id: number; created_at: string; umbrella_number: string; items: any[]; total_price: number; status: string; is_gift: boolean; from_umbrella: string; to_umbrella: string; };
type ServiceRequest = { id: number; umbrella_number: string; request_type: string; payment_method: string; status: string; created_at: string; };
type UmbrellaType = { id: number; number: string; x_pos: number; y_pos: number; is_available: boolean; };
type StoreDetails = { id: string; name: string; slug: string; primary_color: string; bg_color: string; };

export default function WaiterPage() {
  const [storeSlug, setStoreSlug] = useState('');
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'map'>('orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [umbrellas, setUmbrellas] = useState<UmbrellaType[]>([]);

  useEffect(() => {
    // Ψάχνουμε αν υπάρχει ήδη αποθηκευμένο μαγαζί στο κινητό του σερβιτόρου
    const savedSlug = localStorage.getItem('aqua_waiter_slug');
    if (savedSlug) {
      setStoreSlug(savedSlug);
      authenticateStore(savedSlug);
    }
  }, []);

  useEffect(() => {
    if (!store) return;
    
    // Live Subscriptions
    const ordersSub = supabase.channel(`waiter_orders_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` }, () => fetchOrders(store.id)).subscribe();
    const reqSub = supabase.channel(`waiter_reqs_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `store_id=eq.${store.id}` }, () => fetchRequests(store.id)).subscribe();
    const umbSub = supabase.channel(`waiter_umbs_${store.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'umbrellas', filter: `store_id=eq.${store.id}` }, () => fetchUmbrellas(store.id)).subscribe();

    return () => { supabase.removeChannel(ordersSub); supabase.removeChannel(reqSub); supabase.removeChannel(umbSub); };
  }, [store]);

  const authenticateStore = async (slug: string) => {
    if (!slug) return;
    const { data } = await supabase.from('stores').select('*').eq('slug', slug.toLowerCase().trim()).single();
    if (data) {
        setStore(data);
        localStorage.setItem('aqua_waiter_slug', data.slug);
        fetchOrders(data.id); fetchRequests(data.id); fetchUmbrellas(data.id);
    } else {
        alert('Το κατάστημα δεν βρέθηκε. Ελέγξτε το URL (slug).');
        localStorage.removeItem('aqua_waiter_slug');
    }
  };

  const fetchOrders = async (storeId: string) => {
    const { data } = await supabase.from('orders').select('*').eq('store_id', storeId).in('status', ['new', 'preparing', 'shipped']).order('created_at', { ascending: false });
    if (data) setOrders(data as Order[]);
  };

  const fetchRequests = async (storeId: string) => {
    const { data } = await supabase.from('service_requests').select('*').eq('store_id', storeId).eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setRequests(data as ServiceRequest[]);
  };

  const fetchUmbrellas = async (storeId: string) => {
    const { data } = await supabase.from('umbrellas').select('*').eq('store_id', storeId);
    if (data) setUmbrellas(data as UmbrellaType[]);
  };

  const updateOrderStatus = async (order: Order) => {
    if (!store) return;
    let newStatus = '';
    if (order.status === 'new') newStatus = 'preparing';
    else if (order.status === 'preparing') newStatus = 'shipped';
    else return;
    
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    fetchOrders(store.id);
  };

  const completeRequest = async (id: number) => {
    await supabase.from('service_requests').delete().eq('id', id);
    if (store) fetchRequests(store.id);
  };

  const toggleUmbrellaStatus = async (u: UmbrellaType) => {
    // Ο σερβιτόρος αλλάζει το status χειροκίνητα
    await supabase.from('umbrellas').update({ is_available: !u.is_available }).eq('id', u.id);
    if (store) fetchUmbrellas(store.id);
  };

  const handleLogout = () => {
      localStorage.removeItem('aqua_waiter_slug');
      setStore(null);
      setStoreSlug('');
  };

  const getWaitTime = (createdAt: string) => Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);

  // --- ΟΘΟΝΗ ΣΥΝΔΕΣΗΣ ΣΕΡΒΙΤΟΡΟΥ ---
  if (!store) {
    return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-200">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20"><Coffee size={32} className="text-slate-950" /></div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2 text-white">Aqua <span className="text-emerald-500">Service</span></h2>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs mb-8">Συνδεση Προσωπικου</p>
            </div>
            <div className="bg-slate-900 py-8 px-6 shadow sm:rounded-3xl border border-slate-800 w-full max-w-sm mx-auto">
                <input placeholder="Κωδικός Καταστήματος (Slug)" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500 transition-all font-bold mb-4 text-center lowercase" value={storeSlug} onChange={e => setStoreSlug(e.target.value)} />
                <button onClick={() => authenticateStore(storeSlug)} className="w-full bg-emerald-500 text-slate-950 p-4 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                    ΕΙΣΟΔΟΣ
                </button>
            </div>
        </div>
    );
  }

  // --- ΚΥΡΙΩΣ ΟΘΟΝΗ ΣΕΡΒΙΤΟΡΟΥ ---
  const activeUmbrellas = Array.from(new Set([...orders.map(o => o.umbrella_number), ...requests.map(r => r.umbrella_number)])).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="shrink-0 p-4 border-b border-slate-800 flex justify-between items-center z-50 bg-slate-900 shadow-md">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-emerald-500 shrink-0"><Coffee size={20} className="text-slate-950" /></div>
                <div className="min-w-0">
                    <h1 className="text-xl font-black tracking-tighter text-white uppercase italic truncate">{store.name}</h1>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] truncate">WAITER PANEL</p>
                </div>
            </div>
            <button onClick={handleLogout} className="bg-slate-800 text-slate-400 p-2.5 rounded-lg hover:text-white transition-colors border border-slate-700 active:scale-95"><LogOut size={18}/></button>
        </header>

        {/* TABS */}
        <div className="shrink-0 flex gap-2 p-4 bg-slate-950 border-b border-slate-800">
            <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'orders' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                <List size={16}/> ΡΟΗ ΕΡΓΑΣΙΑΣ {orders.length > 0 && <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] ml-1">{orders.length}</span>}
            </button>
            <button onClick={() => setActiveTab('map')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'map' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                <Map size={16}/> ΧΑΡΤΗΣ
            </button>
        </div>

        {/* ΠΕΡΙΕΧΟΜΕΝΟ */}
        <main className="flex-1 overflow-y-auto overscroll-y-none p-4">
            
            {/* ΚΑΡΤΕΛΑ: ΡΟΗ ΕΡΓΑΣΙΑΣ */}
            {activeTab === 'orders' && (
                <div className="space-y-4 pb-20 animate-in fade-in duration-300">
                    {activeUmbrellas.length === 0 && (
                        <div className="text-center py-20 opacity-50 flex flex-col items-center">
                            <Coffee size={48} className="mb-4 text-slate-600"/>
                            <p className="text-sm font-black uppercase tracking-widest">Ολα Ηρεμα. Καμια Παραγγελια.</p>
                        </div>
                    )}
                    {activeUmbrellas.map(uNum => {
                        const tableOrders = orders.filter(o => o.umbrella_number === uNum);
                        const tableRequests = requests.filter(r => r.umbrella_number === uNum);
                        
                        return (
                            <div key={uNum} className="rounded-2xl border-2 border-slate-800 overflow-hidden bg-slate-900 shadow-lg">
                                <div className="p-3 flex items-center gap-3 bg-slate-800/80 border-b border-slate-800">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl bg-slate-700 text-white">{uNum}</div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Target {uNum}</h2>
                                </div>
                                <div className="p-3 space-y-3">
                                    {tableRequests.map(r => (
                                        <div key={r.id} className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex justify-between items-center animate-pulse">
                                            <div>
                                                <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-0.5 flex items-center gap-1"><AlertTriangle size={12}/> {r.request_type}</p>
                                                <p className="text-sm text-white font-bold uppercase">ΜΕ {r.payment_method}</p>
                                            </div>
                                            <button onClick={() => completeRequest(r.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg font-black text-xs uppercase shadow-md active:scale-95">ΟΚ</button>
                                        </div>
                                    ))}
                                    {tableOrders.map(o => {
                                        const isNew = o.status === 'new';
                                        const isPreparing = o.status === 'preparing';
                                        const waitMins = getWaitTime(o.created_at);
                                        const statusColor = isNew ? 'bg-red-500' : isPreparing ? 'bg-amber-500' : 'bg-emerald-500';

                                        return (
                                        <div key={o.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950 relative overflow-hidden">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor}`}></div>
                                            <div className="flex justify-between items-start mb-2 pl-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${statusColor} text-white`}>
                                                        {isNew ? 'ΝΕΑ' : isPreparing ? 'ΕΤΟΙΜΑΖΕΤΑΙ' : 'ΣΕΡΒΙΡΙΣΤΗΚΕ'}
                                                    </span>
                                                    <span className={`text-[10px] font-bold flex items-center gap-1 text-slate-400`}><Clock size={10}/> {waitMins}'</span>
                                                </div>
                                            </div>
                                            {o.is_gift && (
                                                <div className="ml-2 mb-2 bg-purple-900/40 p-1.5 rounded text-[9px] font-black uppercase tracking-widest text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
                                                    <Gift size={10}/> ΑΠΟ {o.from_umbrella} <ArrowRight size={8}/> ΣΕ {o.to_umbrella}
                                                </div>
                                            )}
                                            <div className="space-y-1 mb-3 pl-2">
                                                {o.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 text-sm font-medium text-slate-200">
                                                        <span className="font-black text-emerald-400">{item.quantity}x</span> 
                                                        <span className="leading-tight">{item.uniqueName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => updateOrderStatus(o)} className={`w-full py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${isNew ? 'bg-red-500/10 text-red-400 border border-red-500/50' : isPreparing ? 'bg-amber-500 text-slate-900 shadow-md' : 'bg-slate-800 text-slate-500 pointer-events-none'}`}>
                                                {isNew ? 'ΑΝΑΘΕΣΗ ΓΙΑ ΕΤΟΙΜΑΣΙΑ' : isPreparing ? 'ΣΕΡΒΙΡΙΣΜΑ (ΟΛΟΚΛΗΡΩΣΗ)' : 'ΟΛΟΚΛΗΡΩΘΗΚΕ'}
                                            </button>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ΚΑΡΤΕΛΑ: ΧΑΡΤΗΣ (ΧΩΡΟΤΑΞΙΑ) */}
            {activeTab === 'map' && (
                <div className="animate-in fade-in duration-300 pb-20">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">Πατησε μια ομπρελα για να αλλαξεις τη διαθεσιμοτητα της</p>
                    
                    {/* Υπόμνημα */}
                    <div className="flex justify-center gap-4 mb-6">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400"><div className="w-3 h-3 rounded-full bg-slate-800 border-2 border-emerald-500"></div> Ελευθερη</div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400"><div className="w-3 h-3 rounded-full bg-slate-900 border-2 border-slate-700"></div> Πιασμενη</div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Εχει Παραγγελια</div>
                    </div>

                    <div className="relative w-full h-[600px] bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-inner touch-pan-x touch-pan-y" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        {umbrellas.map(u => {
                            const hasOrder = orders.some(o => o.umbrella_number === u.number);
                            const hasReq = requests.find(r => r.umbrella_number === u.number);
                            
                            // Οπτική Λογική Κατάστασης (Χρώματα)
                            let stateClass = "";
                            let stateText = "";

                            if (hasReq) {
                                stateClass = "bg-red-500 border-red-400 text-white animate-pulse z-30 shadow-[0_0_20px_rgba(239,68,68,0.5)]";
                                stateText = "SERVICE!";
                            } else if (hasOrder) {
                                stateClass = "bg-amber-500 border-amber-400 text-amber-950 z-20 shadow-[0_0_20px_rgba(245,158,11,0.3)]";
                                stateText = "ORDER";
                            } else if (u.is_available) {
                                stateClass = "bg-slate-800/50 border-emerald-500/50 text-emerald-400 z-10";
                                stateText = "FREE";
                            } else {
                                stateClass = "bg-slate-900 border-slate-700 text-slate-600 z-10";
                                stateText = "ΠΙΑΣΜΕΝΗ";
                            }

                            return (
                                <button 
                                    key={u.id} 
                                    onClick={() => toggleUmbrellaStatus(u)}
                                    className={`absolute w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300 shadow-md active:scale-90 ${stateClass}`} 
                                    style={{ left: `${u.x_pos}px`, top: `${u.y_pos}px` }}
                                >
                                    <span className="text-xl font-black tracking-tighter">{u.number}</span>
                                    <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">{stateText}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}