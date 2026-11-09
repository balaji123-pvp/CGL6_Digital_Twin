"""Read-only engineering seed data imported from the Engineering V4 package."""

import csv
import json
from pathlib import Path


CONFIG_DIR = Path(__file__).resolve().parents[1] / "config"


def _load_json(filename):
    with (CONFIG_DIR / filename).open(encoding="utf-8") as file:
        return json.load(file)


SEED = _load_json("cgl6_seed_data.json")
TOPOLOGY = _load_json("cgl6_topology.json")
SCENARIOS = _load_json("scenario_library.json")
FAULT_SCENARIOS = _load_json("v6_fault_scenarios.json")


def _number(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return value


def read_tags(section=None):
    with (CONFIG_DIR / "cgl6_tags.csv").open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    if section:
        section_key = section.strip().casefold()
        rows = [row for row in rows if row.get("section", "").casefold() == section_key]

    for row in rows:
        row["eng_low"] = _number(row.get("eng_low"))
        row["eng_high"] = _number(row.get("eng_high"))
        row["scan_ms"] = _number(row.get("scan_ms"))
    return rows


def engineering_summary():
    metadata = SEED["metadata"]
    furnace = SEED["furnace"]
    pot = SEED["pot"]
    bridles = SEED["bridles"]
    air_knife = SEED["air_knife"]
    cooling = SEED["cooling"]
    quality = SEED["quality"]
    nominal_tension_kn = float(bridles["nominal_tension_kn"])

    return {
        "line_id": metadata["line_id"],
        "data_status": metadata["data_status"],
        "basis": metadata["basis"],
        "model_version": metadata["model_version"],
        "speeds_mpm": {
            "nominal": metadata["nominal_speed_mpm"],
            "design": metadata["design_speed_mpm"],
            "maximum": metadata["max_speed_mpm"],
        },
        "width_range_mm": [metadata["strip_width_min_mm"], metadata["strip_width_max_mm"]],
        "supported_thicknesses_mm": metadata["supported_thicknesses_mm"],
        "bridles": {
            "entry": bridles["entry_bridles"],
            "process": bridles["process_bridles"],
            "exit": bridles["exit_bridles"],
            "total": bridles["entry_bridles"] + bridles["process_bridles"] + bridles["exit_bridles"],
            "nominal_tension_kn": nominal_tension_kn,
            "nominal_tension_kgf": round(nominal_tension_kn * 1000 / 9.80665, 1),
        },
        "furnace": {
            "zones": furnace["zone_count"],
            "zone_setpoints_c": furnace["zone_setpoints_c"],
            "burners_per_zone": furnace["burners_per_zone"],
            "total_burners": furnace["total_burners"],
            "main_fuel": furnace["main_fuel"],
            "pilot_fuel": furnace["lpg_pilot_fuel"],
            "cog_supply_pressure_mmh2o": furnace["cog_supply_pressure_mmh2o"],
            "cog_gcv_kcal_nm3": furnace["cog_gcv_kcal_nm3"],
        },
        "pot": {
            "bath_temperature_c": pot["bath_temperature_c"],
            "temperature_range_c": [pot["bath_temperature_low_c"], pot["bath_temperature_high_c"]],
            "bath_level_mm": pot["bath_level_mm"],
        },
        "air_knife": {
            "nominal_pressure_kpa": air_knife["nominal_pressure_kpa"],
            "pressure_range_kpa": [air_knife["pressure_min_kpa"], air_knife["pressure_max_kpa"]],
            "distance_mm": air_knife["knife_to_strip_distance_mm"],
        },
        "cooling": {
            "nominal_outlet_strip_temp_c": cooling["nominal_outlet_strip_temp_c"],
            "air_flow_nm3_h": cooling["air_flow_nm3_h"],
        },
        "quality": {
            "coating_target_g_m2": quality["coating_target_g_m2"],
            "coating_range_g_m2": [quality["coating_low_g_m2"], quality["coating_high_g_m2"]],
        },
        "topology_section_count": len(TOPOLOGY["sections"]),
        "topology_sections": [
            {"id": section["id"], "name": section["name"]}
            for section in TOPOLOGY["sections"]
        ],
        "tag_count": len(read_tags()),
        "scenario_count": len(SCENARIOS),
        "fault_scenario_count": len(FAULT_SCENARIOS["faults"]),
        "control_writeback_enabled": False,
    }
