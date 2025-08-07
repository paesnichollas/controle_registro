#!/bin/bash

# Script de backup para VPS Hostinger
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
    echo -e "${BLUE}  Controle Registro - Backup${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se o arquivo .env existe
check_env_file() {
    if [ ! -f ".env" ]; then
        print_error "Arquivo .env não encontrado!"
        exit 1
    fi
    
    print_message "Arquivo .env encontrado!"
}

# Verificar se Docker está rodando
check_docker() {
    print_message "Verificando Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker não está rodando."
        exit 1
    fi
    
    print_message "Docker está rodando!"
}

# Criar diretório de backup se não existir
create_backup_dir() {
    print_message "Criando diretório de backup..."
    mkdir -p backups
    print_message "Diretório de backup criado!"
}

# Backup do banco de dados
backup_database() {
    print_message "Fazendo backup do banco de dados..."
    
    if docker-compose -f docker-compose.vps.yml ps db | grep -q "Up"; then
        BACKUP_FILE="backup_db_$(date +%Y%m%d_%H%M%S).sql"
        BACKUP_PATH="backups/$BACKUP_FILE"
        
        docker-compose -f docker-compose.vps.yml exec -T db pg_dump -U postgres controle_registro_prod > "$BACKUP_PATH"
        
        if [ $? -eq 0 ]; then
            print_message "✅ Backup do banco salvo em: $BACKUP_PATH"
            
            # Comprimir backup
            gzip "$BACKUP_PATH"
            print_message "✅ Backup comprimido: ${BACKUP_PATH}.gz"
        else
            print_error "❌ Erro ao fazer backup do banco"
            return 1
        fi
    else
        print_error "❌ Banco de dados não está rodando"
        return 1
    fi
}

# Backup dos arquivos de mídia
backup_media() {
    print_message "Fazendo backup dos arquivos de mídia..."
    
    if docker-compose -f docker-compose.vps.yml ps backend | grep -q "Up"; then
        MEDIA_BACKUP_FILE="backup_media_$(date +%Y%m%d_%H%M%S).tar.gz"
        MEDIA_BACKUP_PATH="backups/$MEDIA_BACKUP_FILE"
        
        docker-compose -f docker-compose.vps.yml exec -T backend tar -czf /tmp/media_backup.tar.gz -C /app media/
        docker cp $(docker-compose -f docker-compose.vps.yml ps -q backend):/tmp/media_backup.tar.gz "$MEDIA_BACKUP_PATH"
        
        if [ $? -eq 0 ]; then
            print_message "✅ Backup de mídia salvo em: $MEDIA_BACKUP_PATH"
        else
            print_error "❌ Erro ao fazer backup de mídia"
            return 1
        fi
    else
        print_warning "⚠️ Backend não está rodando, pulando backup de mídia"
    fi
}

# Backup dos arquivos estáticos
backup_static() {
    print_message "Fazendo backup dos arquivos estáticos..."
    
    if docker-compose -f docker-compose.vps.yml ps backend | grep -q "Up"; then
        STATIC_BACKUP_FILE="backup_static_$(date +%Y%m%d_%H%M%S).tar.gz"
        STATIC_BACKUP_PATH="backups/$STATIC_BACKUP_FILE"
        
        docker-compose -f docker-compose.vps.yml exec -T backend tar -czf /tmp/static_backup.tar.gz -C /app staticfiles/
        docker cp $(docker-compose -f docker-compose.vps.yml ps -q backend):/tmp/static_backup.tar.gz "$STATIC_BACKUP_PATH"
        
        if [ $? -eq 0 ]; then
            print_message "✅ Backup de estáticos salvo em: $STATIC_BACKUP_PATH"
        else
            print_error "❌ Erro ao fazer backup de estáticos"
            return 1
        fi
    else
        print_warning "⚠️ Backend não está rodando, pulando backup de estáticos"
    fi
}

# Backup das configurações
backup_config() {
    print_message "Fazendo backup das configurações..."
    
    CONFIG_BACKUP_FILE="backup_config_$(date +%Y%m%d_%H%M%S).tar.gz"
    CONFIG_BACKUP_PATH="backups/$CONFIG_BACKUP_FILE"
    
    tar -czf "$CONFIG_BACKUP_PATH" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='backups' \
        --exclude='logs' \
        --exclude='media' \
        --exclude='staticfiles' \
        --exclude='ssl' \
        .env \
        docker-compose.vps.yml \
        nginx/ \
        scripts/ \
        api_django/ \
        frontend_react/
    
    if [ $? -eq 0 ]; then
        print_message "✅ Backup de configurações salvo em: $CONFIG_BACKUP_PATH"
    else
        print_error "❌ Erro ao fazer backup de configurações"
        return 1
    fi
}

# Limpar backups antigos
cleanup_old_backups() {
    print_message "Limpando backups antigos..."
    
    # Obter período de retenção do .env ou usar padrão
    RETENTION_DAYS=$(grep BACKUP_RETENTION_DAYS .env | cut -d'=' -f2 || echo "30")
    
    print_message "Removendo backups mais antigos que $RETENTION_DAYS dias..."
    
    # Remover backups antigos
    find backups/ -name "backup_*" -type f -mtime +$RETENTION_DAYS -delete
    
    print_message "✅ Limpeza de backups concluída!"
}

# Verificar espaço em disco
check_disk_space() {
    print_message "Verificando espaço em disco..."
    
    DISK_USAGE=$(df -h backups/ | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt 80 ]; then
        print_warning "⚠️ Uso de disco alto: ${DISK_USAGE}%"
        print_warning "Considere limpar backups antigos ou aumentar espaço em disco"
    else
        print_message "✅ Uso de disco OK: ${DISK_USAGE}%"
    fi
}

# Mostrar informações dos backups
show_backup_info() {
    print_message "Informações dos backups:"
    echo ""
    
    # Contar backups por tipo
    DB_BACKUPS=$(find backups/ -name "backup_db_*.sql.gz" | wc -l)
    MEDIA_BACKUPS=$(find backups/ -name "backup_media_*.tar.gz" | wc -l)
    STATIC_BACKUPS=$(find backups/ -name "backup_static_*.tar.gz" | wc -l)
    CONFIG_BACKUPS=$(find backups/ -name "backup_config_*.tar.gz" | wc -l)
    
    echo "  📊 Backups de banco: $DB_BACKUPS"
    echo "  📁 Backups de mídia: $MEDIA_BACKUPS"
    echo "  🎨 Backups de estáticos: $STATIC_BACKUPS"
    echo "  ⚙️ Backups de configuração: $CONFIG_BACKUPS"
    echo ""
    
    # Mostrar tamanho total dos backups
    TOTAL_SIZE=$(du -sh backups/ | cut -f1)
    echo "  💾 Tamanho total: $TOTAL_SIZE"
    echo ""
    
    # Mostrar backups mais recentes
    print_message "Backups mais recentes:"
    ls -lh backups/backup_* | head -5 | while read line; do
        echo "  📄 $line"
    done
}

# Função principal
main() {
    print_header
    
    check_env_file
    check_docker
    create_backup_dir
    
    # Fazer backups
    backup_database
    backup_media
    backup_static
    backup_config
    
    # Limpeza e verificação
    cleanup_old_backups
    check_disk_space
    show_backup_info
    
    print_message "Backup concluído com sucesso! 🎉"
}

# Executar função principal
main "$@"
