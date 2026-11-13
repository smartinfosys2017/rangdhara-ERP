import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { csvToInventory } from "../../../../lib/inventory-export/InventoryCSVImport";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file is required."
        },
        {
          status: 400
        }
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        {
          success: false,
          message: "Only CSV files are supported."
        },
        {
          status: 400
        }
      );
    }

    const csv = await file.text();

    const inventory = csvToInventory(csv);

    if (!inventory.length) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file contains no inventory records."
        },
        {
          status: 400
        }
      );
    }

    let imported = 0;
    let updated = 0;
    let failed = 0;

    const errors = [];

    // -------------------------------------------------
    // IMPORT INVENTORY
    // -------------------------------------------------

    for (let index = 0; index < inventory.length; index++) {
      const inventoryItem = inventory[index];

      try {
        // -------------------------------------------------
        // ITEM NAME REQUIRED
        // -------------------------------------------------  
        if (!inventoryItem.ItemName) {
          failed++;

          errors.push({
            row: index + 2,
            message: "Item Name is required."
          });

          continue;
        }
        
        if (inventoryItem.id) {
        
          const inventoryId = String(inventoryItem.id).trim();
          // ---------------------------------------------
          // FIND EXISTING RECORD
          // ---------------------------------------------

          const existingInventory =
            await prisma.ItemMaster.findUnique({
              where: {
                id: inventoryId
              }
            });

          // ---------------------------------------------
          // UPDATE EXISTING RECORD
          // ---------------------------------------------

          if (existingInventory) {
           
            const updateData = {
              ...inventoryItem
            };

            delete updateData.id;


            const updatedInventory =
              await prisma.ItemMaster.update({
                where: {
                  id: inventoryId
                },
                data: updateData
              });


            updated++;

            continue;
          }
        }

        // -------------------------------------------------
        // NO ID → CREATE NEW RECORD
        // -------------------------------------------------

        const createData = {
          ...inventoryItem
        };

        delete createData.id;

        await prisma.ItemMaster.create({
          data: createData
        });

        imported++;

      } catch (error) {
        console.error(
          `Inventory import row ${index + 2}:`,
          error
        );

        failed++;

        errors.push({
          row: index + 2,
          message:
            error?.message ||
            "Unable to import inventory."
        });
      }
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json({
      success: true,
      total: inventory.length,
      imported,
      updated,
      failed,
      errors
    });

  } catch (error) {
    console.error(
      "Inventory import error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Inventory import failed.",
        error: error?.message
      },
      {
        status: 500
      }
    );
  }
}