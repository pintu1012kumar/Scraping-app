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
  const [data, setData] = useState<ScrapedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compare');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData: ScrapedData = await response.json();
      
      setData(responseData); 

    } catch (e: any) {
      setError(`Failed to fetch data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPriceColor = (isCheaper: boolean) => {
    return isCheaper ? 'text-blue-500 font-bold' : 'text-blue-500';
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100 text-gray-800">
      <h1 className="text-4xl text-black font-bold mb-8">Product Price Comparison</h1>
      
      <button
        onClick={fetchData}
        disabled={loading}
        className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg shadow-md hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Fetching...' : 'Compare Products'}
      </button>

      {error && (
        <p className="text-red-500 mt-4">{error}</p>
      )}
      
      {data && (
        <div className="mt-8 w-full max-w-7xl space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">
              Comparison for: {data.searched}
            </h2>
            <p className="text-sm text-gray-500">
              Total fetch time: {data.duration}
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
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-4 px-6 text-left whitespace-nowrap">
                        <span rel="noopener noreferrer" className="hover:underline text-black">
                          {item.flipkart.name}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <a href={item.flipkart.link} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center space-x-1 ${getPriceColor(item.cheaper === 'Flipkart')}`}>
                          <span>{item.flipkart.price}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <a href={item.croma.link} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center space-x-1 ${getPriceColor(item.cheaper === 'Croma')}`}>
                          <span>{item.croma.price}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {item.difference > 0 ? `₹${Math.abs(item.difference)} more` : `₹${Math.abs(item.difference)} less`}
                      </td>
                      <td className="py-4 px-6 text-center font-bold">
                        {item.cheaper}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">No matching products found.</td>
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