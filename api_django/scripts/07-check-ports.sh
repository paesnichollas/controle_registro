#!/bin/bash

# =============================================================================
# SCRIPT: 07-check-ports.sh
# DESCRIÇÃO: Verifica conflitos de portas e containers rodando em portas repetidas
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# USO: ./07-check-ports.sh [--fix] [--kill-conflicts]
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
COMPOSE_FILE="docker-compose.yml"
LOG_FILE="/var/log/port_check.log"

# Portas essenciais do projeto
ESSENTIAL_PORTS=(
    "80"    # Frontend
    "8000"  # Backend Django
    "5432"  # PostgreSQL
    "6379"  # Redis
)

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Função para log
log_message() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message" >> "$LOG_FILE"
}

# Função para verificar dependências
check_dependencies() {
    print_message $BLUE "🔍 Verificando dependências..."
    
    # Verifica Docker
    if ! command -v docker >/dev/null 2>&1; then
        print_message $RED "ERRO: Docker não está instalado"
        exit 1
    fi
    
    # Verifica docker-compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_message $RED "ERRO: docker-compose não está instalado"
        exit 1
    fi
    
    # Verifica netstat ou ss
    if ! command -v netstat >/dev/null 2>&1 && ! command -v ss >/dev/null 2>&1; then
        print_message $RED "ERRO: netstat ou ss não estão instalados"
        exit 1
    fi
    
    print_message $GREEN "✅ Dependências verificadas"
}

# Função para obter portas em uso
get_used_ports() {
    local ports=()
    
    # Usa ss se disponível, senão netstat
    if command -v ss >/dev/null 2>&1; then
        ports=($(ss -tln | grep -E ":(80|8000|5432|6379|8080|8001|5433)" | awk '{print $4}' | cut -d':' -f2 | sort -u))
    else
        ports=($(netstat -tln | grep -E ":(80|8000|5432|6379|8080|8001|5433)" | awk '{print $4}' | cut -d':' -f2 | sort -u))
    fi
    
    echo "${ports[@]}"
}

# Função para verificar portas do docker-compose
check_compose_ports() {
    print_message $BLUE "🐳 Verificando portas do docker-compose..."
    
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        print_message $RED "❌ Arquivo $COMPOSE_FILE não encontrado"
        return 1
    fi
    
    local compose_ports=()
    local port_conflicts=()
    
    # Extrai portas do docker-compose
    while IFS=':' read -r host_port container_port; do
        if [[ -n "$host_port" && "$host_port" =~ ^[0-9]+$ ]]; then
            compose_ports+=("$host_port")
        fi
    done < <(grep -E "ports:" -A 10 "$COMPOSE_FILE" | grep -E "[0-9]+:[0-9]+" | sed 's/.*"\([0-9]\+\):[0-9]\+".*/\1/')
    
    print_message $BLUE "📋 Portas configuradas no docker-compose: ${compose_ports[*]}"
    
    # Verifica se há conflitos
    for port in "${compose_ports[@]}"; do
        if [[ $(get_used_ports | grep -c "$port") -gt 1 ]]; then
            port_conflicts+=("$port")
        fi
    done
    
    if [[ ${#port_conflicts[@]} -gt 0 ]]; then
        print_message $RED "❌ Conflitos de porta encontrados: ${port_conflicts[*]}"
        return 1
    else
        print_message $GREEN "✅ Nenhum conflito de porta no docker-compose"
        return 0
    fi
}

# Função para verificar containers rodando
check_running_containers() {
    print_message $BLUE "🐳 Verificando containers rodando..."
    
    local containers=$(docker ps --format "{{.Names}}|{{.Ports}}")
    local port_usage=()
    
    while IFS='|' read -r name ports; do
        if [[ -n "$ports" ]]; then
            # Extrai portas do container
            local container_ports=$(echo "$ports" | grep -o '[0-9]\+->[0-9]\+' | cut -d'>' -f1)
            
            for port in $container_ports; do
                port_usage+=("$port:$name")
            done
        fi
    done <<< "$containers"
    
    # Verifica duplicatas
    local duplicates=()
    for port_usage_item in "${port_usage[@]}"; do
        local port=$(echo "$port_usage_item" | cut -d':' -f1)
        local count=$(echo "${port_usage[@]}" | tr ' ' '\n' | grep -c "^$port:")
        
        if [[ "$count" -gt 1 ]]; then
            duplicates+=("$port_usage_item")
        fi
    done
    
    if [[ ${#duplicates[@]} -gt 0 ]]; then
        print_message $RED "❌ Containers usando a mesma porta:"
        for duplicate in "${duplicates[@]}"; do
            print_message $RED "   $duplicate"
        done
        return 1
    else
        print_message $GREEN "✅ Nenhum conflito entre containers"
        return 0
    fi
}

# Função para verificar portas do sistema
check_system_ports() {
    print_message $BLUE "🖥️  Verificando portas do sistema..."
    
    local used_ports=$(get_used_ports)
    local conflicts=()
    
    for essential_port in "${ESSENTIAL_PORTS[@]}"; do
        local count=$(echo "$used_ports" | tr ' ' '\n' | grep -c "^$essential_port$")
        
        if [[ "$count" -gt 1 ]]; then
            conflicts+=("$essential_port")
        fi
    done
    
    if [[ ${#conflicts[@]} -gt 0 ]]; then
        print_message $RED "❌ Conflitos de porta do sistema: ${conflicts[*]}"
        return 1
    else
        print_message $GREEN "✅ Nenhum conflito de porta do sistema"
        return 0
    fi
}

# Função para verificar portas específicas
check_specific_ports() {
    print_message $BLUE "🎯 Verificando portas específicas..."
    
    local port_status=0
    
    for port in "${ESSENTIAL_PORTS[@]}"; do
        print_message $BLUE "🔍 Verificando porta $port..."
        
        # Verifica se a porta está em uso
        if command -v ss >/dev/null 2>&1; then
            local in_use=$(ss -tln | grep -c ":$port ")
        else
            local in_use=$(netstat -tln | grep -c ":$port ")
        fi
        
        if [[ "$in_use" -gt 0 ]]; then
            # Identifica o que está usando a porta
            local process_info=""
            if command -v lsof >/dev/null 2>&1; then
                process_info=$(lsof -i :$port 2>/dev/null | head -2 | tail -1)
            fi
            
            print_message $GREEN "✅ Porta $port está em uso"
            if [[ -n "$process_info" ]]; then
                print_message $BLUE "   Processo: $process_info"
            fi
        else
            print_message $YELLOW "⚠️  Porta $port não está em uso"
            port_status=1
        fi
    done
    
    return $port_status
}

# Função para verificar conectividade das portas
check_port_connectivity() {
    print_message $BLUE "🌐 Testando conectividade das portas..."
    
    local connectivity_issues=0
    
    # Testa porta 80 (HTTP)
    if curl -f -s http://localhost:80 >/dev/null 2>&1; then
        print_message $GREEN "✅ Porta 80 (HTTP) - OK"
    else
        print_message $RED "❌ Porta 80 (HTTP) - FALHOU"
        connectivity_issues=1
    fi
    
    # Testa porta 8000 (Django)
    if curl -f -s http://localhost:8000 >/dev/null 2>&1; then
        print_message $GREEN "✅ Porta 8000 (Django) - OK"
    else
        print_message $RED "❌ Porta 8000 (Django) - FALHOU"
        connectivity_issues=1
    fi
    
    # Testa porta 5432 (PostgreSQL)
    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d controle_os -c "SELECT 1;" >/dev/null 2>&1; then
            print_message $GREEN "✅ Porta 5432 (PostgreSQL) - OK"
        else
            print_message $RED "❌ Porta 5432 (PostgreSQL) - FALHOU"
            connectivity_issues=1
        fi
    else
        print_message $YELLOW "⚠️  psql não disponível, pulando teste PostgreSQL"
    fi
    
    # Testa porta 6379 (Redis)
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
            print_message $GREEN "✅ Porta 6379 (Redis) - OK"
        else
            print_message $RED "❌ Porta 6379 (Redis) - FALHOU"
            connectivity_issues=1
        fi
    else
        print_message $YELLOW "⚠️  redis-cli não disponível, pulando teste Redis"
    fi
    
    return $connectivity_issues
}

# Função para matar processos conflitantes
kill_conflicting_processes() {
    if [[ "${2:-}" == "--kill-conflicts" ]]; then
        print_message $BLUE "💀 Matando processos conflitantes..."
        
        local killed_count=0
        
        for port in "${ESSENTIAL_PORTS[@]}"; do
            # Encontra processos usando a porta
            local pids=()
            if command -v lsof >/dev/null 2>&1; then
                pids=($(lsof -ti :$port 2>/dev/null))
            fi
            
            if [[ ${#pids[@]} -gt 1 ]]; then
                print_message $YELLOW "⚠️  Múltiplos processos na porta $port: ${pids[*]}"
                
                # Mata todos exceto o primeiro (assumindo que é o principal)
                for ((i=1; i<${#pids[@]}; i++)); do
                    local pid="${pids[$i]}"
                    print_message $BLUE "   Matando processo $pid"
                    kill -9 "$pid" 2>/dev/null && killed_count=$((killed_count + 1))
                done
            fi
        done
        
        if [[ "$killed_count" -gt 0 ]]; then
            print_message $GREEN "✅ $killed_count processos conflitantes mortos"
        else
            print_message $YELLOW "⚠️  Nenhum processo conflitante encontrado"
        fi
    fi
}

# Função para corrigir configurações
fix_port_configurations() {
    if [[ "${1:-}" == "--fix" ]]; then
        print_message $BLUE "🔧 Tentando corrigir configurações de porta..."
        
        local fixed=0
        
        # Verifica se há containers parados que podem estar causando conflitos
        local stopped_containers=$(docker ps -a --filter "status=exited" --format "{{.Names}}")
        
        if [[ -n "$stopped_containers" ]]; then
            print_message $BLUE "🧹 Removendo containers parados..."
            echo "$stopped_containers" | xargs -r docker rm
            fixed=1
        fi
        
        # Verifica se há redes Docker órfãs
        local orphan_networks=$(docker network ls --filter "dangling=true" --format "{{.ID}}")
        
        if [[ -n "$orphan_networks" ]]; then
            print_message $BLUE "🧹 Removendo redes órfãs..."
            echo "$orphan_networks" | xargs -r docker network rm
            fixed=1
        fi
        
        if [[ "$fixed" -eq 1 ]]; then
            print_message $GREEN "✅ Configurações corrigidas"
        else
            print_message $YELLOW "⚠️  Nenhuma correção necessária"
        fi
    fi
}

# Função para gerar relatório
generate_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="/tmp/port_check_report_$timestamp.txt"
    
    print_message $BLUE "📊 Gerando relatório de portas..."
    
    {
        echo "=== RELATÓRIO DE VERIFICAÇÃO DE PORTAS ==="
        echo "Data/Hora: $(date)"
        echo ""
        echo "=== PORTAS EM USO ==="
        if command -v ss >/dev/null 2>&1; then
            ss -tln | grep -E ":(80|8000|5432|6379|8080|8001|5433)"
        else
            netstat -tln | grep -E ":(80|8000|5432|6379|8080|8001|5433)"
        fi
        echo ""
        echo "=== CONTAINERS RODANDO ==="
        docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
        echo ""
        echo "=== PROCESSOS POR PORTA ==="
        for port in "${ESSENTIAL_PORTS[@]}"; do
            echo "Porta $port:"
            if command -v lsof >/dev/null 2>&1; then
                lsof -i :$port 2>/dev/null || echo "  Nenhum processo encontrado"
            fi
            echo ""
        done
        echo "=== SUGESTÕES ==="
        echo "1. Sempre use portas diferentes para diferentes serviços"
        echo "2. Verifique se não há containers órfãos"
        echo "3. Use docker-compose down para limpar completamente"
        echo "4. Verifique se não há outros serviços usando as mesmas portas"
    } > "$report_file"
    
    print_message $GREEN "✅ Relatório salvo em: $report_file"
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO VERIFICAÇÃO DE PORTAS"
    echo
    
    # Verificações iniciais
    check_dependencies
    echo
    
    # Executa verificações
    local overall_status=0
    
    check_compose_ports || overall_status=1
    echo
    check_running_containers || overall_status=1
    echo
    check_system_ports || overall_status=1
    echo
    check_specific_ports || overall_status=1
    echo
    check_port_connectivity || overall_status=1
    echo
    
    # Correções
    kill_conflicting_processes "$@"
    echo
    fix_port_configurations "$@"
    echo
    
    # Relatório final
    generate_report
    echo
    
    if [[ "$overall_status" -eq 0 ]]; then
        print_message $GREEN "✅ TODAS AS VERIFICAÇÕES DE PORTA PASSARAM!"
        log_message "Verificação de portas: TODAS PASSARAM"
    else
        print_message $RED "❌ PROBLEMAS DE PORTA ENCONTRADOS!"
        log_message "Verificação de portas: PROBLEMAS ENCONTRADOS"
    fi
}

# Executa o script
main "$@" 