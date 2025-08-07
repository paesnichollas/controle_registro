#!/bin/bash

# =============================================================================
# SCRIPT: 03-verificar-compose.sh
# DESCRIÇÃO: Verifica e valida os arquivos docker-compose
# USO: ./03-verificar-compose.sh
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

echo "🔍 VERIFICANDO ARQUIVOS DOCKER-COMPOSE..."
echo "========================================="

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ ERRO: Execute este script no diretório raiz do projeto"
    exit 1
fi

# 1. VERIFICAR SINTAXE DOS ARQUIVOS
echo ""
echo "📋 VERIFICANDO SINTAXE DOS ARQUIVOS..."
echo "======================================"

compose_files=("docker-compose.yml" "docker-compose.dev.yml" "docker-compose.prod.yml")

for file in "${compose_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🔍 Verificando $file..."
        if docker-compose -f "$file" config >/dev/null 2>&1; then
            echo "✅ $file - Sintaxe válida"
        else
            echo "❌ $file - ERRO DE SINTAXE"
            echo "   Execute: docker-compose -f $file config"
            exit 1
        fi
    else
        echo "⚠️  $file - Arquivo não encontrado"
    fi
done

# 2. VERIFICAR CONFLITOS DE PORTA
echo ""
echo "🌐 VERIFICANDO CONFLITOS DE PORTA..."
echo "===================================="

# Função para extrair portas de um arquivo compose
extract_ports() {
    local file=$1
    if [ -f "$file" ]; then
        docker-compose -f "$file" config | grep -E "ports:" -A 10 | grep -E "[0-9]+:[0-9]+" | sed 's/.*"\([0-9]\+\):[0-9]\+".*/\1/'
    fi
}

# Verificar portas em uso
echo "🔍 Verificando portas em uso..."
used_ports=$(netstat -tuln 2>/dev/null | grep -E ":[0-9]+ " | sed 's/.*:\([0-9]\+\).*/\1/' | sort -u)

# Verificar portas dos arquivos compose
for file in "${compose_files[@]}"; do
    if [ -f "$file" ]; then
        echo "📋 Portas definidas em $file:"
        compose_ports=$(extract_ports "$file")
        for port in $compose_ports; do
            if echo "$used_ports" | grep -q "^$port$"; then
                echo "⚠️  Porta $port já está em uso"
            else
                echo "✅ Porta $port está livre"
            fi
        done
        echo ""
    fi
done

# 3. VERIFICAR VOLUMES
echo ""
echo "💾 VERIFICANDO CONFIGURAÇÃO DE VOLUMES..."
echo "========================================="

# Verificar volumes nomeados vs anônimos
for file in "${compose_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🔍 Verificando volumes em $file..."
        
        # Verificar volumes anônimos
        anonymous_volumes=$(docker-compose -f "$file" config | grep -A 5 -B 5 "volumes:" | grep -E "^\s*- " | grep -v "^\s*- [a-zA-Z]" || true)
        
        if [ -n "$anonymous_volumes" ]; then
            echo "⚠️  VOLUMES ANÔNIMOS ENCONTRADOS em $file:"
            echo "$anonymous_volumes"
            echo "   Recomendação: Use volumes nomeados para persistência"
        else
            echo "✅ Apenas volumes nomeados em $file"
        fi
        
        # Verificar volumes nomeados
        named_volumes=$(docker-compose -f "$file" config | grep -A 10 "volumes:" | grep -E "^[a-zA-Z]" || true)
        if [ -n "$named_volumes" ]; then
            echo "📋 Volumes nomeados em $file:"
            echo "$named_volumes"
        fi
        echo ""
    fi
done

# 4. VERIFICAR NOMES DOS SERVIÇOS
echo ""
echo "🏷️  VERIFICANDO NOMES DOS SERVIÇOS..."
echo "====================================="

expected_services=("db" "backend" "frontend" "redis")

for file in "${compose_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🔍 Verificando serviços em $file..."
        
        # Extrair serviços do arquivo
        services=$(docker-compose -f "$file" config --services)
        
        for expected in "${expected_services[@]}"; do
            if echo "$services" | grep -q "^$expected$"; then
                echo "✅ Serviço '$expected' encontrado"
            else
                echo "⚠️  Serviço '$expected' NÃO encontrado"
            fi
        done
        
        # Verificar serviços extras
        extra_services=$(echo "$services" | grep -v -E "^($(IFS='|'; echo "${expected_services[*]}")$)")
        if [ -n "$extra_services" ]; then
            echo "📋 Serviços extras encontrados:"
            echo "$extra_services"
        fi
        echo ""
    fi
done

# 5. VERIFICAR VARIÁVEIS DE AMBIENTE
echo ""
echo "🔧 VERIFICANDO VARIÁVEIS DE AMBIENTE..."
echo "======================================"

if [ -f ".env" ]; then
    echo "✅ Arquivo .env encontrado"
    
    # Verificar variáveis críticas
    critical_vars=("SECRET_KEY" "POSTGRES_PASSWORD" "DJANGO_SUPERUSER_PASSWORD")
    
    for var in "${critical_vars[@]}"; do
        if grep -q "^$var=" .env; then
            value=$(grep "^$var=" .env | cut -d'=' -f2)
            if [ -n "$value" ] && [ "$value" != "your-secret-key-here-change-in-production" ]; then
                echo "✅ $var configurada"
            else
                echo "⚠️  $var precisa ser configurada"
            fi
        else
            echo "❌ $var NÃO encontrada no .env"
        fi
    done
else
    echo "❌ Arquivo .env NÃO encontrado"
    echo "   Execute: ./02-configurar-projeto.sh"
    exit 1
fi

# 6. VERIFICAR REDES
echo ""
echo "🌐 VERIFICANDO CONFIGURAÇÃO DE REDES..."
echo "======================================"

for file in "${compose_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🔍 Verificando redes em $file..."
        
        # Verificar se todos os serviços estão na mesma rede
        services=$(docker-compose -f "$file" config --services)
        for service in $services; do
            networks=$(docker-compose -f "$file" config | grep -A 20 "services:" | grep -A 10 "  $service:" | grep -A 5 "    networks:" | grep -E "^\s*- " || true)
            if [ -n "$networks" ]; then
                echo "✅ Serviço '$service' tem rede configurada"
            else
                echo "⚠️  Serviço '$service' sem rede configurada"
            fi
        done
        echo ""
    fi
done

echo ""
echo "🎉 VERIFICAÇÃO CONCLUÍDA!"
echo "========================="
echo ""
echo "📋 RESUMO:"
echo "   ✅ Sintaxe dos arquivos compose válida"
echo "   ✅ Conflitos de porta verificados"
echo "   ✅ Volumes verificados"
echo "   ✅ Serviços verificados"
echo "   ✅ Variáveis de ambiente verificadas"
echo "   ✅ Redes verificadas"
echo ""
echo "🚀 PRÓXIMO PASSO: Execute ./04-subir-ambiente.sh"
echo ""
echo "💡 DICA: Para verificar logs em tempo real:"
echo "   docker-compose logs -f" 