
#!/bin/bash

# Script de configuração do ambiente de desenvolvimento
# Controle Registro - Monorepo

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Controle Registro - Setup Dev${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se Docker está instalado
check_docker() {
    print_message "Verificando Docker..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker não está instalado. Por favor, instale o Docker primeiro."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
        exit 1
    fi
    
    print_message "Docker e Docker Compose encontrados!"
}

# Verificar se os diretórios existem
check_directories() {
    print_message "Verificando estrutura do projeto..."
    
    if [ ! -d "api_django" ]; then
        print_error "Diretório api_django não encontrado!"
        exit 1
    fi
    
    if [ ! -d "frontend_react" ]; then
        print_error "Diretório frontend_react não encontrado!"
        exit 1
    fi
    
    print_message "Estrutura do projeto OK!"
}

# Criar arquivo .env se não existir
create_env_file() {
    print_message "Configurando variáveis de ambiente..."
    
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# Configurações do Django
SECRET_KEY=django-insecure-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Configurações do banco de dados
DATABASE_URL=postgresql://postgres:postgres@db:5432/controle_registro_dev
REDIS_URL=redis://redis:6379/0

# Configurações do frontend
VITE_API_URL=http://localhost:8000/api
VITE_AUTH_URL=http://localhost:8000/api/auth
EOF
        print_message "Arquivo .env criado!"
    else
        print_warning "Arquivo .env já existe!"
    fi
}

# Build das imagens Docker
build_images() {
    print_message "Fazendo build das imagens Docker..."
    
    docker-compose -f docker-compose.dev.yml build
    
    print_message "Build das imagens concluído!"
}

# Iniciar os serviços
start_services() {
    print_message "Iniciando serviços..."
    
    docker-compose -f docker-compose.dev.yml up -d
    
    print_message "Serviços iniciados!"
}

# Aguardar serviços ficarem prontos
wait_for_services() {
    print_message "Aguardando serviços ficarem prontos..."
    
    # Aguardar banco de dados
    print_message "Aguardando PostgreSQL..."
    until docker-compose -f docker-compose.dev.yml exec -T db pg_isready -U postgres; do
        sleep 2
    done
    
    # Aguardar Redis
    print_message "Aguardando Redis..."
    until docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping; do
        sleep 2
    done
    
    print_message "Todos os serviços estão prontos!"
}

# Executar migrações
run_migrations() {
    print_message "Executando migrações do Django..."
    
    docker-compose -f docker-compose.dev.yml exec -T backend python manage.py migrate
    
    print_message "Migrações concluídas!"
}

# Criar superusuário (opcional)
create_superuser() {
    print_message "Deseja criar um superusuário? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_message "Criando superusuário..."
        docker-compose -f docker-compose.dev.yml exec -T backend python manage.py createsuperuser
    fi
}

# Mostrar status
show_status() {
    print_message "Verificando status dos serviços..."
    
    docker-compose -f docker-compose.dev.yml ps
    
    echo ""
    print_message "URLs de acesso:"
    echo "  🌐 Frontend: http://localhost:5173"
    echo "  🔧 Backend API: http://localhost:8000"
    echo "  📚 Admin Django: http://localhost:8000/admin"
    echo "  📖 Documentação API: http://localhost:8000/api/docs"
    echo ""
    print_message "Comandos úteis:"
    echo "  📋 Ver logs: docker-compose -f docker-compose.dev.yml logs -f"
    echo "  🛑 Parar serviços: docker-compose -f docker-compose.dev.yml down"
    echo "  🔄 Reiniciar: docker-compose -f docker-compose.dev.yml restart"
}

# Função principal
main() {
    print_header
    
    check_docker
    check_directories
    create_env_file
    build_images
    start_services
    wait_for_services
    run_migrations
    create_superuser
    show_status
    
    echo ""
    print_message "Setup concluído! 🎉"
    print_message "O ambiente de desenvolvimento está pronto para uso."
}

# Executar função principal
main "$@"
