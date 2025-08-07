#!/bin/bash

# Script de Deploy Automatizado - Sistema de Controle de OS
# Versão: 1.0.0

set -e  # Parar em caso de erro

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
    echo -e "${BLUE}  Sistema de Controle de OS${NC}"
    echo -e "${BLUE}  Script de Deploy${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Função para verificar pré-requisitos
check_prerequisites() {
    print_message "Verificando pré-requisitos..."
    
    # Verificar se Docker está instalado
    if ! command -v docker &> /dev/null; then
        print_error "Docker não está instalado. Instale o Docker primeiro."
        exit 1
    fi
    
    # Verificar se Docker Compose está instalado
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose não está instalado. Instale o Docker Compose primeiro."
        exit 1
    fi
    
    # Verificar se o arquivo .env existe
    if [ ! -f ".env" ]; then
        print_warning "Arquivo .env não encontrado. Criando a partir do exemplo..."
        if [ -f "env.example" ]; then
            cp env.example .env
            print_message "Arquivo .env criado. Edite-o com suas configurações antes de continuar."
            exit 1
        else
            print_error "Arquivo env.example não encontrado."
            exit 1
        fi
    fi
    
    print_message "Pré-requisitos verificados com sucesso!"
}

# Função para parar containers existentes
stop_containers() {
    print_message "Parando containers existentes..."
    docker-compose down
    print_message "Containers parados."
}

# Função para construir imagens
build_images() {
    print_message "Construindo imagens Docker..."
    docker-compose build --no-cache
    print_message "Imagens construídas com sucesso!"
}

# Função para subir containers
start_containers() {
    print_message "Subindo containers..."
    docker-compose up -d
    print_message "Containers iniciados!"
}

# Função para aguardar serviços ficarem prontos
wait_for_services() {
    print_message "Aguardando serviços ficarem prontos..."
    
    # Aguardar banco de dados
    print_message "Aguardando banco de dados..."
    until docker-compose exec -T db pg_isready -U postgres; do
        sleep 2
    done
    print_message "Banco de dados pronto!"
    
    # Aguardar backend
    print_message "Aguardando backend..."
    until curl -f http://localhost:8000/api/ &> /dev/null; do
        sleep 5
    done
    print_message "Backend pronto!"
    
    # Aguardar frontend
    print_message "Aguardando frontend..."
    until curl -f http://localhost:80 &> /dev/null; do
        sleep 5
    done
    print_message "Frontend pronto!"
}

# Função para verificar status
check_status() {
    print_message "Verificando status dos serviços..."
    
    echo ""
    echo "Status dos containers:"
    docker-compose ps
    
    echo ""
    echo "Testando endpoints:"
    
    # Testar backend
    if curl -f http://localhost:8000/api/ &> /dev/null; then
        print_message "✅ Backend (http://localhost:8000) - OK"
    else
        print_error "❌ Backend (http://localhost:8000) - ERRO"
    fi
    
    # Testar frontend
    if curl -f http://localhost:80 &> /dev/null; then
        print_message "✅ Frontend (http://localhost:80) - OK"
    else
        print_error "❌ Frontend (http://localhost:80) - ERRO"
    fi
    
    echo ""
    print_message "Deploy concluído com sucesso!"
    echo ""
    echo "URLs de acesso:"
    echo "  Frontend: http://localhost"
    echo "  Backend API: http://localhost:8000"
    echo "  Admin Django: http://localhost:8000/admin"
    echo ""
    echo "Comandos úteis:"
    echo "  Ver logs: docker-compose logs -f"
    echo "  Parar: docker-compose down"
    echo "  Reiniciar: docker-compose restart"
}

# Função para mostrar logs
show_logs() {
    print_message "Mostrando logs dos containers..."
    docker-compose logs -f
}

# Função para limpar tudo
cleanup() {
    print_warning "Isso irá parar e remover todos os containers, redes e volumes!"
    read -p "Tem certeza? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_message "Limpando tudo..."
        docker-compose down -v
        docker system prune -f
        print_message "Limpeza concluída!"
    else
        print_message "Operação cancelada."
    fi
}

# Função para mostrar ajuda
show_help() {
    echo "Uso: $0 [OPÇÃO]"
    echo ""
    echo "Opções:"
    echo "  deploy     - Fazer deploy completo (padrão)"
    echo "  build      - Apenas construir imagens"
    echo "  start      - Apenas subir containers"
    echo "  stop       - Parar containers"
    echo "  restart    - Reiniciar containers"
    echo "  status     - Verificar status"
    echo "  logs       - Mostrar logs"
    echo "  cleanup    - Limpar tudo (containers, redes, volumes)"
    echo "  help       - Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 deploy    # Deploy completo"
    echo "  $0 logs      # Ver logs"
    echo "  $0 status    # Verificar status"
}

# Função principal
main() {
    print_header
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            stop_containers
            build_images
            start_containers
            wait_for_services
            check_status
            ;;
        "build")
            check_prerequisites
            build_images
            ;;
        "start")
            check_prerequisites
            start_containers
            wait_for_services
            check_status
            ;;
        "stop")
            stop_containers
            ;;
        "restart")
            stop_containers
            start_containers
            wait_for_services
            check_status
            ;;
        "status")
            check_status
            ;;
        "logs")
            show_logs
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Opção inválida: $1"
            show_help
            exit 1
            ;;
    esac
}

# Executar função principal
main "$@" 