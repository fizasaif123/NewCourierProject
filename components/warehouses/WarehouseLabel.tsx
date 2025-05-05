import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function WarehouseLabel({
  company = 'Warehouse Label',
  driverReg,
  shipmentTime,
  aisle,
  bay,
  shelf,
  barcodeValue
}: {
  company?: string;
  driverReg: string;
  shipmentTime: string;
  aisle: string;
  bay: string;
  shelf: string;
  barcodeValue: string;
}) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const shortBarcode = barcodeValue.slice(0, 8);
  useEffect(() => {
    if (typeof window !== 'undefined' && barcodeRef.current) {
      JsBarcode(barcodeRef.current, shortBarcode, {
        format: 'CODE128',
        displayValue: false,
        fontSize: 18,
        height: 60,
        width: 2,
        margin: 0
      });
    }
  }, [shortBarcode]);
  return (
    <div id={`label-${barcodeValue}`} style={{ border: '2px solid #222', borderRadius: 12, width: 320, background: '#fff', padding: 16, fontFamily: 'Arial, sans-serif', margin: '16px auto' }}>
      <div style={{ fontWeight: 'bold', fontSize: 22, textAlign: 'center', marginBottom: 8 }}>{company}</div>
      <div style={{ borderTop: '2px solid #222', borderBottom: '2px solid #222', padding: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
          <span>Driver Reg:</span>
          <span style={{ fontWeight: 'bold' }}>{driverReg}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
          <span>Shipment Time:</span>
          <span style={{ fontWeight: 'bold' }}>{shipmentTime}</span>
        </div>
      </div>
      <div style={{ borderBottom: '2px solid #222', padding: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
          <span>Location:</span>
          <span>Aisle: {aisle} &nbsp; Bay: {bay}</span>
        </div>
        <div style={{ fontSize: 16 }}>Shelf: {shelf}</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <svg ref={barcodeRef} style={{ maxWidth: '100%' }} />
        <div style={{ fontSize: 20, letterSpacing: 2, marginTop: 4 }}>{shortBarcode}</div>
      </div>
    </div>
  );
} 