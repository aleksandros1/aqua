"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase'; 
import { 
  ShoppingBag, ChevronLeft, Plus, Coffee, Umbrella, MapPin, 
  BellRing, CreditCard, Banknote, Smartphone, SplitSquareHorizontal, 
  Gift, X, RotateCcw, Zap, Timer, CheckCircle2, WifiOff, RefreshCw, Hand, Info, ScanLine, Camera
} from 'lucide-react';

type MenuItem = { id: number; name: string; price: number; category: string; description?: string; is_available: boolean; options?: string; store_id: string; };
type CartItem = MenuItem & { cartId: number; uniqueName: string; quantity: number; };
type UmbrellaType = { id: number; number: string; store_id: string; };
type StoreDetails = { id: string; name: string; slug: string; primary_color: string; bg_color: string; category_prefs: any[]; store_type: string; };

const FancyBackground = ({ themeColor }: { themeColor: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    let particlesArray: any[] = []; let w = canvas.width = window.innerWidth; let h = canvas.height = window.innerHeight;
    const mouse = { x: w / 2, y: h / 2, radius: 150 };
    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
    window.addEventListener('touchmove', (e) => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; });
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; init(); });
    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number;
      constructor() { this.x = Math.random() * w; this.y = Math.random() * h; this.size = Math.random() * 2 + 0.5; this.speedX = Math.random() * 2 - 1; this.speedY = Math.random() * 2 - 1; }
      update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > w || this.x < 0) this.speedX = -this.speedX; if (this.y > h || this.y < 0) this.speedY = -this.speedY;
        let dx = mouse.x - this.x; let dy = mouse.y - this.y; let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) { const forceDirectionX = dx / distance; const forceDirectionY = dy / distance; const force = (mouse.radius - distance) / mouse.radius; this.x -= forceDirectionX * force * 3; this.y -= forceDirectionY * force * 3; }
      }
      draw() { if (!ctx) return; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = themeColor; ctx.fill(); }
    }
    function init() { particlesArray = []; const numberOfParticles = (h * w) / 8000; for (let i = 0; i < numberOfParticles; i++) particlesArray.push(new Particle()); }
    function animate() {
      if (!ctx) return; ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update(); particlesArray[i].draw();
        for (let j = i; j < particlesArray.length; j++) {
          const dx = particlesArray[i].x - particlesArray[j].x; const dy = particlesArray[i].y - particlesArray[j].y; const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) { ctx.beginPath(); ctx.strokeStyle = `${themeColor}${Math.floor((1 - dist/100) * 100).toString(16).padStart(2, '0')}`; ctx.lineWidth = 0.5; ctx.moveTo(particlesArray[i].x, particlesArray[i].y); ctx.lineTo(particlesArray[j].x, particlesArray[j].y); ctx.stroke(); }
        }
      }
      requestAnimationFrame(animate);
    }
    init(); animate();
  }, [themeColor]);
  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-auto mix-blend-screen opacity-60" />;
};

const PremiumStyles = ({ themeColor, textColorHex }: { themeColor: string, textColorHex: string }) => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
    body { font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
    .playfair { font-family: 'Playfair Display', serif; }
    @keyframes neon-breathe { 0%, 100% { filter: drop-shadow(0 0 2px ${themeColor}); transform: scale(1); } 50% { filter: drop-shadow(0 0 12px ${themeColor}) brightness(1.3); transform: scale(1.05); } }
    .neon-text { background: linear-gradient(to right, ${textColorHex} 20%, ${themeColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding-right: 2px; }
    .neon-dot { -webkit-text-fill-color: ${themeColor}; color: ${themeColor}; animation: neon-breathe 3s ease-in-out infinite; display: inline-block; }
    .ios-glass { background: rgba(255, 255, 255, 0.45) !important; backdrop-filter: blur(40px) saturate(150%) !important; -webkit-backdrop-filter: blur(40px) saturate(150%) !important; border: 1px solid rgba(255, 255, 255, 0.5) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.2) !important; }
    .ios-glass-dark { background: rgba(30, 30, 30, 0.55) !important; backdrop-filter: blur(50px) saturate(200%) !important; -webkit-backdrop-filter: blur(50px) saturate(200%) !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05) !important; }
    .flash-btn { user-select: none; -webkit-touch-callout: none; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}} />
);

export default function CustomerPage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [umbrellas, setUmbrellas] = useState<UmbrellaType[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [umbrellaNumber, setUmbrellaNumber] = useState<string | null>(null);
  
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [totalOwed, setTotalOwed] = useState(0);

  const [isGiftMode, setIsGiftMode] = useState(false);
  const [targetUmbrella, setTargetUmbrella] = useState('');

  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [lastOrder, setLastOrder] = useState<CartItem[] | null>(null);

  const [selectedProductForOptions, setSelectedProductForOptions] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);
  const [isServedVisible, setIsServedVisible] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const [toast, setToast] = useState<{ title: string; desc: string; icon: React.ReactNode; color: string } | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const triggerHaptic = (pattern: number | number[] = 30) => { if (typeof window !== 'undefined' && navigator && navigator.vibrate) navigator.vibrate(pattern); };

  const showToast = (title: string, desc: string, type: 'success' | 'alert' | 'gift' | 'flash' = 'success') => {
      let icon = <CheckCircle2 size={24} />; let color = 'bg-emerald-500';
      if (type === 'gift') { icon = <Gift size={24} />; color = 'bg-purple-600'; }
      if (type === 'alert') { icon = <BellRing size={24} />; color = 'bg-cyan-600'; }
      if (type === 'flash') { icon = <Zap size={24} />; color = 'bg-amber-500 text-slate-900'; }
      setToast({ title, desc, icon, color }); setTimeout(() => setToast(null), 4000); 
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const store = params.get('store')?.trim(); const umbrella = params.get('umbrella')?.trim();
    if (store) setStoreSlug(store); if (umbrella) setUmbrellaNumber(umbrella);
    const savedOrder = localStorage.getItem('aqua_last_order');
    if (savedOrder) setLastOrder(JSON.parse(savedOrder));
    if (store) fetchStoreData(store);
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); syncOfflineData(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    if (navigator.onLine) syncOfflineData();
    setIsInitialized(true);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  async function fetchStoreData(slug: string) {
      try {
          const { data: storeData, error } = await supabase.from('stores').select('*').ilike('slug', slug).single();
          if (error) { setStoreSlug(null); return; }
          if (storeData) {
              setStoreDetails(storeData); fetchMenu(storeData.id); fetchUmbrellas(storeData.id);
              const menuSub = supabase.channel(`public:menu:${storeData.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu', filter: `store_id=eq.${storeData.id}` }, () => fetchMenu(storeData.id)).subscribe();
              const umbSub = supabase.channel(`public:umbrellas:${storeData.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'umbrellas', filter: `store_id=eq.${storeData.id}` }, () => fetchUmbrellas(storeData.id)).subscribe();
              const storeSub = supabase.channel(`public:stores:${storeData.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeData.id}` }, (payload) => setStoreDetails(payload.new as StoreDetails)).subscribe();
              return () => { supabase.removeChannel(menuSub); supabase.removeChannel(umbSub); supabase.removeChannel(storeSub); };
          } else setStoreSlug(null);
      } catch (err) { setStoreSlug(null); }
  }

  async function fetchActiveOrder(storeId: string) {
      if (!umbrellaNumber) return;
      const { data } = await supabase.from('orders').select('*').eq('umbrella_number', umbrellaNumber).eq('store_id', storeId).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) setActiveOrder(data[0]); else setActiveOrder(null);
  }

  useEffect(() => {
    if (umbrellaNumber && storeDetails) {
        const orderSub = supabase.channel(`my_table_status_${umbrellaNumber}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `umbrella_number=eq.${umbrellaNumber}` }, (payload) => {
             if (payload.eventType === 'DELETE') checkIfTableIsCleared(umbrellaNumber, storeDetails.id);
             else { setActiveOrder(payload.new); fetchMyBill(storeDetails.id); }
          }).subscribe();
        fetchMyBill(storeDetails.id); fetchActiveOrder(storeDetails.id); 
        return () => { supabase.removeChannel(orderSub); };
    }
  }, [umbrellaNumber, storeDetails]);

  useEffect(() => {
    let timer1: NodeJS.Timeout, timer2: NodeJS.Timeout;
    if (activeOrder && activeOrder.status === 'shipped') { 
        timer1 = setTimeout(() => { setIsServedVisible(true); timer2 = setTimeout(() => { setActiveOrder(null); setIsServedVisible(false); }, 10000); }, 60000); 
    } else setIsServedVisible(false);
    return () => { if (timer1) clearTimeout(timer1); if (timer2) clearTimeout(timer2); };
  }, [activeOrder?.status]);

  async function fetchUmbrellas(storeId: string) { const { data } = await supabase.from('umbrellas').select('id, number').eq('store_id', storeId); if (data) setUmbrellas((data as UmbrellaType[]).sort((a, b) => parseInt(a.number) - parseInt(b.number))); }
  async function checkIfTableIsCleared(uNum: string, storeId: string) {
    const { data } = await supabase.from('orders').select('id').eq('umbrella_number', uNum).eq('store_id', storeId);
    if (!data || data.length === 0) { setActiveOrder(null); setTotalOwed(0); setCart([]); setLastOrder(null); localStorage.removeItem('aqua_last_order'); setIsServiceOpen(false); setIsCheckoutOpen(false); setIsRepeatModalOpen(false); setIsServedVisible(false); setActiveCategory(null); } else fetchMyBill(storeId);
  }
  async function fetchMenu(storeId: string) { const { data } = await supabase.from('menu').select('*').eq('store_id', storeId).order('name'); if (data) setMenu(data as MenuItem[]); }
  async function fetchMyBill(storeId: string) { const { data } = await supabase.from('orders').select('total_price').eq('umbrella_number', umbrellaNumber).eq('store_id', storeId); if (data) setTotalOwed(data.reduce((acc, order) => acc + order.total_price, 0)); }

  const submitOrder = async (itemsToSubmit: CartItem[] = cart) => {
    triggerHaptic([30, 50, 30]);
    if (itemsToSubmit.length === 0 || !umbrellaNumber || !storeDetails) return;
    const totalPrice = itemsToSubmit.reduce((s, i) => s + (i.price * i.quantity), 0);
    const orderPayload = { store_id: storeDetails.id, umbrella_number: isGiftMode ? targetUmbrella : umbrellaNumber, items: itemsToSubmit, total_price: totalPrice, status: 'new', is_gift: isGiftMode, from_umbrella: isGiftMode ? umbrellaNumber : null, to_umbrella: isGiftMode ? targetUmbrella : null };

    if (!isOnline) {
        localStorage.setItem('aqua_pending_order', JSON.stringify(orderPayload));
        if (!isGiftMode) { localStorage.setItem('aqua_last_order', JSON.stringify(itemsToSubmit)); setLastOrder(itemsToSubmit); }
        setCart([]); setIsCheckoutOpen(false); setIsGiftMode(false); setTargetUmbrella(''); setIsRepeatModalOpen(false); showToast("Εκτός Σύνδεσης", "Αποθηκεύτηκε.", "alert"); return;
    }
    const { error } = await supabase.from('orders').insert([orderPayload]);
    if (!error) {
      if (!isGiftMode) { localStorage.setItem('aqua_last_order', JSON.stringify(itemsToSubmit)); setLastOrder(itemsToSubmit); }
      if (isGiftMode) showToast("Το Κέρασμα Εστάλη!", `Ετοιμάζεται για το ${getTerm(storeDetails?.store_type).unit.toLowerCase()} ${targetUmbrella}.`, 'gift');
      else showToast("Επιτυχία!", "Η παραγγελία εστάλη.", 'success');
      setCart([]); setIsCheckoutOpen(false); setIsGiftMode(false); setTargetUmbrella(''); setIsRepeatModalOpen(false);
    } else showToast("Σφάλμα", "Η παραγγελία δεν εστάλη.", "alert");
  };

  const syncOfflineData = async () => {
      const pendingOrderStr = localStorage.getItem('aqua_pending_order');
      if (pendingOrderStr) { const pendingOrder = JSON.parse(pendingOrderStr); const { error } = await supabase.from('orders').insert([pendingOrder]); if (!error) { localStorage.removeItem('aqua_pending_order'); showToast("Συγχρονισμός", "Οι παραγγελίες εστάλησαν."); } }
      const pendingRequestStr = localStorage.getItem('aqua_pending_request');
      if (pendingRequestStr) { const pendingReq = JSON.parse(pendingRequestStr); const { error } = await supabase.from('service_requests').insert([pendingReq]); if (!error) localStorage.removeItem('aqua_pending_request'); }
  };

  const callWaiter = async (method: string, notes: string = '') => {
    triggerHaptic([50, 50, 50]);
    if (!umbrellaNumber || !storeDetails) return;
    const requestPayload = { store_id: storeDetails.id, umbrella_number: umbrellaNumber, request_type: 'payment', payment_method: method, notes: notes };
    if (!isOnline) { localStorage.setItem('aqua_pending_request', JSON.stringify(requestPayload)); setIsServiceOpen(false); showToast("Εκτός Σύνδεσης", "Θα σταλεί σύντομα.", "alert"); return; }
    const { error } = await supabase.from('service_requests').insert([requestPayload]);
    if (!error) { setIsServiceOpen(false); showToast("Ειδοποιήθηκε!", `Ο σερβιτόρος έρχεται.`, 'alert'); }
  };

  const removeFromCart = (cartId: number) => { triggerHaptic(20); setCart(prev => prev.filter(item => item.cartId !== cartId)); };
  
  const handleTouchStart = (product: MenuItem) => { if (product.is_available === false) return; triggerHaptic(10); touchTimer.current = setTimeout(() => { touchTimer.current = null; triggerHaptic([50, 100, 50]); submitFlashOrder(product); }, 500); };
  const handleTouchEnd = (product: MenuItem, e: React.TouchEvent | React.MouseEvent) => {
    if (product.is_available === false) { e.preventDefault(); return; } 
    if (touchTimer.current) { clearTimeout(touchTimer.current); touchTimer.current = null; triggerHaptic(30); if (product.options && product.options.trim() !== '') { setSelectedProductForOptions(product); setSelectedOptions([]); } else setCart([...cart, {...product, uniqueName: product.name, quantity: 1, cartId: Math.random()}]); } else { e.preventDefault(); }
  };

  const submitFlashOrder = async (product: MenuItem) => {
    if (product.options && product.options.trim() !== '') { setSelectedProductForOptions(product); showToast("Επιλογή", "Επιλέξτε προτιμήσεις για την άμεση παραγγελία", "alert"); return; }
    if (!umbrellaNumber || !storeDetails) return;
    const orderItem: CartItem = { ...product, uniqueName: product.name, quantity: 1, cartId: Math.random() };
    const orderPayload = { store_id: storeDetails.id, umbrella_number: isGiftMode ? targetUmbrella : umbrellaNumber, items: [orderItem], total_price: product.price, status: 'new', is_gift: isGiftMode, from_umbrella: isGiftMode ? umbrellaNumber : null, to_umbrella: isGiftMode ? targetUmbrella : null };
    const { error } = await supabase.from('orders').insert([orderPayload]);
    if (!error) { showToast("⚡ FLASH ORDER", "Εστάλη απευθείας στο Bar!", 'flash'); if (isGiftMode) { setIsGiftMode(false); setTargetUmbrella(''); } } else showToast("Σφάλμα Δικτύου", "Δοκιμάστε ξανά.", "alert");
  };

  const toggleOption = (opt: string) => { triggerHaptic(20); if (selectedOptions.includes(opt)) setSelectedOptions(prev => prev.filter(o => o !== opt)); else setSelectedOptions(prev => [...prev, opt]); };
  const confirmOptionAndAddToCart = () => { triggerHaptic(30); if (!selectedProductForOptions) return; const extras = selectedOptions.length > 0 ? ` (${selectedOptions.join(', ')})` : ''; setCart([...cart, { ...selectedProductForOptions, uniqueName: `${selectedProductForOptions.name}${extras}`, quantity: 1, cartId: Math.random() }]); setSelectedProductForOptions(null); setSelectedOptions([]); };

  const getGreeting = () => { const h = new Date().getHours(); if (h >= 5 && h < 12) return { main: "Καλημέρα", sub: "Ο πρωινός καφές ετοιμάζεται" }; if (h >= 12 && h < 17) return { main: "Καλό Μεσημέρι", sub: "Ώρα για ένα δροσερό σνακ" }; if (h >= 17 && h < 21) return { main: "Καλό Απόγευμα", sub: "Η ώρα του ηλιοβασιλέματος" }; return { main: "Καλησπέρα", sub: "Απολαύστε το βράδυ σας" }; };
  const getTerm = (type: string | undefined) => { switch(type) { case 'hotel': return { unit: 'Δωμάτιο', icon: <MapPin size={16}/> }; case 'restaurant': return { unit: 'Τραπέζι', icon: <MapPin size={16}/> }; case 'cafe': return { unit: 'Τραπέζι', icon: <MapPin size={16}/> }; default: return { unit: 'Ομπρέλα', icon: <MapPin size={16}/> }; } };

  if (!isInitialized) return <div className="fixed inset-0 bg-[#020617]"></div>;

  if (!storeSlug) {
      return (
        <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center overflow-hidden"><FancyBackground themeColor="#06b6d4" /><PremiumStyles themeColor="#06b6d4" textColorHex="#ffffff" />
           <div className="relative z-10 text-center px-6 flex flex-col items-center w-full max-w-sm animate-in zoom-in-95 duration-700"><div className="w-24 h-24 bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(6,182,212,0.2)]"><Zap size={48} className="text-cyan-400" /></div><h1 className="text-6xl font-black mb-2 tracking-wide uppercase drop-shadow-lg playfair neon-text">AQUA<span className="neon-dot">.</span></h1><p className="text-slate-400 mb-12 uppercase tracking-[0.3em] text-[10px] font-bold">Interactive Order System</p><div className="w-full space-y-4"><button onClick={() => { triggerHaptic(30); setShowQRModal(true); }} className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-cyan-500/20 bg-cyan-500 text-slate-950 hover:bg-cyan-400"><ScanLine size={20} /> ΣΚΑΝΑΡΕ ΚΩΔΙΚΟ (QR)</button></div></div>
           {showQRModal && ( <div className="fixed inset-0 z-50 flex items-end justify-center"><div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" onClick={() => { triggerHaptic(20); setShowQRModal(false); }}></div><div className={`w-full p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 flex flex-col items-center text-center ios-glass-dark`}><div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 text-white"><Camera size={28}/></div><h3 className="text-2xl font-black text-white mb-3 playfair">Άνοιξε την Κάμερα</h3><p className="text-slate-300 font-medium mb-8 text-sm leading-relaxed">Βγες από την εφαρμογή, άνοιξε την κάμερα του κινητού σου και στόχευσε το τετράγωνο σηματάκι (QR Code) στο τραπέζι σου!</p><button onClick={() => { triggerHaptic(20); setShowQRModal(false); }} className="bg-white/10 hover:bg-white/20 text-white w-full py-5 rounded-[1.5rem] font-bold uppercase tracking-widest text-xs transition-colors">Ενταξει, καταλαβα</button></div></div> )}
        </div>
      );
  }

  if (!storeDetails && storeSlug) return <div className="fixed inset-0 bg-[#020617] flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin"></div></div>;

  const categoriesInMenu = Array.from(new Set(menu.map(m => m.category)));
  const availableGiftUmbrellas = umbrellas.filter(u => u.number !== umbrellaNumber);
  
  const themeColor = storeDetails?.primary_color || '#06b6d4';
  const dynamicBgColor = storeDetails?.bg_color || '#020617'; 
  
  // COLOR CONTRAST LOGIC
  const getContrast = (hexcolor: string) => { if (!hexcolor) return 'dark'; hexcolor = hexcolor.replace("#", ""); if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(x => x + x).join(''); const r = parseInt(hexcolor.substring(0,2), 16), g = parseInt(hexcolor.substring(2,4), 16), b = parseInt(hexcolor.substring(4,6), 16); return ((r*299)+(g*587)+(b*114))/1000 >= 128 ? 'light' : 'dark'; };
  
  const isDarkTheme = getContrast(dynamicBgColor) === 'dark';
  const textColor = isDarkTheme ? 'text-white' : 'text-slate-900';
  const themeTextHex = isDarkTheme ? '#ffffff' : '#0f172a'; // For text on the background
  const glassClass = isDarkTheme ? 'ios-glass-dark' : 'ios-glass';

  // ⚡ THE FIX: Contrast text specifically for the colored buttons
  const isPrimaryDark = getContrast(themeColor) === 'dark';
  const buttonTextHex = isPrimaryDark ? '#ffffff' : '#0f172a'; // If theme color is black, this becomes white!

  const normalizeText = (text: string) => text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
  let rawPrefs = storeDetails?.category_prefs; let prefsArray: any[] = [];
  if (Array.isArray(rawPrefs)) prefsArray = rawPrefs; else if (typeof rawPrefs === 'string') { try { prefsArray = JSON.parse(rawPrefs); } catch (e) { prefsArray = []; } }
  const displayCategories = categoriesInMenu.map(catName => { const pref = prefsArray.find((p:any) => normalizeText(p.name) === normalizeText(catName)); return { name: catName, bg_color: pref?.bg_color || themeColor, text_color: pref?.text_color || '#ffffff', sort_order: pref?.sort_order ?? 999 }; }).sort((a, b) => a.sort_order - b.sort_order);

  const butler = getGreeting();
  const term = getTerm(storeDetails?.store_type);

  if (!umbrellaNumber && storeDetails) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: dynamicBgColor }}><FancyBackground themeColor={themeColor} /><PremiumStyles themeColor={themeColor} textColorHex={themeTextHex} />
         <div className="relative z-10 text-center px-6 flex flex-col items-center max-w-sm w-full animate-in zoom-in-95 duration-700"><div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 ${glassClass}`}><Coffee size={32} style={{ color: themeColor }} /></div><p className="uppercase tracking-[0.3em] text-[10px] font-black opacity-60 mb-2" style={{ color: textColor }}>{butler.main}</p><h1 className="text-5xl font-black mb-2 tracking-wide uppercase drop-shadow-2xl playfair neon-text truncate block max-w-xs">{storeDetails.name}<span className="neon-dot">.</span></h1><p className="mb-12 text-sm font-medium opacity-50" style={{ color: textColor }}>{butler.sub}</p><button onClick={() => { triggerHaptic(30); setShowQRModal(true); }} className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 shadow-xl" style={{ backgroundColor: themeColor, color: buttonTextHex }}><ScanLine size={18} /> ΣΚΑΝΑΡΕ ΤΟ QR ΣΟΥ</button></div>
         {showQRModal && ( <div className="fixed inset-0 z-50 flex items-end justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setShowQRModal(false); }}></div><div className={`w-full p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 flex flex-col items-center text-center ${glassClass}`}><div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 text-white"><Camera size={28}/></div><h3 className="text-2xl font-black text-white mb-3 playfair">Άνοιξε την Κάμερα</h3><p className="text-slate-300 font-medium mb-8 text-sm">Βγες από την εφαρμογή, άνοιξε την κάμερα του κινητού σου και στόχευσε το τετράγωνο σηματάκι (QR Code) στο τραπέζι σου!</p><button onClick={() => { triggerHaptic(20); setShowQRModal(false); }} className="bg-white/10 text-white w-full py-5 rounded-[1.5rem] font-bold uppercase tracking-widest text-xs hover:bg-white/20 transition-all">Ενταξει, καταλαβα</button></div></div> )}
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 w-full h-full flex flex-col overflow-hidden transition-colors duration-500 ${textColor}`} style={{ backgroundColor: dynamicBgColor }}>
      <div className="absolute top-0 left-0 w-full h-96 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at 50% -20%, ${themeColor}, transparent 70%)` }}></div>
      <PremiumStyles themeColor={themeColor} textColorHex={themeTextHex} />

      {toast && (
          <div className={`fixed top-4 left-4 right-4 z-[100] ${toast.color} text-white p-4 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300 backdrop-blur-xl border border-white/10`}><div className="shrink-0 mt-0.5">{toast.icon}</div><div><p className="font-black text-sm uppercase tracking-widest">{toast.title}</p><p className="text-xs font-medium opacity-90 mt-0.5">{toast.desc}</p></div></div>
      )}

      <div className="shrink-0 z-40 relative pt-4">
        {!isOnline && ( <div className="bg-red-500 text-white p-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-2"><WifiOff size={14} /> Εκτος Συνδεσης. Συνεχιστε!</div> )}
        
        {activeOrder && activeOrder.status !== 'completed' && (
          <div className="px-5 sm:px-6 pb-2">
            <div className={`p-5 rounded-[1.5rem] flex items-center gap-4 animate-in fade-in duration-300 transition-all border border-white/10 ${isServedVisible ? 'bg-emerald-500/90 text-white shadow-lg' : glassClass}`}>
                {isServedVisible ? <CheckCircle2 size={28} className="text-white animate-in zoom-in duration-300"/> : <div className="relative"><div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeColor, borderTopColor: 'transparent' }}></div><Coffee className="absolute inset-0 m-auto" size={18} style={{ color: themeColor }}/></div>}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mb-0.5" style={{ color: isServedVisible ? '#fff' : themeColor }}>ΕΞΕΛΙΞΗ</p>
                    <p className="text-sm font-bold uppercase tracking-tight">{isServedVisible ? 'ΣΕΡΒΙΡΙΣΤΗΚΕ!' : <>{activeOrder.status === 'new' && 'Λήφθηκε στο Bar...'}{activeOrder.status === 'preparing' && 'Ετοιμάζεται...'}{activeOrder.status === 'shipped' && 'Ετοιμάστηκε & Έρχεται!'}</>}</p>
                </div>
            </div>
          </div>
        )}

        <header className="px-5 sm:px-6 py-4 flex justify-between items-center relative z-20">
          <div className="flex-1 min-w-0 pr-4">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">{butler.main}</p>
              <h1 className="text-3xl font-black tracking-wide playfair italic drop-shadow-md neon-text inline-block truncate max-w-full">
                  {storeDetails ? storeDetails.name : 'AQUA'}<span className="neon-dot">.</span>
              </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
              {umbrellaNumber && ( <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${glassClass}`}>{term.icon}<span className="text-[10px] font-black uppercase tracking-[0.2em]">{umbrellaNumber}</span></div> )}
          </div>
        </header>

        {/* 🎁 STICKY GIFT BANNER (Persistent until canceled) */}
        {isGiftMode && targetUmbrella && (
            <div className="px-5 sm:px-6 mt-2 mb-4 animate-in fade-in zoom-in duration-300 relative z-30">
                <div className="bg-purple-600 text-white p-4 rounded-[1.5rem] shadow-[0_10px_30px_rgba(168,85,247,0.4)] flex justify-between items-center border border-purple-400">
                    <div className="flex items-center gap-3">
                        <Gift size={24} className="animate-pulse drop-shadow-md" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-90 mb-0.5">ΕΝΕΡΓΟ ΚΕΡΑΣΜΑ</p>
                            <p className="text-sm font-black uppercase tracking-widest">ΓΙΑ {term.unit} {targetUmbrella}</p>
                        </div>
                    </div>
                    <button onClick={() => { triggerHaptic(20); setIsGiftMode(false); setTargetUmbrella(''); }} className="bg-black/20 hover:bg-black/40 p-3 rounded-xl transition-colors active:scale-90"><X size={18} /></button>
                </div>
            </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto overscroll-y-none px-5 sm:px-6 pb-40 w-full max-w-lg mx-auto relative z-10">
        
        {/* =========================================================================
            ⚡ REVENUE ENGINE: REFINED CONTROL CENTER ⚡
            ========================================================================= */}
        {umbrellaNumber && !activeCategory && (
           <div className="space-y-4 mb-8 animate-in fade-in duration-300">
              
              <div className={`p-4 rounded-[2rem] border border-white/10 flex flex-col gap-4 ${glassClass}`}>
                  
                  {/* TOP ROW: STATUS & SERVICE */}
                  <div className="flex justify-between items-center px-1">
                      <div className="flex flex-col">
                          <span className="text-[8px] uppercase tracking-[0.3em] opacity-60 mb-1 font-black">ΛΟΓΑΡΙΑΣΜΟΣ</span>
                          <span className="text-2xl font-black tracking-tighter" style={{ color: totalOwed > 0 ? textColor : themeColor }}>{totalOwed > 0 ? `${totalOwed.toFixed(2)}€` : '0.00€'}</span>
                      </div>
                      <button onClick={() => { triggerHaptic(30); setIsServiceOpen(true); }} className="px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-transform active:scale-95 border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: textColor }}>
                          <BellRing size={16} style={{ color: themeColor }}/> ΚΛΗΣΗ / ΠΛΗΡΩΜΗ
                      </button>
                  </div>

                  {/* DIVIDER */}
                  <div className="w-full h-px bg-white/10"></div>

                  {/* BOTTOM ROW: REVENUE (THE MONEY MAKERS) */}
                  <div className="flex gap-3">
                      {/* ALWAYS SHOW IF LAST ORDER EXISTS */}
                      {lastOrder && lastOrder.length > 0 && (
                          <button onClick={() => { triggerHaptic(30); setIsRepeatModalOpen(true); }} className="flex-1 py-4 rounded-[1.2rem] font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.2)] border border-white/20" style={{ backgroundColor: themeColor, color: buttonTextHex }}>
                              <RotateCcw size={18}/> ΑΛΛΟ ΕΝΑ ΓΥΡΟ
                          </button>
                      )}
                      
                      <button onClick={() => { triggerHaptic(30); setIsGiftMode(true); }} className={`py-4 rounded-[1.2rem] font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 transition-transform active:scale-95 bg-purple-500/20 border border-purple-500/40 text-purple-500 backdrop-blur-xl ${(!lastOrder || lastOrder.length === 0) ? 'w-full' : 'flex-1'}`}>
                          <Gift size={18}/> ΚΕΡΑΣΜΑ
                      </button>
                  </div>
              </div>

              {/* CATEGORY GRID */}
              {menu.length === 0 && ( <div className="grid grid-cols-2 gap-4 animate-pulse"><div className={`col-span-2 h-40 rounded-[2rem] ${glassClass}`}></div><div className={`h-32 rounded-[2rem] ${glassClass}`}></div><div className={`h-32 rounded-[2rem] ${glassClass}`}></div></div> )}
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                {displayCategories.map((cat, idx) => (
                  <button key={cat.name} onClick={() => { triggerHaptic(30); setActiveCategory(cat.name); }} className={`relative overflow-hidden h-36 rounded-[2rem] flex flex-col items-center justify-center transition-transform active:scale-[0.98] group ${glassClass} ${idx === 0 ? 'col-span-2 h-44' : ''}`}>
                      <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700" style={{ background: `radial-gradient(circle at top left, ${cat.bg_color} 0%, transparent 80%)` }}></div>
                      <span className="font-black uppercase text-[12px] sm:text-[14px] tracking-[0.25em] z-10 drop-shadow-md px-4 text-center leading-snug" style={{ color: textColor }}>{cat.name}</span>
                      <div className="w-6 h-1 rounded-full mt-4 opacity-70 z-10 transition-all group-hover:w-12 shadow-lg" style={{ backgroundColor: cat.bg_color }}></div>
                  </button>
                ))}
              </div>
           </div>
        )}

        {/* ACTIVE CATEGORY PRODUCTS */}
        {activeCategory && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300 pt-2">
            <button onClick={() => { triggerHaptic(20); setActiveCategory(null); }} className="font-black text-[9px] uppercase mb-8 flex items-center gap-1 tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity" style={{ color: textColor }}><ChevronLeft size={16}/> ΕΠΙΣΤΡΟΦΗ</button>

            {menu.length === 0 && ( <div className="space-y-4 animate-pulse"><div className={`h-24 rounded-[1.5rem] ${glassClass}`}></div><div className={`h-24 rounded-[1.5rem] ${glassClass}`}></div></div> )}

            <div className="space-y-3">
              {menu.filter(p => p.category === activeCategory).map(product => {
                const isOut = product.is_available === false;
                return (
                <div key={product.id} className={`relative overflow-hidden flex justify-between items-center p-4 sm:p-5 rounded-[1.5rem] transition-all group border border-white/5 ${!isOut && 'hover:border-white/20'} ${glassClass} ${isOut ? 'opacity-60 grayscale' : ''}`}>
                    <div className="pl-1 pr-3 relative z-10 w-full min-w-0">
                        <h3 className={`font-bold text-sm sm:text-base leading-tight tracking-wide mb-1 truncate ${isOut ? 'text-slate-400' : ''}`} style={!isOut ? { color: textColor } : {}}>{product.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`font-black text-[13px] sm:text-[15px] ${isOut ? 'text-slate-500 line-through' : ''}`} style={!isOut ? { color: themeColor } : {}}>{Number(product.price).toFixed(2)}€</span>
                            {isOut && <span className="text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-[0.2em] bg-red-500/20 text-red-500 border border-red-500/30">SOLD OUT</span>}
                            {!isOut && product.options && product.options.trim() !== '' && ( <span className={`text-[7px] px-2.5 py-1 rounded-full font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-slate-400`}>MODS</span> )}
                            {!isOut && <span className="text-[7px] text-slate-400 opacity-50 font-black uppercase tracking-widest ml-auto hidden sm:block">HOLD TO FLASH</span>}
                        </div>
                    </div>
                    <button disabled={isOut || (isGiftMode && !targetUmbrella)} onTouchStart={() => !isOut && handleTouchStart(product)} onTouchEnd={(e) => !isOut && handleTouchEnd(product, e)} onMouseDown={() => !isOut && handleTouchStart(product)} onMouseUp={(e) => !isOut && handleTouchEnd(product, e)} onMouseLeave={() => { if(!isOut && touchTimer.current) { clearTimeout(touchTimer.current); touchTimer.current = null; } }} onContextMenu={(e) => e.preventDefault()} className={`flash-btn w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all border border-white/10 relative z-10 select-none bg-white/5 ${isOut ? 'opacity-40 cursor-not-allowed' : 'active:scale-90 hover:bg-white/10'}`} style={!isOut ? { color: themeColor } : { color: buttonTextHex }}>
                    {isOut ? <X size={20} className="pointer-events-none" /> : <Plus size={20} className="pointer-events-none drop-shadow-md" />}
                    </button>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 🎁 THE NEW GIFT MODAL (Appears instantly on click) */}
      {isGiftMode && !targetUmbrella && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setIsGiftMode(false); }}></div>
             <div className={`w-full max-w-lg p-6 sm:p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 ${glassClass} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-6"></div>
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30"><Gift size={28}/></div>
                    <h2 className="text-2xl font-black mb-1 playfair">Σε ποιο {term.unit.toLowerCase()};</h2>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-50`}>ΕΠΙΛΕΞΤΕ ΑΠΟ ΤΗ ΛΙΣΤΑ</p>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[40vh] overflow-y-auto p-1 mb-8 no-scrollbar pr-2">
                    {availableGiftUmbrellas.map(u => ( 
                        <button key={u.id} onClick={() => { triggerHaptic(20); setTargetUmbrella(u.number); }} className={`aspect-square rounded-[1.2rem] font-black text-lg transition-transform active:scale-90 flex items-center justify-center shadow-lg border border-white/20`} style={{ backgroundColor: themeColor, color: buttonTextHex }}>
                            {u.number}
                        </button> 
                    ))}
                </div>
                <button onClick={() => { triggerHaptic(20); setIsGiftMode(false); }} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 rounded-[1.2rem] hover:bg-white/10 transition-colors border border-white/5">ΑΚΥΡΩΣΗ</button>
             </div>
          </div>
      )}

      {/* PREMIUM MODALS */}
      {isServiceOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setIsServiceOpen(false); }}></div><div className={`w-full max-w-lg p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 ${glassClass} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}><div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8"></div><h2 className="text-2xl font-black mb-2 tracking-wide playfair">Εξόφληση Λογαριασμού</h2><p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-8 ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>ΠΩΣ ΕΠΙΘΥΜΕΙΤΕ ΝΑ ΠΛΗΡΩΣΕΤΕ;</p><p className="text-6xl font-black text-center mb-10 tracking-tighter" style={{ color: themeColor }}>{totalOwed.toFixed(2)}<span className="text-3xl opacity-50">€</span></p><div className="grid grid-cols-2 gap-4 mb-8"><button onClick={() => callWaiter('ΚΑΡΤΑ (POS)')} className={`p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${glassClass}`}><CreditCard size={28} style={{ color: themeColor }}/> <span className="font-black text-[9px] uppercase tracking-[0.2em]">ΚΑΡΤΑ</span></button><button onClick={() => callWaiter('ΜΕΤΡΗΤΑ')} className={`p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${glassClass}`}><Banknote size={28} className="text-emerald-400"/> <span className="font-black text-[9px] uppercase tracking-[0.2em]">ΜΕΤΡΗΤΑ</span></button><button onClick={() => callWaiter('APPLE PAY / GOOGLE PAY')} className={`p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${glassClass}`}><Smartphone size={28}/> <span className="font-black text-[9px] uppercase tracking-[0.2em]">APPLE PAY</span></button><button onClick={() => callWaiter('ΣΠΑΣΤΟ (Min 4€ Κάρτα)')} className={`p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${glassClass}`}><SplitSquareHorizontal size={24} className="text-amber-400"/><div className="text-center"><span className="font-black text-[9px] uppercase tracking-[0.2em] block">ΣΠΑΣΤΟ</span><span className="text-[7px] font-bold opacity-50 block leading-tight mt-1 uppercase">(ΜΙΣΑ ΚΑΡΤΑ - ΜΙΣΑ ΜΕΤΡΗΤΑ)</span></div></button><button onClick={() => callWaiter('ΚΛΗΣΗ ΣΕΡΒΙΤΟΡΟΥ')} className={`col-span-2 p-4 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 bg-white/5 border border-white/10 hover:bg-white/10`}><div className="text-center"><span className="font-black text-[9px] uppercase tracking-[0.2em] block">ΑΠΛΗ ΚΛΗΣΗ ΣΕΡΒΙΤΟΡΟΥ</span></div></button></div></div></div>
      )}

      {isRepeatModalOpen && lastOrder && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setIsRepeatModalOpen(false); }}></div><div className={`w-full max-w-lg p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 ${glassClass} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}><div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8"></div><h2 className="text-2xl font-black mb-2 tracking-wide playfair">Επανάληψη Γύρου;</h2><p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-8 opacity-50`}>ΕΠΙΛΕΞΤΕ ΠΡΟΙΟΝΤΑ</p><div className="space-y-4 mb-10 max-h-[40vh] overflow-y-auto no-scrollbar pr-2">{lastOrder.map((item, idx) => (<div key={idx} className={`flex justify-between items-center p-5 rounded-[1.5rem] bg-white/5 border border-white/10`}><div className="flex flex-col"><span className="font-bold text-sm tracking-wide mb-1">{item.uniqueName}</span><span className="text-xs font-black opacity-70" style={{ color: themeColor }}>{item.price.toFixed(2)}€</span></div><button onClick={() => { triggerHaptic(30); setCart(prev => [...prev, {...item, cartId: Math.random()}]); }} className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shadow-md active:scale-90 transition-all bg-white/10 border border-white/5`}><Plus size={20}/></button></div>))}</div><button onClick={() => { triggerHaptic(20); setIsRepeatModalOpen(false); }} className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all shadow-xl`} style={cart.length > 0 ? { backgroundColor: themeColor, color: buttonTextHex } : {}}>{cart.length > 0 ? 'ΣΥΝΕΧΕΙΑ ΣΤΟ ΚΑΛΑΘΙ' : 'ΚΛΕΙΣΙΜΟ'}</button></div></div>
      )}

      {selectedProductForOptions && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setSelectedProductForOptions(null); }}></div><div className={`w-full max-w-lg p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 ${glassClass} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}><div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8"></div><h2 className="text-2xl font-black mb-2 tracking-wide playfair">{selectedProductForOptions.name}</h2><p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-8 opacity-50`}>ΕΠΙΛΕΞΤΕ ΠΡΟΤΙΜΗΣΕΙΣ</p><div className="grid grid-cols-2 gap-4 mb-10 max-h-[40vh] overflow-y-auto no-scrollbar pr-1">{selectedProductForOptions.options?.split(',').map(opt => { const cleanOpt = opt.trim(); const isSelected = selectedOptions.includes(cleanOpt); return (<button key={cleanOpt} onClick={() => toggleOption(cleanOpt)} className={`p-4 rounded-[1.2rem] font-black text-[11px] tracking-wider transition-all border-2 ${isSelected ? 'scale-[1.02] shadow-[0_10px_30px_rgba(0,0,0,0.3)]' : 'bg-white/5 border-white/5 text-slate-300'}`} style={isSelected ? { backgroundColor: themeColor, borderColor: themeColor, color: buttonTextHex } : {}}>{cleanOpt}</button>)})}</div><button onClick={confirmOptionAndAddToCart} className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all ${selectedOptions.length > 0 ? 'animate-pulse' : ''}`} style={{ backgroundColor: themeColor, color: buttonTextHex }}>{selectedOptions.length > 0 ? 'ΕΠΙΒΕΒΑΙΩΣΗ' : 'ΠΡΟΣΘΗΚΗ ΩΣ ΕΧΕΙ'}</button></div></div>
      )}

      {cart.length > 0 && !isServiceOpen && !selectedProductForOptions && !isRepeatModalOpen && !isGiftMode && (
        <div className={`absolute bottom-8 left-6 right-6 sm:left-auto sm:right-auto sm:w-full sm:max-w-md mx-auto rounded-[2rem] p-4 pl-8 flex justify-between items-center z-50 animate-in slide-in-from-bottom-10 border border-white/20 shadow-2xl ${glassClass}`}><div className="font-black"><p className="text-[7px] uppercase mb-1 tracking-[0.4em] opacity-60" style={{ color: themeColor }}>ΣΥΝΟΛΟ</p><p className={`text-2xl tracking-tighter leading-none ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{cart.reduce((s,i) => s + (i.price*i.quantity), 0).toFixed(2)}€</p></div><button onClick={() => { triggerHaptic(30); setIsCheckoutOpen(true); }} className="px-8 py-4 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all tracking-[0.2em] shadow-lg" style={{ backgroundColor: themeColor, color: buttonTextHex }}>ΚΑΛΑΘΙ <span className="ml-1.5 bg-black/20 px-2 py-0.5 rounded-full">{cart.length}</span></button></div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setIsCheckoutOpen(false); }}></div><div className={`w-full max-w-lg p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 ${glassClass} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}><div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8"></div><h2 className="text-2xl font-black mb-2 tracking-wide playfair">{isGiftMode ? 'Κέρασμα' : 'Το Καλάθι'}</h2><p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-8 opacity-50`}>ΕΠΙΣΚΟΠΗΣΗ & ΑΠΟΣΤΟΛΗ</p>{isGiftMode && ( <div className="bg-purple-500/10 p-5 rounded-[1.5rem] mb-8 text-center border border-purple-500/20"><p className="text-[8px] font-black text-purple-400 uppercase tracking-[0.3em] mb-2">ΑΠΟΣΤΟΛΗ ΣΕ</p><p className="text-4xl font-black text-purple-400 playfair">{term.unit} {targetUmbrella}</p></div> )}<div className="space-y-4 mb-10 max-h-[35vh] overflow-y-auto no-scrollbar pr-2">{cart.map(item => (<div key={item.cartId} className={`flex justify-between items-center p-5 rounded-[1.5rem] bg-white/5 border border-white/5`}><div className="flex flex-col"><span className="font-bold text-sm tracking-wide mb-1">{item.uniqueName}</span><span className="text-xs font-black opacity-80" style={{ color: themeColor }}>{item.price.toFixed(2)}€</span></div><button onClick={() => removeFromCart(item.cartId)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all bg-white/5 border border-white/5 opacity-50 hover:opacity-100 hover:text-red-500`}><X size={18} /></button></div>))}<div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-3"><Info size={16} className="text-cyan-500 shrink-0 mt-0.5" /><p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest leading-relaxed">Tip: Εχετε προσθεσει ο,τι χρειαζεστε απο νερα η αναψυκτικα;</p></div></div><div className={`flex justify-between items-end mb-10 px-2 border-t pt-6 border-white/10`}><span className={`font-black uppercase tracking-[0.3em] text-[10px] opacity-50`}>ΣΥΝΟΛΙΚΗ ΑΞΙΑ</span><span className="text-4xl font-black tracking-tighter" style={{ color: themeColor }}>{cart.reduce((s,i) => s + (i.price*i.quantity), 0).toFixed(2)}<span className="text-2xl opacity-50">€</span></span></div><button onClick={() => submitOrder()} className="w-full py-5 rounded-[1.5rem] font-black tracking-[0.2em] text-[11px] shadow-xl active:scale-95 transition-all uppercase" style={{ backgroundColor: themeColor, color: buttonTextHex }}>ΑΠΟΣΤΟΛΗ ΠΑΡΑΓΓΕΛΙΑΣ</button></div></div>
      )}
    </div>
  );
}