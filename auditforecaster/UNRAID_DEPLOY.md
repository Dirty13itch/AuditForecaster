# 🐳 Deploying AuditForecaster to Unraid

This guide assumes you will build the Docker image directly on your Unraid server (or a machine with Docker) and then run it.

## Prerequisites

1.  **Unraid Server** with Docker enabled.
2.  **Terminal Access** (SSH or Web Terminal) to your Unraid server.
3.  **Source Code** on the server (via Git pull or file copy).

---

## Step 1: Transfer Source Code

### Option A: Via Git (Recommended)
If you have pushed your code to GitHub:
1.  SSH into your Unraid server.
2.  Navigate to your app directory (e.g., `/mnt/user/appdata/auditforecaster-source`).
3.  Clone/Pull the repo:
    ```bash
    git clone https://github.com/your-username/auditforecaster.git .
    # OR if already cloned
    git pull origin main
    ```

### Option B: Manual Copy
Copy the entire project folder from your computer to your Unraid server using SMB (Network Share).
*   Destination: `\\TOWER\appdata\auditforecaster-source` (or similar).

---

## Step 2: Configure Environment

1.  Create a `.env.production` file in the source folder on Unraid.
2.  Copy the contents from `.env.production.example`.
3.  **CRITICAL**: Fill in the real values.
    *   `DATABASE_URL`: Point to your Postgres container.
        *   Example: `postgresql://user:dev_password_change_in_production@192.168.1.10:5432/auditforecaster?schema=public`
        *   **Note**: Use the Unraid server's IP, not `localhost`.
    *   `NEXTAUTH_SECRET`: Generate one with `openssl rand -base64 32`.
    *   `NEXTAUTH_URL`: `http://192.168.1.10:3000` (or your domain).
    *   `UPSTASH_...`: Your Redis keys (optional but recommended).

---

## Step 3: Build the Docker Image

Run this command inside the source folder on Unraid:

```bash
docker build -t auditforecaster:latest .
```

*This may take a few minutes.*

---

## Step 4: Run the Container

You can run it via command line or use the Unraid GUI (Add Container).

### Option A: Command Line (Quickest)

```bash
docker run -d \
  --name auditforecaster \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  -v /mnt/user/appdata/auditforecaster/uploads:/app/public/uploads \
  auditforecaster:latest
```

### Option B: Unraid GUI (Add Container)

1.  Go to **Docker** tab > **Add Container**.
2.  **Name**: auditforecaster
3.  **Repository**: auditforecaster:latest
4.  **Network Type**: Bridge (or your custom network).
5.  **WebUI**: `http://[IP]:[PORT:3000]`
6.  **Port Mapping**:
    *   Container Port: `3000`
    *   Host Port: `3000` (or change if taken)
7.  **Volume Mapping** (for photos/uploads):
    *   Container Path: `/app/public/uploads`
    *   Host Path: `/mnt/user/appdata/auditforecaster/uploads`
8.  **Environment Variables**:
    *   Add variables manually OR pass the `.env` file if Unraid supports it (usually manual entry is safer in GUI).
    *   Key: `DATABASE_URL`, Value: `...`
    *   Key: `NEXTAUTH_SECRET`, Value: `...`
    *   ...etc.

---

## Step 5: Database Migration

The first time you deploy, you need to create the database tables.

1.  Open the console for the *running* container (Click icon > Console).
2.  Run:
    ```bash
    npx prisma migrate deploy
    ```

---

## Troubleshooting

*   **Database Connection Error**: Ensure `DATABASE_URL` uses the Unraid IP (e.g., `192.168.1.10`), NOT `localhost` or `127.0.0.1`, because `localhost` inside the container refers to the container itself.
*   **Permission Denied (Uploads)**: Run `chown -R 1001:1001 /mnt/user/appdata/auditforecaster/uploads` on the host to match the `nextjs` user ID.
