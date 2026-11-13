const permissions = [
    // Dashboard
    {
        slug: 'dashboard.view',
        name: 'View Dashboard',
        description: 'Permission to access and view the dashboard.',
    },

    // Users
    {
        slug: 'user.view',
        name: 'View Users',
        description: 'Permission to view the list of users.',
    },
    {
        slug: 'user.add',
        name: 'Add User',
        description: 'Permission to add new users.',
    },
    {
        slug: 'user.edit',
        name: 'Edit User',
        description: 'Permission to edit user details.',
    },
    {
        slug: 'user.delete',
        name: 'Delete User',
        description: 'Permission to delete users from the system.',
    },

    // Roles
    {
        slug: 'role.view',
        name: 'View Roles',
        description: 'Permission to view roles in the system.',
    },
    {
        slug: 'role.add',
        name: 'Add Role',
        description: 'Permission to create new roles.',
    },
    {
        slug: 'role.edit',
        name: 'Edit Role',
        description: 'Permission to edit existing roles.',
    },
    {
        slug: 'role.delete',
        name: 'Delete Role',
        description: 'Permission to remove roles from the system.',
    },

    // Permissions
    {
        slug: 'permission.view',
        name: 'View Permissions',
        description: 'Permission to view all available permissions.',
    },
    {
        slug: 'permission.add',
        name: 'Add Permission',
        description: 'Permission to create new permissions.',
    },
    {
        slug: 'permission.edit',
        name: 'Edit Permissions',
        description: 'Permission to edit existing permissions.',
    },
    {
        slug: 'permission.delete',
        name: 'Delete Permission',
        description: 'Permission to delete permissions.',
    },

    // Country
    {
        slug: 'Country.view',
        name: 'View Countries',
        description: 'Permission to view countries.',
    },
    {
        slug: 'Country.manage',
        name: 'Manage Countries',
        description: 'Permission to create and manage countries.',
    },
    {
        slug: 'Country.edit',
        name: 'Edit Country',
        description: 'Permission to edit country details.',
    },
    {
        slug: 'Country.delete',
        name: 'Delete Country',
        description: 'Permission to delete countries.',
    },

    // Customers
    {
        slug: 'customer.view',
        name: 'View Customers',
        description: 'Permission to view customers.',
    },
    {
        slug: 'customer.manage',
        name: 'Manage Customers',
        description: 'Permission to create and manage customers.',
    },
    {
        slug: 'customer.edit',
        name: 'Edit Customer',
        description: 'Permission to edit customer details.',
    },
    {
        slug: 'customer.delete',
        name: 'Delete Customer',
        description: 'Permission to delete customers.',
    },

    // Tasks
    {
        slug: 'task.view',
        name: 'View Tasks',
        description: 'Permission to view tasks.',
    },
    {
        slug: 'task.manage',
        name: 'Manage Tasks',
        description: 'Permission to create and manage tasks.',
    },
    {
        slug: 'task.edit',
        name: 'Edit Task',
        description: 'Permission to edit tasks.',
    },
    {
        slug: 'task.delete',
        name: 'Delete Task',
        description: 'Permission to delete tasks.',
    },

    // Support
    {
        slug: 'support.view',
        name: 'View Support',
        description: 'Permission to view support requests and tickets.',
    },
    {
        slug: 'support.manage',
        name: 'Manage Support',
        description: 'Permission to create and manage support requests.',
    },
    {
        slug: 'support.edit',
        name: 'Edit Support',
        description: 'Permission to edit support requests.',
    },
    {
        slug: 'support.delete',
        name: 'Delete Support',
        description: 'Permission to delete support requests.',
    },

    // Configure Features
    {
        slug: 'configure-features.view',
        name: 'View Configure Features',
        description: 'Permission to view configurable features.',
    },
    {
        slug: 'configure-features.manage',
        name: 'Manage Configure Features',
        description: 'Permission to manage configurable features.',
    },
    {
        slug: 'configure-features.edit',
        name: 'Edit Configure Features',
        description: 'Permission to edit configurable features.',
    },
    {
        slug: 'configure-features.delete',
        name: 'Delete Configure Features',
        description: 'Permission to delete configurable features.',
    },

    // Departments
    {
        slug: 'department.view',
        name: 'View Departments',
        description: 'Permission to view departments.',
    },
    {
        slug: 'department.manage',
        name: 'Manage Departments',
        description: 'Permission to create and manage departments.',
    },
    {
        slug: 'department.edit',
        name: 'Edit Department',
        description: 'Permission to edit department details.',
    },
    {
        slug: 'department.delete',
        name: 'Delete Department',
        description: 'Permission to delete departments.',
    },

    // Services
    {
        slug: 'service.view',
        name: 'View Services',
        description: 'Permission to view services.',
    },
    {
        slug: 'service.manage',
        name: 'Manage Services',
        description: 'Permission to create and manage services.',
    },
    {
        slug: 'service.edit',
        name: 'Edit Service',
        description: 'Permission to edit services.',
    },
    {
        slug: 'service.delete',
        name: 'Delete Service',
        description: 'Permission to delete services.',
    },

    // Projects
    {
        slug: 'project.view',
        name: 'View Projects',
        description: 'Permission to view projects.',
    },
    {
        slug: 'project.manage',
        name: 'Manage Projects',
        description: 'Permission to create and manage projects.',
    },
    {
        slug: 'project.edit',
        name: 'Edit Project',
        description: 'Permission to edit project details.',
    },
    {
        slug: 'project.delete',
        name: 'Delete Project',
        description: 'Permission to delete projects.',
    },

    // Contacts
    {
        slug: 'contact.view',
        name: 'View Contacts',
        description: 'Permission to view contacts.',
    },
    {
        slug: 'contact.manage',
        name: 'Manage Contacts',
        description: 'Permission to create and manage contacts.',
    },
    {
        slug: 'contact.edit',
        name: 'Edit Contact',
        description: 'Permission to edit contact details.',
    },
    {
        slug: 'contact.delete',
        name: 'Delete Contact',
        description: 'Permission to delete contacts.',
    },

    // Custom Fields
    {
        slug: 'custom_fields.view',
        name: 'View Custom Fields',
        description: 'Permission to view custom fields.',
    },
    {
        slug: 'custom_fields.manage',
        name: 'Manage Custom Fields',
        description: 'Permission to create and manage custom fields.',
    },
    {
        slug: 'custom_fields.edit',
        name: 'Edit Custom Fields',
        description: 'Permission to edit custom fields.',
    },
    {
        slug: 'custom_fields.delete',
        name: 'Delete Custom Fields',
        description: 'Permission to delete custom fields.',
    },

    // Staff
    {
        slug: 'staff.view',
        name: 'View Staff',
        description: 'Permission to view staff members.',
    },
    {
        slug: 'staff.manage',
        name: 'Manage Staff',
        description: 'Permission to create and manage staff members.',
    },
    {
        slug: 'staff.edit',
        name: 'Edit Staff',
        description: 'Permission to edit staff details.',
    },
    {
        slug: 'staff.delete',
        name: 'Delete Staff',
        description: 'Permission to delete staff members.',
    },

    // Statuses
    {
        slug: 'statuses.view',
        name: 'View Statuses',
        description: 'Permission to view system statuses.',
    },
    {
        slug: 'statuses.manage',
        name: 'Manage Statuses',
        description: 'Permission to create and manage statuses.',
    },
    {
        slug: 'statuses.edit',
        name: 'Edit Statuses',
        description: 'Permission to edit statuses.',
    },
    {
        slug: 'statuses.delete',
        name: 'Delete Statuses',
        description: 'Permission to delete statuses.',
    },

    // Email Integration
    {
        slug: 'email_integration.view',
        name: 'View Email Integration',
        description: 'Permission to view email integration settings.',
    },
    {
        slug: 'email_integration.manage',
        name: 'Manage Email Integration',
        description: 'Permission to configure email integrations.',
    },
    {
        slug: 'email_integration.edit',
        name: 'Edit Email Integration',
        description: 'Permission to edit email integration settings.',
    },
    {
        slug: 'email_integration.delete',
        name: 'Delete Email Integration',
        description: 'Permission to remove email integrations.',
    },

    // Leads
    {
        slug: 'leads.view',
        name: 'View Leads',
        description: 'Permission to view leads.',
    },
    {
        slug: 'leads.manage',
        name: 'Manage Leads',
        description: 'Permission to create and manage leads.',
    },
    {
        slug: 'leads.edit',
        name: 'Edit Lead',
        description: 'Permission to edit leads.',
    },
    {
        slug: 'leads.delete',
        name: 'Delete Lead',
        description: 'Permission to delete leads.',
    },

    // Tax Rates
    {
        slug: 'tax_rates.view',
        name: 'View Tax Rates',
        description: 'Permission to view tax rates.',
    },
    {
        slug: 'tax_rates.manage',
        name: 'Manage Tax Rates',
        description: 'Permission to create and manage tax rates.',
    },
    {
        slug: 'tax_rates.edit',
        name: 'Edit Tax Rate',
        description: 'Permission to edit tax rates.',
    },
    {
        slug: 'tax_rates.delete',
        name: 'Delete Tax Rate',
        description: 'Permission to delete tax rates.',
    },

    // Currency
    {
        slug: 'currency.view',
        name: 'View Currencies',
        description: 'Permission to view currencies.',
    },
    {
        slug: 'currency.manage',
        name: 'Manage Currencies',
        description: 'Permission to create and manage currencies.',
    },
    {
        slug: 'currency.edit',
        name: 'Edit Currency',
        description: 'Permission to edit currencies.',
    },
    {
        slug: 'currency.delete',
        name: 'Delete Currency',
        description: 'Permission to delete currencies.',
    },

    // Payment Modes
    {
        slug: 'payment_modes.view',
        name: 'View Payment Modes',
        description: 'Permission to view payment modes.',
    },
    {
        slug: 'payment_modes.manage',
        name: 'Manage Payment Modes',
        description: 'Permission to create and manage payment modes.',
    },
    {
        slug: 'payment_modes.edit',
        name: 'Edit Payment Mode',
        description: 'Permission to edit payment modes.',
    },
    {
        slug: 'payment_modes.delete',
        name: 'Delete Payment Mode',
        description: 'Permission to delete payment modes.',
    },

    // Expense Categories
    {
        slug: 'expense_category.view',
        name: 'View Expense Categories',
        description: 'Permission to view expense categories.',
    },
    {
        slug: 'expense_category.manage',
        name: 'Manage Expense Categories',
        description: 'Permission to create and manage expense categories.',
    },
    {
        slug: 'expense_category.edit',
        name: 'Edit Expense Category',
        description: 'Permission to edit expense categories.',
    },
    {
        slug: 'expense_category.delete',
        name: 'Delete Expense Category',
        description: 'Permission to delete expense categories.',
    },

    // Finance
    {
        slug: 'finance.view',
        name: 'View Finance',
        description: 'Permission to view financial information.',
    },
    {
        slug: 'finance.manage',
        name: 'Manage Finance',
        description: 'Permission to manage financial information.',
    },
    {
        slug: 'finance.edit',
        name: 'Edit Finance',
        description: 'Permission to edit financial information.',
    },
    {
        slug: 'finance.delete',
        name: 'Delete Finance',
        description: 'Permission to delete financial records.',
    },

    // Units
    {
        slug: 'unit.view',
        name: 'View Units',
        description: 'Permission to view units.',
    },
    {
        slug: 'unit.manage',
        name: 'Manage Units',
        description: 'Permission to create and manage units.',
    },
    {
        slug: 'unit.edit',
        name: 'Edit Unit',
        description: 'Permission to edit units.',
    },
    {
        slug: 'unit.delete',
        name: 'Delete Unit',
        description: 'Permission to delete units.',
    },

    // Item Groups
    {
        slug: 'item_group.view',
        name: 'View Item Groups',
        description: 'Permission to view item groups.',
    },
    {
        slug: 'item_group.manage',
        name: 'Manage Item Groups',
        description: 'Permission to create and manage item groups.',
    },
    {
        slug: 'item_group.edit',
        name: 'Edit Item Group',
        description: 'Permission to edit item groups.',
    },
    {
        slug: 'item_group.delete',
        name: 'Delete Item Group',
        description: 'Permission to delete item groups.',
    },

    // Item Types
    {
        slug: 'product_type.view',
        name: 'View Product Types',
        description: 'Permission to view product types.',
    },
    {
        slug: 'product_type.manage',
        name: 'Manage Product Types',
        description: 'Permission to create and manage product types.',
    },
    {
        slug: 'product_type.edit',
        name: 'Edit Product Type',
        description: 'Permission to edit product types.',
    },
    {
        slug: 'product_type.delete',
        name: 'Delete Product Type',
        description: 'Permission to delete product types.',
    },

    // Transaction Types
    {
        slug: 'transaction_type.view',
        name: 'View Transaction Types',
        description: 'Permission to view transaction types.',
    },
    {
        slug: 'transaction_type.manage',
        name: 'Manage Transaction Types',
        description: 'Permission to create and manage transaction types.',
    },
    {
        slug: 'transaction_type.edit',
        name: 'Edit Transaction Type',
        description: 'Permission to edit transaction types.',
    },
    {
        slug: 'transaction_type.delete',
        name: 'Delete Transaction Type',
        description: 'Permission to delete transaction types.',
    },

    // Inventory
    {
        slug: 'inventory.view',
        name: 'View Inventory',
        description: 'Permission to view inventory.',
    },
    {
        slug: 'inventory.manage',
        name: 'Manage Inventory',
        description: 'Permission to manage inventory and stock movements.',
    },
    {
        slug: 'inventory.edit',
        name: 'Edit Inventory',
        description: 'Permission to edit inventory records.',
    },
    {
        slug: 'inventory.delete',
        name: 'Delete Inventory',
        description: 'Permission to delete inventory records.',
    },

    // Customer Groups
    {
        slug: 'customer_group.view',
        name: 'View Customer Groups',
        description: 'Permission to view customer groups.',
    },
    {
        slug: 'customer_group.manage',
        name: 'Manage Customer Groups',
        description: 'Permission to create and manage customer groups.',
    },
    {
        slug: 'customer_group.edit',
        name: 'Edit Customer Group',
        description: 'Permission to edit customer groups.',
    },
    {
        slug: 'customer_group.delete',
        name: 'Delete Customer Group',
        description: 'Permission to delete customer groups.',
    },

    // Email Templates
    {
        slug: 'email_templates.view',
        name: 'View Email Templates',
        description: 'Permission to view email templates.',
    },
    {
        slug: 'email_templates.manage',
        name: 'Manage Email Templates',
        description: 'Permission to create and manage email templates.',
    },
    {
        slug: 'email_templates.edit',
        name: 'Edit Email Template',
        description: 'Permission to edit email templates.',
    },
    {
        slug: 'email_templates.delete',
        name: 'Delete Email Template',
        description: 'Permission to delete email templates.',
    },

    // Contract Types
    {
        slug: 'contract_type.view',
        name: 'View Contract Types',
        description: 'Permission to view contract types.',
    },
    {
        slug: 'contract_type.manage',
        name: 'Manage Contract Types',
        description: 'Permission to create and manage contract types.',
    },
    {
        slug: 'contract_type.edit',
        name: 'Edit Contract Type',
        description: 'Permission to edit contract types.',
    },
    {
        slug: 'contract_type.delete',
        name: 'Delete Contract Type',
        description: 'Permission to delete contract types.',
    },

    // Contracts
    {
        slug: 'Contract.view',
        name: 'View Contracts',
        description: 'Permission to view contracts.',
    },
    {
        slug: 'Contract.manage',
        name: 'Manage Contracts',
        description: 'Permission to create and manage contracts.',
    },
    {
        slug: 'Contract.edit',
        name: 'Edit Contract',
        description: 'Permission to edit contracts.',
    },
    {
        slug: 'Contract.delete',
        name: 'Delete Contract',
        description: 'Permission to delete contracts.',
    },

    // Customer Management
    {
        slug: 'customers.view',
        name: 'View Customer Management',
        description: 'Permission to access customer management.',
    },
    {
        slug: 'customers.manage',
        name: 'Manage Customer Management',
        description: 'Permission to manage customer records.',
    },
    {
        slug: 'customers.edit',
        name: 'Edit Customer Management',
        description: 'Permission to edit customer records.',
    },
    {
        slug: 'customers.delete',
        name: 'Delete Customer Management',
        description: 'Permission to delete customer records.',
    },

    // Proposals
    {
        slug: 'proposal.view',
        name: 'View Proposals',
        description: 'Permission to view proposals.',
    },
    {
        slug: 'proposal.manage',
        name: 'Manage Proposals',
        description: 'Permission to create and manage proposals.',
    },
    {
        slug: 'proposal.edit',
        name: 'Edit Proposal',
        description: 'Permission to edit proposals.',
    },
    {
        slug: 'proposal.delete',
        name: 'Delete Proposal',
        description: 'Permission to delete proposals.',
    },

    // Estimates
    {
        slug: 'estimates.view',
        name: 'View Estimates',
        description: 'Permission to view estimates.',
    },
    {
        slug: 'estimates.manage',
        name: 'Manage Estimates',
        description: 'Permission to create and manage estimates.',
    },
    {
        slug: 'estimates.edit',
        name: 'Edit Estimate',
        description: 'Permission to edit estimates.',
    },
    {
        slug: 'estimates.delete',
        name: 'Delete Estimate',
        description: 'Permission to delete estimates.',
    },

    // Invoices
    {
        slug: 'invoices.view',
        name: 'View Invoices',
        description: 'Permission to view invoices.',
    },
    {
        slug: 'invoices.manage',
        name: 'Manage Invoices',
        description: 'Permission to create and manage invoices.',
    },
    {
        slug: 'invoices.edit',
        name: 'Edit Invoice',
        description: 'Permission to edit invoices.',
    },
    {
        slug: 'invoices.delete',
        name: 'Delete Invoice',
        description: 'Permission to delete invoices.',
    },

    // Credit Notes
    {
        slug: 'credit_note.view',
        name: 'View Credit Notes',
        description: 'Permission to view credit notes.',
    },
    {
        slug: 'credit_note.manage',
        name: 'Manage Credit Notes',
        description: 'Permission to create and manage credit notes.',
    },
    {
        slug: 'credit_note.edit',
        name: 'Edit Credit Note',
        description: 'Permission to edit credit notes.',
    },
    {
        slug: 'credit_note.delete',
        name: 'Delete Credit Note',
        description: 'Permission to delete credit notes.',
    },

    // Payments
    {
        slug: 'payments.view',
        name: 'View Payments',
        description: 'Permission to view payments.',
    },
    {
        slug: 'payments.manage',
        name: 'Manage Payments',
        description: 'Permission to create and manage payments.',
    },
    {
        slug: 'payments.edit',
        name: 'Edit Payment',
        description: 'Permission to edit payments.',
    },
    {
        slug: 'payments.delete',
        name: 'Delete Payment',
        description: 'Permission to delete payments.',
    },

    // Items
    {
        slug: 'items.view',
        name: 'View Items',
        description: 'Permission to view items.',
    },
    {
        slug: 'items.manage',
        name: 'Manage Items',
        description: 'Permission to create and manage items.',
    },
    {
        slug: 'items.edit',
        name: 'Edit Item',
        description: 'Permission to edit items.',
    },
    {
        slug: 'items.delete',
        name: 'Delete Item',
        description: 'Permission to delete items.',
    },

    // Item Master
    {
        slug: 'item_master.view',
        name: 'View Item Master',
        description: 'Permission to view item master records.',
    },
    {
        slug: 'item_master.manage',
        name: 'Manage Item Master',
        description: 'Permission to create and manage item master records.',
    },
    {
        slug: 'item_master.edit',
        name: 'Edit Item Master',
        description: 'Permission to edit item master records.',
    },
    {
        slug: 'item_master.delete',
        name: 'Delete Item Master',
        description: 'Permission to delete item master records.',
    },

    // Issue/Receipt
    {
        slug: 'issue_receipt.view',
        name: 'View Issue/Receipts',
        description: 'Permission to view Issue/Receipts.',
    },
    {
        slug: 'issue_receipt.manage',
        name: 'Manage Issue/Receipts',
        description: 'Permission to create and manage Issue/Receipts.',
    },
    {
        slug: 'issue_receipt.edit',
        name: 'Edit Issue/Receipt',
        description: 'Permission to edit Issue/Receipts.',
    },
    {
        slug: 'issue_receipt.delete',
        name: 'Delete Issue/Receipt',
        description: 'Permission to delete Issue/Receipts.',
    },

    // System Update
    {
        slug: 'systeminfo.view',
        name: 'View System Information',
        description: 'Permission to view system information and update information.',
    },

    // Products
    {
        slug: 'product.view',
        name: 'View Products',
        description: 'Permission to view the list of products.',
    },
    {
        slug: 'product.add',
        name: 'Add Product',
        description: 'Permission to add new products.',
    },
    {
        slug: 'product.edit',
        name: 'Edit Product',
        description: 'Permission to edit existing products.',
    },
    {
        slug: 'product.delete',
        name: 'Delete Product',
        description: 'Permission to delete products.',
    },

    // Categories
    {
        slug: 'category.view',
        name: 'View Categories',
        description: 'Permission to view all product categories.',
    },
    {
        slug: 'category.add',
        name: 'Add Category',
        description: 'Permission to create new product categories.',
    },
    {
        slug: 'category.edit',
        name: 'Edit Category',
        description: 'Permission to edit product categories.',
    },
    {
        slug: 'category.delete',
        name: 'Delete Category',
        description: 'Permission to delete product categories.',
    },

    // Orders
    {
        slug: 'order.view',
        name: 'View Orders',
        description: 'Permission to view all orders in the system.',
    },
    {
        slug: 'order.add',
        name: 'Add Order',
        description: 'Permission to manually create new orders.',
    },
    {
        slug: 'order.edit',
        name: 'Edit Order',
        description: 'Permission to edit existing orders.',
    },
    {
        slug: 'order.delete',
        name: 'Delete Order',
        description: 'Permission to delete orders from the system.',
    },
    {
        slug: 'order.process',
        name: 'Process Order',
        description: 'Permission to update the status of orders.',
    },

    // Reports
    {
        slug: 'report.view',
        name: 'View Reports',
        description: 'Permission to view system and sales reports.',
    },
    {
        slug: 'report.export',
        name: 'Export Reports',
        description: 'Permission to export reports to a file.',
    },

    // Settings
    {
        slug: 'settings.manage',
        name: 'Manage Settings',
        description:
            'Permission to view and edit all system settings, including general, notifications, and integrations.',
    },
];

module.exports = permissions;