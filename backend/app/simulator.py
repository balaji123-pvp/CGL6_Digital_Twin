import math, random, time, json, re
from pathlib import Path
from .models import *
DATA_DIR = Path(__file__).resolve().parents[2] / "data"

class CGL6Twin:
    def __init__(self):
        self.t=0.0; self.mode="LIVE_SIMULATION"; self.coil_pos=0.0; self.active_faults={}; self.whatif={}
        self.base_speed=108.0; self.base_thickness=0.140; self.base_tension=550.0; self.line_length=1650.0; self.width=1000.0
        self.tags=json.load(open(DATA_DIR / "actual_plc_tag_map.json"))["tags"]

    def config(self):
        return {"site":"JSW JFE Steel Limited","line":"CGL-6","technology":"CMI-type CGL","nominal_capacity_mt":21,"bridle_count":5,"plc_source":"BPSL_C_3.zip","actual_logic_objects":["BR_4A DB65","BR_4B DB66","Br_4a_Drv DB115/FB6","Br_4b_Drv DB116/FB6","BR4TenDiag DB26/FB142","Motor_Trq_Ten_Calc FC47","OB88 BREAKUP ERROR"],"simulation":True,"data_source":"SIMULATED / INTERPOLATED FROM PLC SYMBOL MAP"}

    def set_mode(self,mode): self.mode=mode
    def set_fault(self,fault,enabled=True,severity=1):
        if enabled: self.active_faults[fault]=max(.1,min(2.,severity))
        else: self.active_faults.pop(fault,None)
    def set_whatif(self,**kw): self.whatif={k:v for k,v in kw.items() if v is not None}

    def _risk(self,tension_sp,tension_pv,b4_speed_error,torque_spike,encoder,loadnoise,brake,cooling):
        osc=min(100,abs(tension_pv-tension_sp)/max(tension_sp,1)*100*4.5)
        speed=min(100,b4_speed_error*25)
        torque=min(100,torque_spike*3.2)
        enc=100 if encoder else 0; lc=min(100,loadnoise*60); bs=min(100,brake*100); cool=min(100,cooling*2.0)
        score=min(100,.30*osc+.20*speed+.15*torque+.10*enc+.10*lc+.10*bs+.05*cool)
        level='CRITICAL' if score>=75 else 'HIGH' if score>=50 else 'WATCH' if score>=25 else 'LOW'
        reason='Stable' if score<25 else 'Dynamic B4 tension / speed / torque disturbance'
        return BreakRisk(score_pct=score,level=level,tension_oscillation_pct=osc,speed_mismatch_pct=speed,torque_spike_pct=torque,encoder_risk_pct=enc,load_cell_risk_pct=lc,brake_snubber_risk_pct=bs,cooling_risk_pct=cool,reason=reason)

    def step(self,dt=.2):
        self.t+=dt
        speed=float(self.whatif.get('line_speed_mpm',self.base_speed))+1.2*math.sin(self.t/4)
        thick=float(self.whatif.get('thickness_mm',self.base_thickness)); tension_sp=float(self.whatif.get('tension_kg',self.base_tension))
        b4err=0.12+0.04*abs(math.sin(self.t)); torque_spike=0.0; encoder=True; loadnoise=0.0; brake=0.0; cooling_dev=0.0
        if 'b4_tension_oscillation' in self.active_faults: b4err+=1.6*self.active_faults['b4_tension_oscillation']; torque_spike+=8*self.active_faults['b4_tension_oscillation']
        if 'speed_feedback_fault' in self.active_faults: b4err+=2.0*self.active_faults['speed_feedback_fault']; encoder=False
        if 'drive_comms_fault' in self.active_faults: b4err+=1.0*self.active_faults['drive_comms_fault']
        if 'b4_torque_spike' in self.active_faults: torque_spike+=18*self.active_faults['b4_torque_spike']
        if 'load_cell_noise' in self.active_faults: loadnoise=self.active_faults['load_cell_noise'];
        if 'brake_snubber_event' in self.active_faults: brake=self.active_faults['brake_snubber_event']
        if 'cooling_zone_failure' in self.active_faults: cooling_dev=25*self.active_faults['cooling_zone_failure']
        if 'furnace_zone_imbalance' in self.active_faults: torque_spike+=2.0*self.active_faults['furnace_zone_imbalance']
        tension_pv=tension_sp+3.0*math.sin(self.t/2.2)+b4err*2.0*math.sin(self.t*5)
        if loadnoise: tension_pv+=random.gauss(0,16*loadnoise)
        tension_calc=tension_pv*(1+0.006*math.sin(self.t*1.7))+0.7*torque_spike
        self.coil_pos=(self.coil_pos+speed*dt/60)%self.line_length
        ratios=[1.000,1.0012,1.0020,1.0030,1.0010]
        bridles=[]
        for i,r in enumerate(ratios):
            local_err=(b4err if i==3 or i==4 else .05*abs(math.sin(self.t+i)))
            bspeed=speed*r*(1+(local_err/100)*math.sin(self.t*6+i))
            tq=34+i*2.5+3*math.sin(self.t*.6+i)+(torque_spike if i==3 else .3*torque_spike if i==4 else 0)
            brake_on=(brake>0 and i>=3 and math.sin(self.t*8)>0.5); snub=(brake_on and i==3)
            h='RED' if (local_err>1.2 or tq>60) else 'AMBER' if local_err>.6 else 'GREEN'
            bridles.append(Bridle(id=f'B{i+1}',name=f'Bridle {i+1}',speed_mpm=bspeed,speed_ref_mpm=speed*r,tension_sp_kg=tension_sp,tension_pv_kg=tension_pv*(1+0.003*i),torque_pct=tq,load_pct=42+i*2.1,slip_pct=.08+.03*abs(math.sin(self.t+i)),speed_error_pct=local_err,brake_on=brake_on,snubber_raised=snub,drive_healthy=encoder,health=h))
        specs=[('D-B1','B1 Drive',96.0,40),('D-B2','B2 Drive',96.1,42),('D-B3','B3 Drive',96.0,42),('D-B4A','B4A Drive',107.0,44),('D-B4B','B4B Drive',107.0,44),('D-REC','Recoiler Drive',95.0,56)]
        drives=[]
        for did,name,rpm,tq in specs:
            extra=torque_spike if did=='D-B4A' else .35*torque_spike if did=='D-B4B' else 0
            torque=tq+extra+2.5*math.sin(self.t+i if 'i' in locals() else self.t)
            current=max(60,92+1.55*abs(torque)); mtemp=43+.055*current; dtemp=38+.04*current
            health='RED' if (mtemp>78 or dtemp>72 or (not encoder and 'B4' in name)) else 'AMBER' if mtemp>68 else 'GREEN'
            drives.append(Drive(id=did,name=name,plc_instance='DB115/FB6' if did=='D-B4A' else 'DB116/FB6' if did=='D-B4B' else 'SIM',rpm=rpm+.2*math.sin(self.t),speed_mpm=speed,torque_pct=torque,current_a=current,load_pct=min(100,40+abs(torque)*.3),motor_temp_c=mtemp,drive_temp_c=dtemp,dc_bus_v=540+2*math.sin(self.t/5),speed_error_pct=(b4err if 'B4' in name else .1),encoder_ok=encoder or 'B4' not in name,communication_ok=not ('drive_comms_fault' in self.active_faults and 'B4' in name),health='RED' if ('drive_comms_fault' in self.active_faults and 'B4' in name) else health,state='RUN'))
        furnace=[]; zsp=[780,860,940,1020,1080,1070,1010,950]
        for i,sp in enumerate(zsp):
            temp=sp+4*math.sin(self.t/3+i); furnace.append(FurnaceZone(id=f'PHF-Z{i+1}',name=f'PHF Zone {i+1}',temperature_c=temp,setpoint_c=sp,output_pct=max(0,min(100,50+8*math.sin(self.t/5+i))),delta_c=temp-sp,heat_index=max(0,min(100,50+(temp-sp)*1.3)),status='RED' if abs(temp-sp)>25 else 'AMBER' if abs(temp-sp)>12 else 'GREEN'))
        cooling=[]
        for i in range(6):
            target=520-i*70; st=target+4*math.sin(self.t+i)+(cooling_dev if i==2 else 0); status='RED' if abs(st-target)>45 else 'AMBER' if abs(st-target)>20 else 'GREEN'
            cooling.append(CoolingZone(id=f'CW-{i+1}',name=f'Cooling Zone {i+1}',strip_temp_c=st,target_c=target,water_temp_c=31+i*.7,flow_m3h=145-i*5,pressure_bar=4+.08*math.sin(self.t),output_pct=55+7*math.sin(self.t/4+i),delta_to_target_c=st-target,status=status))
        zsp=float(self.whatif.get('zinc_temp_c',465)); ztemp=zsp+1.2*math.sin(self.t/4); coating=86+1.8*math.sin(self.t/3)
        coil=Coil(coil_id='CGL6-SIM-20261028-001',grade='GI-AHSS',width_mm=self.width,thickness_mm=thick,total_length_m=self.line_length,remaining_length_m=max(0,self.line_length-self.coil_pos),position_m=self.coil_pos,speed_mpm=speed,entry_temp_c=760+5*math.sin(self.t/5),furnace_exit_temp_c=460+4*math.sin(self.t/4),zinc_entry_temp_c=460+3*math.sin(self.t/3),zinc_exit_temp_c=465+2*math.sin(self.t/3),top_coat_gm2=coating,bottom_coat_gm2=coating*1.02,quality_score=max(0,100-0.5*abs(tension_pv-tension_sp)-.12*abs(ztemp-zsp)))
        risk=self._risk(tension_sp,tension_pv,b4err,torque_spike,encoder,loadnoise,brake,cooling_dev)
        alarms=[]
        if risk.score_pct>=50: alarms.append('B4 BREAK RISK HIGH — inspect dynamic tension/speed/torque')
        if 'brake_snubber_event' in self.active_faults: alarms.append('B4 brake/snubber event')
        if 'speed_feedback_fault' in self.active_faults: alarms.append('B4 encoder/speed feedback disturbance')
        if 'load_cell_noise' in self.active_faults: alarms.append('Load-cell signal instability')
        if 'cooling_zone_failure' in self.active_faults: alarms.append('Cooling-zone temperature deviation')
        tagvals=[TagValue(symbol=x['symbol'],address=x['address'],datatype=x['datatype'],value=self._tag_value(x['symbol'],speed,tension_pv,tension_sp,tension_calc,encoder)) for x in self.tags if self._relevant_tag(x['symbol'])]
        return Telemetry(timestamp=time.time(),mode=self.mode,data_quality='SIMULATED / INTERPOLATED — mapped to actual PLC symbols',line_speed_mpm=speed,strip_width_mm=self.width,strip_thickness_mm=thick,line_tension_sp_kg=tension_sp,line_tension_pv_kg=tension_pv,line_tension_calc_kg=tension_calc,line_length_m=self.line_length,coil=coil,bridles=bridles,drives=drives,furnace_zones=furnace,cooling_zones=cooling,zinc_pot=ZincPot(temperature_c=ztemp,setpoint_c=zsp,level_mm=620+4*math.sin(self.t/7),al_pct=.21+.006*math.sin(self.t/10),fe_pct=.018+.0015*math.sin(self.t/11),bath_delta_c=ztemp-zsp,strip_entry_temp_c=460+3*math.sin(self.t/3),strip_exit_temp_c=465+2*math.sin(self.t/3),air_knife_pressure_bar=1.8+.03*math.sin(self.t),top_coat_gm2=coating,bottom_coat_gm2=coating*1.02,status='GREEN' if abs(ztemp-zsp)<8 else 'AMBER'),equipment_health_pct=max(0,99-5*len(self.active_faults)),network_health_pct=99.5 if 'drive_comms_fault' not in self.active_faults else 82,plc_health_pct=99.8,break_risk=risk,alarms=alarms,active_faults=self.active_faults.copy(),plc_tags=tagvals)

    def _relevant_tag(self,s): return bool(re.search(r'Br_4a_|Br_4b_|BR4TenDiag|BREAKUP|Motor_Trq_Ten|Tns_Spd|PHF_STRIP|Cool_|COOLING_TWR|BR_4A|BR_4B|JB46_BR4|CP13_BR_4',s,re.I))
    def _tag_value(self,s,speed,tension_pv,tension_sp,tension_calc,encoder):
        if s=='BR4TenDiag': return 1 if abs(tension_pv-tension_sp)<30 else 0
        if 'Motor_Trq_Ten_Calc' in s: return tension_calc
        if 'Tns_Spd_Ref' in s: return speed
        if 'PHF_STRIP_TEMP_ACT' in s: return 460+4*math.sin(self.t/4)
        if 'Healthy' in s or 'Rdy' in s or 'Remote' in s or 'Drv_On' in s: return True
        if 'Alarm' in s: return False
        if 'BREAKUP ERROR' in s: return self.break_risk if hasattr(self,'break_risk') else 0
        if 'BRK_ON' in s or 'SNBR' in s: return False
        return 0.0
