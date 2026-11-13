import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { csvToItemGroups } from "../../../../lib/Inventory-item-group-export/InventoryItemGroupCSVImport";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    // -------------------------------------------------
    // VALIDATE FILE
    // -------------------------------------------------

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!file.name?.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        {
          success: false,
          message: "Only CSV files are supported.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // READ CSV
    // -------------------------------------------------

    const csv = await file.text();

    const itemGroups = csvToItemGroups(csv);

    if (!itemGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file contains no item group records.",
        },
        {
          status: 400,
        }
      );
    }

    let imported = 0;
    let updated = 0;
    let failed = 0;

    const errors = [];

    // -------------------------------------------------
    // IMPORT ITEM GROUPS
    // -------------------------------------------------

    for (let index = 0; index < itemGroups.length; index++) {
      const itemGroup = itemGroups[index];

      try {
        // -------------------------------------------------
        // GROUP NAME REQUIRED
        // -------------------------------------------------

        if (!itemGroup.groupName) {
          failed++;

          errors.push({
            row: index + 2,
            message: "Group Name is required.",
          });

          continue;
        }

        const groupName = String(itemGroup.groupName).trim();

        // -------------------------------------------------
        // FIND EXISTING GROUP BY GROUP NAME
        // -------------------------------------------------

        const existingItemGroup =
          await prisma.ItemGroup.findFirst({
            where: {
              groupName: groupName,
              deletedAt: null,
            },
          });

        // -------------------------------------------------
        // GROUP NAME EXISTS → UPDATE
        // -------------------------------------------------

        if (existingItemGroup) {
          const updateData = {
            ...itemGroup,
          };

          delete updateData.id;
          delete updateData.createdAt;
          delete updateData.updatedAt;
          delete updateData.deletedAt;
          delete updateData.lastSyncAt;

          await prisma.ItemGroup.update({
            where: {
              id: existingItemGroup.id,
            },
            data: updateData,
          });

          updated++;

          continue;
        }

        // -------------------------------------------------
        // GROUP NAME DOES NOT EXIST → CREATE
        // -------------------------------------------------

        const createData = {
          ...itemGroup,
        };

        delete createData.id;
        delete createData.createdAt;
        delete createData.updatedAt;
        delete createData.deletedAt;
        delete createData.lastSyncAt;

        await prisma.ItemGroup.create({
          data: createData,
        });

        imported++;
      } catch (error) {
        console.error(
          `Item Group import row ${index + 2}:`,
          error
        );

        failed++;

        errors.push({
          row: index + 2,
          message:
            error?.message ||
            "Unable to import item group.",
        });
      }
    }
    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json({
      success: true,
      total: itemGroups.length,
      imported,
      updated,
      failed,
      errors,
    });
  } catch (error) {
    console.error(
      "Item Group import error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Item Group import failed.",
        error: error?.message,
      },
      {
        status: 500,
      }
    );
  }
}