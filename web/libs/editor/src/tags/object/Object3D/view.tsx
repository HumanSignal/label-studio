import React, { type FC, useCallback, useEffect, useState, useMemo } from "react";
import { observer } from "mobx-react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Box } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import type { Object3DModelType } from "./model";
import { LabelOnRegion } from "./LabelOnRegion";
import styles from "./view.module.scss";

const loader = new GLTFLoader();

interface RegionBoxProps {
  region: Object3DModelType;
  onClick: (region: Object3DModelType) => void;
}

const RegionBox = observer(({ region, onClick }: RegionBoxProps) => {
  const { x, y, z, width, height, depth } = region;
  const isSelected = region === region.object.selectedRegion;

  const baseColor = useMemo(() => {
    const labels = region.labeledLabels;
    if (labels.length > 0) {
      // Use the background color of the first label
      return labels[0].background || "blue";
    }
    return "gray"; // Default color if no label
  }, [region.labeledLabels]);

  const color = useMemo(() => {
    if (isSelected) {
      // Create a lighter version of the base color for selection
      const baseColorHex = new THREE.Color(baseColor);
      return baseColorHex.lerp(new THREE.Color("white"), 0.3).getHexString();
    }
    return baseColor;
  }, [baseColor, isSelected]);

  const opacity = isSelected ? 0.7 : 0.5;

  return (
    <group>
      <Box
        position={[x, y, z]}
        args={[width, height, depth]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(region);
        }}
      >
        <meshStandardMaterial color={color} opacity={opacity} transparent />
      </Box>
      {isSelected && (
        <Box position={[x, y, z]} args={[width + 0.05, height + 0.05, depth + 0.05]}>
          <meshBasicMaterial color="white" opacity={0.2} transparent wireframe />
        </Box>
      )}
      <LabelOnRegion item={region} />
    </group>
  );
});

interface SceneProps {
  item: Object3DModelType;
}

const Scene = observer(({ item }: SceneProps) => {
  const { scene, camera } = useThree();
  const [modelRef, setModelRef] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (modelRef && item._value) {
      loader.load(item._value, (gltf) => {
        if (modelRef) {
          modelRef.clear();
          modelRef.add(gltf.scene);
        }
      });
    }
  }, [item._value, modelRef]);

  const handleModelClick = useCallback(
    (event: THREE.Event) => {
      event.stopPropagation();
      if (scene && camera) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1,
        );
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(scene, true);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          item.createRegion(point.x, point.y, point.z);
        }
      }
    },
    [item, scene, camera],
  );

  const handleRegionClick = useCallback(
    (region: Object3DModelType) => {
      item.selectRegion(region.id);
    },
    [item],
  );

  if (!scene || !camera) {
    return null; // or return a loading indicator
  }

  return (
    <>
      <group ref={setModelRef} onClick={handleModelClick} />
      {item.regions.map((region) => (
        <RegionBox key={region.id} region={region} onClick={handleRegionClick} />
      ))}
    </>
  );
});

interface Object3DViewProps {
  item: Object3DModelType;
}

const Object3DView: FC<Object3DViewProps> = observer(({ item }) => {
  return (
    <div className={styles.container}>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Scene item={item} />
        <OrbitControls />
      </Canvas>
    </div>
  );
});

export default Object3DView;
