import React, { useEffect, useState } from 'react';
import { estatisticasAPI } from '../lib/api.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, Users, Package, Activity } from 'lucide-react';

const COLORS = ['#2563eb', '#22d3ee', '#f59e42', '#f43f5e', '#a3e635', '#fbbf24', '#6366f1', '#eab308'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    estatisticasAPI.get()
      .then(setStats)
      .catch(() => setErro('Erro ao carregar estatísticas'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-red-900/20 to-red-800/10 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-red-400 mb-2">Erro ao Carregar</h3>
              <p className="text-gray-300">{erro}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400">Visualize as estatísticas e métricas do sistema</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total de OS</p>
                <p className="text-2xl font-bold text-blue-400">
                  {(stats.os_por_status || []).reduce((acc, item) => acc + item.total, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Clientes Ativos</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {(stats.os_por_cliente || []).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Package className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Materiais Únicos</p>
                <p className="text-2xl font-bold text-orange-400">
                  {(stats.materiais_mais_usados || []).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-100">OS por Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.os_por_status || []}>
                <XAxis 
                  dataKey="status" 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Bar 
                  dataKey="total" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-100">OS por Cliente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={stats.os_por_cliente || []} 
                  dataKey="total" 
                  nameKey="cliente" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100}
                  label={({ cliente, total }) => `${cliente}: ${total}`}
                  labelLine={false}
                >
                  {(stats.os_por_cliente || []).map((entry, idx) => (
                    <Cell 
                      key={`cell-${idx}`} 
                      fill={COLORS[idx % COLORS.length]}
                      stroke="#1e293b"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Materiais */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-100">Materiais Mais Usados</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.materiais_mais_usados || []}>
              <XAxis 
                dataKey="material" 
                stroke="#94a3b8" 
                fontSize={12}
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={12}
                tick={{ fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f1f5f9'
                }}
              />
              <Bar 
                dataKey="total" 
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
} 