import React, { useRef, useState, useEffect } from 'react';
// import logo from './logo.svg';
import './App.css';
import { useWindowSize } from "@uidotdev/usehooks";
// import Button from '@mui/material/Button';

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CubeTextureLoader } from 'three/src/loaders/CubeTextureLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import { resolve } from 'path';

 /**
   * Creates a data texture containing MLP weights.
   *
   * @param {!Object} network_weights
   * @return {!THREE.DataTexture}
   */
 function createNetworkWeightTexture(network_weights: any) {
  let width = network_weights.length;
  let height = network_weights[0].length;

  let weightsData = new Float32Array(width * height);
  for (let co = 0; co < height; co++) {
    for (let ci = 0; ci < width; ci++) {
      let index = co * width + ci;
      let weight = network_weights[ci][co];
      weightsData[index] = weight;
    }
  }
  let texture = new THREE.DataTexture(
    weightsData,
    width,
    height,
    THREE.RedFormat,
    THREE.FloatType
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}


const vertexShader =  `
  in vec3 position;
  in vec2 uv;

  out vec2 vUv;
  out vec3 vPosition;
  out vec3 rayDirection;
  out vec3 vNormal;
  out vec3 vViewDir;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat4 modelMatrix;
  uniform vec3 cameraPosition;

  void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      rayDirection = (modelMatrix * vec4( position, 1.0 )).rgb - cameraPosition;
  }`;

const fragmentShader =  `
  precision mediump float;

  out vec4 fragColor;

  uniform mediump sampler2D tDiffuse0;
  uniform mediump sampler2D tDiffuse1;

  uniform mediump sampler2D weightsZero;
  uniform mediump sampler2D weightsOne;
  uniform mediump sampler2D weightsTwo;

  in vec2 vUv;
  in vec3 vPosition;
  in vec3 rayDirection;

  mediump vec3 evaluateNetwork( mediump vec4 f0, mediump vec4 f1, mediump vec4 viewdir) {
    mediump float intermediate_one[NUM_CHANNELS_ONE] = float[](
      BIAS_LIST_ZERO
    );

    for (int j = 0; j < NUM_CHANNELS_ZERO; ++j) {
      mediump float input_value = 0.0;
      if (j < 4) {
      input_value =
          (j == 0) ? f0.r : (
          (j == 1) ? f0.g : (
          (j == 2) ? f0.b : f0.a));
      } else if (j < 8) {
      input_value =
          (j == 4) ? f1.r : (
          (j == 5) ? f1.g : (
          (j == 6) ? f1.b : f1.a));
      } else {
      input_value =
          (j == 8) ? viewdir.r : (
          (j == 9) ? -viewdir.b : viewdir.g); //switch y-z axes
      }
      for (int i = 0; i < NUM_CHANNELS_ONE; ++i) {
        intermediate_one[i] += input_value * texelFetch(weightsZero, ivec2(j, i), 0).x;
      }
    }
    intermediate_one[0] = max(intermediate_one[0], 0.0);
    intermediate_one[1] = max(intermediate_one[1], 0.0);
    intermediate_one[2] = max(intermediate_one[2], 0.0);
    intermediate_one[3] = max(intermediate_one[3], 0.0);

    mediump float intermediate_two[NUM_CHANNELS_TWO] = float[](
      BIAS_LIST_ONE
    );
    for (int j = 0; j < NUM_CHANNELS_ONE; ++j) {
        if (intermediate_one[j] <= 0.0) {
            continue;
        }
        for (int i = 0; i < NUM_CHANNELS_TWO; ++i) {
            intermediate_two[i] += intermediate_one[j] * texelFetch(weightsOne, ivec2(j, i), 0).x;
        }
    }
    intermediate_two[0] = max(intermediate_two[0], 0.0);
    intermediate_two[1] = max(intermediate_two[1], 0.0);
    intermediate_two[2] = max(intermediate_two[2], 0.0);
    intermediate_two[3] = max(intermediate_two[3], 0.0);
    
    mediump float result[NUM_CHANNELS_THREE] = float[](
        BIAS_LIST_TWO
    );
    for (int j = 0; j < NUM_CHANNELS_TWO; ++j) {
        if (intermediate_two[j] <= 0.0) {
            continue;
        }
        for (int i = 0; i < NUM_CHANNELS_THREE; ++i) {
            result[i] += intermediate_two[j] * texelFetch(weightsTwo, ivec2(j, i), 0).x;
        }
    }
    for (int i = 0; i < NUM_CHANNELS_THREE; ++i) {
        result[i] = 1.0 / (1.0 + exp(-result[i]));
    }
    return vec3(result[0]*viewdir.a+(1.0-viewdir.a),
                  result[1]*viewdir.a+(1.0-viewdir.a),
                  result[2]*viewdir.a+(1.0-viewdir.a));

  }

  void main() {

      // write color to G-Buffer
      // gColor1 = texture( tDiffuse0, vUv );
      // if (gColor1.r == 0.0) discard;
      // gColor0 = vec4( normalize(rayDirection), 1.0 );
      // gColor2 = texture( tDiffuse1, vUv );

      vec4 diffuse0 = texture( tDiffuse0, vUv );
      if(diffuse0.r == 0.0) discard;
      vec4 diffuse1 = texture( tDiffuse1, vUv );
      vec4 rayDir = vec4( normalize(rayDirection), 1.0 );

      diffuse0.a = diffuse0.a * 2.0 - 1.0;
      diffuse1.a = diffuse1.a * 2.0 - 1.0;

      fragColor.rgb = evaluateNetwork(diffuse0, diffuse1, rayDir);// vec4(1.0, 1.0, 0.0, 1.0);
      fragColor.a = 1.0;

  }`;


/**
   * Creates shader code for the view-dependence MLP.
   *
   * This populates the shader code in viewDependenceNetworkShaderFunctions with
   * network weights and sizes as compile-time constants. The result is returned
   * as a string.
   *
   * @param {!Object} scene_params
   * @return {string}
   */
function createViewDependenceFunctions(network_weights: any) {
  let width = network_weights["0_bias"].length;
  let biasListZero = "";
  for (let i = 0; i < width; i++) {
    let bias = network_weights["0_bias"][i];
    biasListZero += Number(bias).toFixed(7);
    if (i + 1 < width) {
      biasListZero += ", ";
    }
  }

  width = network_weights["1_bias"].length;
  let biasListOne = "";
  for (let i = 0; i < width; i++) {
    let bias = network_weights["1_bias"][i];
    biasListOne += Number(bias).toFixed(7);
    if (i + 1 < width) {
      biasListOne += ", ";
    }
  }

  width = network_weights["2_bias"].length;
  let biasListTwo = "";
  for (let i = 0; i < width; i++) {
    let bias = network_weights["2_bias"][i];
    biasListTwo += Number(bias).toFixed(7);
    if (i + 1 < width) {
      biasListTwo += ", ";
    }
  }

  let channelsZero = network_weights["0_weights"].length;
  let channelsOne = network_weights["0_bias"].length;
  let channelsTwo = network_weights["1_bias"].length;
  let channelsThree = network_weights["2_bias"].length;

  let fragmentShaderSource = fragmentShader.replace(
    new RegExp("NUM_CHANNELS_ZERO", "g"),
    channelsZero
  );
  fragmentShaderSource = fragmentShaderSource.replace(
    new RegExp("NUM_CHANNELS_ONE", "g"),
    channelsOne
  );
  fragmentShaderSource = fragmentShaderSource.replace(
    new RegExp("NUM_CHANNELS_TWO", "g"),
    channelsTwo
  );
  fragmentShaderSource = fragmentShaderSource.replace(
    new RegExp("NUM_CHANNELS_THREE", "g"),
    channelsThree
  );

  fragmentShaderSource = fragmentShaderSource.replace(
    new RegExp("BIAS_LIST_ZERO", "g"),
    biasListZero
  );
  fragmentShaderSource = fragmentShaderSource.replace(
    new RegExp("BIAS_LIST_ONE", "g"),
    biasListOne
  );
  fragmentShaderSource = fragmentShaderSource.replace(
    new RegExp("BIAS_LIST_TWO", "g"),
    biasListTwo
  );

  return fragmentShaderSource;
}

function App() {

  const mount = useRef();
  // const windowSize = useRef([
  //   window.innerWidth,
  //   window.innerHeight
  // ]);
  const obj_name = "kaidousb_11_1";

  useEffect(() => {
    console.log("Use effect call");
    var OBJFile = obj_name + "_phone/shape.obj";
    var PNGFile = obj_name + "_phone/shape.png";
    var JSONFile = obj_name + "_phone/mlp.json";
    
    var currentWidth = window.innerWidth;
    var currentHeight = window.innerHeight;
    var object_rescale = 0.7;

    if (WebGL.isWebGL2Available() === false) {
      document.body.appendChild(WebGL.getWebGL2ErrorMessage());
      return;
    }

    var scene = new THREE.Scene();

    const cubemap = new CubeTextureLoader().load([
      "resources/cubemap/front.bmp",
      "resources/cubemap/back.bmp",
      "resources/cubemap/up.bmp",
      "resources/cubemap/down.bmp",
      "resources/cubemap/right.bmp",
      "resources/cubemap/left.bmp",
    ]);
    scene.background = cubemap;

    var camera = new THREE.PerspectiveCamera(39, currentWidth / currentHeight, 0.1, 1000);
    camera.position.z = 5;

    var renderer = new THREE.WebGLRenderer({
      powerPreference: "default",
      precision: "mediump"
    });
    renderer.setPixelRatio(1);
    renderer.setSize(currentWidth, currentHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    const isCanvasPresent = document.body.querySelector('canvas');
    if(!isCanvasPresent) document.body.appendChild(renderer.domElement);

    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshPhongMaterial( { color: 0x00ff00, side: THREE.DoubleSide } );
    var cube = new THREE.Mesh( geometry, material);
    cube.castShadow = true;
    cube.position.set(0, 0, 0);
    // scene.add( cube );

    // Create a multi render target with Float buffers
    var renderTarget = new THREE.WebGLMultipleRenderTargets(
      currentWidth * 2,
      currentHeight * 2,
      3
    );

    for (let i = 0, il = renderTarget.texture.length; i < il; i++) {
      renderTarget.texture[i].minFilter = THREE.LinearFilter;
      renderTarget.texture[i].magFilter = THREE.LinearFilter;
      renderTarget.texture[i].type = THREE.FloatType;
      renderTarget.texture[i].format = THREE.RGBAFormat;
      // renderTarget.texture[i].generateMipmaps = false;
    }

    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1;
    // controls.maxDistance = 5;

    var ambientLight = new THREE.AmbientLight( 0xffffff, 1 ); // Add an ambient light to better see the model


    var mainLight = new THREE.DirectionalLight(0xffffff, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 512;
    mainLight.shadow.mapSize.height = 512;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    // directionalLight.position.set(100, 50, 100);

    
    var keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(30, 100%, 75%)'), 1.0);
    keyLight.position.set(-100, 50, 100);

    var fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240, 100%, 75%)'), 0.75);
    fillLight.position.set(100, 50, 100);

    var backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(100, 50, -100).normalize();

    var light = new THREE.DirectionalLight(0xffffff, 100);
    light.position.set(0,0,0);
    // scene.add(light);

    scene.add(ambientLight);
    scene.add(mainLight);
    scene.add(keyLight);
    scene.add(fillLight);
    scene.add(backLight);

    async function loadRoom() {
      await new Promise((resolve) => {
        new GLTFLoader().loadAsync('resources/model/room.glb')
          .then((glb) => {
            let room = glb.scene;

            let fbxRescale = 3;
            room.position.x = -6.0;
            room.position.y = -2.83;
            room.scale.x = fbxRescale;
            room.scale.y = fbxRescale;
            room.scale.z = fbxRescale;
            room.castShadow = true;
            room.receiveShadow = true;
            scene.add(room);
            setTimeout(resolve, 0);
          });
      });
    }

    async function loadObject() {
      await new Promise((resolve) => {
        fetch(obj_name + "_phone/mlp.json")
          .then((response) => {
            return response.json();
          })
          .then((json) => {
            let network_weights = json;
            // console.log(network_weights);
            let fragmentShaderSource = createViewDependenceFunctions(network_weights);
            let weightsTexZero = createNetworkWeightTexture(
              network_weights["0_weights"]
            );
            let weightsTexOne = createNetworkWeightTexture(
              network_weights["1_weights"]
            );
            let weightsTexTwo = createNetworkWeightTexture(
              network_weights["2_weights"]
            );

            for (let i = 0, il = json["obj_num"]; i < il; i++) {
              let tex0 = new THREE.TextureLoader().load(
                obj_name + "_phone/shape" + i.toFixed(0) + ".png" + "feat0.png",
                // function () {
                //   render();
                // }
              );
              tex0.magFilter = THREE.NearestFilter;
              tex0.minFilter = THREE.NearestFilter;
              let tex1 = new THREE.TextureLoader().load(
                obj_name + "_phone/shape" + i.toFixed(0) + ".png" + "feat1.png",
                // function () {
                //   render();
                // }
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
                },
                glslVersion: THREE.GLSL3,
              });
              new OBJLoader().load(
                obj_name + "_phone/shape" + i.toFixed(0) + ".obj",
                function (object) {
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
                  scene.add(object);
                }
              );   
            } 
            setTimeout(resolve, 0);
          });
      });
    }

    const init = async() => {
      await loadRoom();
      await loadObject();
      

    }

    init();
    window.addEventListener("resize", onWindowResize, false);
    var animate = function() {
      requestAnimationFrame( animate );

      controls.update();
      
      // window.addEventListener('resize', onWindowResize);
      render();
    }
    animate();
    

    

    function render() {
      // render scene into target
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);
    }

    function onWindowResize() {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
      renderTarget.setSize(newWidth, newHeight);

      currentWidth = newWidth;
      currentHeight = newHeight;

    }
  }, []);
  
  

  return (
    <>
    </>
    
  );
}

export default App;
