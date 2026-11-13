'use client';

import { useMemo, useState } from 'react';

import {
  CalendarDays,
  Check,
  ChevronDown,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Textarea } from '@/components/ui/textarea';

// -----------------------------------------------------------------------------
// STATIC DATA
// -----------------------------------------------------------------------------

const CUSTOMERS = [
  {
    id: '1',
    name: 'Acme Corporation',
    email: 'billing@acme.com',
    phone: '+1 555 100 2000',
    street: '123 Business Avenue',
    city: 'New York',
    state: 'NY',
    country: 'United States',
    zip: '10001',
  },
  {
    id: '2',
    name: 'Globex Corporation',
    email: 'accounts@globex.com',
    phone: '+1 555 200 3000',
    street: '456 Market Street',
    city: 'San Francisco',
    state: 'CA',
    country: 'United States',
    zip: '94105',
  },
  {
    id: '3',
    name: 'Wayne Enterprises',
    email: 'finance@wayne.com',
    phone: '+1 555 300 4000',
    street: '1007 Mountain Drive',
    city: 'Gotham',
    state: 'NJ',
    country: 'United States',
    zip: '07001',
  },
];

const PROJECTS = [
  {
    id: '1',
    name: 'Website Redesign',
    customerId: '1',
  },
  {
    id: '2',
    name: 'CRM Development',
    customerId: '1',
  },
  {
    id: '3',
    name: 'Mobile Application',
    customerId: '2',
  },
  {
    id: '4',
    name: 'ERP Implementation',
    customerId: '3',
  },
];

const ITEMS = [
  {
    id: '1',
    name: 'Website Development',
    subtext: 'web-dev',
    description: 'Website Development',
    longDescription:
      'Professional website development services.',
    rate: 1500,
    unit: 'project',
  },
  {
    id: '2',
    name: 'UI/UX Design',
    subtext: 'design',
    description: 'UI/UX Design',
    longDescription: 'UI and UX design services.',
    rate: 750,
    unit: 'project',
  },
  {
    id: '3',
    name: 'SEO Optimization',
    subtext: 'seo',
    description: 'SEO Optimization',
    longDescription:
      'Search engine optimization services.',
    rate: 500,
    unit: 'month',
  },
  {
    id: '4',
    name: 'Consulting',
    subtext: 'consulting',
    description: 'Consulting Services',
    longDescription:
      'Professional consulting services.',
    rate: 125,
    unit: 'hour',
  },
];

const TAXES = [
  {
    id: 'igst',
    name: 'IGST',
    rate: 12,
  },
  {
    id: 'gst',
    name: 'GST',
    rate: 18,
  },
  {
    id: 'vat',
    name: 'VAT',
    rate: 10,
  },
];

const CURRENCIES = [
  {
    id: '1',
    name: 'USD',
    symbol: '$',
  },
  {
    id: '2',
    name: 'EUR',
    symbol: '€',
  },
  {
    id: '3',
    name: 'INR',
    symbol: '₹',
  },
];

const STATUSES = [
  {
    id: '1',
    name: 'Draft',
  },
  {
    id: '2',
    name: 'Sent',
  },
  {
    id: '3',
    name: 'Paid',
  },
  {
    id: '4',
    name: 'Partially Paid',
  },
  {
    id: '5',
    name: 'Overdue',
  },
  {
    id: '6',
    name: 'Cancelled',
  },
];

const SALE_AGENTS = [
  {
    id: '1',
    name: 'Rang Dhara',
  },
];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDueDate() {
  const date = new Date();

  date.setDate(date.getDate() + 7);

  return date.toISOString().split('T')[0];
}

function formatMoney(amount, currency) {
  return `${currency?.symbol || '$'}${Number(
    amount || 0,
  ).toFixed(2)}`;
}

function createEmptyItem() {
  return {
    id: null,
    description: '',
    longDescription: '',
    quantity: 1,
    unit: '',
    rate: 0,
    taxes: [],
    optional: false,
  };
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export default function InvoicesAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  // ---------------------------------------------------------------------------
  // BASIC INFORMATION
  // ---------------------------------------------------------------------------

  const [customerId, setCustomerId] = useState('');

  const [projectId, setProjectId] = useState('');

  const [invoiceNumber, setInvoiceNumber] =
    useState('000001');

  const [invoiceDate, setInvoiceDate] =
    useState(getToday());

  const [dueDate, setDueDate] =
    useState(getDueDate());

  const [referenceNo, setReferenceNo] =
    useState('');

  const [tags, setTags] = useState('');

  const [currencyId, setCurrencyId] =
    useState('1');

  const [status, setStatus] = useState('1');

  const [saleAgent, setSaleAgent] =
    useState('1');

  const [discountType, setDiscountType] =
    useState('');

  const [adminNote, setAdminNote] =
    useState('');

  // ---------------------------------------------------------------------------
  // BILLING
  // ---------------------------------------------------------------------------

  const [billing, setBilling] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  // ---------------------------------------------------------------------------
  // SHIPPING
  // ---------------------------------------------------------------------------

  const [includeShipping, setIncludeShipping] =
    useState(false);

  const [
    showShippingOnInvoice,
    setShowShippingOnInvoice,
  ] = useState(true);

  const [shipping, setShipping] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  const [
    shippingDialogOpen,
    setShippingDialogOpen,
  ] = useState(false);

  // ---------------------------------------------------------------------------
  // ITEMS
  // ---------------------------------------------------------------------------

  const [items, setItems] = useState([]);

  const [selectedItemId, setSelectedItemId] =
    useState('');

  const [showQuantityAs, setShowQuantityAs] =
    useState('1');

  const [currentItem, setCurrentItem] =
    useState(createEmptyItem());

  // ---------------------------------------------------------------------------
  // DISCOUNT
  // ---------------------------------------------------------------------------

  const [discountMode, setDiscountMode] =
    useState('percent');

  const [discountPercent, setDiscountPercent] =
    useState(0);

  const [discountFixed, setDiscountFixed] =
    useState(0);

  const [adjustment, setAdjustment] =
    useState(0);

  // ---------------------------------------------------------------------------
  // NOTES
  // ---------------------------------------------------------------------------

  const [clientNote, setClientNote] =
    useState('');

  const [terms, setTerms] = useState('');

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  const [errors, setErrors] = useState({});

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------

  const selectedCustomer = useMemo(
    () =>
      CUSTOMERS.find(
        (customer) =>
          customer.id === customerId,
      ),
    [customerId],
  );

  const selectedCurrency = useMemo(
    () =>
      CURRENCIES.find(
        (currency) =>
          currency.id === currencyId,
      ) || CURRENCIES[0],
    [currencyId],
  );

  const filteredProjects = useMemo(
    () =>
      customerId
        ? PROJECTS.filter(
            (project) =>
              project.customerId ===
              customerId,
          )
        : PROJECTS,
    [customerId],
  );

  // ---------------------------------------------------------------------------
  // CALCULATIONS
  // ---------------------------------------------------------------------------

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) *
            Number(item.rate || 0),
        0,
      ),
    [items],
  );

  const totalTax = useMemo(
    () =>
      items.reduce((sum, item) => {
        const amount =
          Number(item.quantity || 0) *
          Number(item.rate || 0);

        const taxRate = item.taxes.reduce(
          (taxSum, tax) =>
            taxSum + Number(tax.rate || 0),
          0,
        );

        return (
          sum +
          (amount * taxRate) / 100
        );
      }, 0),
    [items],
  );

  const discountAmount = useMemo(() => {
    if (discountMode === 'fixed') {
      return Math.min(
        Number(discountFixed || 0),
        subtotal,
      );
    }

    return (
      (subtotal *
        Number(discountPercent || 0)) /
      100
    );
  }, [
    subtotal,
    discountMode,
    discountPercent,
    discountFixed,
  ]);

  const total = useMemo(() => {
    let amount = subtotal;

    if (discountType === 'before_tax') {
      amount -= discountAmount;
      amount += totalTax;
    } else if (
      discountType === 'after_tax'
    ) {
      amount += totalTax;
      amount -= discountAmount;
    } else {
      amount += totalTax;
    }

    amount += Number(adjustment || 0);

    return Math.max(0, amount);
  }, [
    subtotal,
    totalTax,
    discountAmount,
    discountType,
    adjustment,
  ]);

  // ---------------------------------------------------------------------------
  // CUSTOMER
  // ---------------------------------------------------------------------------

  const handleCustomerChange = (value) => {
    setCustomerId(value);

    setProjectId('');

    const customer = CUSTOMERS.find(
      (item) => item.id === value,
    );

    if (!customer) {
      setBilling({
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      });

      setShipping({
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      });

      return;
    }

    setBilling({
      street: customer.street || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      country: customer.country || '',
    });

    setShipping({
      street: customer.street || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      country: customer.country || '',
    });

    setErrors((prev) => ({
      ...prev,
      customerId: '',
    }));
  };

  // ---------------------------------------------------------------------------
  // ITEM SELECTION
  // ---------------------------------------------------------------------------

  const handleItemSelect = (value) => {
    setSelectedItemId(value);

    const item = ITEMS.find(
      (entry) => entry.id === value,
    );

    if (!item) {
      return;
    }

    setCurrentItem({
      id: item.id,
      description: item.description,
      longDescription:
        item.longDescription,
      quantity: 1,
      unit: item.unit,
      rate: item.rate,
      taxes: [],
      optional: false,
    });
  };

  // ---------------------------------------------------------------------------
  // ITEM TAX
  // ---------------------------------------------------------------------------

  const toggleTax = (tax) => {
    setCurrentItem((prev) => {
      const exists = prev.taxes.some(
        (item) => item.id === tax.id,
      );

      return {
        ...prev,
        taxes: exists
          ? prev.taxes.filter(
              (item) =>
                item.id !== tax.id,
            )
          : [...prev.taxes, tax],
      };
    });
  };

  // ---------------------------------------------------------------------------
  // ADD ITEM
  // ---------------------------------------------------------------------------

  const addItem = () => {
    if (
      !currentItem.description.trim() &&
      !selectedItemId
    ) {
      toast.error(
        'Please add an item description.',
      );

      return;
    }

    if (
      Number(currentItem.quantity) < 0 ||
      Number(currentItem.rate) < 0
    ) {
      toast.error(
        'Quantity and rate cannot be negative.',
      );

      return;
    }

    const newItem = {
      ...currentItem,
      id:
        currentItem.id ||
        `custom-${Date.now()}`,
      quantity: Number(
        currentItem.quantity || 0,
      ),
      rate: Number(
        currentItem.rate || 0,
      ),
      taxes: [...currentItem.taxes],
    };

    setItems((prev) => [
      ...prev,
      newItem,
    ]);

    setCurrentItem(
      createEmptyItem(),
    );

    setSelectedItemId('');
  };

  // ---------------------------------------------------------------------------
  // REMOVE ITEM
  // ---------------------------------------------------------------------------

  const removeItem = (index) => {
    setItems((prev) =>
      prev.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      ),
    );
  };

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  const validate = () => {
    const newErrors = {};

    if (!customerId) {
      newErrors.customerId =
        'Customer is required.';
    }

    if (!invoiceNumber.trim()) {
      newErrors.invoiceNumber =
        'Invoice number is required.';
    }

    if (!invoiceDate) {
      newErrors.invoiceDate =
        'Invoice date is required.';
    }

    if (!dueDate) {
      newErrors.dueDate =
        'Due date is required.';
    }

    if (items.length === 0) {
      newErrors.items =
        'Please add at least one item.';
    }

    setErrors(newErrors);

    if (
      Object.keys(newErrors).length > 0
    ) {
      toast.error(
        'Please complete the required fields.',
      );

      return false;
    }

    return true;
  };

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------

  const handleSave = (action = 'save') => {
    if (!validate()) {
      return;
    }

    const invoiceData = {
      invoiceNumber: `INV-${invoiceNumber}`,

      customerId,

      customer:
        selectedCustomer?.name || '',

      projectId,

      invoiceDate,

      dueDate,

      referenceNo,

      tags,

      currency: currencyId,

      status,

      saleAgent,

      discountType,

      discountMode,

      discountPercent:
        discountMode === 'percent'
          ? Number(
              discountPercent || 0,
            )
          : 0,

      discountFixed:
        discountMode === 'fixed'
          ? Number(
              discountFixed || 0,
            )
          : 0,

      adjustment: Number(
        adjustment || 0,
      ),

      billing,

      shipping: includeShipping
        ? {
            ...shipping,
            showOnInvoice:
              showShippingOnInvoice,
          }
        : null,

      showQuantityAs,

      items,

      subtotal,

      totalTax,

      discountAmount,

      total,

      adminNote,

      clientNote,

      terms,

      action,
    };

    console.log(
      'Invoice Data:',
      invoiceData,
    );

    if (action === 'send') {
      toast.success(
        'Invoice saved and ready to send.',
      );
    } else if (
      action === 'send-later'
    ) {
      toast.success(
        'Invoice saved and scheduled to send later.',
      );
    } else {
      toast.success(
        'Invoice saved successfully.',
      );
    }

    onSuccess?.(invoiceData);
  };

  // ---------------------------------------------------------------------------
  // RESET / CLOSE
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    setErrors({});

    closeDialog?.();
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) {
            handleClose();
          }
        }}
      >
        <DialogContent className="max-w-[1400px] w-[96vw] max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-xl font-bold">
              Create New Invoice
            </DialogTitle>

            <DialogDescription>
              Create and manage invoice details,
              billing information, items and
              totals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-0">
            {/* ============================================================= */}
            {/* INVOICE INFORMATION */}
            {/* ============================================================= */}

            <section className="border-b px-6 py-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* LEFT */}
                <div className="space-y-5">
                  {/* CUSTOMER */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      <span className="text-destructive">
                        *
                      </span>{' '}
                      Customer
                    </label>

                    <Select
                      value={customerId}
                      onValueChange={
                        handleCustomerChange
                      }
                    >
                      <SelectTrigger
                        className={
                          errors.customerId
                            ? 'border-destructive'
                            : ''
                        }
                      >
                        <SelectValue placeholder="Select and begin typing" />
                      </SelectTrigger>

                      <SelectContent>
                        {CUSTOMERS.map(
                          (customer) => (
                            <SelectItem
                              key={customer.id}
                              value={customer.id}
                            >
                              {customer.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    {errors.customerId && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.customerId}
                      </p>
                    )}
                  </div>

                  {/* PROJECT */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Project
                    </label>

                    <Select
                      value={projectId}
                      onValueChange={setProjectId}
                      disabled={!customerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select and begin typing" />
                      </SelectTrigger>

                      <SelectContent>
                        {filteredProjects.map(
                          (project) => (
                            <SelectItem
                              key={project.id}
                              value={project.id}
                            >
                              {project.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* BILL TO / SHIP TO */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 font-semibold">
                        Bill To
                      </p>

                      <div className="rounded-md border bg-muted/20 p-4 text-sm">
                        <p>
                          {billing.street ||
                            '--'}
                        </p>

                        <p>
                          {billing.city ||
                            '--'}
                          {billing.city &&
                          billing.state
                            ? ', '
                            : ''}
                          {billing.state || ''}
                        </p>

                        <p>
                          {billing.country ||
                            '--'}
                          {billing.country &&
                          billing.zip
                            ? ', '
                            : ''}
                          {billing.zip || ''}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          setShippingDialogOpen(
                            true,
                          )
                        }
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Edit Address
                      </Button>
                    </div>

                    <div>
                      <p className="mb-2 font-semibold">
                        Ship To
                      </p>

                      <div className="rounded-md border bg-muted/20 p-4 text-sm">
                        {includeShipping ? (
                          <>
                            <p>
                              {shipping.street ||
                                '--'}
                            </p>

                            <p>
                              {shipping.city ||
                                '--'}
                              {shipping.city &&
                              shipping.state
                                ? ', '
                                : ''}
                              {shipping.state ||
                                ''}
                            </p>

                            <p>
                              {shipping.country ||
                                '--'}
                              {shipping.country &&
                              shipping.zip
                                ? ', '
                                : ''}
                              {shipping.zip ||
                                ''}
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">
                            Shipping address not
                            included.
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          setShippingDialogOpen(
                            true,
                          )
                        }
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Shipping Settings
                      </Button>
                    </div>
                  </div>

                  {/* INVOICE NUMBER */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      <span className="text-destructive">
                        *
                      </span>{' '}
                      Invoice Number
                    </label>

                    <div className="flex">
                      <div className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm">
                        INV-
                      </div>

                      <Input
                        value={invoiceNumber}
                        onChange={(event) =>
                          setInvoiceNumber(
                            event.target.value,
                          )
                        }
                        className={`rounded-l-none ${
                          errors.invoiceNumber
                            ? 'border-destructive'
                            : ''
                        }`}
                      />
                    </div>

                    {errors.invoiceNumber && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.invoiceNumber}
                      </p>
                    )}
                  </div>

                  {/* DATES */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        <span className="text-destructive">
                          *
                        </span>{' '}
                        Invoice Date
                      </label>

                      <div className="relative">
                        <Input
                          type="date"
                          value={invoiceDate}
                          onChange={(event) =>
                            setInvoiceDate(
                              event.target.value,
                            )
                          }
                          className={
                            errors.invoiceDate
                              ? 'border-destructive'
                              : ''
                          }
                        />

                        <CalendarDays className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>

                      {errors.invoiceDate && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.invoiceDate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        <span className="text-destructive">
                          *
                        </span>{' '}
                        Due Date
                      </label>

                      <div className="relative">
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(event) =>
                            setDueDate(
                              event.target.value,
                            )
                          }
                          className={
                            errors.dueDate
                              ? 'border-destructive'
                              : ''
                          }
                        />

                        <CalendarDays className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>

                      {errors.dueDate && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="space-y-5">
                  {/* TAGS */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      🏷 Tags
                    </label>

                    <Input
                      value={tags}
                      onChange={(event) =>
                        setTags(
                          event.target.value,
                        )
                      }
                      placeholder="Add tags"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* CURRENCY */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        <span className="text-destructive">
                          *
                        </span>{' '}
                        Currency
                      </label>

                      <Select
                        value={currencyId}
                        onValueChange={
                          setCurrencyId
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          {CURRENCIES.map(
                            (currency) => (
                              <SelectItem
                                key={currency.id}
                                value={currency.id}
                              >
                                {currency.name}{' '}
                                {currency.symbol}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* STATUS */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Status
                      </label>

                      <Select
                        value={status}
                        onValueChange={setStatus}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          {STATUSES.map(
                            (item) => (
                              <SelectItem
                                key={item.id}
                                value={item.id}
                              >
                                {item.name}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* REFERENCE */}
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        Reference #
                      </label>

                      <Input
                        value={referenceNo}
                        onChange={(event) =>
                          setReferenceNo(
                            event.target.value,
                          )
                        }
                      />
                    </div>

                    {/* SALE AGENT */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Sale Agent
                      </label>

                      <Select
                        value={saleAgent}
                        onValueChange={
                          setSaleAgent
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          {SALE_AGENTS.map(
                            (agent) => (
                              <SelectItem
                                key={agent.id}
                                value={agent.id}
                              >
                                {agent.name}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* DISCOUNT TYPE */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Discount Type
                      </label>

                      <Select
                        value={
                          discountType ||
                          'none'
                        }
                        onValueChange={(value) =>
                          setDiscountType(
                            value === 'none'
                              ? ''
                              : value,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="none">
                            No discount
                          </SelectItem>

                          <SelectItem value="before_tax">
                            Before Tax
                          </SelectItem>

                          <SelectItem value="after_tax">
                            After Tax
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* ADMIN NOTE */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Admin Note
                    </label>

                    <Textarea
                      rows={4}
                      value={adminNote}
                      onChange={(event) =>
                        setAdminNote(
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================= */}
            {/* ITEMS */}
            {/* ============================================================= */}

            <section className="border-b px-6 py-6">
              <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex w-full max-w-md gap-2">
                  <Select
                    value={selectedItemId}
                    onValueChange={
                      handleItemSelect
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add Item" />
                    </SelectTrigger>

                    <SelectContent>
                      {ITEMS.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                        >
                          {item.name} —{' '}
                          {formatMoney(
                            item.rate,
                            selectedCurrency,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      toast.info(
                        'New item creation can be connected here.',
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* SHOW QUANTITY */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium">
                    Show quantity as:
                  </span>

                  {[
                    {
                      value: '1',
                      label: 'Qty',
                    },
                    {
                      value: '2',
                      label: 'Hours',
                    },
                    {
                      value: '3',
                      label: 'Qty/Hours',
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="radio"
                        name="show_quantity_as_invoice"
                        value={option.value}
                        checked={
                          showQuantityAs ===
                          option.value
                        }
                        onChange={() =>
                          setShowQuantityAs(
                            option.value,
                          )
                        }
                        className="h-4 w-4"
                      />

                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* ITEM TABLE */}
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="w-[20%] px-3 py-3 text-left">
                        Item
                      </th>

                      <th className="w-[25%] px-3 py-3 text-left">
                        Description
                      </th>

                      <th className="w-[10%] px-3 py-3 text-right">
                        Qty
                      </th>

                      <th className="w-[15%] px-3 py-3 text-right">
                        Rate
                      </th>

                      <th className="w-[15%] px-3 py-3 text-right">
                        Tax
                      </th>

                      <th className="w-[10%] px-3 py-3 text-right">
                        Amount
                      </th>

                      <th className="w-[5%] px-3 py-3 text-center">
                        <Check className="mx-auto h-4 w-4" />
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* NEW ITEM */}
                    <tr className="border-t align-top">
                      <td className="p-3">
                        <Textarea
                          rows={3}
                          placeholder="Description"
                          value={
                            currentItem.description
                          }
                          onChange={(event) =>
                            setCurrentItem(
                              (prev) => ({
                                ...prev,
                                description:
                                  event.target
                                    .value,
                              }),
                            )
                          }
                        />

                        <label className="mt-3 flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={
                              currentItem.optional
                            }
                            onChange={(event) =>
                              setCurrentItem(
                                (prev) => ({
                                  ...prev,
                                  optional:
                                    event.target
                                      .checked,
                                }),
                              )
                            }
                            className="h-4 w-4"
                          />

                          This item is optional
                        </label>
                      </td>

                      <td className="p-3">
                        <Textarea
                          rows={4}
                          placeholder="Long description"
                          value={
                            currentItem.longDescription
                          }
                          onChange={(event) =>
                            setCurrentItem(
                              (prev) => ({
                                ...prev,
                                longDescription:
                                  event.target
                                    .value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          value={
                            currentItem.quantity
                          }
                          onChange={(event) =>
                            setCurrentItem(
                              (prev) => ({
                                ...prev,
                                quantity:
                                  event.target
                                    .value,
                              }),
                            )
                          }
                        />

                        <Input
                          className="mt-2"
                          placeholder="Unit"
                          value={
                            currentItem.unit
                          }
                          onChange={(event) =>
                            setCurrentItem(
                              (prev) => ({
                                ...prev,
                                unit: event.target
                                  .value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Rate"
                          value={
                            currentItem.rate
                          }
                          onChange={(event) =>
                            setCurrentItem(
                              (prev) => ({
                                ...prev,
                                rate: event.target
                                  .value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td className="p-3">
                        <div className="space-y-2">
                          {TAXES.map(
                            (tax) => {
                              const checked =
                                currentItem.taxes.some(
                                  (item) =>
                                    item.id ===
                                    tax.id,
                                );

                              return (
                                <label
                                  key={tax.id}
                                  className="flex cursor-pointer items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      checked
                                    }
                                    onChange={() =>
                                      toggleTax(
                                        tax,
                                      )
                                    }
                                    className="h-4 w-4"
                                  />

                                  <span>
                                    {
                                      tax.name
                                    }{' '}
                                    {
                                      tax.rate
                                    }
                                    %
                                  </span>
                                </label>
                              );
                            },
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right font-medium">
                        {formatMoney(
                          Number(
                            currentItem.quantity ||
                              0,
                          ) *
                            Number(
                              currentItem.rate ||
                                0,
                            ),
                          selectedCurrency,
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          size="icon"
                          onClick={addItem}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>

                    {/* ADDED ITEMS */}
                    {items.map(
                      (item, index) => {
                        const itemAmount =
                          Number(
                            item.quantity ||
                              0,
                          ) *
                          Number(
                            item.rate ||
                              0,
                          );

                        return (
                          <tr
                            key={`${item.id}-${index}`}
                            className="border-t align-top"
                          >
                            <td className="p-3">
                              <div className="font-medium">
                                {
                                  item.description
                                }
                              </div>

                              {item.optional && (
                                <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                                  Optional
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="whitespace-pre-wrap text-muted-foreground">
                                {item.longDescription ||
                                  '--'}
                              </div>
                            </td>

                            <td className="p-3 text-right">
                              {
                                item.quantity
                              }

                              {item.unit
                                ? ` ${item.unit}`
                                : ''}
                            </td>

                            <td className="p-3 text-right">
                              {formatMoney(
                                item.rate,
                                selectedCurrency,
                              )}
                            </td>

                            <td className="p-3 text-right">
                              {item.taxes
                                .length
                                ? item.taxes
                                    .map(
                                      (
                                        tax,
                                      ) =>
                                        `${tax.name} ${tax.rate}%`,
                                    )
                                    .join(
                                      ', ',
                                    )
                                : 'No Tax'}
                            </td>

                            <td className="p-3 text-right font-medium">
                              {formatMoney(
                                itemAmount,
                                selectedCurrency,
                              )}
                            </td>

                            <td className="p-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  removeItem(
                                    index,
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {errors.items && (
                <p className="mt-2 text-sm text-destructive">
                  {errors.items}
                </p>
              )}

              {/* SUMMARY */}
              <div className="mt-6 ml-auto max-w-xl">
                <div className="rounded-md border">
                  {/* SUBTOTAL */}
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="font-semibold">
                      Sub Total:
                    </span>

                    <span>
                      {formatMoney(
                        subtotal,
                        selectedCurrency,
                      )}
                    </span>
                  </div>

                  {/* DISCOUNT */}
                  <div className="border-b px-4 py-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_100px] sm:items-center">
                      <span className="font-semibold">
                        Discount
                      </span>

                      <div className="flex">
                        <Input
                          type="number"
                          min="0"
                          max={
                            discountMode ===
                            'percent'
                              ? 100
                              : undefined
                          }
                          value={
                            discountMode ===
                            'percent'
                              ? discountPercent
                              : discountFixed
                          }
                          onChange={(event) => {
                            if (
                              discountMode ===
                              'percent'
                            ) {
                              setDiscountPercent(
                                event
                                  .target
                                  .value,
                              );
                            } else {
                              setDiscountFixed(
                                event
                                  .target
                                  .value,
                              );
                            }
                          }}
                          className="rounded-r-none"
                        />

                        <div className="flex h-10 items-center rounded-l-none border border-l-0 bg-muted px-3">
                          {discountMode ===
                          'percent'
                            ? '%'
                            : selectedCurrency.symbol}

                          <ChevronDown className="ml-1 h-3 w-3" />
                        </div>
                      </div>

                      <span className="text-right">
                        -
                        {formatMoney(
                          discountAmount,
                          selectedCurrency,
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex gap-2 text-xs">
                      <Button
                        type="button"
                        variant={
                          discountMode ===
                          'percent'
                            ? 'secondary'
                            : 'ghost'
                        }
                        size="sm"
                        onClick={() =>
                          setDiscountMode(
                            'percent',
                          )
                        }
                      >
                        %
                      </Button>

                      <Button
                        type="button"
                        variant={
                          discountMode ===
                          'fixed'
                            ? 'secondary'
                            : 'ghost'
                        }
                        size="sm"
                        onClick={() =>
                          setDiscountMode(
                            'fixed',
                          )
                        }
                      >
                        Fixed Amount
                      </Button>
                    </div>
                  </div>

                  {/* TAX */}
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="font-semibold">
                      Total Tax:
                    </span>

                    <span>
                      {formatMoney(
                        totalTax,
                        selectedCurrency,
                      )}
                    </span>
                  </div>

                  {/* ADJUSTMENT */}
                  <div className="grid grid-cols-[1fr_180px_100px] items-center gap-3 border-b px-4 py-3">
                    <span className="font-semibold">
                      Adjustment
                    </span>

                    <Input
                      type="number"
                      value={adjustment}
                      onChange={(event) =>
                        setAdjustment(
                          event.target.value,
                        )
                      }
                    />

                    <span className="text-right">
                      {formatMoney(
                        adjustment,
                        selectedCurrency,
                      )}
                    </span>
                  </div>

                  {/* TOTAL */}
                  <div className="flex items-center justify-between px-4 py-4 text-base">
                    <span className="font-bold">
                      Total:
                    </span>

                    <span className="font-bold">
                      {formatMoney(
                        total,
                        selectedCurrency,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================= */}
            {/* NOTES */}
            {/* ============================================================= */}

            <section className="px-6 py-6">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Client Note
                  </label>

                  <Textarea
                    rows={4}
                    value={clientNote}
                    onChange={(event) =>
                      setClientNote(
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Terms & Conditions
                  </label>

                  <Textarea
                    rows={4}
                    value={terms}
                    onChange={(event) =>
                      setTerms(
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>
            </section>
          </div>

          {/* =============================================================== */}
          {/* FOOTER */}
          {/* =============================================================== */}

          <DialogFooter className="sticky bottom-0 border-t bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleSave(
                  'send-later',
                )
              }
            >
              Save and Send Later
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleSave('send')
              }
            >
              Save & Send
            </Button>

            <Button
              type="button"
              onClick={() =>
                handleSave('save')
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* BILLING / SHIPPING MODAL */}
      {/* =================================================================== */}

      <Dialog
        open={shippingDialogOpen}
        onOpenChange={
          setShippingDialogOpen
        }
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Billing & Shipping Details
            </DialogTitle>

            <DialogDescription>
              Update billing and shipping
              address information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* BILLING */}
            <div>
              <h3 className="mb-4 font-semibold">
                Billing Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Street
                  </label>

                  <Textarea
                    rows={3}
                    value={billing.street}
                    onChange={(event) =>
                      setBilling(
                        (prev) => ({
                          ...prev,
                          street:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      City
                    </label>

                    <Input
                      value={billing.city}
                      onChange={(event) =>
                        setBilling(
                          (prev) => ({
                            ...prev,
                            city:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      State
                    </label>

                    <Input
                      value={billing.state}
                      onChange={(event) =>
                        setBilling(
                          (prev) => ({
                            ...prev,
                            state:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Zip Code
                    </label>

                    <Input
                      value={billing.zip}
                      onChange={(event) =>
                        setBilling(
                          (prev) => ({
                            ...prev,
                            zip:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Country
                    </label>

                    <Input
                      value={
                        billing.country
                      }
                      onChange={(event) =>
                        setBilling(
                          (prev) => ({
                            ...prev,
                            country:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SHIPPING */}
            <div className="border-t pt-5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={
                    includeShipping
                  }
                  onChange={(event) =>
                    setIncludeShipping(
                      event.target
                        .checked,
                    )
                  }
                  className="h-4 w-4"
                />

                Shipping Address
              </label>

              {includeShipping && (
                <div className="mt-4 space-y-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={
                        showShippingOnInvoice
                      }
                      onChange={(event) =>
                        setShowShippingOnInvoice(
                          event.target
                            .checked,
                        )
                      }
                      className="h-4 w-4"
                    />

                    Show shipping details in
                    invoice
                  </label>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Street
                    </label>

                    <Textarea
                      rows={3}
                      value={
                        shipping.street
                      }
                      onChange={(event) =>
                        setShipping(
                          (prev) => ({
                            ...prev,
                            street:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        City
                      </label>

                      <Input
                        value={
                          shipping.city
                        }
                        onChange={(event) =>
                          setShipping(
                            (prev) => ({
                              ...prev,
                              city:
                                event.target
                                  .value,
                            }),
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        State
                      </label>

                      <Input
                        value={
                          shipping.state
                        }
                        onChange={(event) =>
                          setShipping(
                            (prev) => ({
                              ...prev,
                              state:
                                event.target
                                  .value,
                            }),
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Zip Code
                      </label>

                      <Input
                        value={
                          shipping.zip
                        }
                        onChange={(event) =>
                          setShipping(
                            (prev) => ({
                              ...prev,
                              zip:
                                event.target
                                  .value,
                            }),
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Country
                      </label>

                      <Input
                        value={
                          shipping.country
                        }
                        onChange={(event) =>
                          setShipping(
                            (prev) => ({
                              ...prev,
                              country:
                                event.target
                                  .value,
                            }),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setShippingDialogOpen(
                  false,
                )
              }
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={() =>
                setShippingDialogOpen(
                  false,
                )
              }
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}