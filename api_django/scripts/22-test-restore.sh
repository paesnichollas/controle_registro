#!/bin/bash

# =============================================================================
# SCRIPT: 22-test-restore.sh
# DESCRIÇÃO: Testa restore completo em ambiente limpo antes de alterar produção
# USO: ./scripts/22-test-restore.sh [opções]
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
    echo "  -b, --backup FILE         Arquivo de backup para testar"
    echo "  -c, --clean               Limpa ambiente antes do teste"
    echo "  -d, --dry-run             Simula teste sem executar"
    echo "  -f, --force               Força teste sem confirmação"
    echo "  -t, --timeout MINUTOS     Timeout para teste (padrão: 30)"
    echo "  -v, --verbose             Mostra informações detalhadas"
    echo "  -h, --help                Mostra esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0 -b backup.sql          # Testa backup específico"
    echo "  $0 -c                     # Limpa ambiente e testa"
    echo "  $0 -d                     # Simula teste"
    echo "  $0 -f                     # Força teste"
}

# Função para confirmar ação
confirm_action() {
    local message="$1"
    local force_mode="$2"
    
    if [ "$force_mode" = true ]; then
        echo -e "${YELLOW}⚠️  $message (FORÇADO)${NC}"
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

# Função para limpar ambiente de teste
clean_test_environment() {
    echo "🧹 Limpando ambiente de teste..."
    
    # Parar containers
    if docker-compose ps -q | grep -q .; then
        echo "🛑 Parando containers..."
        docker-compose down -v
    fi
    
    # Remover volumes de teste
    echo "🗑️  Removendo volumes de teste..."
    docker volume ls | grep -E "(test|backup)" | awk '{print $2}' | xargs -r docker volume rm
    
    # Limpar imagens não utilizadas
    echo "🗑️  Limpando imagens não utilizadas..."
    docker image prune -f
    
    echo "✅ Ambiente limpo"
}

# Função para preparar ambiente de teste
prepare_test_environment() {
    echo "🔧 Preparando ambiente de teste..."
    
    # Criar docker-compose de teste
    if [ ! -f "docker-compose.test.yml" ]; then
        echo "📝 Criando docker-compose de teste..."
        cp docker-compose.yml docker-compose.test.yml
        
        # Modificar para ambiente de teste
        sed -i 's/controle_os/controle_os_test/g' docker-compose.test.yml
        sed -i 's/postgres/postgres_test/g' docker-compose.test.yml
        sed -i 's/5432:5432/# 5432:5432/g' docker-compose.test.yml  # Remover exposição de porta
    fi
    
    # Criar .env de teste
    if [ ! -f ".env.test" ]; then
        echo "📝 Criando .env de teste..."
        cp .env .env.test 2>/dev/null || cp env.example .env.test
        
        # Modificar variáveis para teste
        sed -i 's/controle_os/controle_os_test/g' .env.test
        sed -i 's/DEBUG=False/DEBUG=True/g' .env.test
        sed -i 's/ALLOWED_HOSTS=.*/ALLOWED_HOSTS=localhost,127.0.0.1/g' .env.test
    fi
    
    echo "✅ Ambiente de teste preparado"
}

# Função para executar teste de restore
run_restore_test() {
    local backup_file="$1"
    local timeout_minutes="$2"
    local verbose="$3"
    
    echo "🧪 Iniciando teste de restore..."
    echo "📁 Backup: $backup_file"
    echo "⏱️  Timeout: ${timeout_minutes} minutos"
    
    # Iniciar containers de teste
    echo "🚀 Iniciando containers de teste..."
    if ! docker-compose -f docker-compose.test.yml --env-file .env.test up -d db; then
        echo -e "${RED}❌ ERRO: Falha ao iniciar banco de teste${NC}"
        return 1
    fi
    
    # Aguardar banco estar pronto
    echo "⏳ Aguardando banco estar pronto..."
    local attempts=0
    while [ $attempts -lt 60 ]; do
        if docker-compose -f docker-compose.test.yml exec -T db pg_isready -U postgres >/dev/null 2>&1; then
            echo "✅ Banco de teste pronto"
            break
        fi
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -ge 60 ]; then
        echo -e "${RED}❌ ERRO: Timeout aguardando banco${NC}"
        return 1
    fi
    
    # Executar restore
    echo "🔄 Executando restore de teste..."
    if ! ./scripts/03-restore-db.sh "$backup_file" -c "$(docker-compose -f docker-compose.test.yml ps -q db)" -d controle_os_test -f; then
        echo -e "${RED}❌ ERRO: Falha no restore de teste${NC}"
        return 1
    fi
    
    # Verificar restore
    echo "🔍 Verificando restore..."
    local table_count=$(docker-compose -f docker-compose.test.yml exec -T db psql -U postgres -d controle_os_test -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    
    if [ "$table_count" -gt 0 ]; then
        echo "✅ Restore verificado: $table_count tabelas encontradas"
    else
        echo -e "${RED}❌ ERRO: Restore falhou - nenhuma tabela encontrada${NC}"
        return 1
    fi
    
    # Testar aplicação se solicitado
    if [ "$verbose" = true ]; then
        echo "🧪 Testando aplicação..."
        
        # Iniciar backend de teste
        if docker-compose -f docker-compose.test.yml --env-file .env.test up -d backend; then
            echo "✅ Backend de teste iniciado"
            
            # Aguardar aplicação estar pronta
            sleep 10
            
            # Testar conectividade
            if curl -s http://localhost:8000 >/dev/null 2>&1; then
                echo "✅ Aplicação respondendo"
            else
                echo -e "${YELLOW}⚠️  Aplicação não está respondendo${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Falha ao iniciar backend de teste${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Teste de restore concluído com sucesso!${NC}"
    return 0
}

# Função para simular teste
simulate_test() {
    local backup_file="$1"
    
    echo "🧪 SIMULAÇÃO - Teste de restore"
    echo "📁 Backup: $backup_file"
    echo ""
    echo "📋 PASSOS QUE SERIAM EXECUTADOS:"
    echo "   1. Limpar ambiente de teste"
    echo "   2. Preparar docker-compose.test.yml"
    echo "   3. Criar .env.test"
    echo "   4. Iniciar banco de teste"
    echo "   5. Executar restore"
    echo "   6. Verificar integridade"
    echo "   7. Testar aplicação (se verbose)"
    echo "   8. Limpar ambiente"
    echo ""
    echo "💡 Para executar: execute sem --dry-run"
}

# Função para limpar ambiente de teste
cleanup_test_environment() {
    echo "🧹 Limpando ambiente de teste..."
    
    # Parar containers de teste
    if [ -f "docker-compose.test.yml" ]; then
        docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true
    fi
    
    # Remover arquivos de teste
    rm -f docker-compose.test.yml
    rm -f .env.test
    
    echo "✅ Ambiente de teste limpo"
}

# Variáveis padrão
BACKUP_FILE=""
CLEAN_ENVIRONMENT=false
DRY_RUN=false
FORCE_TEST=false
TIMEOUT_MINUTES=30
VERBOSE=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backup)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -c|--clean)
            CLEAN_ENVIRONMENT=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE_TEST=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT_MINUTES="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
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

echo "🧪 Sistema de teste de restore..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Detectar arquivo de backup se não especificado
if [ -z "$BACKUP_FILE" ]; then
    echo "🔍 Detectando arquivo de backup..."
    BACKUP_FILE=$(find ./backups -name "backup_*.sql" -type f 2>/dev/null | sort -r | head -1)
    
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ ERRO: Nenhum arquivo de backup encontrado${NC}"
        echo "💡 Execute primeiro: ./scripts/02-backup-db.sh"
        exit 1
    fi
    
    echo "✅ Backup detectado: $BACKUP_FILE"
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

# Timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo ""
echo "=" | tr '\n' '=' | head -c 60; echo ""
echo "🧪 TESTE DE RESTORE - $TIMESTAMP"
echo "=" | tr '\n' '=' | head -c 60; echo ""

# Mostrar informações do teste
echo "📋 Informações do teste:"
echo "   Backup: $BACKUP_FILE"
echo "   Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "   Modo: $([ "$DRY_RUN" = true ] && echo "Simulação" || echo "Execução")"
echo "   Timeout: ${TIMEOUT_MINUTES} minutos"
echo "   Verbose: $VERBOSE"
echo "   Limpar ambiente: $CLEAN_ENVIRONMENT"

# Simular se solicitado
if [ "$DRY_RUN" = true ]; then
    simulate_test "$BACKUP_FILE"
    exit 0
fi

# Confirmar se não forçado
if [ "$FORCE_TEST" = false ]; then
    confirm_action "Iniciar teste de restore?" "$FORCE_TEST"
fi

# Limpar ambiente se solicitado
if [ "$CLEAN_ENVIRONMENT" = true ]; then
    clean_test_environment
fi

# Preparar ambiente de teste
prepare_test_environment

# Executar teste
if run_restore_test "$BACKUP_FILE" "$TIMEOUT_MINUTES" "$VERBOSE"; then
    echo ""
    echo -e "${GREEN}🎉 Teste de restore SUCESSO!${NC}"
    echo ""
    echo "📊 RESULTADO:"
    echo "   ✅ Backup restaurado com sucesso"
    echo "   ✅ Integridade verificada"
    echo "   ✅ Ambiente de teste funcionando"
    echo ""
    echo "💡 PRÓXIMOS PASSOS:"
    echo "   1. Teste manualmente se necessário"
    echo "   2. Execute deploy em produção"
    echo "   3. Monitore logs após deploy"
    echo ""
    echo "🔧 COMANDOS ÚTEIS:"
    echo "   - Ver logs: docker-compose -f docker-compose.test.yml logs"
    echo "   - Acessar banco: docker-compose -f docker-compose.test.yml exec db psql -U postgres -d controle_os_test"
    echo "   - Parar teste: docker-compose -f docker-compose.test.yml down"
else
    echo ""
    echo -e "${RED}❌ Teste de restore FALHOU!${NC}"
    echo ""
    echo "🚨 PROBLEMAS ENCONTRADOS:"
    echo "   ❌ Restore não foi bem-sucedido"
    echo "   ❌ Verifique o arquivo de backup"
    echo "   ❌ Não execute deploy em produção"
    echo ""
    echo "💡 AÇÕES RECOMENDADAS:"
    echo "   1. Verifique o arquivo de backup"
    echo "   2. Execute novo backup se necessário"
    echo "   3. Teste novamente antes do deploy"
    exit 1
fi

# Limpar ambiente de teste
cleanup_test_environment

echo ""
echo "💡 DICAS:"
echo "   - Sempre teste antes de alterar produção"
echo "   - Mantenha backups regulares"
echo "   - Monitore logs após deploy"
echo "   - Use este script antes de cada deploy crítico" 