import { NextResponse } from 'next/server';
import os from 'os';
import process from 'process';
import { execSync } from 'child_process';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getNodeVersion() {
  return process.version;
}

function getPlatform() {
  return `${os.type()} ${os.release()}`;
}

function getArchitecture() {
  return os.arch();
}

function getHostname() {
  return os.hostname();
}

function getCpuCount() {
  return os.cpus().length;
}

function getTotalMemory() {
  return `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`;
}

function getFreeMemory() {
  return `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`;
}

function getUptime() {
  const seconds = os.uptime();

  const days = Math.floor(seconds / 86400);

  const hours = Math.floor(
    (seconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  return `${days}d ${hours}h ${minutes}m`;
}

function getNpmVersion() {
  try {
    return execSync('npm --version')
      .toString()
      .trim();
  } catch {
    return 'N/A';
  }
}

function getDatabaseInfo() {
  return prisma.$queryRaw`
    SELECT
      version() AS version,
      current_database() AS database_name,
      current_user AS database_user,
      current_schema() AS schema_name
  `;
}

export async function GET() {

  try {

    /*
     * PostgreSQL information
     */

    const databaseResult =
      await getDatabaseInfo();

    const database =
      databaseResult?.[0] || {};


    /*
     * PostgreSQL connection count
     */

    const connectionResult =
      await prisma.$queryRaw`
        SELECT count(*)::int AS count
        FROM pg_stat_activity
      `;


    /*
     * PostgreSQL max connections
     */

    const maxConnectionResult =
      await prisma.$queryRaw`
        SHOW max_connections
      `;


    /*
     * PostgreSQL database size
     */

    const databaseSizeResult =
      await prisma.$queryRaw`
        SELECT pg_size_pretty(
          pg_database_size(current_database())
        ) AS size
      `;


    /*
     * PostgreSQL version
     */

    const postgresVersion =
      database.version || 'N/A';


    /*
     * Application information
     */

    const application = {

      environment:
        process.env.NODE_ENV || 'development',

      node_version:
        getNodeVersion(),

      npm_version:
        getNpmVersion(),

      next_version:
        process.env.npm_package_dependencies_next ||
        'N/A',

      process_id:
        process.pid,

      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone,

    };


    /*
     * Server information
     */

    const server = {

      platform:
        getPlatform(),

      architecture:
        getArchitecture(),

      hostname:
        getHostname(),

      cpu_count:
        getCpuCount(),

      total_memory:
        getTotalMemory(),

      free_memory:
        getFreeMemory(),

      uptime:
        getUptime(),

      home_directory:
        os.homedir(),

      temp_directory:
        os.tmpdir(),

    };


    /*
     * PostgreSQL information
     */

    const postgres = {

      version:
        postgresVersion,

      database:
        database.database_name || 'N/A',

      user:
        database.database_user || 'N/A',

      schema:
        database.schema_name || 'N/A',

      active_connections:
        connectionResult?.[0]?.count ?? 0,

      max_connections:
        maxConnectionResult?.[0]?.max_connections ||
        'N/A',

      database_size:
        databaseSizeResult?.[0]?.size ||
        'N/A',

    };


    /*
     * Prisma information
     */

    const prismaInfo = {

      client:
        'Prisma',

      database:
        'PostgreSQL',

    };


    /*
     * Return response
     */

    return NextResponse.json({

      success: true,

      data: {

        application,

        server,

        postgres,

        prisma: prismaInfo,

      },

    });

  } catch (error) {

    console.error(
      'SYSTEM INFO ERROR:',
      error
    );


    return NextResponse.json(
      {
        success: false,

        message:
          'Failed to load system information.',

        error:
          error instanceof Error
            ? error.message
            : String(error),

      },
      {
        status: 500,
      }
    );

  }

}