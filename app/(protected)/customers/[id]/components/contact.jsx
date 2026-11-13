'use client';

export function CustomerContact() {
  const contact = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91 98765 43210',
    position: 'Manager',
    direction: 'Primary Contact',
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Contact</h3>
      </div>

      <div className="card-body">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          <div>
            <label className="form-label">Name</label>
            <div className="text-sm text-foreground">
              {contact.name}
            </div>
          </div>

          <div>
            <label className="form-label">Email</label>
            <div className="text-sm text-foreground">
              {contact.email}
            </div>
          </div>

          <div>
            <label className="form-label">Phone</label>
            <div className="text-sm text-foreground">
              {contact.phone}
            </div>
          </div>

          <div>
            <label className="form-label">Position</label>
            <div className="text-sm text-foreground">
              {contact.position}
            </div>
          </div>

          <div>
            <label className="form-label">Contact Type</label>
            <div className="text-sm text-foreground">
              {contact.direction}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}