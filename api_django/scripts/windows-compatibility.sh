#!/bin/bash

# =============================================================================
# SCRIPT: windows-compatibility.sh
# DESCRIÇÃO: Detecta ambiente Windows e adapta comandos não nativos
# USO: source ./scripts/windows-compatibility.sh
# AUTOR: Sistema de Automação - Metaltec
# =============================================================================

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

# Função para substituir comandos não nativos do Windows
setup_windows_compatibility() {
    if ! is_windows; then
        return 0
    fi
    
    print_info "🔧 Configurando compatibilidade para Windows..."
    
    # Substituir 'find' por alternativa se necessário
    if ! command_exists find; then
        print_warning "Comando 'find' não encontrado no Windows"
        print_info "💡 Instale Git Bash ou WSL para melhor compatibilidade"
    fi
    
    # Substituir 'bc' por alternativa se necessário
    if ! command_exists bc; then
        print_warning "Comando 'bc' não encontrado no Windows"
        print_info "💡 Para cálculos, use: echo 'scale=2; 10/3' | awk '{printf \"%.2f\", $1}'"
    fi
    
    # Substituir 'sudo' por alternativa se necessário
    if ! command_exists sudo; then
        print_warning "Comando 'sudo' não encontrado no Windows"
        print_info "💡 Execute comandos como administrador quando necessário"
    fi
    
    # Verificar permissões de arquivo
    if ! command_exists chmod; then
        print_warning "Comando 'chmod' não encontrado no Windows"
        print_info "💡 Use: git update-index --chmod=+x arquivo.sh"
    fi
    
    print_message "✅ Compatibilidade Windows configurada"
}

# Função para mostrar orientações específicas do Windows
show_windows_guidance() {
    if ! is_windows; then
        return 0
    fi
    
    echo ""
    print_info "💻 ORIENTAÇÕES ESPECÍFICAS PARA WINDOWS:"
    echo ""
    echo "📁 NAVEGAÇÃO DE PASTAS:"
    echo "   - Windows: D:\Projetos\... → /d/Projetos/..."
    echo "   - Git Bash: cd /d/Projetos/Metaltec/api/api-back/api_django"
    echo "   - WSL: cd /mnt/d/Projetos/Metaltec/api/api-back/api_django"
    echo ""
    echo "🔧 COMANDOS ADAPTADOS:"
    echo "   - Para permissões: git update-index --chmod=+x script.sh"
    echo "   - Para cálculos: echo '10/3' | awk '{printf \"%.3f\", $1}'"
    echo "   - Para administrador: Execute Git Bash como administrador"
    echo ""
    echo "🚀 RECOMENDAÇÕES:"
    echo "   - Use Git Bash ou WSL para melhor compatibilidade"
    echo "   - Execute scripts como: bash script.sh"
    echo "   - Para problemas de permissão, execute como administrador"
    echo ""
}

# Função para verificar e instalar dependências
check_dependencies() {
    local missing_deps=()
    
    # Verificar dependências essenciais
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command_exists git; then
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "❌ Dependências faltando: ${missing_deps[*]}"
        echo ""
        
        if is_windows; then
            print_info "💡 Para instalar no Windows:"
            echo "   1. Docker Desktop: https://docs.docker.com/desktop/install/windows/"
            echo "   2. Git: https://git-scm.com/download/win"
            echo "   3. WSL (recomendado): wsl --install"
        else
            print_info "💡 Para instalar no Linux:"
            echo "   sudo apt-get update && sudo apt-get install docker.io docker-compose git"
        fi
        
        return 1
    fi
    
    print_message "✅ Todas as dependências estão instaladas"
    return 0
}

# Função para verificar configuração do Docker
check_docker_config() {
    if ! command_exists docker; then
        print_error "❌ Docker não encontrado"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "❌ Docker não está rodando ou você não tem permissão"
        
        if is_windows; then
            print_info "💡 Para Windows:"
            echo "   1. Inicie o Docker Desktop"
            echo "   2. Execute Git Bash como administrador"
            echo "   3. Ou adicione seu usuário ao grupo docker-users"
        else
            print_info "💡 Para Linux:"
            echo "   sudo usermod -aG docker $USER"
            echo "   newgrp docker"
        fi
        
        return 1
    fi
    
    print_message "✅ Docker está funcionando corretamente"
    return 0
}

# Função para mostrar informações do ambiente
show_environment_info() {
    echo ""
    print_info "🔍 INFORMAÇÕES DO AMBIENTE:"
    echo ""
    echo "Sistema Operacional: $(detect_os)"
    echo "Shell: $SHELL"
    echo "Diretório atual: $(pwd)"
    echo "Usuário: $(whoami)"
    
    if is_wsl; then
        echo "WSL: Sim"
    fi
    
    if is_windows; then
        echo "Windows: Sim"
    fi
    
    echo ""
    print_info "📋 COMANDOS DISPONÍVEIS:"
    echo ""
    
    local commands=("docker" "docker-compose" "git" "find" "bc" "sudo" "chmod")
    for cmd in "${commands[@]}"; do
        if command_exists "$cmd"; then
            echo "✅ $cmd"
        else
            echo "❌ $cmd"
        fi
    done
}

# Função principal
main() {
    print_message "🔧 VERIFICANDO COMPATIBILIDADE DO AMBIENTE"
    echo ""
    
    # Verificar se estamos no diretório correto
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Execute este script no diretório raiz do projeto"
        echo "   Diretório atual: $(pwd)"
        return 1
    fi
    
    # Configurar compatibilidade Windows
    setup_windows_compatibility
    
    # Verificar dependências
    if ! check_dependencies; then
        return 1
    fi
    
    # Verificar Docker
    if ! check_docker_config; then
        return 1
    fi
    
    # Mostrar informações do ambiente
    show_environment_info
    
    # Mostrar orientações específicas do Windows
    show_windows_guidance
    
    print_message "✅ VERIFICAÇÃO DE COMPATIBILIDADE CONCLUÍDA"
    echo ""
    print_info "🎉 Seu ambiente está pronto para executar os scripts!"
}

# Executar função principal se o script for executado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
