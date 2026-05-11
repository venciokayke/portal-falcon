# syntax=docker/dockerfile:1

# Stage 1: Build da aplicação
FROM node:20-alpine AS builder

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm ci

# Copia o Prisma e gera o Client antes de buildar
COPY prisma ./prisma
RUN npx prisma generate

# Copia o restante do código
COPY . .

# Desabilita telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Garante que a pasta public exista para não quebrar o COPY no estágio final
RUN mkdir -p public

# Realiza o build (Isso vai gerar a pasta .next/standalone devido ao next.config.js)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run build

# Stage 2: Runner da imagem final (produção)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Configura usuário e grupo não-root por segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Cria o diretório .next e ajusta as permissões para o Next.js
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copia os assets públicos, se existirem (pode falhar silenciosamente se não existir na sua estrutura, 
# mas Next.js recomenda. Como COPY no docker falha se a pasta source não existir, vamos garantir que copie o build standalone)
# Mas para garantir que não quebre caso não haja pasta public, usamos COPY condicional, ou copiamos do standalone.
# Em Next standalone, a pasta public deve ser copiada manualmente se existir.
# Vamos criar uma pasta public vazia só para garantir que o COPY funcione
RUN mkdir -p /app/public
COPY --from=builder /app/public ./public

# Copia os arquivos gerados pelo standalone mode do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Muda para o usuário sem privilégios root
USER nextjs

EXPOSE 3000

ENV PORT=3000
# Define o hostname para todas as interfaces
ENV HOSTNAME="0.0.0.0"

# O Next.js standalone gera um server.js na raiz
CMD ["node", "server.js"]
