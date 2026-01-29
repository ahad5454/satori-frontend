# Stage 1: Build the React App
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies (use npm ci for deterministic builds)
RUN npm ci --only=production

# Copy source code
COPY . .

# Accept API URL as build argument
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy build artifacts from stage 1
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Nginx defaults to 80)
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]