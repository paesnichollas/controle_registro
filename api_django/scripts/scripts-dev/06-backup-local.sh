#!/bin/bash

# =============================================================================
# SCRIPT: 06-backup-local.sh
# DESCRIÇÃO: Backup automatizado do banco de dados e mídia
# USO: ./06-backup-local.sh [dev|prod]
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

# Verificar argumento
ENVIRONMENT=${1:-dev}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "❌ ERRO: Ambiente deve ser 'dev' ou 'prod'"
    echo "   Uso: ./06-backup-local.sh [dev|prod]"
    exit 1
fi

echo "💾 CRIANDO BACKUP LOCAL DO AMBIENTE $ENVIRONMENT..."
echo "=================================================="

# Definir arquivo compose baseado no ambiente
if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    BACKUP_DIR="backups/dev"
    DB_NAME="controle_os_dev"
else
    COMPOSE_FILE="docker-compose.yml"
    BACKUP_DIR="backups/prod"
    DB_NAME="controle_os"
fi

# Verificar se o arquivo existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Arquivo $COMPOSE_FILE não encontrado"
    exit 1
fi

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Gerar timestamp para o backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${ENVIRONMENT}_${TIMESTAMP}"

echo "📁 Diretório de backup: $BACKUP_DIR"
echo "📋 Nome do backup: $BACKUP_NAME"

# 1. VERIFICAR SE OS CONTAINERS ESTÃO RODANDO
echo ""
echo "🔍 VERIFICANDO CONTAINERS..."
echo "============================="

if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo "❌ Containers não estão rodando"
    echo "   Execute: ./04-subir-ambiente.sh $ENVIRONMENT"
    exit 1
fi

echo "✅ Containers estão rodando"

# 2. BACKUP DO BANCO DE DADOS
echo ""
echo "🗄️  CRIANDO BACKUP DO BANCO DE DADOS..."
echo "========================================"

# Verificar se o container do banco está rodando
if ! docker-compose -f "$COMPOSE_FILE" ps -q db >/dev/null 2>&1; then
    echo "❌ Container do banco não está rodando"
    exit 1
fi

# Obter credenciais do banco
DB_USER=$(grep "^POSTGRES_USER=" .env | cut -d'=' -f2 || echo "postgres")
DB_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env | cut -d'=' -f2 || echo "postgres")

echo "🔍 Configurações do banco:"
echo "   Usuário: $DB_USER"
echo "   Banco: $DB_NAME"
echo "   Arquivo: ${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Criar backup do banco
echo "📦 Criando dump do banco de dados..."
if docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "${BACKUP_DIR}/${BACKUP_NAME}.sql" 2>/tmp/db_error; then
    echo "✅ Backup do banco criado com sucesso"
    
    # Verificar tamanho do arquivo
    file_size=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.sql" | cut -f1)
    echo "   Tamanho: $file_size"
else
    echo "❌ ERRO no backup do banco:"
    cat /tmp/db_error
    exit 1
fi

# 3. BACKUP DA PASTA MEDIA
echo ""
echo "📁 CRIANDO BACKUP DA PASTA MEDIA..."
echo "===================================="

# Verificar se o container backend está rodando
if ! docker-compose -f "$COMPOSE_FILE" ps -q backend >/dev/null 2>&1; then
    echo "❌ Container backend não está rodando"
    exit 1
fi

# Criar backup da pasta media
echo "📦 Criando backup da pasta media..."
if docker-compose -f "$COMPOSE_FILE" exec -T backend tar -czf - /app/media > "${BACKUP_DIR}/${BACKUP_NAME}_media.tar.gz" 2>/tmp/media_error; then
    echo "✅ Backup da media criado com sucesso"
    
    # Verificar tamanho do arquivo
    file_size=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}_media.tar.gz" | cut -f1)
    echo "   Tamanho: $file_size"
else
    echo "❌ ERRO no backup da media:"
    cat /tmp/media_error
    exit 1
fi

# 4. BACKUP DO ARQUIVO .env
echo ""
echo "🔧 CRIANDO BACKUP DO ARQUIVO .env..."
echo "====================================="

if [ -f ".env" ]; then
    cp .env "${BACKUP_DIR}/${BACKUP_NAME}_env.txt"
    echo "✅ Backup do .env criado"
else
    echo "⚠️  Arquivo .env não encontrado"
fi

# 5. CRIAR ARQUIVO DE METADADOS
echo ""
echo "📋 CRIANDO METADADOS DO BACKUP..."
echo "=================================="

cat > "${BACKUP_DIR}/${BACKUP_NAME}_metadata.txt" << EOF
BACKUP METADATA
===============

Data/Hora: $(date)
Ambiente: $ENVIRONMENT
Compose File: $COMPOSE_FILE
Database: $DB_NAME
User: $DB_USER

ARQUIVOS:
- ${BACKUP_NAME}.sql (Database dump)
- ${BACKUP_NAME}_media.tar.gz (Media files)
- ${BACKUP_NAME}_env.txt (Environment variables)

SISTEMA:
- OS: $(uname -s)
- Kernel: $(uname -r)
- Docker: $(docker --version)
- Compose: $(docker-compose --version)

CONTAINERS:
$(docker-compose -f "$COMPOSE_FILE" ps)

VOLUMES:
$(docker volume ls | grep -E "(postgres|media|static)" || echo "Nenhum volume encontrado")

EOF

echo "✅ Metadados criados"

# 6. COMPRIMIR BACKUP COMPLETO
echo ""
echo "🗜️  COMPRIMINDO BACKUP COMPLETO..."
echo "=================================="

cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}_complete.tar.gz" \
    "${BACKUP_NAME}.sql" \
    "${BACKUP_NAME}_media.tar.gz" \
    "${BACKUP_NAME}_env.txt" \
    "${BACKUP_NAME}_metadata.txt"

if [ $? -eq 0 ]; then
    echo "✅ Backup completo comprimido"
    
    # Verificar tamanho do arquivo completo
    complete_size=$(du -h "${BACKUP_NAME}_complete.tar.gz" | cut -f1)
    echo "   Tamanho total: $complete_size"
    
    # Limpar arquivos individuais
    rm -f "${BACKUP_NAME}.sql" "${BACKUP_NAME}_media.tar.gz" "${BACKUP_NAME}_env.txt" "${BACKUP_NAME}_metadata.txt"
    echo "✅ Arquivos individuais removidos"
else
    echo "❌ ERRO ao comprimir backup"
    exit 1
fi

cd - > /dev/null

# 7. VERIFICAR INTEGRIDADE DO BACKUP
echo ""
echo "🔍 VERIFICANDO INTEGRIDADE DO BACKUP..."
echo "======================================="

# Verificar se o arquivo foi criado
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}_complete.tar.gz" ]; then
    echo "✅ Arquivo de backup criado"
    
    # Verificar se é um arquivo válido
    if tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}_complete.tar.gz" >/dev/null 2>&1; then
        echo "✅ Backup é um arquivo tar válido"
    else
        echo "❌ Backup corrompido"
        exit 1
    fi
else
    echo "❌ Arquivo de backup não foi criado"
    exit 1
fi

# 8. LIMPEZA DE BACKUPS ANTIGOS
echo ""
echo "🧹 LIMPANDO BACKUPS ANTIGOS..."
echo "==============================="

# Manter apenas os últimos 5 backups
backup_count=$(ls -1 "${BACKUP_DIR}"/*_complete.tar.gz 2>/dev/null | wc -l)
if [ "$backup_count" -gt 5 ]; then
    echo "🗑️  Removendo backups antigos (mantendo os 5 mais recentes)..."
    ls -t "${BACKUP_DIR}"/*_complete.tar.gz | tail -n +6 | xargs rm -f
    echo "✅ Limpeza concluída"
else
    echo "✅ Nenhum backup antigo para remover"
fi

# 9. RESUMO FINAL
echo ""
echo "🎉 BACKUP CONCLUÍDO COM SUCESSO!"
echo "================================="
echo ""
echo "📋 RESUMO:"
echo "   📁 Diretório: $BACKUP_DIR"
echo "   📦 Arquivo: ${BACKUP_NAME}_complete.tar.gz"
echo "   📊 Tamanho: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}_complete.tar.gz" | cut -f1)"
echo "   🕐 Data/Hora: $(date)"
echo ""
echo "📋 CONTEÚDO DO BACKUP:"
echo "   - Dump completo do banco de dados"
echo "   - Arquivos de mídia"
echo "   - Configurações do ambiente"
echo "   - Metadados do sistema"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   Listar backups: ls -la $BACKUP_DIR"
echo "   Restaurar: ./07-restore-local.sh $ENVIRONMENT ${BACKUP_NAME}_complete.tar.gz"
echo "   Ver conteúdo: tar -tzf ${BACKUP_DIR}/${BACKUP_NAME}_complete.tar.gz"
echo ""
echo "🚀 PRÓXIMO PASSO: Execute ./07-restore-local.sh para testar o backup"
echo ""
echo "💡 DICA: Para automatizar backups:"
echo "   Adicione ao crontab: 0 2 * * * /caminho/para/06-backup-local.sh prod" 