import type React from "react";
import { useRef, useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import type { Object3DModelType } from "./model";
import styles from "./view.module.scss";

interface Object3DViewProps {
  item: Object3DModelType;
}

const loader = new GLTFLoader();

const Object3DView: React.FC<Object3DViewProps> = observer(({ item }) => {
  const [modelRef, setModelRef] = useState<THREE.Group>(null);

  useEffect(() => {
    if (modelRef && item._value) {
      loader.load(item._value, (gltf) => {
        if (modelRef) {
          modelRef.clear(); // Clear existing model if any
          modelRef.add(gltf.scene);
        }
      });
    }
    return () => {
      if (modelRef) {
        modelRef.clear();
      }
    };
  }, [item._value, modelRef]);

  return (
    <div className={styles.container}>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <group ref={setModelRef} />
        <OrbitControls />
      </Canvas>
    </div>
  );
});

export default Object3DView;
