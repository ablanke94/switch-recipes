import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  Search, 
  Plus, 
  ChefHat, 
  ArrowLeft, 
  Lock, 
  Unlock, 
  Sun, 
  Trash2, 
  Languages, 
  X,
  Maximize2,
  Minimize2,
  Tag,
  Camera,
  AlertTriangle,
  Clock,
  Scale,
  LogOut,
  Check,
  Timer
} from 'lucide-react';

// --- FIREBASE SETUP ---
const getEnv = (key) => {
  let value = '';
  try {
    // eslint-disable-next-line no-undef
    if (import.meta && import.meta.env && import.meta.env[key]) value = import.meta.env[key];
  } catch (e) { /* ignore */ }

  if (!value) {
    try {
      // eslint-disable-next-line no-undef
      if (typeof process !== 'undefined' && process.env && process.env[key]) value = process.env[key];
    } catch (e) { /* ignore */ }
  }
  return value;
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

// Initialize Firebase safely
let app, auth, db, storage;
if (firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.error("Firebase init failed:", err);
  }
} else {
  console.warn("Firebase keys are missing.");
}

const appId = 'switch-bbq-tablet';

// --- TRANSLATIONS ---
const TRANSLATIONS = {
  en: {
    searchPlaceholder: "Search recipes...",
    all: "All",
    ingredients: "Ingredients",
    instructions: "Instructions",
    back: "Back",
    adminMode: "Admin Mode",
    enterPin: "Enter Manager PIN",
    addPrepRecipe: "Add Prep Recipe",
    addLineBuild: "Add Line Build",
    editRecipe: "Edit Recipe",
    deleteRecipe: "Delete",
    title: "Recipe Title",
    category: "Tags / Categories",
    pasteIngredients: "Ingredients",
    pasteInstructions: "Instructions",
    save: "Save Recipe",
    cancel: "Cancel",
    confirmDelete: "Are you sure you want to delete this?",
    screenLockActive: "Screen Kept On",
    screenLockInactive: "Screen Normal",
    manageTags: "Manage Tags",
    addTag: "Add New Tag",
    englishContent: "English Content",
    spanishContent: "Spanish Content (Optional)",
    fillBoth: "Tip: Fill both tabs so the language toggle works for your staff!",
    missingTrans: "No Spanish translation available.",
    allergens: "Allergens",
    shelfLife: "Shelf Life",
    yield: "Yield",
    uploadPhoto: "Upload Photo",
    photoUploading: "Uploading...",
    madeToday: "Made Today?",
    goodUntil: "Good Until:",
    shelfLifePlaceholder: "e.g., 5 days, 1 week",
    yieldPlaceholder: "e.g., 2 Gallons, 4 Pans",
    signOut: "Sign Out App",
    prepRecipes: "Prep Recipes",
    lineBuilds: "Line Builds",
    prepTime: "Time to Make",
    prepTimePlaceholder: "e.g., 5 mins, 1 hr",
    cqp: "Critical Quality Points",
    cqpPlaceholder: "e.g., Make sure bread is toasted..."
  },
  es: {
    searchPlaceholder: "Buscar recetas...",
    all: "Todos",
    ingredients: "Ingredientes",
    instructions: "Instrucciones",
    back: "Atrás",
    adminMode: "Modo Admin",
    enterPin: "Ingresar PIN de Gerente",
    addPrepRecipe: "Agregar Receta",
    addLineBuild: "Agregar Montaje",
    editRecipe: "Editar Receta",
    deleteRecipe: "Borrar",
    title: "Título de la Receta",
    category: "Etiquetas / Categorías",
    pasteIngredients: "Ingredientes",
    pasteInstructions: "Instrucciones",
    save: "Guardar Receta",
    cancel: "Cancelar",
    confirmDelete: "¿Estás seguro de borrar esto?",
    screenLockActive: "Pantalla Encendida",
    screenLockInactive: "Pantalla Normal",
    manageTags: "Gestionar Etiquetas",
    addTag: "Agregar Etiqueta",
    englishContent: "Contenido en Inglés",
    spanishContent: "Contenido en Español (Opcional)",
    fillBoth: "Consejo: ¡Llene ambas pestañas para el cambio de idioma!",
    missingTrans: "Traducción no disponible.",
    allergens: "Alérgenos",
    shelfLife: "Vida Útil",
    yield: "Rendimiento",
    uploadPhoto: "Subir Foto",
    photoUploading: "Subiendo...",
    madeToday: "¿Hecho Hoy?",
    goodUntil: "Bueno Hasta:",
    shelfLifePlaceholder: "ej., 5 días, 1 semana",
    yieldPlaceholder: "ej., 2 Galones, 4 Bandejas",
    signOut: "Cerrar Sesión",
    prepRecipes: "Recetas de Prep",
    lineBuilds: "Montaje de Línea",
    prepTime: "Tiempo de Prep",
    prepTimePlaceholder: "ej., 5 min, 1 hr",
    cqp: "Puntos Críticos de Calidad",
    cqpPlaceholder: "ej., Asegúrese de que el pan esté tostado..."
  }
};

const DEFAULT_PREP_CATEGORIES = ["Sauce", "Meat", "Side", "Dessert", "Prep", "Appetizer", "Special"];
const DEFAULT_BUILD_CATEGORIES = ["Appetizer", "Sandwich", "House Favorite", "Salad", "Fryer", "Oven"];

const ALLERGEN_LIST = [
  { id: 'gluten', label: 'Gluten', icon: '🍞' },
  { id: 'dairy', label: 'Dairy', icon: '🥛' },
  { id: 'egg', label: 'Egg', icon: '🥚' },
  { id: 'soy', label: 'Soy', icon: '🌱' },
  { id: 'nuts', label: 'Nuts', icon: '🥜' },
  { id: 'shellfish', label: 'Shellfish', icon: '🦐' },
];

export default function KitchenApp() {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [recipes, setRecipes] = useState([]);
  
  // Tag categories split by type
  const [categories, setCategories] = useState({
    prep: DEFAULT_PREP_CATEGORIES,
    build: DEFAULT_BUILD_CATEGORIES
  });
  
  // UI State
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [language, setLanguage] = useState('en'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewType, setViewType] = useState('prep'); // 'prep' or 'build'
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  
  // Form State
  const [editTab, setEditTab] = useState('en');
  const [formData, setFormData] = useState({
    title: '',
    type: 'prep',
    categories: [], 
    ingredientsEn: '',
    instructionsEn: '',
    ingredientsEs: '',
    instructionsEs: '',
    yield: '',
    shelfLife: '',
    prepTime: '',
    cqpEn: '',
    cqpEs: '',
    allergens: [],
    imageUrl: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Wake Lock & Full Screen
  const [wakeLock, setWakeLock] = useState(null);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const t = TRANSLATIONS[language];

  // Helper for current active categories based on view or form type
  const currentViewCategories = viewType === 'prep' ? categories.prep : categories.build;
  const currentFormCategories = formData.type === 'prep' ? categories.prep : categories.build;

  // --- AUTH SETUP ---
  useEffect(() => {
    if (!auth) {
      setIsAuthReady(true);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (e) {
        console.warn("Custom token bypass skipped.");
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true); 
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) {
      console.error(err);
      setLoginError('Invalid email or password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out of the kitchen display?")) {
      await signOut(auth);
      setIsAdmin(false);
      setSelectedRecipe(null);
    }
  };

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user || !db) return;

    // Fetch Recipes
    const qRecipes = query(collection(db, 'artifacts', appId, 'public', 'data', 'recipes'));
    const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        let normCats = [];
        if (Array.isArray(d.categories)) normCats = d.categories;
        else if (d.category) normCats = [d.category];
        return { id: doc.id, ...d, categories: normCats, type: d.type || 'prep' };
      });
      data.sort((a, b) => a.title.localeCompare(b.title));
      setRecipes(data);
    }, (error) => console.error("Error fetching recipes:", error));

    // Fetch Categories
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories');
    const unsubCategories = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.prep || data.build) {
          setCategories({
            prep: data.prep || DEFAULT_PREP_CATEGORIES,
            build: data.build || DEFAULT_BUILD_CATEGORIES
          });
        } else if (data.list) {
          // Fallback for legacy categories format
          setCategories({
            prep: data.list,
            build: DEFAULT_BUILD_CATEGORIES
          });
        }
      }
    });

    return () => {
      unsubRecipes();
      unsubCategories();
    };
  }, [user]);

  // --- WAKE LOCK ---
  useEffect(() => {
    if ('wakeLock' in navigator) setWakeLockSupported(true);
  }, []);

  const requestWakeLock = async () => {
    if (!wakeLockSupported) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      setWakeLock(lock);
      lock.addEventListener('release', () => setWakeLock(null));
    } catch (err) { 
      if (err.name === 'NotAllowedError') setWakeLockSupported(false);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
    }
  };

  useEffect(() => {
    selectedRecipe ? requestWakeLock() : releaseWakeLock();
    return () => releaseWakeLock();
  }, [selectedRecipe]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // --- ACTIONS ---
  const handleAdminLogin = () => {
    if (pinInput === '6610') { 
      setIsAdmin(true);
      setShowPinModal(false);
      setPinInput('');
    } else {
      alert("Incorrect PIN");
      setPinInput('');
    }
  };

  const uploadImage = async (file) => {
    if (!file || !storage) return null;
    const storageRef = ref(storage, `artifacts/${appId}/images/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSaveRecipe = async () => {
    if (!formData.title || !db) return;
    setIsUploading(true);

    try {
      let finalImageUrl = formData.imageUrl;
      if (imageFile) finalImageUrl = await uploadImage(imageFile);

      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'recipes');
      const catsToSave = formData.categories.length > 0 ? formData.categories : [currentFormCategories[0]];

      const dataToSave = {
        title: formData.title,
        type: formData.type || 'prep',
        categories: catsToSave,
        category: catsToSave[0], // Legacy field
        ingredientsEn: formData.ingredientsEn,
        instructionsEn: formData.instructionsEn,
        ingredientsEs: formData.ingredientsEs,
        instructionsEs: formData.instructionsEs,
        ingredients: formData.ingredientsEn, // Legacy field
        instructions: formData.instructionsEn, // Legacy field
        yield: formData.yield || '',
        shelfLife: formData.shelfLife || '',
        prepTime: formData.prepTime || '',
        cqpEn: formData.cqpEn || '',
        cqpEs: formData.cqpEs || '',
        allergens: formData.allergens || [],
        imageUrl: finalImageUrl || '',
        updatedAt: new Date()
      };

      // Clean up fields for line builds so we don't save empty data for things they don't use
      if (dataToSave.type === 'build') {
        dataToSave.yield = '';
        dataToSave.shelfLife = '';
      }

      if (editingRecipe) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', editingRecipe.id), dataToSave);
      } else {
        await addDoc(collectionRef, { ...dataToSave, createdAt: new Date() });
      }
      closeModal();
    } catch (e) {
      console.error("Error saving:", e);
      alert("Error saving.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (window.confirm(t.confirmDelete) && db) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id));
      if (selectedRecipe?.id === id) setSelectedRecipe(null);
    }
  };

  // Tag Management
  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const targetList = viewType === 'prep' ? categories.prep : categories.build;
    const newList = [...targetList, newTagInput.trim()];
    
    await saveCategories(
      viewType === 'prep' ? newList : categories.prep,
      viewType === 'build' ? newList : categories.build
    );
    setNewTagInput('');
  };

  const handleDeleteTag = async (tagToDelete) => {
    if (window.confirm(`Delete tag "${tagToDelete}"?`)) {
      const targetList = viewType === 'prep' ? categories.prep : categories.build;
      const newList = targetList.filter(c => c !== tagToDelete);
      
      await saveCategories(
        viewType === 'prep' ? newList : categories.prep,
        viewType === 'build' ? newList : categories.build
      );
    }
  };

  const saveCategories = async (newPrep, newBuild) => {
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories');
    await setDoc(settingsRef, { prep: newPrep, build: newBuild, list: newPrep });
  };

  // --- CALCULATORS ---
  const calculateExpiryDate = (shelfLifeString) => {
    if (!shelfLifeString) return null;
    const match = shelfLifeString.match(/(\d+)/);
    if (!match) return null;
    const number = parseInt(match[0]);
    const today = new Date();
    const lower = shelfLifeString.toLowerCase();
    let daysToAdd = number;
    if (lower.includes('week')) daysToAdd = number * 7;
    else if (lower.includes('month')) daysToAdd = number * 30;
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysToAdd);
    return futureDate.toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // --- MODAL HANDLERS ---
  const openAddModal = () => {
    setEditingRecipe(null);
    setEditTab('en');
    setImageFile(null);
    setFormData({
      title: '', type: viewType, categories: [currentViewCategories[0]], ingredientsEn: '', instructionsEn: '',
      ingredientsEs: '', instructionsEs: '', yield: '', shelfLife: '', prepTime: '', cqpEn: '', cqpEs: '', allergens: [], imageUrl: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (recipe) => {
    setEditingRecipe(recipe);
    setEditTab('en');
    setImageFile(null);
    setFormData({ 
      title: recipe.title, type: recipe.type || 'prep', categories: recipe.categories || [recipe.category] || [],
      ingredientsEn: recipe.ingredientsEn || recipe.ingredients || '', instructionsEn: recipe.instructionsEn || recipe.instructions || '', 
      ingredientsEs: recipe.ingredientsEs || '', instructionsEs: recipe.instructionsEs || '',
      yield: recipe.yield || '', shelfLife: recipe.shelfLife || '', prepTime: recipe.prepTime || '', cqpEn: recipe.cqpEn || '', cqpEs: recipe.cqpEs || '', allergens: recipe.allergens || [], imageUrl: recipe.imageUrl || ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingRecipe(null);
    setImageFile(null);
  };

  const toggleAllergen = (id) => {
    setFormData(prev => {
      const current = prev.allergens || [];
      return current.includes(id) ? { ...prev, allergens: current.filter(a => a !== id) } : { ...prev, allergens: [...current, id] };
    });
  };

  const toggleCategory = (cat) => {
    setFormData(prev => {
      const current = prev.categories || [];
      if (current.includes(cat)) {
        if (current.length === 1) return prev; 
        return { ...prev, categories: current.filter(c => c !== cat) };
      } else {
        return { ...prev, categories: [...current, cat] };
      }
    });
  };

  // --- RENDER HELPERS ---
  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (r.categories && r.categories.includes(selectedCategory));
    const matchesType = (r.type || 'prep') === viewType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getDisplayContent = (recipe) => {
    if (language === 'es') {
      return {
        ing: recipe.ingredientsEs || recipe.ingredientsEn || recipe.ingredients || t.missingTrans,
        inst: recipe.instructionsEs || recipe.instructionsEn || recipe.instructions || t.missingTrans,
        cqp: recipe.cqpEs || recipe.cqpEn || recipe.cqp || "",
      };
    }
    return {
      ing: recipe.ingredientsEn || recipe.ingredients || "",
      inst: recipe.instructionsEn || recipe.instructions || "",
      cqp: recipe.cqpEn || recipe.cqp || "",
    };
  };

  // --- RENDER: SETUP REQUIRED ---
  if (!db) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
              <AlertTriangle className="text-orange-500 h-16 w-16 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Setup Required</h1>
              <p className="max-w-md text-slate-600 mb-6">
                  The app is waiting for your Firebase keys. 
                  <br/>
                  If you are seeing this on <b>Vercel</b>, please go to Settings &rarr; Environment Variables and add your keys.
              </p>
          </div>
      );
  }

  // --- RENDER: LOADING AUTH ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <ChefHat className="h-12 w-12 text-orange-400 animate-pulse" />
      </div>
    );
  }

  // --- RENDER: LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-slate-800">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-orange-100 p-4 rounded-full mb-4">
              <ChefHat className="h-12 w-12 text-orange-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">The Switch Recipes</h1>
            <p className="text-slate-500 text-sm">Kitchen Display Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-200 text-center">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg shadow transition disabled:opacity-70"
            >
              {isLoggingIn ? "Logging in..." : "Access Kitchen System"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN APP ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 w-full">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="w-full px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-orange-400" />
            <div>
              <h1 className="text-xl font-bold leading-none">The Switch<span className="text-orange-400">Recipes</span></h1>
              <p className="text-xs text-slate-400">Kitchen Display System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={toggleFullScreen} className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white hidden md:block">
              {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={() => setLanguage(l => l === 'en' ? 'es' : 'en')} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-700">
              <Languages size={16} className="text-orange-400" />
              {language === 'en' ? 'Español' : 'English'}
            </button>
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTagModal(true)} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 text-slate-300 transition" title={t.manageTags}>
                  <Tag size={16} />
                </button>
                <button onClick={handleSignOut} className="bg-red-900 text-red-100 p-2 rounded-full hover:bg-red-800 transition" title={t.signOut}>
                  <LogOut size={16} />
                </button>
                <button onClick={() => setIsAdmin(false)} className="bg-green-600 px-3 py-1.5 rounded-full text-sm font-bold shadow hover:bg-green-500 flex items-center gap-2">
                  <Unlock size={16} />
                </button>
              </div>
            ) : (
               <button onClick={() => setShowPinModal(true)} className="bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-slate-700 transition flex items-center gap-2">
                 <Lock size={16} />
               </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="w-full p-4 md:p-6">
        
        {selectedRecipe ? (
          // === DETAIL VIEW ===
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setSelectedRecipe(null)} className="flex items-center gap-2 bg-white border border-slate-300 px-6 py-3 rounded-xl shadow-sm text-lg font-bold hover:bg-slate-100 active:scale-95 transition">
                <ArrowLeft /> {t.back}
              </button>

              <div className="flex items-center gap-2">
                {wakeLock ? (
                  <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-200">
                    <Sun size={14} /> {t.screenLockActive}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-slate-400 px-3 py-1 text-xs">{t.screenLockInactive}</span>
                )}
                {isAdmin && (
                  <>
                    <button onClick={() => { setSelectedRecipe(null); openEditModal(selectedRecipe); }} className="bg-blue-100 text-blue-700 p-3 rounded-lg hover:bg-blue-200">{t.editRecipe}</button>
                    <button onClick={() => handleDeleteRecipe(selectedRecipe.id)} className="bg-red-100 text-red-700 p-3 rounded-lg hover:bg-red-200"><Trash2 size={20} /></button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
              <div className="bg-orange-500 p-6 text-white relative">
                 <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                    {selectedRecipe.imageUrl && (
                      <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} className="w-full md:w-48 h-48 object-cover rounded-xl shadow-lg border-4 border-white/30" />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedRecipe.categories && selectedRecipe.categories.map(cat => (
                          <span key={cat} className="bg-black/20 px-3 py-1 rounded-full text-sm font-bold">
                            {cat}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
                        {selectedRecipe.title}
                      </h2>
                      
                      {/* Meta Info Bar */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        {selectedRecipe.prepTime && (
                          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                            <Timer size={18} />
                            <span className="font-bold text-sm">{t.prepTime}: {selectedRecipe.prepTime}</span>
                          </div>
                        )}
                        {selectedRecipe.type === 'prep' && selectedRecipe.yield && (
                          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                            <Scale size={18} />
                            <span className="font-bold text-sm">{t.yield}: {selectedRecipe.yield}</span>
                          </div>
                        )}
                        {selectedRecipe.type === 'prep' && selectedRecipe.shelfLife && (
                          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                            <Clock size={18} />
                            <div className="flex flex-col leading-none">
                              <span className="font-bold text-sm">{t.shelfLife}: {selectedRecipe.shelfLife}</span>
                              {calculateExpiryDate(selectedRecipe.shelfLife) && (
                                <span className="text-[10px] opacity-90">{t.madeToday} → {t.goodUntil} {calculateExpiryDate(selectedRecipe.shelfLife)}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Allergen Badges */}
                      {selectedRecipe.allergens && selectedRecipe.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {selectedRecipe.allergens.map(algId => {
                             const alg = ALLERGEN_LIST.find(a => a.id === algId);
                             if (!alg) return null;
                             return (
                               <span key={algId} className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold shadow-sm border border-red-400">
                                 <AlertTriangle size={12} /> {alg.icon} {alg.label}
                               </span>
                             )
                          })}
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              <div className="grid md:grid-cols-12 gap-0">
                {selectedRecipe.type === 'build' && getDisplayContent(selectedRecipe).cqp && (
                  <div className="md:col-span-12 p-6 md:p-8 bg-orange-50 border-b border-orange-100">
                    <h3 className="text-lg font-bold text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <AlertTriangle size={20} /> {t.cqp}
                    </h3>
                    <div className="prose prose-lg prose-orange whitespace-pre-line text-orange-900 font-medium leading-relaxed">
                      {getDisplayContent(selectedRecipe).cqp}
                    </div>
                  </div>
                )}
                <div className="md:col-span-4 bg-slate-50 p-6 md:p-8 border-r border-slate-200">
                  <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    {t.ingredients}
                  </h3>
                  <div className="prose prose-lg prose-slate whitespace-pre-line text-slate-700 font-medium leading-relaxed">
                    {getDisplayContent(selectedRecipe).ing}
                  </div>
                </div>

                <div className="md:col-span-8 p-6 md:p-8 bg-white">
                  <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    {t.instructions}
                  </h3>
                  <div className="prose prose-xl prose-slate whitespace-pre-line text-slate-800 leading-loose">
                    {getDisplayContent(selectedRecipe).inst}
                  </div>
                </div>
              </div>
            </div>
          </div>

        ) : (
          // === LIST VIEW ===
          <div className="space-y-6 pb-20">
            
            {/* RECIPE TYPE TABS */}
            <div className="flex bg-slate-200/70 p-1.5 rounded-2xl mb-2">
              <button 
                onClick={() => { setViewType('prep'); setSelectedCategory('All'); }}
                className={`flex-1 py-3 rounded-xl font-black text-sm md:text-base transition-all duration-200 ${
                  viewType === 'prep' 
                  ? 'bg-white shadow-md text-orange-600 scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.prepRecipes}
              </button>
              <button 
                onClick={() => { setViewType('build'); setSelectedCategory('All'); }}
                className={`flex-1 py-3 rounded-xl font-black text-sm md:text-base transition-all duration-200 ${
                  viewType === 'build' 
                  ? 'bg-white shadow-md text-orange-600 scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.lineBuilds}
              </button>
            </div>

            {/* Search Bar ... */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-12 py-4 text-xl rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
                {searchQuery.length > 0 && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 bg-slate-200 hover:bg-slate-300 rounded-full transition"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition ${
                    selectedCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.all}
                </button>
                {currentViewCategories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {isAdmin && (
              <button onClick={openAddModal} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-md flex items-center justify-center gap-2 transition">
                <Plus size={24} /> {viewType === 'prep' ? t.addPrepRecipe : t.addLineBuild}
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-300 hover:-translate-y-1 transition duration-200 text-left flex flex-col h-64 justify-between overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {/* Show up to 2 categories on the card to save space */}
                          {recipe.categories && recipe.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                              {cat}
                            </span>
                          ))}
                          {recipe.categories && recipe.categories.length > 2 && (
                            <span className="text-xs font-bold text-orange-300">+</span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 group-hover:text-orange-600 leading-tight line-clamp-2">{recipe.title}</h3>
                    </div>
                    {recipe.imageUrl && <img src={recipe.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover ml-2 bg-slate-100" />}
                  </div>
                  
                  <div className="mt-auto space-y-2">
                     {/* Badge Row */}
                     <div className="flex flex-wrap gap-1">
                        {recipe.type === 'prep' && recipe.yield && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{t.yield}: {recipe.yield}</span>}
                        {recipe.allergens && recipe.allergens.length > 0 && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                             <AlertTriangle size={10} /> {recipe.allergens.length}
                          </span>
                        )}
                     </div>

                     <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex gap-2">
                            {recipe.ingredientsEs && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">ES</span>}
                            {recipe.ingredientsEn && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">EN</span>}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-600 transition">
                            <Maximize2 size={16} />
                        </div>
                     </div>
                  </div>
                </button>
              ))}
              
              {filteredRecipes.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <p className="text-xl">No {viewType === 'prep' ? 'prep recipes' : 'line builds'} found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}
      
      {/* 1. PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-4 text-center">{t.enterPin}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }}>
              <input 
                type="password" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                autoComplete="new-password" 
                name="admin_pin_code"
                value={pinInput} 
                onChange={(e) => setPinInput(e.target.value)} 
                className="w-full text-center text-4xl tracking-widest p-4 border-2 border-slate-200 rounded-xl mb-6 focus:border-orange-500 focus:outline-none font-mono" 
                placeholder="••••" 
                autoFocus 
              />
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => { setShowPinModal(false); setPinInput(''); }} className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">{t.cancel}</button>
                <button type="submit" className="py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. TAG MANAGER Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{t.manageTags} ({viewType === 'prep' ? 'Prep' : 'Build'})</h3>
                <button onClick={() => setShowTagModal(false)}><X /></button>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input 
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="flex-1 border p-2 rounded-lg"
                  placeholder={t.addTag}
                />
                <button 
                  onClick={handleAddTag}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold"
                >
                  <Plus />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {currentViewCategories.map(cat => (
                  <div key={cat} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-medium">{cat}</span>
                    <button onClick={() => handleDeleteTag(cat)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* 3. ADD/EDIT RECIPE Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{editingRecipe ? t.editRecipe : (viewType === 'prep' ? t.addPrepRecipe : t.addLineBuild)}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Image Upload Area */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                 {formData.imageUrl && !imageFile && (
                   <div className="mb-4 relative inline-block">
                     <img src={formData.imageUrl} alt="Preview" className="h-32 rounded-lg shadow-sm" />
                     <button onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12}/></button>
                   </div>
                 )}
                 <label className="cursor-pointer block">
                    <div className="flex flex-col items-center gap-2 text-slate-500 hover:text-orange-500 transition">
                       <Camera size={32} />
                       <span className="font-bold text-sm">{imageFile ? imageFile.name : t.uploadPhoto}</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files[0])} />
                 </label>
              </div>

              {/* Title & Category (Multi-select) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.title}</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-bold text-lg" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.category}</label>
                  <div className="flex flex-wrap gap-2">
                    {currentFormCategories.map(cat => (
                       <button 
                         key={cat}
                         onClick={() => toggleCategory(cat)}
                         className={`px-3 py-2 rounded-lg border text-sm font-bold flex items-center gap-2 transition ${
                           formData.categories.includes(cat) 
                           ? 'bg-orange-500 border-orange-600 text-white shadow-md' 
                           : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                         }`}
                       >
                         {formData.categories.includes(cat) && <Check size={14} />} {cat}
                       </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Yield & Shelf Life & Prep Time */}
              <div className={`grid grid-cols-1 gap-4 ${formData.type === 'prep' ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
                 {formData.type === 'prep' && (
                   <>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.yield}</label>
                        <input type="text" placeholder={t.yieldPlaceholder} value={formData.yield} onChange={e => setFormData({...formData, yield: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.shelfLife}</label>
                        <input type="text" placeholder={t.shelfLifePlaceholder} value={formData.shelfLife} onChange={e => setFormData({...formData, shelfLife: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg" />
                     </div>
                   </>
                 )}
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.prepTime}</label>
                    <input type="text" placeholder={t.prepTimePlaceholder} value={formData.prepTime} onChange={e => setFormData({...formData, prepTime: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg" />
                 </div>
              </div>

              {/* Allergens */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.allergens}</label>
                 <div className="flex flex-wrap gap-2">
                    {ALLERGEN_LIST.map(alg => (
                       <button 
                         key={alg.id}
                         onClick={() => toggleAllergen(alg.id)}
                         className={`px-3 py-2 rounded-lg border text-sm font-bold flex items-center gap-2 transition ${
                           formData.allergens.includes(alg.id) 
                           ? 'bg-red-50 border-red-500 text-red-600' 
                           : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                         }`}
                       >
                         <span>{alg.icon}</span> {alg.label}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Languages (Ingredients/Instructions) */}
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                <button onClick={() => setEditTab('en')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${editTab === 'en' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:bg-slate-200'}`}>🇺🇸 English</button>
                <button onClick={() => setEditTab('es')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${editTab === 'es' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:bg-slate-200'}`}>🇲🇽 Español</button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                {editTab === 'en' ? (
                  <div className="space-y-4">
                    {formData.type === 'build' && (
                       <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.cqp} (EN)</label>
                         <textarea value={formData.cqpEn} onChange={e => setFormData({...formData, cqpEn: e.target.value})} className="w-full p-3 border border-orange-200 bg-orange-50/50 rounded-lg h-20 font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" placeholder={t.cqpPlaceholder} />
                       </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.pasteIngredients} (EN)</label>
                      <textarea value={formData.ingredientsEn} onChange={e => setFormData({...formData, ingredientsEn: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg h-32 font-mono text-sm" placeholder="Paste English ingredients..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.pasteInstructions} (EN)</label>
                      <textarea value={formData.instructionsEn} onChange={e => setFormData({...formData, instructionsEn: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg h-32 font-mono text-sm" placeholder="Paste English instructions..." />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.type === 'build' && (
                       <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.cqp} (ES)</label>
                         <textarea value={formData.cqpEs} onChange={e => setFormData({...formData, cqpEs: e.target.value})} className="w-full p-3 border border-orange-200 bg-orange-50/50 rounded-lg h-20 font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" placeholder={t.cqpPlaceholder} />
                       </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.pasteIngredients} (ES)</label>
                      <textarea value={formData.ingredientsEs} onChange={e => setFormData({...formData, ingredientsEs: e.target.value})} className="w-full p-3 border border-blue-200 bg-blue-50/50 rounded-lg h-32 font-mono text-sm" placeholder="Pegar ingredientes en Español..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.pasteInstructions} (ES)</label>
                      <textarea value={formData.instructionsEs} onChange={e => setFormData({...formData, instructionsEs: e.target.value})} className="w-full p-3 border border-blue-200 bg-blue-50/50 rounded-lg h-32 font-mono text-sm" placeholder="Pegar instrucciones en Español..." />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={closeModal} className="px-6 py-3 rounded-lg font-bold text-slate-600 hover:bg-white border border-transparent hover:border-slate-200">{t.cancel}</button>
              <button onClick={handleSaveRecipe} disabled={isUploading} className="px-6 py-3 rounded-lg font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-md flex items-center gap-2">
                {isUploading ? t.photoUploading : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
