"use client"

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div>
          <h1 className="text-4xl font-bold text-red-600 mb-2">Error</h1>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Something Went Wrong</h2>
          <p className="text-slate-600 mb-6">{error.message || "An unexpected error occurred"}</p>
        </div>
        <button 
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}