'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ScreenLoader } from '@/components/common/screen-loader';
import { Demo6Layout } from '../components/layouts/demo6/layout';

export default function ProtectedLayout({
  children
}) {  
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <ScreenLoader />;
  }

  return session ? <Demo6Layout>{children}</Demo6Layout> : null;
} 