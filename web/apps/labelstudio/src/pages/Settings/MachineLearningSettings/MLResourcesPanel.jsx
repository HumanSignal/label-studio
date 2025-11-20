import React, { useEffect, useState } from 'react';
import { Button, Spinner } from '@humansignal/ui';
import { SimpleCard } from '@humansignal/ui';

export default function MLResourcesPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/ml/resources', { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (e) {
        if (mounted) setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  if (loading) return <div className="p-base"><Spinner size={24} /></div>;

  if (error) return <div className="p-base text-red-600">{error}</div>;

  if (!data) return <div className="p-base">No data</div>;

  if (data.error) return <div className="p-base">{data.error}{data.detail ? `: ${data.detail}` : ''}</div>;

  return (
    <div className="p-base">
      <SimpleCard title="GPU Resources">
        {data.gpus && data.gpus.length > 0 ? (
          <div className="space-y-tight">
            {data.gpus.map((g) => (
              <div key={g.index} className="p-tight border rounded">
                <div className="font-medium">GPU {g.index}: {g.name}</div>
                <div>Memory: {g.memory_used_mb}/{g.memory_total_mb} MB</div>
                <div>Utilization: {g.utilization_percent}%</div>
                <div>Temperature: {g.temperature_c}°C</div>
              </div>
            ))}
          </div>
        ) : (
          <div>No GPUs detected</div>
        )}
      </SimpleCard>
      <div className="mt-base">
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    </div>
  );
}
