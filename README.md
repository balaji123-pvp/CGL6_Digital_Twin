# JSW JFE Steel Limited — CGL Line 6 — 3D Digital Twin

This is a simulated/interpolated industrial digital twin for a CMI-type CGL Line 6.
All process values are placeholders until the actual PLC/DCS/drive tag database is connected.

Stack:
- React + Three.js / React Three Fiber
- FastAPI + WebSocket
- Python real-time simulator
- Live / Historian / What-if / Fault Training modes

Run backend:
  cd backend
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000

Run frontend:
  cd frontend
  npm install
  npm run dev

Open http://localhost:5173

Future PLC integration:
Replace backend/app/collector.py with the approved OPC UA/OPC DA/PLC gateway.
Keep the normalized telemetry model unchanged so the 3D frontend does not need rewriting.

Do not treat simulated values as CMI OEM design limits or plant operating limits.
