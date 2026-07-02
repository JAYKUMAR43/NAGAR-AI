"use client";

import dynamic from "next/dynamic";

const CityScene = dynamic(() => import("./CityScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-950">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-reverse"></div>
      </div>
    </div>
  )
});

export default function CityClientWrapper() {
  return <CityScene />;
}
