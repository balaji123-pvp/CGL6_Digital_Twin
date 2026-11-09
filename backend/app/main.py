from fastapi import FastAPI,WebSocket,WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .models import FaultCommand,WhatIfCommand
from .simulator import CGL6Twin
from .engineering_data import FAULT_SCENARIOS, SCENARIOS, SEED, TOPOLOGY, engineering_summary, read_tags
import asyncio, json, time
from collections import deque
from pathlib import Path
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
app=FastAPI(title='CGL - 6 JJSL Digital Twin',version='2.0')
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
twin=CGL6Twin()
history = deque(maxlen=600)
FEATURES = [
 {"id": f"{i:02d}", "name": name, "description": desc} for i,(name,desc) in enumerate([
 ("3D CGL line model","Interactive Three.js line visualization"),("Moving strip and coil position","Animated line/coil representation"),("Line KPIs","Speed, width, thickness and length"),("Five bridle stations","Bridle telemetry and coordination"),("B4A/B4B diagnostics","Drive, torque, speed and mechanical status"),("Tension SP/PV","Feedback and calculated tension"),("PLC symbol explorer","Extracted symbol and address map"),("BR4TenDiag reference","DB26/FB142 object mapping"),("OB88 breakup reference","OB88 label reference only"),("Torque tension calculation","FC47 object reference"),("Drive health","RPM, current, torque and temperature"),("Furnace heat map","PHF zone temperature deviation"),("Cooling monitoring","Strip temperature, flow and pressure"),("Zinc pot monitoring","Bath temperature, level and chemistry"),("Coating quality","Air knife and coating weights"),("Coil quality model","Indicative quality score"),("System health","PLC/network/equipment indices"),("Alarm list","Simulator alarm list"),("Rolling trends","In-memory trend samples"),("Fault training","Simulation-only fault injection"),("What-if scenario","Speed, thickness, tension and zinc setpoint"),("Break risk indicator","Heuristic index, not certified prediction"),("Simulation watermark","Simulation status disclosed"),("REST API","FastAPI endpoints"),("WebSocket stream","Live telemetry"),("Read-only boundary","No PLC write API"),("PLC tag map file","Extracted symbols retained"),("Logic manifest","PLC object relationships"),("Responsive UI","Desktop and tablet layout"),("Deployment scripts","Local and Docker startup")]) ]
@app.get('/api/health')
def health(): return {'status':'OK','line':'CGL-6','source':'SIMULATED / INTERPOLATED','mode':twin.mode}
@app.get('/api/config')
def config(): return twin.config()
@app.get('/api/features')
def features(): return FEATURES
@app.get('/api/history')
def get_history(): return list(history)
@app.get('/api/tags')
def tags(): return json.load(open(DATA_DIR / 'actual_plc_tag_map.json'))
@app.get('/api/logic')
def logic(): return json.load(open(DATA_DIR / 'plc_logic_manifest.json'))
@app.get('/api/engineering/summary')
def engineering_summary_api(): return engineering_summary()
@app.get('/api/engineering/seed')
@app.get('/api/seed')
def engineering_seed(): return SEED
@app.get('/api/engineering/tags')
def engineering_tags(section:str|None=None): return read_tags(section)
@app.get('/api/engineering/topology')
@app.get('/api/topology')
def engineering_topology(): return TOPOLOGY
@app.get('/api/engineering/scenarios')
@app.get('/api/scenarios')
def engineering_scenarios(): return SCENARIOS
@app.get('/api/engineering/fault-scenarios')
@app.get('/api/fault-scenarios')
def engineering_fault_scenarios(): return FAULT_SCENARIOS
@app.get('/api/snapshot')
def snapshot():
    d=twin.step(0)
    return d
@app.post('/api/fault')
def fault(c:FaultCommand): twin.set_fault(c.fault,c.enabled,c.severity); return {'active_faults':twin.active_faults}
@app.post('/api/whatif')
def whatif(c:WhatIfCommand): twin.set_whatif(**c.model_dump()); return {'what_if':twin.whatif}
@app.post('/api/mode/{mode}')
def mode(mode:str):
    allowed=['LIVE_SIMULATION','HISTORIAN','WHAT_IF','FAULT_TRAINING']
    if mode not in allowed:return {'ok':False,'error':'Invalid mode'}
    twin.set_mode(mode);return {'ok':True,'mode':mode}
@app.websocket('/ws/live')
async def live(ws:WebSocket):
    await ws.accept()
    try:
        while True:
            sample=twin.step(.2)
            history.append({"timestamp":sample.timestamp,"line_speed_mpm":sample.line_speed_mpm,"line_tension_pv_kg":sample.line_tension_pv_kg,"b4a_torque_pct":next((x.torque_pct for x in sample.drives if x.id=='D-B4A'),0),"break_risk_pct":sample.break_risk.score_pct})
            await ws.send_text(sample.model_dump_json()); await asyncio.sleep(.2)
    except WebSocketDisconnect: pass
