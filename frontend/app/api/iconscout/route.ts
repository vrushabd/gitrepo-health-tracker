import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_ICONSCOUT_CLIENT_ID || process.env.ICONSCOUT_CLIENT_ID;
    const apiKey = process.env.NEXT_PUBLIC_ICONSCOUT_API_KEY || process.env.ICONSCOUT_API_KEY;

    if (!clientId) {
      return NextResponse.json({ error: 'IconScout Client ID is missing' }, { status: 500 });
    }

    // Attempting standard search API endpoint for IconScout
    // According to docs, v3 search API
    const response = await fetch(`https://api.iconscout.com/v3/search?query=${encodeURIComponent(query)}&asset=icon&price=premium`, {
      method: 'GET',
      headers: {
        'Client-ID': clientId,
        'Iconscout-Secret': apiKey || '',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('IconScout API Error:', text);
      return NextResponse.json({ error: 'Failed to fetch from IconScout API' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('IconScout Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
