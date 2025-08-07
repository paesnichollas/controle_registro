import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Filter, Search, Calendar, User, DollarSign, FileText } from 'lucide-react';
import { authAPI } from '../lib/api.jsx';
import { toast } from 'sonner';
import BackToTopButton from '@/components/ui/BackToTopButton';

export default function RelatoriosPage() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  
  // Estado para registros selecionados
  const [registrosSelecionados, setRegistrosSelecionados] = useState(new Set());
  
  // Filtros
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    cliente: '',
    status_os: ''
  });

  useEffect(() => {
    carregarRegistros();
  }, [page, filtros]);

  // Limpar seleções quando mudar de página ou filtros
  useEffect(() => {
    setRegistrosSelecionados(new Set());
  }, [page, filtros]);

  const carregarRegistros = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...filtros
      });

      const response = await authAPI.get(`relatorios/registros/?${params}`);
      
      // Verificar se a resposta tem a estrutura esperada
      if (response && typeof response === 'object') {
        setRegistros(response.registros || []);
        setTotal(response.total || 0);
        setTotalPages(response.total_pages || 0);
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para acessar relatórios');
      } else if (error.response?.status === 404) {
        toast.error('Endpoint de relatórios não encontrado');
      } else {
        toast.error('Erro ao carregar relatórios. Tente novamente.');
      }
      setRegistros([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Funções para gerenciar seleção
  const toggleSelecaoRegistro = (registroId) => {
    setRegistrosSelecionados(prev => {
      const novoSet = new Set(prev);
      if (novoSet.has(registroId)) {
        novoSet.delete(registroId);
      } else {
        novoSet.add(registroId);
      }
      return novoSet;
    });
  };

  const toggleSelecaoTodos = () => {
    if (registrosSelecionados.size === registros.length) {
      // Se todos estão selecionados, desselecionar todos
      setRegistrosSelecionados(new Set());
    } else {
      // Selecionar todos
      setRegistrosSelecionados(new Set(registros.map(reg => reg.id)));
    }
  };

  const exportarExcel = async () => {
    try {
      // Validar se há filtros aplicados ou registros selecionados
      const temFiltros = Object.values(filtros).some(valor => valor !== '');
      const temRegistrosSelecionados = registrosSelecionados.size > 0;
      
      if (!temFiltros && !temRegistrosSelecionados) {
        toast.error('Aplique filtros ou selecione registros antes de exportar');
        return;
      }

      // Mostrar loading
      toast.loading('Gerando relatório Excel...', { id: 'excel-export' });
      
      const params = new URLSearchParams(filtros);
      
      // Adicionar IDs dos registros selecionados se houver
      if (registrosSelecionados.size > 0) {
        Array.from(registrosSelecionados).forEach(id => {
          params.append('registros_selecionados', id);
        });
      }

      const response = await authAPI.get(`relatorios/exportar-excel/?${params}`, {
        responseType: 'blob'
      });

      // Verificar se a resposta é um blob válido
      if (!response || !(response instanceof Blob)) {
        throw new Error('Resposta inválida do servidor');
      }

      // Verificar se o blob não está vazio
      if (response.size === 0) {
        throw new Error('Arquivo gerado está vazio');
      }

      // Criar link para download
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_os_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Relatório Excel exportado com sucesso!', { id: 'excel-export' });
    } catch (error) {
      console.error('Erro ao exportar relatório Excel:', error);
      
      // Dismiss loading toast
      toast.dismiss('excel-export');
      
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para exportar relatórios');
      } else if (error.response?.status === 400) {
        // Tentar extrair mensagem de erro do backend
        try {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          toast.error(errorData.error || 'Parâmetros inválidos para exportação');
        } catch {
          toast.error('Parâmetros inválidos para exportação');
        }
      } else if (error.response?.status === 404) {
        toast.error('Nenhum registro encontrado com os filtros aplicados');
      } else if (error.response?.status === 500) {
        toast.error('Erro interno no servidor. Tente novamente ou entre em contato com o suporte.');
      } else {
        toast.error('Erro ao exportar relatório Excel. Tente novamente.');
      }
    }
  };

  const exportarPDF = async () => {
    try {
      const params = new URLSearchParams(filtros);
      
      // Adicionar IDs dos registros selecionados se houver
      if (registrosSelecionados.size > 0) {
        Array.from(registrosSelecionados).forEach(id => {
          params.append('registros_selecionados', id);
        });
      }

      const response = await authAPI.get(`relatorios/exportar-pdf/?${params}`, {
        responseType: 'blob'
      });

      // Verificar se a resposta é um blob válido
      if (!response || !(response instanceof Blob)) {
        throw new Error('Resposta inválida do servidor');
      }

      // Criar link para download
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_os_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório PDF:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para exportar relatórios');
      } else {
        toast.error('Erro ao exportar relatório PDF. Tente novamente.');
      }
    }
  };

  const aplicarFiltros = () => {
    setPage(1);
    carregarRegistros();
  };

  const limparFiltros = () => {
    setFiltros({
      data_inicio: '',
      data_fim: '',
      cliente: '',
      status_os: ''
    });
    setPage(1);
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Verificar se todos os registros estão selecionados
  const todosSelecionados = registros.length > 0 && registrosSelecionados.size === registros.length;
  const algunsSelecionados = registrosSelecionados.size > 0 && registrosSelecionados.size < registros.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-gray-400 mt-2">Visualize e exporte relatórios do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={exportarExcel} 
            className="bg-green-600 hover:bg-green-700"
            disabled={total === 0 || loading}
            title={total === 0 ? "Não há dados para exportar" : "Exportar relatório em Excel"}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button 
            onClick={exportarPDF} 
            className="bg-red-600 hover:bg-red-700"
            disabled={total === 0 || loading}
            title={total === 0 ? "Não há dados para exportar" : "Exportar relatório em PDF"}
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="data_inicio" className="text-white">Data Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, data_inicio: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="data_fim" className="text-white">Data Fim</Label>
              <Input
                id="data_fim"
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros(prev => ({ ...prev, data_fim: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="cliente" className="text-white">Cliente</Label>
              <Input
                id="cliente"
                placeholder="Buscar por cliente..."
                value={filtros.cliente}
                onChange={(e) => setFiltros(prev => ({ ...prev, cliente: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="status" className="text-white">Status</Label>
              <Input
                id="status"
                placeholder="Buscar por status..."
                value={filtros.status_os}
                onChange={(e) => setFiltros(prev => ({ ...prev, status_os: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={aplicarFiltros} className="bg-blue-600 hover:bg-blue-700">
              <Search className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button onClick={limparFiltros} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total de Registros</p>
                <p className="text-2xl font-bold text-white">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Valor Total</p>
                <p className="text-2xl font-bold text-white">
                  {formatarValor(registros.reduce((sum, reg) => sum + reg.valor_total, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Usuários Únicos</p>
                <p className="text-2xl font-bold text-white">
                  {new Set(registros.map(reg => reg.usuario_criacao)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Página Atual</p>
                <p className="text-2xl font-bold text-white">{page} de {totalPages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Registros */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Registros do Sistema</CardTitle>
            {registrosSelecionados.size > 0 && (
              <div className="text-sm text-gray-400">
                {registrosSelecionados.size} registro(s) selecionado(s)
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-700/50">
                      <TableHead className="text-white w-12">
                        <Checkbox
                          checked={todosSelecionados}
                          indeterminate={algunsSelecionados}
                          onCheckedChange={toggleSelecaoTodos}
                          className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </TableHead>
                      <TableHead className="text-white">Número OS</TableHead>
                      <TableHead className="text-white">Data Solicitação</TableHead>
                      <TableHead className="text-white">Cliente</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Descrição</TableHead>
                      <TableHead className="text-white">Usuário</TableHead>
                      <TableHead className="text-white">Valor Total</TableHead>
                      <TableHead className="text-white">Data Criação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registros.map((registro) => (
                      <TableRow key={registro.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="text-white">
                          <Checkbox
                            checked={registrosSelecionados.has(registro.id)}
                            onCheckedChange={() => toggleSelecaoRegistro(registro.id)}
                            className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          #{registro.numero_os}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {registro.data_solicitacao}
                        </TableCell>
                        <TableCell className="text-white">
                          {registro.cliente}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-600 text-white">
                            {registro.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300 max-w-xs truncate">
                          {registro.descricao}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {registro.usuario_criacao}
                        </TableCell>
                        <TableCell className="text-green-400 font-medium">
                          {formatarValor(registro.valor_total)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {registro.created_at}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-400">
                    Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} registros
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      variant="outline"
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-3 py-2 text-white">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      variant="outline"
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Botão Voltar ao Topo */}
      <BackToTopButton />
    </div>
  );
} 