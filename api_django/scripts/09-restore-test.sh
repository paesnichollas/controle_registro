#!/bin/bash

# =============================================================================
# SCRIPT: 09-restore-test.sh
# DESCRIÇÃO: Teste de restore completo do banco e mídia em ambiente limpo
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# USO: ./09-restore-test.sh [backup_file] [--clean]
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
BACKUP_DIR="/backups"
TEST_DIR="/tmp/restore_test_$(date +%Y%m%d_%H%M%S)"
COMPOSE_FILE="docker-compose.yml"
TEST_COMPOSE_FILE="$TEST_DIR/docker-compose.test.yml"

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
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
    
    # Verifica se há backups disponíveis
    if [[ ! -d "$BACKUP_DIR" ]]; then
        print_message $RED "ERRO: Diretório de backup $BACKUP_DIR não encontrado"
        exit 1
    fi
    
    print_message $GREEN "✅ Dependências verificadas"
}

# Função para selecionar arquivo de backup
select_backup_file() {
    local backup_file="$1"
    
    if [[ -n "$backup_file" ]]; then
        if [[ -f "$backup_file" ]]; then
            print_message $GREEN "✅ Arquivo de backup selecionado: $backup_file"
            echo "$backup_file"
            return
        else
            print_message $RED "ERRO: Arquivo de backup não encontrado: $backup_file"
            exit 1
        fi
    fi
    
    # Lista backups disponíveis
    print_message $BLUE "📋 Backups disponíveis:"
    local backups=($(find "$BACKUP_DIR" -name "*.sql" -o -name "*.tar.gz" | sort -r))
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        print_message $RED "ERRO: Nenhum backup encontrado em $BACKUP_DIR"
        exit 1
    fi
    
    # Mostra os 10 backups mais recentes
    for i in "${!backups[@]}"; do
        if [[ $i -lt 10 ]]; then
            local filename=$(basename "${backups[$i]}")
            local size=$(du -h "${backups[$i]}" | cut -f1)
            local date=$(stat -c %y "${backups[$i]}" | cut -d' ' -f1)
            echo "$((i+1)). $filename ($size, $date)"
        fi
    done
    
    # Solicita seleção
    read -p "Selecione o número do backup (1-${#backups[@]}): " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [[ $selection -ge 1 ]] && [[ $selection -le ${#backups[@]} ]]; then
        local selected_file="${backups[$((selection-1))]}"
        print_message $GREEN "✅ Backup selecionado: $selected_file"
        echo "$selected_file"
    else
        print_message $RED "ERRO: Seleção inválida"
        exit 1
    fi
}

# Função para preparar ambiente de teste
prepare_test_environment() {
    print_message $BLUE "🔧 Preparando ambiente de teste..."
    
    # Cria diretório de teste
    mkdir -p "$TEST_DIR"
    print_message $GREEN "✅ Diretório de teste criado: $TEST_DIR"
    
    # Copia arquivos necessários
    cp "$COMPOSE_FILE" "$TEST_COMPOSE_FILE"
    cp .env "$TEST_DIR/.env" 2>/dev/null || print_message $YELLOW "⚠️  Arquivo .env não encontrado"
    
    # Modifica docker-compose para teste
    sed -i 's/8000:8000/8001:8000/g' "$TEST_COMPOSE_FILE"  # Muda porta
    sed -i 's/80:80/8080:80/g' "$TEST_COMPOSE_FILE"         # Muda porta frontend
    sed -i 's/5432:5432/5433:5432/g' "$TEST_COMPOSE_FILE"   # Muda porta banco
    
    print_message $GREEN "✅ Ambiente de teste preparado"
}

# Função para limpar ambiente anterior
clean_previous_test() {
    if [[ "${2:-}" == "--clean" ]]; then
        print_message $BLUE "🧹 Limpando testes anteriores..."
        
        # Para e remove containers de teste
        docker-compose -f "$TEST_COMPOSE_FILE" down -v 2>/dev/null || true
        
        # Remove volumes de teste
        docker volume ls --format "{{.Name}}" | grep "test" | xargs -r docker volume rm
        
        # Remove diretório de teste
        rm -rf "$TEST_DIR"
        
        print_message $GREEN "✅ Limpeza concluída"
    fi
}

# Função para restaurar banco de dados
restore_database() {
    local backup_file="$1"
    
    if [[ "$backup_file" == *.sql ]]; then
        print_message $BLUE "🗄️  Restaurando banco de dados..."
        
        # Inicia apenas o banco de dados
        cd "$TEST_DIR"
        docker-compose -f "$TEST_COMPOSE_FILE" up -d db
        
        # Aguarda banco estar pronto
        print_message $BLUE "⏳ Aguardando banco de dados estar pronto..."
        sleep 10
        
        # Restaura o backup
        if docker-compose -f "$TEST_COMPOSE_FILE" exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS controle_os;" && \
           docker-compose -f "$TEST_COMPOSE_FILE" exec -T db psql -U postgres -c "CREATE DATABASE controle_os;" && \
           docker-compose -f "$TEST_COMPOSE_FILE" exec -T db psql -U postgres controle_os < "$backup_file"; then
            print_message $GREEN "✅ Banco de dados restaurado com sucesso"
        else
            print_message $RED "❌ ERRO: Falha na restauração do banco de dados"
            return 1
        fi
    else
        print_message $YELLOW "⚠️  Arquivo não é um backup SQL: $backup_file"
    fi
}

# Função para restaurar mídia
restore_media() {
    local backup_file="$1"
    
    if [[ "$backup_file" == *.tar.gz ]]; then
        print_message $BLUE "📁 Restaurando pasta media..."
        
        # Inicia container temporário para restaurar
        docker run --rm -v "$backup_file:/backup.tar.gz" -v "test_media_files:/media" alpine sh -c "
            tar -xzf /backup.tar.gz -C /media --strip-components=3 app/media/
        "
        
        print_message $GREEN "✅ Pasta media restaurada"
    else
        print_message $YELLOW "⚠️  Arquivo não é um backup de mídia: $backup_file"
    fi
}

# Função para testar aplicação
test_application() {
    print_message $BLUE "🧪 Testando aplicação restaurada..."
    
    cd "$TEST_DIR"
    
    # Inicia todos os serviços
    docker-compose -f "$TEST_COMPOSE_FILE" up -d
    
    # Aguarda serviços estarem prontos
    print_message $BLUE "⏳ Aguardando serviços estarem prontos..."
    sleep 30
    
    # Testa endpoints principais
    local tests=(
        "http://localhost:8001/admin/"
        "http://localhost:8080/"
        "http://localhost:8001/api/"
    )
    
    local all_tests_passed=true
    
    for url in "${tests[@]}"; do
        print_message $BLUE "Testando: $url"
        
        if curl -f -s "$url" >/dev/null 2>&1; then
            print_message $GREEN "✅ $url - OK"
        else
            print_message $RED "❌ $url - FALHOU"
            all_tests_passed=false
        fi
    done
    
    # Testa conexão com banco
    if docker-compose -f "$TEST_COMPOSE_FILE" exec -T db psql -U postgres -d controle_os -c "SELECT COUNT(*) FROM information_schema.tables;" >/dev/null 2>&1; then
        print_message $GREEN "✅ Conexão com banco - OK"
    else
        print_message $RED "❌ Conexão com banco - FALHOU"
        all_tests_passed=false
    fi
    
    if [[ "$all_tests_passed" == "true" ]]; then
        print_message $GREEN "✅ TODOS OS TESTES PASSARAM!"
    else
        print_message $RED "❌ ALGUNS TESTES FALHARAM!"
        return 1
    fi
}

# Função para gerar relatório de teste
generate_test_report() {
    local backup_file="$1"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="$TEST_DIR/restore_test_report_$timestamp.txt"
    
    print_message $BLUE "📊 Gerando relatório de teste..."
    
    {
        echo "=== RELATÓRIO DE TESTE DE RESTORE ==="
        echo "Data/Hora: $(date)"
        echo "Backup testado: $backup_file"
        echo "Diretório de teste: $TEST_DIR"
        echo ""
        echo "=== CONTAINERS DE TESTE ==="
        docker-compose -f "$TEST_COMPOSE_FILE" ps
        echo ""
        echo "=== LOGS DOS CONTAINERS ==="
        docker-compose -f "$TEST_COMPOSE_FILE" logs --tail=50
        echo ""
        echo "=== ESPAÇO EM DISCO ==="
        df -h
        echo ""
        echo "=== VOLUMES DE TESTE ==="
        docker volume ls | grep test
    } > "$report_file"
    
    print_message $GREEN "✅ Relatório salvo em: $report_file"
}

# Função para limpeza final
cleanup_test() {
    print_message $BLUE "🧹 Limpando ambiente de teste..."
    
    cd "$TEST_DIR"
    docker-compose -f "$TEST_COMPOSE_FILE" down -v
    
    # Remove volumes de teste
    docker volume ls --format "{{.Name}}" | grep "test" | xargs -r docker volume rm
    
    print_message $GREEN "✅ Limpeza concluída"
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO TESTE DE RESTORE COMPLETO"
    echo
    
    # Verificações iniciais
    check_dependencies
    clean_previous_test "$@"
    
    # Seleciona arquivo de backup
    local backup_file=$(select_backup_file "$1")
    echo
    
    # Prepara ambiente
    prepare_test_environment
    echo
    
    # Executa restore baseado no tipo de arquivo
    if [[ "$backup_file" == *.sql ]]; then
        restore_database "$backup_file"
    elif [[ "$backup_file" == *.tar.gz ]]; then
        restore_media "$backup_file"
    fi
    echo
    
    # Testa aplicação
    test_application
    echo
    
    # Gera relatório
    generate_test_report "$backup_file"
    echo
    
    # Limpeza final
    cleanup_test
    
    print_message $GREEN "✅ TESTE DE RESTORE CONCLUÍDO!"
    print_message $BLUE "📁 Relatório salvo em: $TEST_DIR"
}

# Executa o script
main "$@" 