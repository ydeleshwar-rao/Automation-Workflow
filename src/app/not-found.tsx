"use client"

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Page Not Found</h2>
          <p className="text-slate-600 mb-6">The page you are looking for does not exist.</p>
        </div>
        <Link 
          href="/dashboard" 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}