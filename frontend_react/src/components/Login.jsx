import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Lock, User, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import LabelObrigatorio from "@/components/ui/LabelObrigatorio";

const schema = yup.object({
  username: yup.string().required('Usuário é obrigatório'),
  password: yup.string().required('Senha é obrigatória'),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await login(data.username, data.password);
      
      if (!result.success) {
        setError(result.error);
        showError(result.error);
      } else {
        showSuccess('Login realizado com sucesso!');
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = 'Não foi possível realizar o login. Tente novamente em instantes ou entre em contato com o suporte.';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Controle de Registros
          </h1>
          <p className="text-gray-400 text-lg"></p>
        </div>

        {/* Login Card */}
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-slate-600/50 shadow-2xl backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-100">
                Acesso ao Sistema
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <LabelObrigatorio obrigatorio={false} htmlFor="username" className="text-gray-100 font-medium">
                  Usuário
                </LabelObrigatorio>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl pl-10 placeholder:text-gray-500"
                    {...register('username')}
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
                <LabelObrigatorio obrigatorio={false} htmlFor="password" className="text-gray-100 font-medium">
                  Senha
                </LabelObrigatorio>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    className="bg-slate-800/50 text-white border-slate-600 hover:border-slate-500 focus:border-cyan-500 transition-all duration-300 h-12 rounded-xl pl-10 pr-12 placeholder:text-gray-500"
                    {...register('password')}
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

              {error && (
                <Alert className="bg-red-600/20 border-red-500/30 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300 flex items-center gap-2">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 rounded-xl font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Entrar
                  </>
                )}
              </Button>

              {/* Link para Cadastro */}
              <div className="text-center pt-4 border-t border-slate-600/50">
                <p className="text-gray-400 text-sm">
                  Não tem uma conta?{' '}
                  <Link 
                    to="/cadastro" 
                    className="text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    Criar conta
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            © 2025 Sistema de Controle de Registros
          </p>
        </div>
      </div>
    </div>
  );
}

