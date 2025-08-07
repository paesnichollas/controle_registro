# 🚀 Início Rápido - Controle Registro

Este guia te ajudará a configurar e executar o projeto Controle Registro rapidamente.

## 📋 Pré-requisitos

- **Docker** e **Docker Compose** instalados
- **Git** para clonar o repositório
- **Node.js 18+** (opcional, para desenvolvimento local)
- **Python 3.11+** (opcional, para desenvolvimento local)

## 🛠️ Configuração Rápida

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd controle-registro
```

### 2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

### 3. Execute o script de setup (Recomendado)
```bash
# Torne o script executável (Linux/Mac)
chmod +x scripts/dev-setup.sh

# Execute o setup
./scripts/dev-setup.sh
```

**OU**

### 3. Configuração manual
```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Produção
docker-compose -f docker-compose.prod.yml up -d
```

## 🌐 URLs de Acesso

Após a configuração, você pode acessar:

### Desenvolvimento
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin
- **Documentação API**: http://localhost:8000/api/docs

### Produção
- **Aplicação**: http://localhost
- **Admin Django**: http://localhost/admin

## 🔧 Comandos Úteis

### Desenvolvimento
```bash
# Iniciar ambiente de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Parar serviços
docker-compose -f docker-compose.dev.yml down

# Reiniciar serviços
docker-compose -f docker-compose.dev.yml restart
```

### Produção
```bash
# Deploy completo
./scripts/deploy.sh

# Iniciar produção
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Parar serviços
docker-compose -f docker-compose.prod.yml down
```

### Desenvolvimento Local (sem Docker)

#### Backend
```bash
cd api_django
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt
python manage.py runserver
```

#### Frontend
```bash
cd frontend_react
npm install
npm run dev
```

## 📊 Monitoramento

### Verificar status dos serviços
```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml ps

# Produção
docker-compose -f docker-compose.prod.yml ps
```

### Logs específicos
```bash
# Backend
docker-compose -f docker-compose.dev.yml logs -f backend

# Frontend
docker-compose -f docker-compose.dev.yml logs -f frontend

# Banco de dados
docker-compose -f docker-compose.dev.yml logs -f db
```

## 🔍 Troubleshooting

### Problemas comuns

#### 1. Porta já em uso
```bash
# Verificar portas em uso
netstat -tulpn | grep :8000
netstat -tulpn | grep :5173

# Parar serviços conflitantes
sudo lsof -ti:8000 | xargs kill -9
```

#### 2. Problemas de permissão
```bash
# Dar permissão aos scripts
chmod +x scripts/*.sh
```

#### 3. Limpar containers e volumes
```bash
# Parar e remover tudo
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a
```

#### 4. Rebuild das imagens
```bash
# Rebuild completo
docker-compose -f docker-compose.dev.yml build --no-cache
```

## 📝 Próximos Passos

1. **Configurar banco de dados**: Execute as migrações
2. **Criar superusuário**: Acesse o admin do Django
3. **Configurar domínio**: Para produção, atualize as URLs no `.env`
4. **Configurar SSL**: Para produção, configure certificados SSL

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Consulte a documentação completa no `README.md`
3. Verifique se todas as dependências estão instaladas
4. Certifique-se de que o Docker está rodando

---

**🎉 Parabéns!** Seu ambiente está configurado e pronto para desenvolvimento!
