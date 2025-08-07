import React, { useEffect, useState } from 'react';
import { usuariosAPI } from '../lib/api.jsx';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Lock, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import LabelObrigatorio from "@/components/ui/LabelObrigatorio";
import { useNotification } from '../contexts/NotificationContext.jsx';

const schema = yup.object().shape({
  username: yup.string().required('Usuário é obrigatório'),
  email: yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
  password: yup.string().min(8, 'Mínimo 8 caracteres').required('Senha é obrigatória'),
  groups: yup.array().of(yup.string()).min(1, 'Selecione pelo menos um grupo'),
});

export default function UsuariosPage() {
  const { showSuccess, showError } = useNotification();
  const [usuarios, setUsuarios] = useState([]);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm({
    resolver: yupResolver(schema),
  });

  const selectedGroups = watch('groups') || [];

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const data = await usuariosAPI.list();
      setUsuarios(data);
    } catch (e) {
      setErro('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const onSubmit = async (formData) => {
    setErro('');
    setSucesso('');
    try {
      await usuariosAPI.create(formData);
      setSucesso('Usuário criado com sucesso!');
      showSuccess('Usuário criado com sucesso!');
      reset();
      fetchUsuarios();
    } catch (e) {
      const errorMessage = e?.response?.data?.error || 'Erro ao criar usuário';
      setErro(errorMessage);
      showError(errorMessage);
    }
  };

  const handleGroupToggle = (group) => {
    const currentGroups = selectedGroups;
    const newGroups = currentGroups.includes(group)
      ? currentGroups.filter(g => g !== group)
      : [...currentGroups, group];
    setValue('groups', newGroups);
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Usuários
        </h1>
        <p className="text-gray-400">Gerencie os usuários do sistema</p>
      </div>

      {/* Mensagens de feedback */}
      {erro && (
        <Alert className="bg-red-600/20 border-red-500/30 rounded-xl">
          <AlertDescription className="text-red-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
            {erro}
          </AlertDescription>
        </Alert>
      )}
      
      {sucesso && (
        <Alert className="bg-emerald-600/20 border-emerald-500/30 rounded-xl">
          <AlertDescription className="text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {sucesso}
          </AlertDescription>
        </Alert>
      )}

      {/* Formulário de criação */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-100">Criar Novo Usuário</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <LabelObrigatorio obrigatorio={true} htmlFor="username" className="text-gray-100 font-medium">
                  Usuário
                </LabelObrigatorio>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="username"
                    {...register('username')}
                    placeholder="Digite o nome do usuário"
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl pl-10 placeholder:text-gray-500"
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                    {errors.username?.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <LabelObrigatorio obrigatorio={true} htmlFor="email" className="text-gray-100 font-medium">
                  E-mail
                </LabelObrigatorio>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="Digite o e-mail"
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl pl-10 placeholder:text-gray-500"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                    {errors.email?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <LabelObrigatorio obrigatorio={true} htmlFor="password" className="text-gray-100 font-medium">
                Senha
              </LabelObrigatorio>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Digite a senha"
                  className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl pl-10 pr-12 placeholder:text-gray-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-slate-700/50 text-gray-400 hover:text-gray-200 transition-all duration-200 rounded-r-xl"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                  {errors.password?.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <LabelObrigatorio obrigatorio={true} className="text-gray-100 font-medium">
                Grupos
              </LabelObrigatorio>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Administrador', 'Superior', 'Qualidade', 'Básico'].map((group) => (
                  <Button
                    key={group}
                    type="button"
                    variant={selectedGroups.includes(group) ? "default" : "outline"}
                    className={`h-12 rounded-xl transition-all duration-200 ${
                      selectedGroups.includes(group)
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600'
                        : 'bg-slate-800/50 text-gray-300 border-slate-600 hover:bg-slate-700/50 hover:border-slate-500'
                    }`}
                    onClick={() => handleGroupToggle(group)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {group}
                  </Button>
                ))}
              </div>
              {errors.groups && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                  {errors.groups?.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 rounded-xl font-medium"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Criar Usuário
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-100">Lista de Usuários</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Carregando usuários...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {usuarios.map((usuario) => (
                <Card key={usuario.id} className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Users className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-200">{usuario.username}</h3>
                            <p className="text-sm text-gray-400">{usuario.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {usuario.groups?.map((group) => (
                            <Badge key={group} variant="secondary" className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary" 
                          className={usuario.is_active 
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-red-600/20 text-red-300 border-red-500/30'
                          }
                        >
                          {usuario.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {usuarios.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">Nenhum usuário encontrado</h3>
                  <p className="text-gray-500">Crie o primeiro usuário do sistema.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 