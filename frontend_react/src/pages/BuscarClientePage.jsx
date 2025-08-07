import React, { useState } from 'react';
import { clienteAPI } from '../lib/api.jsx';

export default function BuscarClientePage() {
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const buscar = async (e) => {
    e.preventDefault();
    setErro('');
    setCliente(null);
    setLoading(true);
    try {
      const data = await clienteAPI.getByName(nome);
      setCliente(data);
    } catch (e) {
      setErro('Cliente não encontrado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Buscar Cliente</h1>
      <form onSubmit={buscar} className="mb-4 flex gap-2">
        <input
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Digite o nome do cliente"
          className="flex-1 p-2 rounded bg-slate-700 text-white"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Buscar</button>
      </form>
      {loading && <div className="text-white">Carregando...</div>}
      {erro && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{erro}</div>}
      {cliente && (
        <div className="bg-slate-800 p-4 rounded text-white">
          <div><b>Nome:</b> {cliente.nome}</div>
          <div><b>Email:</b> {cliente.email}</div>
          <div><b>Telefone:</b> {cliente.telefone}</div>
          {/* Adicione outros campos conforme necessário */}
        </div>
      )}
    </div>
  );
} 