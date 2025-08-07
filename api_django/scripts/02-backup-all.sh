#!/bin/bash

# =============================================================================
# SCRIPT: 02-backup-all.sh
# DESCRIÇÃO: Backup automatizado do banco PostgreSQL e pasta media/
# AUTOR: Sistema de Automação
# DATA: $(date +%Y-%m-%d)
# USO: ./02-backup-all.sh [--upload] [--encrypt]
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
RETENTION_DAYS=30
MAX_BACKUP_SIZE_MB=1000
COMPOSE_FILE="docker-compose.yml"

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
    
    # Verifica se o arquivo docker-compose existe
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        print_message $RED "ERRO: Arquivo $COMPOSE_FILE não encontrado"
        exit 1
    fi
    
    print_message $GREEN "✅ Dependências verificadas"
}

# Função para criar diretório de backup
create_backup_dir() {
    print_message $BLUE "📁 Criando diretório de backup..."
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        print_message $GREEN "✅ Diretório $BACKUP_DIR criado"
    else
        print_message $GREEN "✅ Diretório $BACKUP_DIR já existe"
    fi
}

# Função para obter variáveis do ambiente
get_env_vars() {
    print_message $BLUE "🔧 Obtendo variáveis de ambiente..."
    
    # Carrega variáveis do .env se existir
    if [[ -f ".env" ]]; then
        export $(grep -v '^#' .env | xargs)
        print_message $GREEN "✅ Variáveis do .env carregadas"
    else
        print_message $YELLOW "⚠️  Arquivo .env não encontrado, usando valores padrão"
    fi
    
    # Define valores padrão se não estiverem definidos
    export POSTGRES_DB=${POSTGRES_DB:-controle_os}
    export POSTGRES_USER=${POSTGRES_USER:-postgres}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
    
    print_message $GREEN "✅ Variáveis de ambiente configuradas"
}

# Função para backup do banco de dados
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local db_backup_file="$BACKUP_DIR/db_backup_$timestamp.sql"
    
    print_message $BLUE "🗄️  Iniciando backup do banco de dados..."
    
    # Verifica se o container do banco está rodando
    if ! docker-compose -f "$COMPOSE_FILE" ps db | grep -q "Up"; then
        print_message $RED "ERRO: Container do banco de dados não está rodando"
        exit 1
    fi
    
    # Executa o backup
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$db_backup_file"; then
        print_message $GREEN "✅ Backup do banco salvo em: $db_backup_file"
        
        # Verifica tamanho do arquivo
        local file_size=$(stat -c%s "$db_backup_file" 2>/dev/null || stat -f%z "$db_backup_file")
        local file_size_mb=$((file_size / 1024 / 1024))
        print_message $BLUE "📊 Tamanho do backup: ${file_size_mb}MB"
        
        if [[ $file_size_mb -gt $MAX_BACKUP_SIZE_MB ]]; then
            print_message $YELLOW "⚠️  Backup muito grande (${file_size_mb}MB), considere otimizar"
        fi
    else
        print_message $RED "❌ ERRO: Falha no backup do banco de dados"
        exit 1
    fi
}

# Função para backup da pasta media
backup_media() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local media_backup_file="$BACKUP_DIR/media_backup_$timestamp.tar.gz"
    
    print_message $BLUE "📁 Iniciando backup da pasta media..."
    
    # Verifica se o container do backend está rodando
    if ! docker-compose -f "$COMPOSE_FILE" ps backend | grep -q "Up"; then
        print_message $RED "ERRO: Container do backend não está rodando"
        exit 1
    fi
    
    # Executa o backup da pasta media
    if docker-compose -f "$COMPOSE_FILE" exec -T backend tar -czf - /app/media > "$media_backup_file"; then
        print_message $GREEN "✅ Backup da media salvo em: $media_backup_file"
        
        # Verifica tamanho do arquivo
        local file_size=$(stat -c%s "$media_backup_file" 2>/dev/null || stat -f%z "$media_backup_file")
        local file_size_mb=$((file_size / 1024 / 1024))
        print_message $BLUE "📊 Tamanho do backup: ${file_size_mb}MB"
    else
        print_message $RED "❌ ERRO: Falha no backup da pasta media"
        exit 1
    fi
}

# Função para backup dos volumes Docker
backup_volumes() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    print_message $BLUE "📦 Iniciando backup dos volumes Docker..."
    
    # Lista volumes nomeados
    local volumes=$(docker volume ls --format "{{.Name}}" | grep -E "(postgres_data|media_files|static_files|redis_data)")
    
    for volume in $volumes; do
        local volume_backup_file="$BACKUP_DIR/volume_${volume}_$timestamp.tar.gz"
        print_message $BLUE "Backup do volume: $volume"
        
        if docker run --rm -v "$volume:/data" -v "$BACKUP_DIR:/backup" alpine tar -czf "/backup/volume_${volume}_$timestamp.tar.gz" -C /data .; then
            print_message $GREEN "✅ Backup do volume $volume salvo"
        else
            print_message $YELLOW "⚠️  Falha no backup do volume $volume"
        fi
    done
}

# Função para limpeza de backups antigos
cleanup_old_backups() {
    print_message $BLUE "🧹 Limpando backups antigos (mais de $RETENTION_DAYS dias)..."
    
    local deleted_count=0
    
    # Remove backups antigos
    find "$BACKUP_DIR" -name "*.sql" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    deleted_count=$(find "$BACKUP_DIR" -name "*.sql" -o -name "*.tar.gz" | wc -l)
    print_message $GREEN "✅ Limpeza concluída. $deleted_count arquivos de backup mantidos"
}

# Função para upload para nuvem (opcional)
upload_to_cloud() {
    if [[ "${1:-}" == "--upload" ]]; then
        print_message $BLUE "☁️  Iniciando upload para nuvem..."
        
        # Verifica se rclone está instalado
        if ! command -v rclone >/dev/null 2>&1; then
            print_message $YELLOW "⚠️  rclone não está instalado. Instale para upload automático:"
            echo "   curl https://rclone.org/install.sh | sudo bash"
            return
        fi
        
        # Verifica se há configuração do rclone
        if [[ ! -f ~/.config/rclone/rclone.conf ]]; then
            print_message $YELLOW "⚠️  rclone não configurado. Configure primeiro:"
            echo "   rclone config"
            return
        fi
        
        # Upload para Google Drive (exemplo)
        local remote_name="gdrive"
        local backup_folder="backups/$(date +%Y/%m)"
        
        print_message $BLUE "📤 Fazendo upload para $remote_name/$backup_folder..."
        
        if rclone copy "$BACKUP_DIR" "$remote_name:$backup_folder" --progress; then
            print_message $GREEN "✅ Upload concluído com sucesso"
        else
            print_message $YELLOW "⚠️  Falha no upload, mas backup local foi salvo"
        fi
    fi
}

# Função para criptografar backups (opcional)
encrypt_backups() {
    if [[ "${2:-}" == "--encrypt" ]]; then
        print_message $BLUE "🔐 Criptografando backups..."
        
        # Verifica se gpg está disponível
        if ! command -v gpg >/dev/null 2>&1; then
            print_message $YELLOW "⚠️  gpg não está instalado. Instale para criptografia:"
            echo "   sudo apt-get install gnupg"
            return
        fi
        
        # Criptografa arquivos de backup
        for file in "$BACKUP_DIR"/*.sql "$BACKUP_DIR"/*.tar.gz; do
            if [[ -f "$file" ]]; then
                print_message $BLUE "Criptografando: $(basename "$file")"
                gpg --encrypt --recipient "$(whoami)" "$file" 2>/dev/null || \
                print_message $YELLOW "⚠️  Falha na criptografia de $(basename "$file")"
            fi
        done
        
        print_message $GREEN "✅ Criptografia concluída"
    fi
}

# Função para gerar relatório
generate_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="$BACKUP_DIR/backup_report_$timestamp.txt"
    
    print_message $BLUE "📊 Gerando relatório de backup..."
    
    {
        echo "=== RELATÓRIO DE BACKUP ==="
        echo "Data/Hora: $(date)"
        echo "Sistema: $(uname -a)"
        echo "Diretório de backup: $BACKUP_DIR"
        echo ""
        echo "=== ARQUIVOS DE BACKUP ==="
        ls -lh "$BACKUP_DIR"/*.sql "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "Nenhum arquivo encontrado"
        echo ""
        echo "=== ESPAÇO EM DISCO ==="
        df -h "$BACKUP_DIR"
        echo ""
        echo "=== CONTAINERS RODANDO ==="
        docker-compose -f "$COMPOSE_FILE" ps
    } > "$report_file"
    
    print_message $GREEN "✅ Relatório salvo em: $report_file"
}

# Função principal
main() {
    print_message $BLUE "🚀 INICIANDO BACKUP COMPLETO DO SISTEMA"
    echo
    
    # Verificações iniciais
    check_dependencies
    create_backup_dir
    get_env_vars
    
    # Executa backups
    backup_database
    echo
    backup_media
    echo
    backup_volumes
    echo
    
    # Limpeza e upload
    cleanup_old_backups
    echo
    upload_to_cloud "$@"
    echo
    encrypt_backups "$@"
    echo
    
    # Relatório final
    generate_report
    
    print_message $GREEN "✅ BACKUP COMPLETO CONCLUÍDO COM SUCESSO!"
    print_message $BLUE "📁 Backups salvos em: $BACKUP_DIR"
}

# Executa o script
main "$@" 