import React from 'react';
// import React, {
//   Component,
//   forwardRef,
//   useMemo,
//   useRef,
//   useState
// } from 'react';
import { observer } from 'mobx-react';
// import * as THREE from 'three';
// import { Color } from 'three';
// import { Canvas } from '@react-three/fiber';
// import { Center, Environment, Gltf, MapControls, OrbitControls, PivotControls, RandomizedLight, View } from '@react-three/drei';
// import { AccumulativeShadows, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
// import { Button, Menu } from '@mantine/core';
// import * as ICONS from '@tabler/icons';
// import useRefs from 'react-use-refs';
// import create from 'zustand';


// const matrix = new THREE.Matrix4();
// const positions = { Top: [0, 10, 0], Bottom: [0, -10, 0], Left: [-10, 0, 0], Right: [10, 0, 0], Back: [0, 0, -10], Front: [0, 0, 10] };
// const useStore = create((set) => ({
//   projection: 'Perspective',
//   top: 'Back',
//   middle: 'Top',
//   bottom: 'Right',
//   setPanelView: (which, view) => set({ [which]: view }),
//   setProjection: (projection) => set({ projection }),
// }));

const Object3DView = () => {
  return ( 
    <iframe src="http://localhost:3000/" height="700px" width="100%"></iframe>
  );
  //   // stored position of canvas before creating region

  //   const [view1, view2, view3, view4] = useRefs();
    
  //   return (
  //     <div className="container">
  //       <Canvas shadows frameloop="demand" className="canvas">
  //         <View index={1} track={view1}>
  //           <CameraSwitcher />
  //           <PivotControls scale={0.4} depthTest={false} matrix={matrix} />
  //           <Scene background="grey" matrix={matrix}>
  //             <AccumulativeShadows temporal frames={100} position={[0, -0.4, 0]} scale={14} alphaTest={0.85} color="grey" colorBlend={0.5}>
  //               <RandomizedLight amount={8} radius={8} ambient={0.5} position={[5, 5, -10]} bias={0.001} />
  //             </AccumulativeShadows>
  //           </Scene>
  //           <OrbitControls makeDefault />
  //         </View>
  //         <View index={2} track={view2}>
  //           <PanelCamera which="top" />
  //           <PivotControls activeAxes={[true, true, false]} depthTest={false} matrix={matrix} />
  //           <Scene background="grey" matrix={matrix} />
  //           <MapControls makeDefault screenSpacePanning enableRotate={false} />
  //         </View>
  //         <View index={3} track={view3}>
  //           <PanelCamera which="middle" />
  //           <PivotControls activeAxes={[true, false, true]} depthTest={false} matrix={matrix} />
  //           <Scene background="grey" matrix={matrix} />
  //           <MapControls makeDefault screenSpacePanning enableRotate={false} />
  //         </View>
  //         <View index={4} track={view4}>
  //           <PanelCamera which="bottom" />
  //           <PivotControls activeAxes={[false, true, true]} depthTest={false} matrix={matrix} />
  //           <Scene background="grey" matrix={matrix} />
  //           <MapControls makeDefault screenSpacePanning enableRotate={false} />
  //         </View>
  //       </Canvas>
  //       {/** Tracking div's, regular HTML and made responsive with CSS media-queries ... */}
  //       <MainPanel ref={view1} />
  //       <SidePanel ref={view2} which="top" />
  //       <SidePanel ref={view3} which="middle" />
  //       <SidePanel ref={view4} which="bottom" />
  //     </div>
  //   );
  // };

  // function CameraSwitcher() {
  //   const projection = useStore((state) => state.projection);

  //   // Would need to remember the old coordinates to be more useful ...
  //   return projection === 'Perspective' ? (
  //     <PerspectiveCamera makeDefault position={[4, 4, 4]} fov={25} />
  //   ) : (
  //     <OrthographicCamera makeDefault position={[4, 4, 4]} zoom={280} />
  //   );
  // }

  // function PanelCamera({ which }) {
  //   const view = useStore((state) => state[which]);

  //   return <OrthographicCamera makeDefault position={positions[view]} zoom={100} />;
  // }

  // const MainPanel = forwardRef((props, fref) => {
  //   const projection = useStore((state) => state.projection);
  //   const setProjection = useStore((state) => state.setProjection);

  //   return (
  //     <div ref={fref} className="panel" style={{ gridArea: 'main' }}>
  //       <Menu shadow="md" width={200}>
  //         <Menu.Target>
  //           <Button>{projection}</Button>
  //         </Menu.Target>
  //         <Menu.Dropdown onClick={(e) => setProjection(e.target.innerText)}>
  //           <Menu.Item icon={<ICONS.IconPerspective size={14} />}>Perspective</Menu.Item>
  //           <Menu.Item icon={<ICONS.IconPerspectiveOff size={14} />}>Orthographic</Menu.Item>
  //         </Menu.Dropdown>
  //       </Menu>
  //     </div>
  //   );
  // });

  // const SidePanel = forwardRef(({ which }, fref) => {
  //   const value = useStore((state) => state[which]);
  //   const setPanelView = useStore((state) => state.setPanelView);

  //   return (
  //     <div ref={fref} className="panel" style={{ gridArea: which }}>
  //       <Menu shadow="md" width={200}>
  //         <Menu.Target>
  //           <Button>{value}</Button>
  //         </Menu.Target>
  //         <Menu.Dropdown onClick={(e) => setPanelView(which, e.target.innerText)}>
  //           <Menu.Item icon={<ICONS.IconArrowBigTop size={14} />}>Top</Menu.Item>
  //           <Menu.Item icon={<ICONS.IconArrowBigDown size={14} />}>Bottom</Menu.Item>
  //           <Menu.Item icon={<ICONS.IconArrowBigLeft size={14} />}>Left</Menu.Item>
  //           <Menu.Item icon={<ICONS.IconArrowBigRight size={14} />}>Right</Menu.Item>
  //           <Menu.Item icon={<ICONS.IconHomeUp size={14} />}>Front</Menu.Item>
  //           <Menu.Item icon={<ICONS.IconHomeDown size={14} />}>Back</Menu.Item>
  //         </Menu.Dropdown>
  //       </Menu>
  //     </div>
  //   );
  // });


  // function Scene({ background = 'white', children, ...props }) {
  //   return (
  //     <>
  //       <color attach="background" args={[background]} />
  //       <ambientLight />
  //       <directionalLight position={[10, 10, -15]} castShadow shadow-bias={-0.0001} shadow-mapSize={1024} />
  //       {/* <Environment preset="city" /> */}
  //       <group
  //         matrixAutoUpdate={false}
  //         onUpdate={(self) => (self.matrix = matrix)}
  //         {...props}>
  //         <Center>
  //           <Box/> 

  //           {/* <Gltf castShadow wireframereceiveShadow src="/static/samples/Perseverance-transformed.glb" /> */}
  //         </Center>
  //         {children}
  //       </group>
  //     </>
  //   );
  // }

  // function Box({ text, ...props }) {
  //   const ref = useRef();
  //   const black = useMemo(() => new Color('black'), []);
  //   const lime = useMemo(() => new Color('lime'), []);
  //   const [hovered, setHovered] = useState(false);
  //   const transform = useRef();

  //   return (
  //     <>
  //       <mesh
  //         onPointerOver={() => setHovered(true)}
  //         onPointerOut={() => setHovered(false)}
  //         {...props}
  //         ref={ref}
  //       >
  //         <boxGeometry />
  //         <meshPhongMaterial color="orange" opacity={0.8} transparent />
  //         {props.children}
  //       </mesh>
  //       <mesh
  //         {...props}
  //         ref={ref}
  //         onPointerOver={() => setHovered(true)}
  //         onPointerOut={() => setHovered(false)}
  //       >
  //         <boxGeometry />
  //         <meshPhongMaterial color="black" wireframe wireframeLinewidth={10} />
  //         {props.children}
  //       </mesh>
  //     </>
  //     // </TransformControls>
  //   );
};

export default observer(Object3DView);
