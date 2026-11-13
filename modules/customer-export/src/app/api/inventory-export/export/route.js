import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { inventoryToCSV } from "../../../../lib/inventory-export/InventoryCSVExport";
export async function GET() {
  try {
    const inventory = await prisma.ItemMaster.findMany({
      orderBy: {
        id: "asc"
      }
    });

    const csv = inventoryToCSV(inventory);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="inventory-ItemMaster.csv"'
      }
    });
  } catch (error) {
    console.error("ItemMaster export error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to export ItemMaster."
      },
      {
        status: 500
      }
    );
  }
}