// app/api/NREL/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { lat, long } = await req.json();
        const apiKey = process.env.NREL_API;
        if (!apiKey) {
            throw new Error('NREL API key is missing in environment variables');
        }

        const url = `https://developer.nrel.gov/api/pvwatts/v6.json?api_key=${apiKey}&lat=${lat}&lon=${long}&system_capacity=1&azimuth=180&tilt=40&array_type=1&module_type=1&losses=10&timeframe=hourly`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch data from NREL API');
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) { // ✅ Replace 'any' with 'unknown'
        const err = error instanceof Error ? error.message : 'Unknown error';
        console.error('NREL API Error:', err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}