'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  usePathname,
  useRouter,
} from 'next/navigation';


import {
  Container,
} from '@/components/common/container';


export default function Layout({
  children,
}) {
  const router = useRouter();
  const pathname = usePathname();

  /*
  |--------------------------------------------------------------------------
  | Navigation Routes
  |--------------------------------------------------------------------------
  */

  const navRoutes = useMemo(
    () => ({
    }),
    []
  );

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <Container>
        <div className="mt-5 grow">
          {children}
        </div>
      </Container>
    </>
  );
}