import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import time

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

# Serve Static Files (must be last to not shadow API)
app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    # Ensure data dir exists
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    print("Starting Python Frontend Server on port 3000...")
    uvicorn.run(app, host="0.0.0.0", port=3000)
