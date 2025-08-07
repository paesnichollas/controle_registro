#!/bin/bash

# =============================================================================
# SCRIPT: setup-permissions.sh
# DESCRIÇÃO: Configura permissões de execução para todos os scripts
# USO: ./scripts/setup-permissions.sh
# AUTOR: Sistema de Automação - Metaltec
# =============================================================================

echo "🔧 Configurando permissões de execução..."

# Verificar se estamos no diretório scripts
if [ ! -f "01-gitignore-env.sh" ]; then
    echo "❌ ERRO: Execute este script no diretório scripts/"
    exit 1
fi

# Dar permissão de execução a todos os scripts
echo "📝 Configurando permissões..."

chmod +x 01-gitignore-env.sh
chmod +x 02-backup-db.sh
chmod +x 03-restore-db.sh
chmod +x 04-generate-secrets.sh
chmod +x 05-disk-usage.sh
chmod +x 06-ssl-cert.sh
chmod +x 07-setup-firewall.sh
chmod +x 08-check-db-exposure.sh
chmod +x 09-cleanup-logs.sh
chmod +x 10-deploy-checklist.sh
chmod +x 11-note-custom.sh
chmod +x 12-test-restore.sh

echo "✅ Permissões configuradas com sucesso!"
echo ""
echo "📋 Scripts disponíveis:"
echo "   01-gitignore-env.sh      - Proteção de arquivos .env"
echo "   02-backup-db.sh          - Backup do banco PostgreSQL"
echo "   03-restore-db.sh         - Restore do banco PostgreSQL"
echo "   04-generate-secrets.sh   - Geração de chaves seguras"
echo "   05-disk-usage.sh         - Monitoramento de disco"
echo "   06-ssl-cert.sh           - Certificados SSL"
echo "   07-setup-firewall.sh     - Configuração de firewall"
echo "   08-check-db-exposure.sh  - Verificação de segurança do banco"
echo "   09-cleanup-logs.sh       - Limpeza de logs"
echo "   10-deploy-checklist.sh   - Checklist de deploy"
echo "   11-note-custom.sh        - Documentação de customizações"
echo "   12-test-restore.sh       - Teste de restore"
echo ""
echo "💡 Para usar: ./scripts/NOME_DO_SCRIPT.sh" 