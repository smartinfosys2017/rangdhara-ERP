'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function CustomerViewSidebar() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const customerId = params.id;

  const items = [
    {
      title: 'Customer Information',
      children: [
        {
          title: 'Customer Details',
          path: `/customers/${customerId}`,
        },
        {
          title: 'Billing & Shipping',
          path: `/customers/${customerId}/billing-shipping`,
        },
        {
          title: 'Customer Admins',
          path: `/customers/${customerId}/admins`,
        },
      ],
    },
    {
      title: 'Sales',
      children: [
        {
          title: 'Invoices',
          path: `/customers/${customerId}/invoices`,
        },
        {
          title: 'Estimates',
          path: `/customers/${customerId}/estimates`,
        },
        {
          title: 'Payments',
          path: `/customers/${customerId}/payments`,
        },
        {
          title: 'Credit Notes',
          path: `/customers/${customerId}/credit-notes`,
        },
      ],
    },
  ];

  const handleNavigation = (path) => {
    router.push(path);
  };

  return (
    <div className="flex flex-col gap-6">
      {items.map((section) => (
        <div key={section.title}>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {section.title}
          </h3>

          <div className="flex flex-col">
            {section.children?.map((item) => {
              const isActive = pathname === item.path;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    'flex items-center text-left px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-gray-100 text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {item.title}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}