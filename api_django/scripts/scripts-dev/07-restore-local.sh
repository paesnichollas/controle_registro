#!/bin/bash

# =============================================================================
# SCRIPT: 07-restore-local.sh
# DESCRIÇÃO: Restaura backups locais do banco de dados e mídia
# USO: ./07-restore-local.sh [dev|prod] [arquivo_backup]
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

# Verificar argumentos
ENVIRONMENT=${1:-dev}
BACKUP_FILE=${2}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "❌ ERRO: Ambiente deve ser 'dev' ou 'prod'"
    echo "   Uso: ./07-restore-local.sh [dev|prod] [arquivo_backup]"
    exit 1
fi

echo "🔄 RESTAURANDO BACKUP LOCAL DO AMBIENTE $ENVIRONMENT..."
echo "====================================================="

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

# Se não foi especificado arquivo de backup, listar opções
if [ -z "$BACKUP_FILE" ]; then
    echo "📋 BACKUPS DISPONÍVEIS:"
    echo "========================"
    
    if [ -d "$BACKUP_DIR" ]; then
        backups=$(ls -1 "$BACKUP_DIR"/*_complete.tar.gz 2>/dev/null | sort -r)
        if [ -n "$backups" ]; then
            echo "$backups" | nl
            echo ""
            echo "💡 Para restaurar, execute:"
            echo "   ./07-restore-local.sh $ENVIRONMENT [número_do_backup]"
            echo ""
            echo "   Exemplo: ./07-restore-local.sh $ENVIRONMENT 1"
            exit 0
        else
            echo "❌ Nenhum backup encontrado em $BACKUP_DIR"
            echo "   Execute: ./06-backup-local.sh $ENVIRONMENT"
            exit 1
        fi
    else
        echo "❌ Diretório $BACKUP_DIR não encontrado"
        echo "   Execute: ./06-backup-local.sh $ENVIRONMENT"
        exit 1
    fi
fi

# Se foi passado um número, pegar o backup correspondente
if [[ "$BACKUP_FILE" =~ ^[0-9]+$ ]]; then
    backups=($(ls -1 "$BACKUP_DIR"/*_complete.tar.gz 2>/dev/null | sort -r))
    if [ -z "${backups[*]}" ]; then
        echo "❌ Nenhum backup encontrado"
        exit 1
    fi
    
    index=$((BACKUP_FILE - 1))
    if [ $index -ge 0 ] && [ $index -lt ${#backups[@]} ]; then
        BACKUP_FILE=$(basename "${backups[$index]}")
        echo "📦 Backup selecionado: $BACKUP_FILE"
    else
        echo "❌ Número de backup inválido"
        exit 1
    fi
fi

# Verificar se o arquivo de backup existe
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "❌ Arquivo de backup não encontrado: $BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

echo "📦 Arquivo de backup: $BACKUP_FILE"
echo "📁 Diretório: $BACKUP_DIR"

# 1. VERIFICAR INTEGRIDADE DO BACKUP
echo ""
echo "🔍 VERIFICANDO INTEGRIDADE DO BACKUP..."
echo "======================================="

if tar -tzf "$BACKUP_DIR/$BACKUP_FILE" >/dev/null 2>&1; then
    echo "✅ Backup é um arquivo tar válido"
else
    echo "❌ Backup corrompido ou inválido"
    exit 1
fi

# 2. CRIAR DIRETÓRIO TEMPORÁRIO
echo ""
echo "📁 PREPARANDO RESTAURAÇÃO..."
echo "============================="

TEMP_DIR="/tmp/restore_${ENVIRONMENT}_$(date +%s)"
mkdir -p "$TEMP_DIR"

echo "📂 Diretório temporário: $TEMP_DIR"

# 3. EXTRAIR BACKUP
echo ""
echo "🗜️  EXTRAINDO BACKUP..."
echo "========================"

cd "$TEMP_DIR"
tar -xzf "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup extraído com sucesso"
else
    echo "❌ ERRO ao extrair backup"
    exit 1
fi

# Verificar arquivos extraídos
echo "📋 Arquivos extraídos:"
ls -la

cd - > /dev/null

# 4. CONFIRMAR RESTAURAÇÃO
echo ""
echo "⚠️  ATENÇÃO: RESTAURAÇÃO IRÁ SOBRESCREVER DADOS EXISTENTES!"
echo "============================================================="
echo ""
echo "🔍 DETALHES DO BACKUP:"
echo "   Ambiente: $ENVIRONMENT"
echo "   Arquivo: $BACKUP_FILE"
echo "   Data: $(stat -c %y "$BACKUP_DIR/$BACKUP_FILE")"
echo "   Tamanho: $(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)"
echo ""

# Mostrar metadados se existir
if [ -f "$TEMP_DIR"/*_metadata.txt ]; then
    echo "📋 METADADOS DO BACKUP:"
    cat "$TEMP_DIR"/*_metadata.txt
    echo ""
fi

read -p "⚠️  DESEJA CONTINUAR COM A RESTAURAÇÃO? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Restauração cancelada pelo usuário"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 5. PARAR CONTAINERS
echo ""
echo "🛑 PARANDO CONTAINERS..."
echo "========================"

if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo "🔄 Parando containers..."
    docker-compose -f "$COMPOSE_FILE" down
    echo "✅ Containers parados"
else
    echo "✅ Containers já estão parados"
fi

# 6. RESTAURAR BANCO DE DADOS
echo ""
echo "🗄️  RESTAURANDO BANCO DE DADOS..."
echo "=================================="

# Subir apenas o banco
echo "🚀 Subindo container do banco..."
docker-compose -f "$COMPOSE_FILE" up -d db

# Aguardar banco inicializar
echo "⏳ Aguardando banco inicializar..."
sleep 10

# Verificar se o banco está rodando
if ! docker-compose -f "$COMPOSE_FILE" ps -q db >/dev/null 2>&1; then
    echo "❌ Container do banco não está rodando"
    exit 1
fi

# Obter credenciais do banco
DB_USER=$(grep "^POSTGRES_USER=" .env | cut -d'=' -f2 || echo "postgres")

echo "🔍 Restaurando banco de dados..."
echo "   Usuário: $DB_USER"
echo "   Banco: $DB_NAME"

# Restaurar banco
if docker-compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" >/dev/null 2>&1; then
    echo "✅ Banco anterior removido"
fi

if docker-compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" >/dev/null 2>&1; then
    echo "✅ Novo banco criado"
fi

# Encontrar arquivo SQL
SQL_FILE=$(find "$TEMP_DIR" -name "*.sql" | head -1)
if [ -n "$SQL_FILE" ]; then
    echo "📦 Restaurando dados do arquivo: $(basename "$SQL_FILE")"
    if docker-compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" "$DB_NAME" < "$SQL_FILE" 2>/tmp/restore_error; then
        echo "✅ Banco de dados restaurado com sucesso"
    else
        echo "❌ ERRO na restauração do banco:"
        cat /tmp/restore_error
        exit 1
    fi
else
    echo "❌ Arquivo SQL não encontrado no backup"
    exit 1
fi

# 7. RESTAURAR MEDIA
echo ""
echo "📁 RESTAURANDO ARQUIVOS DE MÍDIA..."
echo "==================================="

# Subir backend
echo "🚀 Subindo container backend..."
docker-compose -f "$COMPOSE_FILE" up -d backend

# Aguardar backend inicializar
echo "⏳ Aguardando backend inicializar..."
sleep 10

# Encontrar arquivo de media
MEDIA_FILE=$(find "$TEMP_DIR" -name "*_media.tar.gz" | head -1)
if [ -n "$MEDIA_FILE" ]; then
    echo "📦 Restaurando media do arquivo: $(basename "$MEDIA_FILE")"
    
    # Copiar arquivo para o container
    docker cp "$MEDIA_FILE" "$(docker-compose -f "$COMPOSE_FILE" ps -q backend):/tmp/media_backup.tar.gz"
    
    # Extrair no container
    if docker-compose -f "$COMPOSE_FILE" exec -T backend tar -xzf /tmp/media_backup.tar.gz -C /app/ 2>/tmp/media_error; then
        echo "✅ Arquivos de mídia restaurados com sucesso"
    else
        echo "❌ ERRO na restauração da mídia:"
        cat /tmp/media_error
        exit 1
    fi
else
    echo "⚠️  Arquivo de mídia não encontrado no backup"
fi

# 8. SUBIR TODOS OS CONTAINERS
echo ""
echo "🚀 SUBINDO TODOS OS CONTAINERS..."
echo "=================================="

echo "📦 Iniciando todos os containers..."
docker-compose -f "$COMPOSE_FILE" up -d

if [ $? -eq 0 ]; then
    echo "✅ Todos os containers iniciados"
else
    echo "❌ ERRO ao iniciar containers"
    exit 1
fi

# 9. EXECUTAR MIGRAÇÕES
echo ""
echo "🗄️  EXECUTANDO MIGRAÇÕES..."
echo "============================"

echo "⏳ Aguardando containers inicializarem..."
sleep 15

echo "🔄 Executando migrações..."
if docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate 2>/tmp/migrate_error; then
    echo "✅ Migrações executadas com sucesso"
else
    echo "⚠️  ERRO nas migrações:"
    cat /tmp/migrate_error
fi

# 10. VERIFICAR RESTAURAÇÃO
echo ""
echo "🔍 VERIFICANDO RESTAURAÇÃO..."
echo "============================="

# Verificar status dos containers
services=$(docker-compose -f "$COMPOSE_FILE" config --services)
all_healthy=true

for service in $services; do
    status=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service")
    if [ -n "$status" ]; then
        container_status=$(docker inspect --format='{{.State.Status}}' "$status" 2>/dev/null || echo "unknown")
        if [ "$container_status" = "running" ]; then
            echo "✅ $service - RUNNING"
        else
            echo "❌ $service - $container_status"
            all_healthy=false
        fi
    else
        echo "❌ $service - NÃO ENCONTRADO"
        all_healthy=false
    fi
done

# 11. LIMPEZA
echo ""
echo "🧹 LIMPANDO ARQUIVOS TEMPORÁRIOS..."
echo "===================================="

rm -rf "$TEMP_DIR"
echo "✅ Arquivos temporários removidos"

# 12. RESUMO FINAL
echo ""
echo "🎉 RESTAURAÇÃO CONCLUÍDA COM SUCESSO!"
echo "======================================"
echo ""
echo "📋 RESUMO:"
echo "   📦 Backup restaurado: $BACKUP_FILE"
echo "   🗄️  Banco de dados: $DB_NAME"
echo "   📁 Arquivos de mídia: Restaurados"
echo "   🕐 Data/Hora: $(date)"
echo ""
echo "🌐 URLs DO SISTEMA:"
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "   Frontend: http://localhost:5173"
else
    echo "   Frontend: http://localhost"
fi
echo "   Backend: http://localhost:8000"
echo "   Admin: http://localhost:8000/admin"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   Ver logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   Testar acesso: ./05-testar-acesso.sh $ENVIRONMENT"
echo "   Parar: docker-compose -f $COMPOSE_FILE down"
echo ""
echo "🚀 PRÓXIMO PASSO: Execute ./05-testar-acesso.sh $ENVIRONMENT"
echo ""
echo "💡 DICA: Para verificar se a restauração foi bem-sucedida:"
echo "   - Acesse o admin Django"
echo "   - Verifique se os dados estão presentes"
echo "   - Teste as funcionalidades principais" 