
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
        { status: 400 }
      );
    }

    // Verify Item Master exists.
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
        { status: 404 }
      );
    }

    // Get latest IssueReceipt transaction.
    const latestReceipt = await prisma.issueReceipt.findFirst({
      where: {
        ItemMasterid: itemMasterId,
        deletedAt: null,
      },
      orderBy: [
        { IssueDate: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        ItemMasterid: true,
        Qty: true,
        PreviousBalance: true,
        Price: true,
        Balance: true,
        IssueDate: true,
        TransactionTypeid: true,
      },
    });

    // Rate priority: Latest IssueReceipt Price > ItemMaster rather.
    const receiptPrice = Number(latestReceipt?.Price) || 0;
    const itemMasterRate = Number(itemMaster.rather) || 0;

    const rate = receiptPrice > 0 ? receiptPrice : itemMasterRate;

    const previousBalance = Number(latestReceipt?.Balance) || 0;

    return NextResponse.json({
      success: true,
      data: {
        ItemMasterid: itemMasterId,
        PreviousBalance: previousBalance,
        Rate: rate,
        Balance: previousBalance,
        LastTransactionId: latestReceipt?.id || null,
        LastTransactionTypeid:
          latestReceipt?.TransactionTypeid || null,
        LastQty: Number(latestReceipt?.Qty) || 0,
        LastIssueDate: latestReceipt?.IssueDate || null,
      },
    });
  } catch (error) {
    console.error("PREVIOUS BALANCE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch previous balance.",
      },
      { status: 500 }
    );
  }
}