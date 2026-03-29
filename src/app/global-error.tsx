"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">⚠️</div>
            <h1 className="text-3xl font-bold mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-8">
              An unexpected error occurred. Please try again.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={reset}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
              >
                Try Again
              </button>
              <a
                href="/"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
              >
                Go Home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
