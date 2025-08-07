import React from 'react';

/**
 * Componente wrapper estilizado para agrupar cada bloco de campos com aparência moderna
 * @param {Object} props
 * @param {string} props.title - Título do bloco
 * @param {React.ReactNode} props.children - Conteúdo do bloco
 * @param {string} props.className - Classes CSS adicionais
 */
export default function BlocoFormulario({ title, children, className = "" }) {
  return (
    <div className={`bg-[#2a2b30] rounded-2xl shadow-sm border border-slate-700 p-6 mb-8 ${className}`}>
      {title && (
        <h3 className="text-cyan-600 text-lg font-bold mb-4 border-b border-slate-700 pb-2">
          {title}
        </h3>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

