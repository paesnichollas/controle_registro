# Comandos Shell Importantes - Sistema Django + React

> **⚠️ IMPORTANTE**: Este arquivo é gerado automaticamente. Não edite manualmente.

## 📋 Índice

- [🔧 Configuração Inicial](#configuração-inicial)
- [🐳 Docker e Containers](#docker-e-containers)
- [💾 Backup e Restore](#backup-e-restore)
- [🔒 Segurança](#segurança)
- [📊 Monitoramento](#monitoramento)
- [🛠️ Manutenção](#manutenção)
- [🚀 Deploy e Atualização](#deploy-e-atualização)
- [🧪 Testes](#testes)
- [📝 Logs e Debug](#logs-e-debug)
- [🔍 Diagnóstico](#diagnóstico)

---


## 🔧 Configuração Inicial

### Primeira execução
```bash
# Clonar repositório
git clone <url-do-repositorio>
cd api_django

# Configurar variáveis de ambiente
cp env.example .env
nano .env  # Editar variáveis

# Dar permissão aos scripts
chmod +x scripts/*.sh

# Verificar volumes Docker
./scripts/01-check-volumes.sh

# Configurar permissões
./scripts/06-fix-permissions.sh

# Verificar configurações de segurança
./scripts/05-check-debug-env.sh --fix
```

### Configuração de segurança
```bash
# Proteger acesso ao admin
./scripts/09-protect-admin.sh --enable
./scripts/09-protect-admin.sh --add-ip SEU_IP_AQUI

# Verificar configurações críticas
./scripts/05-check-debug-env.sh
```


## 🐳 Docker e Containers

### Comandos básicos
```bash
# Subir todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Ver status dos containers
docker-compose ps

# Ver logs
docker-compose logs -f [servico]

# Reconstruir imagens
docker-compose build --no-cache

# Limpar recursos não utilizados
docker system prune -f
```

### Gerenciamento de containers
```bash
# Reiniciar serviço específico
docker-compose restart [servico]

# Parar serviço específico
docker-compose stop [servico]

# Iniciar serviço específico
docker-compose start [servico]

# Ver logs de um serviço
docker-compose logs [servico]

# Executar comando em container
docker-compose exec [servico] [comando]
```

### Volumes e dados
```bash
# Ver volumes
docker volume ls

# Backup de volume
docker run --rm -v [volume]:/data -v /backup:/backup alpine tar czf /backup/[volume].tar.gz -C /data .

# Restaurar volume
docker run --rm -v [volume]:/data -v /backup:/backup alpine tar xzf /backup/[volume].tar.gz -C /data
```


## 💾 Backup e Restore

### Backup completo
```bash
# Backup automático (banco + mídia + volumes)
./scripts/02-backup-all.sh

# Backup com upload para nuvem
./scripts/02-backup-all.sh --upload

# Backup criptografado
./scripts/02-backup-all.sh --encrypt

# Backup manual do banco
docker-compose exec db pg_dump -U postgres controle_os > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore
```bash
# Teste de restore completo
./scripts/03-restore-test.sh [arquivo_backup]

# Restore do banco
docker-compose exec -T db psql -U postgres controle_os < backup.sql

# Restore de volume
docker run --rm -v [volume]:/data -v /backup:/backup alpine tar xzf /backup/[volume].tar.gz -C /data
```

### Limpeza de backups
```bash
# Remover backups antigos (mais de 30 dias)
find /backups -name "*.sql" -mtime +30 -delete
find /backups -name "*.tar.gz" -mtime +30 -delete
```


## 🔒 Segurança

### Verificações de segurança
```bash
# Verificar configurações críticas
./scripts/05-check-debug-env.sh

# Verificar permissões
./scripts/06-fix-permissions.sh

# Verificar conflitos de porta
./scripts/07-check-ports.sh

# Auditoria de segurança
./scripts/13-security-audit.sh
```

### Proteção do admin
```bash
# Configurar proteção básica
./scripts/09-protect-admin.sh

# Adicionar IP permitido
./scripts/09-protect-admin.sh --add-ip 192.168.1.100

# Remover IP permitido
./scripts/09-protect-admin.sh --remove-ip 192.168.1.100

# Listar IPs permitidos
./scripts/09-protect-admin.sh --list

# Testar acesso
./scripts/09-protect-admin.sh --test
```

### Configurações de firewall
```bash
# Configurar firewall básico
./scripts/07-setup-firewall.sh

# Verificar exposição do banco
./scripts/08-check-db-exposure.sh
```


## 📊 Monitoramento

### Monitoramento básico
```bash
# Verificar status dos serviços
./scripts/04-monitoring.sh

# Monitoramento com notificações
./scripts/04-monitoring.sh --email --telegram

# Configurar monitoramento contínuo
./scripts/04-monitoring.sh --cron
```

### Verificações específicas
```bash
# Verificar uso de disco
./scripts/05-disk-usage.sh

# Verificar logs
./scripts/09-cleanup-logs.sh

# Verificar SSL
./scripts/06-ssl-cert.sh
```

### Alertas e notificações
```bash
# Configurar notificações por e-mail
# Editar EMAIL_TO no script 04-monitoring.sh

# Configurar notificações por Telegram
# Editar TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no script 04-monitoring.sh
```


## 🛠️ Manutenção

### Limpeza e otimização
```bash
# Limpar logs antigos
./scripts/09-cleanup-logs.sh

# Limpar containers parados
docker container prune -f

# Limpar imagens não utilizadas
docker image prune -f

# Limpar volumes não utilizados
docker volume prune -f

# Limpeza completa
docker system prune -a -f
```

### Verificações de saúde
```bash
# Verificar volumes
./scripts/01-check-volumes.sh

# Verificar portas
./scripts/07-check-ports.sh

# Verificar permissões
./scripts/06-fix-permissions.sh

# Verificar configurações
./scripts/05-check-debug-env.sh
```

### Atualizações de sistema
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Atualizar Docker
sudo apt install docker-ce docker-ce-cli containerd.io

# Atualizar docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```


## 🚀 Deploy e Atualização

### Deploy inicial
```bash
# Primeiro deploy
./deploy.sh

# Deploy com configurações específicas
docker-compose -f docker-compose.prod.yml up -d
```

### Atualizações
```bash
# Atualização segura com checklist
./scripts/08-update-checklist.sh

# Atualização automática
./scripts/08-update-checklist.sh --auto

# Rollback se necessário
./scripts/08-update-checklist.sh --rollback
```

### Deploy manual
```bash
# Parar serviços
docker-compose down

# Atualizar código
git pull origin main

# Reconstruir imagens
docker-compose build --no-cache

# Subir serviços
docker-compose up -d

# Verificar status
docker-compose ps
```


## 🧪 Testes

### Testes de funcionalidade
```bash
# Teste de restore
./scripts/03-restore-test.sh [backup_file]

# Teste de conectividade
curl -f http://localhost:8000/admin/
curl -f http://localhost/

# Teste de banco
docker-compose exec db psql -U postgres -d controle_os -c "SELECT 1;"
```

### Testes de segurança
```bash
# Teste de acesso ao admin
./scripts/09-protect-admin.sh --test

# Teste de exposição do banco
./scripts/08-check-db-exposure.sh

# Auditoria de segurança
./scripts/13-security-audit.sh
```

### Testes de performance
```bash
# Verificar uso de recursos
docker stats

# Verificar logs de erro
docker-compose logs | grep -i error

# Teste de carga básico
ab -n 100 -c 10 http://localhost/
```


## 📝 Logs e Debug

### Visualização de logs
```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs de serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Últimas 100 linhas
docker-compose logs --tail=100

# Logs com timestamp
docker-compose logs -t
```

### Debug e troubleshooting
```bash
# Entrar em container
docker-compose exec backend bash
docker-compose exec db psql -U postgres

# Verificar configurações
docker-compose config

# Verificar redes
docker network ls
docker network inspect [network_name]

# Verificar volumes
docker volume ls
docker volume inspect [volume_name]
```

### Logs do sistema
```bash
# Logs do Docker
sudo journalctl -u docker

# Logs do sistema
sudo journalctl -f

# Logs de rede
sudo journalctl -u systemd-networkd
```


## 🔍 Diagnóstico

### Verificações rápidas
```bash
# Status geral
docker-compose ps
df -h
free -h
top

# Verificar conectividade
ping -c 3 8.8.8.8
curl -f http://localhost:8000/

# Verificar portas
netstat -tlnp | grep -E ":(80|8000|5432|6379)"
```

### Problemas comuns

#### Container não inicia
```bash
# Verificar logs
docker-compose logs [servico]

# Verificar configuração
docker-compose config

# Verificar recursos
docker stats
```

#### Problemas de conectividade
```bash
# Verificar redes
docker network ls
docker network inspect [network_name]

# Verificar DNS
docker-compose exec backend nslookup db

# Testar conectividade entre containers
docker-compose exec backend ping db
```

#### Problemas de volume
```bash
# Verificar volumes
docker volume ls
docker volume inspect [volume_name]

# Recriar volume se necessário
docker volume rm [volume_name]
docker-compose up -d
```

#### Problemas de permissão
```bash
# Corrigir permissões
./scripts/06-fix-permissions.sh

# Verificar ownership
ls -la media/
ls -la staticfiles/
```


---

## 📚 Recursos Adicionais

### Documentação oficial
- [Docker Compose](https://docs.docker.com/compose/)
- [Django](https://docs.djangoproject.com/)
- [React](https://reactjs.org/docs/)
- [PostgreSQL](https://www.postgresql.org/docs/)

### Scripts disponíveis
```bash
# Listar todos os scripts
ls -la scripts/

# Ver ajuda de um script
./scripts/[script].sh --help
```

### Contatos e Suporte
- **Desenvolvedor**: [Seu Nome]
- **Email**: [seu-email@exemplo.com]
- **Documentação**: [link-para-docs]

---

> **💡 Dica**: Mantenha este arquivo atualizado executando `./scripts/10-generate-shell-commands.sh --update` regularmente.

