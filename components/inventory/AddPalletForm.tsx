'use client';

import React, { useState, useEffect } from 'react';

const AddPalletForm: React.FC = () => {
  const [skus, setSkus] = useState([]); // List of SKUs fetched from the database
  const [selectedSku, setSelectedSku] = useState(''); // Selected SKU ID
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');

  // Fetch SKUs from the database
  useEffect(() => {
    const fetchSkus = async () => {
      try {
        const response = await fetch('/api/skus');
        if (!response.ok) throw new Error('Failed to fetch SKUs');
        const data = await response.json();
        setSkus(data);
      } catch (error) {
        console.error('Error fetching SKUs:', error);
      }
    };

    fetchSkus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/pallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_id: selectedSku,
          quantity: Number(quantity),
        }),
      });

      if (response.ok) {
        // Display success message
        setMessage('Pallet added');
        setSelectedSku('');
        setQuantity('');

        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('Error adding pallet:', error);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Add Pallet</h2>

      {/* Success Message */}
      {message && (
        <div className="p-3 rounded-md mb-4 text-sm bg-green-100 text-green-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SKU Selection Dropdown */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
            Select SKU
          </label>
          <select
            id="sku"
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="" disabled>
              Choose an SKU
            </option>
            {skus.map((sku) => (
              // @ts-expect-error kj kj
              <option key={sku.id} value={sku.id}>
               {/* @ts-expect-error kj kj */}
                {sku.code} - {sku.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity Input */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          Add Pallet
        </button>
      </form>
    </div>
  );
};

export default AddPalletForm;
