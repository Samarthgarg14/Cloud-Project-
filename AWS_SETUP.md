# AWS EC2 Free Tier Launch & Setup Guide

This guide will walk you through launching a Free Tier AWS EC2 instance and deploying the Deadlock Visualizer via Docker and Nginx.

## 1. Launching the EC2 Instance

1. Log into your [AWS Management Console](https://console.aws.amazon.com/) and navigate to the **EC2 Dashboard**.
2. Click **Launch instances**.
3. **Name**: Enter `deadlock-visualizer-server`.
4. **AMI (Amazon Machine Image)**: Select **Ubuntu** (Ubuntu Server 24.04 LTS or 22.04 LTS). Ensure it says "Free tier eligible".
5. **Instance Type**: Select **t2.micro** (this is the Free Tier eligible instance type).
6. **Key Pair**: 
   - Click "Create new key pair".
   - Name it `deadlock-key` (or similar) and choose RSA and `.pem`. 
   - Click **Create key pair**. *This will download the file to your computer. Keep it safe, you will need it!*
7. **Network Settings** (Security Group):
   - Check **Allow SSH traffic from** -> "Anywhere (0.0.0.0/0)" (Port 22).
   - Check **Allow HTTP traffic from the internet** (Port 80) - *Crucial for our Nginx proxy!*
   - Check **Allow HTTPS traffic from the internet** (Port 443) - *Optional, if you add SSL later.*
8. **Storage**: The default 8 GB gp3 root volume is enough. (Free tier allows up to 30 GB).
9. Click **Launch instance**.

## 2. Connecting to the Instance

1. Once the instance state is "Running", click on the instance ID and find the **Public IPv4 address**.
2. Open your terminal on your local machine (Mac/Linux).
3. Change the permissions of your downloaded key pair so only you can read it:
   ```bash
   chmod 400 ~/Downloads/deadlock-key.pem
   ```
4. SSH into the server using the `ubuntu` user:
   ```bash
   ssh -i ~/Downloads/deadlock-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```

## 3. Running the Setup Script

Once inside the EC2 instance, you need to run the setup script which will install Docker, Nginx, and launch your container.

1. Create the script file on the server:
   ```bash
   nano setup_ec2.sh
   ```
2. Paste the contents of `deploy/setup_ec2.sh` from your local project into the nano editor.
3. Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).
4. Make the script executable:
   ```bash
   chmod +x setup_ec2.sh
   ```
5. Run the script:
   ```bash
   ./setup_ec2.sh
   ```
6. The script will ask for your **Docker Hub Username**. Enter it so it can pull the image you pushed via GitHub Actions!

## 4. Verify the Deployment

Open your web browser and go to your EC2 instance's **Public IPv4 address**. 
(e.g., `http://54.123.45.67`)

You should see your Deadlock Visualizer running perfectly, served by Nginx on port 80!

> **Note for CI/CD Pipeline:** Now that your EC2 instance is running, you can take the Public IP and the contents of your `.pem` key and add them as GitHub Secrets (`EC2_HOST` and `EC2_KEY`) so GitHub Actions can automatically deploy future updates! (Make sure to update the github action script from `-p 80:5000` to `-p 5000:5000` since Nginx is now handling port 80).
