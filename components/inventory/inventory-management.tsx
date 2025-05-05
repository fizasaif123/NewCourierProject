'use client';

import { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';

export function StockContent() {
  const [activeSection, setActiveSection] = useState<'inventory' | 'skus' | 'bins' | 'pallets' | 'quarantine'>('inventory');

  // Global States
  const [skus, setSKUs] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');

  // Form States
  const [formData, setFormData] = useState({
    skuName: '',
    skuCode: '',
    skuCategory: '',
    skuDescription: '',
    binName: '',
    binLocation: '',
    binSKU: '',
    palletSKU: '',
    palletQuantity: 0,
    quarantineSKU: '',
    quarantineReason: '',
    quarantineQuantity: 0,
    quarantineLocation: '',
  });

  // Fetch SKUs and Inventory Data
  useEffect(() => {
    const fetchData = async () => {
      const { data: skuData } = await supabase.from('skus').select('id, name');
      setSKUs(skuData || []);

      const { data: inventoryData } = await supabase
        .from('skus')
        .select(`
          id, name, code, category, description,
          bins (name, location),
          pallets (quantity),
          quarantine (reason, quantity, location)
        `);
// @ts-expect-error hkj jk
const uniqueCategories = [...new Set(inventoryData?.map((item: any) => item.category))];
// @ts-expect-error hkj jk
const uniqueLocations = [...new Set(inventoryData?.flatMap((item: any) => [
       ...item.bins?.map((bin: any) => bin.location) || [],
        ...item.quarantine?.map((q: any) => q.location) || [],
      ]))];

      setInventory(inventoryData || []);
      setFilteredInventory(inventoryData || []);
      setCategories(uniqueCategories || []);
      setLocations(uniqueLocations || []);
    };

    fetchData();
  }, []);

  // Filter Inventory
  useEffect(() => {
    let filtered = inventory;
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterCategory) {
      filtered = filtered.filter((item) => item.category.toLowerCase() === filterCategory.toLowerCase());
    }
    if (filterLocation) {
      filtered = filtered.filter((item) =>
        item.bins?.some((bin: any) => bin.location.toLowerCase().includes(filterLocation.toLowerCase())) ||
        item.quarantine?.some((q: any) => q.location.toLowerCase().includes(filterLocation.toLowerCase()))
      );
    }
    setFilteredInventory(filtered);
  }, [searchTerm, filterCategory, filterLocation, inventory]);

  // Handle Form Submission
  const handleFormSubmit = async (table: string, data: any) => {
    const { error } = await supabase.from(table).insert(data);
    if (error) alert(`Error: ${error.message}`);
    else alert('Success! Entry added.');
    setFormData({ ...formData, ...Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: '' }), {}) });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Navigation */}
      <nav className="flex flex-wrap gap-2 mb-6">
        {['inventory', 'skus', 'bins', 'pallets', 'quarantine'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section as any)}
            className={`px-4 py-2 rounded transition ${
              activeSection === section ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-blue-300'
            }`}
          >
            {section.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* Inventory Viewer */}
      {activeSection === 'inventory' && (
        <div>
          <h1 className="text-2xl font-bold mb-4">View Inventory</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              placeholder="Search by SKU or Code"
              className="border p-2 rounded flex-grow"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="border p-2 rounded"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Filter by Category</option>
              {categories.map((category, idx) => (
                <option key={idx} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="border p-2 rounded"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">Filter by Location</option>
              {locations.map((location, idx) => (
                <option key={idx} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3">SKU</th>
                <th className="border p-3">Code</th>
                <th className="border p-3">Category</th>
                <th className="border p-3">Bins</th>
                <th className="border p-3">Pallets</th>
                <th className="border p-3">Quarantine</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item, idx) => (
                <tr key={idx} className="text-center">
                  <td className="border p-3">{item.name}</td>
                  <td className="border p-3">{item.code}</td>
                  <td className="border p-3">{item.category}</td>
                  <td className="border p-3">
                    {item.bins?.map((bin: any) => `${bin.name} (${bin.location})`).join(', ') || 'N/A'}
                  </td>
                  <td className="border p-3">
                    {item.pallets?.map((pallet: any) => pallet.quantity).join(', ') || 'N/A'}
                  </td>
                  <td className="border p-3">
                    {item.quarantine?.map((q: any) => `${q.reason} (${q.quantity})`).join(', ') || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SKUs Section */}
      {activeSection === 'skus' && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Manage SKUs</h1>
          <input
            type="text"
            placeholder="SKU Name"
            className="border p-2 rounded w-full mb-2"
            value={formData.skuName}
            onChange={(e) => setFormData({ ...formData, skuName: e.target.value })}
          />
          <input
            type="text"
            placeholder="SKU Code"
            className="border p-2 rounded w-full mb-2"
            value={formData.skuCode}
            onChange={(e) => setFormData({ ...formData, skuCode: e.target.value })}
          />
          <input
            type="text"
            placeholder="Category"
            className="border p-2 rounded w-full mb-2"
            value={formData.skuCategory}
            onChange={(e) => setFormData({ ...formData, skuCategory: e.target.value })}
          />
          <textarea
            placeholder="Description"
            className="border p-2 rounded w-full mb-2"
            value={formData.skuDescription}
            onChange={(e) => setFormData({ ...formData, skuDescription: e.target.value })}
          ></textarea>
          <button
            onClick={() =>
              handleFormSubmit('skus', {
                name: formData.skuName,
                code: formData.skuCode,
                category: formData.skuCategory,
                description: formData.skuDescription,
              })
            }
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add SKU
          </button>
        </div>
      )}

      {/* Bins Section */}
      {activeSection === 'bins' && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Manage Bins</h1>
          <input
            type="text"
            placeholder="Bin Name"
            className="border p-2 rounded w-full mb-2"
            value={formData.binName}
            onChange={(e) => setFormData({ ...formData, binName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Bin Location"
            className="border p-2 rounded w-full mb-2"
            value={formData.binLocation}
            onChange={(e) => setFormData({ ...formData, binLocation: e.target.value })}
          />
          <select
            className="border p-2 rounded w-full mb-2"
            value={formData.binSKU}
            onChange={(e) => setFormData({ ...formData, binSKU: e.target.value })}
          >
            <option value="">Select SKU</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              handleFormSubmit('bins', {
                name: formData.binName,
                location: formData.binLocation,
                sku_id: formData.binSKU,
              })
            }
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Bin
          </button>
        </div>
      )}

      {/* Pallets Section */}
      {activeSection === 'pallets' && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Allocate Pallets</h1>
          <select
            className="border p-2 rounded w-full mb-2"
            value={formData.palletSKU}
            onChange={(e) => setFormData({ ...formData, palletSKU: e.target.value })}
          >
            <option value="">Select SKU</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Quantity"
            className="border p-2 rounded w-full mb-2"
            value={formData.palletQuantity}
            onChange={(e) => setFormData({ ...formData, palletQuantity: Number(e.target.value) })}
          />
          <button
            onClick={() =>
              handleFormSubmit('pallets', {
                sku_id: formData.palletSKU,
                quantity: formData.palletQuantity,
              })
            }
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Allocate Pallet
          </button>
        </div>
      )}

      {/* Quarantine Section */}
      {activeSection === 'quarantine' && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Manage Quarantine</h1>
          <select
            className="border p-2 rounded w-full mb-2"
            value={formData.quarantineSKU}
            onChange={(e) => setFormData({ ...formData, quarantineSKU: e.target.value })}
          >
            <option value="">Select SKU</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Reason"
            className="border p-2 rounded w-full mb-2"
            value={formData.quarantineReason}
            onChange={(e) => setFormData({ ...formData, quarantineReason: e.target.value })}
          ></textarea>
          <input
            type="number"
            placeholder="Quantity"
            className="border p-2 rounded w-full mb-2"
            value={formData.quarantineQuantity}
            onChange={(e) => setFormData({ ...formData, quarantineQuantity: Number(e.target.value) })}
          />
          <input
            type="text"
            placeholder="Location"
            className="border p-2 rounded w-full mb-2"
            value={formData.quarantineLocation}
            onChange={(e) => setFormData({ ...formData, quarantineLocation: e.target.value })}
          />
          <button
            onClick={() =>
              handleFormSubmit('quarantine', {
                sku_id: formData.quarantineSKU,
                reason: formData.quarantineReason,
                quantity: formData.quarantineQuantity,
                location: formData.quarantineLocation,
              })
            }
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add to Quarantine
          </button>
        </div>
      )}
    </div>
  );
}
