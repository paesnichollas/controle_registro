import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Settings, UserPlus, Shield, UserCheck, UserX, Trash2 } from 'lucide-react';
import { authAPI } from '../lib/api.jsx';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth.jsx';

export default function ConfiguracoesPage() {
  const { hasGroup } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [usuariosResponse, gruposResponse] = await Promise.all([
        authAPI.getUsuarios(),
        authAPI.getGroups()
      ]);
      
      // Verificar se as respostas são válidas
      if (Array.isArray(usuariosResponse)) {
        setUsuarios(usuariosResponse);
      } else {
        console.error('Resposta inválida de usuários:', usuariosResponse);
        setUsuarios([]);
      }
      
      if (Array.isArray(gruposResponse)) {
        setGrupos(gruposResponse);
      } else {
        console.error('Resposta inválida de grupos:', gruposResponse);
        setGrupos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para acessar configurações');
      } else {
        toast.error('Erro ao carregar dados. Tente novamente.');
      }
      setUsuarios([]);
      setGrupos([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogGrupos = (usuario) => {
    setSelectedUser(usuario);
    setSelectedGroups(usuario.groups.map(g => g.id));
    setDialogOpen(true);
  };

  const salvarGrupos = async () => {
    if (!selectedUser) return;

    try {
      const response = await authAPI.alterarGrupoUsuario({
        user_id: selectedUser.id,
        group_ids: selectedGroups
      });

      if (response && response.message) {
        toast.success(response.message);
      } else {
        toast.success('Grupos alterados com sucesso!');
      }
      
      setDialogOpen(false);
      carregarDados(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao alterar grupos:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para alterar grupos');
      } else if (error.response?.status === 404) {
        toast.error('Usuário não encontrado');
      } else {
        toast.error('Erro ao alterar grupos. Tente novamente.');
      }
    }
  };

  const alterarStatusUsuario = async (userId, isActive) => {
    try {
      const response = await authAPI.ativarUsuario({
        user_id: userId,
        is_active: isActive
      });

      if (response && response.message) {
        toast.success(response.message);
      } else {
        toast.success(`Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso!`);
      }
      
      carregarDados(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para alterar status de usuários');
      } else if (error.response?.status === 404) {
        toast.error('Usuário não encontrado');
      } else {
        toast.error('Erro ao alterar status do usuário. Tente novamente.');
      }
    }
  };

  const excluirUsuario = async (userId, username) => {
    // Verificar se usuário é administrador para exclusão
    if (!hasGroup('Administrador')) {
      toast.error('Apenas administradores podem excluir usuários.');
      return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const response = await authAPI.excluirUsuario({
        user_id: userId
      });

      if (response && response.message) {
        toast.success(response.message);
      } else {
        toast.success('Usuário excluído com sucesso!');
      }
      
      carregarDados(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para excluir usuários');
      } else if (error.response?.status === 404) {
        toast.error('Usuário não encontrado');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data?.error || 'Erro ao excluir usuário');
      } else {
        toast.error('Erro ao excluir usuário. Tente novamente.');
      }
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge className="bg-green-600 text-white">
        <UserCheck className="w-3 h-3 mr-1" />
        Ativo
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-600 text-white">
        <UserX className="w-3 h-3 mr-1" />
        Inativo
      </Badge>
    );
  };

  const getGruposDisplay = (userGroups) => {
    if (!userGroups || userGroups.length === 0) {
      return <span className="text-gray-400">Nenhum grupo</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {userGroups.map((group) => (
          <Badge key={group.id} variant="outline" className="text-xs">
            {group.name}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400 mt-2">Gerencie usuários e permissões do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Administrador</p>
            <p className="text-white font-medium">Controle Total</p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total de Usuários</p>
                <p className="text-2xl font-bold text-white">{usuarios.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Usuários Ativos</p>
                <p className="text-2xl font-bold text-white">
                  {usuarios.filter(u => u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <UserX className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Usuários Inativos</p>
                <p className="text-2xl font-bold text-white">
                  {usuarios.filter(u => !u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Grupos Disponíveis</p>
                <p className="text-2xl font-bold text-white">{grupos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Usuários */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gerenciar Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="rounded-md border border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-white">Usuário</TableHead>
                    <TableHead className="text-white">Nome</TableHead>
                    <TableHead className="text-white">Email</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Grupos</TableHead>
                    <TableHead className="text-white">Data Cadastro</TableHead>
                    <TableHead className="text-white">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="text-white font-medium">
                        {usuario.username}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {usuario.first_name && usuario.last_name 
                          ? `${usuario.first_name} ${usuario.last_name}`
                          : usuario.first_name || usuario.last_name || '-'
                        }
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {usuario.email}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(usuario.is_active)}
                      </TableCell>
                      <TableCell>
                        {getGruposDisplay(usuario.groups)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(usuario.date_joined).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => abrirDialogGrupos(usuario)}
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-white hover:bg-slate-700"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Grupos
                          </Button>
                          <Button
                            onClick={() => alterarStatusUsuario(usuario.id, !usuario.is_active)}
                            size="sm"
                            variant={usuario.is_active ? "destructive" : "default"}
                            className={usuario.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                          >
                            {usuario.is_active ? (
                              <>
                                <UserX className="w-3 h-3 mr-1" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Ativar
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => excluirUsuario(usuario.id, usuario.username)}
                            size="sm"
                            variant="destructive"
                            className="bg-red-800 hover:bg-red-900"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para alterar grupos */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Alterar Grupos - {selectedUser?.username}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Selecione os grupos que deseja atribuir ao usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Selecione os grupos:</Label>
              <div className="mt-2 space-y-2">
                {grupos.map((grupo) => (
                  <div key={grupo.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`grupo-${grupo.id}`}
                      checked={selectedGroups.includes(grupo.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGroups([...selectedGroups, grupo.id]);
                        } else {
                          setSelectedGroups(selectedGroups.filter(id => id !== grupo.id));
                        }
                      }}
                    />
                    <Label htmlFor={`grupo-${grupo.id}`} className="text-white">
                      {grupo.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setDialogOpen(false)}
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button onClick={salvarGrupos} className="bg-blue-600 hover:bg-blue-700">
                Salvar Grupos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 