#!/bin/bash

# ====================================
# ZETAFIN BOT - SETUP AUTOMÁTICO
# ====================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando setup do ZetaFin Bot..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para checar dependências
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 não encontrado. Por favor, instale antes de continuar.${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ $1 instalado${NC}"
    fi
}

# 1. Verificar dependências
echo "📦 Verificando dependências..."
check_dependency "node"
check_dependency "npm"
check_dependency "docker"
check_dependency "docker-compose"

# Verificar versão do Node
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ é necessário. Versão atual: $(node -v)${NC}"
    exit 1
fi

echo ""

# 2. Instalar dependências npm
echo "📥 Instalando dependências npm..."
npm install
echo -e "${GREEN}✅ Dependências instaladas${NC}"
echo ""

# 3. Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "⚙️ Criando arquivo .env..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️ Por favor, edite o arquivo .env com suas credenciais${NC}"
    echo -e "${YELLOW}   nano .env${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Arquivo .env já existe${NC}"
    echo ""
fi

# 4. Criar diretório de logs
echo "📁 Criando diretórios necessários..."
mkdir -p logs
mkdir -p temp
echo -e "${GREEN}✅ Diretórios criados${NC}"
echo ""

# 5. Iniciar RabbitMQ
echo "🐰 Iniciando RabbitMQ..."
docker-compose up -d rabbitmq

# Aguardar RabbitMQ ficar pronto
echo "⏳ Aguardando RabbitMQ inicializar..."
sleep 10

# Verificar se está rodando
if docker ps | grep -q zetafin-rabbitmq; then
    echo -e "${GREEN}✅ RabbitMQ iniciado com sucesso${NC}"
    echo -e "   Management UI: ${GREEN}http://localhost:15672${NC} (guest/guest)"
else
    echo -e "${RED}❌ Falha ao iniciar RabbitMQ${NC}"
    exit 1
fi
echo ""

# 6. Testar conexão com backend
echo "🔗 Testando conexão com backend..."
BACKEND_URL=$(grep C_BACKEND_URL .env | cut -d '=' -f2)

if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️ Backend URL não configurada no .env${NC}"
else
    if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200"; then
        echo -e "${GREEN}✅ Backend acessível${NC}"
    else
        echo -e "${YELLOW}⚠️ Backend não acessível em: $BACKEND_URL${NC}"
        echo -e "${YELLOW}   Certifique-se que o backend está rodando${NC}"
    fi
fi
echo ""

# 7. Verificar OpenAI API Key
echo "🤖 Verificando OpenAI API Key..."
OPENAI_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2)

if [ -z "$OPENAI_KEY" ] || [ "$OPENAI_KEY" = "sk-proj-sua-chave-aqui" ]; then
    echo -e "${YELLOW}⚠️ Configure sua OpenAI API Key no arquivo .env${NC}"
else
    echo -e "${GREEN}✅ OpenAI API Key configurada${NC}"
fi
echo ""

# 8. Executar testes
echo "🧪 Executando testes..."
if npm test; then
    echo -e "${GREEN}✅ Testes passaram${NC}"
else
    echo -e "${YELLOW}⚠️ Alguns testes falharam (pode ser normal se ainda não configurou tudo)${NC}"
fi
echo ""

# 9. Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Setup concluído!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Configure suas credenciais:"
echo -e "   ${YELLOW}nano .env${NC}"
echo ""
echo "2. Inicie os serviços:"
echo -e "   ${GREEN}npm run dev${NC}         # Bot (terminal 1)"
echo -e "   ${GREEN}npm run dev:worker${NC}   # Worker (terminal 2)"
echo ""
echo "3. Ou use Docker Compose:"
echo -e "   ${GREEN}docker-compose up -d${NC}"
echo ""
echo "4. Configure o webhook do Twilio:"
echo -e "   ${GREEN}ngrok http 3000${NC}"
echo -e "   URL: ${GREEN}https://sua-url.ngrok.io/webhook/whatsapp${NC}"
echo ""
echo "5. Teste via WhatsApp ou curl:"
echo -e "   ${GREEN}curl -X POST http://localhost:3000/webhook/whatsapp \\${NC}"
echo -e "   ${GREEN}  -d 'From=whatsapp:+5511999999999' \\${NC}"
echo -e "   ${GREEN}  -d 'Body=Gastei 150 no mercado'${NC}"
echo ""
echo "📚 Documentação completa: README.md"
echo "🆘 Precisa de ajuda? lucas_likes@hotmail.com"
echo ""
echo -e "${GREEN}Bom desenvolvimento! 🚀${NC}"