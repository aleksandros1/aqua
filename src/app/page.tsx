"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase'; 
import { 
  ShoppingBag, ChevronLeft, Plus, Coffee, Umbrella, MapPin, 
  BellRing, CreditCard, Banknote, Smartphone, SplitSquareHorizontal, 
  Gift, X, RotateCcw, Zap, Timer, CheckCircle2, WifiOff, RefreshCw, Hand, Info, ScanLine, Camera, Map
} from 'lucide-react';

type MenuItem = { id: number; name: string; price: number; category: string; description?: string; is_available: boolean; options?: string; store_id: string; };
type CartItem = MenuItem & { cartId: number; uniqueName: string; quantity: number; };
type UmbrellaType = { id: number; number: string; store_id: string; };
type StoreDetails = { id: string; name: string; slug: string; primary_color: string; bg_color: string; category_prefs: any[]; };

const FancyBackground = ({ themeColor }: { themeColor: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particlesArray: any[] = [];
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const mouse = { x: w / 2, y: h / 2, radius: 150 };

    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
    window.addEventListener('touchmove', (e) => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; });
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; init(); });

    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number;
      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
      }
      update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > w || this.x < 0) this.speedX = -this.speedX;
        if (this.y > h || this.y < 0) this.speedY = -this.speedY;
        let dx = mouse.x - this.x; let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance; const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;
          this.x -= forceDirectionX * force * 3; this.y -= forceDirectionY * force * 3;
        }
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = themeColor; ctx.fill();
      }
    }
    function init() {
      particlesArray = []; const numberOfParticles = (h * w) / 8000;
      for (let i = 0; i < numberOfParticles; i++) particlesArray.push(new Particle());
    }
    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update(); particlesArray[i].draw();
        for (let j = i; j < particlesArray.length; j++) {
          const dx = particlesArray[i].x - particlesArray[j].x; const dy = particlesArray[i].y - particlesArray[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `${themeColor}${Math.floor((1 - dist/100) * 100).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 0.5; ctx.moveTo(particlesArray[i].x, particlesArray[i].y); ctx.lineTo(particlesArray[j].x, particlesArray[j].y); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    init(); animate();
  }, [themeColor]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-auto mix-blend-screen opacity-60" />;
};


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

  const showToast = (title: string, desc: string, type: 'success' | 'alert' | 'gift' = 'success') => {
      let icon = <CheckCircle2 size={24} />; let color = 'bg-emerald-500';
      if (type === 'gift') { icon = <Gift size={24} />; color = 'bg-purple-600'; }
      if (type === 'alert') { icon = <BellRing size={24} />; color = 'bg-cyan-600'; }
      setToast({ title, desc, icon, color }); setTimeout(() => setToast(null), 4000); 
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const store = params.get('store'); const umbrella = params.get('umbrella');
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
      const { data: storeData } = await supabase.from('stores').select('*').eq('slug', slug).single();
      if (storeData) {
          setStoreDetails(storeData); fetchMenu(storeData.id); fetchUmbrellas(storeData.id);
          const menuSub = supabase.channel(`public:menu:${storeData.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu', filter: `store_id=eq.${storeData.id}` }, () => fetchMenu(storeData.id)).subscribe();
          const umbSub = supabase.channel(`public:umbrellas:${storeData.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'umbrellas', filter: `store_id=eq.${storeData.id}` }, () => fetchUmbrellas(storeData.id)).subscribe();
          const storeSub = supabase.channel(`public:stores:${storeData.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeData.id}` }, (payload) => setStoreDetails(payload.new as StoreDetails)).subscribe();
          return () => { supabase.removeChannel(menuSub); supabase.removeChannel(umbSub); supabase.removeChannel(storeSub); };
      }
  }

  useEffect(() => {
    if (umbrellaNumber && storeDetails) {
        const orderSub = supabase.channel(`my_table_status_${umbrellaNumber}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `umbrella_number=eq.${umbrellaNumber}` }, (payload) => {
             if (payload.eventType === 'DELETE') checkIfTableIsCleared(umbrellaNumber, storeDetails.id);
             else { setActiveOrder(payload.new); fetchMyBill(storeDetails.id); }
          }).subscribe();
        fetchMyBill(storeDetails.id);
        return () => { supabase.removeChannel(orderSub); };
    }
  }, [umbrellaNumber, storeDetails]);

  useEffect(() => {
    let timer1: NodeJS.Timeout, timer2: NodeJS.Timeout;
    if (activeOrder && activeOrder.status === 'shipped') {
        timer1 = setTimeout(() => { setIsServedVisible(true); timer2 = setTimeout(() => { setActiveOrder(null); setIsServedVisible(false); }, 10000); }, 180000);
    } else setIsServedVisible(false);
    return () => { if (timer1) clearTimeout(timer1); if (timer2) clearTimeout(timer2); };
  }, [activeOrder?.status]);

  async function fetchUmbrellas(storeId: string) {
    const { data } = await supabase.from('umbrellas').select('id, number').eq('store_id', storeId);
    if (data) setUmbrellas((data as UmbrellaType[]).sort((a, b) => parseInt(a.number) - parseInt(b.number)));
  }

  async function checkIfTableIsCleared(uNum: string, storeId: string) {
    const { data } = await supabase.from('orders').select('id').eq('umbrella_number', uNum).eq('store_id', storeId);
    if (!data || data.length === 0) {
        setActiveOrder(null); setTotalOwed(0); setCart([]); setLastOrder(null);
        localStorage.removeItem('aqua_last_order'); setIsServiceOpen(false); setIsCheckoutOpen(false); setIsRepeatModalOpen(false); setIsServedVisible(false); setActiveCategory(null);
    } else fetchMyBill(storeId);
  }

  async function fetchMenu(storeId: string) {
    const { data } = await supabase.from('menu').select('*').eq('store_id', storeId).order('name');
    if (data) setMenu(data as MenuItem[]);
  }

  async function fetchMyBill(storeId: string) {
    if (!umbrellaNumber) return;
    const { data } = await supabase.from('orders').select('total_price').eq('umbrella_number', umbrellaNumber).eq('store_id', storeId);
    if (data) setTotalOwed(data.reduce((acc, order) => acc + order.total_price, 0));
  }

  const submitOrder = async (itemsToSubmit: CartItem[] = cart) => {
    if (itemsToSubmit.length === 0 || !umbrellaNumber || !storeDetails) return;
    const totalPrice = itemsToSubmit.reduce((s, i) => s + (i.price * i.quantity), 0);
    const orderPayload = { store_id: storeDetails.id, umbrella_number: isGiftMode ? targetUmbrella : umbrellaNumber, items: itemsToSubmit, total_price: totalPrice, status: 'new', is_gift: isGiftMode, from_umbrella: isGiftMode ? umbrellaNumber : null, to_umbrella: isGiftMode ? targetUmbrella : null };

    if (!isOnline) {
        localStorage.setItem('aqua_pending_order', JSON.stringify(orderPayload));
        if (!isGiftMode) { localStorage.setItem('aqua_last_order', JSON.stringify(itemsToSubmit)); setLastOrder(itemsToSubmit); }
        setCart([]); setIsCheckoutOpen(false); setIsGiftMode(false); setTargetUmbrella(''); setIsRepeatModalOpen(false);
        showToast("Εκτός Σύνδεσης", "Αποθηκεύτηκε στο κινητό. Θα σταλεί μόλις βρεθεί σήμα.", "alert");
        return;
    }

    const { error } = await supabase.from('orders').insert([orderPayload]);
    if (!error) {
      if (!isGiftMode) { localStorage.setItem('aqua_last_order', JSON.stringify(itemsToSubmit)); setLastOrder(itemsToSubmit); }
      if (isGiftMode) showToast("Το Κέρασμα Εστάλη!", `Ο Barista το ετοιμάζει για το τραπέζι ${targetUmbrella}.`, 'gift');
      else showToast("Η Παραγγελία Εστάλη!", "Το προσωπικό έλαβε την παραγγελία σας.", 'success');
      setCart([]); setIsCheckoutOpen(false); setIsGiftMode(false); setTargetUmbrella(''); setIsRepeatModalOpen(false);
    } else showToast("Σφάλμα Δικτύου", "Η παραγγελία δεν εστάλη. Προσπαθήστε ξανά.", "alert");
  };

  const syncOfflineData = async () => {
      const pendingOrderStr = localStorage.getItem('aqua_pending_order');
      if (pendingOrderStr) {
          const pendingOrder = JSON.parse(pendingOrderStr);
          const { error } = await supabase.from('orders').insert([pendingOrder]);
          if (!error) { localStorage.removeItem('aqua_pending_order'); showToast("Συγχρονισμός Επιτυχής", "Οι εκκρεμείς παραγγελίες σας εστάλησαν."); }
      }
      const pendingRequestStr = localStorage.getItem('aqua_pending_request');
      if (pendingRequestStr) {
          const pendingReq = JSON.parse(pendingRequestStr);
          const { error } = await supabase.from('service_requests').insert([pendingReq]);
          if (!error) localStorage.removeItem('aqua_pending_request');
      }
  };

  const callWaiter = async (method: string, notes: string = '') => {
    if (!umbrellaNumber || !storeDetails) return;
    const requestPayload = { store_id: storeDetails.id, umbrella_number: umbrellaNumber, request_type: 'payment', payment_method: method, notes: notes };

    if (!isOnline) {
        localStorage.setItem('aqua_pending_request', JSON.stringify(requestPayload));
        setIsServiceOpen(false); showToast("Εκτός Σύνδεσης", "Η ειδοποίηση θα σταλεί μόλις επανέλθει το δίκτυο.", "alert");
        return;
    }
    const { error } = await supabase.from('service_requests').insert([requestPayload]);
    if (!error) { setIsServiceOpen(false); showToast("Ο Σερβιτόρος Ειδοποιήθηκε", method === 'ΚΛΗΣΗ (ΑΠΛΗ)' ? "Έρχεται στο τραπέζι σας." : `Έρχεται με το λογαριασμό (${method}).`, 'alert'); }
  };

  const removeFromCart = (cartId: number) => setCart(prev => prev.filter(item => item.cartId !== cartId));
  const handleAddToCartClick = (product: MenuItem) => {
    if (product.options && product.options.trim() !== '') { setSelectedProductForOptions(product); setSelectedOptions([]); } 
    else setCart([...cart, {...product, uniqueName: product.name, quantity: 1, cartId: Math.random()}]);
  };
  const toggleOption = (opt: string) => {
    if (selectedOptions.includes(opt)) setSelectedOptions(prev => prev.filter(o => o !== opt));
    else setSelectedOptions(prev => [...prev, opt]);
  };
  const confirmOptionAndAddToCart = () => {
    if (!selectedProductForOptions) return;
    const extras = selectedOptions.length > 0 ? ` (${selectedOptions.join(', ')})` : '';
    setCart([...cart, { ...selectedProductForOptions, uniqueName: `${selectedProductForOptions.name}${extras}`, quantity: 1, cartId: Math.random() }]);
    setSelectedProductForOptions(null); setSelectedOptions([]);
  };

  if (!isInitialized) return <div className="fixed inset-0 bg-slate-950"></div>;

  // ==========================================
  // 1. GLOBAL LANDING PAGE (Όταν ΔΕΝ υπάρχει μαγαζί στο Link)
  // ==========================================
  if (!storeSlug) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
           {/* Χρησιμοποιούμε το themeColor #06b6d4 (Cyan) ως default για την πλατφόρμα */}
           <FancyBackground themeColor="#06b6d4" />
           
           <div className="relative z-10 text-center px-6 flex flex-col items-center w-full max-w-sm animate-in zoom-in-95 duration-700">
              <div className="w-24 h-24 bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <Zap size={48} className="text-cyan-400" />
              </div>
              <h1 className="text-6xl font-black text-white mb-2 tracking-tighter uppercase drop-shadow-lg italic">AQUA.</h1>
              <p className="text-slate-400 mb-12 uppercase tracking-[0.3em] text-[10px] font-bold">Interactive Order System</p>

              <div className="w-full space-y-4">
                  <button onClick={() => setShowQRModal(true)} className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.4)] bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                     <ScanLine size={20} /> ΣΚΑΝΑΡΕ ΚΩΔΙΚΟ (QR)
                  </button>
                  <button className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 border border-slate-800 bg-slate-900/80 text-slate-400 backdrop-blur-md hover:text-white hover:border-slate-700">
                     <Map size={20} /> ΧΑΡΤΗΣ ΜΑΓΑΖΙΩΝ
                  </button>
              </div>
           </div>

           {/* QR Modal Instructions */}
           {showQRModal && (
              <div className="fixed inset-0 z-50 flex items-end justify-center">
                 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowQRModal(false)}></div>
                 <div className="bg-slate-900 border-t border-slate-800 w-full p-8 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 flex flex-col items-center text-center shadow-2xl">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-white"><Camera size={28}/></div>
                    <h3 className="text-2xl font-black text-white mb-3">Ανοίξτε την Κάμερα</h3>
                    <p className="text-slate-400 font-medium mb-8 text-sm">Βγείτε από την εφαρμογή, ανοίξτε την κάμερα του κινητού σας και στοχεύστε το τετράγωνο σηματάκι (QR Code) που βρίσκεται στο τραπέζι ή την ομπρέλα σας!</p>
                    <button onClick={() => setShowQRModal(false)} className="bg-slate-800 hover:bg-slate-700 text-white w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">Ενταξει, καταλαβα</button>
                 </div>
              </div>
           )}
        </div>
      );
  }

  // ==========================================
  // LOADING STATE (Αν υπάρχει slug αλλά φορτώνει δεδομένα)
  // ==========================================
  if (!storeDetails && storeSlug) {
      return <div className="fixed inset-0 flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  }

  const categoriesInMenu = Array.from(new Set(menu.map(m => m.category)));
  const availableGiftUmbrellas = umbrellas.filter(u => u.number !== umbrellaNumber);

  const themeColor = storeDetails?.primary_color || '#06b6d4';
  const dynamicBgColor = storeDetails?.bg_color || '#f8fafc';
  
  const getContrast = (hexcolor: string) => {
      if (!hexcolor) return 'light'; hexcolor = hexcolor.replace("#", "");
      if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(x => x + x).join('');
      const r = parseInt(hexcolor.substring(0,2), 16), g = parseInt(hexcolor.substring(2,4), 16), b = parseInt(hexcolor.substring(4,6), 16);
      return ((r*299)+(g*587)+(b*114))/1000 >= 128 ? 'light' : 'dark';
  };
  
  const isDarkTheme = getContrast(dynamicBgColor) === 'dark';
  const textColor = isDarkTheme ? 'text-white' : 'text-slate-900';
  const cardBg = isDarkTheme ? 'bg-slate-900/60 border-slate-700 backdrop-blur-md' : 'bg-white border-slate-100';
  const isThemeColorDark = getContrast(themeColor) === 'dark';
  const themeTextHex = isThemeColorDark ? '#ffffff' : '#0f172a';
  const safeThemeColor = (isDarkTheme && isThemeColorDark) ? '#ffffff' : themeColor;

  // Αλεξίσφαιρο Λογικό για Κατηγορίες (αγνοεί τόνους/κεφαλαία)
  const normalizeText = (text: string) => {
      if (!text) return "";
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  };

  let rawPrefs = storeDetails?.category_prefs || [];
  if (typeof rawPrefs === 'string') {
      try { rawPrefs = JSON.parse(rawPrefs); } catch (e) { rawPrefs = []; }
  }
  
  const displayCategories = categoriesInMenu.map(catName => {
      const pref = rawPrefs.find((p:any) => normalizeText(p.name) === normalizeText(catName));
      return {
          name: catName,
          bg_color: pref?.bg_color || (isDarkTheme ? '#1e293b' : '#ffffff'), 
          text_color: pref?.text_color || (isDarkTheme ? '#ffffff' : '#0f172a'),
          sort_order: pref?.sort_order ?? 999
      };
  }).sort((a, b) => a.sort_order - b.sort_order);

  // ==========================================
  // 2. STORE LANDING PAGE (Μπήκε στο μαγαζί αλλά δεν σκάναρε ομπρέλα)
  // ==========================================
  if (!umbrellaNumber && storeDetails) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
         <FancyBackground themeColor={themeColor} />
         <div className="relative z-10 text-center px-6 flex flex-col items-center max-w-sm w-full animate-in zoom-in-95 duration-700">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                <Coffee size={40} style={{ color: themeColor }} />
            </div>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase drop-shadow-lg">{storeDetails.name}</h1>
            <p className="text-slate-400 mb-12 uppercase tracking-[0.3em] text-xs font-bold">Interactive Experience</p>
            <button onClick={() => setShowQRModal(true)} className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-[0_0_30px_rgba(0,0,0,0.5)]" style={{ backgroundColor: themeColor, color: themeTextHex, boxShadow: `0 0 40px ${themeColor}40` }}>
               <ScanLine size={20} /> ΣΚΑΝΑΡΕ ΤΟ QR ΣΟΥ
            </button>
         </div>
         {showQRModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
               <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowQRModal(false)}></div>
               <div className="bg-slate-900 border-t border-slate-800 w-full p-8 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-white"><Camera size={28}/></div>
                  <h3 className="text-2xl font-black text-white mb-3">Ανοίξτε την Κάμερα</h3>
                  <p className="text-slate-400 font-medium mb-8 text-sm">Βγείτε από την εφαρμογή, ανοίξτε την κάμερα του κινητού σας και στοχεύστε το τετράγωνο σηματάκι (QR Code) που βρίσκεται στο τραπέζι ή την ομπρέλα σας για να παραγγείλετε!</p>
                  <button onClick={() => setShowQRModal(false)} className="bg-slate-800 text-white w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs">Ενταξει, καταλαβα</button>
               </div>
            </div>
         )}
      </div>
    );
  }

  // ==========================================
  // 3. MAIN APP (Έχει σκανάρει και βλέπει μενού)
  // ==========================================
  return (
    <div className={`fixed inset-0 w-full h-full font-sans flex flex-col overflow-hidden transition-colors duration-500 ${textColor}`} style={{ backgroundColor: dynamicBgColor }}>
      {toast && (
          <div className={`fixed top-4 left-4 right-4 z-[100] ${toast.color} text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300`}>
             <div className="shrink-0 mt-0.5">{toast.icon}</div>
             <div><p className="font-black text-sm uppercase tracking-widest">{toast.title}</p><p className="text-xs font-medium opacity-90">{toast.desc}</p></div>
          </div>
      )}

      <div className="shrink-0 z-50">
        {!isOnline && ( <div className="bg-red-500 text-white p-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><WifiOff size={14} /> Χωρις Συνδεση. Συνεχιστε κανονικα!</div> )}
        {activeOrder && activeOrder.status !== 'completed' && (
          <div className={`p-4 animate-in slide-in-from-top duration-500 shadow-2xl transition-colors ${isServedVisible ? 'bg-emerald-500 text-white' : 'bg-slate-950 text-white'}`}>
             <div className="max-w-lg mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {isServedVisible ? <CheckCircle2 size={24} className="text-white animate-in zoom-in duration-300"/> : <><div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: safeThemeColor, borderTopColor: 'transparent' }}></div><Coffee className="absolute inset-0 m-auto" size={16} style={{ color: safeThemeColor }}/></>}
                  </div>
                  <div>
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] transition-colors" style={{ color: isServedVisible ? '#d1fae5' : safeThemeColor }}>Εξελιξη Παραγγελιας</p>
                     <p className="text-xs font-bold uppercase tracking-tight">{isServedVisible ? 'ΣΕΡΒΙΡΙΣΤΗΚΕ!' : <>{activeOrder.status === 'new' && 'Παραληφθηκε...'}{activeOrder.status === 'preparing' && 'Ο Barista ετοιμαζει...'}{activeOrder.status === 'shipped' && 'Ερχεται στην ομπρελα!'}</>}</p>
                  </div>
                </div>
                {!isServedVisible && (
                    <div className="flex gap-1.5">
                       <div className={`w-6 h-1 rounded-full ${activeOrder.status === 'new' || activeOrder.status === 'preparing' || activeOrder.status === 'shipped' ? '' : 'bg-slate-800'}`} style={activeOrder.status === 'new' || activeOrder.status === 'preparing' || activeOrder.status === 'shipped' ? { backgroundColor: themeColor } : {}}></div>
                       <div className={`w-6 h-1 rounded-full ${activeOrder.status === 'preparing' || activeOrder.status === 'shipped' ? '' : 'bg-slate-800'}`} style={activeOrder.status === 'preparing' || activeOrder.status === 'shipped' ? { backgroundColor: themeColor } : {}}></div>
                       <div className={`w-6 h-1 rounded-full ${activeOrder.status === 'shipped' ? '' : 'bg-slate-800'}`} style={activeOrder.status === 'shipped' ? { backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` } : {}}></div>
                    </div>
                )}
             </div>
          </div>
        )}

        <header className={`px-4 sm:px-6 py-6 sm:py-8 flex justify-between items-center backdrop-blur-2xl border-b border-white/10`} style={{ backgroundColor: `${dynamicBgColor}D9` }}>
          <h1 className="text-3xl font-black tracking-tighter italic line-clamp-1 flex-1 pr-4 drop-shadow-sm">{storeDetails ? storeDetails.name : 'AQUA'}<span style={{ color: safeThemeColor }}>.</span></h1>
          <div className="flex items-center gap-2 shrink-0">
              {umbrellaNumber && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm border ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <MapPin size={14} style={{ color: safeThemeColor }} />
                    <span className="text-xs font-black uppercase tracking-widest">Ομπρελα {umbrellaNumber}</span>
                </div>
              )}
          </div>
        </header>
      </div>

      <main className="flex-1 overflow-y-auto overscroll-y-none px-4 sm:px-6 py-6 pb-40 w-full max-w-lg mx-auto">
        {umbrellaNumber && !activeCategory && (
           <div className="space-y-3 mb-8">
              {lastOrder && totalOwed > 0 && (
                <button onClick={() => setIsRepeatModalOpen(true)} className="w-full p-6 rounded-[2.5rem] font-black flex items-center justify-between shadow-xl active:scale-95 transition-all border-b-4 border-black/20" style={{ backgroundColor: themeColor, color: themeTextHex }}>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-2 rounded-xl"><RotateCcw size={20} /></div>
                    <div className="text-left"><p className="text-[10px] uppercase opacity-80 italic">Θελεις το ιδιο;</p><p className="text-lg uppercase tracking-tighter">ΑΛΛΟ ΕΝΑ!</p></div>
                  </div>
                  <Zap size={24} style={{ fill: themeTextHex, color: themeTextHex }} />
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsServiceOpen(true)} className={`p-4 rounded-3xl font-black flex flex-col items-center justify-center gap-2 text-xs shadow-lg active:scale-95 transition-all ${isDarkTheme ? 'bg-slate-800 text-white border border-slate-700' : 'bg-slate-900 text-white'}`}>
                  <BellRing size={20} style={{ color: safeThemeColor }} />
                  <span>ΛΟΓΑΡΙΑΣΜΟΣ {totalOwed > 0 ? `(${totalOwed.toFixed(2)}€)` : ''}</span>
                </button>
                <div className="flex flex-col gap-3">
                    <button onClick={() => callWaiter('ΚΛΗΣΗ (ΑΠΛΗ)')} className={`p-3 rounded-[1.2rem] font-black flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all ${isDarkTheme ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'}`}>
                        <Hand size={14} /> ΚΑΛΕΣΕ ΣΕΡΒΙΤΟΡΟ
                    </button>
                    <button onClick={() => { setIsGiftMode(true); setActiveCategory('Όλα'); }} className={`p-3 rounded-[1.2rem] font-black flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all ${isDarkTheme ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200'}`}>
                        <Gift size={14} /> ΚΕΡΑΣΕ ΦΙΛΟ
                    </button>
                </div>
              </div>
           </div>
        )}

        {isGiftMode && (
          <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl mb-6 animate-in slide-in-from-top duration-300 backdrop-blur-md">
            <p className="text-purple-500 font-black text-xs uppercase mb-3 flex items-center justify-center gap-2 tracking-tight"><Gift size={16}/> Επιλεξε τραπεζι</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1 mb-3">
                {availableGiftUmbrellas.map(u => (
                    <button key={u.id} onClick={() => setTargetUmbrella(u.number)} className={`p-3 rounded-xl font-black text-sm transition-all flex items-center justify-center ${targetUmbrella === u.number ? 'bg-purple-600 text-white scale-105 shadow-lg' : `${cardBg} ${textColor}`}`}>{u.number}</button>
                ))}
            </div>
            <button onClick={() => {setIsGiftMode(false); setTargetUmbrella(''); setActiveCategory(null);}} className="w-full mt-2 py-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 rounded-xl">Ακυρωση</button>
          </div>
        )}

        {/* ΔΥΝΑΜΙΚΕΣ ΚΑΤΗΓΟΡΙΕΣ */}
        {!activeCategory ? (
          <div className="grid grid-cols-2 gap-4">
            {displayCategories.map((cat, idx) => (
              <button key={cat.name} onClick={() => setActiveCategory(cat.name)} className={`h-32 sm:h-36 rounded-[2rem] flex flex-col items-center justify-center shadow-lg font-black uppercase text-[15px] sm:text-lg transition-all active:scale-95 border-2 ${idx === 0 ? 'col-span-2' : ''}`} style={{ backgroundColor: cat.bg_color, color: cat.text_color, borderColor: cat.bg_color }}>
                  {cat.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => {setActiveCategory(null); setIsGiftMode(false);}} className="font-bold text-xs uppercase mb-6 flex items-center gap-1" style={{ color: safeThemeColor }}><ChevronLeft size={16}/> ΠΙΣΩ</button>
            <div className="space-y-4">
              {menu.filter(p => isGiftMode || p.category === activeCategory).map(product => (
                <div key={product.id} className={`flex justify-between items-center p-4 rounded-[2rem] shadow-sm border group ${cardBg}`}>
                  <div className="pl-2 pr-2">
                    <h3 className="font-bold text-base sm:text-lg leading-tight">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-black" style={{ color: safeThemeColor }}>{Number(product.price).toFixed(2)}€</span>
                        {product.options && product.options.trim() !== '' && (
                           <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-widest ${isDarkTheme ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>+ ΕΠΙΛΟΓΕΣ</span>
                        )}
                    </div>
                  </div>
                  <button disabled={isGiftMode && !targetUmbrella} onClick={() => handleAddToCartClick(product)} className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-all shadow-sm ${isGiftMode ? 'bg-purple-600 text-white opacity-50' : isDarkTheme ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-50 text-slate-900 border border-slate-200'}`} style={!isGiftMode && !isDarkTheme ? { ':hover': { backgroundColor: themeColor, color: themeTextHex } } as any : {}}>
                    <Plus size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsServiceOpen(false)}></div>
           <div className={`w-full max-w-lg p-6 sm:p-8 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl ${isDarkTheme ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
             <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-6"></div>
             <h2 className="text-2xl font-black mb-2 tracking-tighter">Εξόφληση Λογαριασμού</h2>
             <p className={`text-xs font-bold uppercase tracking-widest mb-6 ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>ΠΩΣ ΘΑ ΠΛΗΡΩΣΕΤΕ;</p>
             <p className="text-5xl font-black text-center mb-8">{totalOwed.toFixed(2)}€</p>
             <div className="grid grid-cols-2 gap-3 mb-6">
               <button onClick={() => callWaiter('ΚΑΡΤΑ (POS)')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <CreditCard size={28} style={{ color: safeThemeColor }}/> <span className="font-black text-[11px] uppercase tracking-widest">ΚΑΡΤΑ (POS)</span>
               </button>
               <button onClick={() => callWaiter('ΜΕΤΡΗΤΑ')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <Banknote size={28} className="text-emerald-500"/> <span className="font-black text-[11px] uppercase tracking-widest">ΜΕΤΡΗΤΑ</span>
               </button>
               <button onClick={() => callWaiter('APPLE PAY / GOOGLE PAY')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-900 text-white border-slate-800'}`}>
                 <Smartphone size={28}/> <span className="font-black text-[11px] uppercase tracking-widest">APPLE PAY</span>
               </button>
               <button onClick={() => callWaiter('ΣΠΑΣΤΟ (Min 4€ Κάρτα)')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-sm border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <SplitSquareHorizontal size={24} className="text-amber-500"/>
                 <div className="text-center"><span className="font-black text-[11px] uppercase tracking-widest block">ΣΠΑΣΤΟ</span><span className="text-[8px] font-bold text-slate-500 block leading-tight">(Min 4€ Κάρτα, τα υπόλοιπα Μετρητά)</span></div>
               </button>
             </div>
             <button onClick={() => setIsServiceOpen(false)} className={`w-full py-4 rounded-full font-black uppercase tracking-widest active:scale-95 transition-all ${isDarkTheme ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>ΑΚΥΡΩΣΗ</button>
           </div>
        </div>
      )}

      {isRepeatModalOpen && lastOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsRepeatModalOpen(false)}></div>
           <div className={`w-full max-w-lg p-6 sm:p-8 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl ${isDarkTheme ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
              <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-6"></div>
              <h2 className="text-2xl font-black mb-1">Τι θέλετε να επαναλάβετε;</h2>
              <div className="space-y-3 mb-8 mt-6 max-h-[40vh] overflow-y-auto overscroll-none pr-2">
                 {lastOrder.map((item, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-4 rounded-2xl border shadow-sm ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex flex-col"><span className="font-black leading-tight">{item.uniqueName}</span><span className="text-[11px] font-bold" style={{ color: safeThemeColor }}>{item.price.toFixed(2)}€</span></div>
                      <button onClick={() => setCart(prev => [...prev, {...item, cartId: Math.random()}])} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all ${isDarkTheme ? 'bg-slate-700 text-white' : 'bg-white border text-slate-900'}`}><Plus size={20}/></button>
                    </div>
                 ))}
              </div>
              <button onClick={() => setIsRepeatModalOpen(false)} className={`w-full py-5 rounded-full font-black uppercase tracking-widest active:scale-95 transition-all ${isDarkTheme ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>{cart.length > 0 ? 'ΣΥΝΕΧΕΙΑ ΣΤΟ ΚΑΛΑΘΙ' : 'ΚΛΕΙΣΙΜΟ'}</button>
           </div>
        </div>
      )}

      {selectedProductForOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedProductForOptions(null)}></div>
           <div className={`w-full max-w-lg p-6 sm:p-8 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl ${isDarkTheme ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
              <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-6"></div>
              <h2 className="text-2xl font-black mb-1">{selectedProductForOptions.name}</h2>
              <p className={`text-xs font-bold uppercase tracking-widest mb-6 ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Επιλεξτε προτιμησεις:</p>
              <div className="grid grid-cols-2 gap-3 mb-8 max-h-[40vh] overflow-y-auto overscroll-none pr-1">
                 {selectedProductForOptions.options?.split(',').map(opt => {
                    const cleanOpt = opt.trim(); const isSelected = selectedOptions.includes(cleanOpt);
                    return (
                        <button key={cleanOpt} onClick={() => toggleOption(cleanOpt)} className={`p-4 rounded-2xl font-black text-sm transition-all border-2 ${isSelected ? 'shadow-lg' : isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} style={isSelected ? { backgroundColor: themeColor, borderColor: themeColor, color: themeTextHex } : {}}>{cleanOpt}</button>
                    )
                 })}
              </div>
              <button onClick={confirmOptionAndAddToCart} className="w-full py-5 rounded-full font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all" style={{ backgroundColor: themeColor, color: themeTextHex }}>ΠΡΟΣΘΗΚΗ ΣΤΟ ΚΑΛΑΘΙ</button>
           </div>
        </div>
      )}

      {cart.length > 0 && !isServiceOpen && !selectedProductForOptions && !isRepeatModalOpen && (
        <div className={`absolute bottom-6 left-4 right-4 sm:left-auto sm:right-auto sm:w-full sm:max-w-lg mx-auto rounded-[2.5rem] p-3 pl-6 flex justify-between items-center shadow-2xl z-40 animate-in slide-in-from-bottom-10 ${isDarkTheme ? 'bg-slate-800 border border-slate-700' : 'bg-slate-900'}`}>
          <div className="text-white font-black"><p className="text-[10px] uppercase mb-1 leading-none" style={{ color: safeThemeColor }}>ΣΥΝΟΛΟ</p><p className="text-2xl tracking-tighter leading-none">{cart.reduce((s,i) => s + (i.price*i.quantity), 0).toFixed(2)}€</p></div>
          <button onClick={() => setIsCheckoutOpen(true)} className="px-8 py-4 rounded-full font-black text-xs uppercase active:scale-95 transition-all" style={{ backgroundColor: themeColor, color: themeTextHex }}>ΠΡΟΒΟΛΗ</button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsCheckoutOpen(false)}></div>
           <div className={`w-full max-w-lg p-6 sm:p-8 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 ${isDarkTheme ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
             <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-6"></div>
             <h2 className="text-2xl font-black mb-6 tracking-tighter">{isGiftMode ? 'Επιβεβαίωση Κεράσματος' : 'Το Καλάθι μου'}</h2>
             {isGiftMode && ( <div className="bg-purple-500/20 p-3 rounded-xl mb-4 text-center"><p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">ΑΠΟΣΤΟΛΗ ΣΤΟ ΤΡΑΠΕΖΙ</p><p className="text-2xl font-black text-purple-500">{targetUmbrella}</p></div> )}
             <div className="space-y-3 mb-8 max-h-[35vh] overflow-y-auto overscroll-none pr-2">
               {cart.map(item => (
                 <div key={item.cartId} className={`flex justify-between items-center p-4 rounded-2xl border shadow-sm ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <div className="flex flex-col"><span className="font-black leading-tight">{item.uniqueName}</span><span className="text-[11px] font-bold" style={{ color: safeThemeColor }}>{item.price.toFixed(2)}€</span></div>
                   <button onClick={() => removeFromCart(item.cartId)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isDarkTheme ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/20' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}><X size={20} /></button>
                 </div>
               ))}
             </div>
             <div className="flex justify-between items-end mb-8 px-2 border-t border-slate-500/20 pt-4">
               <span className={`font-bold uppercase tracking-widest text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>Πληρωμη</span>
               <span className="text-4xl font-black">{cart.reduce((s,i) => s + (i.price*i.quantity), 0).toFixed(2)}€</span>
             </div>
             <button onClick={() => submitOrder()} className="w-full py-5 rounded-full font-black text-lg shadow-xl active:scale-95 transition-all" style={{ backgroundColor: themeColor, color: themeTextHex }}>ΑΠΟΣΤΟΛΗ ΠΑΡΑΓΓΕΛΙΑΣ</button>
           </div>
        </div>
      )}
    </div>
  );
}