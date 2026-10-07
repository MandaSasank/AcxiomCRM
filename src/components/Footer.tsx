import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">AcxiomCRM Enterprise</span>
          <span>•</span>
          <span>Role-Based Sales & Pipeline Management</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Security & Audit Active
          </span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Compliant with Technical Specification Baseline • v2.4.0
        </div>
      </div>
    </footer>
  );
};
