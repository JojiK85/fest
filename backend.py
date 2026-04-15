from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
import json
import pymysql
import pymysql.cursors
from urllib.parse import urlparse, unquote
import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
import random
import time
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
from dotenv import load_dotenv
load_dotenv() # Add this right below your imports
# Attempt to import DBUtils for Connection Pooling
try:
    from dbutils.pooled_db import PooledDB
except ImportError:
    PooledDB = None

app = Flask(__name__)
# Enable CORS so your frontend can talk to this backend
CORS(app)

# ==========================================
# 1. AIVEN MYSQL DATABASE CONFIGURATION
# ==========================================
db_url = os.getenv('DATABASE_URL')

if 'your-aiven-host.aivencloud.com' in db_url:
    print("\n" + "="*65)
    print("🚨 CRITICAL ERROR: DATABASE URL NOT SET 🚨")
    sys.exit(1)

parsed_uri = urlparse(db_url)

# --- OPTIMIZATION 1: DATABASE CONNECTION POOLING ---
# This prevents the server from doing a slow SSL handshake on every single API request.
mysql_pool = None
if PooledDB:
    mysql_pool = PooledDB(
        creator=pymysql,
        maxconnections=15,    # Allow up to 15 concurrent connections
        mincached=2,          # Keep 2 connections open and ready at all times (super fast)
        host=parsed_uri.hostname,
        user=unquote(parsed_uri.username) if parsed_uri.username else None,
        password=unquote(parsed_uri.password) if parsed_uri.password else None,
        database=parsed_uri.path[1:],
        port=parsed_uri.port or 3306,
        cursorclass=pymysql.cursors.DictCursor,
        ssl={'ssl': {}}       # STRICT SSL REQUIRED BY AIVEN
    )

def get_db_connection():
    if mysql_pool:
        return mysql_pool.connection() # Instantly grab an open connection
    else:
        # Fallback if DBUtils is not installed
        return pymysql.connect(
            host=parsed_uri.hostname,
            user=unquote(parsed_uri.username) if parsed_uri.username else None,
            password=unquote(parsed_uri.password) if parsed_uri.password else None,
            database=parsed_uri.path[1:],
            port=parsed_uri.port or 3306,
            cursorclass=pymysql.cursors.DictCursor,
            ssl={'ssl': {}} 
        )

TABLE_SCHEMAS = {
    'users': '''
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        password VARCHAR(255),
        role INT,
        phone VARCHAR(50),
        gender VARCHAR(50),
        college VARCHAR(255),
        photo LONGTEXT
    ''',
    'events': '''
        id VARCHAR(100) PRIMARY KEY,
        category VARCHAR(50),
        status VARCHAR(50),
        name VARCHAR(255),
        fee FLOAT,
        prize VARCHAR(100),
        team VARCHAR(50),
        date VARCHAR(100),
        venue VARCHAR(255),
        banner LONGTEXT,
        `desc` TEXT
    ''',
    'otps': '''
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10),
        expires FLOAT
    ''',
    'accommodations': '''
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        wing VARCHAR(50),
        duration VARCHAR(100),
        requested TEXT,
        room VARCHAR(50),
        payId VARCHAR(100)
    ''',
    'registrations': '''
        id VARCHAR(100) PRIMARY KEY,
        eventId VARCHAR(100),
        teamName VARCHAR(255),
        teamCode VARCHAR(100),
        leader VARCHAR(100),
        members JSON,
        payment VARCHAR(50),
        payId VARCHAR(100)
    ''',
    'payments': '''
        id VARCHAR(100) PRIMARY KEY,
        amount FLOAT,
        status VARCHAR(50),
        timestamp VARCHAR(100),
        user VARCHAR(100)
    ''',
    'gallery': '''
        id VARCHAR(100) PRIMARY KEY,
        url LONGTEXT,
        event VARCHAR(255),
        caption TEXT,
        user VARCHAR(255),
        status VARCHAR(50),
        tags TEXT,
        likes INT
    ''',
    'sponsors': '''
        id VARCHAR(100) PRIMARY KEY,
        company VARCHAR(255),
        contact VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        link TEXT,
        status VARCHAR(50),
        replyText TEXT
    ''',
    'queries': '''
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        message TEXT,
        date VARCHAR(100),
        status VARCHAR(50),
        replyText TEXT
    ''',
    'logs': '''
        log_pk INT AUTO_INCREMENT PRIMARY KEY,
        id VARCHAR(100),
        type VARCHAR(100),
        timestamp VARCHAR(100),
        `by` VARCHAR(255)
    ''',
    'winners': '''
        id VARCHAR(100) PRIMARY KEY,
        eventId VARCHAR(100),
        firstPlace VARCHAR(100),
        secondPlace VARCHAR(100),
        thirdPlace VARCHAR(100),
        dateDeclared VARCHAR(100)
    '''
}

def init_db():
    conn = get_db_connection()
    with conn.cursor() as cursor:
        for table_name, schema in TABLE_SCHEMAS.items():
            cursor.execute(f"CREATE TABLE IF NOT EXISTS {table_name} ({schema})")
            
        # Safely attempt to add replyText column to existing queries and sponsors tables
        try: cursor.execute("ALTER TABLE queries ADD COLUMN replyText TEXT")
        except: pass
        try: cursor.execute("ALTER TABLE sponsors ADD COLUMN replyText TEXT")
        except: pass
        
    conn.commit()
    conn.close()

init_db()

EVENT_MAP = {
    'e1': 'B-Plan', 'e2': 'Marcatus', 'e4': 'Robo Race', 'e7': 'Web Hackathon',
    'e11': 'Battle of Bands', 'e13': 'Group Dance', 'e17': 'Comedy Night',
    'e19': 'Starnite', 'e21': 'Valorant', 'f1': 'Diwali Mela'
}

# ==========================================
# 2. GOOGLE SHEETS LIVE SYNC
# ==========================================

# --- OPTIMIZATION 2: CACHE GOOGLE API AUTH ---
# Authenticating with Google takes 1-2 seconds. We only need to do it once.
_gspread_client = None

def get_gspread_client():
    global _gspread_client
    if _gspread_client is None:
        try:
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            creds = ServiceAccountCredentials.from_json_keyfile_name("google_creds.json", scope)
            _gspread_client = gspread.authorize(creds)
            print("Google Sheets API Authenticated.")
        except Exception as e:
            print("Failed to auth Google Sheets API:", str(e))
    return _gspread_client

def sync_to_google_sheets(collection_name):
    if collection_name not in TABLE_SCHEMAS:
        return

    try:
        client = get_gspread_client()
        if not client: return
        
        sheet_file = client.open("AutumnFest_LiveDB")
        try:
            worksheet = sheet_file.worksheet(collection_name)
        except gspread.exceptions.WorksheetNotFound:
            worksheet = sheet_file.add_worksheet(title=collection_name, rows="1000", cols="20")

        conn = get_db_connection()
        
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name FROM users")
            users_records = cursor.fetchall()
            
        id_to_name = { u['id']: u.get('name', u['id']) for u in users_records }

        def get_name(raw_id):
            if not raw_id or raw_id == 'null' or raw_id == 'None' or raw_id == 'Pending': 
                return raw_id
            if str(raw_id).startswith('AUT-TEAM-'): 
                return raw_id
            return id_to_name.get(raw_id, raw_id)

        with conn.cursor() as cursor:
            cursor.execute(f"SELECT * FROM {collection_name}")
            records = cursor.fetchall()
        conn.close()
        
        if not records:
            worksheet.clear()
            return

        all_keys = set()
        parsed_records = []
        
        for r in records:
            doc_data = dict(r)
            
            for k, v in doc_data.items():
                if isinstance(v, str) and (v.startswith('[') or v.startswith('{')):
                    try:
                        doc_data[k] = json.loads(v)
                    except:
                        pass
                
            if 'eventId' in doc_data:
                doc_data['eventName'] = EVENT_MAP.get(doc_data['eventId'], doc_data['eventId'])
                del doc_data['eventId']
            
            if 'leader' in doc_data:
                doc_data['leaderName'] = get_name(doc_data['leader'])
                del doc_data['leader']
                
            if 'user' in doc_data:
                doc_data['userName'] = get_name(doc_data['user'])
                del doc_data['user']
                
            if 'requested' in doc_data and doc_data['requested']:
                req_names = [get_name(x.strip()) for x in doc_data['requested'].split(',')]
                doc_data['requestedNames'] = ' & '.join(req_names)
                del doc_data['requested']
                
            if 'members' in doc_data and isinstance(doc_data['members'], list):
                doc_data['memberNames'] = ', '.join([get_name(x) for x in doc_data['members']])
                del doc_data['members']
                
            if 'firstPlace' in doc_data: doc_data['firstPlace'] = get_name(doc_data['firstPlace'])
            if 'secondPlace' in doc_data: doc_data['secondPlace'] = get_name(doc_data['secondPlace'])
            if 'thirdPlace' in doc_data: doc_data['thirdPlace'] = get_name(doc_data['thirdPlace'])

            doc_data.pop('log_pk', None)

            all_keys.update(doc_data.keys())
            parsed_records.append(doc_data)
        
        headers = ['id'] + sorted([k for k in list(all_keys) if k != 'id'])
        
        rows = [headers]
        for p_rec in parsed_records:
            row = [p_rec.get('id', '')]
            for k in headers[1:]:
                val = p_rec.get(k, '')
                row.append(str(val) if val is not None else '')
            rows.append(row)
            
        worksheet.clear()
        worksheet.update('A1', rows)
        print(f"Successfully synced {collection_name} to Google Sheets!")

    except Exception as e:
        print(f"Sync skipped/failed: {str(e)}")


# ==========================================
# 3. FLASK API ENDPOINTS (Dynamic ORM)
# ==========================================

@app.route('/api/<collection>', methods=['GET'])
def get_collection(collection):
    if collection not in TABLE_SCHEMAS:
        return jsonify({"error": "Invalid table"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT * FROM {collection}")
            records = cursor.fetchall()
    finally:
        conn.close()

    results = []
    for r in records:
        doc = dict(r)
        for k, v in doc.items():
            if isinstance(v, str) and (v.startswith('[') or v.startswith('{')):
                try:
                    doc[k] = json.loads(v)
                except:
                    pass
        results.append(doc)
        
    return jsonify(results), 200


@app.route('/api/<collection>', methods=['POST'])
def add_document(collection):
    if collection not in TABLE_SCHEMAS:
        return jsonify({"error": "Invalid table"}), 400

    data = request.json
    doc_id = data.get('id')
    
    if not doc_id:
        return jsonify({"error": "Document must contain an 'id' field"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"SHOW COLUMNS FROM {collection}")
            valid_columns = [row['Field'] for row in cursor.fetchall()]

            filtered_data = {}
            for k, v in data.items():
                if k in valid_columns:
                    if isinstance(v, (list, dict)):
                        filtered_data[k] = json.dumps(v)
                    else:
                        filtered_data[k] = v

            keys = list(filtered_data.keys())
            values = list(filtered_data.values())
            
            safe_keys = [f"`{k}`" for k in keys]
            placeholders = ', '.join(['%s'] * len(values))

            update_clause = ', '.join([f"`{k}`=VALUES(`{k}`)" for k in keys if k != 'id'])
            
            if update_clause:
                sql = f"INSERT INTO {collection} ({', '.join(safe_keys)}) VALUES ({placeholders}) ON DUPLICATE KEY UPDATE {update_clause}"
            else:
                sql = f"INSERT IGNORE INTO {collection} ({', '.join(safe_keys)}) VALUES ({placeholders})"

            cursor.execute(sql, tuple(values))
        conn.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        
    threading.Thread(target=sync_to_google_sheets, args=(collection,)).start()
    return jsonify({"success": True, "message": "Document added/updated successfully"}), 201


@app.route('/api/<collection>/<doc_id>', methods=['PUT'])
def update_document(collection, doc_id):
    if collection not in TABLE_SCHEMAS:
        return jsonify({"error": "Invalid table"}), 400

    updates = request.json
    updates.pop('id', None)

    if not updates:
        return jsonify({"success": True}), 200

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"SHOW COLUMNS FROM {collection}")
            valid_columns = [row['Field'] for row in cursor.fetchall()]

            filtered_updates = {}
            for k, v in updates.items():
                if k in valid_columns:
                    if isinstance(v, (list, dict)):
                        filtered_updates[k] = json.dumps(v)
                    else:
                        filtered_updates[k] = v

            if not filtered_updates:
                return jsonify({"success": True}), 200

            keys = list(filtered_updates.keys())
            values = list(filtered_updates.values())
            set_clause = ', '.join([f"`{k}` = %s" for k in keys])
            values.append(doc_id)

            sql = f"UPDATE {collection} SET {set_clause} WHERE id = %s"
            cursor.execute(sql, tuple(values))
        conn.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    threading.Thread(target=sync_to_google_sheets, args=(collection,)).start()
    return jsonify({"success": True, "message": "Document updated"}), 200


@app.route('/api/<collection>/<doc_id>', methods=['DELETE'])
def delete_document(collection, doc_id):
    if collection not in TABLE_SCHEMAS:
        return jsonify({"error": "Invalid table"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"DELETE FROM {collection} WHERE id = %s", (doc_id,))
            affected = cursor.rowcount
        conn.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
    
    if affected == 0:
        return jsonify({"error": "Document not found"}), 404

    threading.Thread(target=sync_to_google_sheets, args=(collection,)).start()
    return jsonify({"success": True, "message": "Document deleted"}), 200


# ==========================================
# 4. MAILING & UPLOAD ENDPOINTS
# ==========================================
def get_drive_service():
    scope = ["https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name("google_creds.json", scope)
    return build('drive', 'v3', credentials=creds)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files['file']
    try:
        drive_service = get_drive_service()
        file_metadata = {
            'name': file.filename,
            'parents': ['1kArW4x1oxJtL3ZjJWA1MCGmdZu9WM8pv'] # User requested folder ID
        }
        media = MediaIoBaseUpload(io.BytesIO(file.read()), mimetype=file.content_type, resumable=True)
        uploaded_file = drive_service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
        
        # Set file to publicly viewable so UI can load the image
        drive_service.permissions().create(
            fileId=uploaded_file.get('id'),
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
        
        return jsonify({"url": uploaded_file.get('webViewLink')}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/signup-otp', methods=['POST'])
def signup_otp():
    data = request.json
    action = data.get('action')
    email = data.get('email')

    if not email: return jsonify({"error": "Email required"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            if cursor.fetchone() and action == 'send_otp':
                return jsonify({"error": "Email is already registered. Please log in."}), 400

            if action == 'send_otp':
                otp = str(random.randint(100000, 999999))
                expires = time.time() + 600 # 10 mins
                
                cursor.execute("INSERT INTO otps (email, otp, expires) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE otp=VALUES(otp), expires=VALUES(expires)", (email, otp, expires))
                conn.commit()

                sender_email = os.getenv('MAIL_USERNAME', 'kandulajoji@gmail.com') 
                sender_password = os.getenv('MAIL_PASSWORD')
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(sender_email, sender_password)
                msg = MIMEMultipart()
                msg['From'] = f"Autumn Fest <{sender_email}>"
                msg['To'] = email
                msg['Subject'] = "Your Autumn Fest Registration OTP"
                msg.attach(MIMEText(f"Welcome to Autumn Fest! Your OTP for account registration is: <b>{otp}</b>. It expires in 10 minutes.", 'html'))
                server.send_message(msg)
                server.quit()
                
                return jsonify({"success": True, "message": "OTP sent to email"}), 200

            elif action == 'verify':
                otp = data.get('otp')
                cursor.execute("SELECT * FROM otps WHERE email = %s AND otp = %s", (email, otp))
                otp_record = cursor.fetchone()
                
                if not otp_record or time.time() > float(otp_record['expires']):
                    return jsonify({"error": "Invalid or expired OTP"}), 400
                
                cursor.execute("DELETE FROM otps WHERE email = %s", (email,))
                conn.commit()
                return jsonify({"success": True, "message": "OTP verified successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    action = data.get('action')
    email = data.get('email')

    if not email: return jsonify({"error": "Email required"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify({"error": "Email not registered"}), 404

            if action == 'send_otp':
                otp = str(random.randint(100000, 999999))
                expires = time.time() + 600 # 10 mins
                
                cursor.execute("INSERT INTO otps (email, otp, expires) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE otp=VALUES(otp), expires=VALUES(expires)", (email, otp, expires))
                conn.commit()

                sender_email = os.getenv('MAIL_USERNAME', 'kandulajoji@gmail.com') 
                sender_password = os.getenv('MAIL_PASSWORD')
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(sender_email, sender_password)
                msg = MIMEMultipart()
                msg['From'] = f"Autumn Fest <{sender_email}>"
                msg['To'] = email
                msg['Subject'] = "Your Password Reset OTP"
                msg.attach(MIMEText(f"Your OTP for password reset is: <b>{otp}</b>. It expires in 10 minutes.", 'html'))
                server.send_message(msg)
                server.quit()
                
                return jsonify({"success": True, "message": "OTP sent"}), 200

            elif action == 'verify_and_reset':
                otp = data.get('otp')
                new_pass = data.get('newPassword')
                
                cursor.execute("SELECT * FROM otps WHERE email = %s AND otp = %s", (email, otp))
                otp_record = cursor.fetchone()
                
                if not otp_record or time.time() > float(otp_record['expires']):
                    return jsonify({"error": "Invalid or expired OTP"}), 400
                
                cursor.execute("UPDATE users SET password = %s WHERE email = %s", (new_pass, email))
                cursor.execute("DELETE FROM otps WHERE email = %s", (email,))
                conn.commit()
                return jsonify({"success": True, "message": "Password reset successful"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/send-mail', methods=['POST'])
def send_bulk_mail():
    data = request.json
    subject = data.get('subject')
    html_template = data.get('body')
    recipients_data = data.get('recipients', []) 

    if not subject or not html_template or not recipients_data:
        return jsonify({"error": "Missing parameters"}), 400

    sender_email = os.getenv('MAIL_USERNAME', 'kandulajoji@gmail.com') 
    sender_password = os.getenv('MAIL_PASSWORD', 'your_16_digit_app_password')

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)

        sent_count = 0
        for person in recipients_data:
            personalized_body = html_template.replace('{{name}}', person.get('name', 'Participant'))
            if 'eventName' in person:
                personalized_body = personalized_body.replace('{{eventname}}', person.get('eventName'))

            msg = MIMEMultipart()
            msg['From'] = f"Autumn Fest <{sender_email}>"
            msg['To'] = person['email']
            msg['Subject'] = subject
            msg.attach(MIMEText(personalized_body, 'html'))

            server.send_message(msg)
            sent_count += 1

        server.quit()
        return jsonify({"success": True, "message": f"Sent {sent_count} emails"}), 200
        
    except Exception as e:
        print("Mail Error: ", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Initialize the Google Client caching immediately on boot to prep the server
    get_gspread_client()
    app.run(debug=True, port=5000, threaded=True)