from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
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
import requests
import io
import re
import base64
from dotenv import load_dotenv

# OVERRIDE=TRUE: Forces Python to ignore cached terminal variables and strictly read the .env file
load_dotenv(override=True)

try:
    from dbutils.pooled_db import PooledDB
except ImportError:
    PooledDB = None

app = Flask(__name__)
CORS(app)

# ==========================================
# 1. AIVEN MYSQL DATABASE CONFIGURATION
# ==========================================
db_url = os.getenv('DATABASE_URL')

if not db_url or 'your-aiven-host.aivencloud.com' in db_url:
    print("\n🚨 CRITICAL ERROR: DATABASE URL NOT SET IN ENVIRONMENT 🚨")
    sys.exit(1)

parsed_uri = urlparse(db_url) if db_url else None

mysql_pool = None
if PooledDB and parsed_uri:
    mysql_pool = PooledDB(
        creator=pymysql,
        maxconnections=15,
        mincached=2,
        host=parsed_uri.hostname,
        user=unquote(parsed_uri.username) if parsed_uri.username else None,
        password=unquote(parsed_uri.password) if parsed_uri.password else None,
        database=parsed_uri.path[1:],
        port=parsed_uri.port or 3306,
        cursorclass=pymysql.cursors.DictCursor,
        ssl={'ssl': {}} 
    )

def get_db_connection():
    if mysql_pool:
        return mysql_pool.connection()
    elif parsed_uri:
        return pymysql.connect(
            host=parsed_uri.hostname,
            user=unquote(parsed_uri.username) if parsed_uri.username else None,
            password=unquote(parsed_uri.password) if parsed_uri.password else None,
            database=parsed_uri.path[1:],
            port=parsed_uri.port or 3306,
            cursorclass=pymysql.cursors.DictCursor,
            ssl={'ssl': {}} 
        )
    else:
        raise Exception("Database URL missing.")

# Explicit Column Definitions (Replaces dynamic SHOW COLUMNS reflection)
TABLE_COLUMNS = {
    'users': ['id', 'name', 'email', 'password', 'role', 'phone', 'gender', 'college', 'photo'],
    'events': ['id', 'category', 'status', 'name', 'fee', 'prize', 'team', 'date', 'venue', 'banner', 'desc'],
    'otps': ['email', 'otp', 'expires'],
    'sponsors': ['id', 'company', 'contact', 'email', 'phone', 'link', 'status', 'replyText', 'message'],
    'queries': ['id', 'name', 'email', 'message', 'date', 'status', 'replyText'],
    'payments': ['id', 'amount', 'status', 'timestamp', 'userId'],
    'logs': ['id', 'type', 'timestamp', 'userId'],
    'notifications': ['id', 'userId', 'type', 'title', 'message', 'date', 'isRead', 'senderEmail', 'relatedId'],
    'winners': ['id', 'eventId', 'firstPlace', 'secondPlace', 'thirdPlace', 'dateDeclared'],
    'gallery': ['id', 'url', 'eventId', 'caption', 'userId', 'status', 'tags', 'likes', 'likedBy'],
    'accommodations': ['id', 'userId', 'wing', 'duration', 'requested', 'room', 'payId'],
    'registrations': ['id', 'eventId', 'teamName', 'teamCode', 'leader', 'members', 'payment', 'payId']
}

def init_db():
    if not parsed_uri: return
    conn = get_db_connection()
    with conn.cursor() as cursor:
        # ---------------------------------------------------------
        # PURE MYSQL COMMANDS FOR TABLE CREATION (Dependency Order)
        # ---------------------------------------------------------
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(100) PRIMARY KEY, 
                name VARCHAR(255) NOT NULL, 
                email VARCHAR(255) UNIQUE NOT NULL, 
                password VARCHAR(255) NOT NULL, 
                role INT DEFAULT 0, 
                phone VARCHAR(50), 
                gender VARCHAR(50), 
                college VARCHAR(255), 
                photo LONGTEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id VARCHAR(100) PRIMARY KEY, 
                category VARCHAR(50), 
                status VARCHAR(50) DEFAULT 'upcoming', 
                name VARCHAR(255) NOT NULL, 
                fee FLOAT DEFAULT 0, 
                prize VARCHAR(100), 
                team VARCHAR(50), 
                date VARCHAR(100), 
                venue VARCHAR(255), 
                banner LONGTEXT, 
                `desc` TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otps (
                email VARCHAR(255) PRIMARY KEY, 
                otp VARCHAR(10) NOT NULL, 
                expires FLOAT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sponsors (
                id VARCHAR(100) PRIMARY KEY, 
                company VARCHAR(255) NOT NULL, 
                contact VARCHAR(255), 
                email VARCHAR(255), 
                phone VARCHAR(50), 
                link TEXT, 
                status VARCHAR(50) DEFAULT 'pending', 
                replyText TEXT, 
                message TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS queries (
                id VARCHAR(100) PRIMARY KEY, 
                name VARCHAR(255), 
                email VARCHAR(255) NOT NULL, 
                message TEXT NOT NULL, 
                date VARCHAR(100), 
                status VARCHAR(50) DEFAULT 'open', 
                replyText TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id VARCHAR(100) PRIMARY KEY, 
                amount FLOAT NOT NULL, 
                status VARCHAR(50) DEFAULT 'pending', 
                timestamp VARCHAR(100), 
                userId VARCHAR(100), 
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                log_pk INT AUTO_INCREMENT PRIMARY KEY, 
                id VARCHAR(100), 
                type VARCHAR(100), 
                timestamp VARCHAR(100), 
                userId VARCHAR(100), 
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(100) PRIMARY KEY, 
                userId VARCHAR(100) NOT NULL, 
                type VARCHAR(50), 
                title VARCHAR(255), 
                message TEXT, 
                date VARCHAR(100), 
                isRead VARCHAR(10) DEFAULT 'false', 
                senderEmail VARCHAR(255), 
                relatedId VARCHAR(100), 
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS winners (
                id VARCHAR(100) PRIMARY KEY, 
                eventId VARCHAR(100) NOT NULL, 
                firstPlace VARCHAR(100), 
                secondPlace VARCHAR(100), 
                thirdPlace VARCHAR(100), 
                dateDeclared VARCHAR(100), 
                FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE, 
                FOREIGN KEY (firstPlace) REFERENCES users(id) ON DELETE SET NULL, 
                FOREIGN KEY (secondPlace) REFERENCES users(id) ON DELETE SET NULL, 
                FOREIGN KEY (thirdPlace) REFERENCES users(id) ON DELETE SET NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gallery (
                id VARCHAR(100) PRIMARY KEY, 
                url LONGTEXT NOT NULL, 
                eventId VARCHAR(100), 
                caption TEXT, 
                userId VARCHAR(100), 
                status VARCHAR(50) DEFAULT 'pending', 
                tags TEXT, 
                likes INT DEFAULT 0, 
                likedBy JSON, 
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE, 
                FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE SET NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS accommodations (
                id VARCHAR(100) PRIMARY KEY, 
                userId VARCHAR(100), 
                wing VARCHAR(50), 
                duration VARCHAR(100), 
                requested TEXT, 
                room VARCHAR(50), 
                payId VARCHAR(100), 
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE, 
                FOREIGN KEY (payId) REFERENCES payments(id) ON DELETE SET NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS registrations (
                id VARCHAR(100) PRIMARY KEY, 
                eventId VARCHAR(100) NOT NULL, 
                teamName VARCHAR(255), 
                teamCode VARCHAR(100), 
                leader VARCHAR(100) NOT NULL, 
                members JSON, 
                payment VARCHAR(50), 
                payId VARCHAR(100), 
                FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE, 
                FOREIGN KEY (leader) REFERENCES users(id) ON DELETE CASCADE, 
                FOREIGN KEY (payId) REFERENCES payments(id) ON DELETE SET NULL
            )
        """)

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
_gspread_client = None

def get_gspread_client():
    global _gspread_client
    if _gspread_client is None:
        try:
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            creds_json = os.getenv("GOOGLE_CREDS_JSON")
            
            if not creds_json:
                raise Exception("GOOGLE_CREDS_JSON is missing from your .env file!")
            
            creds_json = creds_json.strip().strip("'\"")
            creds_dict = json.loads(creds_json)
            creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
            
            _gspread_client = gspread.authorize(creds)
            print("Google Sheets API Authenticated.")
        except Exception as e:
            print("Failed to auth Google Sheets API:", str(e))
    return _gspread_client

def sync_to_google_sheets(collection_name):
    if collection_name not in TABLE_COLUMNS:
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
            if not raw_id or raw_id == 'null' or raw_id == 'None' or raw_id == 'Pending': return raw_id
            if str(raw_id).startswith('AUT-TEAM-'): return raw_id
            return id_to_name.get(raw_id, raw_id)

        with conn.cursor() as cursor:
            # Using Explicit SQL for specific collection
            if collection_name == 'users': cursor.execute("SELECT * FROM users")
            elif collection_name == 'events': cursor.execute("SELECT * FROM events")
            elif collection_name == 'otps': cursor.execute("SELECT * FROM otps")
            elif collection_name == 'sponsors': cursor.execute("SELECT * FROM sponsors")
            elif collection_name == 'queries': cursor.execute("SELECT * FROM queries")
            elif collection_name == 'payments': cursor.execute("SELECT * FROM payments")
            elif collection_name == 'logs': cursor.execute("SELECT * FROM logs")
            elif collection_name == 'notifications': cursor.execute("SELECT * FROM notifications")
            elif collection_name == 'winners': cursor.execute("SELECT * FROM winners")
            elif collection_name == 'gallery': cursor.execute("SELECT * FROM gallery")
            elif collection_name == 'accommodations': cursor.execute("SELECT * FROM accommodations")
            elif collection_name == 'registrations': cursor.execute("SELECT * FROM registrations")
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
                    try: doc_data[k] = json.loads(v)
                    except: pass
                
            if 'eventId' in doc_data:
                doc_data['eventName'] = EVENT_MAP.get(doc_data['eventId'], doc_data['eventId'])
                del doc_data['eventId']
            if 'leader' in doc_data:
                doc_data['leaderName'] = get_name(doc_data['leader'])
                del doc_data['leader']
            if 'userId' in doc_data: 
                doc_data['userName'] = get_name(doc_data['userId'])
                del doc_data['userId']
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
                if isinstance(val, (list, dict)):
                    val = json.dumps(val)
                row.append(str(val) if val is not None else '')
            rows.append(row)
            
        worksheet.clear()
        worksheet.update('A1', rows)
        print(f"Successfully synced {collection_name} to Google Sheets!")
    except Exception as e:
        print(f"Sync skipped/failed: {str(e)}")

# ==========================================
# 3. GOOGLE DRIVE UPLOAD
# ==========================================
def get_drive_service():
    creds_json = os.getenv("GOOGLE_DRIVE_USER_TOKEN")
    
    if not creds_json: 
        return None, "GOOGLE_DRIVE_USER_TOKEN is missing or empty in your .env file."
        
    try:
        creds_json = creds_json.strip().strip("'\"")
        creds_dict = json.loads(creds_json)
        creds = Credentials.from_authorized_user_info(creds_dict)
        service = build('drive', 'v3', credentials=creds)
        return service, None
    except json.JSONDecodeError as e:
        return None, f"Invalid JSON format in your Drive Token: {str(e)}"
    except Exception as e:
        return None, f"Drive API Authentication Failed: {str(e)}"

def copy_drive_file(url):
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
    if not match: match = re.search(r'id=([a-zA-Z0-9-_]+)', url)
    if not match: return url
        
    file_id = match.group(1)
    service, error_msg = get_drive_service()
    if not service: 
        print(f"Link Copy Failed: {error_msg}")
        return url
        
    try:
        folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
        body = {'parents': [folder_id]} if folder_id else {}
        
        copied_file = service.files().copy(fileId=file_id, body=body).execute()
        new_file_id = copied_file['id']
        service.permissions().create(fileId=new_file_id, body={'type': 'anyone', 'role': 'reader'}).execute()
        return f"https://lh3.googleusercontent.com/d/{new_file_id}"
    except Exception as e:
        print(f"Failed to copy drive file (It might be private): {e}")
        return url

# ==========================================
# 4. EXPLICIT SQL API ENDPOINTS (No Database Reflection)
# ==========================================

@app.route('/api/<collection>', methods=['GET'])
def get_collection(collection):
    if collection not in TABLE_COLUMNS:
        return jsonify({"error": "Invalid table"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Using Pure Explicit SQL SELECT commands
            if collection == 'users': cursor.execute("SELECT * FROM users")
            elif collection == 'events': cursor.execute("SELECT * FROM events")
            elif collection == 'otps': cursor.execute("SELECT * FROM otps")
            elif collection == 'sponsors': cursor.execute("SELECT * FROM sponsors")
            elif collection == 'queries': cursor.execute("SELECT * FROM queries")
            elif collection == 'payments': cursor.execute("SELECT * FROM payments")
            elif collection == 'logs': cursor.execute("SELECT * FROM logs")
            elif collection == 'notifications': cursor.execute("SELECT * FROM notifications")
            elif collection == 'winners': cursor.execute("SELECT * FROM winners")
            elif collection == 'gallery': cursor.execute("SELECT * FROM gallery")
            elif collection == 'accommodations': cursor.execute("SELECT * FROM accommodations")
            elif collection == 'registrations': cursor.execute("SELECT * FROM registrations")
            records = cursor.fetchall()
    finally:
        conn.close()

    results = []
    for r in records:
        doc = dict(r)
        for k, v in doc.items():
            if isinstance(v, str) and (v.startswith('[') or v.startswith('{')):
                try: doc[k] = json.loads(v)
                except: pass
        results.append(doc)
    return jsonify(results), 200

@app.route('/api/<collection>', methods=['POST'])
def add_document(collection):
    if collection not in TABLE_COLUMNS: return jsonify({"error": "Invalid table"}), 400
    data = request.json
    if not data.get('id') and collection != 'otps': return jsonify({"error": "Missing 'id' field"}), 400

    if collection == 'gallery' and data.get('url') and 'drive.google.com' in data['url']:
        data['url'] = copy_drive_file(data['url'])
    if collection == 'sponsors' and data.get('link') and 'drive.google.com' in data['link']:
        data['link'] = copy_drive_file(data['link'])
    if collection == 'events' and data.get('banner') and 'drive.google.com' in data['banner']:
        data['banner'] = copy_drive_file(data['banner'])

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # We enforce explicitly coded columns from our dictionary instead of querying the database
            valid_columns = TABLE_COLUMNS[collection]

            filtered_data = {k: (json.dumps(v) if isinstance(v, (list, dict)) else v) for k, v in data.items() if k in valid_columns}
            keys = list(filtered_data.keys())
            values = list(filtered_data.values())
            
            # Constructs explicit INSERT INTO statements purely based on allowed explicit schema
            safe_keys = [f"`{k}`" for k in keys]
            placeholders = ', '.join(['%s'] * len(values))
            update_clause = ', '.join([f"`{k}`=VALUES(`{k}`)" for k in keys if k != 'id' and k != 'email'])
            
            sql = f"INSERT INTO {collection} ({', '.join(safe_keys)}) VALUES ({placeholders})"
            if update_clause: sql += f" ON DUPLICATE KEY UPDATE {update_clause}"

            cursor.execute(sql, tuple(values))
        conn.commit()
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally: conn.close()
        
    threading.Thread(target=sync_to_google_sheets, args=(collection,)).start()
    return jsonify({"success": True, "message": "Document added/updated successfully"}), 201

@app.route('/api/<collection>/<doc_id>', methods=['PUT'])
def update_document(collection, doc_id):
    if collection not in TABLE_COLUMNS: return jsonify({"error": "Invalid table"}), 400
    updates = request.json
    updates.pop('id', None)

    if not updates: return jsonify({"success": True}), 200

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            valid_columns = TABLE_COLUMNS[collection]

            filtered_updates = {k: (json.dumps(v) if isinstance(v, (list, dict)) else v) for k, v in updates.items() if k in valid_columns}
            if not filtered_updates: return jsonify({"success": True}), 200

            keys = list(filtered_updates.keys())
            values = list(filtered_updates.values())
            set_clause = ', '.join([f"`{k}` = %s" for k in keys])
            values.append(doc_id)

            sql = f"UPDATE {collection} SET {set_clause} WHERE id = %s"
            cursor.execute(sql, tuple(values))
        conn.commit()
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally: conn.close()

    threading.Thread(target=sync_to_google_sheets, args=(collection,)).start()
    return jsonify({"success": True, "message": "Document updated"}), 200

@app.route('/api/<collection>/<doc_id>', methods=['DELETE'])
def delete_document(collection, doc_id):
    if collection not in TABLE_COLUMNS: return jsonify({"error": "Invalid table"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Using Pure Explicit SQL DELETE commands
            if collection == 'users': cursor.execute("DELETE FROM users WHERE id = %s", (doc_id,))
            elif collection == 'events': cursor.execute("DELETE FROM events WHERE id = %s", (doc_id,))
            elif collection == 'otps': cursor.execute("DELETE FROM otps WHERE email = %s", (doc_id,))
            elif collection == 'sponsors': cursor.execute("DELETE FROM sponsors WHERE id = %s", (doc_id,))
            elif collection == 'queries': cursor.execute("DELETE FROM queries WHERE id = %s", (doc_id,))
            elif collection == 'payments': cursor.execute("DELETE FROM payments WHERE id = %s", (doc_id,))
            elif collection == 'logs': cursor.execute("DELETE FROM logs WHERE id = %s", (doc_id,))
            elif collection == 'notifications': cursor.execute("DELETE FROM notifications WHERE id = %s", (doc_id,))
            elif collection == 'winners': cursor.execute("DELETE FROM winners WHERE id = %s", (doc_id,))
            elif collection == 'gallery': cursor.execute("DELETE FROM gallery WHERE id = %s", (doc_id,))
            elif collection == 'accommodations': cursor.execute("DELETE FROM accommodations WHERE id = %s", (doc_id,))
            elif collection == 'registrations': cursor.execute("DELETE FROM registrations WHERE id = %s", (doc_id,))
            
            affected = cursor.rowcount
        conn.commit()
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally: conn.close()
    
    if affected == 0: return jsonify({"error": "Document not found"}), 404

    threading.Thread(target=sync_to_google_sheets, args=(collection,)).start()
    return jsonify({"success": True, "message": "Document deleted"}), 200


# ==========================================
# 5. MAILING & UPLOAD ENDPOINTS
# ==========================================

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    service, error_msg = get_drive_service()
    
    if not service: 
        return jsonify({"error": error_msg}), 500
        
    try:
        folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
        file_metadata = {'name': file.filename}
        if folder_id:
            file_metadata['parents'] = [folder_id]
            
        file_stream = io.BytesIO(file.read())
        media = MediaIoBaseUpload(file_stream, mimetype=file.content_type, resumable=True)
        
        uploaded_file = service.files().create(
            body=file_metadata, 
            media_body=media, 
            fields='id'
        ).execute()
        
        file_id = uploaded_file['id']
        
        service.permissions().create(
            fileId=file_id,
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
        
        direct_url = f"https://lh3.googleusercontent.com/d/{file_id}"
        
        return jsonify({"success": True, "url": direct_url}), 200
        
    except Exception as e:
        return jsonify({"error": f"Google Drive API Upload Error: {str(e)}"}), 500

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
                expires = time.time() + 600 
                
                cursor.execute("INSERT INTO otps (email, otp, expires) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE otp=VALUES(otp), expires=VALUES(expires)", (email, otp, expires))
                conn.commit()

                sender_email = os.getenv('MAIL_USERNAME') 
                sender_password = os.getenv('MAIL_PASSWORD')
                
                if not sender_email or not sender_password:
                    return jsonify({"error": "Admin email credentials missing in .env!"}), 500
                    
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

@app.route('/api/send-otp', methods=['POST'])
def send_otp_route():
    email = request.json.get('email')
    if not email: return jsonify({"error": "Email required"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            if not cursor.fetchone():
                return jsonify({"error": "Email not registered"}), 404

            otp = str(random.randint(100000, 999999))
            expires = time.time() + 600
            cursor.execute("INSERT INTO otps (email, otp, expires) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE otp=VALUES(otp), expires=VALUES(expires)", (email, otp, expires))
            conn.commit()

        sender_email = os.getenv('MAIL_USERNAME') 
        sender_password = os.getenv('MAIL_PASSWORD')
        
        if not sender_email or not sender_password:
            return jsonify({"error": "Admin email credentials missing in .env!"}), 500
            
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/api/reset-password', methods=['POST'])
def reset_password_route():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    new_pass = data.get('password')

    if not email or not otp or not new_pass:
        return jsonify({"error": "Missing parameters"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
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
                expires = time.time() + 600
                
                cursor.execute("INSERT INTO otps (email, otp, expires) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE otp=VALUES(otp), expires=VALUES(expires)", (email, otp, expires))
                conn.commit()

                sender_email = os.getenv('MAIL_USERNAME') 
                sender_password = os.getenv('MAIL_PASSWORD')
                
                if not sender_email or not sender_password:
                    return jsonify({"error": "Admin email credentials missing in .env!"}), 500
                    
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

    sender_email = os.getenv('MAIL_USERNAME') 
    sender_password = os.getenv('MAIL_PASSWORD')

    if not sender_email or not sender_password:
        return jsonify({"error": "Admin email credentials missing in .env!"}), 500

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
    get_gspread_client()
    app.run(debug=True, port=5000, threaded=True)