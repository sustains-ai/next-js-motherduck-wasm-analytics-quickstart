// app/components/PostcodeSolarData.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";

type LatLongResponse = {
    status?: string;
    result?: { latitude: string; longitude: string }[];
    message?: string;
};

type SolarDataResponse = {
    outputs: {
        ac: number[];
    };
};

type AggregatedSolarData = {
    day: number; // Day of year (1-365)
    avgPower: number; // Average power for that day (kW)
};

export default function PostcodeSolarData() {
    const [solarData, setSolarData] = useState<AggregatedSolarData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [zipcode, setZipcode] = useState<string>('400001');
    const [countryCode, setCountryCode] = useState<string>('IN');
    const [solarCapacity, setSolarCapacity] = useState<string>('1000');

    const getLatitudeLongitude = async (pincode: string, countrycode: string): Promise<{ lat: number; long: number } | null> => {
        const url = `https://api.worldpostallocations.com/pincode?postalcode=${pincode}&countrycode=${countrycode}`;
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const data: LatLongResponse = await response.json();

            if (!data.result || data.result.length === 0) return null;

            const lat = parseFloat(data.result[0].latitude);
            const long = parseFloat(data.result[0].longitude);

            if (isNaN(lat) || isNaN(long)) return null;

            return { lat, long };
        } catch {
            return null;
        }
    };

    const getSolarData = useCallback(async (pincode: string, countrycode: string, solarcapacity: number) => {
        setLoading(true);
        setError('');
        try {
            const coords = await getLatitudeLongitude(pincode, countrycode);
            if (!coords) {
                setError('Data cannot be fetched for this postcode');
                return;
            }

            const { lat, long } = coords;
            const response = await fetch('/api/NREL', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, long }),
            });
            if (!response.ok) {
                setError('Data cannot be fetched for this postcode');
                return;
            }
            const data: SolarDataResponse = await response.json();

            const acPower = data.outputs.ac.map((power) => (power * solarcapacity) / 1000);
            // Aggregate hourly data into daily averages (8760 hours → 365 days)
            const dailyData: AggregatedSolarData[] = [];
            for (let day = 0; day < 365; day++) {
                const start = day * 24;
                const end = start + 24;
                const dayPower = acPower.slice(start, end);
                const avgPower = dayPower.reduce((sum, val) => sum + val, 0) / dayPower.length;
                dailyData.push({ day: day + 1, avgPower });
            }

            setSolarData(dailyData);
        } catch (err: unknown) {
            console.error('Error fetching solar data:', err instanceof Error ? err.message : 'Unknown error');
            setError('Data cannot be fetched for this postcode');
        } finally {
            setLoading(false);
        }
    }, []);

    const [hasFetched, setHasFetched] = useState(false);
    useEffect(() => {
        if (!hasFetched) {
            getSolarData('400001', 'IN', 1000);
            setHasFetched(true);
        }
    }, [hasFetched]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (zipcode && countryCode && solarCapacity) {
            getSolarData(zipcode, countryCode, parseFloat(solarCapacity));
        } else {
            setError('Please fill in all fields');
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
                <div className="flex justify-center items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <p className="mt-2 text-gray-600 text-lg">Loading solar data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-center">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <form onSubmit={handleSubmit} className="mb-8 flex justify-center gap-4">
                <input
                    type="text"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    placeholder="Enter zipcode (e.g., 400001)"
                    className="p-2 border rounded"
                />
                <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="Enter country code (e.g., IN)"
                    className="p-2 border rounded"
                />
                <input
                    type="number"
                    value={solarCapacity}
                    onChange={(e) => setSolarCapacity(e.target.value)}
                    placeholder="Solar capacity kW (e.g., 1000)"
                    className="p-2 border rounded"
                    step="0.1"
                />
                <button type="submit" className="bg-[#0ABF53] text-white p-2 rounded hover:bg-[#089B45]">
                    Fetch Solar Data
                </button>
            </form>

            {solarData.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-[#0ABF53]">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Daily Average Solar Output</h3>
                    <div className="overflow-x-auto max-h-96"> {/* ✅ Scrollable table */}
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-100 sticky top-0">
                                <th className="p-2 border-b">Day of Year</th>
                                <th className="p-2 border-b">Average Power (kW)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {solarData.map((item) => (
                                <tr key={item.day}>
                                    <td className="p-2 border-b">{item.day}</td>
                                    <td className="p-2 border-b">{item.avgPower.toFixed(2)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}