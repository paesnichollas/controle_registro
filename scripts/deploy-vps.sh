#!/bin/bash

# Script de deploy para VPS Hostinger
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
    echo -e "${BLUE}  Controle Registro - VPS Deploy${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se o arquivo .env existe
check_env_file() {
    if [ ! -f ".env" ]; then
        print_error "Arquivo .env não encontrado!"
        print_message "Criando arquivo .env de exemplo..."
        
        if [ -f "env.vps.example" ]; then
            cp env.vps.example .env
            print_warning "Arquivo .env criado a partir de env.vps.example"
            print_warning "Por favor, edite o arquivo .env com suas configurações reais!"
        else
            print_error "Arquivo env.vps.example não encontrado!"
            exit 1
        fi
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

# Verificar se Docker Compose está disponível
check_docker_compose() {
    print_message "Verificando Docker Compose..."
    if ! docker-compose --version > /dev/null 2>&1; then
        print_error "Docker Compose não está disponível."
        exit 1
    fi
    
    print_message "Docker Compose está disponível!"
}

# Criar diretórios necessários
create_directories() {
    print_message "Criando diretórios necessários..."
    
    mkdir -p backups
    mkdir -p logs/nginx
    mkdir -p ssl
    mkdir -p media
    mkdir -p staticfiles
    
    print_message "Diretórios criados!"
}

# Verificar certificados SSL
check_ssl_certificates() {
    print_message "Verificando certificados SSL..."
    
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        print_warning "Certificados SSL não encontrados!"
        print_message "Criando certificados auto-assinados para desenvolvimento..."
        
        mkdir -p ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=BR/ST=SP/L=Sao Paulo/O=Controle Registro/CN=localhost"
        
        print_warning "Certificados auto-assinados criados. Para produção, use certificados válidos!"
    else
        print_message "Certificados SSL encontrados!"
    fi
}

# Parar serviços existentes
stop_services() {
    print_message "Parando serviços existentes..."
    docker-compose -f docker-compose.vps.yml down --remove-orphans
    print_message "Serviços parados!"
}

# Fazer backup do banco (se existir)
backup_database() {
    print_message "Fazendo backup do banco de dados..."
    
    if docker-compose -f docker-compose.vps.yml ps db | grep -q "Up"; then
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose -f docker-compose.vps.yml exec -T db pg_dump -U postgres controle_registro_prod > "backups/$BACKUP_FILE"
        print_message "Backup salvo em: backups/$BACKUP_FILE"
    else
        print_warning "Banco de dados não está rodando, pulando backup..."
    fi
}

# Build das imagens
build_images() {
    print_message "Fazendo build das imagens Docker..."
    
    docker-compose -f docker-compose.vps.yml build --no-cache
    
    print_message "Build das imagens concluído!"
}

# Iniciar serviços
start_services() {
    print_message "Iniciando serviços..."
    
    docker-compose -f docker-compose.vps.yml up -d
    
    print_message "Serviços iniciados!"
}

# Aguardar serviços ficarem prontos
wait_for_services() {
    print_message "Aguardando serviços ficarem prontos..."
    
    # Aguardar banco de dados
    print_message "Aguardando PostgreSQL..."
    until docker-compose -f docker-compose.vps.yml exec -T db pg_isready -U postgres; do
        sleep 5
    done
    
    # Aguardar Redis
    print_message "Aguardando Redis..."
    until docker-compose -f docker-compose.vps.yml exec -T redis redis-cli -a $(grep REDIS_PASSWORD .env | cut -d'=' -f2) ping; do
        sleep 2
    done
    
    # Aguardar backend
    print_message "Aguardando Backend..."
    until curl -f http://localhost:8000/health > /dev/null 2>&1; do
        sleep 5
    done
    
    # Aguardar nginx
    print_message "Aguardando Nginx..."
    until curl -f http://localhost/health > /dev/null 2>&1; do
        sleep 5
    done
    
    print_message "Todos os serviços estão prontos!"
}

# Executar migrações
run_migrations() {
    print_message "Executando migrações do Django..."
    
    docker-compose -f docker-compose.vps.yml exec -T backend python manage.py migrate
    
    print_message "Migrações concluídas!"
}

# Criar superusuário se não existir
create_superuser() {
    print_message "Verificando superusuário..."
    
    if ! docker-compose -f docker-compose.vps.yml exec -T backend python manage.py shell -c "from django.contrib.auth.models import User; print('Superuser exists' if User.objects.filter(is_superuser=True).exists() else 'No superuser')" | grep -q "Superuser exists"; then
        print_message "Criando superusuário..."
        docker-compose -f docker-compose.vps.yml exec -T backend python manage.py createsuperuser --noinput
        print_warning "Superusuário criado com credenciais padrão. Altere a senha no admin!"
    else
        print_message "Superusuário já existe!"
    fi
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
    if docker-compose -f docker-compose.vps.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        print_message "✅ Banco de dados está saudável"
    else
        print_error "❌ Banco de dados não está respondendo"
        return 1
    fi
    
    # Verificar Redis
    if docker-compose -f docker-compose.vps.yml exec -T redis redis-cli -a $(grep REDIS_PASSWORD .env | cut -d'=' -f2) ping > /dev/null 2>&1; then
        print_message "✅ Redis está saudável"
    else
        print_error "❌ Redis não está respondendo"
        return 1
    fi
    
    print_message "Todos os serviços estão saudáveis!"
}

# Configurar firewall básico
setup_firewall() {
    print_message "Configurando firewall básico..."
    
    # Verificar se ufw está disponível
    if command -v ufw > /dev/null 2>&1; then
        # Permitir SSH
        ufw allow 22/tcp
        
        # Permitir HTTP e HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp
        
        # Bloquear acesso direto ao PostgreSQL e Redis
        ufw deny 5432/tcp
        ufw deny 6379/tcp
        
        # Ativar firewall
        ufw --force enable
        
        print_message "Firewall configurado!"
    else
        print_warning "UFW não está disponível. Configure o firewall manualmente."
    fi
}

# Mostrar informações finais
show_info() {
    print_message "Deploy concluído com sucesso! 🎉"
    echo ""
    print_message "URLs de acesso:"
    echo "  🌐 Aplicação: https://localhost"
    echo "  🔧 API: https://localhost/api"
    echo "  📚 Admin Django: https://localhost/admin"
    echo "  📖 Documentação API: https://localhost/api/docs"
    echo ""
    print_message "Comandos úteis:"
    echo "  📋 Ver logs: docker-compose -f docker-compose.vps.yml logs -f"
    echo "  🛑 Parar serviços: docker-compose -f docker-compose.vps.yml down"
    echo "  🔄 Reiniciar: docker-compose -f docker-compose.vps.yml restart"
    echo "  📊 Status: docker-compose -f docker-compose.vps.yml ps"
    echo ""
    print_message "Logs específicos:"
    echo "  📋 Backend: docker-compose -f docker-compose.vps.yml logs -f backend"
    echo "  📋 Frontend: docker-compose -f docker-compose.vps.yml logs -f frontend"
    echo "  📋 Nginx: docker-compose -f docker-compose.vps.yml logs -f nginx"
    echo "  📋 Database: docker-compose -f docker-compose.vps.yml logs -f db"
    echo ""
    print_message "Backup e Restore:"
    echo "  💾 Backup: docker-compose -f docker-compose.vps.yml exec db pg_dump -U postgres controle_registro_prod > backup.sql"
    echo "  🔄 Restore: docker-compose -f docker-compose.vps.yml exec -T db psql -U postgres controle_registro_prod < backup.sql"
    echo ""
    print_warning "IMPORTANTE:"
    echo "  🔐 Altere as senhas padrão no arquivo .env"
    echo "  🔒 Configure certificados SSL válidos para produção"
    echo "  📧 Configure as variáveis de email se necessário"
    echo "  🔄 Configure backups automáticos"
}

# Função principal
main() {
    print_header
    
    check_env_file
    check_docker
    check_docker_compose
    create_directories
    check_ssl_certificates
    stop_services
    backup_database
    build_images
    start_services
    wait_for_services
    run_migrations
    create_superuser
    health_check
    setup_firewall
    show_info
}

# Executar função principal
main "$@"
