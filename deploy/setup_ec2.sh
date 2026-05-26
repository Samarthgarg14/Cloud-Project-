#!/bin/bash
# Exit on any error
set -e

echo "Starting EC2 Setup for Deadlock Visualizer..."

# 1. Update Ubuntu packages
echo "Updating packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Docker
echo "Installing Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Allow ubuntu user to run docker without sudo (requires logout/login to take full effect)
sudo usermod -aG docker ubuntu

# 3. Install Nginx as reverse proxy
echo "Installing Nginx..."
sudo apt-get install -y nginx

# 4. Configure Nginx to forward port 80 -> 5000
echo "Configuring Nginx..."
sudo bash -c 'cat > /etc/nginx/sites-available/deadlock_visualizer <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF'

# Enable the Nginx site and restart
sudo ln -sf /etc/nginx/sites-available/deadlock_visualizer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl enable nginx
sudo systemctl restart nginx

# 5. Pull Docker image and run container
# Prompt for Docker username (or provide as script argument)
DOCKER_USERNAME=${1:-"your_docker_username"}

if [ "$DOCKER_USERNAME" == "your_docker_username" ]; then
    read -p "Enter your Docker Hub username to pull the image: " DOCKER_USERNAME
fi

echo "Pulling image from $DOCKER_USERNAME/deadlock-visualizer:latest..."
sudo docker pull $DOCKER_USERNAME/deadlock-visualizer:latest

# Clean up any existing container
sudo docker stop deadlock-visualizer || true
sudo docker rm deadlock-visualizer || true

# 6. Run container and Setup auto-restart on reboot (--restart always)
echo "Starting Docker container..."
sudo docker run -d \
  --name deadlock-visualizer \
  --restart always \
  -p 5000:5000 \
  $DOCKER_USERNAME/deadlock-visualizer:latest

echo "=================================================="
echo "Setup Complete!"
echo "Your Flask app is running and exposed on port 80 via Nginx."
echo "You can now visit your EC2 Public IPv4 address in your browser."
echo "=================================================="
