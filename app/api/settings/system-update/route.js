import { NextResponse } from 'next/server';

/*
 * ============================================================
 * SYSTEM VERSION
 * ============================================================
 *
 * You can change these values later or load them from your
 * database / package.json / update server.
 */

const CURRENT_VERSION =
  process.env.SYSTEM_CURRENT_VERSION || '1.2.1';

const CURRENT_VERSION_CODE =
  process.env.SYSTEM_CURRENT_VERSION_CODE || '341';

const LATEST_VERSION =
  process.env.SYSTEM_LATEST_VERSION || '2.2.1';

const LATEST_VERSION_CODE =
  process.env.SYSTEM_LATEST_VERSION_CODE || '341';

/*
 * ============================================================
 * TEMPORARY SETTINGS STORAGE
 * ============================================================
 *
 * IMPORTANT:
 * This variable is only for development.
 *
 * For production, replace this with your existing settings
 * database/table.
 */

let purchaseKey = '';

/*
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET() {
  try {
    return NextResponse.json({
      success: true,

      data: {
        purchase_key: purchaseKey,

        your_version: CURRENT_VERSION,

        your_version_code:
          CURRENT_VERSION_CODE,

        latest_version: LATEST_VERSION,

        latest_version_code:
          LATEST_VERSION_CODE,
      },
    });
  } catch (error) {
    console.error(
      'System update GET error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          'Failed to load system update settings.',
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(request) {
  try {
    const body = await request.json();

    const newPurchaseKey =
      String(
        body?.purchaseKey || ''
      ).trim();

    /*
     * Purchase key is optional.
     *
     * If you want it mandatory, uncomment:
     *
     * if (!newPurchaseKey) {
     *   return NextResponse.json(
     *     {
     *       success: false,
     *       message: 'Purchase Key is required.',
     *     },
     *     { status: 422 }
     *   );
     * }
     */

    purchaseKey = newPurchaseKey;

    return NextResponse.json({
      success: true,

      message:
        'System update settings saved successfully.',

      data: {
        purchase_key: purchaseKey,

        your_version: CURRENT_VERSION,

        latest_version: LATEST_VERSION,

        latest_version_code:
          LATEST_VERSION_CODE,
      },
    });
  } catch (error) {
    console.error(
      'System update POST error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          'Failed to save system update settings.',
      },
      {
        status: 500,
      }
    );
  }
}