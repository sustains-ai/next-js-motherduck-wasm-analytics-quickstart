// app/components/SolarData.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

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

type SolarDataItem = {
    hour: number;
    power: number;
};

export default function SolarData() {
    const [solarData, setSolarData] = useState<SolarDataItem[]>([]);
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

    // ✅ Memoize getSolarData to prevent redefinition
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

            const acPower = data.outputs.ac;
            const solarPower = acPower.map((power) => (power * solarcapacity) / 1000);
            const hourlyData = solarPower.slice(0, 24).map((power, index) => ({
                hour: index,
                power,
            }));

            setSolarData(hourlyData);
        } catch (err: unknown) {
            console.error('Error fetching solar data:', err instanceof Error ? err.message : 'Unknown error');
            setError('Data cannot be fetched for this postcode');
        } finally {
            setLoading(false);
        }
    }, []); // ✅ Empty dependency array—stable function

    useEffect(() => {
        getSolarData('400001', 'IN', 1000);
    }, []); // ✅ Empty array—runs once on mount

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
                    <Plot
                        data={[
                            {
                                type: 'scatter',
                                x: solarData.map((d) => d.hour),
                                y: solarData.map((d) => d.power),
                                mode: 'lines+markers',
                                marker: { color: '#0ABF53' },
                                line: { color: '#0ABF53' },
                            },
                        ]}
                        layout={{
                            height: 400,
                            margin: { l: 50, r: 50, t: 50, b: 50 },
                            xaxis: { title: 'Hour of Day', range: [0, 23] },
                            yaxis: { title: 'Power Output (kW)' },
                            title: { text: '24-Hour Solar Power Output', font: { size: 18 } },
                        }}
                        config={{ displayModeBar: false }}
                    />
                </div>
            )}
        </div>
    );
}