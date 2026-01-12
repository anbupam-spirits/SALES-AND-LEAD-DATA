# Sales & Leads App - Deployment Guide

This guide will help you deploy your application to the cloud so it can be accessed by your sales staff from anywhere.

## Option 1: Render (Recommended - Easiest)

Render is a cloud platform that makes it very simple to host Python apps.

### 1. Prepare your Code
Ensure you have a `requirements.txt` file and your code is uploaded to a GitHub repository.

### 2. Create a Web Service on Render
1. Go to [Render.com](https://render.com/) and sign up.
2. Click **New** > **Web Service**.
3. Connect your GitHub repository.
4. Use the following settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -c gunicorn_config.py app:app`

### 3. Add Environment Variables (IMPORTANT)
Go to the **Environment** tab in your Render service and add:
- `SPREADSHEET_ID`: `13lu_sv8Ssr84skJaJFpUFlUEftIXzmZDMi9sP9qIToM`
- `GOOGLE_CREDENTIALS_JSON`: (Paste the entire content of your `service-account.json` folder here)

---

## Option 2: PythonAnywhere

1. Log in to [PythonAnywhere](https://www.pythonanywhere.com/).
2. Upload your files to a folder.
3. Open a "Bash Console" and install dependencies: `pip install -r requirements.txt`.
4. Go to the **Web** tab and create a new web app using the "Manual Configuration" for Flask.
5. Set your `WSGI configuration file` to point to your `app.py`.

---

## ⚠️ Important Considerations for Public Use

> [!WARNING]
> **HTTPS**: Always use the HTTPS link provided by your host (e.g., `https://your-app.onrender.com`) to ensure location data is transmitted securely.

> [!IMPORTANT]
> **Sheet Sharing**: Remember to share your Google Sheet with the email address found in your `service-account.json`'s `client_email` field.
