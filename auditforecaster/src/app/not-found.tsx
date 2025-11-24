export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800">404 – Page Not Found</h1>
                <p className="mt-4 text-lg text-gray-600">
                    Oops! The page you are looking for does not exist.
                </p>
                <a href="/dashboard" className="mt-6 inline-block rounded bg-primary px-4 py-2 text-white hover:bg-primary/90">
                    Return to Dashboard
                </a>
            </div>
        </div>
    );
}
