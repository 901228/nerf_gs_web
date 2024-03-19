import * as THREE from 'three';

/**
   * Creates a data texture containing MLP weights.
   *
   * @param {!Object} network_weights
   * @return {!THREE.DataTexture}
   */
export function createNetworkWeightTexture(network_weights) {
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
export function createViewDependenceFunctions(network_weights, fragmentShader) {
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