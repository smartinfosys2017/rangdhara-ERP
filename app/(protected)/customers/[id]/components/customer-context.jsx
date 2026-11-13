'use client';

import React, {
  createContext,
  useContext,
} from 'react';

const CustomerContext = createContext(null);

export function CustomerProvider({
  customer,
  isLoading,
  isError,
  children,
}) {
  return (
    <CustomerContext.Provider
      value={{
        customer,
        isLoading,
        isError,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);

  if (!context) {
    throw new Error(
      'useCustomer must be used inside CustomerProvider'
    );
  }

  return context;
}