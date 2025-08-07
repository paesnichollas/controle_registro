# Scripts de Automação - Sistema Django + React

> **📋 RESUMO**: Scripts de automação para segurança, backup, monitoramento e manutenção

## 🚀 Scripts Criados

### 1. **01-check-volumes.sh** - Verificação de Volumes
- **Função**: Verifica volumes anônimos e sugere conversão para volumes nomeados
- **Uso**: `./scripts/01-check-volumes.sh`
- **Recursos**:
  - Detecta volumes anônimos em containers
  - Verifica configuração do docker-compose
  - Sugere melhorias de segurança

### 2. **02-backup-all.sh** - Backup Completo
- **Função**: Backup automatizado do banco PostgreSQL e pasta media
- **Uso**: `./scripts/02-backup-all.sh [--upload] [--encrypt]`
- **Recursos**:
  - Backup do banco de dados
  - Backup da pasta media
  - Backup dos volumes Docker
  - Upload para nuvem (opcional)
  - Criptografia (opcional)
  - Limpeza automática de backups antigos

### 3. **03-restore-test.sh** - Teste de Restore
- **Função**: Teste de restore completo em ambiente limpo
- **Uso**: `./scripts/03-restore-test.sh [backup_file] [--clean]`
- **Recursos**:
  - Ambiente de teste isolado
  - Restore de banco e mídia
  - Validação de endpoints
  - Teste de conectividade
  - Relatório detalhado

### 4. **04-monitoring.sh** - Monitoramento
- **Função**: Monitoramento de serviços e alertas
- **Uso**: `./scripts/04-monitoring.sh [--email] [--telegram] [--cron]`
- **Recursos**:
  - Verificação de containers essenciais
  - Monitoramento de CPU, RAM e disco
  - Teste de endpoints
  - Alertas por e-mail/Telegram
  - Monitoramento contínuo via cron

### 5. **05-check-debug-env.sh** - Verificação de Configurações
- **Função**: Verifica DEBUG=False e variáveis essenciais
- **Uso**: `./scripts/05-check-debug-env.sh [--fix] [--backup]`
- **Recursos**:
  - Verificação de DEBUG=True em produção
  - Validação de variáveis essenciais
  - Verificação de segurança das variáveis
  - Correção automática de problemas
  - Backup do arquivo .env

### 6. **06-fix-permissions.sh** - Correção de Permissões
- **Função**: Ajusta permissões de media/static
- **Uso**: `./scripts/06-fix-permissions.sh [--dry-run] [--backup]`
- **Recursos**:
  - Correção de permissões de diretórios
  - Verificação de ownership
  - Teste de acesso aos diretórios
  - Backup das permissões atuais
  - Modo dry-run para testes

### 7. **07-check-ports.sh** - Verificação de Portas
- **Função**: Verifica conflitos de portas
- **Uso**: `./scripts/07-check-ports.sh [--fix] [--kill-conflicts]`
- **Recursos**:
  - Verificação de portas em uso
  - Detecção de conflitos entre containers
  - Teste de conectividade
  - Correção automática de conflitos
  - Relatório detalhado

### 8. **08-update-checklist.sh** - Checklist de Atualização
- **Função**: Atualização segura com backup e validação
- **Uso**: `./scripts/08-update-checklist.sh [--auto] [--rollback] [--validate]`
- **Recursos**:
  - Backup pré-atualização
  - Atualização de código
  - Reconstrução de imagens
  - Validação de endpoints
  - Rollback automático em caso de falha
  - Modo automático ou interativo

### 9. **09-protect-admin.sh** - Proteção do Admin
- **Função**: Protege /admin do Django com restrições de IP
- **Uso**: `./scripts/09-protect-admin.sh [--add-ip IP] [--remove-ip IP] [--disable] [--enable]`
- **Recursos**:
  - Configuração de IPs permitidos
  - Proteção via nginx
  - Validação de IPs
  - Teste de acesso
  - Relatório de segurança

### 10. **10-generate-shell-commands.sh** - Documentação
- **Função**: Gera documentação de comandos shell
- **Uso**: `./scripts/10-generate-shell-commands.sh [--update]`
- **Recursos**:
  - Geração automática de README
  - Documentação de 100+ comandos
  - 10 seções organizadas
  - Atualização automática

## 📊 Estatísticas dos Scripts

- **Total de scripts**: 10
- **Linhas de código**: ~3000+
- **Funcionalidades**: 50+
- **Comandos documentados**: 100+
- **Recursos de segurança**: 15+
- **Recursos de backup**: 8+
- **Recursos de monitoramento**: 12+

## 🔧 Características Técnicas

### Segurança
- ✅ Validação de dependências
- ✅ Verificação de permissões
- ✅ Detecção de configurações inseguras
- ✅ Backup automático antes de mudanças
- ✅ Modo dry-run para testes

### Portabilidade
- ✅ Compatível com Ubuntu/Debian
- ✅ Verificação de dependências
- ✅ Mensagens em português
- ✅ Comentários didáticos
- ✅ Tratamento de erros

### Automação
- ✅ Scripts idempotentes
- ✅ Correção automática de problemas
- ✅ Relatórios detalhados
- ✅ Logs estruturados
- ✅ Notificações automáticas

## 🚀 Como Usar

### Primeira execução
```bash
# Dar permissão aos scripts
chmod +x scripts/*.sh

# Verificar volumes
./scripts/01-check-volumes.sh

# Configurar permissões
./scripts/06-fix-permissions.sh

# Verificar configurações
./scripts/05-check-debug-env.sh --fix
```

### Backup e segurança
```bash
# Backup completo
./scripts/02-backup-all.sh

# Proteger admin
./scripts/09-protect-admin.sh --enable

# Monitoramento
./scripts/04-monitoring.sh --email
```

### Manutenção
```bash
# Verificar portas
./scripts/07-check-ports.sh

# Atualização segura
./scripts/08-update-checklist.sh

# Teste de restore
./scripts/03-restore-test.sh
```

## 📚 Documentação Completa

Para ver todos os comandos disponíveis, execute:
```bash
./scripts/10-generate-shell-commands.sh
```

Isso gerará um arquivo `README_shell.md` com:
- 10 seções organizadas
- 100+ comandos documentados
- Exemplos práticos
- Soluções para problemas comuns

## 🎯 Benefícios

### Para Desenvolvedores Júnior
- ✅ Scripts didáticos e bem comentados
- ✅ Mensagens em português
- ✅ Modo dry-run para aprendizado
- ✅ Documentação automática
- ✅ Tratamento de erros comum

### Para Produção
- ✅ Automação de tarefas críticas
- ✅ Segurança reforçada
- ✅ Monitoramento contínuo
- ✅ Backup automático
- ✅ Rollback em caso de problemas

### Para Manutenção
- ✅ Verificações automáticas
- ✅ Correção de problemas
- ✅ Relatórios detalhados
- ✅ Logs estruturados
- ✅ Notificações proativas

## 🔄 Atualizações

Para manter os scripts atualizados:
```bash
# Atualizar documentação
./scripts/10-generate-shell-commands.sh --update

# Verificar novos scripts
ls -la scripts/
```

---

> **💡 Dica**: Todos os scripts incluem ajuda integrada. Execute `./scripts/[script].sh` sem argumentos para ver as opções disponíveis. 