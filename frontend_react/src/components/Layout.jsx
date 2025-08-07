import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, 
  Menu, 
  X, 
  FileText, 
  Users, 
  BarChart3,
  Settings,
  Home,
  ChevronRight,
  Shield,
  User,
  Database
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Ordens de Serviço', path: '/ordens-servico' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
  { icon: Database, label: 'Gerenciar Selects', path: '/gerenciar-selects' },
];

export default function Layout({ children, currentPage = 'Dashboard' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, hasGroup } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) {
      return user.first_name;
    }
    return user?.username || 'Usuário';
  };

  // Função para verificar se um item do menu deve ser exibido
  const shouldShowMenuItem = (item) => {
    // Dashboard e Ordens de Serviço sempre visíveis
    if (item.path === '/dashboard' || item.path === '/ordens-servico') {
      return true;
    }

    // Verificar se o usuário pertence aos grupos "Básico" ou "Qualidade"
    const isBasicOrQuality = hasGroup(['Básico', 'Qualidade']);
    
    // Se for "Básico" ou "Qualidade", ocultar os itens restritivos
    if (isBasicOrQuality) {
      return false;
    }

    // Para outros grupos (Administrador, Superior), mostrar todos os itens
    return true;
  };

  // Filtrar itens do menu baseado nas permissões
  const filteredMenuItems = menuItems.filter(shouldShowMenuItem);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-2xl`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent whitespace-nowrap">
                Controle de Registros
              </h1>
              <p className="text-xs text-gray-400">Sistema</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <div key={item.path}>
                  <Link to={item.path} onClick={() => setSidebarOpen(false)}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-left h-12 px-4 rounded-xl transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30 shadow-lg' 
                          : 'text-gray-300 hover:text-white hover:bg-slate-700/50 hover:border-slate-600/50 border border-transparent'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="ml-auto h-4 w-4 text-cyan-400" />
                      )}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>

        {/* User Info */}
        <div className="absolute bottom-6 left-4 right-4">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-600/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg">
                  <AvatarFallback className="text-white font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">
                    {getUserDisplayName()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-emerald-600/20 text-emerald-300 border-emerald-500/30">
                      {user?.groups?.[0] || 'Usuário'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg"
                    onClick={() => window.location.href = '/perfil'}
                    title="Meu Perfil"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg"
                    onClick={handleLogout}
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border-b border-slate-700/50 h-20 flex items-center justify-between px-6 shadow-lg">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg p-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Breadcrumb */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-gray-400">Sistema</span>
              <ChevronRight className="h-4 w-4 text-gray-500" />
              <span className="text-gray-300 font-medium">{currentPage}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                Sistema Ativo
              </Badge>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-sm font-medium text-gray-100">{getUserDisplayName()}</p>
                <p className="text-xs text-gray-400">
                  {user?.groups?.join(', ') || 'Usuário'}
                </p>
              </div>
              
              <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg">
                <AvatarFallback className="text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg"
                  onClick={() => window.location.href = '/perfil'}
                  title="Meu Perfil"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg"
                  onClick={handleLogout}
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}

