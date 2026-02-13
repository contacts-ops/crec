"use client";

import { useEffect } from "react";
import { useAbstractBandesStore, type AbstractBandesFilters, type AbstractBandeItem } from "@/store/abstract-bandes";

export function useAbstractBandes(initialFilters: AbstractBandesFilters = {}) {
  const {
    all,
    filtered,
    loading,
    error,
    filters,
    setFilters,
    fetchAll,
    update,
    validate,
    setAbstractBande,
  } = useAbstractBandesStore();

  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters((f) => ({ ...f, ...initialFilters }));
    }
    if (all.length === 0) {
      fetchAll();
    }
  }, [all, fetchAll]);

  const updateAbstractBande = (id: string, payload: Partial<AbstractBandeItem>) => update(id, payload);
  const validateAbstractBande = (id: string) => validate(id);

  return {
    items: filtered,
    total: filtered.length,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchAll,
    updateAbstractBande,
    validateAbstractBande,
    setAbstractBande,
  } as const;
}


