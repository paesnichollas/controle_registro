#!/bin/bash

# Script de deploy para produção
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
    echo -e "${BLUE}  Controle Registro - Deploy${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se o arquivo .env existe
check_env_file() {
    if [ ! -f ".env" ]; then
        print_error "Arquivo .env não encontrado!"
        print_message "Criando arquivo .env de exemplo..."
        
        cat > .env << EOF
# Configurações de Produção
SECRET_KEY=sua-chave-secreta-muito-segura-aqui
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,seu-dominio.com

# Configurações do banco de dados
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua-senha-segura-aqui
DATABASE_URL=postgresql://postgres:sua-senha-segura-aqui@db:5432/controle_registro_prod
REDIS_URL=redis://redis:6379/0

# Configurações do frontend
VITE_API_URL=http://seu-dominio.com/api
VITE_AUTH_URL=http://seu-dominio.com/api/auth
EOF
        
        print_warning "Arquivo .env criado com valores padrão. Por favor, edite com suas configurações reais!"
        exit 1
    fi
    
    print_message "Arquivo .env encontrado!"
}

# Verificar se Docker está rodando
check_docker() {
    print_message "Verificando Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker não está rodando. Por favor, inicie o Docker primeiro."
        exit 1
    fi
    
    print_message "Docker está rodando!"
}

# Parar serviços existentes
stop_services() {
    print_message "Parando serviços existentes..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    print_message "Serviços parados!"
}

# Fazer backup do banco (se existir)
backup_database() {
    print_message "Fazendo backup do banco de dados..."
    
    if docker-compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres controle_registro_prod > "backups/$BACKUP_FILE"
        print_message "Backup salvo em: backups/$BACKUP_FILE"
    else
        print_warning "Banco de dados não está rodando, pulando backup..."
    fi
}

# Build das imagens
build_images() {
    print_message "Fazendo build das imagens Docker..."
    
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    print_message "Build das imagens concluído!"
}

# Iniciar serviços
start_services() {
    print_message "Iniciando serviços..."
    
    docker-compose -f docker-compose.prod.yml up -d
    
    print_message "Serviços iniciados!"
}

# Aguardar serviços ficarem prontos
wait_for_services() {
    print_message "Aguardando serviços ficarem prontos..."
    
    # Aguardar banco de dados
    print_message "Aguardando PostgreSQL..."
    until docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U postgres; do
        sleep 5
    done
    
    # Aguardar Redis
    print_message "Aguardando Redis..."
    until docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping; do
        sleep 2
    done
    
    # Aguardar backend
    print_message "Aguardando Backend..."
    until curl -f http://localhost:8000/health > /dev/null 2>&1; do
        sleep 5
    done
    
    print_message "Todos os serviços estão prontos!"
}

# Executar migrações
run_migrations() {
    print_message "Executando migrações do Django..."
    
    docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate
    
    print_message "Migrações concluídas!"
}

# Verificar saúde dos serviços
health_check() {
    print_message "Verificando saúde dos serviços..."
    
    # Verificar backend
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_message "✅ Backend está saudável"
    else
        print_error "❌ Backend não está respondendo"
        return 1
    fi
    
    # Verificar frontend
    if curl -f http://localhost > /dev/null 2>&1; then
        print_message "✅ Frontend está saudável"
    else
        print_error "❌ Frontend não está respondendo"
        return 1
    fi
    
    # Verificar banco de dados
    if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        print_message "✅ Banco de dados está saudável"
    else
        print_error "❌ Banco de dados não está respondendo"
        return 1
    fi
    
    print_message "Todos os serviços estão saudáveis!"
}

# Mostrar informações finais
show_info() {
    print_message "Deploy concluído com sucesso! 🎉"
    echo ""
    print_message "URLs de acesso:"
    echo "  🌐 Aplicação: http://localhost"
    echo "  🔧 API: http://localhost:8000/api"
    echo "  📚 Admin Django: http://localhost:8000/admin"
    echo "  📖 Documentação API: http://localhost:8000/api/docs"
    echo ""
    print_message "Comandos úteis:"
    echo "  📋 Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  🛑 Parar serviços: docker-compose -f docker-compose.prod.yml down"
    echo "  🔄 Reiniciar: docker-compose -f docker-compose.prod.yml restart"
    echo "  📊 Status: docker-compose -f docker-compose.prod.yml ps"
    echo ""
    print_message "Logs específicos:"
    echo "  📋 Backend: docker-compose -f docker-compose.prod.yml logs -f backend"
    echo "  📋 Frontend: docker-compose -f docker-compose.prod.yml logs -f frontend"
    echo "  📋 Nginx: docker-compose -f docker-compose.prod.yml logs -f nginx"
}

# Função principal
main() {
    print_header
    
    check_env_file
    check_docker
    stop_services
    backup_database
    build_images
    start_services
    wait_for_services
    run_migrations
    health_check
    show_info
}

# Executar função principal
main "$@"
