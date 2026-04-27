import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SectionTitle } from './SectionTitle';

export default function CommissionQueue() {
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'settings', 'siteConfig'));
        if (configSnap.exists()) {
          const ann = configSnap.data().announcement;
          if (ann && ann.isActive && ann.text) {
            setAnnouncement(ann);
          }
        }
      } catch (err) {
        console.error('Fetch config error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  if (loading) return null;
  if (!announcement) return null;

  return (
    <div className="max-w-2xl mx-auto mt-20 mb-10 space-y-6 px-6">
      <div className="window-box-octagon">
        <SectionTitle className="!mb-6 !text-2xl">站內公告</SectionTitle>
        <div className="text-center">
          <p className="text-gray-300 tracking-widest leading-loose whitespace-pre-wrap text-sm md:text-base">
            {announcement.text}
          </p>
        </div>
      </div>
    </div>
  );
}
