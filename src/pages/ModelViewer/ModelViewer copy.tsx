import React, { useRef, useState, useEffect } from 'react';
import { useWindowSize } from "@uidotdev/usehooks";

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CubeTextureLoader } from 'three/src/loaders/CubeTextureLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import { vertexShader, fragmentShader } from './shaders';
import { useParams } from 'react-router-dom';
import nipplejs from 'nipplejs';
import { Box, Button } from '@mui/material';
import { createNetworkWeightTexture, createViewDependenceFunctions, } from './shaderFunctions';

let renderer: any;
let camera: any = null;
let scene: any;
let controls: PointerLockControls;
let dragControls: DragControls;
let raycaster: THREE.Raycaster = new THREE.Raycaster();

let prevTime = performance.now();
let isJoyPresent: boolean = false;
let joyManager: any;
let fwdValue = 0;
let bkdValue = 0;
let rgtValue = 0;
let lftValue = 0;
let tempVector = new THREE.Vector3();
let upVector = new THREE.Vector3(0, 1, 0);

let moveMouse: THREE.Vector2 = new THREE.Vector2();

let mainLight: any;

const keyStates: Record<string, any> = {};

let meshObj = new THREE.Group();
let roomObj = new THREE.Group<THREE.Object3DEventMap>();


export interface IModelProps {
}

function ModelViewer(props: IModelProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);

  const [openDialog, setOpenDialog] = useState(false);

  var currentWidth = window.innerWidth;
  var currentHeight = window.innerHeight;
  const object_rescale = 0.7;

  function initialize() {
    scene = new THREE.Scene();

    const cubemap = new CubeTextureLoader().load([
      "resources/cubemap/front.bmp",
      "resources/cubemap/back.bmp",
      "resources/cubemap/up.bmp",
      "resources/cubemap/down.bmp",
      "resources/cubemap/right.bmp",
      "resources/cubemap/left.bmp",
    ]);
    scene.background = cubemap;

    camera = new THREE.PerspectiveCamera(39, currentWidth / currentHeight, 0.1, 1000);
    camera.position.y = 1;
    camera.position.z = 5;


    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!,
      powerPreference: "default",
      precision: "mediump"
    });
    renderer.setPixelRatio(1);
    renderer.setSize(currentWidth, currentHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    // canvasRef.current!.appendChild(renderer.domElement);

    // controls = new OrbitControls(camera, renderer.domElement);
    // controls.maxDistance = 100;
    // controls.minDistance = 100;
    // //controls.maxPolarAngle = (Math.PI / 4) * 3;
    // controls.maxPolarAngle = Math.PI / 2;
    // controls.minPolarAngle = 0;
    // controls.autoRotate = false;
    // controls.autoRotateSpeed = 0;
    // controls.rotateSpeed = 0.4;
    // controls.enableDamping = false;
    // controls.dampingFactor = 0.1;
    // controls.enableZoom = false;
    // controls.enablePan = false;
    // controls.update();
    
    // controls.addEventListener( 'lock', function () {

    //   controls.lock();

    // } );
    // scene.add( controls.getObject() );

    dragControls = new DragControls([meshObj], camera, canvasRef.current!);
    dragControls.deactivate();
    
    controls = new PointerLockControls( camera, document.body );

    // controls.addEventListener('lock', function() {
    //   dragControls.deactivate();
    // });

    // controls.addEventListener('unlock', function() {
    //   dragControls.activate();
    // });

    var ambientLight = new THREE.AmbientLight( 0xffffff, 1 ); // Add an ambient light to better see the model
    
    var keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(30, 100%, 75%)'), 1.0);
    keyLight.position.set(-100, 50, 100);

    var fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240, 100%, 75%)'), 0.75);
    fillLight.position.set(100, 50, 100);

    var backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(100, 50, -100).normalize();

    mainLight = new THREE.DirectionalLight(0xffffff, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 1000;

    scene.add(ambientLight);
    scene.add(mainLight);
    scene.add(keyLight);
    scene.add(fillLight);
    scene.add(backLight);

    // Add axes
    var axes = new THREE.AxesHelper(50);
    // scene.add(axes);

    // Add grid
    const size = 500;
    const divisions = 50;

    const gridHelper = new THREE.GridHelper(size, divisions);
    // scene.add(gridHelper);
  }

  function mDownCanvas() {
    
    
    console.log("down");
    controls.lock();
    
    dragControls.activate();
  }
  function mUpCanvas() {
    console.log("up");    
    // dragControls.deactivate();
  }

  document.body.addEventListener( 'keydown', function( event ) {

    console.log(event.code);
    keyStates[ event.code ] = true;

    if(keyStates['KeyW']) fwdValue = 0.5;
    if(keyStates['KeyA']) lftValue = 0.5;
    if(keyStates['KeyS']) bkdValue = 0.5;
    if(keyStates['KeyD']) rgtValue = 0.5;
    
    if(keyStates['KeyF']) {
      setOpenDialog(true);
    }

  } );

  document.body.addEventListener( 'keyup', function ( event ) {
    console.log(event.code);
    keyStates[ event.code ] = false;

    bkdValue = 0;
    fwdValue = 0;
    lftValue = 0;
    rgtValue = 0;

  } );

  // document.body.addEventListener('mousedown', function(e) {
  //   // 
  //   // // calculate objects intersecting the picking ray
  //   // console.log(meshObj);
  //   // const intersects = raycaster.intersectObjects( [meshObj], true );
  //   // console.log(intersects);

  //   // if(intersects.length > 0) {
  //   //   console.log("masuk");
  //   //   controls.unlock();
  //   //   console.log(intersects[0].object.parent?.parent?.name);
  //   // } else {
  //   //   // controls.lock();
  //   // }
  //   raycaster.setFromCamera( new THREE.Vector2(((window.innerWidth / 2) / window.innerWidth) * 2 - 1, ((window.innerHeight / 2) / window.innerHeight) * 2 - 1), camera );
  //   const intersects = raycaster.intersectObjects( [meshObj], true );



  // })

  function onWindowResize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);

    currentWidth = newWidth;
    currentHeight = newHeight;
  }

  function render() {
    // render scene into target
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
  }

  function updatePlayer() {
    let v = new THREE.Vector3(0,0,0);
    camera.getWorldDirection(v);
    const angle = Math.atan2(v.x, v.z);
    // console.log(`the current azimuth angle is ${angle}`);

    // if(keyStates['KeyW']) {
    //   console.log("pressed")
    // }
    // else {
    //   console.log("lifted");
    // }

    if (fwdValue > 0) {
      tempVector.set(0, 0, fwdValue).applyAxisAngle(upVector, angle);
      camera.position.addScaledVector(tempVector, 0.2);
    }

    if (bkdValue > 0) {
      tempVector.set(0, 0, -bkdValue).applyAxisAngle(upVector, angle);
      camera.position.addScaledVector(tempVector, 0.2);
    }

    if (lftValue > 0) {
      tempVector.set(lftValue, 0, 0).applyAxisAngle(upVector, angle);
      camera.position.addScaledVector(tempVector, 0.2);
    }

    if (rgtValue > 0) {
      tempVector.set(-rgtValue, 0, 0).applyAxisAngle(upVector, angle);
      camera.position.addScaledVector(tempVector, 0.2);
    }

    camera.updateMatrixWorld();

    // controls.target.set(mesh.position.x, mesh.position.y, mesh.position.z);
    // reposition camera
    // camera.position.sub(controls.target);
    // controls.target.copy(mesh.position);
    // // console.log(mesh.position);
    // camera.position.add(mesh.position.sub(new THREE.Vector3(0, 0, 0)));
  }

  var animate = function() {
    requestAnimationFrame( animate );

    // controls.update();
    const time = performance.now();
    // console.log("==> " + camera.getWorldDirection());
    // console.log(controls.isLocked);
    prevTime = time;

    // update the picking ray with the camera and pointer position
    

    updatePlayer();
    
    window.addEventListener('resize', onWindowResize);
    render();
  }

  const loadRoom = async () => {
    await new GLTFLoader().loadAsync('/resources/model/room.glb')
      .then((glb) => {
        let room = glb.scene;

        let fbxRescale = 3;
        room.position.x = -6.0;
        room.position.y = -2.52;
        room.scale.x = fbxRescale;
        room.scale.y = fbxRescale;
        room.scale.z = fbxRescale;
        room.castShadow = true;
        room.receiveShadow = true;
        room.traverse(function (child: any) {
          if (child.type == "Mesh") {
            child.material.side = THREE.DoubleSide;
          }
        });
        roomObj.add(room);
      });
      
      scene.add(roomObj);
  }

  async function loadObject() {
    const modelName = "brolyusb_11_8";
    await fetch("resources/real_model/" + modelName + "_phone/mlp.json")
      .then((response) => {
        return response.json();
      })
      .then(async (json) => {
        let network_weights = json;
        // console.log(network_weights);
        let fragmentShaderSource = createViewDependenceFunctions(network_weights, fragmentShader);
        let weightsTexZero = createNetworkWeightTexture(
          network_weights["0_weights"]
        );
        let weightsTexOne = createNetworkWeightTexture(
          network_weights["1_weights"]
        );
        let weightsTexTwo = createNetworkWeightTexture(
          network_weights["2_weights"]
        );
        
        
        meshObj.name = "broly"
        for (let i = 0, il = json["obj_num"]; i < il; i++) {
          let tex0 = new THREE.TextureLoader().load(
            "resources/real_model/" + modelName + "_phone/shape" + i.toFixed(0) + ".png" + "feat0.png",
            function () {
              render();
            }
          );
          tex0.magFilter = THREE.NearestFilter;
          tex0.minFilter = THREE.NearestFilter;
          let tex1 = new THREE.TextureLoader().load(
            "resources/real_model/" + modelName + "_phone/shape" + i.toFixed(0) + ".png" + "feat1.png",
            function () {
              render();
            }
          );
          tex1.magFilter = THREE.NearestFilter;
          tex1.minFilter = THREE.NearestFilter;
          let newmat = new THREE.RawShaderMaterial({
            side: THREE.DoubleSide,
            vertexShader: vertexShader,
            fragmentShader: fragmentShaderSource,
            uniforms: {
              tDiffuse0: { value: tex0 },
              tDiffuse1: { value: tex1 },
              weightsZero: { value: weightsTexZero },
              weightsOne: { value: weightsTexOne },
              weightsTwo: { value: weightsTexTwo },
              lightPos: { value: mainLight.position },
              viewPos: { value: camera.position },
            },
            glslVersion: THREE.GLSL3,
          }); 
          await new OBJLoader().loadAsync(
            "resources/real_model/" + modelName + "_phone/shape" + i.toFixed(0) + ".obj")
            .then((object) => {
              object.traverse(function (child: any) {
                if (child.type == "Mesh") {
                  child.material = newmat;
                }
              });
              object.scale.x = object_rescale;
              object.scale.y = object_rescale;
              object.scale.z = object_rescale;
              object.castShadow = true;
              object.receiveShadow = true;
              object.name = i.toString();
              let meshIndex = meshObj.children.findIndex((e) => e.name === object.name);
              if(meshIndex === -1) 
                meshObj.add(object);
            });
        } 
        console.log(meshObj);
        const bbox = new THREE.Box3();
        bbox.setFromObject(meshObj);
        let center = new THREE.Vector3();
        bbox.getCenter(center);
        console.log(center);
        center.y = bbox.min.y;
        meshObj.position.y -= center.y + 0.25;
        meshObj.userData.draggable = true;
        scene.add(meshObj);
      });
  }

  const init = async() => {
    await loadRoom();
    await loadObject();
    // meshObj.position.y = 3.0
    meshObj.updateMatrixWorld();
    
    if(joystickRef.current!.children.length == 0) {
      addJoystick();
    }
    
  }

  function addJoystick() {
    const options = {
      zone: joystickRef.current!,
      size: 200,
      multitouch: true,
      maxNumberOfNipples: 1,
      mode: "static" as 'dynamic' | 'semi' | 'static',
      restJoystick: true,
      shape: "circle" as 'circle' | 'square',
      // position: { top: 20, left: 20 },
      position: { bottom: "10%", left: "10%",  },
      dynamicPage: true,
    };
  
    joyManager = nipplejs.create(options);
  
    joyManager["0"].on("move", function (evt: any, data: any) {
      const forward = data.vector.y;
      const turn = data.vector.x;
  
      if (forward > 0) {
        fwdValue = Math.abs(forward);
        bkdValue = 0;
      } else if (forward < 0) {
        fwdValue = 0;
        bkdValue = Math.abs(forward);
      }
  
      if (turn > 0) {
        lftValue = 0;
        rgtValue = Math.abs(turn);
      } else if (turn < 0) {
        lftValue = Math.abs(turn);
        rgtValue = 0;
      }
    });
  
    joyManager["0"].on("end", function (evt: any) {
      bkdValue = 0;
      fwdValue = 0;
      lftValue = 0;
      rgtValue = 0;
    });
  }

  useEffect(() => {
      
    initialize();
    animate();
    
    init();
    
  }, [canvasRef, joystickRef]);

  
  const handleClickOpen = () => {
    setOpenDialog(true);
  };

  const handleClose = (value: string) => {
    setOpenDialog(false);
  };

  return (
    <>
    
      <canvas ref={canvasRef} onMouseDown={mDownCanvas} onMouseUp={mUpCanvas} />
      <Box ref={joystickRef} sx={{backgroundColor: 'red', width: '100px', height: '100px', zIndex: 2}}> </Box>
      {/* {
        canvasRef.current &&
        <SimpleDialog
          modelName={"brolyusb_11_8"}
          open={openDialog}
          onClose={handleClose}
        />
      } */}
      
      
    </>
    
  );
}

export default ModelViewer;
