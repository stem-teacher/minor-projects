FROM node:18-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY tsconfig.json ./
COPY index.ts ./

# Set environment variables (these will be overridden at runtime)
ENV OPENAI_API_KEY=""
ENV GEMINI_API_KEY=""
ENV OLLAMA_URL="http://localhost:11434"
ENV OPENAI_DEFAULT_MODEL="gpt-4"
ENV GEMINI_DEFAULT_MODEL="gemini-1.5-pro"
ENV OLLAMA_DEFAULT_MODEL="llama3"

# Run the server
CMD ["npm", "start"]