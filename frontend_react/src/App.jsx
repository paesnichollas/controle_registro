import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import { Toaster } from './components/ui/sonner.jsx';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OrdensServico from './components/OrdensServico';
import GerenciarClientes from './components/GerenciarClientes';
import UsuariosPage from './pages/UsuariosPage';
import AlterarSenhaPage from './pages/AlterarSenhaPage';
import DashboardPage from './pages/DashboardPage';
import OrdemServicoDetalhePage from './pages/OrdemServicoDetalhePage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import GerenciarSelectsPage from './pages/GerenciarSelectsPage';
import BuscarClientePage from './pages/BuscarClientePage';
import PreviewValoresModal from './pages/PreviewValoresModal';
import FormularioOSPage from './pages/FormularioOSPage';

import RelatoriosPage from './pages/RelatoriosPage';
import PerfilPage from './pages/PerfilPage';
import CadastroPage from './pages/CadastroPage';
import { FullScreenLoading } from './components/ui/LoadingSpinner.jsx';
import './App.css';

function ProtectedRoute({ children, requiredGroup = null, restrictedForBasicQuality = false }) {
  const { isAuthenticated, loading, hasGroup, isAllowed } = useAuth();

  if (loading) {
    return <FullScreenLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Bloqueia acesso se não estiver em grupo permitido
  if (!isAllowed()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <h2 className="text-xl mb-2">Acesso Negado</h2>
          <p>Você não tem permissão para acessar o sistema.</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  // Verificar se a rota é restritiva para usuários "Básico" e "Qualidade"
  if (restrictedForBasicQuality && hasGroup(['Básico', 'Qualidade'])) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <h2 className="text-xl mb-2">Acesso Negado</h2>
          <p>Esta funcionalidade não está disponível para seu grupo de usuário.</p>
          <button 
            onClick={() => window.history.back()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (requiredGroup && !hasGroup(requiredGroup)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <h2 className="text-xl mb-2">Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
          <button 
            onClick={() => window.history.back()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenLoading />;
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </>
      ) : (
        <>
          <Route path="/login" element={<Navigate to="/dashboard" />} />
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout currentPage="Dashboard">
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ordens-servico"
            element={
              <ProtectedRoute>
                <Layout currentPage="Ordens de Serviço">
                  <OrdensServico />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordens-servico/nova"
            element={
              <ProtectedRoute>
                <Layout currentPage="Nova Ordem de Serviço">
                  <FormularioOSPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordens-servico/:id"
            element={
              <ProtectedRoute>
                <Layout currentPage="Detalhes da OS">
                  <OrdemServicoDetalhePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordens-servico/:osId/editar"
            element={
              <ProtectedRoute>
                <Layout currentPage="Editar Ordem de Serviço">
                  <FormularioOSPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute requiredGroup="Administrador">
                <Layout currentPage="Usuários">
                  <UsuariosPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Layout currentPage="Meu Perfil">
                  <PerfilPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/alterar-senha"
            element={
              <ProtectedRoute>
                <Layout currentPage="Alterar Senha">
                  <AlterarSenhaPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute restrictedForBasicQuality={true}>
                <Layout currentPage="Gerenciar Clientes">
                  <GerenciarClientes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/buscar"
            element={
              <ProtectedRoute restrictedForBasicQuality={true}>
                <Layout currentPage="Buscar Cliente">
                  <BuscarClientePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute restrictedForBasicQuality={true}>
                <Layout currentPage="Relatórios">
                  <RelatoriosPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <ProtectedRoute restrictedForBasicQuality={true}>
                <Layout currentPage="Configurações">
                  <ConfiguracoesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/gerenciar-selects"
            element={
              <ProtectedRoute restrictedForBasicQuality={true}>
                <Layout currentPage="Gerenciar Selects">
                  <GerenciarSelectsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/preview-valores"
            element={
              <ProtectedRoute>
                <Layout currentPage="Preview Valores">
                  <PreviewValoresModal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <NotificationProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
