'use client';

import React from 'react';

const creditNotes = [
  {
    id: 1,
    creditNoteNo: 'CN-0001',
    creditNoteDate: 'Sep 08, 2026',
    status: 'Applied',
    project: 'Website Development',
    referenceNo: 'REF-2001',
    amount: '$500.00',
    remainingAmount: '$0.00',
  },
  {
    id: 2,
    creditNoteNo: 'CN-0002',
    creditNoteDate: 'Sep 05, 2026',
    status: 'Open',
    project: 'UI/UX Design',
    referenceNo: 'REF-2002',
    amount: '$750.00',
    remainingAmount: '$750.00',
  },
  {
    id: 3,
    creditNoteNo: 'CN-0003',
    creditNoteDate: 'Aug 28, 2026',
    status: 'Partially Applied',
    project: 'Mobile Application',
    referenceNo: 'REF-2003',
    amount: '$1,200.00',
    remainingAmount: '$450.00',
  },
];

export default function CreditNotesPage() {
  return (
    <div className="space-y-5">

      <div className="card">

        <div className="card-header">
          <div className="card-title">
            Credit Notes
          </div>
        </div>

        <div className="card-body">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr role="row">

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Credit Note #
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Credit Note Date
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Status
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Project
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Reference #
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Remaining Amount
                  </th>

                </tr>
              </thead>

              <tbody>

                {creditNotes.map((creditNote) => (
                  <tr
                    key={creditNote.id}
                    role="row"
                    className="border-t"
                  >

                    <td className="px-4 py-3 text-sm font-medium">
                      {creditNote.creditNoteNo}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {creditNote.creditNoteDate}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          creditNote.status === 'Applied'
                            ? 'text-green-600'
                            : creditNote.status === 'Partially Applied'
                              ? 'text-yellow-600'
                              : 'text-blue-600'
                        }
                      >
                        {creditNote.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {creditNote.project}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {creditNote.referenceNo}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {creditNote.amount}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {creditNote.remainingAmount}
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