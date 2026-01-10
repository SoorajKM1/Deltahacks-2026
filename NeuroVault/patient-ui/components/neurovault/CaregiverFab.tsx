"use client";

import { useRouter } from "next/navigation";

export default function CaregiverFab() {
    const router = useRouter();

    return (
        <button
        type="button"
        onClick={() => router.push("/caregiver")}
        className="fixed bottom-6 right-6 z-50 rounded-full border border-black/15 bg-white px-5 py-3 text-base font-semibold text-black/70 shadow-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/20"
        aria-label="Open caregiver portal"
        >
        Caregiver
        </button>
    );
}
