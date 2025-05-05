export async function addBin(name: string, location: string) {
    const response = await fetch('/api/bins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add bin');
    return data;
}

export async function addPallet(sku_id: number, bin_id: number, quantity: number) {
    const response = await fetch('/api/pallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku_id, bin_id, quantity }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add pallet');
    return data;
}

export async function addQuarantineItem(
    sku_id: number,
    reason: string,
    quantity: number,
    location: string
) {
    const response = await fetch('/api/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku_id, reason, quantity, location }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add quarantine item');
    return data;
}
