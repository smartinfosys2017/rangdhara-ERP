'use client';

export function CustomerNotes() {
  const notes = [
    {
      id: 1,
      title: 'Follow-up Required',
      description: 'Customer requested a follow-up call regarding the new quotation.',
      date: '08 Sep 2026',
    },
    {
      id: 2,
      title: 'Payment Discussion',
      description: 'Discussed pending payment with the customer.',
      date: '05 Sep 2026',
    },
    {
      id: 3,
      title: 'General Note',
      description: 'Customer is interested in additional services.',
      date: '02 Sep 2026',
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Notes</h3>
      </div>

      <div className="card-body">
        <div className="flex flex-col gap-5">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border p-4"
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {note.title}
                </h4>

                <span className="text-xs text-muted-foreground">
                  {note.date}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                {note.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}