// app/components/SolarData.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
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
        ac_monthly: number[];
        poa_monthly: number[];
        solrad_monthly: number[];
        dc_monthly: number[];
        ac_annual: number;
        solrad_annual: number;
        capacity_factor: number;
    };
};

type SolarData = {
    hourly: { hour: number; power: number }[];
    monthly: {
        ac_monthly: number[];
        poa_monthly: number[];
        solrad_monthly: number[];
        dc_monthly: number[];
    };
    annual: {
        ac_annual: number;
        solrad_annual: number;
        capacity_factor: number;
    };
};

export default function SolarData() {
    const [solarData, setSolarData] = useState<SolarData | null>(null);
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

            const scaleFactor = solarcapacity / 1000;
            const combinedData: SolarData = {
                hourly: data.outputs.ac.map((power, index) => ({
                    hour: index,
                    power: power * scaleFactor,
                })),
                monthly: {
                    ac_monthly: data.outputs.ac_monthly.map((val) => val * scaleFactor),
                    poa_monthly: data.outputs.poa_monthly.map((val) => val * scaleFactor),
                    solrad_monthly: data.outputs.solrad_monthly,
                    dc_monthly: data.outputs.dc_monthly.map((val) => val * scaleFactor),
                },
                annual: {
                    ac_annual: data.outputs.ac_annual * scaleFactor,
                    solrad_annual: data.outputs.solrad_annual,
                    capacity_factor: data.outputs.capacity_factor,
                },
            };

            setSolarData(combinedData);
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

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            {/* Form always visible */}
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

            {/* Loading Indicator */}
            {loading && (
                <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
                    <div className="flex justify-center items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <p className="mt-2 text-gray-600 text-lg">Loading solar data...</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="max-w-6xl mx-auto mb-8">
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-center">
                        {error}
                    </div>
                </div>
            )}

            {/* Plots and Table */}
            {solarData && !loading && (
                <div className="space-y-12">
                    {/* Monthly Plot */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-[#0ABF53]">
                        <Plot
                            data={[
                                {
                                    type: 'scatter',
                                    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                    y: solarData.monthly.ac_monthly,
                                    mode: 'lines+markers',
                                    name: 'AC Monthly (kW)',
                                    line: { color: '#0ABF53' },
                                    marker: { color: '#0ABF53' },
                                },
                                {
                                    type: 'scatter',
                                    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                    y: solarData.monthly.poa_monthly,
                                    mode: 'lines+markers',
                                    name: 'POA Monthly (kW)',
                                    line: { color: '#2ECC71' },
                                    marker: { color: '#2ECC71' },
                                },
                                {
                                    type: 'scatter',
                                    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                    y: solarData.monthly.solrad_monthly,
                                    mode: 'lines+markers',
                                    name: 'Solar Radiation (kWh/m²/day)',
                                    line: { color: '#52D769' },
                                    marker: { color: '#52D769' },
                                },
                                {
                                    type: 'scatter',
                                    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                    y: solarData.monthly.dc_monthly,
                                    mode: 'lines+markers',
                                    name: 'DC Monthly (kW)',
                                    line: { color: '#76E262' },
                                    marker: { color: '#76E262' },
                                },
                            ]}
                            layout={{
                                height: 500,
                                margin: { l: 50, r: 50, t: 50, b: 50 },
                                xaxis: {
                                    title: 'Month',
                                    tickvals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                    ticktext: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                                },
                                yaxis: { title: 'Output' },
                                title: { text: 'Monthly Solar Metrics', font: { size: 18 } },
                                legend: { x: 1, y: 1, xanchor: 'right', yanchor: 'top' },
                            }}
                            config={{ displayModeBar: false }}
                        />
                    </div>

                    {/* Annual Hourly Plot */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-[#0ABF53] mb-8">
                        <Plot
                            data={[
                                {
                                    type: 'scatter',
                                    x: solarData.hourly.map((d) => d.hour),
                                    y: solarData.hourly.map((d) => d.power),
                                    mode: 'lines',
                                    line: { color: '#0ABF53' },
                                },
                            ]}
                            layout={{
                                height: 600,
                                margin: { l: 50, r: 50, t: 50, b: 50 },
                                xaxis: {
                                    title: 'Hour of Year',
                                    range: [0, 8759],
                                    tickmode: 'linear',
                                    dtick: 720,
                                },
                                yaxis: { title: 'Power Output (kW)' },
                                title: { text: 'Annual Hourly Solar Output (8760 Hours)', font: { size: 18 } },
                            }}
                            config={{ displayModeBar: true }}
                        />
                    </div>

                    {/* Annual Table */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-[#0ABF53]">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Annual Solar Metrics</h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border-b">Metric</th>
                                <th className="p-2 border-b">Value</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td className="p-2 border-b">AC Annual (kW)</td>
                                <td className="p-2 border-b">{solarData.annual.ac_annual.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="p-2 border-b">Solar Radiation Annual (kWh/m²/day)</td>
                                <td className="p-2 border-b">{solarData.annual.solrad_annual.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="p-2 border-b">Capacity Factor (%)</td>
                                <td className="p-2 border-b">{solarData.annual.capacity_factor.toFixed(2)}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}