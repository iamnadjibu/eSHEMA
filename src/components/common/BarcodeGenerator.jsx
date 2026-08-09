import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeGenerator({ 
  value, 
  height = 70, 
  width = 2, 
  fontSize = 16, 
  displayValue = true, 
  className = '' 
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: displayValue,
          font: "monospace",
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2,
          fontSize: fontSize,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 4
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [value, height, width, fontSize, displayValue]);

  if (!value) return null;

  return (
    <div className={`bg-white rounded-lg p-1 flex items-center justify-center border border-slate-200/80 shadow-sm overflow-hidden ${className}`}>
      <svg ref={svgRef} className="max-w-full block"></svg>
    </div>
  );
}
