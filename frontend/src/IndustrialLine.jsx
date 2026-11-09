import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Html, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

const steel = "#64717b";
const frameSteel = "#35434c";
const darkSteel = "#202b31";

function LiveTelemetryTag({ position, label, value, detail, lane = 0, orbit }) {
  const tagRef = useRef(null);
  const baseLaneOffset = useRef(null);

  useFrame(({ camera }, delta) => {
    const tag = tagRef.current;
    if (!tag) return;

    if (baseLaneOffset.current === null) {
      const cssOffset = lane ? Number.parseFloat(window.getComputedStyle(tag).getPropertyValue("--tag-y")) : 0;
      baseLaneOffset.current = Number.isFinite(cssOffset) ? cssOffset : 0;
    }

    const controls = orbit?.current;
    const viewDistance = controls ? camera.position.distanceTo(controls.target) : 110;
    const desiredScale = THREE.MathUtils.clamp(Math.pow(55 / Math.max(viewDistance, 1), 0.55), 0.5, 1.6);
    const currentScale = Number(tag.style.getPropertyValue("--tag-scale")) || 1;
    const scale = THREE.MathUtils.damp(currentScale, desiredScale, 8, delta);
    tag.style.setProperty("--tag-scale", scale.toFixed(3));
    tag.style.setProperty("--tag-y", `${(baseLaneOffset.current * scale).toFixed(1)}px`);
  });

  return (
    <Html position={position} center zIndexRange={[500, 0]} style={{ pointerEvents: "none" }}>
      <div ref={tagRef} className="equipment-live-tag" data-lane={lane} aria-label={label}>
        <div className="equipment-live-tag-title"><i />{label}</div>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </Html>
  );
}

function liveNumber(value, places = 1) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(places);
}

function averageMetric(items, key) {
  const values = items.map((item) => Number(item?.[key])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function StatusColor(value) {
  const status = String(value || "GREEN").toUpperCase();
  if (status.includes("RED")) return "#ff4d48";
  if (status.includes("AMBER")) return "#ffb43f";
  return "#45e28c";
}

function Label({ children, position, size = 0.34, color = "#e9f2f4" }) {
  return (
    <Billboard position={position}>
      <Text
        fontSize={size * 1.25}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#10181b"
      >
        {children}
      </Text>
    </Billboard>
  );
}

function FaultMarker({ position = [0, 0, 0], size = [4, 4, 4], label }) {
  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshBasicMaterial color="#ff263f" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshBasicMaterial color="#ff344f" wireframe transparent opacity={0.98} depthWrite={false} />
      </mesh>
      <Label position={[0, size[1] + 0.38, 0]} size={0.26} color="#ff5365">
        {`FAULT · ${label}`}
      </Label>
    </group>
  );
}

function Indicator({ position, color = "#45e28c", size = 0.13 }) {
  const lamp = useRef();
  useFrame(({ clock }) => {
    if (lamp.current) lamp.current.material.emissiveIntensity = 1.1 + 0.45 * Math.sin(clock.elapsedTime * 2.4);
  });
  return (
    <mesh ref={lamp} position={position}>
      <sphereGeometry args={[size, 16, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
    </mesh>
  );
}

function Roller({ position, radius = 0.31, length = 3.1, speed = 3.4, color = steel }) {
  const roller = useRef();
  useFrame((_, delta) => {
    if (roller.current) roller.current.rotation.z += speed * delta;
  });
  return (
    <group position={position}>
      <mesh ref={roller} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, length, 32]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0, length / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.52, radius * 0.52, 0.09, 20]} />
        <meshStandardMaterial color="#222d33" metalness={0.78} roughness={0.33} />
      </mesh>
      <mesh position={[0, 0, -length / 2 - 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.52, radius * 0.52, 0.09, 20]} />
        <meshStandardMaterial color="#222d33" metalness={0.78} roughness={0.33} />
      </mesh>
    </group>
  );
}

function Motor({ position, color = "#24343d", scale = 1 }) {
  const fan = useRef();
  useFrame((_, delta) => {
    if (fan.current) fan.current.rotation.z += delta * 8;
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.05, 0.74, 0.78]} />
        <meshStandardMaterial color={color} metalness={0.62} roughness={0.38} />
      </mesh>
      {[-0.31, -0.16, 0, 0.16, 0.31].map((x) => (
        <mesh key={x} position={[x, 0, 0.405]}>
          <boxGeometry args={[0.055, 0.56, 0.07]} />
          <meshStandardMaterial color="#63717a" metalness={0.76} roughness={0.3} />
        </mesh>
      ))}
      <group ref={fan} position={[0, 0, 0.48]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.23, 0.23, 0.045, 20]} />
          <meshStandardMaterial color="#1d282d" metalness={0.66} roughness={0.34} />
        </mesh>
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle) => (
          <mesh key={angle} rotation={[0, 0, angle]} position={[0, 0, 0.035]}>
            <boxGeometry args={[0.055, 0.34, 0.025]} />
            <meshStandardMaterial color="#a4afb3" metalness={0.74} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <mesh position={[0.58, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.16, 20]} />
        <meshStandardMaterial color="#77838a" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[0.78, 0.12, 0.68]} />
        <meshStandardMaterial color="#1d272c" metalness={0.5} roughness={0.48} />
      </mesh>
    </group>
  );
}

function PortalFrame({ height = 3.2, width = 4.3, color = frameSteel }) {
  return (
    <group>
      {[-width / 2, width / 2].map((z) => (
        <React.Fragment key={z}>
          <mesh position={[0, height / 2, z]} castShadow>
            <boxGeometry args={[0.34, height, 0.34]} />
            <meshStandardMaterial color={color} metalness={0.72} roughness={0.34} />
          </mesh>
          <mesh position={[0, 0.18, z]}>
            <boxGeometry args={[0.9, 0.3, 0.72]} />
            <meshStandardMaterial color="#202a2f" metalness={0.66} roughness={0.4} />
          </mesh>
        </React.Fragment>
      ))}
      <mesh position={[0, height, 0]} castShadow>
        <boxGeometry args={[0.48, 0.42, width + 0.32]} />
        <meshStandardMaterial color={color} metalness={0.72} roughness={0.34} />
      </mesh>
    </group>
  );
}

function Coil({ position, radius = 1.5, width = 2.6, spin = 1.6, color = "#aeb7bc" }) {
  const coil = useRef();
  useFrame((_, delta) => {
    if (coil.current) coil.current.rotation.z += spin * delta;
  });
  return (
    <group ref={coil} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, width, 64]} />
        <meshPhysicalMaterial color={color} metalness={0.91} roughness={0.23} clearcoat={0.5} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={index} position={[0, 0, width / 2 + 0.012 + index * 0.003]}>
          <torusGeometry args={[radius - 0.07 * index, 0.025, 8, 72]} />
          <meshStandardMaterial color="#d4dadd" metalness={0.94} roughness={0.2} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.22, radius * 0.22, width + 0.12, 32]} />
        <meshStandardMaterial color="#344047" metalness={0.82} roughness={0.28} />
      </mesh>
    </group>
  );
}

function Uncoiler({ x, speed }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[3.7, 0.55, 5.8]} />
        <meshStandardMaterial color="#303c42" metalness={0.65} roughness={0.4} />
      </mesh>
      <PortalFrame height={3.5} width={4.2} />
      <mesh position={[0, 2.45, -2.25]}>
        <boxGeometry args={[1.2, 1.6, 0.38]} />
        <meshStandardMaterial color="#26343a" metalness={0.65} roughness={0.37} />
      </mesh>
      <mesh position={[0, 2.45, 2.25]}>
        <boxGeometry args={[1.2, 1.6, 0.38]} />
        <meshStandardMaterial color="#26343a" metalness={0.65} roughness={0.37} />
      </mesh>
      <Coil position={[0, 2.55, 0]} radius={1.48} width={2.7} spin={Math.max(0.25, speed / 60 / 1.48)} />
      <Motor position={[0.65, 1.1, 2.85]} scale={0.82} />
      <Indicator position={[0, 3.78, 0]} />
      <Label position={[0, 4.35, 0]} size={0.27}>S01 · ENTRY / PAYOFF</Label>
    </group>
  );
}

function BridleStand({ x, label, drive, tension }) {
  const status = StatusColor(drive?.health || "GREEN");
  const spin = Math.max(2.1, (drive?.rpm || 90) * Math.PI / 30);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[3.0, 0.48, 4.9]} />
        <meshStandardMaterial color="#354249" metalness={0.65} roughness={0.4} />
      </mesh>
      <PortalFrame height={3.45} width={4.3} />
      {[-0.84, 0, 0.84].map((offset, index) => (
        <Roller key={offset} position={[offset, 1.14 + (index === 1 ? 0.12 : 0), 0]} speed={spin} radius={0.34} length={3.25} />
      ))}
      <Motor position={[0.15, 1.05, 2.75]} scale={0.76} />
      <Indicator position={[0, 3.85, 0]} color={status} />
      <Label position={[0, 4.36, 0]} size={0.3}>{label}</Label>
      <Label position={[0, 0.47, 2.48]} size={0.17} color="#a9bbc3">{`TENSION ${Math.round(tension || 0)} kgf`}</Label>
    </group>
  );
}

function BridleBank({ x, labels, drives = [], tensions = [], speed = 120, faultHighlight, faultGroup }) {
  const width = labels.length * 1.62 + 1.1;
  const centers = labels.map((_, index) => (index - (labels.length - 1) / 2) * 1.62);
  const firstLabel = labels[0] || "";
  const bankName = firstLabel.startsWith("B1") ? "ENTRY BRIDLES" :
    firstLabel.startsWith("B2") ? "BRIDLE 2" :
    firstLabel.startsWith("B3") ? "BRIDLE 3" :
    firstLabel.startsWith("HBR") ? "HOT BRIDLE" :
    firstLabel.startsWith("B4") ? "BRIDLE 4" : "EXIT BRIDLES";
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[width, 0.5, 5.0]} />
        <meshStandardMaterial color="#344147" metalness={0.66} roughness={0.39} />
      </mesh>
      <PortalFrame height={3.6} width={4.5} color="#46545b" />
      {centers.map((center, index) => {
        const drive = drives[index];
        const status = StatusColor(drive?.health || "GREEN");
        const spin = Math.max(2.2, (drive?.rpm || speed / 1.4) * Math.PI / 30);
        return (
          <group key={labels[index]} position={[center, 0, 0]}>
            {faultGroup === "b4" && (faultHighlight === "b4" || (faultHighlight === "b4a" && index === 0) || (faultHighlight === "b4b" && index === 1)) && (
              <FaultMarker position={[0, 0, 1.18]} size={[1.68, 4.9, 4.2]} label={index === 0 ? "B4A DRIVE" : "B4B DRIVE"} />
            )}
            {[-0.43, 0, 0.43].map((offset, rollIndex) => (
              <Roller key={offset} position={[offset, 1.13 + (rollIndex === 1 ? 0.12 : 0), 0]} speed={rollIndex === 1 ? -spin : spin} radius={0.27} length={2.72} />
            ))}
            <Motor position={[0, 0.94, 2.72]} scale={0.46} />
            <Indicator position={[0, 3.91, 0]} color={status} size={0.1} />
            <Label position={[0, 4.35, 0]} size={0.2}>{labels[index]}</Label>
            <Label position={[0, 0.48, 2.48]} size={0.13} color="#a9bbc3">{`${Math.round(tensions[index] || 0)} kgf`}</Label>
          </group>
        );
      })}
      <Label position={[0, 4.9, 0]} size={0.25}>{bankName}</Label>
    </group>
  );
}

function temperatureColor(value, minimum = 25, maximum = 900) {
  const temperature = Number(value);
  const t = THREE.MathUtils.clamp((temperature - minimum) / (maximum - minimum), 0, 1);
  const hue = (2 / 3) * (1 - t);
  return `#${new THREE.Color().setHSL(hue, 0.94, 0.48).getHexString()}`;
}

function Furnace({ x, label, zones = [], burnersPerZone = 4, faultHighlight }) {
  const zoneSlots = zones.slice(0, 4);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[8.7, 0.44, 5.8]} />
        <meshStandardMaterial color="#343f43" metalness={0.57} roughness={0.47} />
      </mesh>
      <mesh position={[0, 4.7, 0]} castShadow>
        <boxGeometry args={[8.3, 0.48, 5.2]} />
        <meshStandardMaterial color="#59646a" metalness={0.64} roughness={0.39} />
      </mesh>
      <mesh position={[0, 3.15, -2.35]} castShadow>
        <boxGeometry args={[8.1, 3.0, 0.34]} />
        <meshStandardMaterial color="#37444a" metalness={0.6} roughness={0.43} />
      </mesh>
      {[-4.0, 4.0].map((end) => (
        <mesh key={end} position={[end, 2.75, 0]} castShadow>
          <boxGeometry args={[0.38, 4.4, 5.0]} />
          <meshStandardMaterial color="#47545a" metalness={0.68} roughness={0.39} />
        </mesh>
      ))}
      <mesh position={[0, 4.35, 2.35]}>
        <boxGeometry args={[7.7, 1.15, 0.3]} />
        <meshStandardMaterial color="#455158" metalness={0.64} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.95, 2.35]}>
        <boxGeometry args={[7.7, 0.48, 0.3]} />
        <meshStandardMaterial color="#455158" metalness={0.64} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.86, 2.13]}>
        <boxGeometry args={[7.35, 0.14, 0.06]} />
        <meshStandardMaterial color="#ff7a21" emissive="#ff5312" emissiveIntensity={1.7} />
      </mesh>
      {zoneSlots.map((zone, index) => {
        const px = zoneSlots.length === 1 ? 0 : -2.85 + index * 5.7 / Math.max(1, zoneSlots.length - 1);
        const glow = temperatureColor(zone?.temperature_c);
        return (
          <group key={px}>
            <mesh position={[px, 3.52, 2.18]}>
              <boxGeometry args={[1.25, 0.54, 0.1]} />
              <meshStandardMaterial color="#202c31" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[px, 3.52, 2.245]}>
              <boxGeometry args={[0.88, 0.22, 0.045]} />
              <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} />
            </mesh>
            <Label position={[px, 3.52, 2.31]} size={0.14} color="#fff0d1">
              {`${zone.name.replace("Furnace Zone ", "Z")} ${zone.temperature_c.toFixed(0)}°`}
            </Label>
            {Array.from({ length: burnersPerZone }, (_, burnerIndex) => (burnerIndex - (burnersPerZone - 1) / 2) * 0.3).map((burnerOffset, burnerIndex) => (
              <group key={burnerIndex} position={[px + burnerOffset, 2.85, 2.28]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.12, 0.12, 0.14, 16]} />
                  <meshStandardMaterial color="#273137" metalness={0.7} roughness={0.32} />
                </mesh>
                <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.062, 0.062, 0.025, 16]} />
                  <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.35 + (zone.output_pct || 0) / 65} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
      {[-2.6, 2.6].map((px) => (
        <group key={px} position={[px, 5.4, -0.4]}>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.42, 0.54, 1.45, 20]} />
            <meshStandardMaterial color="#59656b" metalness={0.7} roughness={0.38} />
          </mesh>
          <mesh position={[0, 1.48, 0]}>
            <cylinderGeometry args={[0.64, 0.64, 0.16, 20]} />
            <meshStandardMaterial color="#313d42" metalness={0.66} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <Indicator position={[0, 5.12, 2.2]} color={StatusColor(zones.some((z) => z.status === "RED") ? "RED" : zones.some((z) => z.status === "AMBER") ? "AMBER" : "GREEN")} />
      {faultHighlight === "furnace" && <FaultMarker position={[0, 0, 0]} size={[8.9, 6.2, 6.1]} label="FURNACE" />}
      <Label position={[0, 5.72, 0.8]} size={0.32}>{label}</Label>
      <Label position={[0, 0.62, 2.57]} size={0.18} color="#ffba70">{zones.length ? `${zones[0]?.temperature_c?.toFixed(0) || "--"} °C` : "FURNACE"}</Label>
    </group>
  );
}

function CoolingSection({ x, zones = [], speed, faultHighlight }) {
  const status = zones.some((zone) => zone.status === "RED") ? "RED" : zones.some((zone) => zone.status === "AMBER") ? "AMBER" : "GREEN";
  const spin = Math.max(2, speed / 60 / 0.31);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[8.5, 0.4, 5.8]} />
        <meshStandardMaterial color="#303d43" metalness={0.62} roughness={0.4} />
      </mesh>
      {[-3.15, -1.05, 1.05, 3.15].map((offset) => (
        <group key={offset} position={[offset, 0, 0]}>
          <PortalFrame height={3.35} width={4.45} color="#405057" />
          <Roller position={[0, 1.13, 0]} speed={spin} radius={0.3} length={3.5} color="#77848a" />
        </group>
      ))}
      {[-1.4, 1.4].map((z) => (
        <mesh key={z} position={[0, 3.0, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 7.8, 16]} />
          <meshStandardMaterial color="#408da0" metalness={0.65} roughness={0.28} />
        </mesh>
      ))}
      {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((offset, index) => {
        const zoneColor = temperatureColor(zones[index]?.strip_temp_c ?? 25);
        return (
        <group key={offset} position={[offset, 2.85, 0]}>
          <mesh position={[0, -0.38, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.72, 12]} />
            <meshStandardMaterial color={zoneColor} emissive={zoneColor} emissiveIntensity={0.42} metalness={0.35} roughness={0.28} />
          </mesh>
          <mesh position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.12, 0.34, 12]} />
            <meshStandardMaterial color={zoneColor} emissive={zoneColor} emissiveIntensity={0.35} transparent opacity={0.7} roughness={0.24} />
          </mesh>
        </group>
        );
      })}
      <Motor position={[3.0, 1.05, 2.75]} scale={0.68} color="#24404a" />
      <Indicator position={[0, 3.8, 0]} color={StatusColor(status)} />
      {faultHighlight === "cooling" && <FaultMarker position={[0, 0, 0]} size={[8.7, 4.8, 6.1]} label="COOLING ZONE" />}
      <Label position={[0, 4.34, 0]} size={0.29}>S09 · COOLING ZONE</Label>
      <Label position={[0, 0.48, 2.5]} size={0.18} color="#84d8e3">{zones.length ? `ZONES ${zones.length} · ${zones[0]?.strip_temp_c?.toFixed(0) || "--"} °C` : "COOLING"}</Label>
    </group>
  );
}

function ZincPot({ x, data, speed = 120, faultHighlight }) {
  const bath = useRef();
  const bathColor = temperatureColor(data?.temperature_c, 350, 500);
  useFrame(({ clock }) => {
    if (bath.current) bath.current.material.emissiveIntensity = 0.42 + 0.1 * Math.sin(clock.elapsedTime * 1.7);
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[5.3, 0.58, 6.1]} />
        <meshStandardMaterial color="#303b40" metalness={0.58} roughness={0.43} />
      </mesh>
      <mesh position={[0, 0.98, -1.95]} castShadow>
        <boxGeometry args={[4.6, 1.7, 0.34]} />
        <meshStandardMaterial color="#39454a" metalness={0.59} roughness={0.42} />
      </mesh>
      {[-2.2, 2.2].map((px) => (
        <mesh key={px} position={[px, 1.05, 0]} castShadow>
          <boxGeometry args={[0.34, 1.8, 4.3]} />
          <meshStandardMaterial color="#465258" metalness={0.64} roughness={0.38} />
        </mesh>
      ))}
      <mesh ref={bath} position={[0, 1.78, 0]}>
        <boxGeometry args={[4.25, 0.12, 4.0]} />
        <meshStandardMaterial color={bathColor} emissive={bathColor} emissiveIntensity={0.42} metalness={0.86} roughness={0.2} />
      </mesh>
      <Roller position={[0, 0.82, 0]} speed={Math.max(1.8, speed / 60 / 0.42)} radius={0.42} length={3.45} color="#879296" />
      {[-1.2, 0, 1.2].map((z) => (
        <mesh key={z} position={[0, 1.86, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.018, 6, 32]} />
          <meshStandardMaterial color="#ffe098" emissive="#ffbb54" emissiveIntensity={0.4} metalness={0.62} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, 2.02, -2.8]}>
        <boxGeometry args={[5.4, 0.22, 0.28]} />
        <meshStandardMaterial color="#4f5a5e" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[0, 2.02, 2.8]}>
        <boxGeometry args={[5.4, 0.22, 0.28]} />
        <meshStandardMaterial color="#4f5a5e" metalness={0.72} roughness={0.34} />
      </mesh>
      {[-2.65, 2.65].map((px) => (
        <mesh key={px} position={[px, 2.02, 0]}>
          <boxGeometry args={[0.28, 0.22, 5.6]} />
          <meshStandardMaterial color="#4f5a5e" metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
      <mesh position={[2.68, 1.45, 0]} castShadow>
        <boxGeometry args={[0.42, 0.68, 2.2]} />
        <meshStandardMaterial color="#667378" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[-2.68, 1.45, 0]} castShadow>
        <boxGeometry args={[0.42, 0.68, 2.2]} />
        <meshStandardMaterial color="#4f5a5e" metalness={0.72} roughness={0.34} />
      </mesh>
      {[-1.28, 1.28].map((z) => (
        <group key={z} position={[0, 2.52, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 3.0, 20]} />
            <meshStandardMaterial color="#79868a" metalness={0.84} roughness={0.24} />
          </mesh>
          <mesh position={[0, -0.36, 0]}>
            <boxGeometry args={[0.5, 0.54, 0.48]} />
            <meshStandardMaterial color="#253238" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
      <Motor position={[2.65, 1.05, 2.55]} scale={0.62} />
      <Indicator position={[0, 3.08, 2.3]} color={StatusColor(data?.status)} />
      {faultHighlight === "zinc" && <FaultMarker position={[0, 0, 0]} size={[5.6, 3.8, 6.4]} label="ZINC POT" />}
      <Label position={[0, 3.55, 0.7]} size={0.3}>S07 · ZINC POT</Label>
      <Label position={[0, 0.52, 2.58]} size={0.18} color="#f0c776">{data ? `BATH ${data.temperature_c.toFixed(1)} °C` : "GALVANIZING BATH"}</Label>
    </group>
  );
}

function Recoiler({ x, speed }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[4.1, 0.58, 5.8]} />
        <meshStandardMaterial color="#303b40" metalness={0.62} roughness={0.41} />
      </mesh>
      <PortalFrame height={3.8} width={4.3} />
      <mesh position={[0, 2.6, -2.2]}>
        <boxGeometry args={[1.15, 1.7, 0.36]} />
        <meshStandardMaterial color="#2c3a40" metalness={0.65} roughness={0.36} />
      </mesh>
      <mesh position={[0, 2.6, 2.2]}>
        <boxGeometry args={[1.15, 1.7, 0.36]} />
        <meshStandardMaterial color="#2c3a40" metalness={0.65} roughness={0.36} />
      </mesh>
      <Coil position={[0, 2.6, 0]} radius={1.62} width={2.7} spin={-Math.max(0.25, Math.abs(speed) / 60 / 1.62)} color="#c4ccd0" />
      <Motor position={[0.62, 1.08, 2.9]} scale={0.9} color="#263a43" />
      <Indicator position={[0, 4.05, 0]} />
      <Label position={[0, 4.55, 0]} size={0.31}>S10 · RECOILER</Label>
    </group>
  );
}

function buildAccumulatorRibbon() {
  const points = [
    [-2.1, 1.08, 0], [-0.84, 1.08, 0], [-0.84, 5.2, 0], [-0.64, 5.56, 0],
    [0.48, 5.56, 0], [0.68, 5.24, 0], [0.68, 1.92, 0], [0.42, 1.6, 0],
    [-0.38, 1.6, 0], [-0.56, 1.9, 0], [-0.56, 4.58, 0], [-0.28, 4.9, 0],
    [0.72, 4.9, 0], [0.92, 4.58, 0], [0.92, 1.08, 0], [2.1, 1.08, 0]
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.36);
  const divisions = 220;
  const halfWidth = 0.88;
  const positions = new Float32Array((divisions + 1) * 2 * 3);
  const uvs = new Float32Array((divisions + 1) * 2 * 2);
  const indices = [];
  for (let index = 0; index <= divisions; index += 1) {
    const t = index / divisions;
    const point = curve.getPointAt(t);
    const vertex = index * 2;
    positions.set([point.x, point.y, point.z - halfWidth], vertex * 3);
    positions.set([point.x, point.y, point.z + halfWidth], (vertex + 1) * 3);
    uvs.set([t * 8, 0], vertex * 2);
    uvs.set([t * 8, 1], (vertex + 1) * 2);
    if (index < divisions) {
      const next = vertex + 2;
      indices.push(vertex, vertex + 1, next, vertex + 1, next + 1, next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, curve };
}

function AccumulatorStrip({ speed }) {
  const pulses = useRef([]);
  const { geometry, curve } = useMemo(() => buildAccumulatorRibbon(), []);
  useFrame(({ clock }) => {
    const rate = Math.max(0.035, Number(speed || 90) / 1500);
    pulses.current.forEach((pulse, index) => {
      if (!pulse) return;
      const t = (clock.elapsedTime * rate + index / 3) % 1;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      pulse.position.set(point.x, point.y, point.z + 0.045);
      pulse.rotation.z = Math.atan2(tangent.y, tangent.x);
    });
  });
  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial color="#c9d8df" metalness={0.92} roughness={0.18} clearcoat={0.92} clearcoatRoughness={0.16} emissive="#176494" emissiveIntensity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh key={index} ref={(element) => { pulses.current[index] = element; }}>
          <boxGeometry args={[0.12, 0.045, 1.8]} />
          <meshBasicMaterial color={index === 1 ? "#ffffff" : "#55deff"} transparent opacity={0.82} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Accumulator({ x, label, speed }) {
  const spin = Math.max(1.8, speed / 60 / 0.42);
  const guideRollers = [
    [-0.84, 1.08], [-0.84, 5.2], [0.48, 5.56], [0.68, 1.92],
    [-0.38, 1.6], [-0.56, 4.58], [0.72, 4.9], [0.92, 1.08]
  ];
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[4.2, 0.48, 5.8]} />
        <meshStandardMaterial color="#253f50" metalness={0.72} roughness={0.32} />
      </mesh>
      {[-1.72, 1.72].map((side) => (
        <group key={side}>
          {[-2.16, 2.16].map((z) => (
            <mesh key={z} position={[side, 3.35, z]} castShadow>
              <boxGeometry args={[0.25, 6.25, 0.25]} />
              <meshStandardMaterial color="#6b818d" metalness={0.78} roughness={0.28} />
            </mesh>
          ))}
          <mesh position={[side, 6.48, 0]} castShadow>
            <boxGeometry args={[0.34, 0.3, 4.62]} />
            <meshStandardMaterial color="#8b9da5" metalness={0.78} roughness={0.26} />
          </mesh>
          <mesh position={[side, 0.75, 0]}>
            <boxGeometry args={[0.2, 0.1, 4.5]} />
            <meshStandardMaterial color="#22b9ed" emissive="#1379a4" emissiveIntensity={0.32} metalness={0.42} roughness={0.32} />
          </mesh>
        </group>
      ))}
      {guideRollers.map(([rollerX, y], index) => (
        <group key={index}>
          <Roller position={[rollerX, y, 0]} speed={index % 2 ? -spin : spin} radius={0.25} length={3.98} color="#b1bcc2" />
          <mesh position={[rollerX, y, -2.04]}>
            <boxGeometry args={[0.3, 0.18, 0.36]} />
            <meshStandardMaterial color="#24323b" metalness={0.66} roughness={0.34} />
          </mesh>
        </group>
      ))}
      <AccumulatorStrip speed={speed} />
      <Motor position={[1.12, 0.92, 2.94]} scale={0.66} />
      <Indicator position={[0, 6.88, 0]} color="#49e9bc" />
      <Label position={[0, 7.45, 0]} size={0.29}>{label}</Label>
      <Label position={[0, 0.49, 2.55]} size={0.16} color="#b8e8f7">SERPENTINE LOOP · {liveNumber(speed, 0)} m/min</Label>
    </group>
  );
}

function WelderShear({ x, speed }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[4.3, 0.48, 5.5]} />
        <meshStandardMaterial color="#303b40" metalness={0.62} roughness={0.42} />
      </mesh>
      <PortalFrame height={4.4} width={4.6} color="#435158" />
      <mesh position={[0, 3.78, 0]} castShadow>
        <boxGeometry args={[2.4, 1.0, 3.2]} />
        <meshStandardMaterial color="#2e3b41" metalness={0.74} roughness={0.33} />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[0.42, 1.5, 2.2]} />
        <meshStandardMaterial color="#758187" metalness={0.82} roughness={0.26} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[2.1, 0.22, 2.7]} />
        <meshStandardMaterial color="#c1c8ca" metalness={0.86} roughness={0.24} />
      </mesh>
      <Roller position={[-0.88, 1.14, 0]} speed={speed / 60 / 0.31} radius={0.31} length={3.2} />
      <Roller position={[0.88, 1.14, 0]} speed={speed / 60 / 0.31} radius={0.31} length={3.2} />
      <mesh position={[2.45, 1.65, -0.2]} castShadow>
        <boxGeometry args={[0.72, 2.6, 1.7]} />
        <meshStandardMaterial color="#45545b" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[2.45, 2.15, 0.68]}>
        <boxGeometry args={[0.52, 0.64, 0.04]} />
        <meshStandardMaterial color="#50c9d1" emissive="#13868e" emissiveIntensity={0.55} metalness={0.2} roughness={0.25} />
      </mesh>
      <Indicator position={[0, 4.86, 0]} />
      <mesh position={[0, 1.72, 2.35]}>
        <boxGeometry args={[0.42, 0.08, 0.04]} />
        <meshStandardMaterial color="#ff9b39" emissive="#ff6a22" emissiveIntensity={1.2} />
      </mesh>
      <Label position={[0, 5.38, 0]} size={0.27}>S03 · WELDER / CROP SHEAR</Label>
      <Label position={[0, 0.45, 2.55]} size={0.16} color="#9fb2b8">STRIP TRACKING</Label>
    </group>
  );
}

function CleaningSection({ x, speed }) {
  const spin = Math.max(2, speed / 60 / 0.24);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[7.0, 0.42, 5.7]} />
        <meshStandardMaterial color="#344249" metalness={0.56} roughness={0.43} />
      </mesh>
      {[-2.1, 0, 2.1].map((offset, index) => (
        <group key={offset} position={[offset, 0, 0]}>
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[1.8, 1.65, 4.8]} />
            <meshStandardMaterial color="#34434a" metalness={0.58} roughness={0.39} />
          </mesh>
          <mesh position={[0, 1.88, 0]}>
            <boxGeometry args={[1.56, 0.06, 4.4]} />
            <meshStandardMaterial color={index === 0 ? "#5f9daa" : "#5293a3"} emissive="#1c6e7b" emissiveIntensity={0.25} metalness={0.4} roughness={0.22} transparent opacity={0.86} />
          </mesh>
          <Roller position={[0, 1.28, 0]} speed={spin} radius={0.23} length={3.8} color="#b2bdc0" />
          {[-0.52, 0.52].map((dx) => (
            <Roller key={dx} position={[dx, 2.15, 0]} speed={spin * 0.8} radius={0.18} length={3.5} color="#54636a" />
          ))}
        </group>
      ))}
      {[-2.6, -0.4, 1.8].map((px) => (
        <mesh key={px} position={[px, 3.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 4.9, 16]} />
          <meshStandardMaterial color="#7a898d" metalness={0.75} roughness={0.27} />
        </mesh>
      ))}
      {[-2, 0, 2].map((px) => (
        <mesh key={px} position={[px, 2.74, 0]}>
          <boxGeometry args={[0.1, 0.28, 4.5]} />
          <meshStandardMaterial color="#69c8da" emissive="#2c8ca1" emissiveIntensity={0.35} transparent opacity={0.6} />
        </mesh>
      ))}
      <Motor position={[2.6, 1.5, 2.75]} scale={0.6} color="#23414a" />
      <Indicator position={[0, 3.55, 2.2]} />
      <Label position={[0, 4.0, 0]} size={0.27}>S05 · CLEANING / BRUSH / RINSE</Label>
      <Label position={[0, 0.48, 2.6]} size={0.16} color="#8fd4dc">ALKALI WASH / HOT RINSE</Label>
    </group>
  );
}

function AirKnifeStation({ x, pressure }) {
  return (
    <group position={[x, 0, 0]}>
      <PortalFrame height={3.9} width={4.8} color="#45545a" />
      {[-0.5, 0.55].map((y, index) => (
        <group key={y} position={[0, y + 1.15, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.19, 0.19, 4.3, 24]} />
            <meshStandardMaterial color="#909b9e" metalness={0.88} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0, 0.16]}>
            <boxGeometry args={[0.14, 0.26, 4.2]} />
            <meshStandardMaterial color="#52c5d4" emissive="#19899b" emissiveIntensity={0.5} metalness={0.5} roughness={0.25} />
          </mesh>
          {[-2.3, 2.3].map((z) => (
            <mesh key={z} position={[0, 0, z]}>
              <cylinderGeometry args={[0.24, 0.24, 0.42, 16]} />
              <meshStandardMaterial color="#26353b" metalness={0.6} roughness={0.36} />
            </mesh>
          ))}
          <mesh position={[-0.35 + index * 0.7, 0.12, 0]}>
            <boxGeometry args={[0.9, 0.05, 0.22]} />
            <meshStandardMaterial color="#83e3ec" emissive="#39d3e3" emissiveIntensity={0.8} transparent opacity={0.62} />
          </mesh>
        </group>
      ))}
      <mesh position={[1.95, 2.2, 2.3]}>
        <cylinderGeometry args={[0.22, 0.22, 0.14, 20]} />
        <meshStandardMaterial color="#4ac6d2" emissive="#128a9b" emissiveIntensity={0.7} />
      </mesh>
      <Indicator position={[0, 4.35, 0]} />
      <Label position={[0, 4.9, 0]} size={0.29}>S08 · AIR KNIFE / COATING</Label>
      <Label position={[0, 0.35, 2.65]} size={0.16} color="#89dce5">{`TOP / BOTTOM ${Number(pressure || 0).toFixed(1)} bar`}</Label>
    </group>
  );
}

function SkinPassMill({ x, speed }) {
  const spin = Math.max(2.2, speed / 60 / 0.3);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[4.0, 0.5, 5.7]} />
        <meshStandardMaterial color="#303b40" metalness={0.64} roughness={0.4} />
      </mesh>
      <PortalFrame height={4.7} width={4.8} color="#455259" />
      {[-2.0, 2.0].map((z) => (
        <mesh key={z} position={[0, 2.75, z]} castShadow>
          <boxGeometry args={[2.25, 3.45, 0.48]} />
          <meshStandardMaterial color="#48555b" metalness={0.68} roughness={0.34} />
        </mesh>
      ))}
      <Roller position={[0, 1.48, 0]} speed={spin} radius={0.46} length={3.4} color="#b6c0c3" />
      <Roller position={[0, 2.43, 0]} speed={-spin} radius={0.42} length={3.4} color="#aeb8bb" />
      {[-1.65, 1.65].map((z) => (
        <group key={z} position={[0, 4.55, z]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.18, 0.88, 16]} />
            <meshStandardMaterial color="#a1aaad" metalness={0.85} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.16, 20]} />
            <meshStandardMaterial color="#354147" metalness={0.72} roughness={0.32} />
          </mesh>
        </group>
      ))}
      <Motor position={[1.25, 1.1, 3.0]} scale={0.78} />
      <Indicator position={[0, 5.2, 0]} />
      <Label position={[0, 5.8, 0]} size={0.28}>S09 · SKIN PASS MILL</Label>
    </group>
  );
}

function TensionLeveler({ x, speed }) {
  const spin = Math.max(2, speed / 60 / 0.22);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[5.0, 0.5, 5.4]} />
        <meshStandardMaterial color="#344147" metalness={0.62} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.2, -2.1]} castShadow>
        <boxGeometry args={[4.8, 3.8, 0.32]} />
        <meshStandardMaterial color="#45535a" metalness={0.66} roughness={0.37} />
      </mesh>
      <mesh position={[0, 3.9, 0]} castShadow>
        <boxGeometry args={[4.8, 0.4, 4.5]} />
        <meshStandardMaterial color="#56636a" metalness={0.72} roughness={0.33} />
      </mesh>
      {Array.from({ length: 9 }, (_, index) => {
        const px = -1.8 + index * 0.45;
        const y = index % 2 === 0 ? 1.25 : 1.72;
        return <Roller key={index} position={[px, y, 0]} speed={index % 2 === 0 ? spin : -spin} radius={0.18} length={3.7} color="#aeb9bc" />;
      })}
      <Motor position={[1.8, 1.0, 2.8]} scale={0.58} />
      <Indicator position={[0, 4.32, 0]} />
      <Label position={[0, 4.84, 0]} size={0.27}>S09 · TENSION LEVELER</Label>
    </group>
  );
}

function PlantHall() {
  const supports = [-54, -27, 0, 27, 54, 81];
  return (
    <group>
      {supports.map((x) => (
        <group key={x}>
          <mesh position={[x, 5.1, -8.4]}>
            <boxGeometry args={[0.24, 10.2, 0.28]} />
            <meshStandardMaterial color="#17232e" metalness={0.5} roughness={0.58} />
          </mesh>
          <mesh position={[x, 10.25, -4.1]}>
            <boxGeometry args={[0.22, 0.2, 8.6]} />
            <meshStandardMaterial color="#202d38" metalness={0.56} roughness={0.52} />
          </mesh>
        </group>
      ))}
      <mesh position={[11, 10.25, -8.4]}>
        <boxGeometry args={[136, 0.2, 0.24]} />
        <meshStandardMaterial color="#1c2935" metalness={0.56} roughness={0.52} />
      </mesh>
      <mesh position={[11, 7.5, -8.4]}>
        <boxGeometry args={[136, 0.12, 0.18]} />
        <meshStandardMaterial color="#15222e" metalness={0.45} roughness={0.62} />
      </mesh>
    </group>
  );
}

function stripTemperatureAt(data, worldX) {
  const furnace = data.furnace_zones || [];
  const cooling = data.cooling_zones || [];
  const zinc = data.zinc_pot || {};
  const points = [
    [-52, Number(data.coil?.entry_temp_c ?? 25)],
    [-7, Number(furnace[0]?.temperature_c ?? 700)],
    [2, Number(furnace[furnace.length - 1]?.temperature_c ?? 760)],
    [11.5, Number(zinc.strip_entry_temp_c ?? zinc.temperature_c ?? 460)],
    [17, Number(zinc.strip_exit_temp_c ?? zinc.temperature_c ?? 460)],
    [24, Number(cooling[0]?.strip_temp_c ?? 350)],
    [32, Number(cooling[cooling.length - 1]?.strip_temp_c ?? 170)],
    [78, Number(data.coil?.zinc_exit_temp_c ?? cooling[cooling.length - 1]?.strip_temp_c ?? 150)]
  ];
  for (let index = 1; index < points.length; index += 1) {
    const [rightX, rightTemp] = points[index];
    const [leftX, leftTemp] = points[index - 1];
    if (worldX <= rightX) {
      const ratio = THREE.MathUtils.clamp((worldX - leftX) / (rightX - leftX), 0, 1);
      return leftTemp + (rightTemp - leftTemp) * ratio;
    }
  }
  return points[points.length - 1][1];
}

function StripHighlights({ data }) {
  const length = Math.max(1, data.line_length_m || 1650);
  const worldLength = 130;
  const phase = ((data.coil?.position_m || 0) / length) * worldLength;
  return (
    <>
      {[0, 29, 58, 87].map((offset) => {
        const x = -52 + ((phase + offset) % worldLength);
        const color = temperatureColor(stripTemperatureAt(data, x));
        return (
          <mesh key={offset} position={[x, 1.085, 0]}>
            <boxGeometry args={[1.4, 0.012, 1.62]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} metalness={0.82} roughness={0.18} transparent opacity={0.44} />
          </mesh>
        );
      })}
    </>
  );
}

function StripFlowMarker({ startX, speed }) {
  const marker = useRef();
  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.48, -0.24); shape.lineTo(0.04, -0.24); shape.lineTo(0.04, -0.42);
    shape.lineTo(0.5, 0); shape.lineTo(0.04, 0.42); shape.lineTo(0.04, 0.24);
    shape.lineTo(-0.48, 0.24); shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  useFrame((_, delta) => {
    if (!marker.current) return;
    marker.current.position.x += delta * Math.max(0.55, Number(speed || 90) / 55);
    if (marker.current.position.x > 81) marker.current.position.x = -53;
  });
  return (
    <group ref={marker} position={[startX, 1.105, 0]}>
      <mesh>
        <boxGeometry args={[1.05, 0.018, 1.55]} />
        <meshBasicMaterial color="#c9f5ff" transparent opacity={0.28} toneMapped={false} />
      </mesh>
      <mesh geometry={arrowGeometry} position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#4cff68" transparent opacity={0.92} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StripMotion({ speed }) {
  return <>{[-51, -29, -7, 15, 37, 59].map((startX) => <StripFlowMarker key={startX} startX={startX} speed={speed} />)}</>;
}

function DigitalBackdrop() {
  return (
    <group>
      <mesh position={[10, 13, -10.5]}>
        <planeGeometry args={[180, 34]} />
        <meshBasicMaterial color="#8ed6f4" side={THREE.DoubleSide} />
      </mesh>
      {[-54, -27, 0, 27, 54, 81].map((x) => (
        <mesh key={x} position={[x, 13, -10.38]}>
          <boxGeometry args={[0.035, 28, 0.02]} />
          <meshBasicMaterial color="#25425a" transparent opacity={0.2} toneMapped={false} />
        </mesh>
      ))}
      {[3, 8, 13, 18].map((y) => (
        <mesh key={y} position={[10, y, -10.36]}>
          <boxGeometry args={[178, 0.035, 0.02]} />
          <meshBasicMaterial color="#1c3448" transparent opacity={0.24} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function ThermalPlate({ data }) {
  const plate = useRef(null);
  const segmentCount = 48;
  const segmentLength = 130 / segmentCount + 0.045;

  useLayoutEffect(() => {
    if (!plate.current) return;
    const matrix = new THREE.Matrix4();
    const tint = new THREE.Color();
    for (let index = 0; index < segmentCount; index += 1) {
      const x = -52 + (index + 0.5) * (130 / segmentCount);
      plate.current.setMatrixAt(index, matrix.makeTranslation(x, 1.05, 0));
      tint.set(temperatureColor(stripTemperatureAt(data, x)));
      plate.current.setColorAt(index, tint);
    }
    plate.current.instanceMatrix.needsUpdate = true;
    if (plate.current.instanceColor) plate.current.instanceColor.needsUpdate = true;
  }, [data]);

  return (
    <instancedMesh ref={plate} args={[undefined, undefined, segmentCount]} castShadow receiveShadow>
      <boxGeometry args={[segmentLength, 0.055, 1.72]} />
      <meshPhysicalMaterial color="#ffffff" metalness={0.82} roughness={0.22} clearcoat={0.85} clearcoatRoughness={0.18} emissive="#132234" emissiveIntensity={0.18} />
    </instancedMesh>
  );
}

function PlantFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]} receiveShadow>
        <planeGeometry args={[160, 32]} />
        <meshStandardMaterial color="#0b131c" roughness={0.96} metalness={0.12} />
      </mesh>
      <gridHelper args={[160, 56, "#1d3040", "#101b26"]} position={[8, -0.14, 0]} />
      <mesh position={[8, -0.06, 0]}>
        <boxGeometry args={[156, 0.035, 0.1]} />
        <meshStandardMaterial color="#283846" metalness={0.55} roughness={0.5} />
      </mesh>
    </group>
  );
}

function CameraFocusDriver({ orbit, focusTween }) {
  useFrame((_, delta) => {
    const tween = focusTween.current;
    const controls = orbit.current;
    if (!tween || !controls) return;
    tween.elapsed += delta;
    const progress = THREE.MathUtils.clamp(tween.elapsed / tween.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
    controls.object.position.lerpVectors(tween.fromCamera, tween.toCamera, eased);
    controls.update();
    if (progress >= 1) focusTween.current = null;
  });
  return null;
}

function IndustrialLine({ data, engineering, faultHighlight }) {
  const drives = data.drives || [];
  const drive = (id) => drives.find((item) => item.id === id);
  const speed = data.line_speed_mpm || 120;
  const bridles = data.bridles || [];
  const bridleTension = (index) => {
    const bridle = bridles[Math.min(index, Math.max(bridles.length - 1, 0))];
    return bridle?.tension_pv_kg ?? bridle?.tension_kg ?? 0;
  };
  const bridleBasis = engineering?.bridles || { entry: 4, process: 2, exit: 3 };
  const entryLabels = Array.from({ length: bridleBasis.entry }, (_, index) => `B1${String.fromCharCode(65 + index)}`);
  const entryDriveIds = ["D-B1", "D-B2", "D-B3"];
  const burnersPerZone = engineering?.furnace?.burners_per_zone || 4;
  const zones = data.furnace_zones || [];
  const cooling = data.cooling_zones || [];
  const zinc = data.zinc_pot;
  const telemetry = [
    { label: "PAY-OFF REEL", x: -52, value: liveNumber(data.coil?.entry_temp_c, 0) + " °C", detail: liveNumber(speed, 0) + " m/min · " + liveNumber(data.strip_width_mm, 0) + " mm" },
    { label: "ENTRY ACCUMULATOR", x: -43, value: liveNumber(speed, 0) + " m/min", detail: "TENSION " + liveNumber(data.line_tension_pv_kg, 0) + " kgf" },
    { label: "WELDER / SHEAR", x: -34.5, value: liveNumber(data.strip_width_mm, 0) + " × " + liveNumber(data.strip_thickness_mm, 3), detail: "mm · " + liveNumber(speed, 0) + " m/min" },
    { label: "ENTRY BRIDLES", x: -25.5, value: liveNumber(drive("D-B1")?.rpm, 0) + " RPM", detail: "TENSION " + liveNumber(bridleTension(0), 0) + " kgf" },
    { label: "CLEANING SECTION", x: -16.5, value: liveNumber(speed, 0) + " m/min", detail: "STRIP " + liveNumber(data.strip_thickness_mm, 3) + " mm" },
    { label: "PHF ZONES 1–4", x: -7, value: liveNumber(averageMetric(zones.slice(0, 4), "temperature_c"), 0) + " °C", detail: "OUTPUT " + liveNumber(averageMetric(zones.slice(0, 4), "output_pct"), 0) + "% AVG" },
    { label: "PHF ZONES 5–8", x: 2, value: liveNumber(averageMetric(zones.slice(4, 8), "temperature_c"), 0) + " °C", detail: "OUTPUT " + liveNumber(averageMetric(zones.slice(4, 8), "output_pct"), 0) + "% AVG" },
    { label: "ZINC POT", x: 11.5, value: liveNumber(zinc?.temperature_c, 1) + " °C", detail: "LEVEL " + liveNumber(zinc?.level_mm, 0) + " mm" },
    { label: "AIR KNIFE", x: 17, value: liveNumber(zinc?.air_knife_pressure_bar, 2) + " bar", detail: "COAT " + liveNumber(zinc?.top_coat_gm2, 1) + " g/m²" },
    { label: "COOLING TOWER", x: 24, value: liveNumber(averageMetric(cooling, "strip_temp_c"), 0) + " °C", detail: "FLOW " + liveNumber(averageMetric(cooling, "flow_m3h"), 0) + " m³/h AVG" },
    { label: "BRIDLE 2", x: 35, value: liveNumber(drive("D-B2")?.rpm, 0) + " RPM", detail: "TORQUE " + liveNumber(drive("D-B2")?.torque_pct, 1) + "%" },
    { label: "BRIDLE 3", x: 44, value: liveNumber(drive("D-B3")?.rpm, 0) + " RPM", detail: "TORQUE " + liveNumber(drive("D-B3")?.torque_pct, 1) + "%" },
    { label: "HOT BRIDLE", x: 53, value: liveNumber(drive("D-B4A")?.rpm, 0) + " RPM", detail: "B4B TORQUE " + liveNumber(drive("D-B4B")?.torque_pct, 1) + "%" },
    { label: "BRIDLE 4 · A/B", x: 62, value: liveNumber(drive("D-B4A")?.torque_pct, 1) + " / " + liveNumber(drive("D-B4B")?.torque_pct, 1) + "%", detail: "TENSION " + liveNumber(bridleTension(4), 0) + " kgf" },
    { label: "EXIT ACCUMULATOR", x: 70.5, value: liveNumber(speed, 0) + " m/min", detail: "TENSION " + liveNumber(data.line_tension_pv_kg, 0) + " kgf" },
    { label: "RECOILER", x: 78, value: liveNumber(data.coil?.remaining_length_m, 0) + " m LEFT", detail: "EXIT " + liveNumber(data.coil?.zinc_exit_temp_c, 0) + " °C" }
  ];
  const orbit = useRef(null);
  const focusTween = useRef(null);
  const [focusedSection, setFocusedSection] = useState(null);

  function focusOn(name, position, distance = 19) {
    const controls = orbit.current;
    if (!controls) return;
    const toTarget = new THREE.Vector3(...position);
    const viewDirection = controls.object.position.clone().sub(controls.target).normalize();
    const toCamera = toTarget.clone().addScaledVector(viewDirection, distance);
    focusTween.current = {
      fromTarget: controls.target.clone(),
      toTarget,
      fromCamera: controls.object.position.clone(),
      toCamera,
      elapsed: 0,
      duration: 0.72
    };
    setFocusedSection(name);
  }

  function focusHandler(name, position, distance = 19) {
    return (event) => {
      event.stopPropagation();
      focusOn(name, position, distance);
    };
  }

  function zoomBy(factor) {
    const controls = orbit.current;
    if (!controls) return;
    const offset = controls.object.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() * factor, 9, 150);
    offset.setLength(distance);
    controls.object.position.copy(controls.target).add(offset);
    controls.update();
  }

  function resetView() {
    if (!orbit.current) return;
    focusTween.current = null;
    setFocusedSection(null);
    orbit.current.target.set(10, 4, 0);
    orbit.current.object.position.set(10, 27, 116);
    orbit.current.update();
  }

  return (
    <div className="twin-stage">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [10, 27, 116], fov: 46, near: 0.1, far: 280 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      >
      <color attach="background" args={["#87ceeb"]} />
      <fog attach="fog" args={["#9bdcf5", 175, 280]} />
      <hemisphereLight args={["#effbff", "#35556b", 1.15]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[14, 38, 28]} intensity={2.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-75} shadow-camera-right={75} shadow-camera-top={35} shadow-camera-bottom={-26} />
      <pointLight position={[-7, 5, 0]} color="#ff782f" intensity={14} distance={20} />
      <pointLight position={[2, 5, 0]} color="#ff782f" intensity={14} distance={20} />
      <pointLight position={[11, 3, 0]} color="#ffc56a" intensity={11} distance={14} />
      <pointLight position={[24, 4, 0]} color="#79cfdf" intensity={10} distance={18} />
      <pointLight position={[-34, 12, 8]} color="#27aaff" intensity={7} distance={48} />
      <pointLight position={[54, 14, 8]} color="#55d8ff" intensity={8} distance={48} />
      <DigitalBackdrop />
      <group onClick={focusHandler("Full plant line", [10, 4, 0], 104)}><PlantHall /></group>
      <group onClick={focusHandler("Full process line", [10, 1, 0], 104)}><PlantFloor /></group>
      <group onClick={focusHandler("Rolling strip", [10, 1.1, 0], 64)}>
        <ThermalPlate data={data} />
        <StripHighlights data={data} />
        <StripMotion speed={speed} />
      </group>
      <group onClick={focusHandler("Entry coil", [-52, 3, 0], 17)}><Uncoiler x={-52} speed={speed} /></group>
      <group onClick={focusHandler("Entry looper", [-43, 3, 0], 22)}><Accumulator x={-43} label="ENTRY LOOPER" speed={speed} /></group>
      <group onClick={focusHandler("Entry welder / shear", [-34, 3, 0], 17)}><WelderShear x={-34.5} speed={speed} /></group>
      <group onClick={focusHandler("Entry bridles", [-25, 3, 0], 26)}>
        <BridleBank x={-25.5} labels={entryLabels} drives={entryLabels.map((_, index) => drive(entryDriveIds[Math.min(index, entryDriveIds.length - 1)]))} tensions={entryLabels.map((_, index) => bridleTension(index))} speed={speed} />
      </group>
      <group onClick={focusHandler("Cleaning section", [-16.5, 3, 0], 18)}><CleaningSection x={-16.5} speed={speed} /></group>
      <group onClick={focusHandler("PHF furnace zones 1–4", [-7, 3, 0], 26)}><Furnace x={-7} label="PHF FURNACE · ZONES 1–4" zones={zones.slice(0, 4)} burnersPerZone={burnersPerZone} faultHighlight={faultHighlight} /></group>
      <group onClick={focusHandler("PHF furnace zones 5–8", [2, 3, 0], 26)}><Furnace x={2} label="PHF FURNACE · ZONES 5–8" zones={zones.slice(4, 8)} burnersPerZone={burnersPerZone} faultHighlight={faultHighlight} /></group>
      <group onClick={focusHandler("Zinc pot", [11.5, 2, 0], 18)}><ZincPot x={11.5} data={zinc} speed={speed} faultHighlight={faultHighlight} /></group>
      <group onClick={focusHandler("Air knife", [17, 3, 0], 16)}><AirKnifeStation x={17} pressure={zinc?.air_knife_pressure_bar} /></group>
      <group onClick={focusHandler("Cooling tower", [24, 3, 0], 25)}><CoolingSection x={24} zones={cooling} speed={speed} faultHighlight={faultHighlight} /></group>
      <group onClick={focusHandler("Bridle 2", [35, 3, 0], 18)}><BridleBank x={35} labels={["B2-A", "B2-B"]} drives={[drive("D-B2"), drive("D-B2")]} tensions={[bridleTension(1), bridleTension(1)]} speed={speed} /></group>
      <group onClick={focusHandler("Bridle 3", [44, 3, 0], 18)}><BridleBank x={44} labels={["B3-A", "B3-B"]} drives={[drive("D-B3"), drive("D-B3")]} tensions={[bridleTension(2), bridleTension(2)]} speed={speed} /></group>
      <group onClick={focusHandler("Hot bridle", [53, 3, 0], 18)}><BridleBank x={53} labels={["HBR-A", "HBR-B"]} drives={[drive("D-B4A"), drive("D-B4B")]} tensions={[bridleTension(3), bridleTension(4)]} speed={speed} /></group>
      <group onClick={focusHandler("Bridle 4", [62, 3, 0], 18)}>
        <BridleBank x={62} labels={["B4-A", "B4-B"]} faultGroup="b4" faultHighlight={faultHighlight} drives={[drive("D-B4A"), drive("D-B4B")]} tensions={[bridleTension(3), bridleTension(4)]} speed={speed} />
      </group>
      <group onClick={focusHandler("Exit looper", [70, 3, 0], 22)}><Accumulator x={70.5} label="EXIT LOOPER" speed={speed} /></group>
      <group onClick={focusHandler("Recoiler", [78, 3, 0], 18)}><Recoiler x={78} speed={-speed} /></group>
      {telemetry.map((item, index) => (
        <LiveTelemetryTag key={item.label} position={[item.x, 1.35, 2.8]} label={item.label} value={item.value} detail={item.detail} lane={index % 2} orbit={orbit} />
      ))}
      <Billboard position={[10, 19.1, 1.5]}>
        <Text fontSize={0.42} color="#e9f2f4" anchorX="center" outlineWidth={0.035} outlineColor="#10191d">
          CGL LINE 6  ·  {Number(data.line_speed_mpm || 0).toFixed(1)} m/min  ·  {data.mode?.replaceAll("_", " ") || "LIVE SIMULATION"}
        </Text>
      </Billboard>
        <OrbitControls ref={orbit} target={[10, 4.0, 0]} enableDamping minDistance={9} maxDistance={150} minPolarAngle={0.58} maxPolarAngle={1.5} />
        <CameraFocusDriver orbit={orbit} focusTween={focusTween} />
      </Canvas>
      <div className="scada-status-ribbon" aria-label="Twin process status">
        <span className="scada-sim">SIMULATION</span>
        <span className="scada-ok">{speed > 0 ? "LINE RUNNING" : "LINE STOPPED"}</span>
        <span className="scada-ok">COATING MODEL ON</span>
        {(data.alarms || []).length > 0
          ? <span className="scada-alarm">ALARM · {data.alarms.length}</span>
          : <span className="scada-ok">SYSTEM NORMAL</span>}
      </div>
      <div className="focus-hint">{focusedSection ? `FOCUS · ${focusedSection}` : "CLICK AN EQUIPMENT SECTION TO ZOOM IN"}</div>
      <div className="temperature-legend" aria-label="Temperature colors from cool blue to hot red">
        <b>LIVE TEMPERATURE</b>
        <div className="temperature-gradient" />
        <div className="temperature-range"><span>COOL</span><span>HOT</span></div>
      </div>
      <div className="zoom-controls" aria-label="3D view controls">
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomBy(0.76)}>+</button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomBy(1.32)}>−</button>
        <button type="button" aria-label="Show the complete line" title="Show full line" onClick={resetView}>FULL LINE</button>
      </div>
    </div>
  );
}

export default IndustrialLine;
