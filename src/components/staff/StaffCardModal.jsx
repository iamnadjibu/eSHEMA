import React, { useRef } from 'react';
import { X, Download, Printer, Shield, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import BarcodeGenerator from '../common/BarcodeGenerator';
import InitialsAvatar from '../common/InitialsAvatar';

export default function StaffCardModal({ staff, isOpen, onClose, onRegenerateCode }) {
  const cardRef = useRef(null);

  if (!isOpen || !staff) return null;

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { 
        scale: 4, 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#020617',
        logging: false
      });
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = image;
      link.download = `KSP_Staff_Card_${staff.staffCode}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to generate PNG card:", err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { 
        scale: 4, 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#020617',
        logging: false
      });
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98] // CR80 standard credit card size (mm)
      });
      pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);
      pdf.save(`KSP_Staff_Card_${staff.staffCode}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF card:", err);
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
            className="printable-area w-[340px] h-[215px] bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-2 border-slate-700/80 rounded-2xl p-4 shadow-2xl flex flex-col justify-between relative overflow-hidden text-white"
          >
            {/* Background branding subtle lines */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            {/* Top Card Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shadow-md">
                  KSP
                </div>
                <div>
                  <h4 className="font-extrabold text-xs tracking-wider uppercase text-white leading-tight">KSP ENTERPRISE</h4>
                  <p className="text-[9px] text-blue-400 font-medium tracking-tight">STAFF IDENTIFICATION CARD</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {staff.branch}
              </span>
            </div>

            {/* Middle Profile info */}
            <div className="flex items-center gap-3 my-1">
              <InitialsAvatar 
                photoUrl={staff.photoUrl}
                firstName={staff.firstName}
                lastName={staff.lastName}
                size="lg"
                className="w-16 h-16 border border-white/20 shadow-md"
              />
              <div className="space-y-0.5 overflow-hidden">
                <h3 className="font-extrabold text-sm text-white truncate leading-tight">
                  {staff.firstName} {staff.lastName}
                </h3>
                <p className="text-xs text-blue-300 font-medium truncate capitalize">{staff.jobTitle}</p>
                <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">{staff.department} Dept</p>
              </div>
            </div>

            {/* Bottom Barcode */}
            <div className="bg-white/95 rounded-lg p-1 text-center shadow-inner flex flex-col items-center justify-center">
              <BarcodeGenerator value={staff.staffCode} height={32} width={1.4} fontSize={11} displayValue={true} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 grid grid-cols-3 gap-2 no-print">
          <button 
            onClick={handleDownloadPNG}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>PNG</span>
          </button>

          <button 
            onClick={handleDownloadPDF}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <Download className="w-4 h-4 text-emerald-400" />
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
