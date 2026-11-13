import { NextResponse } from 'next/server';
import { localCoreDb } from '@/lib/db';

const SETTING_KEY = 'active_environment';

export async function GET() {
  try {
    const setting = await localCoreDb.setting.findUnique({
      where: {
        key: SETTING_KEY,
      },
    });

    return NextResponse.json({
      success: true,
      activeEnv: setting?.value || 'local',
    });

  } catch (error) {
    console.error('[SETTINGS GET ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to get setting',
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const targetEnv = body?.targetEnv;

    console.log('[SETTINGS] Requested environment:', targetEnv);

    // Validate environment
    if (targetEnv !== 'local' && targetEnv !== 'live') {
      return NextResponse.json(
        {
          success: false,
          error: 'Environment must be local or live',
        },
        {
          status: 400,
        }
      );
    }

    // Make sure LOCAL database is connected
    await localCoreDb.$connect();

    console.log('[SETTINGS] Local database connected');

    // Create or update setting
    const setting = await localCoreDb.setting.upsert({
      where: {
        key: SETTING_KEY,
      },

      update: {
        value: targetEnv,
      },

      create: {
        group: 'database',
        key: SETTING_KEY,
        value: targetEnv,
      },
    });

    console.log(
      '[SETTINGS] Saved:',
      setting.key,
      '=',
      setting.value
    );

    return NextResponse.json({
      success: true,
      activeEnv: setting.value,
      setting: {
        id: setting.id,
        group: setting.group,
        key: setting.key,
        value: setting.value,
      },
    });

  } catch (error) {
    console.error('[SETTINGS POST ERROR]');
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to save environment',
        code: error?.code || null,
        meta: error?.meta || null,
      },
      {
        status: 500,
      }
    );
  }
}

async function checkDbStatus() {
  try {
    setDbStatus((prev) => ({
      ...prev,
      loading: true,
    }));

    const response = await fetch(
      '/api/settings/toggle',
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Database status check failed');
    }

    const data = await response.json();

    setDbStatus({
      env: data.activeEnv || 'local',
      online: true,
      loading: false,
    });
  } catch (error) {
    console.error(
      '[DB STATUS ERROR]',
      error
    );

    setDbStatus((prev) => ({
      ...prev,
      online: false,
      loading: false,
    }));
  }
}