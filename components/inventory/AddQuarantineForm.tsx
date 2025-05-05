'use client';

import React, { useState } from 'react';

const AddQuarantineForm: React.FC = () => {
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Programmatically handle default SKU ID
      const defaultSkuId = 1; // Replace with actual SKU ID logic or fetch dynamically

      const response = await fetch('/api/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_id: defaultSkuId,
          reason,
          quantity: Number(quantity),
          location,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add quarantine item.');
      }

      const data = await response.json();
      setMessage(
        `Quarantine item added: Reason - ${data.reason}, Location - ${data.location}`
      );
      setReason('');
      setQuantity('');
      setLocation('');
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add Quarantine Item</h3>

      {/* Reason Input */}
      <label htmlFor="reason">Reason</label>
      <input
        id="reason"
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for quarantine"
        required
      />

      {/* Quantity Input */}
      <label htmlFor="quantity">Quantity</label>
      <input
        id="quantity"
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Quantity"
        required
      />

      {/* Location Input */}
      <label htmlFor="location">Location</label>
      <input
        id="location"
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Quarantine Location"
        required
      />

      <button type="submit">Add Quarantine</button>

      {/* Feedback Message */}
      {message && <p>{message}</p>}
    </form>
  );
};

export default AddQuarantineForm;
