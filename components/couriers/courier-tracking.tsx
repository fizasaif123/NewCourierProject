"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion"; // For animations

export function TrackingContent() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [status, setStatus] = useState<string>("Shipped");

  // ✅ Fetch orders, couriers, and assignments
  useEffect(() => {
    const fetchData = async () => {
      // ✅ Fetch Couriers
      const { data: courierData, error: courierError } = await supabase.from("couriers").select("*");
      if (courierError) console.error("Error fetching couriers:", courierError.message);
      setCouriers(courierData || []);

      // ✅ Fetch Orders (Only Pending or Shipped)
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, status, quantity, delivery_date")
        .in("status", ["Pending", "Shipped"]);

      if (orderError) console.error("Error fetching orders:", orderError.message);
      else setOrders(orderData || []);

      // ✅ Fetch Order Assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("order_assignments")
        .select("id, status, assigned_at, orders(id, status), couriers(id, name)");

      if (assignmentError) console.error("Error fetching assignments:", assignmentError.message);
      setAssignments(assignmentData || []);
    };

    fetchData();
  }, []);

  // ✅ Assign order to courier
  const assignOrder = async () => {
    if (!selectedCourier || !selectedOrder) {
      alert("Please select both a courier and an order.");
      return;
    }

    const { data: courier } = await supabase
      .from("couriers")
      .select("*")
      .eq("id", selectedCourier)
      .single();

    if (courier.status !== "available") {
      alert("Courier is not available.");
      return;
    }

    await supabase.from("order_assignments").insert([
      { order_id: selectedOrder, courier_id: selectedCourier, status: "assigned" },
    ]);

    await supabase.from("couriers").update({ status: "busy" }).eq("id", selectedCourier);

    alert("Order assigned successfully!");
    window.location.reload(); // Refresh to see new data
  };

  // ✅ Update courier location
  const updateLocation = async () => {
    if (!selectedCourier || !selectedLocation) {
      alert("Please select both a courier and a location.");
      return;
    }

    await supabase.from("couriers").update({ location: selectedLocation }).eq("id", selectedCourier);

    await supabase.from("courier_tracking").insert([
      { courier_id: selectedCourier, latitude: null, longitude: null, status },
    ]);

    alert("Location updated successfully!");
  };

  // ✅ Mark order as delivered
  const markDelivered = async () => {
    if (!selectedOrder || !selectedCourier) {
      alert("Please select both an order and a courier.");
      return;
    }

    await supabase.from("orders").update({ status: "Delivered" }).eq("id", selectedOrder);

    await supabase.from("order_assignments").update({ status: "completed" }).eq("order_id", selectedOrder).eq("courier_id", selectedCourier);

    await supabase.from("couriers").update({ status: "available" }).eq("id", selectedCourier);

    alert("Order marked as delivered!");
    window.location.reload(); // Refresh to see new data
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">📦 Courier Tracking & Order Assignment</h1>

        {/* Assign Order */}
        <motion.div
          className="mb-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-bold mb-4 text-gray-700">🚚 Assign Order to Courier</h2>
          <select
            className="border border-gray-300 p-2 rounded w-full mb-4 bg-white text-gray-700"
            value={selectedCourier}
            onChange={(e) => setSelectedCourier(e.target.value)}
          >
            <option value="">Select Courier</option>
            {couriers.map((courier) => (
              <option key={courier.id} value={courier.id}>
                {courier.name} ({courier.status})
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 p-2 rounded w-full mb-4 bg-white text-gray-700"
            value={selectedOrder}
            onChange={(e) => setSelectedOrder(e.target.value)}
          >
            <option value="">Select Order</option>
            {orders.length > 0 ? (
              orders.map((order) => (
                <option key={order.id} value={order.id}>
                  Order #{order.id} ({order.status})
                </option>
              ))
            ) : (
              <option value="">No pending orders</option>
            )}
          </select>
          <button
            onClick={assignOrder}
            className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600 transition-colors"
          >
            Assign Order
          </button>
        </motion.div>

        {/* Update Location */}
        <motion.div
          className="mb-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-bold mb-4 text-gray-700">📍 Update Courier Location</h2>
          <select
            className="border border-gray-300 p-2 rounded w-full mb-4 bg-white text-gray-700"
            value={selectedCourier}
            onChange={(e) => setSelectedCourier(e.target.value)}
          >
            <option value="">Select Courier</option>
            {couriers.map((courier) => (
              <option key={courier.id} value={courier.id}>
                {courier.name} ({courier.location})
              </option>
            ))}
          </select>
          <input
            className="border border-gray-300 p-2 rounded w-full mb-4 bg-white text-gray-700"
            placeholder="Enter New Location"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          />
          <button
            onClick={updateLocation}
            className="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600 transition-colors"
          >
            Update Location
          </button>
        </motion.div>

        {/* Mark as Delivered */}
        <motion.div
          className="mb-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-xl font-bold mb-4 text-gray-700">✅ Mark Order as Delivered</h2>
          <button
            onClick={markDelivered}
            className="bg-yellow-500 text-white px-4 py-2 rounded w-full hover:bg-yellow-600 transition-colors"
          >
            Mark as Delivered
          </button>
        </motion.div>

        {/* Display Assigned Orders Table */}
        <motion.div
          className="border border-gray-200 p-6 rounded-lg bg-white shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-xl font-bold mb-4 text-gray-700">📋 Assigned Orders</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-gray-700">Order ID</th>
                <th className="border border-gray-300 px-4 py-2 text-gray-700">Courier</th>
                <th className="border border-gray-300 px-4 py-2 text-gray-700">Status</th>
                <th className="border border-gray-300 px-4 py-2 text-gray-700">Assigned At</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment, index) => (
                <motion.tr
                  key={index}
                  className="text-center hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <td className="border border-gray-300 px-4 py-2 text-gray-700">{assignment.orders.id}</td>
                  <td className="border border-gray-300 px-4 py-2 text-gray-700">{assignment.couriers.name}</td>
                  <td className="border border-gray-300 px-4 py-2 text-gray-700">{assignment.status}</td>
                  <td className="border border-gray-300 px-4 py-2 text-gray-700">
                    {new Date(assignment.assigned_at).toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}