import { useState, useEffect } from 'react';

const STORAGE_KEY = 'knauf_lang';

export function useLang() {
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || 'he');

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  };

  const toggle = () => changeLang(lang === 'he' ? 'en' : 'he');

  return { lang, toggle };
}