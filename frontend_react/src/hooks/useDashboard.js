import { useState, useEffect, useCallback } from 'react';
import { estatisticasAPI } from '../lib/api.jsx';

export const useDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    total_os: 0,
    os_abertas: 0,
    os_em_andamento: 0,
    os_concluidas: 0,
    os_canceladas: 0,
    atividades_recentes: [],
    grafico_os_por_mes: [],
    grafico_valores_por_mes: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Função para carregar dados do dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await estatisticasAPI.get();
      setDashboardData(data);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para atualizar dados manualmente
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  // Carregar dados iniciais
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Atualizar dados automaticamente a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  return {
    dashboardData,
    loading,
    refreshing,
    error,
    refreshData,
    loadDashboardData
  };
}; 