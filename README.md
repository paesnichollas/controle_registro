# Controle Registro - Monorepo

Este é um monorepo contendo o sistema de controle de registro da Metaltec, composto por:

## 📁 Estrutura do Projeto

```
controle-registro/
├── api_django/          # Backend Django (API REST)
├── frontend_react/      # Frontend React (Interface)
├── docker-compose.yml   # Orquestração dos containers
└── README.md           # Este arquivo
```

## 🚀 Tecnologias Utilizadas

### Backend (api_django/)
- **Django 5.2.4** - Framework web Python
- **Django REST Framework** - API REST
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e sessões
- **JWT** - Autenticação

### Frontend (frontend_react/)
- **React 18** - Biblioteca JavaScript
- **Vite** - Build tool
- **Tailwind CSS** - Framework CSS
- **Radix UI** - Componentes acessíveis
- **React Query** - Gerenciamento de estado
- **React Router** - Roteamento

## 🛠️ Como Executar

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)
- Python 3.11+ (para desenvolvimento local)

### Desenvolvimento Local

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd controle-registro
```

2. **Execute com Docker (Recomendado):**
```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up

# Produção
docker-compose -f docker-compose.prod.yml up
```

3. **Desenvolvimento local:**
```bash
# Backend
cd api_django
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt
python manage.py runserver

# Frontend
cd frontend_react
npm install
npm run dev
```

## 🌐 URLs de Acesso

### Desenvolvimento
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **Admin Django**: http://localhost:8000/admin
- **Documentação API**: http://localhost:8000/api/docs

### Produção
- **Aplicação**: http://localhost (ou domínio configurado)
- **Admin Django**: http://localhost/admin

## 📚 Documentação

- [Guia de Desenvolvimento](./api_django/README_WINDOWS.md)
- [Configuração Docker](./api_django/README_DOCKER.md)
- [Início Rápido](./api_django/QUICK_START.md)

## 🔧 Scripts Úteis

```bash
# Verificar status dos containers
docker-compose ps

# Logs do backend
docker-compose logs backend

# Logs do frontend
docker-compose logs frontend

# Acessar shell do backend
docker-compose exec backend python manage.py shell

# Acessar shell do frontend
docker-compose exec frontend sh
```

## 🚀 Deploy

Para fazer deploy em produção:

```bash
# Build das imagens
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 📝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

---

**Desenvolvido pela equipe Metaltec** 🏭
