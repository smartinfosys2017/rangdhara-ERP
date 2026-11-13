"use client";

import { useMemo, useState } from "react";

import {
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiDownloadLine,
  RiFileTextLine,
  RiMapPinLine,
  RiMailLine,
  RiMessage3Line,
  RiPhoneLine,
  RiUserLine,
} from "@remixicon/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

// =======================================================
// CONSTANTS
// =======================================================

const currencies = [
  {
    value: "1",
    label: "USD",
    symbol: "$",
  },
  {
    value: "2",
    label: "EUR",
    symbol: "€",
  },
  {
    value: "3",
    label: "INR",
    symbol: "₹",
  },
];

const statuses = [
  {
    value: "6",
    label: "Draft",
  },
  {
    value: "4",
    label: "Sent",
  },
  {
    value: "1",
    label: "Open",
  },
  {
    value: "5",
    label: "Revised",
  },
  {
    value: "2",
    label: "Declined",
  },
  {
    value: "3",
    label: "Accepted",
  },
];

// =======================================================
// HELPERS
// =======================================================

const getStatusLabel = (status) => {
  const found = statuses.find((item) => String(item.value) === String(status));

  return found?.label || status || "Draft";
};

const getCurrency = (currency) => {
  return (
    currencies.find((item) => String(item.value) === String(currency)) ||
    currencies[0]
  );
};

const formatMoney = (value, currency) => {
  const selectedCurrency = getCurrency(currency);

  const number = Number(value || 0);

  return `${selectedCurrency.symbol}${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags;
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const getItems = (proposal) => {
  if (!proposal || !Array.isArray(proposal.items)) {
    return [];
  }

  return proposal.items;
};

const getItemTaxRate = (taxname) => {
  if (!Array.isArray(taxname)) {
    return 0;
  }

  return taxname.reduce((total, taxValue) => {
    const parts = String(taxValue).split("|");
    const rate = Number(parts[1]) || 0;

    return total + rate;
  }, 0);
};

const getItemTaxNames = (taxname) => {
  if (!Array.isArray(taxname)) {
    return [];
  }

  return taxname
    .map((tax) => {
      const parts = String(tax).split("|");

      return {
        name: parts[0] || "",
        rate: Number(parts[1]) || 0,
      };
    })
    .filter((tax) => tax.name);
};

// =======================================================
// STATUS BADGE
// =======================================================

const StatusBadge = ({ status }) => {
  const statusLabel = getStatusLabel(status);

  const statusClasses = {
    Draft: "bg-muted text-muted-foreground",

    Sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",

    Open: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",

    Revised:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",

    Declined: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",

    Accepted:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",

    Expired: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        statusClasses[statusLabel] || "bg-muted text-muted-foreground"
      }`}
    >
      {statusLabel}
    </span>
  );
};

// =======================================================
// DETAIL ROW
// =======================================================

const DetailRow = ({ label, value, icon: Icon }) => {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>

      <div className="font-medium">
        {Icon ? (
          <span className="flex items-center gap-1.5">
            <Icon className="size-4 text-muted-foreground" />
            {value || "-"}
          </span>
        ) : (
          value || "-"
        )}
      </div>
    </div>
  );
};

// =======================================================
// COMPONENT
// =======================================================

const ProposalsViewDialog = ({ open, closeDialog, proposal }) => {
  const [activeTab, setActiveTab] = useState("summary");

  const [comment, setComment] = useState("");

  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // =======================================================
  // NORMALIZED DATA
  // =======================================================

  const items = useMemo(() => getItems(proposal), [proposal]);

  const tags = useMemo(() => getTags(proposal?.tags), [proposal]);

  const currency = proposal?.currency || "1";

  const status = getStatusLabel(proposal?.status);

  const proposalNumber =
    proposal?.proposal_number ||
    proposal?.proposalNumber ||
    proposal?.number ||
    (proposal?.id
      ? `PRO-${String(proposal.id).padStart(6, "0")}`
      : "PRO-000000");

  const subject = proposal?.subject || proposal?.proposal_subject || "-";

  const proposalTo =
    proposal?.proposal_to ||
    proposal?.proposalTo ||
    proposal?.customer ||
    proposal?.to ||
    "-";

  const relatedType = proposal?.rel_type || proposal?.relType || "";

  const relatedId = proposal?.rel_id || proposal?.relId || "";

  const projectId = proposal?.project_id || proposal?.projectId || "";

  const project =
    proposal?.project_name || proposal?.projectName || proposal?.project || "";

  const assigned =
    proposal?.assigned_name || proposal?.assigned || "Rang Dhara";

  // =======================================================
  // CALCULATIONS
  // =======================================================

  const calculatedSubtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item?.quantity) || 0;
      const rate = Number(item?.rate) || 0;

      return total + quantity * rate;
    }, 0);
  }, [items]);

  const calculatedTax = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item?.quantity) || 0;
      const rate = Number(item?.rate) || 0;

      const amount = quantity * rate;

      const taxRate = getItemTaxRate(item?.taxname);

      return total + (amount * taxRate) / 100;
    }, 0);
  }, [items]);

  const subtotal =
    proposal?.subtotal !== undefined && proposal?.subtotal !== null
      ? Number(proposal.subtotal)
      : calculatedSubtotal;

  const taxTotal =
    proposal?.tax_total !== undefined && proposal?.tax_total !== null
      ? Number(proposal.tax_total)
      : proposal?.taxTotal !== undefined && proposal?.taxTotal !== null
        ? Number(proposal.taxTotal)
        : calculatedTax;

  const discountTotal =
    proposal?.discount_total !== undefined && proposal?.discount_total !== null
      ? Number(proposal.discount_total)
      : proposal?.discountTotal !== undefined &&
          proposal?.discountTotal !== null
        ? Number(proposal.discountTotal)
        : 0;

  const adjustment = Number(proposal?.adjustment) || 0;

  const calculatedTotal = Math.max(
    0,
    subtotal - discountTotal + taxTotal + adjustment,
  );

  const total =
    proposal?.total !== undefined &&
    proposal?.total !== null &&
    !String(proposal.total).includes("$") &&
    !String(proposal.total).includes("€") &&
    !String(proposal.total).includes("₹")
      ? Number(proposal.total)
      : proposal?.totalNumeric !== undefined
        ? Number(proposal.totalNumeric)
        : calculatedTotal;

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    setActiveTab("summary");
    setComment("");

    if (closeDialog) {
      closeDialog();
    }
  };

  // =======================================================
  // ACCEPT
  // =======================================================

  const handleAccept = () => {
    toast.success(`Proposal ${proposalNumber} accepted successfully.`);
  };

  // =======================================================
  // DECLINE
  // =======================================================

  const handleDecline = () => {
    toast.success(`Proposal ${proposalNumber} declined.`);
  };

  // =======================================================
  // DOWNLOAD
  // =======================================================

  const handleDownload = () => {
    toast.info("PDF download will be connected to the proposal API.");
  };

  // =======================================================
  // COMMENT
  // =======================================================

  const handleComment = async (event) => {
    event.preventDefault();

    if (!comment.trim()) {
      toast.error("Please enter a comment.");
      return;
    }

    setIsSubmittingComment(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success("Comment added successfully.");

      setComment("");
    } catch (error) {
      toast.error("Unable to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // =======================================================
  // JSX
  // =======================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-h-[95vh] max-w-7xl overflow-y-auto p-0">
        {/* =================================================
            HEADER
        ================================================= */}

        <DialogHeader className="border-b px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Proposal Preview
              </DialogTitle>

              <DialogDescription className="mt-1">
                View proposal details, items and customer information.
              </DialogDescription>
            </div>

            <StatusBadge status={proposal?.status} />
          </div>
        </DialogHeader>

        {/* =================================================
            PROPOSAL PREVIEW
        ================================================= */}

        <div className="bg-background">
          {/* =================================================
              PROPOSAL HEADER
          ================================================= */}

          <div className="border-b bg-background px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">#{proposalNumber}</h2>

                <p className="mt-1 text-sm text-muted-foreground">{subject}</p>
              </div>

              {/* ACTION BUTTONS */}

              <div className="flex flex-wrap gap-2">
                {status !== "Accepted" && status !== "Declined" && (
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleAccept}
                  >
                    <RiCheckLine className="size-4" />
                    Accept
                  </Button>
                )}

                {status !== "Accepted" && status !== "Declined" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDecline}
                  >
                    <RiCloseLine className="size-4" />
                    Decline
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownload}
                >
                  <RiDownloadLine className="size-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
            {/* =================================================
                LEFT - ITEMS
            ================================================= */}

            <div className="lg:col-span-8">
              <div className="rounded-lg border">
                <div className="border-b px-4 py-3">
                  <h3 className="font-semibold">Proposal Items</h3>
                </div>

                {items.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No proposal items available.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="w-10 p-3 text-center font-medium">
                            #
                          </th>

                          <th className="p-3 text-left font-medium">Item</th>

                          <th className="p-3 text-right font-medium">Qty</th>

                          <th className="p-3 text-right font-medium">Rate</th>

                          <th className="p-3 text-right font-medium">Tax</th>

                          <th className="p-3 text-right font-medium">Amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {items.map((item, index) => {
                          const quantity = Number(item?.quantity) || 0;

                          const rate = Number(item?.rate) || 0;

                          const amount = quantity * rate;

                          const taxNames = getItemTaxNames(item?.taxname);

                          return (
                            <tr
                              key={item?.id || index}
                              className="border-b align-top last:border-b-0"
                            >
                              {/* NUMBER */}

                              <td className="p-3 text-center">{index + 1}</td>

                              {/* ITEM */}

                              <td className="p-3">
                                <div className="font-semibold">
                                  {item?.description || `Item ${index + 1}`}
                                </div>

                                {item?.long_description && (
                                  <div className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                                    {item.long_description}
                                  </div>
                                )}

                                {item?.optional && (
                                  <span className="mt-2 inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                                    Optional
                                  </span>
                                )}
                              </td>

                              {/* QUANTITY */}

                              <td className="p-3 text-right">
                                {quantity}

                                {item?.unit ? ` ${item.unit}` : ""}
                              </td>

                              {/* RATE */}

                              <td className="p-3 text-right">
                                {formatMoney(rate, currency)}
                              </td>

                              {/* TAX */}

                              <td className="p-3 text-right">
                                {taxNames.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {taxNames.map((tax, taxIndex) => (
                                      <div
                                        key={`${tax.name}-${taxIndex}`}
                                        className="whitespace-nowrap text-xs"
                                      >
                                        {tax.name} {tax.rate.toFixed(2)}%
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </td>

                              {/* AMOUNT */}

                              <td className="p-3 text-right font-semibold">
                                {formatMoney(amount, currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* =================================================
                  TOTALS
              ================================================= */}

              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-md rounded-lg border">
                  {/* SUBTOTAL */}

                  <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                    <span className="font-medium">Sub Total</span>

                    <span>{formatMoney(subtotal, currency)}</span>
                  </div>

                  {/* DISCOUNT */}

                  {discountTotal > 0 && (
                    <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                      <span className="font-medium">Discount</span>

                      <span>-{formatMoney(discountTotal, currency)}</span>
                    </div>
                  )}

                  {/* TAX */}

                  {taxTotal > 0 && (
                    <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                      <span className="font-medium">Tax</span>

                      <span>{formatMoney(taxTotal, currency)}</span>
                    </div>
                  )}

                  {/* ADJUSTMENT */}

                  {adjustment !== 0 && (
                    <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                      <span className="font-medium">Adjustment</span>

                      <span>{formatMoney(adjustment, currency)}</span>
                    </div>
                  )}

                  {/* TOTAL */}

                  <div className="flex items-center justify-between bg-muted/40 px-4 py-4">
                    <span className="text-base font-bold">Total</span>

                    <span className="text-xl font-bold">
                      {formatMoney(total, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                RIGHT - SUMMARY / DISCUSSION
            ================================================= */}

            <div className="lg:col-span-4">
              <div className="sticky top-4">
                {/* =================================================
                    TABS
                ================================================= */}

                <div className="border-b">
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("summary")}
                      className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                        activeTab === "summary"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <RiFileTextLine className="size-4" />
                      Summary
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("discussion")}
                      className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                        activeTab === "discussion"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <RiMessage3Line className="size-4" />
                      Discussion
                    </button>
                  </div>
                </div>

                {/* =================================================
                    SUMMARY
                ================================================= */}

                {activeTab === "summary" && (
                  <div className="mt-4 rounded-lg border">
                    <div className="space-y-5 p-5">
                      {/* CUSTOMER */}

                      <div>
                        <h3 className="mb-3 text-sm font-semibold">
                          Customer Information
                        </h3>

                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-muted p-2">
                            <RiUserLine className="size-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              Proposal To
                            </p>

                            <p className="mt-1 break-words font-medium">
                              {proposalTo}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* CONTACT */}

                      {(proposal?.phone || proposal?.email) && (
                        <div className="space-y-3">
                          {proposal?.phone && (
                            <div className="flex items-start gap-3">
                              <RiPhoneLine className="mt-0.5 size-4 text-muted-foreground" />

                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                  Phone
                                </p>

                                <p className="mt-1 break-all text-sm font-medium">
                                  {proposal.phone}
                                </p>
                              </div>
                            </div>
                          )}

                          {proposal?.email && (
                            <div className="flex items-start gap-3">
                              <RiMailLine className="mt-0.5 size-4 text-muted-foreground" />

                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                  Email
                                </p>

                                <p className="mt-1 break-all text-sm font-medium">
                                  {proposal.email}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ADDRESS */}

                      {(proposal?.address ||
                        proposal?.city ||
                        proposal?.state ||
                        proposal?.country ||
                        proposal?.zip) && (
                        <div>
                          <div className="mb-3 flex items-center gap-2">
                            <RiMapPinLine className="size-4 text-muted-foreground" />

                            <h3 className="text-sm font-semibold">Address</h3>
                          </div>

                          <div className="space-y-1 text-sm text-muted-foreground">
                            {proposal?.address && (
                              <p className="whitespace-pre-line">
                                {proposal.address}
                              </p>
                            )}

                            {proposal?.city && <p>{proposal.city}</p>}

                            {proposal?.state && <p>{proposal.state}</p>}

                            {proposal?.country && <p>{proposal.country}</p>}

                            {proposal?.zip && <p>{proposal.zip}</p>}
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-4">
                        {/* TOTAL */}

                        <div className="mb-5">
                          <p className="text-xs text-muted-foreground">Total</p>

                          <p className="mt-1 text-2xl font-bold">
                            {formatMoney(total, currency)}
                          </p>
                        </div>

                        {/* DETAILS */}

                        <div className="space-y-3">
                          <DetailRow label="Status" value={status} />

                          <DetailRow
                            label="Date"
                            value={formatDate(proposal?.date)}
                            icon={RiCalendarLine}
                          />

                          <DetailRow
                            label="Open Till"
                            value={formatDate(
                              proposal?.open_till || proposal?.openTill,
                            )}
                            icon={RiCalendarLine}
                          />

                          {project && (
                            <DetailRow label="Project" value={project} />
                          )}

                          {assigned && (
                            <DetailRow label="Assigned" value={assigned} />
                          )}
                        </div>
                      </div>

                      {/* RELATED INFORMATION */}

                      {(relatedType || relatedId || projectId) && (
                        <div className="border-t pt-4">
                          <h3 className="mb-3 text-sm font-semibold">
                            Related Information
                          </h3>

                          <div className="space-y-3">
                            {relatedType && (
                              <DetailRow label="Type" value={relatedType} />
                            )}

                            {relatedId && (
                              <DetailRow label="ID" value={relatedId} />
                            )}

                            {projectId && (
                              <DetailRow label="Project ID" value={projectId} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAGS */}

                      {tags.length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="mb-3 text-sm font-semibold">Tags</h3>

                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag, index) => (
                              <span
                                key={`${tag}-${index}`}
                                className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* =================================================
                    DISCUSSION
                ================================================= */}

                {activeTab === "discussion" && (
                  <div className="mt-4 rounded-lg border">
                    <div className="p-5">
                      <form onSubmit={handleComment}>
                        <label className="mb-2 block text-sm font-medium">
                          Add Comment
                        </label>

                        <Textarea
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          placeholder="Write your comment..."
                          rows={5}
                        />

                        <div className="mt-3 flex justify-end">
                          <Button type="submit" disabled={isSubmittingComment}>
                            <RiMessage3Line className="size-4" />

                            {isSubmittingComment ? "Adding..." : "Add Comment"}
                          </Button>
                        </div>
                      </form>

                      <div className="mt-6 border-t pt-5">
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="rounded-full bg-muted p-3">
                            <RiMessage3Line className="size-5 text-muted-foreground" />
                          </div>

                          <p className="mt-3 text-sm font-medium">
                            No discussion yet
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Comments related to this proposal will appear here.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            <RiCloseLine className="size-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProposalsViewDialog;
