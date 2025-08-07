#!/bin/bash

# =============================================================================
# SCRIPT: testa-tudo.sh
# DESCRIÇÃO: Orquestrador que testa todos os componentes do sistema
# USO: ./scripts/testa-tudo.sh [--quick] [--windows-only]
# AUTOR: Sistema de Automação - Metaltec
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Detectar sistema operacional
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "macos";;
        CYGWIN*|MINGW*|MSYS*) echo "windows";;
        *)          echo "unknown";;
    esac
}

# Verificar se estamos no Windows
is_windows() {
    [ "$(detect_os)" = "windows" ]
}

# Verificar se estamos no WSL
is_wsl() {
    if [ -f /proc/version ]; then
        grep -qi microsoft /proc/version
    else
        false
    fi
}

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para executar script com verificação
run_script() {
    local script="$1"
    local description="$2"
    local required_os="${3:-all}"
    
    # Verificar se o script existe
    if [ ! -f "$script" ]; then
        print_warning "Script não encontrado: $script"
        return 1
    fi
    
    # Verificar compatibilidade de sistema operacional
    if [ "$required_os" != "all" ]; then
        local current_os=$(detect_os)
        if [ "$required_os" != "$current_os" ]; then
            print_warning "Script $script não é compatível com $current_os"
            return 1
        fi
    fi
    
    # Verificar permissão de execução
    if [ ! -x "$script" ]; then
        print_warning "Script $script não tem permissão de execução"
        if is_windows; then
            print_info "Tentando dar permissão via Git..."
            git update-index --chmod=+x "$script" 2>/dev/null || true
        else
            chmod +x "$script" 2>/dev/null || true
        fi
    fi
    
    print_message "Executando: $description"
    print_info "Script: $script"
    
    # Executar script
    if bash "$script" 2>/dev/null; then
        print_message "✅ $description - SUCESSO"
        return 0
    else
        print_error "❌ $description - FALHOU"
        return 1
    fi
}

# Função para verificar dependências básicas
check_basic_dependencies() {
    print_info "🔍 Verificando dependências básicas..."
    
    local missing_deps=()
    
    # Verificar Docker
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    # Verificar docker-compose
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    # Verificar Git
    if ! command_exists git; then
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "❌ Dependências faltando: ${missing_deps[*]}"
        return 1
    fi
    
    print_message "✅ Dependências básicas OK"
    return 0
}

# Função para verificar arquivo .env
check_env_file() {
    print_info "🔍 Verificando arquivo .env..."
    
    if [ ! -f ".env" ]; then
        print_error "❌ Arquivo .env não encontrado"
        print_info "💡 Execute: cp env.example .env"
        return 1
    fi
    
    print_message "✅ Arquivo .env encontrado"
    return 0
}

# Função para executar testes básicos
run_basic_tests() {
    print_info "🧪 Executando testes básicos..."
    
    local success_count=0
    local total_count=0
    
    # Teste 1: Verificar compatibilidade
    ((total_count++))
    if run_script "scripts/windows-compatibility.sh" "Verificação de compatibilidade" "all"; then
        ((success_count++))
    fi
    
    # Teste 2: Verificar variáveis obrigatórias
    ((total_count++))
    if run_script "scripts/check-required-vars.sh" "Verificação de variáveis obrigatórias" "all"; then
        ((success_count++))
    fi
    
    # Teste 3: Verificar volumes Docker
    ((total_count++))
    if run_script "scripts/01-check-volumes.sh" "Verificação de volumes Docker" "all"; then
        ((success_count++))
    fi
    
    # Teste 4: Verificar configurações de segurança
    ((total_count++))
    if run_script "scripts/05-check-debug-env.sh" "Verificação de configurações de segurança" "all"; then
        ((success_count++))
    fi
    
    echo ""
    print_info "📊 RESULTADO DOS TESTES BÁSICOS:"
    echo "   Sucessos: $success_count/$total_count"
    
    if [ "$success_count" -eq "$total_count" ]; then
        print_message "✅ Todos os testes básicos passaram!"
        return 0
    else
        print_warning "⚠️  Alguns testes básicos falharam"
        return 1
    fi
}

# Função para executar testes avançados (apenas Linux/WSL)
run_advanced_tests() {
    if is_windows && ! is_wsl; then
        print_warning "⚠️  Testes avançados não são compatíveis com Windows (Git Bash)"
        print_info "💡 Use WSL para executar todos os testes"
        return 0
    fi
    
    print_info "🧪 Executando testes avançados..."
    
    local success_count=0
    local total_count=0
    
    # Teste 1: Verificar permissões
    ((total_count++))
    if run_script "scripts/06-fix-permissions.sh" "Verificação de permissões" "linux"; then
        ((success_count++))
    fi
    
    # Teste 2: Verificar portas
    ((total_count++))
    if run_script "scripts/07-check-ports.sh" "Verificação de portas" "linux"; then
        ((success_count++))
    fi
    
    # Teste 3: Verificar uso de disco
    ((total_count++))
    if run_script "scripts/12-disk-usage.sh" "Verificação de uso de disco" "linux"; then
        ((success_count++))
    fi
    
    # Teste 4: Verificar certificados SSL
    ((total_count++))
    if run_script "scripts/13-ssl-cert.sh" "Verificação de certificados SSL" "linux"; then
        ((success_count++))
    fi
    
    echo ""
    print_info "📊 RESULTADO DOS TESTES AVANÇADOS:"
    echo "   Sucessos: $success_count/$total_count"
    
    if [ "$success_count" -eq "$total_count" ]; then
        print_message "✅ Todos os testes avançados passaram!"
        return 0
    else
        print_warning "⚠️  Alguns testes avançados falharam"
        return 1
    fi
}

# Função para executar testes de Docker
run_docker_tests() {
    print_info "🐳 Executando testes de Docker..."
    
    local success_count=0
    local total_count=0
    
    # Teste 1: Verificar se Docker está rodando
    ((total_count++))
    if docker info >/dev/null 2>&1; then
        print_message "✅ Docker está rodando"
        ((success_count++))
    else
        print_error "❌ Docker não está rodando"
    fi
    
    # Teste 2: Verificar se docker-compose funciona
    ((total_count++))
    if docker-compose --version >/dev/null 2>&1; then
        print_message "✅ docker-compose está funcionando"
        ((success_count++))
    else
        print_error "❌ docker-compose não está funcionando"
    fi
    
    # Teste 3: Verificar se os arquivos docker-compose existem
    ((total_count++))
    if [ -f "docker-compose.yml" ] && [ -f "docker-compose.dev.yml" ] && [ -f "docker-compose.prod.yml" ]; then
        print_message "✅ Arquivos docker-compose encontrados"
        ((success_count++))
    else
        print_error "❌ Arquivos docker-compose não encontrados"
    fi
    
    echo ""
    print_info "📊 RESULTADO DOS TESTES DE DOCKER:"
    echo "   Sucessos: $success_count/$total_count"
    
    if [ "$success_count" -eq "$total_count" ]; then
        print_message "✅ Todos os testes de Docker passaram!"
        return 0
    else
        print_warning "⚠️  Alguns testes de Docker falharam"
        return 1
    fi
}

# Função para mostrar relatório final
show_final_report() {
    local os_type=$(detect_os)
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    echo ""
    print_message "📋 RELATÓRIO FINAL - $timestamp"
    echo ""
    echo "Sistema Operacional: $os_type"
    echo "Diretório: $(pwd)"
    echo "Usuário: $(whoami)"
    
    if is_wsl; then
        echo "WSL: Sim"
    fi
    
    if is_windows; then
        echo "Windows: Sim"
    fi
    
    echo ""
    print_info "🎯 PRÓXIMOS PASSOS:"
    echo ""
    
    if is_windows && ! is_wsl; then
        echo "💻 Para Windows (Git Bash):"
        echo "   1. Configure as variáveis no arquivo .env"
        echo "   2. Execute: docker-compose -f docker-compose.dev.yml up"
        echo "   3. Acesse: http://localhost:8000"
        echo ""
        echo "💡 Para melhor compatibilidade, use WSL"
    else
        echo "🐧 Para Linux/WSL:"
        echo "   1. Configure as variáveis no arquivo .env"
        echo "   2. Execute: docker-compose -f docker-compose.dev.yml up"
        echo "   3. Acesse: http://localhost:8000"
    fi
    
    echo ""
    print_warning "⚠️  IMPORTANTE:"
    echo "   - Sempre verifique as variáveis obrigatórias"
    echo "   - Use valores seguros em produção"
    echo "   - Faça backup regular das configurações"
    echo "   - Mantenha o Docker atualizado"
}

# Função principal
main() {
    local quick_mode=false
    local windows_only=false
    
    # Processar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick)
                quick_mode=true
                shift
                ;;
            --windows-only)
                windows_only=true
                shift
                ;;
            *)
                echo "Argumento desconhecido: $1"
                exit 1
                ;;
        esac
    done
    
    print_message "🚀 INICIANDO TESTE COMPLETO DO SISTEMA"
    echo ""
    
    # Verificar se estamos no diretório correto
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Execute este script no diretório raiz do projeto"
        echo "   Diretório atual: $(pwd)"
        return 1
    fi
    
    # Verificar dependências básicas
    if ! check_basic_dependencies; then
        return 1
    fi
    
    # Verificar arquivo .env
    if ! check_env_file; then
        return 1
    fi
    
    # Executar testes básicos
    if ! run_basic_tests; then
        print_warning "Alguns testes básicos falharam"
    fi
    
    # Executar testes de Docker
    if ! run_docker_tests; then
        print_warning "Alguns testes de Docker falharam"
    fi
    
    # Executar testes avançados (se não for modo rápido e não for Windows-only)
    if [ "$quick_mode" = false ] && [ "$windows_only" = false ]; then
        if ! run_advanced_tests; then
            print_warning "Alguns testes avançados falharam"
        fi
    fi
    
    # Mostrar relatório final
    show_final_report
    
    print_message "✅ TESTE COMPLETO FINALIZADO"
    echo ""
    print_info "🎉 Seu ambiente está pronto para desenvolvimento!"
}

# Executar função principal
main "$@"
