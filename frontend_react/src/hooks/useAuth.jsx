import { useState, useEffect, createContext, useContext } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '../lib/api.jsx';
import { toast } from 'sonner';
import { translateLoginError } from '../lib/errorTranslator.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('access_token');
      if (token) {
        if (window?.axios) {
          window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        const profile = await authAPI.getProfile(token); // <- aqui
        setUser(profile.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };
  

  // Grupos permitidos para acesso ao sistema
  const ALLOWED_GROUPS = ['Administrador', 'Superior', 'Qualidade', 'Básico'];

  // Função para retornar o grupo de maior prioridade do usuário
  const getUserMainGroup = () => {
    if (!user?.groups) return undefined;
    const prioridade = ['Administrador', 'Superior', 'Qualidade', 'Básico'];
    const nomes = user.groups.map(g => g.name || g);
    return prioridade.find(g => nomes.includes(g));
  };

  const login = async (username, password) => {
    setUser(null);
    setIsAuthenticated(false);
  
    Cookies.remove('access_token', { path: '/' });
    Cookies.remove('refresh_token', { path: '/' });
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  
    try {
      const response = await authAPI.login(username, password);
  
      Cookies.set('access_token', response.access, { expires: 1, path: '/' });
      Cookies.set('refresh_token', response.refresh, { expires: 7, path: '/' });
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
  
      if (window?.axios) {
        window.axios.defaults.headers.common['Authorization'] = `Bearer ${response.access}`;
      }
  
      const profile = await authAPI.getProfile(response.access); // usar token explicitamente
  
      const grupos = Array.isArray(profile.groups)
        ? profile.groups.map(g => typeof g === 'string' ? g : (g && g.name ? g.name : ''))
        : [];
      if (!grupos.some(g => ALLOWED_GROUPS.includes(g))) {
        throw new Error('Usuário não possui permissão para acessar o sistema');
      }
  
      setUser(profile.user);
      setIsAuthenticated(true);
  
      return { success: true };
  
    } catch (error) {
      console.error('Erro no login:', error);
      // Não chama logout() para evitar redirecionamento automático
      // Apenas limpa os tokens sem redirecionar
      Cookies.remove('access_token', { path: '/' });
      Cookies.remove('refresh_token', { path: '/' });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (window?.axios) {
        delete window.axios.defaults.headers.common['Authorization'];
      }
      
      // Traduz o erro para uma mensagem amigável
      const translatedError = translateLoginError(error);
      
      return {
        success: false,
        error: translatedError
      };
    }
  };  

  const logout = async () => {
    try {
      await authAPI.logout();
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      // Remove tokens com path
      Cookies.remove('access_token', { path: '/' });
      Cookies.remove('refresh_token', { path: '/' });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Limpa header do axios (caso use instância global)
      if (window?.axios) {
        delete window.axios.defaults.headers.common['Authorization'];
      }
      // Não redireciona automaticamente - o React Router cuidará do redirecionamento
      // baseado no estado isAuthenticated
    }
  };

  const hasGroup = (groupName) => {
    if (!user?.groups) return false;
    
    // Se for array, verifica se tem pelo menos um dos grupos
    if (Array.isArray(groupName)) {
      return user.groups.some(group => groupName.includes(group.name || group));
    }
    
    // Se for string, verifica se tem o grupo específico
    return user.groups.some(group => (group.name || group) === groupName);
  };

  // Função para checar se o usuário pertence a algum grupo permitido
  const isAllowed = () => {
    return user?.groups?.some(g => ALLOWED_GROUPS.includes(g)) || false;
  };


  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    hasGroup,
    checkAuth,
    isAllowed, // exporta função
    getUserMainGroup, // exporta função
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

