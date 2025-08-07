#!/bin/bash

# =============================================================================
# SCRIPT: 10-generate-secrets.sh
# DESCRIÇÃO: Gera SECRET_KEY Django e senhas seguras para produção
# USO: ./scripts/10-generate-secrets.sh [opções]
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
    echo "  -l, --length N          Comprimento da senha (padrão: 32)"
    echo "  -c, --copy              Copia para clipboard (requer xclip ou pbcopy)"
    echo "  -o, --output FILE       Salva em arquivo específico"
    echo "  -e, --env               Gera formato para .env"
    echo "  -h, --help              Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0                      # Gera SECRET_KEY e senha"
    echo "  $0 -l 50               # Senha com 50 caracteres"
    echo "  $0 -c                  # Copia para clipboard"
    echo "  $0 -e                  # Formato para .env"
}

# Função para gerar string aleatória
generate_random_string() {
    local length=$1
    local charset="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Usar /dev/urandom para melhor aleatoriedade
    tr -dc "$charset" < /dev/urandom | head -c "$length"
}

# Função para gerar SECRET_KEY Django
generate_django_secret_key() {
    # Usar Python para gerar SECRET_KEY compatível com Django
    python3 -c "
import secrets
import string
chars = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
print(''.join(secrets.choice(chars) for _ in range(50)))
" 2>/dev/null || generate_random_string 50
}

# Função para copiar para clipboard
copy_to_clipboard() {
    local text="$1"
    
    if command -v xclip >/dev/null 2>&1; then
        echo "$text" | xclip -selection clipboard
        echo "📋 Copiado para clipboard (Linux)"
    elif command -v pbcopy >/dev/null 2>&1; then
        echo "$text" | pbcopy
        echo "📋 Copiado para clipboard (macOS)"
    else
        echo -e "${YELLOW}⚠️  xclip/pbcopy não encontrado - não foi possível copiar para clipboard${NC}"
        return 1
    fi
}

# Variáveis padrão
PASSWORD_LENGTH=32
COPY_TO_CLIPBOARD=false
OUTPUT_FILE=""
GENERATE_ENV_FORMAT=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--length)
            PASSWORD_LENGTH="$2"
            shift 2
            ;;
        -c|--copy)
            COPY_TO_CLIPBOARD=true
            shift
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -e|--env)
            GENERATE_ENV_FORMAT=true
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

echo "🔐 Gerando chaves e senhas seguras..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Gerar SECRET_KEY Django
echo "🔑 Gerando SECRET_KEY para Django..."
DJANGO_SECRET_KEY=$(generate_django_secret_key)

# Gerar senha forte
echo "🔒 Gerando senha forte..."
STRONG_PASSWORD=$(generate_random_string "$PASSWORD_LENGTH")

# Gerar senha para banco de dados
echo "🗄️  Gerando senha para banco de dados..."
DB_PASSWORD=$(generate_random_string 24)

# Gerar chave para Redis (se usado)
echo "🔴 Gerando chave para Redis..."
REDIS_PASSWORD=$(generate_random_string 32)

# Timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo ""
echo "=" | tr '\n' '=' | head -c 60; echo ""
echo "🔐 CHAVES E SENHAS GERADAS - $TIMESTAMP"
echo "=" | tr '\n' '=' | head -c 60; echo ""

# Formato para .env se solicitado
if [ "$GENERATE_ENV_FORMAT" = true ]; then
    echo ""
    echo "📝 FORMATO PARA ARQUIVO .ENV:"
    echo "# ============================================================================="
    echo "# CHAVES E SENHAS GERADAS AUTOMATICAMENTE"
    echo "# Gerado em: $TIMESTAMP"
    echo "# Script: $0"
    echo "# ============================================================================="
    echo ""
    echo "# Django"
    echo "SECRET_KEY=$DJANGO_SECRET_KEY"
    echo ""
    echo "# Banco de Dados PostgreSQL"
    echo "POSTGRES_PASSWORD=$DB_PASSWORD"
    echo "POSTGRES_USER=postgres"
    echo "POSTGRES_DB=controle_os"
    echo ""
    echo "# Redis (opcional)"
    echo "REDIS_PASSWORD=$REDIS_PASSWORD"
    echo ""
    echo "# Configurações de Segurança"
    echo "DEBUG=False"
    echo "ALLOWED_HOSTS=localhost,127.0.0.1,seu-dominio.com"
    echo ""
    echo "# Superusuário Django (altere conforme necessário)"
    echo "DJANGO_SUPERUSER_USERNAME=admin"
    echo "DJANGO_SUPERUSER_EMAIL=admin@seu-dominio.com"
    echo "DJANGO_SUPERUSER_PASSWORD=$STRONG_PASSWORD"
    echo ""
    echo "# ============================================================================="
else
    echo ""
    echo "🔑 SECRET_KEY Django:"
    echo "$DJANGO_SECRET_KEY"
    echo ""
    echo "🔒 Senha Forte (Superusuário):"
    echo "$STRONG_PASSWORD"
    echo ""
    echo "🗄️  Senha Banco de Dados:"
    echo "$DB_PASSWORD"
    echo ""
    echo "🔴 Senha Redis:"
    echo "$REDIS_PASSWORD"
    echo ""
    echo "📊 Informações:"
    echo "   Comprimento da senha: $PASSWORD_LENGTH caracteres"
    echo "   Gerado em: $TIMESTAMP"
    echo "   Script: $0"
fi

# Copiar para clipboard se solicitado
if [ "$COPY_TO_CLIPBOARD" = true ]; then
    if [ "$GENERATE_ENV_FORMAT" = true ]; then
        ENV_CONTENT="# Django
SECRET_KEY=$DJANGO_SECRET_KEY

# Banco de Dados PostgreSQL
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_USER=postgres
POSTGRES_DB=controle_os

# Redis (opcional)
REDIS_PASSWORD=$REDIS_PASSWORD

# Configurações de Segurança
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,seu-dominio.com

# Superusuário Django
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@seu-dominio.com
DJANGO_SUPERUSER_PASSWORD=$STRONG_PASSWORD"
        
        if copy_to_clipboard "$ENV_CONTENT"; then
            echo "📋 Conteúdo do .env copiado para clipboard!"
        fi
    else
        if copy_to_clipboard "$DJANGO_SECRET_KEY"; then
            echo "📋 SECRET_KEY copiada para clipboard!"
        fi
    fi
fi

# Salvar em arquivo se especificado
if [ -n "$OUTPUT_FILE" ]; then
    echo ""
    echo "💾 Salvando em: $OUTPUT_FILE"
    
    if [ "$GENERATE_ENV_FORMAT" = true ]; then
        cat > "$OUTPUT_FILE" << EOF
# =============================================================================
# CHAVES E SENHAS GERADAS AUTOMATICAMENTE
# Gerado em: $TIMESTAMP
# Script: $0
# =============================================================================

# Django
SECRET_KEY=$DJANGO_SECRET_KEY

# Banco de Dados PostgreSQL
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_USER=postgres
POSTGRES_DB=controle_os

# Redis (opcional)
REDIS_PASSWORD=$REDIS_PASSWORD

# Configurações de Segurança
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,seu-dominio.com

# Superusuário Django
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@seu-dominio.com
DJANGO_SUPERUSER_PASSWORD=$STRONG_PASSWORD

# =============================================================================
EOF
    else
        cat > "$OUTPUT_FILE" << EOF
# =============================================================================
# CHAVES E SENHAS GERADAS AUTOMATICAMENTE
# Gerado em: $TIMESTAMP
# Script: $0
# =============================================================================

SECRET_KEY=$DJANGO_SECRET_KEY
STRONG_PASSWORD=$STRONG_PASSWORD
DB_PASSWORD=$DB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD

# =============================================================================
EOF
    fi
    
    echo "✅ Arquivo salvo com sucesso!"
fi

echo ""
echo -e "${GREEN}🎉 Geração de chaves concluída!${NC}"
echo ""
echo "💡 DICAS DE SEGURANÇA:"
echo "   - Nunca commite arquivos .env no Git"
echo "   - Use senhas diferentes para cada ambiente"
echo "   - Troque as senhas regularmente"
echo "   - Mantenha as chaves em local seguro"
echo ""
echo "🔧 PRÓXIMOS PASSOS:"
echo "   1. Copie as chaves para seu arquivo .env"
echo "   2. Execute: ./scripts/01-gitignore-env.sh"
echo "   3. Teste a aplicação com as novas chaves" 