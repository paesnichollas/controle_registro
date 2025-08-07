#!/bin/bash

# =============================================================================
# SCRIPT: 08-limpeza-sistema.sh
# DESCRIÇÃO: Limpeza de logs, imagens e volumes não utilizados
# USO: ./08-limpeza-sistema.sh [dev|prod]
# AUTOR: Sistema de Automação
# =============================================================================

set -e  # Para o script se houver erro

# Verificar argumento
ENVIRONMENT=${1:-dev}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "❌ ERRO: Ambiente deve ser 'dev' ou 'prod'"
    echo "   Uso: ./08-limpeza-sistema.sh [dev|prod]"
    exit 1
fi

echo "🧹 LIMPEZA DO SISTEMA - AMBIENTE $ENVIRONMENT..."
echo "================================================="

# Definir arquivo compose baseado no ambiente
if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

# Verificar se o arquivo existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Arquivo $COMPOSE_FILE não encontrado"
    exit 1
fi

# 1. VERIFICAR ESPAÇO EM DISCO
echo ""
echo "💾 VERIFICANDO ESPAÇO EM DISCO..."
echo "=================================="

total_space=$(df -h . | awk 'NR==2 {print $2}')
used_space=$(df -h . | awk 'NR==2 {print $3}')
free_space=$(df -h . | awk 'NR==2 {print $4}')
usage_percent=$(df -h . | awk 'NR==2 {print $5}')

echo "📊 USO DE DISCO:"
echo "   Total: $total_space"
echo "   Usado: $used_space"
echo "   Livre: $free_space"
echo "   Uso: $usage_percent"

# 2. LIMPEZA DE LOGS
echo ""
echo "📋 LIMPEZA DE LOGS..."
echo "====================="

# Verificar logs do Docker
docker_logs_size=$(du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | awk '{sum+=$1} END {print sum "B"}' || echo "0B")
echo "📊 Tamanho dos logs do Docker: $docker_logs_size"

# Limpar logs antigos do sistema
echo "🗑️  Limpando logs antigos do sistema..."
sudo find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null || true
sudo find /var/log -name "*.gz" -mtime +30 -delete 2>/dev/null || true
echo "✅ Logs antigos removidos"

# Limpar logs do Docker (opcional)
read -p "Deseja limpar logs do Docker? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🗑️  Limpando logs do Docker..."
    sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log 2>/dev/null || true
    echo "✅ Logs do Docker limpos"
fi

# 3. LIMPEZA DE CONTAINERS
echo ""
echo "📦 LIMPEZA DE CONTAINERS..."
echo "============================"

# Parar containers se estiverem rodando
if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo "🛑 Parando containers..."
    docker-compose -f "$COMPOSE_FILE" down
    echo "✅ Containers parados"
fi

# Remover containers parados
echo "🗑️  Removendo containers parados..."
docker container prune -f
echo "✅ Containers parados removidos"

# 4. LIMPEZA DE IMAGENS
echo ""
echo "🖼️  LIMPEZA DE IMAGENS..."
echo "=========================="

# Mostrar espaço usado por imagens
images_size=$(docker system df | grep "Images" | awk '{print $3}')
echo "📊 Espaço usado por imagens: $images_size"

# Remover imagens não utilizadas
echo "🗑️  Removendo imagens não utilizadas..."
docker image prune -f
echo "✅ Imagens não utilizadas removidas"

# Remover imagens pendentes (opcional)
read -p "Deseja remover imagens pendentes (dangling)? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🗑️  Removendo imagens pendentes..."
    docker image prune -a -f
    echo "✅ Imagens pendentes removidas"
fi

# 5. LIMPEZA DE VOLUMES
echo ""
echo "💾 LIMPEZA DE VOLUMES..."
echo "========================"

# Mostrar volumes
echo "📋 Volumes existentes:"
docker volume ls

# Verificar volumes órfãos
orphan_volumes=$(docker volume ls -qf dangling=true | wc -l)
echo "📊 Volumes órfãos: $orphan_volumes"

if [ "$orphan_volumes" -gt 0 ]; then
    read -p "Deseja remover volumes órfãos? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "🗑️  Removendo volumes órfãos..."
        docker volume prune -f
        echo "✅ Volumes órfãos removidos"
    fi
fi

# 6. LIMPEZA DE REDES
echo ""
echo "🌐 LIMPEZA DE REDES..."
echo "======================"

# Mostrar redes
echo "📋 Redes existentes:"
docker network ls

# Verificar redes não utilizadas
unused_networks=$(docker network ls --filter "type=custom" -q | wc -l)
echo "📊 Redes não utilizadas: $unused_networks"

if [ "$unused_networks" -gt 0 ]; then
    read -p "Deseja remover redes não utilizadas? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "🗑️  Removendo redes não utilizadas..."
        docker network prune -f
        echo "✅ Redes não utilizadas removidas"
    fi
fi

# 7. LIMPEZA DE BACKUPS ANTIGOS
echo ""
echo "💾 LIMPEZA DE BACKUPS ANTIGOS..."
echo "================================"

backup_dirs=("backups/dev" "backups/prod")
for backup_dir in "${backup_dirs[@]}"; do
    if [ -d "$backup_dir" ]; then
        echo "📁 Verificando $backup_dir..."
        backup_count=$(ls -1 "$backup_dir"/*_complete.tar.gz 2>/dev/null | wc -l)
        if [ "$backup_count" -gt 5 ]; then
            echo "🗑️  Removendo backups antigos de $backup_dir..."
            ls -t "$backup_dir"/*_complete.tar.gz | tail -n +6 | xargs rm -f
            echo "✅ Backups antigos removidos"
        else
            echo "✅ Nenhum backup antigo para remover"
        fi
    fi
done

# 8. LIMPEZA DE ARQUIVOS TEMPORÁRIOS
echo ""
echo "📁 LIMPEZA DE ARQUIVOS TEMPORÁRIOS..."
echo "====================================="

# Limpar arquivos temporários do sistema
echo "🗑️  Limpando arquivos temporários..."
sudo find /tmp -type f -mtime +7 -delete 2>/dev/null || true
sudo find /var/tmp -type f -mtime +7 -delete 2>/dev/null || true
echo "✅ Arquivos temporários removidos"

# 9. LIMPEZA DE CACHE
echo ""
echo "🗂️  LIMPEZA DE CACHE..."
echo "========================"

# Limpar cache do apt (se disponível)
if command -v apt-get &> /dev/null; then
    echo "🗑️  Limpando cache do apt..."
    sudo apt-get clean
    sudo apt-get autoremove -y
    echo "✅ Cache do apt limpo"
fi

# Limpar cache do Docker
echo "🗑️  Limpando cache do Docker..."
docker builder prune -f
echo "✅ Cache do Docker limpo"

# 10. VERIFICAR ESPAÇO LIBERADO
echo ""
echo "💾 VERIFICANDO ESPAÇO LIBERADO..."
echo "=================================="

new_free_space=$(df -h . | awk 'NR==2 {print $4}')
new_usage_percent=$(df -h . | awk 'NR==2 {print $5}')

echo "📊 ESPAÇO APÓS LIMPEZA:"
echo "   Livre: $new_free_space"
echo "   Uso: $new_usage_percent"

# 11. RELATÓRIO DE LIMPEZA
echo ""
echo "📊 RELATÓRIO DE LIMPEZA..."
echo "==========================="

echo "✅ LIMPEZA CONCLUÍDA!"
echo ""
echo "📋 AÇÕES REALIZADAS:"
echo "   🗑️  Logs antigos removidos"
echo "   📦 Containers parados removidos"
echo "   🖼️  Imagens não utilizadas removidas"
echo "   💾 Volumes órfãos removidos"
echo "   🌐 Redes não utilizadas removidas"
echo "   💾 Backups antigos removidos"
echo "   📁 Arquivos temporários removidos"
echo "   🗂️  Cache limpo"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   Ver espaço: df -h"
echo "   Ver imagens: docker images"
echo "   Ver volumes: docker volume ls"
echo "   Ver redes: docker network ls"
echo "   Ver containers: docker ps -a"
echo ""
echo "🚀 PRÓXIMO PASSO: Execute ./09-testes-falha.sh"
echo ""
echo "💡 DICA: Para automatizar limpeza:"
echo "   Adicione ao crontab: 0 3 * * 0 /caminho/para/08-limpeza-sistema.sh $ENVIRONMENT" 