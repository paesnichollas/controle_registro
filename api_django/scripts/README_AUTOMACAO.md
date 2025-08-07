# 🔧 Sistema de Automação - Metaltec

Este diretório contém scripts de automação para infraestrutura Django + React com Docker, projetados para minimizar erros humanos e garantir segurança/recuperação mesmo para desenvolvedores júnior.

## 📋 Scripts Disponíveis

### 1. 🔒 Proteção de Arquivos .env
**Script:** `01-gitignore-env.sh`
```bash
./scripts/01-gitignore-env.sh
```
- Garante que arquivos `.env` nunca sejam versionados
- Adiciona proteções ao `.gitignore`
- Remove arquivos `.env` já versionados

### 2. 💾 Backup do Banco PostgreSQL
**Script:** `02-backup-db.sh`
```bash
# Backup automático
./scripts/02-backup-db.sh

# Backup com opções específicas
./scripts/02-backup-db.sh -c postgres_db -d meu_banco -o /mnt/backups
```
- Detecta container PostgreSQL automaticamente
- Gera backup com timestamp
- Salva metadados do backup
- Aceita argumentos de linha de comando

### 3. 🔄 Restore do Banco PostgreSQL
**Script:** `03-restore-db.sh`
```bash
# Restore básico
./scripts/03-restore-db.sh ./backups/backup_controle_os_20241201_143022.sql

# Restore com backup antes
./scripts/03-restore-db.sh backup.sql -b -f
```
- Restaura backup com segurança
- Opção de backup antes do restore
- Verifica integridade do backup
- Confirmação antes de sobrescrever

### 4. 🔐 Geração de Chaves Seguras
**Script:** `04-generate-secrets.sh`
```bash
# Geração básica
./scripts/04-generate-secrets.sh

# Formato para .env
./scripts/04-generate-secrets.sh -e

# Com clipboard
./scripts/04-generate-secrets.sh -c -e
```
- Gera SECRET_KEY Django
- Cria senhas fortes
- Formato pronto para `.env`
- Copia para clipboard

### 5. 💾 Monitoramento de Disco
**Script:** `05-disk-usage.sh`
```bash
# Monitoramento básico
./scripts/05-disk-usage.sh

# Análise detalhada
./scripts/05-disk-usage.sh -d -l

# Alerta em 90%
./scripts/05-disk-usage.sh -t 90
```
- Monitora uso de disco
- Analisa volumes Docker
- Identifica logs grandes
- Alertas configuráveis

### 6. 🔒 Certificados SSL
**Script:** `06-ssl-cert.sh`
```bash
# Novo certificado
./scripts/06-ssl-cert.sh -d meu-site.com -e admin@meu-site.com

# Renovar certificado
./scripts/06-ssl-cert.sh -d meu-site.com -r

# Modo teste
./scripts/06-ssl-cert.sh -d meu-site.com -t
```
- Gera certificados Let's Encrypt
- Renovação automática
- Configura cron jobs
- Modo teste disponível

### 7. 🛡️ Configuração de Firewall
**Script:** `07-setup-firewall.sh`
```bash
# Configuração básica
sudo ./scripts/07-setup-firewall.sh

# Com portas adicionais
sudo ./scripts/07-setup-firewall.sh -p 3000,8080

# Simulação
sudo ./scripts/07-setup-firewall.sh -d
```
- Configura UFW
- Libera portas essenciais
- Modo simulação
- Validação de conectividade

### 8. 🔍 Verificação de Segurança do Banco
**Script:** `08-check-db-exposure.sh`
```bash
# Verificação básica
./scripts/08-check-db-exposure.sh

# Teste externo
./scripts/08-check-db-exposure.sh -e

# Aplicar correções
./scripts/08-check-db-exposure.sh -f
```
- Verifica se banco está exposto
- Testa conectividade externa
- Aplica correções automáticas
- Relatório detalhado

### 9. 🧹 Limpeza de Logs
**Script:** `09-cleanup-logs.sh`
```bash
# Limpeza básica
./scripts/09-cleanup-logs.sh

# Com compressão
./scripts/09-cleanup-logs.sh -c -r

# Manter 30 dias
./scripts/09-cleanup-logs.sh -d 30
```
- Limpa logs Docker
- Rotaciona logs grandes
- Comprime logs antigos
- Configurável por dias

### 10. 📋 Checklist de Deploy
**Script:** `10-deploy-checklist.sh`
```bash
# Checklist interativo
./scripts/10-deploy-checklist.sh

# Modo automático
./scripts/10-deploy-checklist.sh -a

# Com backup e testes
./scripts/10-deploy-checklist.sh -b -t -s
```
- Verifica pré-requisitos
- Executa backup automático
- Testa aplicação
- Log de atividades

### 11. 📝 Documentação de Customizações
**Script:** `11-note-custom.sh`
```bash
# Adicionar customização
./scripts/11-note-custom.sh -t config -d "Configuração SSL"

# Revisar customizações
./scripts/11-note-custom.sh -r

# Buscar customizações
./scripts/11-note-custom.sh -s "ssl"
```
- Documenta alterações manuais
- Sistema de prioridades
- Busca e revisão
- Histórico completo

### 12. 🧪 Teste de Restore
**Script:** `12-test-restore.sh`
```bash
# Teste básico
./scripts/12-test-restore.sh

# Com ambiente limpo
./scripts/12-test-restore.sh -c

# Simulação
./scripts/12-test-restore.sh -d
```
- Testa restore em ambiente isolado
- Verifica integridade
- Ambiente de teste limpo
- Simulação disponível

## 🚀 Configuração Inicial

### 1. Configurar Permissões
```bash
cd scripts
chmod +x setup-permissions.sh
./setup-permissions.sh
```

### 2. Proteger Arquivos .env
```bash
./scripts/01-gitignore-env.sh
```

### 3. Gerar Chaves Seguras
```bash
./scripts/04-generate-secrets.sh -e -c
```

### 4. Configurar Firewall
```bash
sudo ./scripts/07-setup-firewall.sh
```

### 5. Verificar Segurança
```bash
./scripts/08-check-db-exposure.sh -e
```

## 📊 Fluxo de Trabalho Recomendado

### Antes de Cada Deploy
1. **Backup:** `./scripts/02-backup-db.sh`
2. **Checklist:** `./scripts/10-deploy-checklist.sh -b -t`
3. **Teste:** `./scripts/12-test-restore.sh -c`
4. **Deploy:** `docker-compose up -d`
5. **Monitoramento:** `./scripts/05-disk-usage.sh`

### Manutenção Regular
1. **Limpeza:** `./scripts/09-cleanup-logs.sh -c -r`
2. **Monitoramento:** `./scripts/05-disk-usage.sh -d`
3. **Segurança:** `./scripts/08-check-db-exposure.sh`
4. **SSL:** `./scripts/06-ssl-cert.sh -r` (mensal)

### Documentação
1. **Registrar:** `./scripts/11-note-custom.sh` (após cada alteração)
2. **Revisar:** `./scripts/11-note-custom.sh -r` (semanal)

## 🔧 Dependências

### Pacotes Necessários
```bash
sudo apt-get update
sudo apt-get install -y \
    docker.io \
    docker-compose \
    postgresql-client \
    nginx \
    certbot \
    ufw \
    bc \
    curl \
    netcat \
    xclip
```

### Verificações de Sistema
- Docker rodando
- Usuário no grupo docker
- Permissões de sudo para firewall/SSL
- Espaço em disco suficiente

## 🛡️ Segurança

### Boas Práticas
- ✅ Sempre execute backup antes de alterações
- ✅ Teste restores antes de produção
- ✅ Documente todas as customizações
- ✅ Monitore logs regularmente
- ✅ Mantenha certificados SSL atualizados
- ✅ Verifique segurança do banco

### Alertas Críticos
- 🚨 Disco acima de 85%
- 🚨 Banco exposto externamente
- 🚨 Certificados SSL expirando
- 🚨 Logs muito grandes
- 🚨 Firewall desabilitado

## 📞 Suporte

### Logs Importantes
- `deploy-checklist.log` - Log do checklist de deploy
- `customizacoes.txt` - Histórico de customizações
- `backups/` - Diretório de backups
- `docker-compose logs` - Logs dos containers

### Comandos de Diagnóstico
```bash
# Status geral
docker-compose ps
docker system df
df -h

# Logs
docker-compose logs -f
tail -f deploy-checklist.log

# Segurança
sudo ufw status
./scripts/08-check-db-exposure.sh -e
```

## 📝 Notas

- Todos os scripts são idempotentes (podem ser executados múltiplas vezes)
- Scripts validam pré-requisitos automaticamente
- Mensagens em português para facilitar uso
- Cores no output para melhor visualização
- Logs detalhados para auditoria

---

**Desenvolvido para Metaltec - Sistema de Automação de Infraestrutura** 