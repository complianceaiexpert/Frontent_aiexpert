import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import time
import urllib.request
import urllib.error

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def read_data(filename):
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r") as f:
        try:
            return json.load(f)
        except:
            return []

def write_data(filename, data):
    file_path = os.path.join(DATA_DIR, filename)
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)

# Models
class LoginReq(BaseModel):
    email: str
    password: str

class SignupReq(BaseModel):
    email: str
    password: str
    name: str

class ClientReq(BaseModel):
    name: str
    gstin: str

class ServiceReq(BaseModel):
    name: str
    status: str
    description: str

# API Routes matching server.js

@app.post("/auth/login")
def login(req: LoginReq):
    users = read_data("users.json")
    user = next((u for u in users if u.get("email") == req.email and u.get("password") == req.password), None)
    if user:
        return {"success": True, "user": user}
    # Return 401 specifically
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/auth/signup")
def signup(req: SignupReq):
    users = read_data("users.json")
    if any(u.get("email") == req.email for u in users):
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = req.dict()
    new_user["id"] = int(time.time() * 1000)
    users.append(new_user)
    write_data("users.json", users)
    return {"success": True, "user": new_user}

@app.get("/clients")
def get_clients():
    return read_data("clients.json")

@app.post("/clients")
def create_client(req: ClientReq):
    clients = read_data("clients.json")
    new_client = req.dict()
    new_client["id"] = int(time.time() * 1000)
    new_client["services"] = []
    clients.append(new_client)
    write_data("clients.json", clients)
    return new_client

@app.get("/clients/{client_id}/services")
def get_services(client_id: int):
    clients = read_data("clients.json")
    # careful with type conversion, server.js used loose equality
    client = next((c for c in clients if str(c.get("id")) == str(client_id)), None)
    if client:
        return client.get("services", [])
    raise HTTPException(status_code=404, detail="Client not found")

@app.post("/clients/{client_id}/services")
def add_service(client_id: int, req: ServiceReq):
    clients = read_data("clients.json")
    client_idx = next((i for i, c in enumerate(clients) if str(c.get("id")) == str(client_id)), -1)
    
    if client_idx != -1:
        new_service = req.dict()
        new_service["id"] = int(time.time() * 1000)
        
        if "services" not in clients[client_idx]:
             clients[client_idx]["services"] = []
             
        clients[client_idx]["services"].append(new_service)
        write_data("clients.json", clients)
        return new_service
    
    raise HTTPException(status_code=404, detail="Client not found")

# --- Tally Integration Logic ---

def send_tally_request(xml_data):
    url = "http://localhost:9000"
    req = urllib.request.Request(url, data=xml_data.encode('utf-8'), headers={'Content-Type': 'application/xml'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Tally Request Error: {e}")
        return None

@app.get("/tally/status")
def check_tally_status():
    xml_payload = """<ENVELOPE>
      <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>List of Companies</REPORTNAME>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>"""
    resp = send_tally_request(xml_payload)
    if resp:
        return {"status": "connected", "message": "Tally connected (XML OK)"}
    return {"status": "disconnected", "message": "Tally not responding on 9000"}

@app.get("/tally/companies")
def get_tally_companies():
    # XML Request to Fetch List of Companies using inline TDL
    # This asks Tally for the collection of "Company" objects and prints their names
    xml_payload = """<ENVELOPE>
    <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
    <BODY>
    <EXPORTDATA>
    <REQUESTDESC>
    <REPORTNAME>List of Companies</REPORTNAME>
    <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
    </REQUESTDESC>
    <TDL><TDLMESSAGE>
    <REPORT NAME="List of Companies"><FORMS>List of Companies</FORMS></REPORT>
    <FORM NAME="List of Companies"><PARTS>List of Companies</PARTS></FORM>
    <PART NAME="List of Companies"><TOPLINES>List of Companies</TOPLINES><REPEAT>List of Companies : Company</REPEAT><SCROLLED>Vertical</SCROLLED></PART>
    <LINE NAME="List of Companies"><FIELDS>List of Companies</FIELDS></LINE>
    <FIELD NAME="List of Companies"><SET>$Name</SET></FIELD>
    </TDLMESSAGE></TDL>
    </EXPORTDATA>
    </BODY>
    </ENVELOPE>"""
    
    response_xml = send_tally_request(xml_payload)
    
# in /tally/companies
if not response_xml:
    raise HTTPException(status_code=400, detail="Tally not responding on 9000")

    # Simple parsing logic (quick & dirty regex or string find for <ListofCompanies>...</ListofCompanies>)
    # In production, use xml.etree.ElementTree
    import re
    # The field name in TDL is "List of Companies", so Tally usually outputs <ListofCompanies>Name</ListofCompanies>
    # Note: Tally XML tags often remove spaces.
    companies = re.findall(r"<ListofCompanies>(.*?)</ListofCompanies>", response_xml)
    
    # If regex failed but we got a response, maybe the tag is different or TDL failed. 
    # Return mock if empty to allow UI dev flow.
    if not companies:
         return ["Rahul Enterprises (Demo)", "Demo Company"]
         
    return companies

class SyncReq(BaseModel):
    company_name: str
    client_id: int

@app.post("/tally/sync")
def sync_company_data(req: SyncReq):
    companies = get_tally_companies()  # reuse the working logic

    if not companies or not isinstance(companies, list):
        raise HTTPException(status_code=400, detail="Could not fetch companies from Tally")

    if req.company_name not in companies:
        raise HTTPException(status_code=400, detail=f"Company not found in Tally: {req.company_name}")

    state = read_data("tally_state.json")
    if not isinstance(state, list):
        state = []

    state = [x for x in state if str(x.get("client_id")) != str(req.client_id)]
    state.append({"client_id": req.client_id, "company_name": req.company_name, "updated_at": int(time.time())})
    write_data("tally_state.json", state)

    return {"success": True, "message": "Company linked successfully", "company_name": req.company_name}

    


# Serve Static Files (must be last to not shadow API)
app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    # Ensure data dir exists
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    print("Starting Python Frontend Server on port 3000...")
    uvicorn.run(app, host="127.0.0.1", port=3000)
