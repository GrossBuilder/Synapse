export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-gray-950 text-white">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold mb-3">Page Not Found</h1>
        <p className="text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
        >
          Go Home
        </a>
      </div>
    </main>
  );
}
