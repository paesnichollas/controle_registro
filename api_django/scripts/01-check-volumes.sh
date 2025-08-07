#!/bin/bash

# =============================================================================
# SCRIPT: 01-check-volumes.sh
# DESCRIÇÃO: Verifica se há volumes anônimos em uso e sugere conversão para volumes nomeados
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Função para verificar se o Docker está rodando
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_message $RED "ERRO: Docker não está rodando ou não tem permissões"
        exit 1
    fi
}

# Função para verificar se o docker-compose está disponível
check_docker_compose() {
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_message $RED "ERRO: docker-compose não está instalado"
        exit 1
    fi
}

# Função para verificar volumes anônimos
check_anonymous_volumes() {
    print_message $BLUE "🔍 Verificando volumes anônimos..."
    
    # Lista todos os containers rodando
    local containers=$(docker ps --format "{{.Names}}")
    local anonymous_volumes_found=false
    
    for container in $containers; do
        print_message $BLUE "Verificando container: $container"
        
        # Obtém informações dos volumes do container
        local volumes=$(docker inspect "$container" --format='{{range .Mounts}}{{.Type}}|{{.Source}}|{{.Destination}}{{println}}{{end}}')
        
        while IFS='|' read -r type source destination; do
            if [[ "$type" == "volume" && "$source" == "" ]]; then
                print_message $YELLOW "⚠️  VOLUME ANÔNIMO ENCONTRADO:"
                print_message $YELLOW "   Container: $container"
                print_message $YELLOW "   Destino: $destination"
                anonymous_volumes_found=true
            fi
        done <<< "$volumes"
    done
    
    if [[ "$anonymous_volumes_found" == "false" ]]; then
        print_message $GREEN "✅ Nenhum volume anônimo encontrado!"
    fi
}

# Função para verificar volumes no docker-compose
check_compose_volumes() {
    print_message $BLUE "🔍 Verificando configuração de volumes no docker-compose..."
    
    local compose_files=("docker-compose.yml" "docker-compose.prod.yml" "docker-compose.dev.yml")
    local volumes_section_found=false
    
    for file in "${compose_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_message $BLUE "Verificando arquivo: $file"
            
            # Verifica se há seção volumes
            if grep -q "^volumes:" "$file"; then
                volumes_section_found=true
                print_message $GREEN "✅ Seção 'volumes' encontrada em $file"
                
                # Lista os volumes nomeados
                local named_volumes=$(grep -A 20 "^volumes:" "$file" | grep -E "^  [a-zA-Z_][a-zA-Z0-9_]*:" | sed 's/^  //' | sed 's/:$//')
                
                if [[ -n "$named_volumes" ]]; then
                    print_message $GREEN "📋 Volumes nomeados encontrados:"
                    echo "$named_volumes" | while read volume; do
                        print_message $GREEN "   - $volume"
                    done
                fi
            else
                print_message $YELLOW "⚠️  Seção 'volumes' não encontrada em $file"
            fi
        fi
    done
    
    if [[ "$volumes_section_found" == "false" ]]; then
        print_message $RED "❌ Nenhum arquivo docker-compose com seção 'volumes' encontrado!"
    fi
}

# Função para sugerir melhorias
suggest_improvements() {
    print_message $BLUE "💡 SUGESTÕES DE MELHORIAS:"
    echo
    print_message $YELLOW "1. SEMPRE use volumes nomeados em produção:"
    echo "   volumes:"
    echo "     - nome_do_volume:/caminho/container"
    echo
    print_message $YELLOW "2. Evite volumes anônimos:"
    echo "   # ❌ RUIM"
    echo "   volumes:"
    echo "     - /caminho/host:/caminho/container"
    echo "     - /caminho/container  # Volume anônimo!"
    echo
    print_message $YELLOW "3. Use volumes nomeados para persistência:"
    echo "   # ✅ BOM"
    echo "   volumes:"
    echo "     - postgres_data:/var/lib/postgresql/data"
    echo "     - media_files:/app/media"
    echo "     - static_files:/app/staticfiles"
    echo
    print_message $YELLOW "4. Configure backup para volumes nomeados:"
    echo "   # Exemplo de backup"
    echo "   docker run --rm -v postgres_data:/data -v /backup:/backup alpine tar czf /backup/postgres_data.tar.gz -C /data ."
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO VERIFICAÇÃO DE VOLUMES"
    echo
    
    # Verificações iniciais
    check_docker
    check_docker_compose
    
    # Executa verificações
    check_anonymous_volumes
    echo
    check_compose_volumes
    echo
    
    # Sugestões
    suggest_improvements
    
    print_message $GREEN "✅ Verificação de volumes concluída!"
}

# Executa o script
main "$@" 