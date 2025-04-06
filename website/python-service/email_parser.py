#!/usr/bin/env python3
import os
import email
import sqlite3
import json
import csv
import time
import argparse
import sys
import threading
from datetime import datetime
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

# Create Flask app
app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Global variables
processor_running = False
processor_thread = None
config = None
model_loaded = False  # Track if the model is loaded

# Parse command line arguments
parser = argparse.ArgumentParser(description='Email Parser Script')
parser.add_argument('--auto-restart', action='store_true', help='Auto restart on failure')
parser.add_argument('--port', type=int, default=5000, help='Port for the Flask server')
args = parser.parse_args()

# Default Configuration
DEFAULT_CONFIG = {
    # IMAP Configuration
    "imap": {
        "server": "localhost",
        "port": 993,
        "username": os.getenv('IMAP_USER') or "espocrm@localhost",
        "password": os.getenv('IMAP_PASS') or "",
        "folder": "INBOX"
    },
    
    # XAMPP MySQL Configuration
    "xampp_mysql": {
        "host": "localhost",
        "user": os.getenv('MYSQL_USER') or "root",
        "password": os.getenv('MYSQL_PASS') or "",
        "database": "work_orders",
        "port": 3306
    },
    
    # CRM Configuration
    "crm": {  
        "base_url": "http://localhost/espocrm",
        "username": os.getenv('CRM_USER') or "",
        "password": os.getenv('CRM_PASS') or "",
        "import_endpoint": "/api/v1/Import"
    },
    
    # AI Configuration
    "model_path": "meta-llama/Llama-3.2-1B",
    
    # File Handling
    "csv_path": "/var/data/work_orders.csv",
    "temp_dir": "/tmp/email_attachments",
    
    # Database
    "db_path": "/var/data/processing_logs.db",
}

# Sample work orders for demonstration
SAMPLE_WORK_ORDERS = [
    {
        "id": 1,
        "title": "Fix Leaking Roof",
        "priority": "HIGH",
        "description": "Customer reported water damage from roof leak in master bedroom",
        "due_date": "2025-04-10",
        "customer": "John Smith",
        "location": "123 Main St, Anytown, USA",
        "trade": "Roofing",
        "created_at": "2025-04-03T12:30:00",
        "summary": "Urgent roof repair needed due to water damage in master bedroom.",
        "action_items": "1. Inspect roof\n2. Repair damaged shingles\n3. Check for interior water damage"
    },
    {
        "id": 2,
        "title": "HVAC Maintenance",
        "priority": "NORMAL",
        "description": "Annual HVAC system check and filter replacement",
        "due_date": "2025-04-15",
        "customer": "Jane Doe",
        "location": "456 Oak Ave, Somewhere, USA",
        "trade": "HVAC",
        "created_at": "2025-04-02T09:15:00",
        "summary": "Routine annual HVAC maintenance and filter replacement.",
        "action_items": "1. Replace air filters\n2. Clean condenser coils\n3. Check refrigerant levels"
    }
]

class Logger:
    def __init__(self):
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(config['db_path']), exist_ok=True)
        
        self.conn = sqlite3.connect(config['db_path'])
        self._init_db()
        
    def _init_db(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS processing_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                email_id TEXT,
                status TEXT,
                message TEXT
            )
        ''')
        self.conn.commit()
        
    def log_success(self, email_id):
        self._log(email_id, "SUCCESS", "")
        
    def log_error(self, email_id, message):
        self._log(email_id, "ERROR", message)
        
    def _log(self, email_id, status, message):
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO processing_logs (email_id, status, message)
            VALUES (?, ?, ?)
        ''', (str(email_id), status, message))
        self.conn.commit()
        
    def get_logs(self, limit=10):
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT timestamp, email_id, status, message 
            FROM processing_logs 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
        
        logs = []
        for row in cursor.fetchall():
            timestamp, email_id, status, message = row
            logs.append({
                "timestamp": timestamp,
                "message": f"Email {email_id}: {message}" if message else f"Email {email_id} processed",
                "status": "success" if status == "SUCCESS" else "error"
            })
            
        return logs

def email_processor():
    global processor_running
    
    print(f"Starting email processor at {datetime.now().isoformat()}")
    
    # Initialize logger
    logger = Logger()
    
    emails_processed = 0
    
    try:
        # Simulate email processing
        print("Starting email processing loop...")
        iteration = 0
        
        while processor_running:
            print(f"Processing iteration {iteration+1}...")
            time.sleep(2)  # Simulate work
            
            # Simulate finding emails
            email_count = iteration % 3  # 0, 1, or 2 emails
            if email_count > 0:
                print(f"Found {email_count} new email(s)")
                
                # Simulate processing each email
                for j in range(email_count):
                    email_id = f"email_{iteration}_{j}"
                    print(f"Processing email {email_id}...")
                    time.sleep(1)  # Simulate processing
                    
                    # Simulate success or failure
                    if (iteration + j) % 4 != 0:  # 75% success rate
                        print(f"Successfully processed email {email_id}")
                        logger.log_success(email_id)
                        emails_processed += 1
                    else:
                        error_msg = f"Failed to process email {email_id}"
                        print(error_msg)
                        logger.log_error(email_id, error_msg)
            else:
                print("No new emails found")
            
            print(f"Iteration {iteration+1} complete")
            iteration += 1
            time.sleep(3)  # Wait between iterations
            
            if not processor_running:
                break
        
        print("Email processor stopped")
        
    except Exception as e:
        print(f"Error in email processor: {str(e)}")
        processor_running = False
        if args.auto_restart:
            print("Auto-restart enabled, restarting in 5 seconds...")
            time.sleep(5)
            start_processor()

def start_processor():
    global processor_running, processor_thread
    
    if processor_running:
        return {"status": "info", "message": "Email processor is already running"}
    
    processor_running = True
    processor_thread = threading.Thread(target=email_processor)
    processor_thread.daemon = True
    processor_thread.start()
    
    return {"status": "success", "message": "Email processor started"}

def stop_processor():
    global processor_running, processor_thread
    
    if not processor_running:
        return {"status": "info", "message": "Email processor is not running"}
    
    processor_running = False
    if processor_thread:
        processor_thread.join(timeout=5)
    
    return {"status": "success", "message": "Email processor stopped"}

def load_config():
    global config
    
    config_file = "config.json"
    if os.path.exists(config_file):
        with open(config_file, "r") as f:
            config = json.load(f)
    else:
        config = DEFAULT_CONFIG
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)
    
    return config

def save_config(new_config):
    global config
    
    config = new_config
    with open("config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    return {"status": "success", "message": "Configuration saved successfully"}

# Flask routes
@app.route('/')
def index():
    return jsonify({"status": "running", "service": "Email Parser API"})

@app.route('/work-orders')
def get_work_orders():
    return jsonify(SAMPLE_WORK_ORDERS)

@app.route('/process-email', methods=['POST'])
def process_email():
    try:
        data = request.json
        
        # Simulate processing an email
        logger = Logger()
        logger.log_success("manual_email")
        
        return jsonify({
            "status": "success",
            "message": "Email processed successfully",
            "extracted_data": {
                "title": "Sample Work Order",
                "priority": "NORMAL",
                "description": "This is a sample work order extracted from the email",
                "due_date": "2025-04-20",
                "customer": "Sample Customer",
                "location": "Sample Location",
                "trade": "Sample Trade",
                "summary": "Sample work order for demonstration purposes.",
                "action_items": "1. Complete task A\n2. Follow up with customer\n3. Schedule follow-up"
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error processing email: {str(e)}"
        })

@app.route('/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'GET':
        return jsonify(config)
    else:
        try:
            new_config = request.json
            return jsonify(save_config(new_config))
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Failed to update configuration: {str(e)}"
            })

@app.route('/start-processor', methods=['POST'])
def handle_start_processor():
    return jsonify(start_processor())

@app.route('/stop-processor', methods=['POST'])
def handle_stop_processor():
    return jsonify(stop_processor())

@app.route('/processor-status')
def get_processor_status():
    logger = Logger()
    logs = logger.get_logs(10)
    
    return jsonify({
        "running": processor_running,
        "last_check": datetime.now().isoformat() if processor_running else None,
        "emails_processed": 0,  # This would be tracked in a real implementation
        "logs": logs
    })

# New endpoint for chat functionality
@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"error": "No message provided"}), 400
        
        user_message = data['message']
        
        def generate():
            # Simulate streaming response
            response_parts = [
                "I'm processing your message: '",
                user_message,
                "'. This is a simulated response from the Flask server. ",
                "In a real implementation, this would connect to the Llama model. ",
                "You can customize this response based on your actual implementation."
            ]
            
            for part in response_parts:
                time.sleep(0.5)  # Simulate processing time
                yield part
            
        return Response(stream_with_context(generate()), mimetype='text/plain')
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# New endpoint to check model status
@app.route('/model-status', methods=['GET'])
def model_status():
    # Simulate model status
    try:
        return jsonify({
            "model_loaded": model_loaded,
            "model_path": config['model_path'],
            "transformers_available": True
        })
    except Exception as e:
        print(f"Error in model_status endpoint: {str(e)}")
        return jsonify({
            "model_loaded": False,
            "model_path": config['model_path'] if config else "unknown",
            "transformers_available": False,
            "error": str(e)
        })

def main():
    global config, model_loaded
    
    print(f"Starting email parser script at {datetime.now().isoformat()}")
    print(f"Auto-restart: {'Enabled' if args.auto_restart else 'Disabled'}")
    
    # Load configuration
    config = load_config()
    
    # Simulate model loading (would actually load the model in a real implementation)
    try:
        print(f"Simulating model loading from {config['model_path']}...")
        # In a real implementation, you would load the model here
        # model = load_model(config['model_path'])
        model_loaded = True
        print("Model loaded successfully")
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        model_loaded = False
    
    # Start Flask server
    print(f"Starting Flask server on port {args.port}")
    app.run(host='0.0.0.0', port=args.port, debug=False, threaded=True)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nScript interrupted by user")
        sys.exit(0)

