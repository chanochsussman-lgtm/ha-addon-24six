import React, { useEffect, useState } from 'react';
import { api } from '../api';
import SectionRow from '../components/SectionRow';

export default function Home() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.home()
      .then(d => { setSections(d.sections || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted text-sm">Loading...</div>
  );
  if (error) return (
    <div className="p-6 text-red-400 text-sm">{error}</div>
  );

  return (
    <div className="pt-6">
      {sections.map(s => <SectionRow key={s.id} section={s} />)}
    </div>
  );
}
