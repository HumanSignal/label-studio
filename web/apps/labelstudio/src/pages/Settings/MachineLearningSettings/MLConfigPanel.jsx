import React, {useEffect, useState} from 'react';
import {Button, Spinner} from '@humansignal/ui';
import {Input, Label, TextArea} from '../../../components/Form/Elements';
import {useAPI} from '../../../providers/ApiProvider';

export default function MLConfigPanel(){
  const api = useAPI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({model_path:'', conf:0.25, version:'', labels:{}});
  const [configFile, setConfigFile] = useState('');
  const [originalConfig, setOriginalConfig] = useState(null);
  const [labelsText, setLabelsText] = useState(JSON.stringify({}, null, 2));
  const [error, setError] = useState(null);

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try{
        const res = await fetch('/api/ml/config', { credentials: 'same-origin' });
        if(res && res.ok){
          const payload = await res.json();
          if(mounted) {
            const cfg = payload.config || payload;
            setConfig(cfg);
            setOriginalConfig(cfg);
            setLabelsText(JSON.stringify(cfg.labels || {}, null, 2));
            setConfigFile(payload.config_file || '');
          }
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

  const onConfigFileChange = (e) => setConfigFile(e.target.value);

  // When configFile changes, fetch that file from backend and populate fields
  useEffect(()=>{
    if(!configFile) return;
    let mounted = true;
    (async ()=>{
      try{
        const url = '/api/ml/config?config_file=' + encodeURIComponent(configFile);
        const res = await fetch(url, { credentials: 'same-origin' });
        if(res && res.ok){
          const payload = await res.json();
          if(mounted){
            const cfg = payload.config || payload;
            setConfig(cfg);
            setOriginalConfig(cfg);
            setLabelsText(JSON.stringify(cfg.labels || {}, null, 2));
            setError(null);
          }
        }else{
          const txt = res ? await res.text() : 'no response';
          if(mounted) setError('Failed to load config file: ' + txt);
        }
      }catch(err){
        if(mounted) setError(String(err));
      }
    })();
    return ()=>{mounted=false}
  },[configFile]);

  const onLabelsChange = (e) => {
    const txt = e.target.value;
    setLabelsText(txt);
    try{
      const parsed = JSON.parse(txt);
      setConfig(prev=> ({...prev, labels: parsed}));
      setError(null);
    }catch(err){
      setError('Labels must be valid JSON mapping like {"0":"label"}');
    }
  }

  const apply = async ()=>{
    setSaving(true);
    setError(null);
    try{
      // Only send changed fields to avoid accidental overwrites
      const allowed = ['model_path','conf','version','labels'];
      const payload = {};
      if(configFile) payload.config_file = configFile;
      if(originalConfig){
        allowed.forEach((k)=>{
          // compare JSON-stringified for objects
          const a = originalConfig[k];
          const b = config[k];
          const equal = (typeof a === 'object') ? JSON.stringify(a) === JSON.stringify(b) : String(a) === String(b);
          if(!equal) payload[k] = b;
        });
      } else {
        // no original to compare, send what we have but avoid empty strings
        allowed.forEach((k)=>{
          const v = config[k];
          if(v !== undefined && v !== null && !(typeof v === 'string' && v.trim()==='')) payload[k] = v;
        });
      }

      if(Object.keys(payload).length === 0){
        setError('No changes to apply');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/ml/config', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        <Label text="Config File Path" />
        <Input value={configFile||''} onChange={(e)=>onConfigFileChange(e)} placeholder="/path/to/config.json" />
      </div>
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
        <TextArea value={labelsText} onChange={onLabelsChange} />
      </div>
      <div className="flex gap-2">
        <Button variant="primary" look="filled" onClick={apply} disabled={saving}>
          {saving ? 'Applying...' : 'Apply'}
        </Button>
      </div>
    </div>
  )
}
