#!/bin/bash

# =============================================================================
# SCRIPT: 04-backup-db.sh
# DESCRIÇÃO: Backup automatizado do banco PostgreSQL Dockerizado
# USO: ./scripts/04-backup-db.sh [nome_container] [nome_banco] [usuario] [senha]
# EXEMPLO: ./scripts/04-backup-db.sh postgres_db controle_os postgres minha_senha
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
    echo "📖 USO: $0 [opções]"
    echo ""
    echo "OPÇÕES:"
    echo "  -c, --container NOME    Nome do container PostgreSQL (padrão: detecta automaticamente)"
    echo "  -d, --database NOME     Nome do banco de dados (padrão: controle_os)"
    echo "  -u, --user NOME         Usuário do banco (padrão: postgres)"
    echo "  -p, --password SENHA    Senha do banco (padrão: detecta do .env)"
    echo "  -o, --output DIR        Diretório de saída (padrão: ./backups)"
    echo "  -h, --help              Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0                                    # Backup automático"
    echo "  $0 -c postgres_db -d meu_banco       # Backup específico"
    echo "  $0 --output /mnt/backups             # Backup em diretório específico"
}

# Variáveis padrão
CONTAINER_NAME=""
DATABASE_NAME="controle_os"
DB_USER="postgres"
DB_PASSWORD=""
OUTPUT_DIR="./backups"

# Processar argumentos
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
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
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

echo "🗄️  Iniciando backup do banco PostgreSQL..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
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

# Criar diretório de backup se não existir
mkdir -p "$OUTPUT_DIR"

# Gerar nome do arquivo de backup com timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$OUTPUT_DIR/backup_${DATABASE_NAME}_${TIMESTAMP}.sql"

echo "📊 Informações do backup:"
echo "   Container: $CONTAINER_NAME"
echo "   Banco: $DATABASE_NAME"
echo "   Usuário: $DB_USER"
echo "   Arquivo: $BACKUP_FILE"

# Testar conexão com o banco
echo "🔗 Testando conexão com o banco..."
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DATABASE_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Conexão com banco estabelecida"
else
    echo -e "${RED}❌ ERRO: Não foi possível conectar ao banco${NC}"
    echo "💡 Verifique:"
    echo "   - Nome do container: $CONTAINER_NAME"
    echo "   - Nome do banco: $DATABASE_NAME"
    echo "   - Usuário: $DB_USER"
    echo "   - Senha: [configurada]"
    exit 1
fi

# Executar backup
echo "💾 Iniciando dump do banco..."
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DATABASE_NAME" --no-password > "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Backup realizado com sucesso!${NC}"
else
    echo -e "${RED}❌ ERRO: Falha no backup${NC}"
    exit 1
fi

# Verificar tamanho do arquivo
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📏 Tamanho do backup: $BACKUP_SIZE"

# Verificar integridade do backup
echo "🔍 Verificando integridade do backup..."
if head -n 1 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"; then
    echo "✅ Backup parece estar íntegro"
else
    echo -e "${YELLOW}⚠️  Backup pode estar corrompido - verifique manualmente${NC}"
fi

# Criar arquivo de metadados
METADATA_FILE="$OUTPUT_DIR/backup_${DATABASE_NAME}_${TIMESTAMP}.meta"
cat > "$METADATA_FILE" << EOF
# Metadados do Backup PostgreSQL
# Gerado em: $(date)
# Script: $0

CONTAINER_NAME=$CONTAINER_NAME
DATABASE_NAME=$DATABASE_NAME
DB_USER=$DB_USER
BACKUP_FILE=$BACKUP_FILE
BACKUP_SIZE=$BACKUP_SIZE
TIMESTAMP=$TIMESTAMP

# Comando para restaurar:
# docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DATABASE_NAME < $BACKUP_FILE
EOF

echo "📝 Metadados salvos em: $METADATA_FILE"

# Mostrar backups recentes
echo ""
echo "📋 Backups recentes:"
ls -lh "$OUTPUT_DIR"/backup_*.sql 2>/dev/null | tail -5 || echo "   Nenhum backup encontrado"

echo ""
echo -e "${GREEN}🎉 Backup concluído com sucesso!${NC}"
echo "📁 Arquivo: $BACKUP_FILE"
echo "📊 Tamanho: $BACKUP_SIZE"
echo ""
echo "💡 Para restaurar: ./scripts/03-restore-db.sh $BACKUP_FILE" 