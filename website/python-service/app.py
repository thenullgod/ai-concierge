from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import json
import os
import time
import threading
import sqlite3
from datetime import datetime

# Configuration for the Python service
CONFIG_FILE = "config.json"

app = FastAPI()

# Add CORS middleware to allow requests from the Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {
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

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

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

# Email processing request model
class EmailRequest(BaseModel):
    email_content: str
    attachments: Optional[List[Dict[str, Any]]] = None

# Config update request model
class ConfigUpdate(BaseModel):
    imap: Dict[str, Any]
    xampp_mysql: Dict[str, Any]
    crm: Dict[str, Any]
    model_path: str
    csv_path: str
    temp_dir: str
    db_path: str

# Email processing status
email_processor_running = False
last_check_time = None
emails_processed = 0
processing_logs = []

# Initialize SQLite database for logs
def init_db():
    db_path = load_config()["db_path"]
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS processing_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            email_id TEXT,
            status TEXT,
            message TEXT
        )
    ''')
    conn.commit()
    conn.close()

# Get logs from SQLite database
def get_logs(limit=10):
    try:
        db_path = load_config()["db_path"]
        if not os.path.exists(db_path):
            return []
            
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
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
            
        conn.close()
        return logs
    except Exception as e:
        print(f"Error getting logs: {str(e)}")
        return []

def background_email_processor():
    global email_processor_running, last_check_time, emails_processed
    
    while email_processor_running:
        try:
            # Simulate checking for new emails
            last_check_time = datetime.now().isoformat()
            
            # Add log entry
            processing_logs.append({
                "timestamp": datetime.now().isoformat(),
                "message": "Checking for new emails...",
                "status": "info"
            })
            
            # Simulate processing emails
            time.sleep(5)  # Simulate work
            new_emails = 2  # Simulate finding 2 new emails
            emails_processed += new_emails
            
            # Add log entry
            processing_logs.append({
                "timestamp": datetime.now().isoformat(),
                "message": f"Processed {new_emails} new emails",
                "status": "success"
            })
            
            # Wait before next check
            time.sleep(10)
        except Exception as e:
            processing_logs.append({
                "timestamp": datetime.now().isoformat(),
                "message": f"Error: {str(e)}",
                "status": "error"
            })
            time.sleep(30)  # Wait longer after error

@app.get("/")
def read_root():
    return {"status": "running", "service": "Email Parser API"}

@app.get("/work-orders")
def get_work_orders():
    # In a real implementation, this would query the database
    # For this example, we return sample data
    return SAMPLE_WORK_ORDERS

@app.post("/process-email")
def process_email(request: EmailRequest):
    try:
        # In a real implementation, this would process the email using your EmailParser
        # For this example, we just return a success message
        
        # Add log entry
        processing_logs.append({
            "timestamp": datetime.now().isoformat(),
            "message": f"Manually processed email",
            "status": "success"
        })
        
        return {
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
        }
    except Exception as e:
        processing_logs.append({
            "timestamp": datetime.now().isoformat(),
            "message": f"Error processing email: {str(e)}",
            "status": "error"
        })
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/config")
def get_config():
    return load_config()

@app.post("/config")
def update_config(config: ConfigUpdate):
    try:
        save_config(config.dict())
        return {"status": "success", "message": "Configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/start-processor")
def start_processor(background_tasks: BackgroundTasks):
    global email_processor_running, emails_processed
    
    if not email_processor_running:
        email_processor_running = True
        emails_processed = 0
        processing_logs.clear()
        
        # Start the background task
        background_tasks.add_task(background_email_processor)
        
        return {"status": "success", "message": "Email processor started"}
    else:
        return {"status": "info", "message": "Email processor is already running"}

@app.post("/stop-processor")
def stop_processor():
    global email_processor_running
    
    if email_processor_running:
        email_processor_running = False
        return {"status": "success", "message": "Email processor stopped"}
    else:
        return {"status": "info", "message": "Email processor is not running"}

@app.get("/processor-status")
def get_processor_status():
    # Get logs from SQLite database
    db_logs = get_logs(10)
    
    # Combine with in-memory logs
    combined_logs = processing_logs + db_logs
    combined_logs.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "running": email_processor_running,
        "last_check": last_check_time,
        "emails_processed": emails_processed,
        "logs": combined_logs[:10]  # Return last 10 logs
    }

# Initialize the database on startup
@app.on_event("startup")
def startup_event():
    init_db()

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)

