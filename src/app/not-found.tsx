import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-brand-700 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900 mb-3">Page not found</h2>
      <p className="text-gray-600 mb-8 max-w-md">
        The page you're looking for doesn't exist. Let us help you find what you need.
      </p>
      <div className="flex gap-4">
        <Link href="/" className="btn-primary">
          <Home className="h-4 w-4" /> Go Home
        </Link>
        <Link href="/contact" className="btn-secondary">
          Contact Us
        </Link>
      </div>
    </section>
  );
}
