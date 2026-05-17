# Use official lightweight Node.js Alpine base image
FROM node:20-alpine

# Set target application directory inside container
WORKDIR /usr/src/app

# Copy dependency manifests (if package.json exists) and application files
# Since this is a vanilla static server, copy all files in directory
COPY . .

# Expose server listener port
EXPOSE 8081

# Run in production mode
ENV NODE_ENV=production

# Start static HTTP server
CMD ["node", "server.js"]
