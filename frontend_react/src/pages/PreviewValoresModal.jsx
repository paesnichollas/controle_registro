import React, { useState } from 'react';
import { previewValoresAPI } from '../lib/api.jsx';

export default function PreviewValoresModal({ open, onClose, dados }) {
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (open && dados) {
      setLoading(true);
      setErro('');
      previewValoresAPI.preview(dados)
        .then(setResultado)
        .catch(() => setErro('Erro ao obter preview de valores'))
        .finally(() => setLoading(false));
    } else {
      setResultado(null);
      setErro('');
    }
  }, [open, dados]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded p-6 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">&times;</button>
        <h2 className="text-xl font-bold mb-4">Preview de Valores</h2>
        {loading && <div>Carregando...</div>}
        {erro && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{erro}</div>}
        {resultado && (
          <div className="space-y-2">
            {Object.entries(resultado).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-1">
                <span className="font-semibold">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 