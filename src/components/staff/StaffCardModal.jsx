import React, { useRef, useState } from 'react';
import { X, Download, Printer, Shield, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import BarcodeGenerator from '../common/BarcodeGenerator';
import InitialsAvatar from '../common/InitialsAvatar';

export default function StaffCardModal({ staff, isOpen, onClose }) {
  const cardRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !staff) return null;

  const generateCardDataUrl = async () => {
    if (!cardRef.current) return null;
    try {
      // Primary high-quality browser rendering engine
      return await toPng(cardRef.current, { 
        pixelRatio: 4, 
        quality: 1.0,
        backgroundColor: '#020617',
        cacheBust: true
      });
    } catch (err) {
      console.warn("html-to-image failed, falling back to html2canvas:", err);
      const canvas = await html2canvas(cardRef.current, { 
        scale: 4, 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#020617',
        logging: false
      });
      return canvas.toDataURL("image/png", 1.0);
    }
  };

  const handleDownloadPNG = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const dataUrl = await generateCardDataUrl();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `KSP_Staff_Card_${staff.staffCode || 'ID'}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to generate PNG card:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const imgData = await generateCardDataUrl();
      if (!imgData) return;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98] // CR80 standard credit card size (mm)
      });
      pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);
      pdf.save(`KSP_Staff_Card_${staff.staffCode || 'ID'}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF card:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">Printable Staff ID Card</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ID Card Display Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950/40">
          <div 
            ref={cardRef}
            className="printable-area w-[350px] h-[220px] bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-2 border-slate-700/80 rounded-2xl p-4 shadow-2xl flex flex-col justify-between relative overflow-hidden text-white box-border select-none"
          >
            {/* Background branding subtle lighting */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-600/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            {/* Top Card Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-md shrink-0">
                  KSP
                </div>
                <div>
                  <h4 className="font-black text-[11px] tracking-wider uppercase text-white leading-normal">KSP ENTERPRISE</h4>
                  <p className="text-[9px] text-blue-400 font-semibold tracking-tight leading-none">STAFF IDENTIFICATION CARD</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                {staff.branch || 'KIGALI'}
              </span>
            </div>

            {/* Middle Profile info */}
            <div className="flex items-center gap-3 my-1 overflow-visible">
              <InitialsAvatar 
                photoUrl={staff.photoUrl}
                firstName={staff.firstName}
                lastName={staff.lastName}
                size="lg"
                className="w-16 h-16 border border-white/20 shadow-md shrink-0 rounded-2xl"
              />
              <div className="flex flex-col justify-center min-w-0 py-0.5 space-y-0.5 overflow-visible">
                <h3 className="font-black text-sm text-white leading-normal tracking-wide whitespace-nowrap overflow-visible">
                  {staff.firstName} {staff.lastName}
                </h3>
                <p className="text-xs text-blue-300 font-semibold leading-normal capitalize whitespace-nowrap overflow-visible">
                  {staff.jobTitle}
                </p>
                <p className="text-[10px] text-slate-400 font-medium leading-normal uppercase tracking-wider whitespace-nowrap overflow-visible">
                  {staff.department} Dept
                </p>
              </div>
            </div>

            {/* Bottom Barcode */}
            <div className="w-full flex items-center justify-center overflow-hidden">
              <BarcodeGenerator value={staff.staffCode} height={28} width={1.3} fontSize={10} displayValue={true} className="w-full" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 grid grid-cols-3 gap-2 no-print">
          <button 
            onClick={handleDownloadPNG}
            disabled={isGenerating}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Download className="w-4 h-4 text-blue-400" />}
            <span>PNG</span>
          </button>

          <button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /> : <Download className="w-4 h-4 text-emerald-400" />}
            <span>PDF</span>
          </button>

          <button 
            onClick={handlePrint}
            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
