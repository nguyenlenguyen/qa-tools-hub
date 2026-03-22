import { Loader2 } from 'lucide-react';
import React from 'react';

export default function Button({ 
  children, onClick, disabled, loading, variant = 'primary', className = '', icon: Icon 
}) {
  const baseClass = "w-full py-3 px-4 font-medium rounded-xl transition-colors focus:ring-4 flex justify-center items-center gap-2 " + className;
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200 disabled:opacity-70",
    secondary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200 disabled:opacity-70",
    dark: "bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-200 disabled:opacity-70"
  };

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${baseClass} ${variants[variant] || variants.primary}`}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : Icon && <Icon size={18} />}
      {loading ? 'Processing...' : children}
    </button>
  );
}
