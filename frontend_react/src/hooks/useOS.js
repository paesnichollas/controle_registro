import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { osAPI, queryKeys, estatisticasAPI } from '../lib/api.jsx';
import { cacheOptimizations } from '../lib/queryClient.js';

// Hook para listar ordens de serviço
export const useOrdensServico = (params = {}) => {
  return useQuery({
    queryKey: queryKeys.ordensServico,
    queryFn: () => osAPI.list(params),
    staleTime: queryKeys.staleTime,
    gcTime: queryKeys.cacheTime,
  });
};

// Hook para buscar uma ordem de serviço específica
export const useOrdemServico = (id) => {
  return useQuery({
    queryKey: queryKeys.ordemServico(id),
    queryFn: () => osAPI.get(id),
    enabled: !!id,
    staleTime: queryKeys.staleTime,
    gcTime: queryKeys.cacheTime,
  });
};

// Hook para criar ordem de serviço
export const useCreateOrdemServico = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => osAPI.create(data),
    onSuccess: (newOS) => {
      // Invalidar TODAS as queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.ordensServico });
      queryClient.invalidateQueries({ queryKey: queryKeys.estatisticas });
      
      // Atualizar cache da lista imediatamente
      cacheOptimizations.updateOrdensServicoList(newOS);
      
      // Forçar refetch das queries
      queryClient.refetchQueries({ queryKey: queryKeys.ordensServico });
      queryClient.refetchQueries({ queryKey: queryKeys.estatisticas });
    },
    onError: (error) => {
      console.error('Erro ao criar OS:', error);
    },
  });
};

// Hook para atualizar ordem de serviço
export const useUpdateOrdemServico = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => osAPI.update(id, data),
    onSuccess: (updatedOS, { id }) => {
      // Invalidar TODAS as queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.ordemServico(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ordensServico });
      queryClient.invalidateQueries({ queryKey: queryKeys.estatisticas });
      
      // Atualizar cache da OS específica
      cacheOptimizations.updateOrdemServico(id, updatedOS);
      
      // Atualizar cache da lista
      cacheOptimizations.updateOrdensServicoList(updatedOS);
      
      // Forçar refetch das queries
      queryClient.refetchQueries({ queryKey: queryKeys.ordemServico(id) });
      queryClient.refetchQueries({ queryKey: queryKeys.ordensServico });
      queryClient.refetchQueries({ queryKey: queryKeys.estatisticas });
    },
    onError: (error) => {
      console.error('Erro ao atualizar OS:', error);
    },
  });
};

// Hook para deletar ordem de serviço
export const useDeleteOrdemServico = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => osAPI.delete(id),
    onSuccess: (_, id) => {
      // Invalidar TODAS as queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.ordemServico(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ordensServico });
      queryClient.invalidateQueries({ queryKey: queryKeys.estatisticas });
      
      // Remover do cache
      cacheOptimizations.removeOrdemServico(id);
      
      // Forçar refetch das queries
      queryClient.refetchQueries({ queryKey: queryKeys.ordensServico });
      queryClient.refetchQueries({ queryKey: queryKeys.estatisticas });
    },
    onError: (error) => {
      console.error('Erro ao deletar OS:', error);
    },
  });
};

// Hook para recalcular valores da OS
export const useRecalcularOrdemServico = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => osAPI.recalcular(id),
    onSuccess: (result, id) => {
      // Atualizar cache da OS específica com novos valores
      queryClient.setQueryData(queryKeys.ordemServico(id), (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          soma_valores: result.soma_valores,
          saldo_final: result.saldo_final,
        };
      });
    },
    onError: (error) => {
      console.error('Erro ao recalcular OS:', error);
    },
  });
};

// Hook para preview de valores
export const usePreviewValores = () => {
  return useMutation({
    mutationFn: (data) => osAPI.previewValores(data),
    onError: (error) => {
      console.error('Erro ao calcular preview:', error);
    },
  });
};

// Hook para dados de cliente
export const useDadosCliente = (nome) => {
  const { getDadosCliente } = osAPI;
  
  return useQuery({
    queryKey: queryKeys.dadosCliente(nome),
    queryFn: () => getDadosCliente(nome),
    enabled: !!nome,
    staleTime: queryKeys.staleTime,
    gcTime: queryKeys.cacheTime,
  });
};

// Hook para opções gerais
export const useOpcoes = () => {
  return useQuery({
    queryKey: queryKeys.opcoes,
    queryFn: () => osAPI.getOpcoes(),
    staleTime: 5 * 60 * 1000, // 5 minutos para opções
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para estatísticas
export const useEstatisticas = () => {
  
  return useQuery({
    queryKey: queryKeys.estatisticas,
    queryFn: () => estatisticasAPI.get(),
    staleTime: 2 * 60 * 1000, // 2 minutos para estatísticas
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hooks para dados específicos da OS (carregamento incremental)
export const useDocumentosOS = (id) => {
  return useQuery({
    queryKey: queryKeys.documentosOS(id),
    queryFn: () => osAPI.get(id).then(os => os.documentos_solicitacao || []),
    enabled: !!id,
    staleTime: queryKeys.staleTime,
    gcTime: queryKeys.cacheTime,
  });
};

export const useMateriaisOS = (id) => {
  return useQuery({
    queryKey: queryKeys.materiaisOS(id),
    queryFn: () => osAPI.get(id).then(os => os.materiais || []),
    enabled: !!id,
    staleTime: queryKeys.staleTime,
    gcTime: queryKeys.cacheTime,
  });
};

export const useLevantamentosOS = (id) => {
  return useQuery({
    queryKey: queryKeys.levantamentosOS(id),
    queryFn: () => osAPI.get(id).then(os => os.levantamentos || []),
    enabled: !!id,
    staleTime: queryKeys.staleTime,
    gcTime: queryKeys.cacheTime,
  });
};

// Hooks para opções dinâmicas
export const useAcoesSolicitacao = () => {
  return useQuery({
    queryKey: ['acoes-solicitacao'],
    queryFn: () => osAPI.getAcoesSolicitacao(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
};

export const useDemandas = () => {
  return useQuery({
    queryKey: ['demandas'],
    queryFn: () => osAPI.getDemandas(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useTiposMaterial = () => {
  return useQuery({
    queryKey: ['tipos-material'],
    queryFn: () => osAPI.getTiposMaterial(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusDMS = () => {
  return useQuery({
    queryKey: ['status-dms'],
    queryFn: () => osAPI.getStatusDMS(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusBMS = () => {
  return useQuery({
    queryKey: ['status-bms'],
    queryFn: () => osAPI.getStatusBMS(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusFRS = () => {
  return useQuery({
    queryKey: ['status-frs'],
    queryFn: () => osAPI.getStatusFRS(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusLevantamento = () => {
  return useQuery({
    queryKey: ['status-levantamento'],
    queryFn: () => osAPI.getStatusLevantamento(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusProducao = () => {
  return useQuery({
    queryKey: ['status-producao'],
    queryFn: () => osAPI.getStatusProducao(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useTiposCQ = () => {
  return useQuery({
    queryKey: ['tipos-cq'],
    queryFn: () => osAPI.getTiposCQ(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useNiveisCQ = () => {
  return useQuery({
    queryKey: ['niveis-cq'],
    queryFn: () => osAPI.getNiveisCQ(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useEnsaiosCQ = () => {
  return useQuery({
    queryKey: ['ensaios-cq'],
    queryFn: () => osAPI.getEnsaiosCQ(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const usePercentuaisCQ = () => {
  return useQuery({
    queryKey: ['percentuais-cq'],
    queryFn: () => osAPI.getPercentuaisCQ(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useResponsaveisMaterial = () => {
  return useQuery({
    queryKey: ['responsaveis-material'],
    queryFn: () => osAPI.getResponsaveisMaterial(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusOS = () => {
  return useQuery({
    queryKey: ['status-os'],
    queryFn: () => osAPI.getStatusOS(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusOSManual = () => {
  return useQuery({
    queryKey: ['status-os-manual'],
    queryFn: () => osAPI.getStatusOSManual(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusOSEletronica = () => {
  return useQuery({
    queryKey: ['status-os-eletronica'],
    queryFn: () => osAPI.getStatusOSEletronica(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useRegimesOS = () => {
  return useQuery({
    queryKey: ['regimes-os'],
    queryFn: () => osAPI.getRegimesOS(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useStatusMaterial = () => {
  return useQuery({
    queryKey: ['status-material'],
    queryFn: () => osAPI.getStatusMaterial(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useTiposDocumentoSolicitacao = () => {
  return useQuery({
    queryKey: ['tipos-documento-solicitacao'],
    queryFn: () => osAPI.getTiposDocumentoSolicitacao(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}; 