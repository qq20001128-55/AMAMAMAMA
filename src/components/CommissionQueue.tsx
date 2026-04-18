import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { STATUS_NODES } from '../lib/utils';
import { SectionTitle } from './SectionTitle';
import { Megaphone } from 'lucide-react';

export default function CommissionQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueueAndConfig = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'settings', 'siteConfig'));
        if (configSnap.exists()) {
          const ann = configSnap.data().announcement;
          if (ann && ann.isActive && ann.text) {
            setAnnouncement(ann);
          }
        }

        const q = query(
          collection(db, 'orders'),
          where('status', 'in', ['queued', 'rough_sketch', 'draft', 'colored_sketch', 'completed']),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        setQueue(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Fetch queue/config error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueueAndConfig();
  }, []);

  if (loading) return null;
  if (!announcement && queue.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto mt-20 mb-10 space-y-6">
      {announcement && (
        <div className="text-center mb-6">
          <p className="text-gray-700 tracking-widest leading-loose whitespace-pre-wrap">
            {announcement.text}
          </p>
        </div>
      )}

      {queue.length > 0 && (
        <div className="window-box-octagon">
          <SectionTitle className="!mb-6 !text-2xl">當前局內進度</SectionTitle>
          <div className="space-y-3">
            {queue.map(order => {
              const statusLabel = STATUS_NODES.find(n => n.id === order.status)?.label || order.status;
              return (
                <div key={order.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                  <span className="font-mono text-sm font-bold tracking-widest text-[#53565b]">
                    {order.orderNo || '處理中...'}
                  </span>
                  <span className="text-sm tracking-widest bg-[#53565b] text-white px-3 py-1">
                    {statusLabel}中
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
