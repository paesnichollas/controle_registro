#!/bin/bash

# =============================================================================
# SCRIPT: testa-tudo.sh
# DESCRIÇÃO: Script principal que executa todos os testes em sequência
# USO: ./testa-tudo.sh [dev|prod]
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

# Verificar argumento
ENVIRONMENT=${1:-dev}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "❌ ERRO: Ambiente deve ser 'dev' ou 'prod'"
    echo "   Uso: ./testa-tudo.sh [dev|prod]"
    exit 1
fi

echo "🚀 EXECUTANDO TODOS OS TESTES - AMBIENTE $ENVIRONMENT..."
echo "========================================================"

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ ERRO: Execute este script no diretório raiz do projeto"
    exit 1
fi

# Array para armazenar resultados
TEST_RESULTS=()

# Função para executar teste
run_test() {
    local test_name=$1
    local script_name=$2
    local description=$3
    
    echo ""
    echo "🧪 EXECUTANDO: $test_name"
    echo "=================================="
    echo "📋 $description"
    echo ""
    
    if [ -f "scripts/scripts-dev/$script_name" ]; then
        if bash "scripts/scripts-dev/$script_name" "$ENVIRONMENT"; then
            TEST_RESULTS+=("✅ $test_name - SUCESSO")
            echo ""
            echo "✅ $test_name concluído com sucesso"
        else
            TEST_RESULTS+=("❌ $test_name - FALHOU")
            echo ""
            echo "❌ $test_name falhou"
            
            read -p "Deseja continuar com os próximos testes? (s/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Ss]$ ]]; then
                echo "❌ Execução interrompida pelo usuário"
                exit 1
            fi
        fi
    else
        TEST_RESULTS+=("⚠️  $test_name - SCRIPT NÃO ENCONTRADO")
        echo "⚠️  Script $script_name não encontrado"
    fi
}

# Função para mostrar progresso
show_progress() {
    local current=$1
    local total=$2
    local percentage=$((current * 100 / total))
    
    echo ""
    echo "📊 PROGRESSO: $current/$total (${percentage}%)"
    echo "=========================================="
}

# Total de testes
TOTAL_TESTS=10
CURRENT_TEST=0

echo "📋 TESTES QUE SERÃO EXECUTADOS:"
echo "================================"
echo "1. ✅ Instalação do Docker"
echo "2. 🔧 Configuração do Projeto"
echo "3. 🔍 Verificação do Docker Compose"
echo "4. 🚀 Subida do Ambiente"
echo "5. 🧪 Teste de Acesso"
echo "6. 💾 Backup Local"
echo "7. 🔄 Restore Local"
echo "8. 🧹 Limpeza do Sistema"
echo "9. 🧪 Testes de Falha"
echo "10. 📋 Checklist Final"
echo ""

read -p "⚠️  ATENÇÃO: Este processo pode demorar alguns minutos. Continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Execução cancelada pelo usuário"
    exit 1
fi

echo ""
echo "🚀 INICIANDO EXECUÇÃO DOS TESTES..."
echo "==================================="

# 1. INSTALAÇÃO DO DOCKER
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Instalação do Docker" "01-instalar-docker.sh" "Verifica e instala Docker e Docker Compose"

# 2. CONFIGURAÇÃO DO PROJETO
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Configuração do Projeto" "02-configurar-projeto.sh" "Configura .env, SSL e estrutura do projeto"

# 3. VERIFICAÇÃO DO DOCKER COMPOSE
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Verificação do Docker Compose" "03-verificar-compose.sh" "Verifica sintaxe, portas e configurações"

# 4. SUBIDA DO AMBIENTE
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Subida do Ambiente" "04-subir-ambiente.sh" "Sobe containers e executa migrações"

# 5. TESTE DE ACESSO
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Teste de Acesso" "05-testar-acesso.sh" "Testa conectividade e endpoints"

# 6. BACKUP LOCAL
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Backup Local" "06-backup-local.sh" "Cria backup do banco e mídia"

# 7. RESTORE LOCAL
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Restore Local" "07-restore-local.sh" "Testa restauração do backup"

# 8. LIMPEZA DO SISTEMA
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Limpeza do Sistema" "08-limpeza-sistema.sh" "Limpa logs, imagens e volumes"

# 9. TESTES DE FALHA
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Testes de Falha" "09-testes-falha.sh" "Testa resiliência do sistema"

# 10. CHECKLIST FINAL
CURRENT_TEST=$((CURRENT_TEST + 1))
show_progress $CURRENT_TEST $TOTAL_TESTS
run_test "Checklist Final" "10-checklist-final.sh" "Verificação final completa"

# RESUMO FINAL
echo ""
echo "🎉 TODOS OS TESTES CONCLUÍDOS!"
echo "==============================="
echo ""
echo "📊 RESUMO DOS RESULTADOS:"
echo "========================="

success_count=0
fail_count=0
skip_count=0

for result in "${TEST_RESULTS[@]}"; do
    echo "$result"
    if [[ $result == *"✅"* ]]; then
        ((success_count++))
    elif [[ $result == *"❌"* ]]; then
        ((fail_count++))
    else
        ((skip_count++))
    fi
done

echo ""
echo "📈 ESTATÍSTICAS FINAIS:"
echo "========================"
echo "   Total de testes: $TOTAL_TESTS"
echo "   ✅ Sucessos: $success_count"
echo "   ❌ Falhas: $fail_count"
echo "   ⚠️  Pulados: $skip_count"

# Calcular percentual de sucesso
if [ $TOTAL_TESTS -gt 0 ]; then
    success_rate=$((success_count * 100 / TOTAL_TESTS))
    echo "   📊 Taxa de sucesso: ${success_rate}%"
else
    success_rate=0
    echo "   📊 Taxa de sucesso: 0%"
fi

echo ""
echo "🎯 AVALIAÇÃO FINAL:"
echo "==================="

if [ $success_rate -eq 100 ]; then
    echo "🎉 PERFEITO! SISTEMA 100% FUNCIONAL"
    echo "   - Todos os testes passaram"
    echo "   - Sistema pronto para produção"
    echo "   - Pode prosseguir com confiança"
elif [ $success_rate -ge 80 ]; then
    echo "✅ SISTEMA FUNCIONAL"
    echo "   - Maioria dos testes passou"
    echo "   - Sistema estável para uso"
    echo "   - Revise os itens que falharam"
elif [ $success_rate -ge 60 ]; then
    echo "⚠️  SISTEMA COM PROBLEMAS"
    echo "   - Alguns testes falharam"
    echo "   - Corrija os problemas antes de usar"
    echo "   - Execute os testes novamente"
else
    echo "❌ SISTEMA COM PROBLEMAS CRÍTICOS"
    echo "   - Muitos testes falharam"
    echo "   - Corrija os problemas críticos"
    echo "   - Verifique configurações básicas"
fi

echo ""
echo "🔧 PRÓXIMOS PASSOS:"
echo "==================="

if [ $fail_count -gt 0 ]; then
    echo "1. Revise os testes que falharam"
    echo "2. Execute os scripts de correção"
    echo "3. Execute este teste novamente"
    echo "4. Verifique logs e configurações"
else
    echo "1. Sistema está pronto para uso"
    echo "2. Configure monitoramento contínuo"
    echo "3. Faça backups regulares"
    echo "4. Monitore performance"
fi

echo ""
echo "💡 DICAS IMPORTANTES:"
echo "====================="
echo "   - Execute este teste regularmente"
echo "   - Mantenha backups atualizados"
echo "   - Monitore logs e performance"
echo "   - Configure alertas automáticos"
echo "   - Documente mudanças importantes"

echo ""
echo "🚀 TESTE COMPLETO FINALIZADO!"
echo "=============================="

# Salvar relatório
REPORT_FILE="teste_completo_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).txt"
{
    echo "RELATÓRIO DE TESTE COMPLETO"
    echo "============================"
    echo "Data/Hora: $(date)"
    echo "Ambiente: $ENVIRONMENT"
    echo "Sistema: $(uname -s) $(uname -r)"
    echo ""
    echo "RESULTADOS:"
    echo "==========="
    for result in "${TEST_RESULTS[@]}"; do
        echo "$result"
    done
    echo ""
    echo "ESTATÍSTICAS:"
    echo "============="
    echo "Total: $TOTAL_TESTS"
    echo "Sucessos: $success_count"
    echo "Falhas: $fail_count"
    echo "Pulados: $skip_count"
    echo "Taxa de sucesso: ${success_rate}%"
} > "$REPORT_FILE"

echo "📄 Relatório salvo em: $REPORT_FILE" 