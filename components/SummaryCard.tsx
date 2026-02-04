
import React from 'react';
import { CalculationResult, ProductInfo, AdditionalCost } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { TradeIntelligence, DutyBreakdownItem, ReasoningStep } from '../services/geminiService';

type jsPDFWithPlugin = jsPDF & {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: {
    finalY: number;
  };
};

interface SummaryCardProps {
  result: CalculationResult;
  productInfo: (ProductInfo & { breakdown?: DutyBreakdownItem[], reasoningPathway?: ReasoningStep[] }) | null;
  manualDutyRate: number;
  inlandLogistics: AdditionalCost[];
  quantity: number;
  tradeIntel?: TradeIntelligence | null;
  destination: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ result, productInfo, manualDutyRate, inlandLogistics, quantity, tradeIntel, destination }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const isFobBasis = ['United States', 'Canada', 'Australia'].includes(destination);

  const exportPDF = () => {
    const doc = new jsPDF() as jsPDFWithPlugin;
    const today = new Date().toLocaleDateString();

    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text('Tariff Watch - Summary Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${today}`, 14, 28);

    if (productInfo) {
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Product Classification Analysis', 14, 40);
      doc.setFontSize(10);
      doc.text(`Description: ${productInfo.description}`, 14, 46);
      doc.text(`HTS Code: ${productInfo.hsCode}`, 14, 51);
      doc.text(`Route: ${productInfo.countryOfOrigin} to ${productInfo.destinationCountry}`, 14, 56);
      doc.text(`Effective Duty Rate: ${result.totalDutyRate.toFixed(2)}%`, 14, 61);
      doc.text(`Duty Calculation Basis: ${isFobBasis ? 'FOB (Free on Board)' : 'CIF (Cost, Insurance, Freight)'}`, 14, 66);

      if (productInfo.breakdown && productInfo.breakdown.length > 0) {
        doc.autoTable({
          startY: 75,
          head: [['Duty Component', 'Rate', 'Official Source URL']],
          body: productInfo.breakdown.map(item => [
            item.label,
            `+${item.rate.toFixed(2)}%`,
            item.sourceUrl || 'N/A'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
          columnStyles: {
            2: { cellWidth: 80 }
          }
        });
      }

      const nextY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 75;

      if (productInfo.reasoningPathway) {
        doc.setFontSize(12);
        doc.text('Legal Justification (Chain of Thought)', 14, nextY);
        let curY = nextY + 7;
        productInfo.reasoningPathway.forEach((step, i) => {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`${i+1}. ${step.title}:`, 14, curY);
          doc.setFont('helvetica', 'normal');
          const splitText = doc.splitTextToSize(step.detail, 170);
          doc.text(splitText, 14, curY + 5);
          curY += 7 + (splitText.length * 4);
          if (curY > 270) { doc.addPage(); curY = 20; }
        });
      }
    }

    const tableStartY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 120;

    doc.autoTable({
      startY: tableStartY,
      head: [['Cost Category', 'Quantities / Rates', 'Final Amount']],
      body: [
        ['FOB Value', `Quantity: ${quantity}`, formatCurrency(result.fobValue)],
        ['Freight & Insurance', 'CIF Additions', formatCurrency(result.cifValue - result.fobValue)],
        ['CIF Value Basis', 'Customs Value', formatCurrency(result.cifValue)],
        ['Import Duty Total', `Effective Rate: ${result.totalDutyRate.toFixed(2)}% (${isFobBasis ? 'FOB' : 'CIF'} Basis)`, formatCurrency(result.dutyAmount)],
        ['Other Terminal Fees', 'Drayage / Storage', formatCurrency(result.inlandLogisticsTotal)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text(`Total Landed Cost Estimation: ${formatCurrency(result.totalLandedCost)}`, 14, finalY);

    doc.save(`TariffWatch_Analysis_${today.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-2xl flex flex-col gap-6 border border-slate-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <i className="fa-solid fa-file-invoice-dollar text-9xl"></i>
      </div>

      <div className="relative z-10">
        <h2 className="text-base font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-blue-400">
          <i className="fa-solid fa-receipt text-sm"></i>
          Analysis Summary
        </h2>
        
        <div className="space-y-4 text-xs text-slate-300">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <span className="font-bold uppercase tracking-tight opacity-60">FOB Total Value</span>
            <span className="font-black text-white text-sm">{formatCurrency(result.fobValue)}</span>
          </div>
          
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <span className="font-bold uppercase tracking-tight opacity-60">Logistics & Ins.</span>
            <span className="font-black text-white text-sm">{formatCurrency(result.cifValue - result.fobValue)}</span>
          </div>

          <div className="flex justify-between items-center py-3 bg-slate-800/80 px-4 rounded-xl font-black text-white border border-slate-700 shadow-inner">
            <span className="uppercase tracking-widest text-[10px]">CIF Base Value</span>
            <span className="text-sm">{formatCurrency(result.cifValue)}</span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex flex-col">
              <span className="font-bold uppercase tracking-tight opacity-60">Import Duty Liability</span>
              <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-0.5">Combined Rate @ {result.totalDutyRate.toFixed(2)}% ({isFobBasis ? 'FOB' : 'CIF'} Basis)</span>
            </div>
            <span className="font-black text-blue-400 text-sm">{formatCurrency(result.dutyAmount)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span className="font-bold uppercase tracking-tight opacity-60">Other Fees</span>
            <span className="font-black text-white text-sm">{formatCurrency(result.inlandLogisticsTotal)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-blue-600/30 pt-6 relative z-10">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-end">
            <span className="text-[10px] uppercase tracking-widest text-blue-400 font-black">Estimated Total Landed Cost</span>
            <span className="text-3xl font-black text-white leading-none tracking-tighter drop-shadow-lg">{formatCurrency(result.totalLandedCost)}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={exportPDF}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40 active:scale-[0.98]"
      >
        <i className="fa-solid fa-file-pdf text-sm"></i>
        Export Professional Audit Report
      </button>
    </div>
  );
};

export default SummaryCard;
