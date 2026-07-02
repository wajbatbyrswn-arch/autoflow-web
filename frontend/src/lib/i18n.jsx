import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { EN } from './translations'

const STORAGE_KEY = 'ui_lang'

export function getStoredLang() {
  try { return localStorage.getItem(STORAGE_KEY) || 'ar' } catch { return 'ar' }
}

/** Set <html lang> and dir so the whole app flips between RTL (Arabic) and LTR (English). */
export function applyDir(lang) {
  const dir = lang === 'en' ? 'ltr' : 'rtl'
  try {
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
  } catch {}
}

// Apply immediately on module load (before React mounts) so first paint is correct.
applyDir(getStoredLang())

const I18nContext = createContext({ lang: 'ar', t: (k) => k, setLang: () => {} })

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getStoredLang)

  useEffect(() => { applyDir(lang) }, [lang])

  const setLang = useCallback((l) => {
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
    setLangState(l)
    applyDir(l)
  }, [])

  // t(key, vars?) — Arabic is the source; for English we look up the EN dictionary and
  // fall back to the Arabic key when a translation is missing (so the app never breaks).
  const t = useCallback((key, vars) => {
    let s = lang === 'en' ? (EN[key] ?? key) : key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
    return s
  }, [lang])

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>
}

export function useT() { return useContext(I18nContext) }
