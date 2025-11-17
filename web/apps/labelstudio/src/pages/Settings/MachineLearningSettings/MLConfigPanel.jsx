import React, {useEffect, useState} from 'react';
import {Button, Spinner} from '@humansignal/ui';
import {Input, Label, TextArea} from '../../../components/Form/Elements';
import {useAPI} from '../../../providers/ApiProvider';

export default function MLConfigPanel(){
  const api = useAPI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({model_path:'', conf:0.25, version:'', labels:{}});
  const [error, setError] = useState(null);

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try{
        const res = await fetch('/api/ml/config', { credentials: 'same-origin' });
        if(res && res.ok){
          const data = await res.json();
          if(mounted) setConfig(data);
        } else {
          const txt = res ? await res.text() : 'no response';
          setError(txt);
        }
      }catch(e){
        setError(String(e));
      }finally{
        if(mounted) setLoading(false);
      }
    })();
    return ()=>{mounted=false};
  },[]);

  const onChange = (key) => (e) => {
    const v = e.target.value;
    setConfig(prev=> ({...prev, [key]: key==='conf' ? parseFloat(v) : v}));
  }

  const onLabelsChange = (e) => {
    try{
      const parsed = JSON.parse(e.target.value);
      setConfig(prev=> ({...prev, labels: parsed}));
    }catch(err){
      // keep raw text until valid JSON
      setError('Labels must be valid JSON mapping like {"0":"label"}');
    }
  }

  const apply = async ()=>{
    setSaving(true);
    setError(null);
    try{
      const res = await fetch('/api/ml/config', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if(res && res.ok){
        const data = await res.json();
        setConfig(data.config || config);
      } else {
        const txt = res ? await res.text() : 'no response';
        setError(txt);
      }
    }catch(e){
      setError(String(e));
    }finally{
      setSaving(false);
    }
  }

  if(loading) return <div className="p-base"><Spinner size={24} /></div>;

  return (
    <div className="p-base">
      {error && <div className="text-red-600 mb-tight">{error}</div>}
      <div className="mb-base">
        <Label text="Model Path" />
        <Input value={config.model_path||''} onChange={onChange('model_path')} placeholder="/path/to/model.pt" />
      </div>
      <div className="mb-base">
        <Label text="Confidence Threshold" />
        <Input value={config.conf} type="number" step="0.01" min="0" max="1" onChange={onChange('conf')} />
      </div>
      <div className="mb-base">
        <Label text="Model Version" />
        <Input value={config.version||''} onChange={onChange('version')} />
      </div>
      <div className="mb-base">
        <Label text="Labels (JSON)" />
        <TextArea defaultValue={JSON.stringify(config.labels||{}, null, 2)} onChange={onLabelsChange} />
      </div>
      <div className="flex gap-2">
        <Button variant="primary" look="filled" onClick={apply} disabled={saving}>
          {saving ? 'Applying...' : 'Apply'}
        </Button>
      </div>
    </div>
  )
}
