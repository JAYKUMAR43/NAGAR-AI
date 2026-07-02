"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function Building({ position, height, color }: { position: [number, number, number]; height: number; color: string }) {
  return (
    <mesh position={[position[0], height / 2, position[2]]}>
      <boxGeometry args={[0.8, height, 0.8]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

function City() {
  const groupRef = useRef<THREE.Group>(null);

  // Generate buildings procedurally
  const buildings = useMemo(() => {
    const temp = [];
    const colors = ["#0ea5e9", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7"];
    
    // Circular coordinate grid
    for (let x = -8; x <= 8; x += 1.6) {
      for (let z = -8; z <= 8; z += 1.6) {
        const distance = Math.sqrt(x * x + z * z);
        // Circular boundaries for organic city core look
        if (distance < 7.5 && distance > 1.2) {
          // Height decreases as we go outwards from the city center
          const height = Math.max(1, (8 - distance) * 1.6 + Math.random() * 1.8);
          const color = colors[Math.floor(Math.random() * colors.length)];
          temp.push({
            id: `${x}-${z}`,
            position: [x, 0, z] as [number, number, number],
            height,
            color
          });
        }
      }
    }
    return temp;
  }, []);

  // Rotate city core slowly
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {buildings.map((b) => (
        <Building key={b.id} position={b.position} height={b.height} color={b.color} />
      ))}
      {/* City floor telemetry grid */}
      <gridHelper args={[20, 20, "#14b8a6", "#1e293b"]} position={[0, 0.01, 0]} />
    </group>
  );
}

// Particle flow simulation representing smart city network telemetry
function DataParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions, sizes] = useMemo(() => {
    const count = 250;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 6.5;
      const theta = Math.random() * Math.PI * 2;
      const y = Math.random() * 5;
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);
      sz[i] = Math.random() * 0.12 + 0.04;
    }
    return [pos, sz];
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = -state.clock.getElapsedTime() * 0.06;
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        // Subtle floating motion
        positions[i * 3 + 1] += Math.sin(state.clock.getElapsedTime() * 0.8 + i) * 0.0015;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#06b6d4"
        size={0.14}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function CityScene() {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [11, 7, 11], fov: 42 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#030712"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[8, 18, 8]} intensity={1.0} />
        <pointLight position={[-8, 6, -8]} intensity={0.6} color="#c084fc" />
        <pointLight position={[0, 7, 0]} intensity={0.7} color="#22d3ee" />
        <City />
        <DataParticles />
        <Stars radius={90} depth={40} count={1200} factor={3.5} saturation={0} fade speed={1.2} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 - 0.06} // Constrain camera above floor
          minPolarAngle={Math.PI / 5}
        />
      </Canvas>
    </div>
  );
}
