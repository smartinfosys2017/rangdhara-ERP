import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { inventoryToCSV } from "../../../../lib/Inventory-item-group-export/InventoryItemGroupCSVExport";
export async function GET() {
  try {
    const inventory = await prisma.ItemGroup.findMany({
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
          'attachment; filename="inventory-ItemGroup.csv"'
      }
    });
  } catch (error) {
    console.error("ItemGroup export error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to export ItemGroup."
      },
      {
        status: 500
      }
    );
  }
}