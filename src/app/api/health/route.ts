import { connection, NextResponse } from 'next/server';

export async function GET() {
  await connection();
  return NextResponse.json(
    {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export async function HEAD() {
  await connection();
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
