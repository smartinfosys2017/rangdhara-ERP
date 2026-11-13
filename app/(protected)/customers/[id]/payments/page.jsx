'use client';

import React from 'react';

const payments = [
  {
    id: 1,
    paymentNo: 'PAY-0001',
    invoiceNo: 'INV-0001',
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN-20260908001',
    amount: '$1,250.00',
    date: 'Sep 08, 2026',
  },
  {
    id: 2,
    paymentNo: 'PAY-0002',
    invoiceNo: 'INV-0002',
    paymentMode: 'Credit Card',
    transactionId: 'TXN-20260907002',
    amount: '$850.00',
    date: 'Sep 07, 2026',
  },
  {
    id: 3,
    paymentNo: 'PAY-0003',
    invoiceNo: 'INV-0003',
    paymentMode: 'PayPal',
    transactionId: 'TXN-20260905003',
    amount: '$2,100.00',
    date: 'Sep 05, 2026',
  },
];

export default function PaymentsPage() {
  return (
    <div className="space-y-5">

      <div className="card">

        <div className="card-header">
          <div className="card-title">
            Payments
          </div>
        </div>

        <div className="card-body">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr role="row">

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Payment #
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Invoice #
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Payment Mode
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Transaction ID
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date
                  </th>

                </tr>
              </thead>

              <tbody>

                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    role="row"
                    className="border-t"
                  >

                    <td className="px-4 py-3 text-sm font-medium">
                      {payment.paymentNo}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {payment.invoiceNo}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {payment.paymentMode}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {payment.transactionId}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {payment.amount}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {payment.date}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}