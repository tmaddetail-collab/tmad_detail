# Detail App 🚗✨

> Sistema completo de gestão para estéticas automotivas, lava rápidos, detalhamento automotivo e centros automotivos.

![Detail App](https://img.shields.io/badge/Detail%20App-v1.0.0-E11D48?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)

---

## 📋 Índice

- [Funcionalidades](#funcionalidades)
- [Stack Tecnológica](#stack-tecnológica)
- [Requisitos](#requisitos)
- [Instalação Rápida (Docker)](#instalação-rápida-docker)
- [Instalação Manual](#instalação-manual)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Google OAuth](#google-oauth)
- [Documentação da API](#documentação-da-api)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Usuários Padrão](#usuários-padrão)
- [Deploy em Produção](#deploy-em-produção)
- [LGPD e Segurança](#lgpd-e-segurança)

---

## ✨ Funcionalidades

### 👤 Perfil Cliente
- ✅ Cadastro com CPF, telefone, e-mail e senha
- ✅ Login com Google (OAuth)
- ✅ Dashboard com próximos agendamentos e histórico
- ✅ Cadastro e gerenciamento de veículos
- ✅ Agendamento de serviços online
- ✅ Acompanhamento de status em tempo real
- ✅ Histórico completo com fotos antes/depois
- ✅ Visualização de pagamentos
- ✅ Aprovação digital com assinatura eletrônica

### 🏪 Perfil Lojista/Admin
- ✅ Dashboard com KPIs e gráficos interativos
- ✅ Agenda completa (dia/semana/mês)
- ✅ Gestão de clientes (CRUD + histórico)
- ✅ Gestão de veículos (CRUD + histórico)
- ✅ Ordens de Serviço automatizadas
- ✅ Checklist digital personalizável com fotos
- ✅ Catálogo de serviços personalizados
- ✅ Controle financeiro completo (receitas, despesas, fluxo de caixa)
- ✅ Relatórios analíticos
- ✅ Histórico completo de auditoria
- ✅ Notificações por e-mail (WhatsApp: estrutura preparada)

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilização** | Tailwind CSS v3 |
| **Backend** | Python 3.12 + FastAPI |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Migrations** | Alembic |
| **Banco de Dados** | PostgreSQL 16 |
| **Cache/Filas** | Redis 7 |
| **Autenticação** | JWT + Google OAuth |
| **Proxy** | NGINX |
| **Infraestrutura** | Docker + Docker Compose |

---

## 📦 Requisitos

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+
- [Node.js](https://nodejs.org/) 20+ (para desenvolvimento local)
- [Python](https://www.python.org/) 3.12+ (para desenvolvimento local)

---

## 🚀 Instalação Rápida (Docker)

### 1. Clone e configure

```bash
git clone https://github.com/seu-usuario/detail-app.git
cd detail-app

# Copie e configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 2. Suba os serviços

```bash
docker-compose up -d
```

### 3. Acesse o sistema

| Serviço | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:8000 |
| **Swagger Docs** | http://localhost:8000/docs |
| **ReDoc** | http://localhost:8000/redoc |

---

## 🔧 Instalação Manual

### Backend

```bash
cd backend

# Crie e ative o ambiente virtual
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp ../.env.example .env
# Edite o .env

# Execute as migrations
alembic upgrade head

# Popule o banco com dados iniciais
python app/seed.py

# Inicie o servidor
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite o .env.local

# Inicie o servidor de desenvolvimento
npm run dev
```

---

## ⚙️ Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

### Essenciais

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgresql+asyncpg://user:pass@localhost/db` |
| `SECRET_KEY` | Chave secreta JWT (gere com `openssl rand -hex 64`) | `abc123...` |
| `FRONTEND_URL` | URL do frontend | `http://localhost:3000` |

### Google OAuth (opcional)

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google Cloud |

### E-mail SMTP (opcional)

| Variável | Descrição |
|----------|-----------|
| `MAIL_SERVER` | Servidor SMTP |
| `MAIL_USERNAME` | Usuário SMTP |
| `MAIL_PASSWORD` | Senha ou App Password |
| `MAIL_FROM` | E-mail remetente |

---

## 🔐 Google OAuth

Para habilitar o login com Google:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Vá em **APIs & Services > Credentials**
4. Clique em **Create Credentials > OAuth Client ID**
5. Selecione **Web application**
6. Configure as origens autorizadas:
   - `http://localhost:3000` (desenvolvimento)
   - `https://seu_dominio.com` (produção)
7. Configure os URIs de redirecionamento:
   - `http://localhost:3000/auth/google/callback`
8. Copie o **Client ID** e **Client Secret** para o `.env`

---

## 📖 Documentação da API

A API é documentada automaticamente com Swagger UI:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### Endpoints Principais

| Grupo | Prefixo |
|-------|---------|
| Autenticação | `/api/v1/auth` |
| Usuários | `/api/v1/users` |
| Veículos | `/api/v1/vehicles` |
| Agendamentos | `/api/v1/appointments` |
| Serviços | `/api/v1/services` |
| Ordens de Serviço | `/api/v1/orders` |
| Checklists | `/api/v1/checklists` |
| Financeiro | `/api/v1/financial` |
| Relatórios | `/api/v1/reports` |
| Uploads | `/api/v1/uploads` |
| Notificações | `/api/v1/notifications` |

---

## 📁 Estrutura do Projeto

```
detail-app/
├── docker-compose.yml          # Dev
├── docker-compose.prod.yml     # Produção
├── .env.example                # Template de variáveis
├── README.md
├── nginx/
│   ├── nginx.conf
│   └── default.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── dependencies.py
│       ├── models/
│       ├── schemas/
│       ├── routers/
│       ├── services/
│       └── utils/
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── api/
        ├── components/
        ├── contexts/
        ├── hooks/
        ├── pages/
        ├── store/
        ├── types/
        └── utils/
```

---

## 👥 Usuários Padrão

Após executar o seed (`python app/seed.py`), os seguintes usuários são criados:

| Perfil | E-mail | Senha |
|--------|--------|-------|
| **Administrador** | `admin@detailapp.com` | `Admin@123` |
| **Cliente** | `cliente@exemplo.com` | `Cliente@123` |

> ⚠️ **Altere as senhas padrão imediatamente em produção!**

---

## 🚀 Deploy em Produção

### 1. Configure o servidor

```bash
# Clone o repositório no servidor
git clone https://github.com/seu-usuario/detail-app.git
cd detail-app

# Configure as variáveis de ambiente de produção
cp .env.example .env
nano .env  # Configure todas as variáveis
```

### 2. Configure SSL (recomendado: Let's Encrypt)

```bash
# Instale Certbot
apt-get install certbot

# Gere o certificado
certbot certonly --standalone -d seu_dominio.com

# Copie os certificados para o diretório nginx
cp /etc/letsencrypt/live/seu_dominio.com/fullchain.pem ./nginx/ssl/
cp /etc/letsencrypt/live/seu_dominio.com/privkey.pem ./nginx/ssl/
```

### 3. Suba em produção

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Backup automático do banco

```bash
# Adicione ao crontab para backup diário
0 2 * * * docker exec detailapp_postgres_prod pg_dump -U detailapp detailapp > /backups/detailapp_$(date +%Y%m%d).sql
```

---

## 🔒 LGPD e Segurança

O Detail App foi desenvolvido com foco em conformidade com a **Lei Geral de Proteção de Dados (LGPD)**:

### Medidas Implementadas

| Área | Implementação |
|------|---------------|
| **Criptografia** | Senhas com bcrypt (custo 12), JWT com HS256 |
| **Dados Pessoais** | CPF e telefone armazenados de forma segura |
| **Auditoria** | Registro completo de todas as operações |
| **Acesso** | RBAC (controle por perfil de usuário) |
| **Transporte** | HTTPS em produção (TLS 1.2/1.3) |
| **Rate Limiting** | Proteção contra ataques de força bruta |
| **Uploads** | Validação de tipo e tamanho de arquivo |
| **CORS** | Origins restritos configuráveis |
| **SQL Injection** | Prevenido pelo SQLAlchemy ORM |

### Direitos do Titular (LGPD Art. 18)

- ✅ Acesso aos próprios dados (perfil e histórico)
- ✅ Correção de dados incompletos ou incorretos
- ✅ Exclusão/anonimização de conta (implementar conforme necessidade)
- ✅ Portabilidade (exportação via relatórios)
- ✅ Revogação de consentimento (Google OAuth)

> **Recomendação**: Para compliance completo com a LGPD, considere adicionar:
> - Política de Privacidade visível no sistema
> - Termo de Consentimento no cadastro
> - DPO (Data Protection Officer) designado
> - Relatório de Impacto à Proteção de Dados (RIPD)

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Suporte

Para dúvidas ou suporte:
- 📧 E-mail: suporte@detailapp.com
- 📱 WhatsApp: (00) 00000-0000

---

*Desenvolvido com ❤️ para o segmento de estética automotiva*
