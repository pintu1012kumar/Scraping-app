// src/app/page.tsx
'use client';

import { useState } from 'react';

// Define the shape of a single product
interface Product {
  name: string;
  price: string;
  link: string;
  rating: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/smallcap'); // Assumes your backend is at /api
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data.products);
    } catch (e: any) {
      setError(`Failed to fetch data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100 text-gray-800">
      <h1 className="text-4xl font-bold mb-8">Flipkart Scraper UI</h1>
      
      <button
        onClick={fetchData}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Fetching...' : 'Fetch Products'}
      </button>

      {error && (
        <p className="text-red-500 mt-4">{error}</p>
      )}

      {products.length > 0 && (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-2xl font-semibold mb-4 text-center">Scraped Products</h2>
          <pre className="bg-gray-800 text-white p-6 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(products, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}