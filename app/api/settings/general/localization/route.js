import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET: Load localization settings from key-value structure
 */
export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        group: 'localization',
      },
    });

    const data = {};

    // Transform row entries into a clean key-value object map
    settings.forEach((setting) => {
      data[setting.key] = setting.value || '';
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Failed to load localization settings:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load localization settings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Save localization settings using FormData processing
 */
export async function POST(request) {
  try {
    const formData = await request.formData();

    // Map frontend camelCase values into database snack_case keys
    const settings = {
      date_format: formData.get('dateFormat') || '',
      time_format: formData.get('timeFormat') || '',
      default_timezone: formData.get('defaultTimezone') || '',
      default_language: formData.get('defaultLanguage') || '',
      enabled_languages: formData.get('enabledLanguages') || '',
      disable_languages: formData.get('disableLanguages') || '0',
      output_client_pdf_in_client_language: formData.get('outputClientPdfInClientLanguage') || '1',
    };

    // Server-side validation
    if (!settings.date_format || !settings.time_format || !settings.default_timezone || !settings.default_language) {
      return NextResponse.json(
        { success: false, message: 'Missing required configuration fields.' },
        { status: 400 }
      );
    }

    // Use Prisma transaction to upsert each row cleanly inside the 'localization' group
    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: {
            key, // Assumes 'key' is a unique field or @unique in your Prisma schema
          },
          update: {
            value: String(value),
          },
          create: {
            group: 'localization',
            key,
            value: String(value),
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Localization settings saved successfully',
    });
  } catch (error) {
    console.error('Failed to save localization settings:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save localization settings',
      },
      { status: 500 }
    );
  }
}
