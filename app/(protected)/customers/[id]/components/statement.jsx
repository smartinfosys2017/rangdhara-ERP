'use client';

export function CustomerStatement() {
  const transactions = [
    {
      id: 1,
      date: '08 Sep 2026',
      description: 'Invoice #INV-1001',
      debit: '₹25,000',
      credit: '-',
      balance: '₹25,000',
    },
    {
      id: 2,
      date: '05 Sep 2026',
      description: 'Payment Received',
      debit: '-',
      credit: '₹10,000',
      balance: '₹15,000',
    },
    {
      id: 3,
      date: '01 Sep 2026',
      description: 'Invoice #INV-0998',
      debit: '₹15,000',
      credit: '-',
      balance: '₹30,000',
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Statement</h3>
      </div>

      <div className="card-body">
        <div className="overflow-x-auto">
          <table className="table align-middle text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.date}</td>
                  <td>{transaction.description}</td>
                  <td>{transaction.debit}</td>
                  <td>{transaction.credit}</td>
                  <td className="font-medium">
                    {transaction.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}