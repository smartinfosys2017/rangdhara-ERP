
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import prisma from '@/lib/prisma';

import { SettingsProvider } from '@/providers/settings-provider';
import { TooltipsProvider } from '@/providers/tooltips-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/auth-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';

import '@/css/styles.css';
import '@/components/keenicons/assets/styles.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata() {
  let companyName = 'Rangdhara Fabrics';

  try {
    const setting = await prisma.setting.findFirst({
      where: {
        group: 'company',
        key: 'company_name',
      },
      select: {
        value: true,
      },
    });

    if (setting?.value) {
      companyName = setting.value;
    }
  } catch (error) {
    console.error('Failed to fetch company name:', error);
  }

  return {
    title: {
      template: `%s | ${companyName}`,
      default: companyName,
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <html className="h-full" suppressHydrationWarning>
      <body
        className={cn(
          'antialiased flex h-full text-base text-foreground bg-background',
          inter.className
        )}
      >
        <QueryProvider>
          <AuthProvider>
            <SettingsProvider>
              <ThemeProvider>
                <I18nProvider>
                  <TooltipsProvider>
                    <Suspense>{children}</Suspense>
                    <Toaster />
                  </TooltipsProvider>
                </I18nProvider>
              </ThemeProvider>
            </SettingsProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}