#!/bin/bash

# =============================================================================
# SCRIPT: 03-gitignore-env.sh
# DESCRIÇÃO: Garante que arquivos .env nunca sejam versionados no Git
# USO: ./scripts/03-gitignore-env.sh
# AUTOR: Sistema de Automação - Metaltec
# =============================================================================

set -e  # Para execução em caso de erro

echo "🔒 Configurando proteção para arquivos .env..."

# Verificar se estamos no diretório raiz do projeto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ ERRO: Execute este script no diretório raiz do projeto (onde está o docker-compose.yml)"
    exit 1
fi

# Verificar se .gitignore existe
if [ ! -f ".gitignore" ]; then
    echo "⚠️  Arquivo .gitignore não encontrado. Criando..."
    touch .gitignore
fi

# Backup do .gitignore atual
cp .gitignore .gitignore.backup.$(date +%Y%m%d_%H%M%S)

# Adicionar proteções para arquivos .env se não existirem
echo "" >> .gitignore
echo "# =============================================================================" >> .gitignore
echo "# PROTEÇÃO DE ARQUIVOS .ENV - ADICIONADO AUTOMATICAMENTE" >> .gitignore
echo "# =============================================================================" >> .gitignore
echo "# Arquivos de ambiente - NUNCA VERSIONAR" >> .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "*.env" >> .gitignore
echo "env/" >> .gitignore
echo "ENV/" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.development" >> .gitignore
echo ".env.production" >> .gitignore
echo ".env.staging" >> .gitignore
echo ".env.test" >> .gitignore
echo "# Arquivos de backup de ambiente" >> .gitignore
echo "*.env.backup" >> .gitignore
echo "*.env.backup.*" >> .gitignore
echo "# Arquivos temporários de ambiente" >> .gitignore
echo ".env.tmp" >> .gitignore
echo ".env.temp" >> .gitignore
echo "# =============================================================================" >> .gitignore

# Verificar se há arquivos .env já versionados
ENV_FILES=$(git ls-files | grep -E "\.env" || true)

if [ -n "$ENV_FILES" ]; then
    echo "⚠️  ATENÇÃO: Os seguintes arquivos .env estão versionados no Git:"
    echo "$ENV_FILES"
    echo ""
    echo "🔧 Removendo arquivos .env do controle de versão..."
    git rm --cached $(echo "$ENV_FILES") 2>/dev/null || true
    echo "✅ Arquivos .env removidos do controle de versão"
    echo "💡 Execute 'git commit -m \"Remove arquivos .env do versionamento\"' para confirmar"
else
    echo "✅ Nenhum arquivo .env encontrado no controle de versão"
fi

# Verificar se existe arquivo .env real
if [ -f ".env" ]; then
    echo "✅ Arquivo .env encontrado e protegido"
    echo "📝 Lembre-se: Nunca commite o arquivo .env real!"
else
    echo "⚠️  Arquivo .env não encontrado"
    echo "💡 Crie um arquivo .env baseado no env.example"
fi

# Verificar se env.example existe
if [ -f "env.example" ]; then
    echo "✅ Arquivo env.example encontrado (pode ser versionado)"
else
    echo "⚠️  Arquivo env.example não encontrado"
    echo "💡 Considere criar um env.example como template"
fi

echo ""
echo "🔒 Proteção de arquivos .env configurada com sucesso!"
echo "📋 Resumo das proteções adicionadas:"
echo "   - .env e todas as variações (.env.*, *.env)"
echo "   - Arquivos de backup de ambiente"
echo "   - Arquivos temporários de ambiente"
echo ""
echo "💡 Dica: Use 'git status' para verificar se há arquivos .env não rastreados" 