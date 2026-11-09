from pydantic import BaseModel, Field
from typing import List, Dict

class TagValue(BaseModel):
    symbol:str; address:str; datatype:str; value:float|int|bool|str; source:str="SIMULATED"

class Drive(BaseModel):
    id:str; name:str; plc_instance:str; rpm:float; speed_mpm:float; torque_pct:float; current_a:float; load_pct:float
    motor_temp_c:float; drive_temp_c:float; dc_bus_v:float; speed_error_pct:float; encoder_ok:bool; communication_ok:bool; health:str; state:str

class Bridle(BaseModel):
    id:str; name:str; speed_mpm:float; speed_ref_mpm:float; tension_sp_kg:float; tension_pv_kg:float; torque_pct:float; load_pct:float
    slip_pct:float; speed_error_pct:float; brake_on:bool; snubber_raised:bool; drive_healthy:bool; health:str

class FurnaceZone(BaseModel):
    id:str; name:str; temperature_c:float; setpoint_c:float; output_pct:float; delta_c:float; heat_index:float; status:str

class CoolingZone(BaseModel):
    id:str; name:str; strip_temp_c:float; target_c:float; water_temp_c:float; flow_m3h:float; pressure_bar:float; output_pct:float; delta_to_target_c:float; status:str

class ZincPot(BaseModel):
    temperature_c:float; setpoint_c:float; level_mm:float; al_pct:float; fe_pct:float; bath_delta_c:float
    strip_entry_temp_c:float; strip_exit_temp_c:float; air_knife_pressure_bar:float; top_coat_gm2:float; bottom_coat_gm2:float; status:str

class Coil(BaseModel):
    coil_id:str; grade:str; width_mm:float; thickness_mm:float; total_length_m:float; remaining_length_m:float; position_m:float
    speed_mpm:float; entry_temp_c:float; furnace_exit_temp_c:float; zinc_entry_temp_c:float; zinc_exit_temp_c:float; top_coat_gm2:float; bottom_coat_gm2:float; quality_score:float

class BreakRisk(BaseModel):
    score_pct:float; level:str; tension_oscillation_pct:float; speed_mismatch_pct:float; torque_spike_pct:float; encoder_risk_pct:float
    load_cell_risk_pct:float; brake_snubber_risk_pct:float; cooling_risk_pct:float; reason:str

class Telemetry(BaseModel):
    timestamp:float; mode:str; data_quality:str; line_speed_mpm:float; strip_width_mm:float; strip_thickness_mm:float
    line_tension_sp_kg:float; line_tension_pv_kg:float; line_tension_calc_kg:float; line_length_m:float; coil:Coil
    bridles:List[Bridle]; drives:List[Drive]; furnace_zones:List[FurnaceZone]; cooling_zones:List[CoolingZone]; zinc_pot:ZincPot
    equipment_health_pct:float; network_health_pct:float; plc_health_pct:float; break_risk:BreakRisk
    alarms:List[str]=Field(default_factory=list); active_faults:Dict[str,float]=Field(default_factory=dict); plc_tags:List[TagValue]=Field(default_factory=list)

class FaultCommand(BaseModel):
    fault:str; enabled:bool=True; severity:float=1.0

class WhatIfCommand(BaseModel):
    line_speed_mpm:float|None=None; thickness_mm:float|None=None; tension_kg:float|None=None; zinc_temp_c:float|None=None
