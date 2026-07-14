-- Detail App — Script de inicialização do banco de dados
-- Este script é executado automaticamente na primeira inicialização do PostgreSQL
-- via Docker Compose

-- Criar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para buscas por similaridade

-- Informações básicas
SELECT 'Detail App database initialized successfully' AS message;
