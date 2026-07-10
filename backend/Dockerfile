    FROM node:20-alpine AS builder

    WORKDIR /app
    
    COPY package*.json ./
    RUN npm install --production

    COPY . .
    
    FROM node:20-alpine
    
    WORKDIR /app
    
    COPY --from=builder /app ./
    
    ENV PORT=5000
    
    COPY .env .env
    
    EXPOSE 5000
 
    CMD ["npm", "start"]
    
