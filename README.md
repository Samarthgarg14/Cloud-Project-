# Deadlock Visualizer

![CI Status](https://github.com/Samarthgarg14/Activity-4/actions/workflows/deploy.yml/badge.svg)

An interactive, premium cyberpunk-themed simulator for visualizing Operating Systems concepts, specifically Deadlock Detection and Avoidance.

## Features

- **Resource Allocation Graph (RAG) & Wait-For Graph (WFG)**: Build dynamic node graphs and run **Cycle Detection (DFS)** to find deadlocks in real time.
- **Banker's Algorithm Simulator**: Compute `Need` matrices and determine `SAFE` vs `UNSAFE` sequences with step-by-step logging.
- **Premium UI**: Cyberpunk aesthetics, animated glass panels, and interactive D3.js physics.

## Local Setup

### Using Docker (Recommended)
1. Ensure Docker Desktop is running.
2. Run `docker compose up --build`.
3. Open `http://localhost:5001` in your browser.

### Using Python Virtual Environment
1. Install requirements: `pip install -r requirements.txt`
2. Run the tests: `pytest tests/`
3. Start the Flask server: `python app.py`

## CI/CD Pipeline

This project uses **GitHub Actions** for continuous integration and continuous deployment. 
When code is pushed to the `main` branch, the pipeline will:
1. Run `pytest` to ensure code integrity.
2. Build a Docker image and push it to Docker Hub.
3. SSH into an AWS EC2 instance to pull and deploy the latest container.

### Required GitHub Secrets
To use the CI/CD pipeline, configure the following secrets in your repository settings:
- `DOCKER_USERNAME`: Your Docker Hub username.
- `DOCKER_PASSWORD`: Your Docker Hub password or access token.
- `EC2_HOST`: The public IP or DNS of your AWS EC2 instance.
- `EC2_KEY`: The private SSH key (`.pem`) used to access your EC2 instance.
