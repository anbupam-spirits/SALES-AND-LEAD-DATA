import os
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

import json

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
# Support environment variables for cloud deployment
SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID', '13lu_sv8Ssr84skJaJFpUFlUEftIXzmZDMi9sP9qIToM')
SHEET_RANGE = 'Sheet1!A:P'
SERVICE_ACCOUNT_FILE = 'service-account.json'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def append_to_sheet(data):
    # Prepare row data
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    row = [
        timestamp,
        data.get('srName'),
        data.get('storeName'),
        data.get('visitType'),
        data.get('category'),
        data.get('phone'),
        data.get('leadType'),
        data.get('followUpDate'),
        data.get('imageUrl'),
        data.get('products'),
        data.get('orderDetails'),
        data.get('locationRecorded'),
        data.get('latitude'),
        data.get('longitude'),
        data.get('locationLink'),
        data.get('remarks')
    ]

    # Handle Google Credentials (File or Env Var)
    creds = None
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    
    env_creds = os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if env_creds:
        try:
            creds_info = json.loads(env_creds)
            creds = service_account.Credentials.from_service_account_info(creds_info, scopes=scopes)
        except Exception as e:
            print(f"Error loading GOOGLE_CREDENTIALS_JSON: {e}")

    if not creds and os.path.exists(SERVICE_ACCOUNT_FILE):
        creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)

    if not creds:
        # MOCK MODE: Write to local CSV
        csv_file = 'data_backup.csv'
        file_exists = os.path.isfile(csv_file)
        import csv
        with open(csv_file, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                # Write Header
                writer.writerow([
                    'Timestamp', 'SR Name', 'Store Name', 'Visit Type', 'Category', 'Phone', 'Lead Type', 
                    'Follow Up Date', 'Image URL', 'Products', 'Order Details', 'Loc Recorded', 
                    'Lat', 'Long', 'Loc Link', 'Remarks'
                ])
            writer.writerow(row)
        return {"mode": "mock", "message": "Saved to local CSV (Google Sheets not configured)"}

    # REAL MODE: Google Sheets
    service = build('sheets', 'v4', credentials=creds)
    sheet = service.spreadsheets()

    body = {'values': [row]}
    result = sheet.values().append(
        spreadsheetId=SPREADSHEET_ID, range=SHEET_RANGE,
        valueInputOption='USER_ENTERED', body=body).execute()
    return {"mode": "real", "result": result}

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/submit', methods=['POST'])
def submit():
    try:
        # Check if the post request has the file part
        if 'photograph' not in request.files:
            return jsonify({"success": False, "message": "Photograph is required."}), 400
        
        file = request.files['photograph']
        if file.filename == '':
            return jsonify({"success": False, "message": "No selected file."}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(f"{int(datetime.datetime.now().timestamp())}_{file.filename}")
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Generate image URL
            image_url = f"{request.host_url}uploads/{filename}"
            
            # Get other form fields
            form_data = request.form.to_dict()
            form_data['imageUrl'] = image_url
            
            print(f"Received submission: {form_data}")
            
            # Append to Google Sheet (or CSV fallback)
            result = append_to_sheet(form_data)
            
            return jsonify({"success": True, "message": result.get('message', 'Data submitted successfully!')})
        else:
            return jsonify({"success": False, "message": "Invalid file type."}), 400

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8081))
    app.run(host='0.0.0.0', port=port, debug=True)
