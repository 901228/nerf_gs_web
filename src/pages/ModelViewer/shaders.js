export const vertexShader =  `
  in vec3 position;
  in vec2 uv;
  in vec3 normal;

  out vec2 vUv;
  out vec3 vPosition;
  out vec3 rayDirection;
  out vec3 vNormal;
  out vec3 FragPos;
  out vec3 vViewDir;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat4 modelMatrix;
  uniform vec3 cameraPosition;

  uniform float meshRotateY;

  mat4 calculateRotMat(float angleInDegrees) {
    float angleInRadians = radians(angleInDegrees);
    return mat4(
      vec4(cos(angleInRadians), 0.0, sin(angleInRadians), 0.0),
      vec4(0.0, 1.0, 0.0, 0.0),
      vec4(-sin(angleInRadians), 0.0, cos(angleInRadians), 0.0),
      vec4(0.0, 0.0, 0.0, 1.0)
    );
  }

  void main() {
      vUv = uv;
      // float angleInDegrees = -90.0; // Replace with your desired angle in degrees
      mat4 rotMat = calculateRotMat(-meshRotateY);
      mat4 rotMatCam = calculateRotMat(meshRotateY);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * rotMat * vec4( position, 1.0 );
      vec3 objectPos = (modelMatrix * vec4( position, 1.0 )).rgb;
      mat4 transMat = mat4(
        vec4(1.0, 0.0, 0.0, objectPos.x - position.x),
        vec4(0.0, 1.0, 0.0, objectPos.y - position.y),
        vec4(0.0, 0.0, 1.0, objectPos.z - position.z),
        vec4(0.0, 0.0, 0.0, 1.0)
      );
      mat4 transMat2 = mat4(
        vec4(1.0, 0.0, 0.0, -(objectPos.x - position.x)),
        vec4(0.0, 1.0, 0.0, -(objectPos.y - position.y)),
        vec4(0.0, 0.0, 1.0, -(objectPos.z - position.z)),
        vec4(0.0, 0.0, 0.0, 1.0)
      );
      rayDirection = (modelMatrix * vec4( position, 1.0 )).rgb - cameraPosition;
      rayDirection = (transMat2 * rotMatCam * transMat * vec4(rayDirection, 1.0)).xyz;
      FragPos = vec3(modelMatrix * vec4( position, 1.0 ));
      vNormal = mat3(transpose(inverse(modelMatrix))) * normal; //normal;
  }`;

export const fragmentShader =  `
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
  in vec3 FragPos;
  in vec3 vNormal;

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
    // intermediate_one[0] = max(intermediate_one[0], 0.0);
    // intermediate_one[1] = max(intermediate_one[1], 0.0);
    // intermediate_one[2] = max(intermediate_one[2], 0.0);
    // intermediate_one[3] = max(intermediate_one[3], 0.0);

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
    // intermediate_two[0] = max(intermediate_two[0], 0.0);
    // intermediate_two[1] = max(intermediate_two[1], 0.0);
    // intermediate_two[2] = max(intermediate_two[2], 0.0);
    // intermediate_two[3] = max(intermediate_two[3], 0.0);
    
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
    
    return vec3(result[0] * viewdir.a + (1.0 - viewdir.a),
                result[1] * viewdir.a + (1.0 - viewdir.a),
                result[2] * viewdir.a + (1.0 - viewdir.a));

  }

  void main() {

    // write color to G-Buffer

    vec4 diffuse0 = texture( tDiffuse0, vUv );
    if(diffuse0.r == 0.0) discard;
    vec4 diffuse1 = texture( tDiffuse1, vUv );
    vec4 rayDir = vec4( normalize(rayDirection), 1.0 );

    diffuse0.a = diffuse0.a * 2.0 - 1.0;
    diffuse1.a = diffuse1.a * 2.0 - 1.0;

    vec3 objectColor = evaluateNetwork(diffuse0, diffuse1, rayDir);

    fragColor.rgb = objectColor;// vec4(1.0, 1.0, 0.0, 1.0);
    fragColor.a = 1.0;
    

  }`;