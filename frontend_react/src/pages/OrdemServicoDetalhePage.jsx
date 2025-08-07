import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useOrdemServico, useDocumentosOS, useMateriaisOS, useLevantamentosOS } from '../hooks/useOS.js';
import BackToTopButton from '@/components/ui/BackToTopButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const tabs = [
  { key: 'documentos', label: 'Documentos' },
  { key: 'materiais', label: 'Materiais' },
  { key: 'levantamentos', label: 'Levantamentos' },
];

export default function OrdemServicoDetalhePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('documentos');
  
  // Hook principal para dados da OS
  const { 
    data: os, 
    isLoading: isLoadingOS, 
    error: errorOS 
  } = useOrdemServico(id);
  
  // Hooks para dados específicos (carregamento incremental)
  const { 
    data: documentos = [], 
    isLoading: isLoadingDocumentos, 
    error: errorDocumentos 
  } = useDocumentosOS(activeTab === 'documentos' ? id : null);
  
  const { 
    data: materiais = [], 
    isLoading: isLoadingMateriais, 
    error: errorMateriais 
  } = useMateriaisOS(activeTab === 'materiais' ? id : null);
  
  const { 
    data: levantamentos = [], 
    isLoading: isLoadingLevantamentos, 
    error: errorLevantamentos 
  } = useLevantamentosOS(activeTab === 'levantamentos' ? id : null);

  // Determinar loading e erro para a aba ativa
  const getTabLoading = () => {
    switch (activeTab) {
      case 'documentos':
        return isLoadingDocumentos;
      case 'materiais':
        return isLoadingMateriais;
      case 'levantamentos':
        return isLoadingLevantamentos;
      default:
        return false;
    }
  };

  const getTabError = () => {
    switch (activeTab) {
      case 'documentos':
        return errorDocumentos;
      case 'materiais':
        return errorMateriais;
      case 'levantamentos':
        return errorLevantamentos;
      default:
        return null;
    }
  };

  if (isLoadingOS) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (errorOS) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-100 text-red-700 p-4 rounded">
          Erro ao carregar dados da OS: {errorOS.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Detalhes da Ordem de Serviço #{os?.numero_os || id}
      </h1>
      
      {/* Informações básicas da OS */}
      {os && (
        <div className="bg-slate-800 p-4 rounded mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
            <div>
              <strong>Cliente:</strong> {os.nome_cliente_nome || 'N/A'}
            </div>
            <div>
              <strong>Status:</strong> {os.status_os_nome || 'N/A'}
            </div>
            <div>
              <strong>Descrição:</strong> {os.descricao_resumida || 'N/A'}
            </div>
            <div>
              <strong>Valor Total:</strong> R$ {os.valor_total?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      )}
      
      {/* Abas */}
      <div className="flex space-x-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-t transition-colors ${
              activeTab === t.key 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      
      {/* Conteúdo da aba */}
      <div className="bg-slate-800 p-4 rounded shadow">
        {getTabError() && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">
            Erro ao carregar {activeTab}: {getTabError().message}
          </div>
        )}
        
        {getTabLoading() ? (
          <div className="flex justify-center items-center h-32">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {activeTab === 'documentos' && (
              <TabelaDocumentos documentos={documentos} />
            )}
            {activeTab === 'materiais' && (
              <TabelaMateriais materiais={materiais} />
            )}
            {activeTab === 'levantamentos' && (
              <TabelaLevantamentos levantamentos={levantamentos} />
            )}
          </>
        )}
      </div>

      {/* Botão Voltar ao Topo */}
      <BackToTopButton />
    </div>
  );
}

function TabelaDocumentos({ documentos }) {
  if (!documentos.length) {
    return (
      <div className="text-white text-center py-8">
        Nenhum documento encontrado.
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-white">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="p-2 text-left">Tipo</th>
            <th className="p-2 text-left">Documento</th>
            <th className="p-2 text-left">Data</th>
          </tr>
        </thead>
        <tbody>
          {documentos.map((doc) => (
            <tr key={doc.id} className="border-b border-slate-700 hover:bg-slate-700">
              <td className="p-2">{doc.tipo_documento_solicitacao?.nome || 'N/A'}</td>
              <td className="p-2">
                {doc.documento_solicitacao ? (
                  <a 
                    href={doc.documento_solicitacao} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Ver documento
                  </a>
                ) : (
                  'N/A'
                )}
              </td>
              <td className="p-2">
                {doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaMateriais({ materiais }) {
  if (!materiais.length) {
    return (
      <div className="text-white text-center py-8">
        Nenhum material encontrado.
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-white">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="p-2 text-left">Tipo</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Responsável</th>
          </tr>
        </thead>
        <tbody>
          {materiais.map((material) => (
            <tr key={material.id} className="border-b border-slate-700 hover:bg-slate-700">
              <td className="p-2">{material.tipo_material?.nome || 'N/A'}</td>
              <td className="p-2">{material.status_material?.nome || 'N/A'}</td>
              <td className="p-2">{material.responsavel_material?.nome || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaLevantamentos({ levantamentos }) {
  if (!levantamentos.length) {
    return (
      <div className="text-white text-center py-8">
        Nenhum levantamento encontrado.
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-white">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="p-2 text-left">Data</th>
            <th className="p-2 text-left">Descrição</th>
            <th className="p-2 text-left">Anexo</th>
          </tr>
        </thead>
        <tbody>
          {levantamentos.map((levantamento) => (
            <tr key={levantamento.id} className="border-b border-slate-700 hover:bg-slate-700">
              <td className="p-2">
                {levantamento.data_levantamento 
                  ? new Date(levantamento.data_levantamento).toLocaleDateString('pt-BR')
                  : 'N/A'
                }
              </td>
              <td className="p-2">{levantamento.descricao_levantamento || 'N/A'}</td>
              <td className="p-2">
                {levantamento.arquivo_anexo_levantamento ? (
                  <a 
                    href={levantamento.arquivo_anexo_levantamento} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Ver anexo
                  </a>
                ) : (
                  'N/A'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 