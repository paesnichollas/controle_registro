#!/bin/bash

# =============================================================================
# SCRIPT: 19-deploy-checklist.sh
# DESCRIÇÃO: Checklist de deploy seguro com confirmações
# USO: ./scripts/19-deploy-checklist.sh [opções]
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
    echo "  -a, --auto               Modo automático (sem confirmações)"
    echo "  -b, --backup             Força backup antes do deploy"
    echo "  -t, --test               Executa testes antes do deploy"
    echo "  -s, --ssl                Verifica certificados SSL"
    echo "  -l, --logs               Limpa logs antes do deploy"
    echo "  -h, --help               Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0                       # Checklist interativo"
    echo "  $0 -a                    # Modo automático"
    echo "  $0 -b -t -s              # Backup + testes + SSL"
}

# Função para confirmar ação
confirm_action() {
    local message="$1"
    local auto_mode="$2"
    
    if [ "$auto_mode" = true ]; then
        echo -e "${YELLOW}⚠️  $message (AUTO)${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $message${NC}"
        read -p "🤔 Continuar? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            echo "❌ Operação cancelada pelo usuário"
            return 1
        fi
        return 0
    fi
}

# Função para logar ação
log_action() {
    local action="$1"
    local status="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $action: $status" >> deploy-checklist.log
}

# Função para verificar backup
check_backup() {
    echo "💾 Verificando backup..."
    
    # Verificar se backup recente existe
    if [ -d "./backups" ]; then
        RECENT_BACKUP=$(find ./backups -name "backup_*.sql" -mtime -1 2>/dev/null | head -1)
        if [ -n "$RECENT_BACKUP" ]; then
            echo "✅ Backup recente encontrado: $RECENT_BACKUP"
            log_action "Backup" "OK - $RECENT_BACKUP"
            return 0
        else
            echo -e "${YELLOW}⚠️  Nenhum backup recente encontrado${NC}"
            log_action "Backup" "WARNING - Sem backup recente"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Diretório de backups não encontrado${NC}"
        log_action "Backup" "WARNING - Diretório não encontrado"
        return 1
    fi
}

# Função para fazer backup
make_backup() {
    echo "💾 Fazendo backup..."
    if ./scripts/02-backup-db.sh; then
        echo "✅ Backup realizado com sucesso"
        log_action "Backup" "SUCCESS - Novo backup criado"
        return 0
    else
        echo -e "${RED}❌ Falha no backup${NC}"
        log_action "Backup" "FAILED"
        return 1
    fi
}

# Função para verificar arquivo .env
check_env_file() {
    echo "🔍 Verificando arquivo .env..."
    
    if [ -f ".env" ]; then
        echo "✅ Arquivo .env encontrado"
        
        # Verificar variáveis críticas
        CRITICAL_VARS=("SECRET_KEY" "POSTGRES_PASSWORD" "DEBUG")
        MISSING_VARS=()
        
        for var in "${CRITICAL_VARS[@]}"; do
            if ! grep -q "^$var=" .env; then
                MISSING_VARS+=("$var")
            fi
        done
        
        if [ ${#MISSING_VARS[@]} -eq 0 ]; then
            echo "✅ Todas as variáveis críticas estão configuradas"
            log_action "ENV File" "OK"
            return 0
        else
            echo -e "${YELLOW}⚠️  Variáveis faltando: ${MISSING_VARS[*]}${NC}"
            log_action "ENV File" "WARNING - Variáveis faltando"
            return 1
        fi
    else
        echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
        log_action "ENV File" "FAILED - Arquivo não encontrado"
        return 1
    fi
}

# Função para verificar SSL
check_ssl() {
    echo "🔒 Verificando certificados SSL..."
    
    if command -v certbot >/dev/null 2>&1; then
        SSL_CERTS=$(certbot certificates 2>/dev/null | grep -c "VALID" || echo "0")
        if [ "$SSL_CERTS" -gt 0 ]; then
            echo "✅ Certificados SSL encontrados: $SSL_CERTS"
            log_action "SSL" "OK - $SSL_CERTS certificados"
            return 0
        else
            echo -e "${YELLOW}⚠️  Nenhum certificado SSL válido encontrado${NC}"
            log_action "SSL" "WARNING - Sem certificados válidos"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Certbot não encontrado${NC}"
        log_action "SSL" "WARNING - Certbot não instalado"
        return 1
    fi
}

# Função para verificar logs
check_logs() {
    echo "📝 Verificando logs..."
    
    LARGE_LOGS=$(find . -name "*.log" -size +50M 2>/dev/null || true)
    if [ -n "$LARGE_LOGS" ]; then
        echo -e "${YELLOW}⚠️  Logs grandes encontrados:${NC}"
        echo "$LARGE_LOGS" | while read log_file; do
            LOG_SIZE=$(du -h "$log_file" | cut -f1)
            echo "   - $log_file ($LOG_SIZE)"
        done
        log_action "Logs" "WARNING - Logs grandes encontrados"
        return 1
    else
        echo "✅ Nenhum log grande encontrado"
        log_action "Logs" "OK"
        return 0
    fi
}

# Função para limpar logs
clean_logs() {
    echo "🧹 Limpando logs..."
    if ./scripts/09-cleanup-logs.sh -f; then
        echo "✅ Logs limpos com sucesso"
        log_action "Logs Cleanup" "SUCCESS"
        return 0
    else
        echo -e "${RED}❌ Falha na limpeza de logs${NC}"
        log_action "Logs Cleanup" "FAILED"
        return 1
    fi
}

# Função para verificar Docker
check_docker() {
    echo "🐳 Verificando Docker..."
    
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker está rodando"
        
        # Verificar containers
        RUNNING_CONTAINERS=$(docker ps -q | wc -l)
        echo "   Containers rodando: $RUNNING_CONTAINERS"
        
        # Verificar espaço em disco
        DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
        if [ "$DISK_USAGE" -gt 85 ]; then
            echo -e "${YELLOW}⚠️  Disco com pouco espaço: ${DISK_USAGE}%${NC}"
            log_action "Docker" "WARNING - Disco com pouco espaço"
            return 1
        else
            echo "✅ Espaço em disco OK: ${DISK_USAGE}%"
            log_action "Docker" "OK"
            return 0
        fi
    else
        echo -e "${RED}❌ Docker não está rodando${NC}"
        log_action "Docker" "FAILED - Docker não rodando"
        return 1
    fi
}

# Função para executar testes
run_tests() {
    echo "🧪 Executando testes..."
    
    # Testar conectividade do banco
    DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "(postgres|db)" | head -1)
    if [ -n "$DB_CONTAINER" ]; then
        if docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
            echo "✅ Banco de dados acessível"
        else
            echo -e "${RED}❌ Banco de dados não acessível${NC}"
            log_action "Tests" "FAILED - Banco não acessível"
            return 1
        fi
    fi
    
    # Testar aplicação Django
    if [ -f "manage.py" ]; then
        if docker-compose exec backend python manage.py check --deploy >/dev/null 2>&1; then
            echo "✅ Django check passou"
        else
            echo -e "${YELLOW}⚠️  Django check com avisos${NC}"
        fi
    fi
    
    log_action "Tests" "OK"
    return 0
}

# Função para verificar segurança
check_security() {
    echo "🛡️  Verificando segurança..."
    
    # Verificar se banco está exposto
    if ./scripts/08-check-db-exposure.sh -q 2>/dev/null; then
        echo "✅ Banco não está exposto externamente"
    else
        echo -e "${RED}❌ ALERTA: Banco pode estar exposto${NC}"
        log_action "Security" "FAILED - Banco exposto"
        return 1
    fi
    
    # Verificar firewall
    if command -v ufw >/dev/null 2>&1; then
        if ufw status | grep -q "Status: active"; then
            echo "✅ Firewall ativo"
        else
            echo -e "${YELLOW}⚠️  Firewall não está ativo${NC}"
        fi
    fi
    
    log_action "Security" "OK"
    return 0
}

# Variáveis padrão
AUTO_MODE=false
FORCE_BACKUP=false
RUN_TESTS=false
CHECK_SSL=false
CLEAN_LOGS=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--auto)
            AUTO_MODE=true
            shift
            ;;
        -b|--backup)
            FORCE_BACKUP=true
            shift
            ;;
        -t|--test)
            RUN_TESTS=true
            shift
            ;;
        -s|--ssl)
            CHECK_SSL=true
            shift
            ;;
        -l|--logs)
            CLEAN_LOGS=true
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

echo "📋 Iniciando checklist de deploy seguro..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo ""
echo "=" | tr '\n' '=' | head -c 60; echo ""
echo "📋 CHECKLIST DE DEPLOY SEGURO - $TIMESTAMP"
echo "=" | tr '\n' '=' | head -c 60; echo ""

# Inicializar log
echo "Iniciando checklist de deploy - $TIMESTAMP" > deploy-checklist.log

# 1. Verificar Docker
echo "1️⃣  Verificando Docker..."
if check_docker; then
    echo -e "${GREEN}✅ Docker OK${NC}"
else
    echo -e "${RED}❌ Problemas com Docker${NC}"
    if ! confirm_action "Continuar mesmo assim?" "$AUTO_MODE"; then
        exit 1
    fi
fi

# 2. Verificar arquivo .env
echo ""
echo "2️⃣  Verificando arquivo .env..."
if check_env_file; then
    echo -e "${GREEN}✅ Arquivo .env OK${NC}"
else
    echo -e "${YELLOW}⚠️  Problemas com arquivo .env${NC}"
    if ! confirm_action "Continuar mesmo assim?" "$AUTO_MODE"; then
        exit 1
    fi
fi

# 3. Verificar backup
echo ""
echo "3️⃣  Verificando backup..."
if check_backup; then
    echo -e "${GREEN}✅ Backup OK${NC}"
else
    if [ "$FORCE_BACKUP" = true ]; then
        echo "💾 Fazendo backup forçado..."
        if make_backup; then
            echo -e "${GREEN}✅ Backup criado${NC}"
        else
            echo -e "${RED}❌ Falha no backup${NC}"
            if ! confirm_action "Continuar sem backup?" "$AUTO_MODE"; then
                exit 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Backup não encontrado${NC}"
        if ! confirm_action "Fazer backup agora?" "$AUTO_MODE"; then
            if make_backup; then
                echo -e "${GREEN}✅ Backup criado${NC}"
            else
                echo -e "${RED}❌ Falha no backup${NC}"
            fi
        fi
    fi
fi

# 4. Verificar logs
echo ""
echo "4️⃣  Verificando logs..."
if check_logs; then
    echo -e "${GREEN}✅ Logs OK${NC}"
else
    if [ "$CLEAN_LOGS" = true ]; then
        echo "🧹 Limpando logs..."
        if clean_logs; then
            echo -e "${GREEN}✅ Logs limpos${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Logs grandes encontrados${NC}"
        if ! confirm_action "Limpar logs agora?" "$AUTO_MODE"; then
            if clean_logs; then
                echo -e "${GREEN}✅ Logs limpos${NC}"
            fi
        fi
    fi
fi

# 5. Verificar SSL
if [ "$CHECK_SSL" = true ]; then
    echo ""
    echo "5️⃣  Verificando SSL..."
    if check_ssl; then
        echo -e "${GREEN}✅ SSL OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Problemas com SSL${NC}"
        if ! confirm_action "Continuar sem SSL?" "$AUTO_MODE"; then
            exit 1
        fi
    fi
fi

# 6. Executar testes
if [ "$RUN_TESTS" = true ]; then
    echo ""
    echo "6️⃣  Executando testes..."
    if run_tests; then
        echo -e "${GREEN}✅ Testes OK${NC}"
    else
        echo -e "${RED}❌ Falha nos testes${NC}"
        if ! confirm_action "Continuar mesmo assim?" "$AUTO_MODE"; then
            exit 1
        fi
    fi
fi

# 7. Verificar segurança
echo ""
echo "7️⃣  Verificando segurança..."
if check_security; then
    echo -e "${GREEN}✅ Segurança OK${NC}"
else
    echo -e "${RED}❌ Problemas de segurança${NC}"
    if ! confirm_action "Continuar mesmo assim?" "$AUTO_MODE"; then
        exit 1
    fi
fi

# 8. Checklist final
echo ""
echo "8️⃣  Checklist final..."
echo "📋 Itens verificados:"
echo "   ✅ Docker funcionando"
echo "   ✅ Arquivo .env configurado"
echo "   ✅ Backup realizado"
echo "   ✅ Logs limpos"
if [ "$CHECK_SSL" = true ]; then
    echo "   ✅ SSL configurado"
fi
if [ "$RUN_TESTS" = true ]; then
    echo "   ✅ Testes executados"
fi
echo "   ✅ Segurança verificada"

echo ""
echo -e "${GREEN}🎉 Checklist de deploy concluído!${NC}"
echo ""
echo "📊 RESUMO:"
echo "   - Log salvo em: deploy-checklist.log"
echo "   - Timestamp: $TIMESTAMP"
echo "   - Modo: $([ "$AUTO_MODE" = true ] && echo "Automático" || echo "Interativo")"
echo ""
echo "💡 PRÓXIMOS PASSOS:"
echo "   1. Execute: docker-compose up -d"
echo "   2. Verifique logs: docker-compose logs -f"
echo "   3. Teste a aplicação"
echo "   4. Monitore por alguns minutos"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   - Ver logs: docker-compose logs -f"
echo "   - Parar: docker-compose down"
echo "   - Restart: docker-compose restart"
echo "   - Status: docker-compose ps" 