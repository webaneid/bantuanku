'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export interface ZakatDisplayMeta {
  id?: string | null;
  slug?: string | null;
  calculatorType?: string | null;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  fitrahAmount?: number | string | null;
  owner?: {
    type?: 'organization' | 'mitra';
    name?: string | null;
    logoUrl?: string | null;
    slug?: string | null;
  };
}

const ZakatDisplayMetaContext = createContext<ZakatDisplayMeta | null>(null);

export function ZakatDisplayMetaProvider({
  value,
  children,
}: {
  value: ZakatDisplayMeta;
  children: ReactNode;
}) {
  return (
    <ZakatDisplayMetaContext.Provider value={value}>
      {children}
    </ZakatDisplayMetaContext.Provider>
  );
}

export function useZakatDisplayMeta() {
  return useContext(ZakatDisplayMetaContext);
}
