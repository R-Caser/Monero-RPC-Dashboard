// Sistema di Internazionalizzazione (i18n) - Dynamic Language Loader

// Migrazione codici lingua vecchi
function migrateLegacyLanguageCode() {
  const oldCode = localStorage.getItem('language');
  const migration = {
    'it': 'it-IT',
    'en': 'en-US',
    'es': 'es-ES'
  };
  
  if (oldCode && migration[oldCode]) {
    localStorage.setItem('language', migration[oldCode]);
    return migration[oldCode];
  }
  
  return oldCode || 'en-US';
}

// Lista delle lingue disponibili (caricata dinamicamente)
let availableLanguages = [];
let translations = {};
let currentLanguage = migrateLegacyLanguageCode();
const fallbackLanguage = 'en-US';

// Carica lista lingue disponibili
async function loadAvailableLanguages() {
  try {
    const response = await fetch('/api/i18n/languages');
    if (response.ok) {
      availableLanguages = await response.json();
    } else {
      // Fallback alle lingue di default se l'API non è disponibile
      availableLanguages = [
        { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
        { code: 'en-US', name: 'English', flag: '🇺🇸' }
      ];
    }
    return availableLanguages;
  } catch (error) {
    console.error('Error loading available languages:', error);
    // Fallback alle lingue di default
    availableLanguages = [
      { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
      { code: 'en-US', name: 'English', flag: '🇺🇸' }
    ];
    return availableLanguages;
  }
}

// Funzione di registrazione per i file di traduzione
function registerTranslation(langCode, translationData) {
  translations[langCode] = translationData;
}

// Carica file di traduzione
async function loadTranslation(langCode) {
  try {
    const script = document.createElement('script');
    script.src = `/i18n/${langCode}.js`;
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        if (translations[langCode]) {
          resolve(translations[langCode]);
          // Rimuovi lo script dopo il caricamento per evitare conflitti
          script.remove();
        } else {
          reject(new Error(`Translation not found in ${langCode}.js`));
        }
      };
      script.onerror = () => reject(new Error(`Failed to load ${langCode}.js`));
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error(`Error loading translation ${langCode}:`, error);
    throw error;
  }
}

// Funzione per ottenere una traduzione con fallback
function t(key) {
  // Prova con la lingua corrente
  if (translations[currentLanguage] && translations[currentLanguage][key]) {
    return translations[currentLanguage][key];
  }
  
  // Fallback alla lingua inglese
  if (translations[fallbackLanguage] && translations[fallbackLanguage][key]) {
    return translations[fallbackLanguage][key];
  }
  
  // Ritorna la chiave se non trova traduzione
  return key;
}

// Funzione per cambiare lingua
async function setLanguage(lang) {
  try {
    // Carica la traduzione se non è già in cache
    if (!translations[lang]) {
      await loadTranslation(lang);
    }
    
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updatePageLanguage();
  } catch (error) {
    console.error(`Failed to set language ${lang}:`, error);
    // Fallback all'inglese
    if (lang !== fallbackLanguage) {
      await setLanguage(fallbackLanguage);
    }
  }
}

// Funzione per ottenere la lingua corrente
function getCurrentLanguage() {
  return currentLanguage;
}

// Funzione per popolare il selettore di lingua
async function populateLanguageSelector() {
  const langSelect = document.getElementById('languageSelect');
  if (!langSelect) return;
  
  // Carica lingue disponibili
  await loadAvailableLanguages();
  
  // Pulisci opzioni esistenti
  langSelect.innerHTML = '';
  
  // Aggiungi opzioni per ogni lingua
  availableLanguages.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = `${lang.flag} ${lang.name}`;
    langSelect.appendChild(option);
  });
  
  // Imposta la lingua corrente
  langSelect.value = currentLanguage;
}

// Funzione per aggiornare tutti i testi della pagina
function updatePageLanguage() {
  // Aggiorna tutti gli elementi con attributo data-i18n
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);
    if (translation && translation !== key) {
      element.textContent = translation;
    }
  });
  
  // Aggiorna tutti i placeholder con attributo data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translation = t(key);
    if (translation && translation !== key) {
      element.placeholder = translation;
    }
  });
  
  // Aggiorna il selettore di lingua
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    langSelect.value = currentLanguage;
  }
  
  // Ricarica le configurazioni salvate (per aggiornare le traduzioni)
  const configPanel = document.getElementById('configPanel');
  if (configPanel && configPanel.style.display !== 'none' && typeof loadSavedConfigs === 'function') {
    loadSavedConfigs();
  }
}

// Inizializza il sistema i18n
async function initI18n() {
  try {
    // Carica la lingua di fallback (inglese)
    if (!translations[fallbackLanguage]) {
      await loadTranslation(fallbackLanguage);
    }
    
    // Carica la lingua corrente se diversa dal fallback
    if (currentLanguage !== fallbackLanguage && !translations[currentLanguage]) {
      await loadTranslation(currentLanguage);
    }
    
    // Popola il selettore di lingua
    await populateLanguageSelector();
    
    // Aggiorna la pagina
    updatePageLanguage();
  } catch (error) {
    console.error('Error initializing i18n:', error);
  }
}

// Funzione di supporto per cambiare lingua (chiamata dall'HTML)
function changeLanguage(lang) {
  setLanguage(lang);
}
