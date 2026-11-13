'use client';

import { useEffect, useMemo, useState } from 'react';

import { toast } from 'sonner';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiDeleteBinLine,
  RiAddLine,
} from '@remixicon/react';

import { apiFetch } from '@/lib/api';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

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

import { Textarea } from '@/components/ui/textarea';


// =======================================================
// TOAST
// =======================================================

function showSuccessToast(message) {
  toast.custom(
    () => (
      <Alert
        variant="mono"
        icon="success"
        className="min-w-[320px] max-w-[500px] shadow-lg"
      >
        <AlertIcon>
          <RiCheckboxCircleFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 4000,
    }
  );
}


function showErrorToast(message) {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close={true}
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() => {
          toast.dismiss(t);
        }}
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 5000,
    }
  );
}


// =======================================================
// CONSTANTS
// =======================================================

const countries = [
  { value: '1', label: 'Afghanistan', code: 'AF' },
  { value: '2', label: 'Aland Islands', code: 'AX' },
  { value: '3', label: 'Albania', code: 'AL' },
  { value: '4', label: 'Algeria', code: 'DZ' },
  { value: '5', label: 'American Samoa', code: 'AS' },
  { value: '6', label: 'Andorra', code: 'AD' },
  { value: '7', label: 'Angola', code: 'AO' },
  { value: '8', label: 'Anguilla', code: 'AI' },
  { value: '9', label: 'Antarctica', code: 'AQ' },
  { value: '10', label: 'Antigua and Barbuda', code: 'AG' },
  { value: '11', label: 'Argentina', code: 'AR' },
  { value: '12', label: 'Armenia', code: 'AM' },
  { value: '13', label: 'Aruba', code: 'AW' },
  { value: '14', label: 'Australia', code: 'AU' },
  { value: '15', label: 'Austria', code: 'AT' },
  { value: '16', label: 'Azerbaijan', code: 'AZ' },
  { value: '17', label: 'Bahamas', code: 'BS' },
  { value: '18', label: 'Bahrain', code: 'BH' },
  { value: '19', label: 'Bangladesh', code: 'BD' },
  { value: '20', label: 'Barbados', code: 'BB' },
  { value: '21', label: 'Belarus', code: 'BY' },
  { value: '22', label: 'Belgium', code: 'BE' },
  { value: '23', label: 'Belize', code: 'BZ' },
  { value: '24', label: 'Benin', code: 'BJ' },
  { value: '25', label: 'Bermuda', code: 'BM' },
  { value: '26', label: 'Bhutan', code: 'BT' },
  { value: '27', label: 'Bolivia', code: 'BO' },
  { value: '28', label: 'Bosnia and Herzegovina', code: 'BA' },
  { value: '29', label: 'Botswana', code: 'BW' },
  { value: '30', label: 'Brazil', code: 'BR' },
  { value: '31', label: 'Canada', code: 'CA' },
  { value: '32', label: 'China', code: 'CN' },
  { value: '33', label: 'Colombia', code: 'CO' },
  { value: '34', label: 'Croatia', code: 'HR' },
  { value: '35', label: 'Cyprus', code: 'CY' },
  { value: '36', label: 'Czech Republic', code: 'CZ' },
  { value: '37', label: 'Denmark', code: 'DK' },
  { value: '38', label: 'Egypt', code: 'EG' },
  { value: '39', label: 'Finland', code: 'FI' },
  { value: '40', label: 'France', code: 'FR' },
  { value: '41', label: 'Germany', code: 'DE' },
  { value: '42', label: 'Greece', code: 'GR' },
  { value: '43', label: 'Hong Kong', code: 'HK' },
  { value: '44', label: 'Hungary', code: 'HU' },
  { value: '45', label: 'India', code: 'IN' },
  { value: '46', label: 'Indonesia', code: 'ID' },
  { value: '47', label: 'Ireland', code: 'IE' },
  { value: '48', label: 'Israel', code: 'IL' },
  { value: '49', label: 'Italy', code: 'IT' },
  { value: '50', label: 'Japan', code: 'JP' },
  { value: '51', label: 'Malaysia', code: 'MY' },
  { value: '52', label: 'Maldives', code: 'MV' },
  { value: '53', label: 'Mexico', code: 'MX' },
  { value: '54', label: 'Nepal', code: 'NP' },
  { value: '55', label: 'Netherlands', code: 'NL' },
  { value: '56', label: 'New Zealand', code: 'NZ' },
  { value: '57', label: 'Norway', code: 'NO' },
  { value: '58', label: 'Pakistan', code: 'PK' },
  { value: '59', label: 'Philippines', code: 'PH' },
  { value: '60', label: 'Poland', code: 'PL' },
  { value: '61', label: 'Portugal', code: 'PT' },
  { value: '62', label: 'Qatar', code: 'QA' },
  { value: '63', label: 'Romania', code: 'RO' },
  { value: '64', label: 'Russia', code: 'RU' },
  { value: '65', label: 'Saudi Arabia', code: 'SA' },
  { value: '66', label: 'Singapore', code: 'SG' },
  { value: '67', label: 'South Africa', code: 'ZA' },
  { value: '68', label: 'South Korea', code: 'KR' },
  { value: '69', label: 'Spain', code: 'ES' },
  { value: '70', label: 'Sri Lanka', code: 'LK' },
  { value: '71', label: 'Sweden', code: 'SE' },
  { value: '72', label: 'Switzerland', code: 'CH' },
  { value: '73', label: 'Thailand', code: 'TH' },
  { value: '74', label: 'Turkey', code: 'TR' },
  { value: '75', label: 'United Arab Emirates', code: 'AE' },
  { value: '76', label: 'United Kingdom', code: 'GB' },
  { value: '77', label: 'United States', code: 'US' },
  { value: '78', label: 'Vietnam', code: 'VN' },
];

const currencies = [
  {
    value: '1',
    label: 'USD',
    symbol: '$',
  },
  {
    value: '2',
    label: 'EUR',
    symbol: '€',
  },
  {
    value: '3',
    label: 'INR',
    symbol: '₹',
  },
];

const statuses = [
  {
    value: '6',
    label: 'Draft',
  },
  {
    value: '4',
    label: 'Sent',
  },
  {
    value: '1',
    label: 'Open',
  },
  {
    value: '5',
    label: 'Revised',
  },
  {
    value: '2',
    label: 'Declined',
  },
  {
    value: '3',
    label: 'Accepted',
  },
];

const taxes = [
  {
    value: 'IGST|12.00',
    label: 'IGST 12%',
    rate: 12,
  },
];


// =======================================================
// HELPERS
// =======================================================

const getToday = () => {
  const date = new Date();

  return date.toISOString().split('T')[0];
};


const getDefaultOpenTill = () => {
  const date = new Date();

  date.setDate(date.getDate() + 7);

  return date.toISOString().split('T')[0];
};


const createEmptyItem = () => ({
  id: Date.now() + Math.random(),
  description: '',
  long_description: '',
  quantity: 1,
  unit: '',
  rate: 0,
  taxname: [],
  optional: false,
});


// =======================================================
// COMPONENT
// =======================================================

const ProposalsAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const [subject, setSubject] = useState('');

  const [relType, setRelType] = useState('');

  const [relId, setRelId] = useState('');

  const [projectId, setProjectId] = useState('');

  const [date, setDate] = useState(getToday());

  const [openTill, setOpenTill] = useState(
    getDefaultOpenTill()
  );

  const [currency, setCurrency] = useState('1');

  const [discountType, setDiscountType] = useState('');

  const [tags, setTags] = useState('');

  const [allowComments, setAllowComments] =
    useState(true);

  const [status, setStatus] = useState('6');

  const [assigned, setAssigned] =
    useState('1');

  const [proposalTo, setProposalTo] =
    useState('');

  const [address, setAddress] =
    useState('');

  const [city, setCity] =
    useState('');

  const [state, setState] =
    useState('');

  const [country, setCountry] =
    useState('');

  const [zip, setZip] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [showQuantityAs, setShowQuantityAs] =
    useState('1');

  const [items, setItems] = useState([
    createEmptyItem(),
  ]);

  const [discountPercent, setDiscountPercent] =
    useState(0);

  const [discountTotal, setDiscountTotal] =
    useState(0);

  const [discountMode, setDiscountMode] =
    useState('percent');

  const [adjustment, setAdjustment] =
    useState(0);


  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setSubject('');
    setRelType('');
    setRelId('');
    setProjectId('');

    setDate(getToday());
    setOpenTill(getDefaultOpenTill());

    setCurrency('1');
    setDiscountType('');
    setTags('');

    setAllowComments(true);

    setStatus('6');
    setAssigned('1');

    setProposalTo('');
    setAddress('');
    setCity('');
    setState('');
    setCountry('');
    setZip('');
    setEmail('');
    setPhone('');

    setShowQuantityAs('1');

    setItems([
      createEmptyItem(),
    ]);

    setDiscountPercent(0);
    setDiscountTotal(0);
    setDiscountMode('percent');

    setAdjustment(0);
  };


  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) return;

    resetForm();

    closeDialog();
  };


  // =====================================================
  // ITEM FUNCTIONS
  // =====================================================

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      createEmptyItem(),
    ]);
  };


  const removeItem = (id) => {
    setItems((previous) => {
      if (previous.length === 1) {
        return previous;
      }

      return previous.filter(
        (item) => item.id !== id
      );
    });
  };


  const updateItem = (
    id,
    field,
    value
  ) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };


  const toggleTax = (
    itemId,
    taxValue
  ) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const exists =
          item.taxname.includes(taxValue);

        return {
          ...item,
          taxname: exists
            ? item.taxname.filter(
                (tax) => tax !== taxValue
              )
            : [
                ...item.taxname,
                taxValue,
              ],
        };
      })
    );
  };


  // =====================================================
  // CALCULATIONS
  // =====================================================

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) => {
        const quantity =
          Number(item.quantity) || 0;

        const rate =
          Number(item.rate) || 0;

        return total + quantity * rate;
      },
      0
    );
  }, [items]);


  const taxTotal = useMemo(() => {
    return items.reduce(
      (total, item) => {
        const quantity =
          Number(item.quantity) || 0;

        const rate =
          Number(item.rate) || 0;

        const amount =
          quantity * rate;

        const itemTax = item.taxname.reduce(
          (taxTotalForItem, taxValue) => {
            const tax = taxes.find(
              (taxItem) =>
                taxItem.value === taxValue
            );

            if (!tax) {
              return taxTotalForItem;
            }

            return (
              taxTotalForItem +
              (amount * tax.rate) / 100
            );
          },
          0
        );

        return total + itemTax;
      },
      0
    );
  }, [items]);


  const calculatedDiscount = useMemo(() => {
    if (discountMode === 'fixed') {
      return Number(discountTotal) || 0;
    }

    const percent =
      Number(discountPercent) || 0;

    return (
      subtotal *
      Math.min(Math.max(percent, 0), 100) /
      100
    );
  }, [
    subtotal,
    discountMode,
    discountPercent,
    discountTotal,
  ]);


  const total = useMemo(() => {
    const adjustmentValue =
      Number(adjustment) || 0;

    return Math.max(
      0,
      subtotal +
        taxTotal -
        calculatedDiscount +
        adjustmentValue
    );
  }, [
    subtotal,
    taxTotal,
    calculatedDiscount,
    adjustment,
  ]);


  const selectedCurrency =
    currencies.find(
      (item) =>
        item.value === currency
    ) || currencies[0];


  const formatMoney = (value) => {
    return `${selectedCurrency.symbol}${Number(
      value || 0
    ).toFixed(2)}`;
  };


  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event,
    saveAndSend = false
  ) => {
    event.preventDefault();

    const trimmedSubject =
      subject.trim();

    const trimmedProposalTo =
      proposalTo.trim();

    if (!trimmedSubject) {
      showErrorToast(
        'Subject is required.'
      );

      return;
    }

    if (!relType) {
      showErrorToast(
        'Related type is required.'
      );

      return;
    }

    if (!trimmedProposalTo) {
      showErrorToast(
        'Proposal To is required.'
      );

      return;
    }

    if (!date) {
      showErrorToast(
        'Date is required.'
      );

      return;
    }

    if (!currency) {
      showErrorToast(
        'Currency is required.'
      );

      return;
    }

    if (!email.trim()) {
      showErrorToast(
        'Email is required.'
      );

      return;
    }

    try {
      setLoading(true);

      const payload = {
        subject: trimmedSubject,

        rel_type: relType,
        rel_id: relId || null,
        project_id: projectId || null,

        date,
        open_till: openTill || null,

        currency,

        discount_type:
          discountType || null,

        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),

        allow_comments:
          allowComments ? 1 : 0,

        status,

        assigned,

        proposal_to:
          trimmedProposalTo,

        address,
        city,
        state,
        country,
        zip,
        email,
        phone,

        show_quantity_as:
          showQuantityAs,

        items: items.map((item) => ({
          description:
            item.description.trim(),

          long_description:
            item.long_description.trim(),

          quantity:
            Number(item.quantity) || 0,

          unit: item.unit.trim(),

          rate:
            Number(item.rate) || 0,

          taxname: item.taxname,

          optional:
            item.optional ? 1 : 0,
        })),

        subtotal:
          Number(subtotal.toFixed(2)),

        discount_percent:
          Number(discountPercent) || 0,

        discount_total:
          Number(
            calculatedDiscount.toFixed(2)
          ),

        adjustment:
          Number(adjustment) || 0,

        tax_total:
          Number(taxTotal.toFixed(2)),

        total:
          Number(total.toFixed(2)),

        save_and_send:
          saveAndSend ? 1 : 0,
      };


      const response = await apiFetch(
        '/api/proposals',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(payload),
        }
      );


      const result =
        await response
          .json()
          .catch(() => ({}));


      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to create Proposal.'
        );
      }


      showSuccessToast(
        result?.message ||
          (
            saveAndSend
              ? 'Proposal saved and sent successfully.'
              : 'Proposal created successfully.'
          )
      );


      resetForm();


      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE PROPOSAL ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create Proposal.'
      );
    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // JSX
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-h-[95vh] max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            New Proposal
          </DialogTitle>

          <DialogDescription>
            Create a new proposal.
          </DialogDescription>
        </DialogHeader>


        <form
          onSubmit={(event) =>
            handleSubmit(event, false)
          }
          className="space-y-6"
        >

          {/* =================================================
              BASIC PROPOSAL INFORMATION
          ================================================= */}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* LEFT */}

            <div className="space-y-5 border-r pr-0 lg:pr-6">

              {/* Subject */}

              <div className="space-y-2">
                <label
                  htmlFor="subject"
                  className="text-sm font-medium"
                >
                  <span className="text-destructive">
                    *
                  </span>{' '}
                  Subject
                </label>

                <Input
                  id="subject"
                  value={subject}
                  onChange={(event) =>
                    setSubject(
                      event.target.value
                    )
                  }
                  placeholder="Enter proposal subject"
                  disabled={loading}
                  autoFocus
                />
              </div>


              {/* Related */}

              <div className="space-y-2">
                <label
                  htmlFor="rel_type"
                  className="text-sm font-medium"
                >
                  <span className="text-destructive">
                    *
                  </span>{' '}
                  Related
                </label>

                <select
                  id="rel_type"
                  value={relType}
                  onChange={(event) =>
                    setRelType(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">
                    Nothing selected
                  </option>

                  <option value="lead">
                    Lead
                  </option>

                  <option value="customer">
                    Customer
                  </option>
                </select>
              </div>


              {/* Related ID */}

              {relType && (
                <div className="space-y-2">
                  <label
                    htmlFor="rel_id"
                    className="text-sm font-medium"
                  >
                    <span className="text-destructive">
                      *
                    </span>{' '}
                    {relType === 'lead'
                      ? 'Lead'
                      : 'Customer'}
                  </label>

                  <Input
                    id="rel_id"
                    value={relId}
                    onChange={(event) =>
                      setRelId(
                        event.target.value
                      )
                    }
                    placeholder={`Enter ${relType} ID`}
                    disabled={loading}
                  />
                </div>
              )}


              {/* Project */}

              <div className="space-y-2">
                <label
                  htmlFor="project_id"
                  className="text-sm font-medium"
                >
                  Project
                </label>

                <Input
                  id="project_id"
                  value={projectId}
                  onChange={(event) =>
                    setProjectId(
                      event.target.value
                    )
                  }
                  placeholder="Enter project ID"
                  disabled={loading}
                />
              </div>


              {/* Date */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <label
                    htmlFor="date"
                    className="text-sm font-medium"
                  >
                    <span className="text-destructive">
                      *
                    </span>{' '}
                    Date
                  </label>

                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target.value
                      )
                    }
                    disabled={loading}
                  />
                </div>


                <div className="space-y-2">
                  <label
                    htmlFor="open_till"
                    className="text-sm font-medium"
                  >
                    Open Till
                  </label>

                  <Input
                    id="open_till"
                    type="date"
                    value={openTill}
                    onChange={(event) =>
                      setOpenTill(
                        event.target.value
                      )
                    }
                    disabled={loading}
                  />
                </div>

              </div>


              {/* Currency / Discount */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <label
                    htmlFor="currency"
                    className="text-sm font-medium"
                  >
                    <span className="text-destructive">
                      *
                    </span>{' '}
                    Currency
                  </label>

                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) =>
                      setCurrency(
                        event.target.value
                      )
                    }
                    disabled={loading}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    {currencies.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}{' '}
                          {item.symbol}
                        </option>
                      )
                    )}
                  </select>
                </div>


                <div className="space-y-2">
                  <label
                    htmlFor="discount_type"
                    className="text-sm font-medium"
                  >
                    Discount Type
                  </label>

                  <select
                    id="discount_type"
                    value={discountType}
                    onChange={(event) =>
                      setDiscountType(
                        event.target.value
                      )
                    }
                    disabled={loading}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">
                      No discount
                    </option>

                    <option value="before_tax">
                      Before Tax
                    </option>

                    <option value="after_tax">
                      After Tax
                    </option>
                  </select>
                </div>

              </div>


              {/* Tags */}

              <div className="space-y-2">
                <label
                  htmlFor="tags"
                  className="text-sm font-medium"
                >
                  Tags
                </label>

                <Input
                  id="tags"
                  value={tags}
                  onChange={(event) =>
                    setTags(
                      event.target.value
                    )
                  }
                  placeholder="Tag, Tag 2, Tag 3"
                  disabled={loading}
                />

                <p className="text-xs text-muted-foreground">
                  Separate multiple tags with commas.
                </p>
              </div>


              {/* Comments */}

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">
                    Allow Comments
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Allow clients to comment on this proposal.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={allowComments}
                  disabled={loading}
                  onClick={() =>
                    setAllowComments(
                      (value) => !value
                    )
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                    allowComments
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none block size-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                      allowComments
                        ? 'translate-x-5'
                        : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

            </div>


            {/* RIGHT */}

            <div className="space-y-5">

              {/* Status / Assigned */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <label
                    htmlFor="status"
                    className="text-sm font-medium"
                  >
                    Status
                  </label>

                  <select
                    id="status"
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value
                      )
                    }
                    disabled={loading}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    {statuses.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </select>
                </div>


                <div className="space-y-2">
                  <label
                    htmlFor="assigned"
                    className="text-sm font-medium"
                  >
                    Assigned
                  </label>

                  <select
                    id="assigned"
                    value={assigned}
                    onChange={(event) =>
                      setAssigned(
                        event.target.value
                      )
                    }
                    disabled={loading}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="1">
                      Rang Dhara
                    </option>
                  </select>
                </div>

              </div>


              {/* Proposal To */}

              <div className="space-y-2">
                <label
                  htmlFor="proposal_to"
                  className="text-sm font-medium"
                >
                  <span className="text-destructive">
                    *
                  </span>{' '}
                  To
                </label>

                <Input
                  id="proposal_to"
                  value={proposalTo}
                  onChange={(event) =>
                    setProposalTo(
                      event.target.value
                    )
                  }
                  placeholder="Enter customer name"
                  disabled={loading}
                />
              </div>


              {/* Address */}

              <div className="space-y-2">
                <label
                  htmlFor="address"
                  className="text-sm font-medium"
                >
                  Address
                </label>

                <Textarea
                  id="address"
                  rows={4}
                  value={address}
                  onChange={(event) =>
                    setAddress(
                      event.target.value
                    )
                  }
                  placeholder="Enter address"
                  disabled={loading}
                />
              </div>


              {/* City / State */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <label
                    htmlFor="city"
                    className="text-sm font-medium"
                  >
                    City
                  </label>

                  <Input
                    id="city"
                    value={city}
                    onChange={(event) =>
                      setCity(
                        event.target.value
                      )
                    }
                    placeholder="City"
                    disabled={loading}
                  />
                </div>


                <div className="space-y-2">
                  <label
                    htmlFor="state"
                    className="text-sm font-medium"
                  >
                    State
                  </label>

                  <Input
                    id="state"
                    value={state}
                    onChange={(event) =>
                      setState(
                        event.target.value
                      )
                    }
                    placeholder="State"
                    disabled={loading}
                  />
                </div>

              </div>


              {/* Country / Zip */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <label
                    htmlFor="country"
                    className="text-sm font-medium"
                  >
                    Country
                  </label>

                  <select
                    id="country"
                    value={country}
                    onChange={(event) =>
                      setCountry(
                        event.target.value
                      )
                    }
                    disabled={loading}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">
                      Nothing selected
                    </option>

                    {countries.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label} (
                          {item.code})
                        </option>
                      )
                    )}
                  </select>
                </div>


                <div className="space-y-2">
                  <label
                    htmlFor="zip"
                    className="text-sm font-medium"
                  >
                    Zip Code
                  </label>

                  <Input
                    id="zip"
                    value={zip}
                    onChange={(event) =>
                      setZip(
                        event.target.value
                      )
                    }
                    placeholder="Zip Code"
                    disabled={loading}
                  />
                </div>

              </div>


              {/* Email / Phone */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium"
                  >
                    <span className="text-destructive">
                      *
                    </span>{' '}
                    Email
                  </label>

                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="Email"
                    disabled={loading}
                  />
                </div>


                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="text-sm font-medium"
                  >
                    Phone
                  </label>

                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    placeholder="Phone"
                    disabled={loading}
                  />
                </div>

              </div>

            </div>

          </div>


          {/* =================================================
              ITEMS
          ================================================= */}

          <div className="border-t pt-6">

            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <h3 className="text-lg font-semibold">
                  Proposal Items
                </h3>

                <p className="text-sm text-muted-foreground">
                  Add products or services to this proposal.
                </p>
              </div>


              <div className="flex flex-wrap items-center gap-4">

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
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
                      className="flex cursor-pointer items-center gap-1.5 text-sm"
                    >
                      <input
                        type="radio"
                        name="show_quantity_as"
                        value={option.value}
                        checked={
                          showQuantityAs ===
                          option.value
                        }
                        onChange={(event) =>
                          setShowQuantityAs(
                            event.target.value
                          )
                        }
                        disabled={loading}
                      />

                      {option.label}
                    </label>
                  ))}
                </div>


                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  disabled={loading}
                >
                  <RiAddLine className="mr-1 size-4" />
                  Add Item
                </Button>

              </div>

            </div>


            {/* ITEM TABLE */}

            <div className="overflow-x-auto rounded-md border">

              <table className="w-full min-w-[1050px] text-sm">

                <thead className="bg-muted/50">

                  <tr>
                    <th className="w-[20%] p-3 text-left font-medium">
                      Item
                    </th>

                    <th className="w-[24%] p-3 text-left font-medium">
                      Description
                    </th>

                    <th className="w-[12%] p-3 text-right font-medium">
                      Qty
                    </th>

                    <th className="w-[13%] p-3 text-right font-medium">
                      Rate
                    </th>

                    <th className="w-[17%] p-3 text-left font-medium">
                      Tax
                    </th>

                    <th className="w-[10%] p-3 text-right font-medium">
                      Amount
                    </th>

                    <th className="w-[4%] p-3 text-center font-medium">
                      &nbsp;
                    </th>
                  </tr>

                </thead>


                <tbody>

                  {items.map(
                    (item) => {
                      const itemAmount =
                        (Number(
                          item.quantity
                        ) || 0) *
                        (Number(
                          item.rate
                        ) || 0);

                      return (
                        <tr
                          key={item.id}
                          className="border-t align-top"
                        >

                          {/* ITEM */}

                          <td className="p-3">

                            <Textarea
                              rows={3}
                              value={
                                item.description
                              }
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  'description',
                                  event.target.value
                                )
                              }
                              placeholder="Description"
                              disabled={loading}
                            />


                            <label className="mt-3 flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={
                                  item.optional
                                }
                                onChange={(event) =>
                                  updateItem(
                                    item.id,
                                    'optional',
                                    event.target.checked
                                  )
                                }
                                disabled={loading}
                              />

                              This item is optional
                            </label>

                          </td>


                          {/* LONG DESCRIPTION */}

                          <td className="p-3">

                            <Textarea
                              rows={4}
                              value={
                                item.long_description
                              }
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  'long_description',
                                  event.target.value
                                )
                              }
                              placeholder="Long description"
                              disabled={loading}
                            />

                          </td>


                          {/* QTY */}

                          <td className="p-3">

                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                item.quantity
                              }
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  'quantity',
                                  event.target.value
                                )
                              }
                              placeholder="Quantity"
                              disabled={loading}
                            />


                            <Input
                              className="mt-2"
                              value={
                                item.unit
                              }
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  'unit',
                                  event.target.value
                                )
                              }
                              placeholder="Unit"
                              disabled={loading}
                            />

                          </td>


                          {/* RATE */}

                          <td className="p-3">

                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                item.rate
                              }
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  'rate',
                                  event.target.value
                                )
                              }
                              placeholder="Rate"
                              disabled={loading}
                            />

                          </td>


                          {/* TAX */}

                          <td className="p-3">

                            <div className="space-y-2">

                              {taxes.map(
                                (tax) => (
                                  <label
                                    key={
                                      tax.value
                                    }
                                    className="flex cursor-pointer items-center gap-2 text-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.taxname.includes(
                                        tax.value
                                      )}
                                      onChange={() =>
                                        toggleTax(
                                          item.id,
                                          tax.value
                                        )
                                      }
                                      disabled={
                                        loading
                                      }
                                    />

                                    {tax.label}
                                  </label>
                                )
                              )}

                              {item.taxname.length ===
                                0 && (
                                <span className="text-xs text-muted-foreground">
                                  No Tax
                                </span>
                              )}

                            </div>

                          </td>


                          {/* AMOUNT */}

                          <td className="p-3 text-right font-medium">

                            {formatMoney(
                              itemAmount
                            )}

                          </td>


                          {/* DELETE */}

                          <td className="p-3 text-center">

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                removeItem(
                                  item.id
                                )
                              }
                              disabled={
                                loading ||
                                items.length === 1
                              }
                              title="Remove item"
                            >
                              <RiDeleteBinLine className="size-4 text-destructive" />
                            </Button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          </div>


          {/* =================================================
              TOTALS
          ================================================= */}

          <div className="flex justify-end">

            <div className="w-full max-w-xl rounded-md border">

              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-medium">
                  Sub Total:
                </span>

                <span className="font-semibold">
                  {formatMoney(subtotal)}
                </span>
              </div>


              {/* DISCOUNT */}

              <div className="border-b px-4 py-4">

                <div className="grid grid-cols-[1fr_180px] items-center gap-4">

                  <span className="font-medium">
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
                          : discountTotal
                      }
                      onChange={(event) => {
                        if (
                          discountMode ===
                          'percent'
                        ) {
                          setDiscountPercent(
                            event.target.value
                          );
                        } else {
                          setDiscountTotal(
                            event.target.value
                          );
                        }
                      }}
                      disabled={loading}
                      className="rounded-r-none"
                    />

                    <select
                      value={
                        discountMode
                      }
                      onChange={(event) =>
                        setDiscountMode(
                          event.target.value
                        )
                      }
                      disabled={loading}
                      className="h-9 rounded-r-md border border-l-0 border-input bg-background px-3 text-sm"
                    >
                      <option value="percent">
                        %
                      </option>

                      <option value="fixed">
                        Fixed
                      </option>
                    </select>

                  </div>

                </div>

              </div>


              <div className="flex items-center justify-between border-b px-4 py-3">

                <span className="font-medium">
                  Discount Total:
                </span>

                <span>
                  -{formatMoney(
                    calculatedDiscount
                  )}
                </span>

              </div>


              {/* TAX */}

              <div className="flex items-center justify-between border-b px-4 py-3">

                <span className="font-medium">
                  Tax:
                </span>

                <span>
                  {formatMoney(taxTotal)}
                </span>

              </div>


              {/* ADJUSTMENT */}

              <div className="grid grid-cols-[1fr_180px] items-center gap-4 border-b px-4 py-4">

                <span className="font-medium">
                  Adjustment
                </span>

                <Input
                  type="number"
                  step="any"
                  value={adjustment}
                  onChange={(event) =>
                    setAdjustment(
                      event.target.value
                    )
                  }
                  disabled={loading}
                />

              </div>


              {/* TOTAL */}

              <div className="flex items-center justify-between bg-muted/50 px-4 py-4">

                <span className="text-base font-bold">
                  Total:
                </span>

                <span className="text-lg font-bold">
                  {formatMoney(total)}
                </span>

              </div>

            </div>

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <DialogFooter className="flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-left text-xs text-muted-foreground">
              Include proposal items with merge
              field anywhere in proposal content
              as{' '}
              <strong>
                {'{proposal_items}'}
              </strong>
            </p>


            <div className="flex gap-2">

              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>


              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={(event) =>
                  handleSubmit(
                    event,
                    true
                  )
                }
              >
                {loading
                  ? 'Saving...'
                  : 'Save & Send'}
              </Button>


              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Creating...'
                  : 'Save'}
              </Button>

            </div>

          </DialogFooter>

        </form>

      </DialogContent>
    </Dialog>
  );
};


export default ProposalsAddDialog;