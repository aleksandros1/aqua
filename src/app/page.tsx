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

const NeonStyles = ({ themeColor, textColor }: { themeColor: string, textColor: string }) => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes neon-breathe {
      0%, 100% { filter: drop-shadow(0 0 2px ${themeColor}); transform: scale(1); }
      50% { filter: drop-shadow(0 0 12px ${themeColor}) brightness(1.3); transform: scale(1.05); }
    }
    .neon-text {
      background: linear-gradient(to right, ${textColor} 20%, ${themeColor});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
      padding-right: 2px;
    }
    .neon-dot {
      -webkit-text-fill-color: ${themeColor};
      color: ${themeColor};
      animation: neon-breathe 3s ease-in-out infinite;
      display: inline-block;
    }
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

  // --- HAPTIC FEEDBACK ENGINE ---
  const triggerHaptic = (pattern: number | number[] = 30) => {
    if (typeof window !== 'undefined' && navigator && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const showToast = (title: string, desc: string, type: 'success' | 'alert' | 'gift' = 'success') => {
      let icon = <CheckCircle2 size={24} />; let color = 'bg-emerald-500';
      if (type === 'gift') { icon = <Gift size={24} />; color = 'bg-purple-600'; }
      if (type === 'alert') { icon = <BellRing size={24} />; color = 'bg-cyan-600'; }
      setToast({ title, desc, icon, color }); setTimeout(() => setToast(null), 4000); 
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const store = params.get('store')?.trim();
    const umbrella = params.get('umbrella')?.trim();
    
    if (store) setStoreSlug(store); 
    if (umbrella) setUmbrellaNumber(umbrella);

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
          
          if (error) {
              console.error("Supabase Error:", error);
              alert("Σφάλμα επικοινωνίας: " + error.message);
              setStoreSlug(null);
              return;
          }

          if (storeData) {
              setStoreDetails(storeData); fetchMenu(storeData.id); fetchUmbrellas(storeData.id);
              const menuSub = supabase.channel(`public:menu:${storeData.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'menu', filter: `store_id=eq.${storeData.id}` }, () => fetchMenu(storeData.id)).subscribe();
              const umbSub = supabase.channel(`public:umbrellas:${storeData.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'umbrellas', filter: `store_id=eq.${storeData.id}` }, () => fetchUmbrellas(storeData.id)).subscribe();
              const storeSub = supabase.channel(`public:stores:${storeData.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeData.id}` }, (payload) => setStoreDetails(payload.new as StoreDetails)).subscribe();
              return () => { supabase.removeChannel(menuSub); supabase.removeChannel(umbSub); supabase.removeChannel(storeSub); };
          } else {
              alert("Σφάλμα: Το κατάστημα δεν βρέθηκε! Ελέγξτε το Link.");
              setStoreSlug(null);
          }
      } catch (err) {
          console.error("Critical Error Fetching Store:", err);
          alert("Προέκυψε κρίσιμο σφάλμα κατά την ανάγνωση του καταστήματος.");
          setStoreSlug(null);
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
    triggerHaptic([30, 50, 30]); // Έντονη δόνηση επιτυχίας
    
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
    triggerHaptic([50, 50, 50]); // Διπλό Alert
    
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

  const removeFromCart = (cartId: number) => {
    triggerHaptic(20);
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };
  
  const handleAddToCartClick = (product: MenuItem) => {
    triggerHaptic(30); // Ελαφρύ κλικ
    if (product.options && product.options.trim() !== '') { setSelectedProductForOptions(product); setSelectedOptions([]); } 
    else setCart([...cart, {...product, uniqueName: product.name, quantity: 1, cartId: Math.random()}]);
  };
  
  const toggleOption = (opt: string) => {
    triggerHaptic(20);
    if (selectedOptions.includes(opt)) setSelectedOptions(prev => prev.filter(o => o !== opt));
    else setSelectedOptions(prev => [...prev, opt]);
  };
  
  const confirmOptionAndAddToCart = () => {
    triggerHaptic(30);
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
           <FancyBackground themeColor="#06b6d4" />
           <NeonStyles themeColor="#06b6d4" textColor="#ffffff" />
           
           <div className="relative z-10 text-center px-6 flex flex-col items-center w-full max-w-sm animate-in zoom-in-95 duration-700">
              <div className="w-24 h-24 bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <Zap size={48} className="text-cyan-400" />
              </div>
              
              <h1 className="text-6xl font-black mb-2 tracking-[0.05em] uppercase drop-shadow-lg italic neon-text">AQUA<span className="neon-dot">.</span></h1>
              <p className="text-slate-400 mb-12 uppercase tracking-[0.3em] text-[10px] font-bold">Interactive Order System</p>

              <div className="w-full space-y-4">
                  <button onClick={() => { triggerHaptic(30); setShowQRModal(true); }} className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.4)] bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                     <ScanLine size={20} /> ΣΚΑΝΑΡΕ ΚΩΔΙΚΟ (QR)
                  </button>
                  <button onClick={() => triggerHaptic(30)} className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 border border-slate-800 bg-slate-900/80 text-slate-400 backdrop-blur-md hover:text-white hover:border-slate-700">
                     <Map size={20} /> ΧΑΡΤΗΣ ΜΑΓΑΖΙΩΝ
                  </button>
              </div>
           </div>

           {/* QR Modal Instructions */}
           {showQRModal && (
              <div className="fixed inset-0 z-50 flex items-end justify-center">
                 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => { triggerHaptic(20); setShowQRModal(false); }}></div>
                 <div className="bg-slate-900 border-t border-slate-800 w-full p-8 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 flex flex-col items-center text-center shadow-2xl">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-white"><Camera size={28}/></div>
                    <h3 className="text-2xl font-black text-white mb-3">Ανοίξτε την Κάμερα</h3>
                    <p className="text-slate-400 font-medium mb-8 text-sm">Βγείτε από την εφαρμογή, ανοίξτε την κάμερα του κινητού σας και στοχεύστε το τετράγωνο σηματάκι (QR Code) που βρίσκεται στο τραπέζι ή την ομπρέλα σας!</p>
                    <button onClick={() => { triggerHaptic(20); setShowQRModal(false); }} className="bg-slate-800 hover:bg-slate-700 text-white w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">Ενταξει, καταλαβα</button>
                 </div>
              </div>
           )}
        </div>
      );
  }

  if (!storeDetails && storeSlug) {
      return <div className="fixed inset-0 flex items-center justify-center bg-slate-950"><div className="w-10 h-10 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin"></div></div>;
  }

  const categoriesInMenu = Array.from(new Set(menu.map(m => m.category)));
  const availableGiftUmbrellas = umbrellas.filter(u => u.number !== umbrellaNumber);

  const themeColor = storeDetails?.primary_color || '#06b6d4';
  const dynamicBgColor = storeDetails?.bg_color || '#020617'; 
  
  const getContrast = (hexcolor: string) => {
      if (!hexcolor) return 'dark'; hexcolor = hexcolor.replace("#", "");
      if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(x => x + x).join('');
      const r = parseInt(hexcolor.substring(0,2), 16), g = parseInt(hexcolor.substring(2,4), 16), b = parseInt(hexcolor.substring(4,6), 16);
      return ((r*299)+(g*587)+(b*114))/1000 >= 128 ? 'light' : 'dark';
  };
  
  const isDarkTheme = getContrast(dynamicBgColor) === 'dark';
  const textColor = isDarkTheme ? 'text-white' : 'text-slate-900';
  const themeTextHex = getContrast(themeColor) === 'dark' ? '#ffffff' : '#0f172a';

  const normalizeText = (text: string) => {
      if (!text) return "";
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  };

  let rawPrefs = storeDetails?.category_prefs;
  let prefsArray: any[] = [];
  if (Array.isArray(rawPrefs)) {
      prefsArray = rawPrefs;
  } else if (typeof rawPrefs === 'string') {
      try { prefsArray = JSON.parse(rawPrefs); } catch (e) { prefsArray = []; }
  }
  
  const displayCategories = categoriesInMenu.map(catName => {
      const pref = prefsArray.find((p:any) => normalizeText(p.name) === normalizeText(catName));
      return {
          name: catName,
          bg_color: pref?.bg_color || themeColor, 
          text_color: pref?.text_color || '#ffffff',
          sort_order: pref?.sort_order ?? 999
      };
  }).sort((a, b) => a.sort_order - b.sort_order);

  // ==========================================
  // 2. STORE LANDING PAGE (Μπήκε στο μαγαζί αλλά δεν σκάναρε ομπρέλα)
  // ==========================================
  if (!umbrellaNumber && storeDetails) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: dynamicBgColor }}>
         <FancyBackground themeColor={themeColor} />
         <NeonStyles themeColor={themeColor} textColor={textColor} />
         
         <div className="relative z-10 text-center px-6 flex flex-col items-center max-w-sm w-full animate-in zoom-in-95 duration-700">
            <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl">
                <Coffee size={32} style={{ color: themeColor }} />
            </div>
            
            <h1 className="text-5xl font-black mb-2 tracking-[0.05em] uppercase drop-shadow-2xl neon-text">{storeDetails.name}<span className="neon-dot">.</span></h1>
            <p className="mb-12 uppercase tracking-[0.4em] text-[9px] font-black opacity-50" style={{ color: textColor }}>Interactive Experience</p>
            <button onClick={() => { triggerHaptic(30); setShowQRModal(true); }} className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 backdrop-blur-md" style={{ backgroundColor: themeColor, color: themeTextHex, boxShadow: `0 10px 40px -10px ${themeColor}` }}>
               <ScanLine size={18} /> ΣΚΑΝΑΡΕ ΤΟ QR ΣΟΥ
            </button>
         </div>
         {showQRModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
               <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setShowQRModal(false); }}></div>
               <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/10 w-full p-8 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 flex flex-col items-center text-center shadow-2xl">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 text-white"><Camera size={28}/></div>
                  <h3 className="text-2xl font-black text-white mb-3 tracking-tighter">Ανοίξτε την Κάμερα</h3>
                  <p className="text-slate-400 font-medium mb-8 text-sm">Βγείτε από την εφαρμογή, ανοίξτε την κάμερα του κινητού σας και στοχεύστε το τετράγωνο σηματάκι (QR Code) που βρίσκεται στο τραπέζι ή την ομπρέλα σας!</p>
                  <button onClick={() => { triggerHaptic(20); setShowQRModal(false); }} className="bg-white/10 text-white border border-white/5 w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/20 transition-all">Ενταξει, καταλαβα</button>
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
      <div className="absolute top-0 left-0 w-full h-96 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 50% -20%, ${themeColor}, transparent 70%)` }}></div>
      <NeonStyles themeColor={themeColor} textColor={textColor} />

      {toast && (
          <div className={`fixed top-4 left-4 right-4 z-[100] ${toast.color} text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300 backdrop-blur-md bg-opacity-90 border border-white/10`}>
             <div className="shrink-0 mt-0.5">{toast.icon}</div>
             <div><p className="font-black text-sm uppercase tracking-widest">{toast.title}</p><p className="text-xs font-medium opacity-90">{toast.desc}</p></div>
          </div>
      )}

      <div className="shrink-0 z-50 relative">
        {!isOnline && ( <div className="bg-red-500 text-white p-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><WifiOff size={14} /> Χωρις Συνδεση. Συνεχιστε κανονικα!</div> )}
        {activeOrder && activeOrder.status !== 'completed' && (
          <div className={`p-4 animate-in slide-in-from-top duration-500 shadow-2xl transition-all border-b border-white/5 backdrop-blur-xl ${isServedVisible ? 'bg-emerald-500/90 text-white' : 'bg-black/40 text-white'}`}>
             <div className="max-w-lg mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {isServedVisible ? <CheckCircle2 size={24} className="text-white animate-in zoom-in duration-300"/> : <><div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeColor, borderTopColor: 'transparent' }}></div><Coffee className="absolute inset-0 m-auto" size={16} style={{ color: themeColor }}/></>}
                  </div>
                  <div>
                     <p className="text-[9px] font-black uppercase tracking-[0.3em] transition-colors opacity-70" style={{ color: isServedVisible ? '#fff' : themeColor }}>Εξελιξη Παραγγελιας</p>
                     <p className="text-xs font-bold uppercase tracking-tight">{isServedVisible ? 'ΣΕΡΒΙΡΙΣΤΗΚΕ!' : <>{activeOrder.status === 'new' && 'Παραληφθηκε...'}{activeOrder.status === 'preparing' && 'Ο Barista ετοιμαζει...'}{activeOrder.status === 'shipped' && 'Ερχεται στην ομπρελα!'}</>}</p>
                  </div>
                </div>
                {!isServedVisible && (
                    <div className="flex gap-1.5 opacity-80">
                       <div className={`w-6 h-1 rounded-full ${activeOrder.status === 'new' || activeOrder.status === 'preparing' || activeOrder.status === 'shipped' ? '' : 'bg-white/10'}`} style={activeOrder.status === 'new' || activeOrder.status === 'preparing' || activeOrder.status === 'shipped' ? { backgroundColor: themeColor } : {}}></div>
                       <div className={`w-6 h-1 rounded-full ${activeOrder.status === 'preparing' || activeOrder.status === 'shipped' ? '' : 'bg-white/10'}`} style={activeOrder.status === 'preparing' || activeOrder.status === 'shipped' ? { backgroundColor: themeColor } : {}}></div>
                       <div className={`w-6 h-1 rounded-full ${activeOrder.status === 'shipped' ? '' : 'bg-white/10'}`} style={activeOrder.status === 'shipped' ? { backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` } : {}}></div>
                    </div>
                )}
             </div>
          </div>
        )}

        <header className="px-4 sm:px-6 py-6 sm:py-8 flex justify-between items-center relative">
          <h1 className="text-3xl font-black tracking-[0.05em] italic line-clamp-1 flex-1 pr-4 drop-shadow-md animate-in fade-in slide-in-from-top-3 duration-1000 ease-out neon-text">{storeDetails ? storeDetails.name : 'AQUA'}<span className="neon-dot">.</span></h1>
          <div className="flex items-center gap-2 shrink-0">
              {umbrellaNumber && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md ${isDarkTheme ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`}>
                    <MapPin size={14} style={{ color: themeColor }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ομπρελα {umbrellaNumber}</span>
                </div>
              )}
          </div>
        </header>
      </div>

      <main className="flex-1 overflow-y-auto overscroll-y-none px-4 sm:px-6 py-2 pb-40 w-full max-w-lg mx-auto relative z-10">
        {/* PREMIUM ACTION BUTTONS */}
        {umbrellaNumber && !activeCategory && (
           <div className="space-y-4 mb-10">
              {lastOrder && totalOwed > 0 && (
                <button onClick={() => { triggerHaptic(30); setIsRepeatModalOpen(true); }} className="w-full p-6 rounded-[2rem] font-black flex items-center justify-between shadow-2xl active:scale-95 transition-all overflow-hidden relative group border border-white/20" style={{ backgroundColor: themeColor, color: themeTextHex }}>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-black/10 p-3 rounded-2xl backdrop-blur-sm"><RotateCcw size={22} /></div>
                    <div className="text-left"><p className="text-[9px] uppercase tracking-[0.2em] opacity-80 mb-0.5">Θελεις το ιδιο;</p><p className="text-xl uppercase tracking-tighter leading-none">ΑΛΛΟ ΕΝΑ!</p></div>
                  </div>
                  <Zap size={28} className="relative z-10 opacity-90" style={{ fill: themeTextHex, color: themeTextHex }} />
                </button>
              )}
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { triggerHaptic(30); setIsServiceOpen(true); }} className={`relative overflow-hidden p-5 rounded-[2rem] font-black flex flex-col items-center justify-center gap-3 shadow-xl active:scale-95 transition-all border ${isDarkTheme ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'} backdrop-blur-xl group`}>
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: `radial-gradient(circle at center, ${themeColor} 0%, transparent 70%)` }}></div>
                  <div className="relative z-10 flex flex-col items-center gap-2">
                      <BellRing size={24} style={{ color: themeColor }} />
                      <span className="text-[10px] tracking-[0.2em] uppercase text-center leading-tight">ΛΟΓΑΡΙΑΣΜΟΣ<br/><span className="text-xs opacity-70 mt-1 block">{totalOwed > 0 ? `${totalOwed.toFixed(2)}€` : ''}</span></span>
                  </div>
                </button>
                <div className="flex flex-col gap-4">
                    <button onClick={() => { triggerHaptic(30); callWaiter('ΚΛΗΣΗ (ΑΠΛΗ)'); }} className={`flex-1 p-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all border backdrop-blur-md hover:bg-white/10 ${isDarkTheme ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-black/5 border-black/10 text-slate-700'}`}>
                        <Hand size={16} /> ΣΕΡΒΙΤΟΡΟΣ
                    </button>
                    <button onClick={() => { triggerHaptic(30); setIsGiftMode(true); setActiveCategory('Όλα'); }} className={`flex-1 p-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all border backdrop-blur-md hover:bg-purple-500/20 ${isDarkTheme ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-purple-500/10 border-purple-500/20 text-purple-700'}`}>
                        <Gift size={16} /> ΚΕΡΑΣΜΑ
                    </button>
                </div>
              </div>
           </div>
        )}

        {isGiftMode && (
          <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-[2rem] mb-8 animate-in slide-in-from-top duration-300 backdrop-blur-xl shadow-2xl">
            <p className="text-purple-400 font-black text-[10px] uppercase mb-4 flex items-center justify-center gap-2 tracking-[0.2em]"><Gift size={16}/> ΕΠΙΛΟΓΗ ΤΡΑΠΕΖΙΟΥ</p>
            <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1 mb-4">
                {availableGiftUmbrellas.map(u => (
                    <button key={u.id} onClick={() => { triggerHaptic(20); setTargetUmbrella(u.number); }} className={`p-4 rounded-2xl font-black text-base transition-all flex items-center justify-center border ${targetUmbrella === u.number ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105' : isDarkTheme ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-black/5 border-black/10 text-slate-700 hover:bg-black/10'}`}>{u.number}</button>
                ))}
            </div>
            <button onClick={() => { triggerHaptic(20); setIsGiftMode(false); setTargetUmbrella(''); setActiveCategory(null); }} className="w-full py-3 text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors">ΑΚΥΡΩΣΗ ΚΕΡΑΣΜΑΤΟΣ</button>
          </div>
        )}

        {/* PREMIUM GLASSMORPHISM CATEGORIES */}
        {!activeCategory ? (
          <div className="grid grid-cols-2 gap-4">
            {displayCategories.map((cat, idx) => (
              <button key={cat.name} onClick={() => { triggerHaptic(30); setActiveCategory(cat.name); }} className={`relative overflow-hidden h-36 rounded-[2rem] flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 border backdrop-blur-xl group ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/40'} ${idx === 0 ? 'col-span-2 h-44' : ''}`}>
                  {/* Subtle Glowing Aura based on chosen category color */}
                  <div className="absolute inset-0 opacity-30 group-hover:opacity-60 transition-opacity duration-700" style={{ background: `radial-gradient(circle at top left, ${cat.bg_color} 0%, transparent 80%)` }}></div>
                  
                  {/* Category Name */}
                  <span className="font-black uppercase text-[13px] sm:text-[15px] tracking-[0.25em] z-10 drop-shadow-lg px-4 text-center leading-snug" style={{ color: textColor }}>
                    {cat.name}
                  </span>
                  
                  {/* Elegant Accent Line */}
                  <div className="w-8 h-1 rounded-full mt-4 opacity-70 z-10 transition-all group-hover:w-16 shadow-lg" style={{ backgroundColor: cat.bg_color }}></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => { triggerHaptic(20); setActiveCategory(null); setIsGiftMode(false); }} className="font-black text-[10px] uppercase mb-8 flex items-center gap-1 tracking-[0.2em] opacity-70 hover:opacity-100 transition-opacity" style={{ color: textColor }}><ChevronLeft size={16}/> ΕΠΙΣΤΡΟΦΗ</button>
            <div className="space-y-4">
              {menu.filter(p => isGiftMode || p.category === activeCategory).map(product => (
                <div key={product.id} className={`relative overflow-hidden flex justify-between items-center p-5 rounded-[2rem] shadow-lg border backdrop-blur-md transition-all group hover:border-white/20 ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/40'}`}>
                  <div className="pl-2 pr-4 relative z-10">
                    <h3 className="font-black text-sm sm:text-base leading-tight tracking-wide mb-1" style={{ color: textColor }}>{product.name}</h3>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="font-black text-sm" style={{ color: themeColor }}>{Number(product.price).toFixed(2)}€</span>
                        {product.options && product.options.trim() !== '' && (
                           <span className={`text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-[0.2em] border ${isDarkTheme ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-black/5 border-black/10 text-slate-500'}`}>MODS</span>
                        )}
                    </div>
                  </div>
                  <button disabled={isGiftMode && !targetUmbrella} onClick={() => handleAddToCartClick(product)} className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all shadow-md active:scale-90 relative z-10 ${isGiftMode ? 'bg-purple-600/50 text-white' : isDarkTheme ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-black hover:bg-black/10'}`} style={!isGiftMode && !isDarkTheme ? { ':hover': { backgroundColor: themeColor, color: themeTextHex } } as any : {}}>
                    <Plus size={22} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* PREMIUM MODALS (Service / Repeat / Options / Checkout) */}
      {isServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setIsServiceOpen(false); }}></div>
           <div className={`w-full max-w-lg p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl border-t ${isDarkTheme ? 'bg-slate-900/90 border-white/10 text-white backdrop-blur-xl' : 'bg-white/90 border-black/10 text-slate-900 backdrop-blur-xl'}`}>
             <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8"></div>
             <h2 className="text-2xl font-black mb-2 tracking-tighter">Εξόφληση Λογαριασμού</h2>
             <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-8 ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>ΠΩΣ ΘΑ ΠΛΗΡΩΣΕΤΕ;</p>
             <p className="text-6xl font-black text-center mb-10 tracking-tighter" style={{ color: themeColor }}>{totalOwed.toFixed(2)}<span className="text-3xl opacity-50">€</span></p>
             <div className="grid grid-cols-2 gap-4 mb-8">
               <button onClick={() => callWaiter('ΚΑΡΤΑ (POS)')} className={`p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-lg border backdrop-blur-md hover:bg-white/5 ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                 <CreditCard size={28} style={{ color: themeColor }}/> <span className="font-black text-[10px] uppercase tracking-[0.2em]">ΚΑΡΤΑ</span>
               </button>
               <button onClick={() => callWaiter('ΜΕΤΡΗΤΑ')} className={`p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-lg border backdrop-blur-md hover:bg-white/5 ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                 <Banknote size={28} className="text-emerald-400"/> <span className="font-black text-[10px] uppercase tracking-[0.2em]">ΜΕΤΡΗΤΑ</span>
               </button>
               <button onClick={() => callWaiter('APPLE PAY / GOOGLE PAY')} className={`p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-lg border backdrop-blur-md ${isDarkTheme ? 'bg-white border-white text-black' : 'bg-black border-black text-white'}`}>
                 <Smartphone size={28}/> <span className="font-black text-[10px] uppercase tracking-[0.2em]">APPLE PAY</span>
               </button>
               <button onClick={() => callWaiter('ΣΠΑΣΤΟ (Min 4€ Κάρτα)')} className={`p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg border backdrop-blur-md hover:bg-white/5 ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                 <SplitSquareHorizontal size={24} className="text-amber-400"/>
                 <div className="text-center"><span className="font-black text-[10px] uppercase tracking-[0.2em] block">ΣΠΑΣΤΟ</span><span className="text-[7px] font-bold text-slate-500 block leading-tight mt-1 uppercase">(ΜΙΣΑ ΚΑΡΤΑ - ΜΙΣΑ ΜΕΤΡΗΤΑ)</span></div>
               </button>
             </div>
             <button onClick={() => { triggerHaptic(20); setIsServiceOpen(false); }} className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all border ${isDarkTheme ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-black/5 border-black/10 text-black hover:bg-black/10'}`}>ΑΚΥΡΩΣΗ</button>
           </div>
        </div>
      )}

      {isRepeatModalOpen && lastOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setIsRepeatModalOpen(false); }}></div>
           <div className={`w-full max-w-lg p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl border-t ${isDarkTheme ? 'bg-slate-900/90 border-white/10 text-white backdrop-blur-xl' : 'bg-white/90 border-black/10 text-slate-900 backdrop-blur-xl'}`}>
              <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8"></div>
              <h2 className="text-2xl font-black mb-2 tracking-tighter">Επανάληψη Παραγγελίας;</h2>
              <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-8 ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>ΕΠΙΛΕΞΤΕ ΠΡΟΙΟΝΤΑ</p>
              <div className="space-y-4 mb-10 max-h-[40vh] overflow-y-auto overscroll-none pr-2">
                 {lastOrder.map((item, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-5 rounded-[1.5rem] border shadow-lg backdrop-blur-md ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                      <div className="flex flex-col"><span className="font-black text-sm tracking-wide mb-1">{item.uniqueName}</span><span className="text-xs font-black opacity-70" style={{ color: themeColor }}>{item.price.toFixed(2)}€</span></div>
                      <button onClick={() => { triggerHaptic(30); setCart(prev => [...prev, {...item, cartId: Math.random()}]); }} className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shadow-md active:scale-90 transition-all border ${isDarkTheme ? 'bg-white/10 border-white/5 text-white hover:bg-white/20' : 'bg-white border-black/10 text-black hover:bg-slate-50'}`}><Plus size={20}/></button>
                    </div>
                 ))}
              </div>
              <button onClick={() => { triggerHaptic(20); setIsRepeatModalOpen(false); }} className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all shadow-xl`} style={cart.length > 0 ? { backgroundColor: themeColor, color: themeTextHex } : {}}>{cart.length > 0 ? 'ΣΥΝΕΧΕΙΑ ΣΤΟ ΚΑΛΑΘΙ' : 'ΚΛΕΙΣΙΜΟ'}</button>
           </div>
        </div>
      )}

      {selectedProductForOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setSelectedProductForOptions(null); }}></div>
           <div className={`w-full max-w-lg p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl border-t ${isDarkTheme ? 'bg-slate-900/90 border-white/10 text-white backdrop-blur-xl' : 'bg-white/90 border-black/10 text-slate-900 backdrop-blur-xl'}`}>
              <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8"></div>
              <h2 className="text-2xl font-black mb-2 tracking-tighter">{selectedProductForOptions.name}</h2>
              <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-8 ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>ΕΠΙΛΕΞΤΕ ΠΡΟΤΙΜΗΣΕΙΣ</p>
              <div className="grid grid-cols-2 gap-4 mb-10 max-h-[40vh] overflow-y-auto overscroll-none pr-1">
                 {selectedProductForOptions.options?.split(',').map(opt => {
                    const cleanOpt = opt.trim(); const isSelected = selectedOptions.includes(cleanOpt);
                    return (
                        <button key={cleanOpt} onClick={() => toggleOption(cleanOpt)} className={`p-4 rounded-[1.2rem] font-black text-xs tracking-wider transition-all border-2 backdrop-blur-md ${isSelected ? 'shadow-lg scale-[1.02]' : isDarkTheme ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10' : 'bg-black/5 border-black/5 text-slate-600 hover:bg-black/10'}`} style={isSelected ? { backgroundColor: themeColor, borderColor: themeColor, color: themeTextHex } : {}}>{cleanOpt}</button>
                    )
                 })}
              </div>
              <button onClick={confirmOptionAndAddToCart} className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all" style={{ backgroundColor: themeColor, color: themeTextHex }}>ΠΡΟΣΘΗΚΗ ΣΤΟ ΚΑΛΑΘΙ</button>
           </div>
        </div>
      )}

      {/* STICKY CART BAR */}
      {cart.length > 0 && !isServiceOpen && !selectedProductForOptions && !isRepeatModalOpen && (
        <div className={`absolute bottom-8 left-6 right-6 sm:left-auto sm:right-auto sm:w-full sm:max-w-md mx-auto rounded-[2rem] p-3 pl-6 flex justify-between items-center shadow-2xl z-40 animate-in slide-in-from-bottom-10 border backdrop-blur-xl ${isDarkTheme ? 'bg-white/10 border-white/20' : 'bg-black/80 border-black/90'}`}>
          <div className="text-white font-black"><p className="text-[8px] uppercase mb-0.5 tracking-[0.3em] opacity-80" style={{ color: themeColor }}>ΣΥΝΟΛΟ</p><p className="text-2xl tracking-tighter leading-none">{cart.reduce((s,i) => s + (i.price*i.quantity), 0).toFixed(2)}€</p></div>
          <button onClick={() => { triggerHaptic(30); setIsCheckoutOpen(true); }} className="px-8 py-4 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all tracking-[0.2em]" style={{ backgroundColor: themeColor, color: themeTextHex }}>ΚΑΛΑΘΙ <span className="ml-1 bg-black/20 px-2 py-0.5 rounded-full">{cart.length}</span></button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { triggerHaptic(20); setIsCheckoutOpen(false); }}></div>
           <div className={`w-full max-w-lg p-8 rounded-t-[3rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl border-t ${isDarkTheme ? 'bg-slate-900/90 border-white/10 text-white backdrop-blur-xl' : 'bg-white/90 border-black/10 text-slate-900 backdrop-blur-xl'}`}>
             <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mb-8"></div>
             <h2 className="text-2xl font-black mb-2 tracking-tighter">{isGiftMode ? 'Επιβεβαίωση Κεράσματος' : 'Το Καλάθι μου'}</h2>
             <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-8 ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>ΕΠΙΣΚΟΠΗΣΗ</p>
             
             {isGiftMode && ( <div className="bg-purple-500/20 p-4 rounded-2xl mb-6 text-center border border-purple-500/30"><p className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1">ΑΠΟΣΤΟΛΗ ΣΤΟ ΤΡΑΠΕΖΙ</p><p className="text-3xl font-black text-purple-400">{targetUmbrella}</p></div> )}
             
             <div className="space-y-4 mb-8 max-h-[35vh] overflow-y-auto overscroll-none pr-2">
               {cart.map(item => (
                 <div key={item.cartId} className={`flex justify-between items-center p-5 rounded-[1.5rem] border shadow-md backdrop-blur-sm ${isDarkTheme ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                   <div className="flex flex-col"><span className="font-black text-sm tracking-wide mb-1">{item.uniqueName}</span><span className="text-xs font-black opacity-80" style={{ color: themeColor }}>{item.price.toFixed(2)}€</span></div>
                   <button onClick={() => removeFromCart(item.cartId)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${isDarkTheme ? 'bg-white/5 border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/30' : 'bg-white border-black/10 text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200'}`}><X size={18} /></button>
                 </div>
               ))}
             </div>
             <div className={`flex justify-between items-end mb-10 px-2 border-t pt-6 ${isDarkTheme ? 'border-white/10' : 'border-black/10'}`}>
               <span className={`font-black uppercase tracking-[0.3em] text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>ΣΥΝΟΛΙΚΗ ΑΞΙΑ</span>
               <span className="text-4xl font-black tracking-tighter" style={{ color: themeColor }}>{cart.reduce((s,i) => s + (i.price*i.quantity), 0).toFixed(2)}<span className="text-2xl opacity-50">€</span></span>
             </div>
             <button onClick={() => submitOrder()} className="w-full py-5 rounded-2xl font-black tracking-[0.2em] text-[12px] shadow-xl active:scale-95 transition-all" style={{ backgroundColor: themeColor, color: themeTextHex }}>ΑΠΟΣΤΟΛΗ ΠΑΡΑΓΓΕΛΙΑΣ</button>
           </div>
        </div>
      )}
    </div>
  );
}