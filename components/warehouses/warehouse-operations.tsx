'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from './SupabaseClient';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';
import { Trash2, CheckCircle2, Truck, Package, Warehouse as WarehouseIcon, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import dynamic from 'next/dynamic';

interface Product {
  id: string;
  name: string;
  // add other fields as needed
}

interface Warehouse {
  id: string;
  name: string;
  // add other fields as needed
}

interface TruckArrivalForm {
  vehicle_registration: string;
  customer_name: string;
  driver_name: string;
  vehicle_size: string;
  load_type: string;
  arrival_time: string;
  warehouse_id: string;
}

interface TruckArrival extends TruckArrivalForm { id: string; }

interface TruckItem { id: string; description: string; quantity: number; condition: string; }

interface PutawayAssignment { id: string; truck_item_id: string; aisle: string; bay: string; level: string; position: string; }

interface QualityCheck { id: string; truck_item_id: string; status: string; damage_image_url?: string; supervisor_name?: string; barcode?: string; }

const steps = [
  'Truck Arrival',
  'Unloading',
  'Warehouse Putaway',
  'Quality Check',
];

// Set the workerSrc for pdfjsLib in browser environments
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

const WarehouseLabel = dynamic(() => import('./WarehouseLabel'), { ssr: false });

export function WarehouseOperations() {
  // Stepper state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Truck Arrival
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [truckForm, setTruckForm] = useState<TruckArrivalForm>({
    vehicle_registration: '', customer_name: '', driver_name: '', vehicle_size: '', load_type: '', arrival_time: '', warehouse_id: ''
  });
  const [truckArrivalId, setTruckArrivalId] = useState<string | null>(null);

  // Step 2: Unloading
  const [items, setItems] = useState<TruckItem[]>([]);
  const [itemForm, setItemForm] = useState({ description: '', quantity: '1', condition: 'Good' });
  const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);

  // Step 3: Putaway
  const [putaways, setPutaways] = useState<PutawayAssignment[]>([]);
  const [putawayForm, setPutawayForm] = useState<{ [itemId: string]: { aisle: string; bay: string; level: string; position: string } }>({});
  const [putawayError, setPutawayError] = useState<string | null>(null);

  // Step 4: Quality Check
  const [qualityChecks, setQualityChecks] = useState<{ [itemId: string]: QualityCheck }>({});
  const [supervisorName, setSupervisorName] = useState('');

  // Workflow complete state
  const [workflowComplete, setWorkflowComplete] = useState(false);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TruckItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch current user and their warehouses
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      setCurrentUser(null);
      setWarehouses([]);
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    // Fetch only warehouses for this user
    supabase.from('warehouses').select('*').eq('client_id', user.id).then(({ data }) => setWarehouses(data || []));
  }, []);

  // Step 1: Truck Arrival Handlers
  const handleTruckInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTruckForm({ ...truckForm, [e.target.name]: e.target.value });
  };
  const canRegisterArrival = Object.values(truckForm).every(Boolean);
  const handleRegisterArrival = async () => {
    if (!canRegisterArrival) return;
    const { data, error } = await supabase.from('truck_arrivals').insert([{ ...truckForm }]).select().single();
    if (error) { toast.error('Failed to register arrival'); return; }
    setTruckArrivalId(data.id);
    toast.success('Truck arrival registered!');
    setCurrentStep(1);
  };

  // Step 2: Unloading Handlers
  const handleItemInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setItemForm({ ...itemForm, [e.target.name]: e.target.value });
  };
  const canAddItem = itemForm.description && itemForm.quantity;
  const handleAddItem = async () => {
    if (!truckArrivalId) return;
    const { data, error } = await supabase.from('truck_items').insert([{
      truck_arrival_id: truckArrivalId,
      description: itemForm.description,
      quantity: parseInt(itemForm.quantity),
      condition: itemForm.condition
    }]).select().single();
    if (error) { toast.error('Failed to add item'); return; }
    setItems([...items, data]);
    setItemForm({ description: '', quantity: '1', condition: 'Good' });
  };
  // Bulk upload CSV/Excel/PDF
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBulkUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        let rows: any[] = [];
        if (ext === 'csv') {
          const text = evt.target?.result as string;
          rows = text.split('\n').map(r => r.split(','));
        } else {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }
        // Process rows: [description, quantity, condition]
        const newItems: TruckItem[] = [];
        for (const row of rows.slice(1)) { // skip header
          if (row.length < 2) continue;
          const [description, quantity, condition = 'Good'] = row;
          if (!description || !quantity) continue;
          const { data, error } = await supabase.from('truck_items').insert([{
            truck_arrival_id: truckArrivalId,
            description,
            quantity: parseInt(quantity),
            condition: condition || 'Good'
          }]).select().single();
          if (error) { setBulkUploadError('Bulk upload failed'); return; }
          newItems.push(data);
        }
        setItems([...items, ...newItems]);
      };
      if (ext === 'csv') reader.readAsText(file);
      else reader.readAsArrayBuffer(file);
    } else if (ext === 'pdf') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const typedarray = new Uint8Array(evt.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        // Try to split text into rows/columns (basic, may need to adjust for your PDF format)
        const rows = text.split('\n').map(line => line.split(/\s{2,}/));
        const newItems: TruckItem[] = [];
        for (const row of rows) {
          if (row.length < 2) continue;
          const [description, quantity, condition = 'Good'] = row;
          if (!description || !quantity) continue;
          const { data, error } = await supabase.from('truck_items').insert([{
            truck_arrival_id: truckArrivalId,
            description,
            quantity: parseInt(quantity),
            condition: condition || 'Good'
          }]).select().single();
          if (error) { setBulkUploadError('Bulk upload failed'); return; }
          newItems.push(data);
        }
        setItems([...items, ...newItems]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setBulkUploadError('Unsupported file type. Please upload CSV, Excel, or PDF.');
    }
  };
  const canProceedUnloading = items.length > 0;

  // Step 3: Putaway Handlers
  const handlePutawayInput = (itemId: string, field: string, value: string) => {
    setPutawayForm({
      ...putawayForm,
      [itemId]: { ...putawayForm[itemId], [field]: value }
    });
  };
  const handleAssignPutaway = async () => {
    setPutawayError(null);
    // Validate uniqueness
    const positions = Object.values(putawayForm).map(p => `${p.aisle}-${p.bay}-${p.level}-${p.position}`);
    if (new Set(positions).size !== positions.length) {
      setPutawayError('Each position must be unique!');
      return;
    }
    // Save to DB
    for (const item of items) {
      const p = putawayForm[item.id];
      if (!p) continue;
      const { error } = await supabase.from('putaway_assignments').insert([{
        truck_item_id: item.id,
        aisle: p.aisle,
        bay: p.bay,
        level: p.level,
        position: p.position
      }]);
      if (error) { setPutawayError('Failed to assign putaway'); return; }
    }
    toast.success('Putaway assigned!');
    setCurrentStep(3);
  };
  const canProceedPutaway = items.every(item => putawayForm[item.id]?.aisle && putawayForm[item.id]?.bay && putawayForm[item.id]?.level && putawayForm[item.id]?.position);

  // Step 4: Quality Check Handlers
  const handleQualityCheck = (itemId: string, status: string, file?: File) => {
    setQualityChecks({
      ...qualityChecks,
      [itemId]: { ...qualityChecks[itemId], status }
    });
    // Handle file upload for damage image if needed
    if (file) {
      // For demo, just set a fake URL
      setQualityChecks(qc => ({ ...qc, [itemId]: { ...qc[itemId], damage_image_url: URL.createObjectURL(file) } }));
    }
  };
  const handleSupervisorSign = (e: React.ChangeEvent<HTMLInputElement>) => setSupervisorName(e.target.value);
  const handleFinishQualityCheck = async () => {
    // Save to DB and generate barcodes
    for (const item of items) {
      const qc = qualityChecks[item.id];
      if (!qc) continue;
      // Generate barcode (for demo, use item.id)
      const barcode = item.id;
      
      // Save to warehouse_items table with minimal required fields
      console.log('Saving warehouse item:', {
        name: item.description,
        quantity: item.quantity,
        condition: item.condition,
        status: qc.status,
        client_id: currentUser?.id,
        created_at: new Date().toISOString(),
        truck_arrival_id: truckArrivalId
      });
      const { error: warehouseItemError } = await supabase.from('warehouse_items').insert([{
        name: item.description,
        quantity: item.quantity,
        condition: item.condition,
        status: qc.status,
        client_id: currentUser?.id,
        created_at: new Date().toISOString(),
        truck_arrival_id: truckArrivalId
      }]);
      
      if (warehouseItemError) {
        console.error('Warehouse item insert error:', warehouseItemError);
        toast.error('Failed to add item to warehouse: ' + warehouseItemError.message);
        return;
      }

      // Save quality check
      await supabase.from('quality_checks').insert([{
        truck_item_id: item.id,
        status: qc.status,
        damage_image_url: qc.damage_image_url,
        supervisor_name: supervisorName,
        barcode
      }]);
    }
    toast.success('Quality check complete!');
    setWorkflowComplete(true);
  };
  const canFinishQuality = items.every(item => qualityChecks[item.id]?.status) && supervisorName;

  // Stepper icons
  const stepIcons = [Truck, Package, WarehouseIcon, ShieldCheck];

  // Remove item with confirmation dialog
  const handleRemoveItem = (item: TruckItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };
  const confirmRemoveItem = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    const { error } = await supabase.from('truck_items').delete().eq('id', itemToDelete.id);
    setLoading(false);
    setShowDeleteDialog(false);
    if (!error) setItems(items.filter(i => i.id !== itemToDelete.id));
    else toast.error('Failed to remove item');
    setItemToDelete(null);
  };

  // Loading spinner component
  const Spinner = () => <span className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin align-middle"></span>;

  // UI
  return (
    <div ref={mainRef} className="space-y-8 max-w-4xl mx-auto px-2 md:px-0">
      <h1 className="text-2xl font-bold mb-2">Warehouse Operations</h1>
      {/* Workflow Complete Card */}
      {workflowComplete ? (
        <Card className="text-center py-12 mx-auto max-w-xl mt-16 animate-fade-in">
          <CardHeader>
            <CheckCircle2 className="mx-auto text-green-500 mb-4" size={56} />
            <CardTitle className="text-3xl mb-2">Workflow Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg mb-4">All items have been processed and transferred to inventory</div>
            <div className="font-semibold text-green-600 mb-8">Warehouse Operation Complete!<br/>All {items.length} items have been processed and are now available in inventory.</div>
            <Button onClick={() => {
              setCurrentStep(0);
              setTruckForm({ vehicle_registration: '', customer_name: '', driver_name: '', vehicle_size: '', load_type: '', arrival_time: '', warehouse_id: '' });
              setTruckArrivalId(null);
              setItems([]);
              setItemForm({ description: '', quantity: '1', condition: 'Good' });
              setBulkUploadError(null);
              setPutaways([]);
              setPutawayForm({});
              setPutawayError(null);
              setQualityChecks({});
              setSupervisorName('');
              setWorkflowComplete(false);
              if (mainRef.current) mainRef.current.scrollIntoView({ behavior: 'smooth' });
            }} className="mt-2">
              Start New Operation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stepper */}
          <div className="flex items-center mb-8 justify-center">
            {steps.map((step, idx) => {
              const Icon = stepIcons[idx];
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              return (
                <React.Fragment key={step}>
                  <div className={`flex flex-col items-center ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    <div className={`rounded-full w-10 h-10 flex items-center justify-center border-2 ${isActive ? 'border-blue-600 bg-blue-50' : isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'} mb-1`}>{isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}</div>
                    <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-500' : 'text-gray-400'}`}>{step}</span>
                  </div>
                  {idx < steps.length - 1 && <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-200' : 'bg-gray-200'}`}></div>}
                </React.Fragment>
              );
            })}
          </div>
          {/* Step 1: Truck Arrival */}
          {currentStep === 0 && (
            <Card className="p-6">
              <CardHeader><CardTitle className="mb-2">Register Truck Arrival</CardTitle></CardHeader>
              <CardContent>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium mb-1">Vehicle Registration</label>
                    <Input name="vehicle_registration" value={truckForm.vehicle_registration} onChange={handleTruckInput} autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Customer Name</label>
                    <Input name="customer_name" value={truckForm.customer_name} onChange={handleTruckInput} autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Driver Name</label>
                    <Input name="driver_name" value={truckForm.driver_name} onChange={handleTruckInput} autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Vehicle Size</label>
                    <Input name="vehicle_size" value={truckForm.vehicle_size} onChange={handleTruckInput} autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Load Type</label>
                    <Input name="load_type" value={truckForm.load_type} onChange={handleTruckInput} autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Arrival Time</label>
                    <Input name="arrival_time" type="datetime-local" value={truckForm.arrival_time} onChange={handleTruckInput} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1">Select Warehouse</label>
                    <Select name="warehouse_id" value={truckForm.warehouse_id} onValueChange={val => setTruckForm({ ...truckForm, warehouse_id: val })}>
                      <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="button" disabled={!canRegisterArrival || loading} onClick={async () => { setLoading(true); await handleRegisterArrival(); setLoading(false); }} className="w-full md:w-auto">
                      {loading ? <Spinner /> : 'Register Arrival'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          {/* Step 2: Unloading */}
          {currentStep === 1 && (
            <Card className="p-6">
              <CardHeader>
                <Button
                  variant="outline"
                  className="mb-4"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </Button>
                <CardTitle className="mb-2 flex items-center gap-2"><Package className="text-blue-500" /> Unloading</CardTitle>
                <p className="text-gray-500 text-sm mt-1">Add each item from the truck. You can also bulk upload via CSV, Excel, or PDF.</p>
              </CardHeader>
              <CardContent>
                <form className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Description</label>
                    <Input name="description" value={itemForm.description} onChange={handleItemInput} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Quantity</label>
                    <Input name="quantity" type="number" min="1" value={itemForm.quantity} onChange={handleItemInput} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Condition</label>
                    <select name="condition" value={itemForm.condition} onChange={handleItemInput} className="border rounded px-2 py-1 w-full">
                      <option value="Good">Good</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>
                  <Button type="button" disabled={!canAddItem || loading} onClick={async () => { setLoading(true); await handleAddItem(); setLoading(false); }} className="w-full">
                    {loading ? <Spinner /> : 'Add Item'}
                  </Button>
                </form>
                <div className="mb-2">
                  <label className="block mb-1 font-medium">Bulk Upload (CSV, Excel, or PDF)</label>
                  <Input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleBulkUpload} />
                  {bulkUploadError && <div className="text-red-500 text-xs">{bulkUploadError}</div>}
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 mt-4">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.condition}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" aria-label="Remove item" onClick={() => handleRemoveItem(item)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button className="mt-4 w-full md:w-auto" disabled={!canProceedUnloading} onClick={() => setCurrentStep(2)}>
                  Proceed to Putaway
                </Button>
              </CardContent>
            </Card>
          )}
          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove Item</DialogTitle>
              </DialogHeader>
              <div>Are you sure you want to remove this item?</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmRemoveItem} disabled={loading}>{loading ? <Spinner /> : 'Remove'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Step 3: Putaway */}
          {currentStep === 2 && (
            <Card className="p-6">
              <CardHeader>
                <Button
                  variant="outline"
                  className="mb-4"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </Button>
                <CardTitle className="mb-2 flex items-center gap-2"><WarehouseIcon className="text-blue-500" /> Warehouse Putaway</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Description</TableHead>
                        <TableHead>Aisle</TableHead>
                        <TableHead>Bay</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Position</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell><Input value={putawayForm[item.id]?.aisle || ''} onChange={e => handlePutawayInput(item.id, 'aisle', e.target.value)} /></TableCell>
                          <TableCell><Input value={putawayForm[item.id]?.bay || ''} onChange={e => handlePutawayInput(item.id, 'bay', e.target.value)} /></TableCell>
                          <TableCell><Input value={putawayForm[item.id]?.level || ''} onChange={e => handlePutawayInput(item.id, 'level', e.target.value)} /></TableCell>
                          <TableCell><Input value={putawayForm[item.id]?.position || ''} onChange={e => handlePutawayInput(item.id, 'position', e.target.value)} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {putawayError && <div className="text-red-500 text-xs mt-2">{putawayError}</div>}
                <Button className="mt-4 w-full md:w-auto" disabled={!canProceedPutaway} onClick={handleAssignPutaway}>
                  Assign Putaway
                </Button>
                {/* Render warehouse labels for each item with assigned location */}
                <div className="mt-8">
                  {items.map(item => {
                    const p = putawayForm[item.id] || {};
                    if (!p.aisle || !p.bay || !p.level) return null;
                    return (
                      <div key={item.id} className="flex flex-col items-center mb-8">
                        <WarehouseLabel
                          company={currentUser?.email ? currentUser.email.split('@')[0] + ' Warehouse' : 'Warehouse Label'}
                          driverReg={truckForm.vehicle_registration}
                          shipmentTime={truckForm.arrival_time ? new Date(truckForm.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          aisle={p.aisle}
                          bay={p.bay}
                          shelf={p.level}
                          barcodeValue={item.id}
                        />
                        <Button className="mt-2" onClick={() => {
                          const printContents = document.createElement('div');
                          const labelElem = document.querySelector(`#label-${item.id}`);
                          if (labelElem) {
                            printContents.appendChild(labelElem.cloneNode(true));
                            const printWindow = window.open('', '', 'height=600,width=400');
                            if (printWindow) {
                              printWindow.document.write('<html><head><title>Print Label</title></head><body>');
                              printWindow.document.body.appendChild(printContents);
                              printWindow.document.write('</body></html>');
                              printWindow.document.close();
                              printWindow.focus();
                              setTimeout(() => printWindow.print(), 500);
                            }
                          } else {
                            toast.error('Label not found for printing.');
                          }
                        }}>
                          Print Label
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Step 4: Quality Check */}
          {currentStep === 3 && (
            <Card className="p-6">
              <CardHeader>
                <Button
                  variant="outline"
                  className="mb-4"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </Button>
                <CardTitle className="mb-2 flex items-center gap-2"><ShieldCheck className="text-blue-500" /> Quality Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Damage Image</TableHead>
                        <TableHead>Barcode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Select value={qualityChecks[item.id]?.status || ''} onValueChange={val => handleQualityCheck(item.id, val)}>
                              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ok">OK</SelectItem>
                                <SelectItem value="damaged">Damaged</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {qualityChecks[item.id]?.status === 'damaged' && (
                              <Input type="file" accept="image/*" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleQualityCheck(item.id, 'damaged', file);
                              }} />
                            )}
                            {qualityChecks[item.id]?.damage_image_url && (
                              <img src={qualityChecks[item.id].damage_image_url} alt="Damage" className="w-16 h-16 object-cover mt-2 rounded border" />
                            )}
                          </TableCell>
                          <TableCell>
                            {/* Barcode SVG (for demo, just show item.id) */}
                            <svg id={`barcode-${item.id}`}></svg>
                            <Button size="sm" className="mt-2" onClick={() => {
                              const svg = document.getElementById(`barcode-${item.id}`);
                              if (svg) JsBarcode(svg, item.id, { format: 'CODE128' });
                            }}>Generate</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex flex-col md:flex-row gap-2 items-center justify-end">
                  <Input placeholder="Supervisor Name" value={supervisorName} onChange={handleSupervisorSign} className="w-full md:w-auto" />
                  <Button disabled={!canFinishQuality || completing} onClick={async () => { setCompleting(true); await handleFinishQualityCheck(); setCompleting(false); }} className="w-full md:w-auto">
                    {completing ? <Spinner /> : 'Finish Quality Check'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
} 