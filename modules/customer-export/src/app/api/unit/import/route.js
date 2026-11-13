import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { csvToUnits } from "../../../../lib/Inventory-unit-export/InventoryUnitCSVImport";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    // -------------------------------------------------
    // FILE VALIDATION
    // -------------------------------------------------

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        {
          success: false,
          message: "Only CSV files are supported.",
        },
        {
          status: 400,
        },
      );
    }

    const csv = await file.text();

    // -------------------------------------------------
    // PARSE CSV
    // -------------------------------------------------

    const units = csvToUnits(csv);

    if (!units.length) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV file contains no unit records.",
        },
        {
          status: 400,
        },
      );
    }

    let imported = 0;
    let updated = 0;
    let failed = 0;

    const errors = [];

    // -------------------------------------------------
    // IMPORT UNITS
    // -------------------------------------------------

    for (let index = 0; index < units.length; index++) {
      const unit = units[index];

      try {
        // -------------------------------------------------
        // UNIT NAME REQUIRED
        // -------------------------------------------------

        if (!unit.unitName) {
          failed++;

          errors.push({
            row: index + 2,
            message: "Unit Name is required.",
          });

          continue;
        }

        // -------------------------------------------------
        // UPDATE EXISTING RECORD
        // -------------------------------------------------

        if (unit.id) {
          const unitId = String(unit.id).trim();

          const existingUnit = await prisma.Unit.findUnique({
            where: {
              id: unitId,
            },
          });

          if (existingUnit) {
            const updateData = {
              ...unit,
            };

            delete updateData.id;

            // Don't update these automatically from CSV
            delete updateData.createdAt;
            delete updateData.updatedAt;
            delete updateData.deletedAt;
            delete updateData.lastSyncAt;

            await prisma.Unit.update({
              where: {
                id: unitId,
              },
              data: updateData,
            });

            updated++;

            continue;
          }
        }

        // -------------------------------------------------
        // CREATE NEW RECORD
        // -------------------------------------------------

        const createData = {
          ...unit,
        };

        delete createData.id;
        delete createData.createdAt;
        delete createData.updatedAt;
        delete createData.deletedAt;
        delete createData.lastSyncAt;

        await prisma.Unit.create({
          data: createData,
        });

        imported++;
      } catch (error) {
        console.error(`Unit import row ${index + 2}:`, error);

        failed++;

        errors.push({
          row: index + 2,
          message: error?.message || "Unable to import unit.",
        });
      }
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json({
      success: true,
      total: units.length,
      imported,
      updated,
      failed,
      errors,
    });
  } catch (error) {
    console.error("Unit import error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unit import failed.",
        error: error?.message,
      },
      {
        status: 500,
      },
    );
  }
}
