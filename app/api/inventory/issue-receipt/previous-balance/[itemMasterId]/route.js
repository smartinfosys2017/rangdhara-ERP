import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { itemMasterId } = await params;

    if (!itemMasterId) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Master ID is required",
        },
        { status: 400 },
      );
    }

    const id = itemMasterId;

    // Get the latest Issue/Receipt for this Item Master
    const latestReceipt = await prisma.issueReceipt.findFirst({
      where: {
        ItemMasterid: id,
        deletedAt: null,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        ItemMasterid: true,
        Qty: true,
        PreviousBalance: true,
        Balance: true,
        IssueDate: true,
        TransactionTypeid: true,
      },
    });

    // No previous transaction means opening balance is 0
    if (!latestReceipt) {
      return NextResponse.json({
        success: true,
        data: {
          ItemMasterid: id,
          PreviousBalance: 0,
          Balance: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ItemMasterid: id,
        PreviousBalance: Number(latestReceipt.Balance) || 0,
        Balance: Number(latestReceipt.Balance) || 0,
        LastTransactionId: latestReceipt.id,
        LastTransactionTypeid: latestReceipt.TransactionTypeid,
        LastQty: Number(latestReceipt.Qty) || 0,
        LastIssueDate: latestReceipt.IssueDate,
      },
    });
  } catch (error) {
    console.error("PREVIOUS BALANCE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch previous balance",
      },
      { status: 500 },
    );
  }
}
