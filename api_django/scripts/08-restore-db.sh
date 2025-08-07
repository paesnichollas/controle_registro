#!/bin/bash

# =============================================================================
# SCRIPT: 08-restore-db.sh
# DESCRIÇÃO: Restore automatizado do banco PostgreSQL Dockerizado
# USO: ./scripts/08-restore-db.sh [arquivo_backup] [opções]
# EXEMPLO: ./scripts/08-restore-db.sh ./backups/backup_controle_os_20241201_143022.sql
# AUTOR: Sistema de Automação - Metaltec
# =============================================================================

set -e  # Para execução em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir ajuda
show_help() {
    echo "📖 USO: $0 [arquivo_backup] [opções]"
    echo ""
    echo "ARGUMENTOS:"
    echo "  arquivo_backup          Arquivo .sql do backup (obrigatório)"
    echo ""
    echo "OPÇÕES:"
    echo "  -c, --container NOME    Nome do container PostgreSQL (padrão: detecta automaticamente)"
    echo "  -d, --database NOME     Nome do banco de dados (padrão: detecta do backup)"
    echo "  -u, --user NOME         Usuário do banco (padrão: postgres)"
    echo "  -p, --password SENHA    Senha do banco (padrão: detecta do .env)"
    echo "  -f, --force             Força restore sem confirmação"
    echo "  -b, --backup-first      Faz backup antes do restore"
    echo "  -h, --help              Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0 backup.sql                           # Restore básico"
    echo "  $0 backup.sql -f                        # Restore forçado"
    echo "  $0 backup.sql -b                        # Backup antes do restore"
    echo "  $0 backup.sql -d novo_banco            # Restore em banco específico"
}

# Função para confirmar ação
confirm_action() {
    local message="$1"
    echo -e "${YELLOW}⚠️  $message${NC}"
    read -p "🤔 Continuar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Operação cancelada pelo usuário"
        exit 0
    fi
}

# Variáveis padrão
BACKUP_FILE=""
CONTAINER_NAME=""
DATABASE_NAME=""
DB_USER="postgres"
DB_PASSWORD=""
FORCE_RESTORE=false
BACKUP_FIRST=false

# Processar argumentos
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ ERRO: Arquivo de backup é obrigatório${NC}"
    show_help
    exit 1
fi

BACKUP_FILE="$1"
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -d|--database)
            DATABASE_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -p|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_RESTORE=true
            shift
            ;;
        -b|--backup-first)
            BACKUP_FIRST=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "❌ Argumento desconhecido: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "🔄 Iniciando restore do banco PostgreSQL..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Verificar se arquivo de backup existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ ERRO: Arquivo de backup não encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ ERRO: Docker não está rodando${NC}"
    exit 1
fi

# Detectar container PostgreSQL se não especificado
if [ -z "$CONTAINER_NAME" ]; then
    echo "🔍 Detectando container PostgreSQL..."
    CONTAINER_NAME=$(docker ps --format "table {{.Names}}" | grep -E "(postgres|db)" | head -1)
    
    if [ -z "$CONTAINER_NAME" ]; then
        echo -e "${RED}❌ ERRO: Container PostgreSQL não encontrado${NC}"
        echo "💡 Verifique se o container está rodando: docker ps"
        exit 1
    fi
    echo "✅ Container detectado: $CONTAINER_NAME"
fi

# Verificar se container existe e está rodando
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ ERRO: Container '$CONTAINER_NAME' não está rodando${NC}"
    echo "💡 Containers disponíveis:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

# Obter senha do .env se não especificada
if [ -z "$DB_PASSWORD" ]; then
    if [ -f ".env" ]; then
        echo "🔍 Detectando senha do banco no arquivo .env..."
        DB_PASSWORD=$(grep -E "^POSTGRES_PASSWORD=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        
        if [ -z "$DB_PASSWORD" ]; then
            echo -e "${YELLOW}⚠️  Senha não encontrada no .env, usando padrão 'postgres'${NC}"
            DB_PASSWORD="postgres"
        fi
    else
        echo -e "${YELLOW}⚠️  Arquivo .env não encontrado, usando senha padrão 'postgres'${NC}"
        DB_PASSWORD="postgres"
    fi
fi

# Detectar nome do banco do arquivo de backup se não especificado
if [ -z "$DATABASE_NAME" ]; then
    echo "🔍 Detectando nome do banco no arquivo de backup..."
    DATABASE_NAME=$(basename "$BACKUP_FILE" | sed 's/backup_\([^_]*\)_.*\.sql/\1/')
    
    if [ "$DATABASE_NAME" = "$(basename "$BACKUP_FILE")" ]; then
        echo -e "${YELLOW}⚠️  Não foi possível detectar nome do banco, usando 'controle_os'${NC}"
        DATABASE_NAME="controle_os"
    else
        echo "✅ Nome do banco detectado: $DATABASE_NAME"
    fi
fi

# Verificar integridade do arquivo de backup
echo "🔍 Verificando arquivo de backup..."
if ! head -n 1 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"; then
    echo -e "${YELLOW}⚠️  Arquivo não parece ser um dump PostgreSQL válido${NC}"
    if [ "$FORCE_RESTORE" = false ]; then
        confirm_action "Continuar mesmo assim?"
    fi
fi

# Fazer backup antes do restore se solicitado
if [ "$BACKUP_FIRST" = true ]; then
    echo "💾 Fazendo backup antes do restore..."
    ./scripts/02-backup-db.sh -c "$CONTAINER_NAME" -d "$DATABASE_NAME" -u "$DB_USER" -p "$DB_PASSWORD"
fi

# Verificar se banco existe
echo "🔍 Verificando se banco '$DATABASE_NAME' existe..."
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DATABASE_NAME"; then
    echo "✅ Banco '$DATABASE_NAME' encontrado"
    
    if [ "$FORCE_RESTORE" = false ]; then
        confirm_action "Banco '$DATABASE_NAME' já existe. Isso irá SOBRESCREVER todos os dados!"
    fi
else
    echo "📝 Banco '$DATABASE_NAME' não existe, será criado"
fi

# Mostrar informações do restore
echo "📊 Informações do restore:"
echo "   Arquivo: $BACKUP_FILE"
echo "   Container: $CONTAINER_NAME"
echo "   Banco: $DATABASE_NAME"
echo "   Usuário: $DB_USER"
echo "   Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"

if [ "$FORCE_RESTORE" = false ]; then
    confirm_action "Iniciar restore do banco '$DATABASE_NAME'?"
fi

# Executar restore
echo "🔄 Iniciando restore..."
echo "⏳ Isso pode demorar alguns minutos..."

# Criar banco se não existir
if ! docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DATABASE_NAME"; then
    echo "📝 Criando banco '$DATABASE_NAME'..."
    docker exec "$CONTAINER_NAME" createdb -U "$DB_USER" "$DATABASE_NAME"
fi

# Executar restore
if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DATABASE_NAME" < "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Restore realizado com sucesso!${NC}"
else
    echo -e "${RED}❌ ERRO: Falha no restore${NC}"
    exit 1
fi

# Verificar se restore foi bem-sucedido
echo "🔍 Verificando restore..."
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DATABASE_NAME" -c "SELECT COUNT(*) FROM information_schema.tables;" >/dev/null 2>&1; then
    echo "✅ Restore verificado com sucesso"
    
    # Mostrar algumas estatísticas
    TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DATABASE_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    echo "📊 Tabelas restauradas: $TABLE_COUNT"
else
    echo -e "${YELLOW}⚠️  Restore pode ter falhado - verifique manualmente${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Restore concluído com sucesso!${NC}"
echo "📁 Arquivo restaurado: $BACKUP_FILE"
echo "🗄️  Banco: $DATABASE_NAME"
echo ""
echo "💡 Dica: Teste a aplicação para verificar se tudo está funcionando" 