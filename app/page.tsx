// app/page.tsx
"use client";

import React from "react";
import SolarData from "./components/SolarData";
export default function EnergyPage() {
    return (
        <section className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
            <div className="container mx-auto px-4">
                <h1 className="text-5xl font-extrabold text-center mb-12 text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#089B45] to-[#0ABF53] leading-normal">
                    Solar Energy Insights
                </h1>
                <div className="space-y-12">
                    {/* Monthly Data and Annual Table */}
                    <SolarData />
                </div>
            </div>
        </section>
    );
}