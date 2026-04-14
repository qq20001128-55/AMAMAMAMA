import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { STATUS_NODES } from '../lib/utils';

export default function CommissionQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        // Fetch orders that are not pending, delivered, or closed
        // Since we can't do multiple 'not-in' easily, we'll fetch all and filter, or fetch specific statuses
        const q = query(
          collection(db, 'orders'),
          where('status', 'in', ['queued', 'draft', 'lineart', 'coloring', 'completed']),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        setQueue(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Fetch queue error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueue();
  }, []);

  if (loading) return null;
  if (queue.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto mt-20 mb-10">
      <div className="neo-box !p-6 border-[#1a1a1a]">
        <h3 className="text-xl font-black tracking-widest mb-6 text-center border-b-2 border-[#1a1a1a] pb-4">當前局內進度</h3>
        <div className="space-y-3">
          {queue.map(order => {
            const statusLabel = STATUS_NODES.find(n => n.id === order.status)?.label || order.status;
            return (
              <div key={order.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                <span className="font-mono text-sm font-bold tracking-widest text-[#8b0000]">
                  {order.officialOrderId || `#MAA-${order.orderId.substring(0, 4).toUpperCase()}`}
                </span>
                <span className="text-sm tracking-widest bg-[#1a1a1a] text-white px-3 py-1">
                  {statusLabel}中
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
