import { useState, useEffect } from "react";

/**
 * Hook que persiste o mês/ano selecionado em sessionStorage.
 * Prioridade de inicialização: URL params > sessionStorage > mês atual
 * Persiste até fechar a aba ou encerrar a sessão.
 */
export function usePersistedMonthYear(storageKey: string, urlMonth?: string | null, urlYear?: string | null) {
  const currentDate = new Date();

  const getInitialMonth = () => {
    // 1. Prioridade: URL params (navegação entre páginas)
    if (urlMonth) return parseInt(urlMonth) - 1;
    // 2. sessionStorage (última seleção do usuário)
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`${storageKey}_month`);
      if (stored !== null) return parseInt(stored);
    }
    // 3. Mês atual como padrão
    return currentDate.getMonth();
  };

  const getInitialYear = () => {
    if (urlYear) return parseInt(urlYear);
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`${storageKey}_year`);
      if (stored !== null) return parseInt(stored);
    }
    return currentDate.getFullYear();
  };

  const [month, setMonthState] = useState<number>(getInitialMonth);
  const [year, setYearState] = useState<number>(getInitialYear);

  const setMonth = (value: number) => {
    setMonthState(value);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`${storageKey}_month`, String(value));
    }
  };

  const setYear = (value: number) => {
    setYearState(value);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`${storageKey}_year`, String(value));
    }
  };

  // Se vier um URL param novo (ex: clicou em link de outra página), atualiza e persiste
  useEffect(() => {
    if (urlMonth) {
      const m = parseInt(urlMonth) - 1;
      setMonthState(m);
      sessionStorage.setItem(`${storageKey}_month`, String(m));
    }
    if (urlYear) {
      const y = parseInt(urlYear);
      setYearState(y);
      sessionStorage.setItem(`${storageKey}_year`, String(y));
    }
  }, [urlMonth, urlYear, storageKey]);

  return { month, year, setMonth, setYear };
}
