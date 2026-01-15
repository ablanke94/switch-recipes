import React, { useState, useEffect } from 'react';
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
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
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
  Tag
} from 'lucide-react';

// --- FIREBASE SETUP ---
// PASTE YOUR KEYS FROM FIREBASE CONSOLE HERE:
const firebaseConfig = {
  apiKey: "AIzaSyAvO-hM3lnpoTUODUCvD2nzZUCzgeiNHCo",
  authDomain: "switch-recipes.firebaseapp.com",
  projectId: "switch-recipes",
  storageBucket: "switch-recipes.firebasestorage.app",
  messagingSenderId: "430127530890",
  appId: "1:430127530890:web:b3bc426df11b082ef47e73"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// This stays hardcoded for your standalone app
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
    addRecipe: "Add Recipe",
    editRecipe: "Edit Recipe",
    deleteRecipe: "Delete Recipe",
    title: "Recipe Title",
    category: "Category",
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
    missingTrans: "No Spanish translation available."
  },
  es: {
    searchPlaceholder: "Buscar recetas...",
    all: "Todos",
    ingredients: "Ingredientes",
    instructions: "Instrucciones",
    back: "Atrás",
    adminMode: "Modo Admin",
    enterPin: "Ingresar PIN de Gerente",
    addRecipe: "Agregar Receta",
    editRecipe: "Editar Receta",
    deleteRecipe: "Borrar Receta",
    title: "Título de la Receta",
    category: "Categoría",
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
    fillBoth: "Consejo: ¡Llene ambas pestañas para que el cambio de idioma funcione!",
    missingTrans: "Traducción no disponible."
  }
};

const DEFAULT_CATEGORIES = ["Sauce", "Meat", "Side", "Dessert", "Prep"];

export default function KitchenApp() {
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  
  // UI State
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [language, setLanguage] = useState('en'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  
  // Form State (Bilingual)
  const [editTab, setEditTab] = useState('en'); // 'en' or 'es' tab in the modal
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    ingredientsEn: '',
    instructionsEn: '',
    ingredientsEs: '',
    instructionsEs: ''
  });
  const [newTagInput, setNewTagInput] = useState('');

  // Wake Lock & Full Screen
  const [wakeLock, setWakeLock] = useState(null);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const t = TRANSLATIONS[language];

  // --- AUTH ---
  useEffect(() => {
    const initAuth = async () => {
       await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user) return;

    // 1. Fetch Recipes
    const qRecipes = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'recipes'),
      orderBy('createdAt', 'desc')
    );
    const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes(data);
    }, (error) => {
      console.error("Error fetching recipes:", error);
    });

    // 2. Fetch Categories (Settings)
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories');
    const unsubCategories = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const list = docSnap.data().list;
        if (list && Array.isArray(list)) {
          setCategories(list);
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
    } catch (err) { console.error(err); }
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
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        console.warn("Full screen error:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
             setIsFullScreen(false);
        });
      }
    }
  };

  // --- ACTIONS ---

  const handleAdminLogin = () => {
    if (pinInput === '1234') { 
      setIsAdmin(true);
      setShowPinModal(false);
      setPinInput('');
    } else {
      alert("Incorrect PIN");
      setPinInput('');
    }
  };

  const handleSaveRecipe = async () => {
    if (!formData.title) return;

    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'recipes');
    const dataToSave = {
      title: formData.title,
      category: formData.category || categories[0],
      ingredientsEn: formData.ingredientsEn,
      instructionsEn: formData.instructionsEn,
      ingredientsEs: formData.ingredientsEs,
      instructionsEs: formData.instructionsEs,
      ingredients: formData.ingredientsEn, 
      instructions: formData.instructionsEn,
      updatedAt: new Date()
    };

    try {
      if (editingRecipe) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', editingRecipe.id), dataToSave);
      } else {
        await addDoc(collectionRef, { ...dataToSave, createdAt: new Date() });
      }
      closeModal();
    } catch (e) {
      console.error("Error saving:", e);
      alert("Error saving.");
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (window.confirm(t.confirmDelete)) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id));
      if (selectedRecipe?.id === id) setSelectedRecipe(null);
    }
  };

  // Tag Management
  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const newCategories = [...categories, newTagInput.trim()];
    await saveCategories(newCategories);
    setNewTagInput('');
  };

  const handleDeleteTag = async (tagToDelete) => {
    if (window.confirm(`Delete tag "${tagToDelete}"?`)) {
      const newCategories = categories.filter(c => c !== tagToDelete);
      await saveCategories(newCategories);
    }
  };

  const saveCategories = async (newList) => {
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories');
    await setDoc(settingsRef, { list: newList });
  };

  // --- MODAL HANDLERS ---

  const openAddModal = () => {
    setEditingRecipe(null);
    setEditTab('en');
    setFormData({
      title: '',
      category: categories[0] || 'Sauce',
      ingredientsEn: '',
      instructionsEn: '',
      ingredientsEs: '',
      instructionsEs: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (recipe) => {
    setEditingRecipe(recipe);
    setEditTab('en');
    setFormData({ 
      title: recipe.title, 
      category: recipe.category, 
      ingredientsEn: recipe.ingredientsEn || recipe.ingredients || '', 
      instructionsEn: recipe.instructionsEn || recipe.instructions || '', 
      ingredientsEs: recipe.ingredientsEs || '', 
      instructionsEs: recipe.instructionsEs || '' 
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingRecipe(null);
  };

  // --- RENDER HELPERS ---

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDisplayContent = (recipe) => {
    if (language === 'es') {
      return {
        ing: recipe.ingredientsEs || recipe.ingredientsEn || recipe.ingredients || t.missingTrans,
        inst: recipe.instructionsEs || recipe.instructionsEn || recipe.instructions || t.missingTrans,
        isFallback: !recipe.ingredientsEs
      };
    }
    return {
      ing: recipe.ingredientsEn || recipe.ingredients || "",
      inst: recipe.instructionsEn || recipe.instructions || "",
      isFallback: false
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-orange-400" />
            <div>
              <h1 className="text-xl font-bold leading-none">The Switch<span className="text-orange-400">Recipes</span></h1>
              <p className="text-xs text-slate-400">Kitchen Display System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleFullScreen}
              className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition hidden md:block"
              title="Toggle Full Screen"
            >
              {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            <button 
              onClick={() => setLanguage(l => l === 'en' ? 'es' : 'en')}
              className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-slate-700 transition border border-slate-700"
            >
              <Languages size={16} className="text-orange-400" />
              {language === 'en' ? 'Español' : 'English'}
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowTagModal(true)}
                  className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 text-slate-300"
                  title="Manage Tags"
                >
                  <Tag size={16} />
                </button>
                <button 
                  onClick={() => setIsAdmin(false)}
                  className="flex items-center gap-2 bg-green-600 px-3 py-1.5 rounded-full text-sm font-bold shadow hover:bg-green-500"
                >
                  <Unlock size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowPinModal(true)}
                className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-slate-700 transition"
              >
                <Lock size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        
        {selectedRecipe ? (
          // === DETAIL VIEW ===
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setSelectedRecipe(null)}
                className="flex items-center gap-2 bg-white border border-slate-300 px-6 py-3 rounded-xl shadow-sm text-lg font-bold hover:bg-slate-100 active:scale-95 transition"
              >
                <ArrowLeft />
                {t.back}
              </button>

              <div className="flex items-center gap-2">
                {wakeLock ? (
                  <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-200">
                    <Sun size={14} /> {t.screenLockActive}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-slate-400 px-3 py-1 text-xs">
                     {t.screenLockInactive}
                  </span>
                )}
                
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => { setSelectedRecipe(null); openEditModal(selectedRecipe); }}
                      className="bg-blue-100 text-blue-700 p-3 rounded-lg hover:bg-blue-200"
                    >
                      {t.editRecipe}
                    </button>
                    <button 
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                      className="bg-red-100 text-red-700 p-3 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
              <div className="bg-orange-500 p-6 text-white relative overflow-hidden">
                 <div className="relative z-10">
                    <span className="inline-block bg-black/20 px-3 py-1 rounded-full text-sm font-bold mb-2">
                      {selectedRecipe.category}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
                      {selectedRecipe.title}
                    </h2>
                    {language === 'es' && !selectedRecipe.ingredientsEs && (
                      <p className="mt-2 text-orange-100 text-sm italic opacity-80">
                        * Mostrando versión en inglés (traducción no disponible)
                      </p>
                    )}
                 </div>
                 <ChefHat className="absolute -right-6 -bottom-6 text-orange-600 w-48 h-48 opacity-20 rotate-12" />
              </div>

              <div className="grid md:grid-cols-12 gap-0">
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
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-4 py-4 text-xl rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition ${
                    selectedCategory === 'All' 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.all}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition ${
                      selectedCategory === cat 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {isAdmin && (
              <button 
                onClick={openAddModal}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-md flex items-center justify-center gap-2 transition"
              >
                <Plus size={24} />
                {t.addRecipe}
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-300 hover:-translate-y-1 transition duration-200 text-left flex flex-col h-48 justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 block">
                      {recipe.category}
                    </span>
                    <h3 className="text-2xl font-black text-slate-800 group-hover:text-orange-600 leading-tight">
                      {recipe.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                     <div className="flex gap-2">
                        {recipe.ingredientsEs && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">ES</span>}
                        {recipe.ingredientsEn && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">EN</span>}
                     </div>
                     <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-600 transition">
                        <Maximize2 size={16} />
                     </div>
                  </div>
                </button>
              ))}
              
              {filteredRecipes.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <p className="text-xl">No recipes found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* 1. PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-4 text-center">{t.enterPin}</h2>
            <input 
              type="password" 
              inputMode="numeric" 
              pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-4xl tracking-widest p-4 border-2 border-slate-200 rounded-xl mb-6 focus:border-orange-500 focus:outline-none font-mono"
              placeholder="••••"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setShowPinModal(false); setPinInput(''); }}
                className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleAdminLogin}
                className="py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800"
              >
                Unlock
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-6">Default PIN: 1234</p>
          </div>
        </div>
      )}

      {/* 2. TAG MANAGER Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{t.manageTags}</h3>
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
                {categories.map(cat => (
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{editingRecipe ? t.editRecipe : t.addRecipe}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.title}</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold text-lg"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.category}</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language Tabs */}
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mt-4">
                <button 
                  onClick={() => setEditTab('en')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                    editTab === 'en' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  🇺🇸 English Content
                </button>
                <button 
                  onClick={() => setEditTab('es')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                    editTab === 'es' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  🇲🇽 Spanish Content
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 mb-3 font-medium text-center">{t.fillBoth}</p>
                {editTab === 'en' ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.pasteIngredients} (EN)</label>
                      <textarea 
                        value={formData.ingredientsEn}
                        onChange={e => setFormData({...formData, ingredientsEn: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg h-32 font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        placeholder="Paste English ingredients..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.pasteInstructions} (EN)</label>
                      <textarea 
                        value={formData.instructionsEn}
                        onChange={e => setFormData({...formData, instructionsEn: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg h-32 font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        placeholder="Paste English instructions..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.pasteIngredients} (ES)</label>
                      <textarea 
                        value={formData.ingredientsEs}
                        onChange={e => setFormData({...formData, ingredientsEs: e.target.value})}
                        className="w-full p-3 border border-blue-200 bg-blue-50/50 rounded-lg h-32 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Pegar ingredientes en Español..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.pasteInstructions} (ES)</label>
                      <textarea 
                        value={formData.instructionsEs}
                        onChange={e => setFormData({...formData, instructionsEs: e.target.value})}
                        className="w-full p-3 border border-blue-200 bg-blue-50/50 rounded-lg h-32 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Pegar instrucciones en Español..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={closeModal}
                className="px-6 py-3 rounded-lg font-bold text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleSaveRecipe}
                className="px-6 py-3 rounded-lg font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-md transition"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}