import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Mail, Lock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '../lib/api.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { Link } from 'react-router-dom';

export default function CadastroPage() {
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpar erro do campo quando usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Nome de usuário é obrigatório';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await authAPI.cadastro({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name
      });

      setSuccess(true);
      showSuccess('Cadastro realizado com sucesso!');
    } catch (error) {
      console.error('Erro no cadastro:', error);
      const errorMessage = error.response?.data?.error || 'Erro ao realizar cadastro';
      showError(errorMessage);
      
      // Mostrar erros específicos do backend
      if (error.response?.data?.error) {
        if (error.response.data.error.includes('Username')) {
          setErrors(prev => ({ ...prev, username: 'Nome de usuário já existe' }));
        } else if (error.response.data.error.includes('Email')) {
          setErrors(prev => ({ ...prev, email: 'Email já existe' }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Cadastro Realizado!</h2>
              <p className="text-gray-300">
                Seu cadastro foi realizado com sucesso. Aguarde a aprovação de um administrador para acessar o sistema.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="text-blue-400 font-semibold mb-2">Próximos Passos:</h3>
                <ul className="text-sm text-gray-300 space-y-1 text-left">
                  <li>• Um administrador será notificado do seu cadastro</li>
                  <li>• Sua conta será ativada e vinculada a um grupo</li>
                  <li>• Você receberá acesso ao sistema</li>
                </ul>
              </div>
              <Button
                asChild
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Link to="/login">
                  Ir para o Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Criar Conta</CardTitle>
          <p className="text-gray-400">Preencha os dados para se cadastrar no sistema</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome e Sobrenome */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" className="text-white">Nome *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`bg-slate-700 border-slate-600 text-white mt-1 ${
                    errors.first_name ? 'border-red-500' : ''
                  }`}
                  placeholder="Seu nome"
                />
                {errors.first_name && (
                  <p className="text-red-400 text-sm mt-1">{errors.first_name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="last_name" className="text-white">Sobrenome</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-white">Nome de Usuário *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={`bg-slate-700 border-slate-600 text-white mt-1 ${
                  errors.username ? 'border-red-500' : ''
                }`}
                placeholder="Escolha um nome de usuário"
              />
              {errors.username && (
                <p className="text-red-400 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-white">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`bg-slate-700 border-slate-600 text-white mt-1 ${
                  errors.email ? 'border-red-500' : ''
                }`}
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Senha */}
            <div>
              <Label htmlFor="password" className="text-white">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`bg-slate-700 border-slate-600 text-white mt-1 ${
                  errors.password ? 'border-red-500' : ''
                }`}
                placeholder="Mínimo 8 caracteres"
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirmar Senha */}
            <div>
              <Label htmlFor="confirmPassword" className="text-white">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`bg-slate-700 border-slate-600 text-white mt-1 ${
                  errors.confirmPassword ? 'border-red-500' : ''
                }`}
                placeholder="Confirme sua senha"
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Alert sobre aprovação */}
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                Após o cadastro, sua conta ficará pendente até ser aprovada por um administrador.
              </AlertDescription>
            </Alert>

            {/* Botão de Cadastro */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar Conta
                </>
              )}
            </Button>

            {/* Link para Login */}
            <div className="text-center">
              <p className="text-gray-400">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 underline">
                  Faça login
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 