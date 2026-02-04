
import React, { useState, useEffect, useRef, memo } from 'react';
import { CalculationInputs, AdditionalCost } from '../types';

interface CalculatorFormProps {
  inputs: CalculationInputs;
  onInputChange: (name: keyof CalculationInputs, value: any) => void;
  loading: boolean;
}

const StableNumberInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  showCurrency = false 
}: { 
  value: number, 
  onChange: (val: number) => void, 
  placeholder: string, 
  className: string, 
  showCurrency?: boolean 
}) => {
  const [localValue, setLocalValue] = useState<string>(value === 0 ? '' : value.toString());
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value !== lastExternalValue.current) {
      setLocalValue(value === 0 ? '' : value.toString());
      lastExternalValue.current = value;
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setLocalValue(val);
      const parsed = parseFloat(val);
      const nextVal = isNaN(parsed) ? 0 : parsed;
      lastExternalValue.current = nextVal;
      onChange(nextVal);
    }
  };

  return (
    <div className="relative w-full">
      {showCurrency && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>}
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={localValue}
        onChange={handleTextChange}
        className={`${className} ${showCurrency ? 'pl-5' : ''}`}
      />
    </div>
  );
};

const StableTextInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder: string, 
  className: string 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value !== lastExternalValue.current) {
      setLocalValue(value);
      lastExternalValue.current = value;
    }
  }, [value]);

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        lastExternalValue.current = e.target.value;
        onChange(e.target.value);
      }}
      className={className}
    />
  );
};

const CostRow = memo(({ 
  item, 
  onUpdate, 
  onRemove, 
  inputBaseStyle 
}: { 
  item: AdditionalCost, 
  onUpdate: (id: string, key: keyof AdditionalCost, val: any) => void,
  onRemove: (id: string) => void,
  inputBaseStyle: string
}) => (
  <div className="flex gap-2 items-center p-1.5 rounded-lg border-2 border-slate-100 bg-white hover:border-slate-300">
    <input
      type="checkbox"
      checked={item.included}
      onChange={(e) => onUpdate(item.id, 'included', e.target.checked)}
      className="w-4 h-4 rounded cursor-pointer accent-blue-600 shrink-0"
    />
    <StableTextInput 
      value={item.label} 
      placeholder="E.g. Port Drayage, Trucking, Storage..." 
      onChange={(val) => onUpdate(item.id, 'label', val)} 
      className={`${inputBaseStyle} py-1`}
    />
    <div className="w-28 shrink-0">
      <StableNumberInput 
        value={item.value} 
        placeholder="0.00" 
        showCurrency={true}
        onChange={(val) => onUpdate(item.id, 'value', val)}
        className={`${inputBaseStyle} py-1`}
      />
    </div>
    <button 
      onClick={() => onRemove(item.id)}
      className="text-slate-300 hover:text-red-500 px-1 shrink-0"
    >
      <i className="fa-solid fa-xmark"></i>
    </button>
  </div>
));

const CalculatorForm: React.FC<CalculatorFormProps> = ({ inputs, onInputChange, loading }) => {
  const inputBaseStyle = "w-full px-3 py-1.5 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-medium focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 text-sm";

  const addItem = (field: 'inlandLogistics') => {
    const newItem: AdditionalCost = { id: crypto.randomUUID(), label: '', value: 0, included: true };
    onInputChange(field, [...inputs[field], newItem]);
  };

  const updateItem = (field: 'inlandLogistics', id: string, key: keyof AdditionalCost, val: any) => {
    const updated = inputs[field].map(item => 
      item.id === id ? { ...item, [key]: val } : item
    );
    onInputChange(field, updated);
  };

  const removeItem = (field: 'inlandLogistics', id: string) => {
    const filtered = inputs[field].filter(item => item.id !== id);
    onInputChange(field, filtered);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
          CIF Cost
        </h2>
      </div>

      <div className="space-y-3">
        {/* Primary CIF Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Unit Price</label>
            <StableNumberInput 
              value={inputs.unitPrice} 
              placeholder="0.00" 
              showCurrency={true}
              onChange={(val) => onInputChange('unitPrice', val)}
              className={inputBaseStyle}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Qty</label>
            <StableNumberInput 
              value={inputs.quantity} 
              placeholder="1" 
              showCurrency={false}
              onChange={(val) => onInputChange('quantity', val)}
              className={inputBaseStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase">Ocean Freight</label>
              <input 
                type="checkbox" 
                checked={inputs.includeFreight} 
                onChange={(e) => onInputChange('includeFreight', e.target.checked)}
                title="Include in CIF?"
                className="w-3 h-3 accent-blue-600 cursor-pointer"
              />
            </div>
            <StableNumberInput 
              value={inputs.freight} 
              placeholder="0.00" 
              showCurrency={true}
              onChange={(val) => onInputChange('freight', val)}
              className={`${inputBaseStyle} ${!inputs.includeFreight ? 'opacity-50 grayscale' : ''}`}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase">Insurance</label>
              <input 
                type="checkbox" 
                checked={inputs.includeInsurance} 
                onChange={(e) => onInputChange('includeInsurance', e.target.checked)}
                title="Include in CIF?"
                className="w-3 h-3 accent-blue-600 cursor-pointer"
              />
            </div>
            <StableNumberInput 
              value={inputs.insurance} 
              placeholder="0.00" 
              showCurrency={true}
              onChange={(val) => onInputChange('insurance', val)}
              className={`${inputBaseStyle} ${!inputs.includeInsurance ? 'opacity-50 grayscale' : ''}`}
            />
          </div>
        </div>

        {/* Separator for Other Costs */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Other Costs</h3>
            <button 
              onClick={() => addItem('inlandLogistics')}
              className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md uppercase tracking-tight transition-colors flex items-center gap-1"
            >
              <i className="fa-solid fa-plus text-[8px]"></i> Add Line
            </button>
          </div>
          
          <div className="space-y-1.5">
            {inputs.inlandLogistics.map(item => (
              <CostRow 
                key={item.id} 
                item={item} 
                inputBaseStyle={inputBaseStyle}
                onUpdate={(id, key, val) => updateItem('inlandLogistics', id, key, val)}
                onRemove={(id) => removeItem('inlandLogistics', id)}
              />
            ))}
            {inputs.inlandLogistics.length === 0 && (
              <p className="text-[11px] text-slate-400 italic py-1">Add port drayage, trucking, or warehouse fees.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorForm;
