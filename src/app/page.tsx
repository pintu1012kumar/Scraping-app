'use client';

import { useState } from 'react';

interface Product {
  name: string;
  price: string;
  link: string;
  priceValue: number;
}

interface Comparison {
  flipkart: Product;
  croma: Product;
  score: number;
  difference: number;
  cheaper: 'Flipkart' | 'Croma' | 'Same price';
}

interface ScrapedData {
  searched: string;
  comparisons: Comparison[];
  duration: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<ScrapedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!query.trim()) {
      setError('Please enter a product name.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/compare?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData: ScrapedData = await response.json();
      setData(responseData);
    } catch (e: unknown) {
      let errorMessage = 'An unknown error occurred.';
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(`Failed to fetch data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getPriceColor = (isCheaper: boolean) =>
    isCheaper ? 'text-black font-bold' : 'text-black';

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100 text-gray-800">
      <h1 className="text-4xl text-black font-bold mb-8">
        Product Price Comparison
      </h1>

      {/* Search bar */}
      <div className="flex w-full max-w-lg space-x-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter product name..."
          className="flex-1 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-6 py-2 bg-gray-800 text-white font-semibold rounded-lg shadow-md hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Compare'}
        </button>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      {data && (
        <div className="mt-8 w-full max-w-7xl space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">
              {loading ? (
                // Show 'Updating...' when loading is true
                <span>Updating...</span>
              ) : (
                // Otherwise, show the comparison title
                <span>Comparison for: {data.searched}</span>
              )}
            </h2>
            <p className="text-sm text-gray-500">
              Total fetch time: {(parseFloat(data.duration) / 1000).toFixed(2)} seconds
            </p>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Product Name</th>
                  <th className="py-3 px-6 text-center">Flipkart</th>
                  <th className="py-3 px-6 text-center">Croma</th>
                  <th className="py-3 px-6 text-center">Difference</th>
                  <th className="py-3 px-6 text-center">Cheaper on</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {data.comparisons.length > 0 ? (
                  data.comparisons.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-gray-100"
                    >
                      <td className="py-4 px-6 text-left whitespace-nowrap text-black">
                        {item.flipkart.name}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <a
                          href={item.flipkart.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center space-x-1 ${getPriceColor(item.cheaper === 'Flipkart')}`}
                        >
                          <span>{item.flipkart.price}</span>
                          <span className="ml-1">↗</span>
                        </a>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <a
                          href={item.croma.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center space-x-1 ${getPriceColor(item.cheaper === 'Croma')}`}
                        >
                          <span>{item.croma.price}</span>
                          <span className="ml-1">↗</span>
                        </a>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {item.difference > 0
                          ? `₹${Math.abs(item.difference)} more`
                          : `₹${Math.abs(item.difference)} less`}
                      </td>
                      <td className="py-4 px-6 text-center font-bold">
                        {item.cheaper}
                      </td>
                      
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-gray-500"
                    >
                      No matching products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}