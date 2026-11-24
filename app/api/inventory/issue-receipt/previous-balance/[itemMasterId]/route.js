
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { itemMasterId } = await params;

    if (!itemMasterId) {
      return NextResponse.json(
        {
          success: false,
          message: "Item ID is required.",
        },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);

    const itemTypeId = searchParams.get("itemTypeId");

    const locationType = String(
      searchParams.get("locationType") || "",
    )
      .trim()
      .toUpperCase();

    const locationId = searchParams.get("locationId");

    // =====================================================
    // VALIDATE LOCATION
    // =====================================================

    if (!itemTypeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Type ID is required.",
        },
        { status: 400 },
      );
    }

    if (!["LOCATION", "MACHINE", "MACHINERY"].includes(locationType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid location type. Use LOCATION or MACHINE.",
        },
        { status: 400 },
      );
    }

    if (!locationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Location or Machine ID is required.",
        },
        { status: 400 },
      );
    }

    const normalizedLocationType =
      locationType === "MACHINERY" ? "MACHINE" : locationType;

    // =====================================================
    // CHECK ITEM MASTER
    // =====================================================

    const itemMaster = await prisma.itemMaster.findFirst({
      where: {
        id: itemMasterId,
        deletedAt: null,
      },
      select: {
        id: true,
        rather: true,
      },
    });

    if (!itemMaster) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Master record not found.",
        },
        { status: 404 },
      );
    }

    // =====================================================
    // GET LOCATION-WISE STOCK BALANCE
    // =====================================================

    const stockBalance = await prisma.inventoryStockBalance.findUnique({
      where: {
        ItemMasterid_ItemTypeid_LocationType_LocationId: {
          ItemMasterid: itemMasterId,
          ItemTypeid: itemTypeId,
          LocationType: normalizedLocationType,
          LocationId: locationId,
        },
      },
      select: {
        id: true,
        ItemMasterid: true,
        ItemTypeid: true,
        LocationType: true,
        LocationId: true,
        Quantity: true,
        updatedAt: true,
      },
    });

    const previousBalance = Number(stockBalance?.Quantity) || 0;

    // =====================================================
    // GET LATEST LEDGER FOR SELECTED LOCATION
    // =====================================================

    const latestLedger = await prisma.inventoryStockLedger.findFirst({
      where: {
        ItemMasterid: itemMasterId,
        ItemTypeid: itemTypeId,
        LocationType: normalizedLocationType,
        LocationId: locationId,
      },
      orderBy: [
        { TransactionDate: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        IssueReceiptId: true,
        QtyIn: true,
        QtyOut: true,
        PreviousBalance: true,
        Balance: true,
        Price: true,
        TransactionDate: true,
      },
    });

    // =====================================================
    // RATE
    // Latest location-wise ledger price > Item Master rate
    // =====================================================

    const ledgerPrice = Number(latestLedger?.Price) || 0;
    const itemMasterRate = Number(itemMaster.rather) || 0;

    const rate =
      ledgerPrice > 0 ? ledgerPrice : itemMasterRate;

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,
      data: {
        ItemMasterid: itemMasterId,
        ItemTypeid: itemTypeId,

        LocationType: normalizedLocationType,
        LocationId: locationId,

        PreviousBalance: previousBalance,
        Balance: previousBalance,

        Rate: rate,

        LastTransactionId: latestLedger?.IssueReceiptId || null,
        LastLedgerId: latestLedger?.id || null,

        LastQtyIn: Number(latestLedger?.QtyIn) || 0,
        LastQtyOut: Number(latestLedger?.QtyOut) || 0,

        LastIssueDate: latestLedger?.TransactionDate || null,

        StockBalanceId: stockBalance?.id || null,
        StockUpdatedAt: stockBalance?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error("PREVIOUS BALANCE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to fetch previous balance.",
      },
      { status: 500 },
    );
  }
}