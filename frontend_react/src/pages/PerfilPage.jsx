import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Shield, Calendar, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { authAPI } from '../lib/api.jsx';
import { toast } from 'sonner';

export default function PerfilPage() {
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(false);
  const [dadosPerfil, setDadosPerfil] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      setDadosPerfil({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setDadosPerfil(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const salvarPerfil = async () => {
    setLoading(true);
    try {
      const response = await authAPI.atualizarPerfil(dadosPerfil);
      
      if (response && response.message) {
        toast.success(response.message);
      } else {
        toast.success('Perfil atualizado com sucesso!');
      }
      
      setEditando(false);
      // Recarregar dados do usuário
      await checkAuth();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || 'Dados inválidos';
        toast.error(errorMessage);
      } else if (error.response?.status === 403) {
        toast.error('Você não tem permissão para atualizar o perfil');
      } else {
        toast.error('Erro ao atualizar perfil. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelarEdicao = () => {
    setDadosPerfil({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || ''
    });
    setEditando(false);
  };

  const getIniciais = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  const getNomeCompleto = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) {
      return user.first_name;
    }
    return user?.username || 'Usuário';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
          <p className="text-gray-400 mt-2">Gerencie suas informações pessoais</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Usuário</p>
            <p className="text-white font-medium">{getNomeCompleto()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Perfil */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações Pessoais
                </span>
                {!editando ? (
                  <Button
                    onClick={() => setEditando(true)}
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={salvarPerfil}
                      size="sm"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button
                      onClick={cancelarEdicao}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-white">Nome</Label>
                  {editando ? (
                    <Input
                      id="first_name"
                      value={dadosPerfil.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  ) : (
                    <p className="text-gray-300 mt-1">{user.first_name || '-'}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-white">Sobrenome</Label>
                  {editando ? (
                    <Input
                      id="last_name"
                      value={dadosPerfil.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  ) : (
                    <p className="text-gray-300 mt-1">{user.last_name || '-'}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                {editando ? (
                  <Input
                    id="email"
                    type="email"
                    value={dadosPerfil.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                ) : (
                  <p className="text-gray-300 mt-1">{user.email || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-white">Nome de Usuário</Label>
                <p className="text-gray-300 mt-1">{user.username}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informações da Conta */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Status da Conta</Label>
                  <div className="mt-1">
                    <Badge className={user.is_active ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-white">Data de Cadastro</Label>
                  <p className="text-gray-300 mt-1">
                    {new Date(user.date_joined).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-white">Grupos</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.groups && user.groups.length > 0 ? (
                    user.groups.map((group, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {typeof group === 'string' ? group : group.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-400">Nenhum grupo atribuído</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Avatar e Nome */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {getIniciais()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{getNomeCompleto()}</h3>
                  <p className="text-gray-400 text-sm">@{user.username}</p>
                </div>
                <Separator className="bg-slate-600" />
                <div className="space-y-2 w-full">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      Desde {new Date(user.date_joined).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-700"
                onClick={() => window.location.href = '/perfil/alterar-senha'}
              >
                <Shield className="w-4 h-4 mr-2" />
                Alterar Senha
              </Button>
              <Button
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-700"
                onClick={() => window.location.href = '/dashboard'}
              >
                <User className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 