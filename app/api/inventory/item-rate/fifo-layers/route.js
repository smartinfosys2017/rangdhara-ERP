
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/inventory/item-rate/fifo-layers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const itemMasterId = searchParams.get("itemMasterId");
    const brandManufacturerId =
      searchParams.get("brandManufacturerId");
    const itemConditionId = searchParams.get("itemTypeId");
    const itemGroupId = searchParams.get("itemGroupId");
    const issueDate = searchParams.get("issueDate");

    const locationType = searchParams.get("locationType");
    const locationId = searchParams.get("locationId");

    if (
      !itemMasterId ||
      !itemConditionId ||
      !itemGroupId ||
      !issueDate ||
      !locationType ||
      !locationId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required FIFO parameters.",
        },
        { status: 400 }
      );
    }

    const selectedDate = new Date(issueDate);

    if (Number.isNaN(selectedDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Issue date.",
        },
        { status: 400 }
      );
    }

    // Include the complete selected calendar day.
    selectedDate.setHours(23, 59, 59, 999);

    // --------------------------------------------------
    // TRANSACTION TYPE IDS
    // --------------------------------------------------
    const transactionTypes = await prisma.transactionType.findMany({
      where: {
        TransactionType: {
          in: ["Receipt", "Issue"],
          mode: "insensitive",
        },
        deletedAt: null,
      },
      select: {
        id: true,
        TransactionType: true,
      },
    });

    const receiptType = transactionTypes.find(
      (item) =>
        String(item.TransactionType).toLowerCase() === "receipt"
    );

    const issueType = transactionTypes.find(
      (item) =>
        String(item.TransactionType).toLowerCase() === "issue"
    );

    if (!receiptType || !issueType) {
      return NextResponse.json(
        {
          success: false,
          message: "Receipt or Issue transaction type not found.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // COMMON FILTER
    // --------------------------------------------------
    const commonWhere = {
      ItemMasterid: itemMasterId,
      ItemTypeid: itemConditionId,
      ItemGroupid: itemGroupId,
      IssueDate: {
        lte: selectedDate,
      },
      deletedAt: null,
      ...(brandManufacturerId
        ? { ItemBrandid: brandManufacturerId }
        : { ItemBrandid: null }),
    };

    // --------------------------------------------------
    // FETCH RECEIPT LAYERS
    // --------------------------------------------------
    const receipts = await prisma.issueReceipt.findMany({
      where: {
        ...commonWhere,
        TransactionTypeid: receiptType.id,
        ToType: locationType,
        ToId: locationId,
      },
      select: {
        id: true,
        Qty: true,
        Price: true,
        IssueDate: true,
      },
      orderBy: [
        { IssueDate: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    });

    // --------------------------------------------------
    // FETCH PREVIOUS ISSUES
    // --------------------------------------------------
    const issues = await prisma.issueReceipt.findMany({
      where: {
        ...commonWhere,
        TransactionTypeid: issueType.id,
        FromType: locationType,
        FromId: locationId,
      },
      select: {
        Qty: true,
        IssueDate: true,
        createdAt: true,
      },
      orderBy: [
        { IssueDate: "asc" },
        { createdAt: "asc" },
      ],
    });

    // --------------------------------------------------
    // APPLY FIFO CONSUMPTION
    // --------------------------------------------------
    const receiptLayers = receipts.map((receipt) => ({
      id: receipt.id,
      qty: Number(receipt.Qty) || 0,
      rate: Number(receipt.Price) || 0,
      date: receipt.IssueDate,
    }));

    let totalAvailable = receiptLayers.reduce(
      (total, layer) => total + layer.qty,
      0
    );

    const totalIssued = issues.reduce(
      (total, issue) => total + (Number(issue.Qty) || 0),
      0
    );

    if (totalIssued > totalAvailable) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Previous issued quantity exceeds available Receipt quantity. Please check stock transactions.",
        },
        { status: 400 }
      );
    }

    let previousIssueQty = totalIssued;

    for (const layer of receiptLayers) {
      if (previousIssueQty <= 0) break;

      const consumedQty = Math.min(
        layer.qty,
        previousIssueQty
      );

      layer.qty -= consumedQty;
      previousIssueQty -= consumedQty;
    }

    const remainingLayers = receiptLayers.filter(
      (layer) => layer.qty > 0
    );

    return NextResponse.json({
      success: true,
      data: {
        receiptLayers: remainingLayers,
        totalAvailableQty: remainingLayers.reduce(
          (total, layer) => total + layer.qty,
          0
        ),
      },
    });
  } catch (error) {
    console.error("FIFO layers API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to calculate FIFO stock.",
      },
      { status: 500 }
    );
  }
}
