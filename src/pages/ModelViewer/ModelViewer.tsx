import React, { useRef, useState, useEffect, CSSProperties  } from 'react';
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
import { createNetworkWeightTexture, createViewDependenceFunctions, } from './shaderFunctions';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import PropagateLoader from "react-spinners/PropagateLoader";
import { FpsView } from "react-fps";
import CloseIcon from '@mui/icons-material/Close';

const isMobile = false;

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

let renderer: any;
let renderTarget: any;
let renderTargetScene: any;

let camera: THREE.PerspectiveCamera;
let scene: any;

let viewerCamera: any;
let viewerScene: any;

let viewerControl: any;
let controls: PointerLockControls;
let dragControls: DragControls;
let raycaster: THREE.Raycaster = new THREE.Raycaster();

let prevTime = performance.now();
let deltaTime = 0;
let prevX = 0;
let prevY = 0;
let isJoyPresent: boolean = false;
let joyManager: any;
let fwdValue = 0;
let bkdValue = 0;
let rgtValue = 0;
let lftValue = 0;
let mvFwd = 0;
let mvBkd = 0;
let mvRgt = 0;
let mvLft = 0;
let mvUp = 0;
let mvDwn = 0;
let rotCW = 0;
let tempVector = new THREE.Vector3();
let upVector = new THREE.Vector3(0, 1, 0);

let moveMouse: THREE.Vector2 = new THREE.Vector2();

let mainLight: any;

const keyStates: Record<string, any> = {};

// let meshObj = new THREE.Group();
let roomObj = new THREE.Group<THREE.Object3DEventMap>();

let meshesList: THREE.Group[] = [];
let currentChosenIndex: number = -1;
let currentToggleIndex: number = -1;
let currentMoveObject: number = 0;

const meshesName: string[] = ['brolyusb_11_8', 'kaidousb_11_1', 'zoro_11_21'];
const meshesPosition: THREE.Vector3[] = [
  new THREE.Vector3(-2.8999999999999826, -0.1449648404121403, -5.979999999999918), // new THREE.Vector3(-6.719999999999901, -0.6849648404121408, -1.1200000000000019), 
  new THREE.Vector3(-1.540000000000001, -0.2943085014820102, -5.8599999999999195), // new THREE.Vector3(4.019999999999959, 0.0856914985179899, -2.119999999999999),
  new THREE.Vector3(0.18, -0.22000000000000003, -6.079999999999915)];

const meshesRotation: number[] = [
  135.0, 
  50.0, // 0.0,
  85.0];

let mouse = new THREE.Vector2()

export interface IModelProps {
}

function ModelViewer(props: IModelProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeBtnRef = useRef<HTMLDivElement>(null);
  const instructionRef = useRef<HTMLDivElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = React.useState(window.innerWidth);
  const [height, setHeight] = React.useState(window.innerHeight);
  const updateWidthAndHeight = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  };

  let [loading, setLoading] = useState(true);
  let openDialog: boolean = false

  var currentWidth = window.innerWidth;
  var currentHeight = window.innerHeight;
  const object_rescale = 0.7;

  function initialize() {
    scene = new THREE.Scene();

    // const cubemap = new CubeTextureLoader().load([
    //   "resources/cubemap/front.bmp",
    //   "resources/cubemap/back.bmp",
    //   "resources/cubemap/up.bmp",
    //   "resources/cubemap/down.bmp",
    //   "resources/cubemap/right.bmp",
    //   "resources/cubemap/left.bmp",
    // ]);
    const cubemap = new CubeTextureLoader().load([
      "resources/cubemap/px.png",
      "resources/cubemap/nx.png",
      "resources/cubemap/py.png",
      "resources/cubemap/ny.png",
      "resources/cubemap/pz.png",
      "resources/cubemap/nz.png",
    ]);
    scene.background = cubemap;

    camera = new THREE.PerspectiveCamera(39, currentWidth / currentHeight, 0.1, 1000);
    camera.position.y = 1;
    camera.position.z = 5;
    var reticle = new THREE.Mesh(
      new THREE.SphereGeometry(0.0005),
      new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.DoubleSide })
    );
    reticle.position.z = -0.1;
    reticle.lookAt(camera.position)
    camera.add(reticle);
    scene.add(camera)

    viewerCamera = new THREE.PerspectiveCamera(39, currentWidth / currentHeight, 0.1, 1000);
    viewerCamera.position.z = 5;
    viewerScene = new THREE.Scene();
    viewerControl = new OrbitControls(viewerCamera, canvasRef.current!);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!,
      powerPreference: "default",
      precision: "mediump",
      alpha: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(currentWidth, currentHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    // canvasRef.current!.appendChild(renderer.domElement);

    renderTarget = new THREE.WebGLRenderTarget(currentWidth, currentHeight);
    
    renderTargetScene = new THREE.WebGLRenderTarget(currentWidth, currentHeight);

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

    // dragControls = new DragControls([meshObj], camera, canvasRef.current!);
    // dragControls.deactivate();
    
    controls = new PointerLockControls( camera, document.body );

    controls.addEventListener('lock', function() {
      instructionRef.current!.style.display = 'none';
    });

    controls.addEventListener('unlock', function() {
      if(!openDialog) instructionRef.current!.style.display = 'flex';
    });

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
    // if(!isMobile) {
    //   if(!openDialog) {
    //     console.log("Start lock");
    //     controls.lock();
        
    //   }
    // }
    // else {
    // }
  }
  function mUpCanvas() {
    // dragControls.deactivate();
  }

  function closeDialog() {
    openDialog = false;
    viewerScene.remove(meshesList[currentChosenIndex]);
    meshesList[currentChosenIndex].position.set(meshesPosition[currentChosenIndex].x, meshesPosition[currentChosenIndex].y, meshesPosition[currentChosenIndex].z)
    scene.add(meshesList[currentChosenIndex]);
  }

  function startTouch(event: any) {
    prevX = event.touches[0].clientX;
    prevY = event.touches[0].clientY;
  }

  function moveTouch(event: any) {
    var x = event.touches[0].clientX;
    var y = event.touches[0].clientY;
    let moveScale = 0.01
    camera.rotation.order = 'YXZ';
    camera.rotation.y += -(x-prevX) * deltaTime * moveScale;
    camera.rotation.x += -(y-prevY) * deltaTime * moveScale;
    prevX = x;
    prevY = y;
  }

  if(!isMobile) {
    document.body.addEventListener( 'keydown', function( event ) {

      // console.log(event.code);
      if(!openDialog) {
        keyStates[ event.code ] = true;
    
        if(keyStates['KeyW']) fwdValue = 0.2;
        if(keyStates['KeyA']) lftValue = 0.2;
        if(keyStates['KeyS']) bkdValue = 0.2;
        if(keyStates['KeyD']) rgtValue = 0.2;
        if(keyStates['KeyI']) mvFwd = 0.01;
        if(keyStates['KeyJ']) mvLft = 0.01;
        if(keyStates['KeyK']) mvBkd = 0.01;
        if(keyStates['KeyL']) mvRgt = 0.01;
        if(keyStates['KeyU']) mvDwn = 0.01;
        if(keyStates['KeyO']) mvUp = 0.01;    
        
        if(keyStates['KeyP']) rotCW = 1;     
      }
      // else {
      //   closeDialog();
      //   // console.log(scene.children);
      // }
  
    } );
  
    document.body.addEventListener( 'keyup', function ( event ) {
      // console.log(event.code);
      // keyStates['KeyW'] = false;
      // keyStates['KeyA'] = false;
      // keyStates['KeyS'] = false;
      // keyStates['KeyD'] = false;
      keyStates[ event.code ] = false;
  
      bkdValue = 0;
      fwdValue = 0;
      lftValue = 0;
      rgtValue = 0;
  
      mvFwd = 0;
      mvLft = 0;
      mvBkd = 0;
      mvRgt = 0;
      mvUp = 0;
      mvDwn = 0;
  
      rotCW = 0;
  
    } );
  
    document.body.addEventListener('mousedown', function(e) {
      if(!openDialog && controls.isLocked && currentToggleIndex != -1) {
        controls.unlock();
        currentChosenIndex = currentToggleIndex;
        openDialog = true;
        // console.log("viewerscene" + viewerScene.children);
        while(viewerScene.children.length > 0) {
          viewerScene.remove(viewerScene.children[0]);
        }
  
        viewerCamera.position.set(0,0,5);
        viewerScene.background = renderTarget.texture;
        viewerScene.backgroundIntensity = 0.3;
        var selectedObject = scene.getObjectByName(meshesList[currentChosenIndex].name);
        scene.remove(selectedObject);
        meshesList[currentChosenIndex].position.set(0,0,0);
        viewerScene.add(meshesList[currentChosenIndex]);
        
        if(closeBtnRef.current) 
          closeBtnRef.current!.style.display = 'block';
        // raycaster.setFromCamera( new THREE.Vector2(((window.innerWidth / 2) / window.innerWidth) * 2 - 1, ((window.innerHeight / 2) / window.innerHeight) * 2 - 1), camera );
        // const intersects = raycaster.intersectObjects( meshesList );
        // console.log(intersects);
        // if(intersects.length > 0) {
        //   controls.unlock();
        //   console.log(intersects[0].object.parent?.parent?.name);
        //   currentChosenIndex = meshesName.indexOf(`${intersects[0].object.parent?.parent?.name}`)
        //   openDialog = true;
        //   console.log("viewerscene" + viewerScene.children);
        //   while(viewerScene.children.length > 0) {
        //     viewerScene.remove(viewerScene.children[0]);
        //   }
  
        //   viewerScene.background = renderTarget.texture;
        //   viewerScene.backgroundIntensity = 0.3;
        //   var selectedObject = scene.getObjectByName(meshesList[currentChosenIndex].name);
        //   scene.remove(selectedObject);
        //   meshesList[currentChosenIndex].position.set(0,0,0);
        //   viewerScene.add(meshesList[currentChosenIndex]);
        // }
      }
    })
  
  }
  else {
    // document.addEventListener('ontouchstart', function(event) {
    //   console.log("touched")
    // }, true);

    // document.body.addEventListener('ontouchmove', function (event) {
    //   camera.rotateY(90)
    // }, false);
    // document.addEventListener('ontouchend', function (event) {
    //   console.log("touch end");
    // }, false);
  }
  
  function onWindowResize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    viewerCamera.aspect = newWidth / newHeight;
    viewerCamera.updateProjectionMatrix();
    
    renderTarget.setSize(newWidth, newHeight);

    renderer.setSize(newWidth, newHeight);

    currentWidth = newWidth;
    currentHeight = newHeight;
  }

  function render() {
    
    const pointer = new THREE.Vector2(((window.innerWidth / 2) / window.innerWidth) * 2 - 1, ((window.innerHeight / 2) / window.innerHeight) * 2 - 1);
    raycaster.setFromCamera( pointer, camera );

    const intersects = raycaster.intersectObjects( meshesList );

    if ( intersects.length > 0 ) {
      let currentMeshName = `${intersects[0].object.parent?.parent?.name}`
      let newToggleIndex = meshesName.indexOf(currentMeshName);
      if(newToggleIndex != currentToggleIndex) {
        currentToggleIndex = newToggleIndex;
        const bbox = new THREE.BoxHelper(meshesList[currentToggleIndex]);
        bbox.name = currentMeshName;
        
      }
      
      const bbox = new THREE.BoxHelper(meshesList[currentToggleIndex]);
      bbox.rotateY(meshesRotation[currentToggleIndex]);
      bbox.name = currentMeshName;
      let indexOfBBox = scene.children.findIndex((e: any) => e.type == 'BoxHelper')
      while(indexOfBBox !== -1) {
        scene.remove(scene.children[indexOfBBox]);
        indexOfBBox = scene.children.findIndex((e: any) => e.type == 'BoxHelper')
      }
      scene.add(bbox);     
      // console.log(scene);
    } else {
      currentToggleIndex = -1;
      let indexOfBBox = scene.children.findIndex((e: any) => e.type == 'BoxHelper')
      while(indexOfBBox !== -1) {
        scene.remove(scene.children[indexOfBBox]);
        indexOfBBox = scene.children.findIndex((e: any) => e.type == 'BoxHelper')
      }
    } 

    // render scene into target
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
  }
  
  function renderViewer() {
    renderer.setRenderTarget(renderTarget);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(viewerScene, viewerCamera);
  }

  function updatePlayer() {
    let v = new THREE.Vector3(0,0,0);
    camera.getWorldDirection(v);
    const angle = Math.atan2(v.x, v.z);
    let needPrint = true;

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

    if(mvFwd > 0) {
      var selectedObject = scene.getObjectByName(meshesList[currentMoveObject].name);
      selectedObject.position.z -= mvFwd;
    }

    if(mvBkd > 0) {
      var selectedObject = scene.getObjectByName(meshesList[currentMoveObject].name);
      selectedObject.position.z += mvBkd;
    }

    if(mvRgt > 0) {
      var selectedObject = scene.getObjectByName(meshesList[currentMoveObject].name);
      selectedObject.position.x += mvRgt;
    }

    if(mvLft > 0) {
      var selectedObject = scene.getObjectByName(meshesList[currentMoveObject].name);
      selectedObject.position.x -= mvLft;
    }

    if(mvUp > 0) {
      var selectedObject = scene.getObjectByName(meshesList[currentMoveObject].name);
      selectedObject.position.y += mvUp;
    }

    if(mvDwn > 0) {
      var selectedObject = scene.getObjectByName(meshesList[currentMoveObject].name);
      selectedObject.position.y -= mvDwn;
    }

    if(rotCW > 0) {
      var selectedObject = scene.getObjectByName(meshesList[currentMoveObject].name);
      selectedObject.rotateY(rotCW * 0.01);
      keyStates['KeyP'] = false;
    }

    if(keyStates['KeyM']) {
      if(currentMoveObject + 1 > meshesList.length - 1) currentMoveObject = 0; else currentMoveObject++;
      keyStates['KeyM'] = false;
    }

    if((mvFwd > 0 || mvBkd > 0|| mvRgt > 0 || mvLft > 0 || mvUp > 0 || mvDwn > 0 || rotCW) && needPrint) console.log(scene.children)

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
    deltaTime = time - prevTime;
    prevTime = time;

    // update the picking ray with the camera and pointer position
    
    if(!openDialog) {
      updatePlayer();
      render();
    }
    else {
      viewerControl.update();
      renderViewer();
    }
    
    window.addEventListener('resize', onWindowResize);
  }

  const loadRoom = async () => {
    await new GLTFLoader().loadAsync('/resources/model/room5.glb')
      .then((glb) => {
        let room = glb.scene;

        let fbxRescale = 2;
        room.position.x = 0.0;
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

  async function loadObject(modelName: string, currentIndex: number) {
    let meshObj = new THREE.Group();
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
        
        
        meshObj.name = currentIndex.toString();
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
              meshRotateY: { value: meshesRotation[currentIndex] },
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
        const bbox = new THREE.Box3();
        bbox.setFromObject(meshObj);
        let center = new THREE.Vector3();
        bbox.getCenter(center);
        center.y = bbox.min.y;
        meshObj.userData.draggable = true;
        meshesList[currentIndex] = meshObj; 
        meshesList[currentIndex].name = modelName;
        meshesList[currentIndex].position.set(meshesPosition[currentIndex].x, meshesPosition[currentIndex].y, meshesPosition[currentIndex].z);
        // meshesList[currentIndex].rotateY(90);
        console.log("meshes list: " + meshesList);
        const indexOfMesh = scene.children.findIndex((e: THREE.Group) => e.name == modelName)
        if(indexOfMesh === -1) {
          scene.add(meshesList[currentIndex]);
        }
      })
      .then();
  }

  const init = async() => {
    await loadRoom();
    for(let i = 0; i < meshesName.length; i++) {
      await loadObject(meshesName[i], i);
      meshesList[i].updateMatrixWorld();
    }
    
    if(isMobile) {
      if(joystickRef.current!.children.length == 0) {
        addJoystick();
      }
    }
    
    closeBtnRef.current!.addEventListener('click', function() {
      closeDialog();
      openDialog = false;
      console.log(openDialog);
      controls.lock();
      closeBtnRef.current!.style.display = 'none';
    })

    if(!isMobile) {
      instructionRef.current!.addEventListener('click', function() {
        controls.lock();
      })
    } 

    
    closeBtnRef.current!.style.display = 'none';

  }

  function addJoystick() {
    const options = {
      zone: joystickRef.current!,
      size: 100,
      multitouch: true,
      maxNumberOfNipples: 1,
      mode: "static" as 'dynamic' | 'semi' | 'static',
      restJoystick: true,
      shape: "circle" as 'circle' | 'square',
      // position: { top: 20, left: 20 },
      position: { bottom: "15%", left: "10%",  },
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
    console.log("Starting...");
    initialize();
    animate();
    
    init().then(() => setLoading(false));

    window.addEventListener("resize", updateWidthAndHeight);
    return () => window.removeEventListener("resize", updateWidthAndHeight);
    
  }, [canvasRef, joystickRef, closeBtnRef]);

  return (
    <>
      <div style={{width: width, height: height}}>
        <canvas ref={canvasRef} onMouseDown={mDownCanvas} onMouseUp={mUpCanvas} onTouchMove={moveTouch} onTouchStart={startTouch} style={{position: 'absolute'}}/>
        <div style={{position: 'absolute', width: width - 50, height: 50, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
          <div ref={closeBtnRef} style={{display: 'none'}}>
            <CloseIcon sx={{color: 'white', fontSize: 40}}/>
          </div>
        </div>
        {!isMobile &&
          <div ref={instructionRef} style={{position: 'absolute', width: width, height: height}}>
            <Box sx={{position: 'inherit', width: width, height: height, backgroundColor: 'black', opacity: '60%'}} />
            <Box sx={{position: 'inherit', width: width, height: height, display: 'flex', justifyContent: 'center', alignItems: 'center'}}> 
              <Card sx={{p: 2}}>
                <CardContent>
                  <Typography variant='h3'>How to play</Typography>
                  <br />
                  <Typography>W-A-S-D to move</Typography>
                  <Typography>Move mouse to move camera</Typography>
                  <Typography variant='h4'>Click me to start!</Typography>
                </CardContent>
              </Card>
            </Box>
        </div>
        }
        
        {/* <FpsView /> */}
        {
          loading &&
          <Box sx={{position: 'absolute', width: width, height: height, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <Box sx={{position: 'absolute', width: width, height: height, backgroundColor: 'black', opacity: '60%'}} />
            <Box sx={{position: 'absolute', width: width, height: height, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
              <h1 style={{width: '500px', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>NeRF Viewer</h1>
              <PropagateLoader
                  style={{width: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}
                  color={"#99ccff"}
                  loading={loading}
                  cssOverride={override}
                  size={30}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
            </Box>
          </Box>
        }
      </div>
      <Box ref={joystickRef}> </Box>
      
      
    </>
    
  );
}

export default ModelViewer;
