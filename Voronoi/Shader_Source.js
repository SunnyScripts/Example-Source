export let adjustedErrorHeader = `
precision highp float;

layout(location = 0) out vec4 currentAdjustedError;
layout(location = 1) out vec4 biasDeltaAvg;
layout(location = 2) out vec4 previousDesiredNeuronValue;

uniform sampler2D currentNeuronsTexture;
uniform sampler2D currentNeuronsDesiredTexture;
uniform sampler2D accumulatedBiasDeltaTexture;

uniform float deltaIterationCount;
uniform float currentNeuronsTextureWidth;
uniform float currentNeuronsRealCount;
`;
export let adjustedErrorMain = `
void main()
{
    float currentNeuronIndex = gl_FragCoord.x +.5 + (gl_FragCoord.y-.5) * currentNeuronsTextureWidth;
    if(currentNeuronIndex > currentNeuronsRealCount)
        discard;
        
    float currentNeuron = decodeFloat(texture2D(currentNeuronsTexture, gl_FragCoord.xy));
    float currentNeuronDesired = decodeFloat(texture2D(currentNeuronsDesiredTexture, gl_FragCoord.xy));
    
    float leakyReluPrime = .01;
    if(currentNeuron != .01)
        leakyReluPrime = 1.;
        
    float adjustedErrorFloat = leakyReluPrime * (currentNeuron - currentNeuronDesired);
    float currentBiasDelta = decodeFloat(texture2D(accumulatedBiasDeltaTexture, gl_FragCoord.xy));
    
    biasDeltaAvg = encodeFloat((adjustedErrorFloat + currentBiasDelta) / deltaIterationCount);
    currentAdjustedError = encodeFloat(adjustedErrorFloat);
    
    float startIndex = (outputIndex * inputCount) - (inputCount - 1.);
    float sum = 0.;

    for(float i = 0.; i < 4096.; i++)
    {
        if(i >= inputCount)
            break;

        sum += decodeFloat(texture2D(currentWeightsTexture, convertIndexToNormalizedUV(startIndex + i, currentWeightsTextureWidth)));
    }
    
    float currentWeightDelta = decodeFloat(texture2D(currentWeightDeltaTexture, gl_FragCoord.xy));
    previousDesiredNeuronValue = encodeFloat((sum + currentWeightDelta) / deltaIterationCount);
}`;

export let weightAdjustmentHeader = `

precision highp float;
uniform sampler2D inputNeurons;
uniform sampler2D weights;

uniform float outputWidth;
uniform float previousNeuronWidth;
uniform float weightsCount;
uniform float previousNeuronCount;
uniform float weightWidth;
`;
export let weightAdjustmentMain = `
void main()
{
    float weightIndex = gl_FragCoord.x +.5 + (gl_FragCoord.y-.5)* weightWidth;
    if(weightIndex > weightsCount)
        discard;

    float inputIndex = mod(weightIndex, previousNeuronCount);
    if(inputIndex == 0.)
        inputIndex = previousNeuronCount;

    vec2 inputUV = convertIndexToNormalizedUV(inputIndex, previousNeuronWidth);

    float inputValue = decodeFloat(texture2D(inputNeurons, inputUV));
    float weightValue = decodeFloat(texture2D(weights, gl_FragCoord.xy / weightWidth));

    gl_FragColor = encodeFloat(inputValue * weightValue);
}`;

export let sumHeader = `
precision highp float;

uniform sampler2D adjustedWeights;
uniform sampler2D biases;

uniform float inputCount;
uniform float adjustedWeightsWidth;
uniform float outputCount;
uniform float outputWidth;
`;
export let sumMain = `
void main()
{
    float outputIndex = gl_FragCoord.x +.5 + (gl_FragCoord.y-.5) * outputWidth;
    if(outputIndex > outputCount)
        discard;

    float startIndex = (outputIndex * inputCount) - (inputCount - 1.);
    float sum = 0.;

    for(float i = 0.; i < 4096.; i++)
    {
        if(i >= inputCount)
            break;

        sum += decodeFloat(texture2D(adjustedWeights, convertIndexToNormalizedUV(startIndex + i, adjustedWeightsWidth)));
    }
    //Bias
    sum += decodeFloat(texture2D(biases, gl_FragCoord.xy / outputWidth));
    //Leaky Relu
    sum = max(sum, .01);

    gl_FragColor = encodeFloat(sum);
}`;

export let basicVertexShader = `    

attribute vec2 vertexPosition;

void main()
{
    gl_Position = vec4(vertexPosition, 0., 1.);
}`;

export let commonUtilities = `

float shift_right (float v, float amt)
{
    v = floor(v) + 0.5;
    return floor(v / exp2(amt));
}
float shift_left (float v, float amt)
{
    return floor(v * exp2(amt) + 0.5);
}
float mask_last (float v, float bits)
{
    return mod(v, shift_left(1.0, bits));
}
float extract_bits (float num, float from, float to)
{
    from = floor(from + 0.5); to = floor(to + 0.5);
    return mask_last(shift_right(num, from), to - from);
}
vec4 encodeFloat (float val)
{
    //#Adrian Seeley, https://stackoverflow.com/questions/17981163/webgl-read-pixels-from-floating-point-render-target
    if (val == 0.0) return vec4(0, 0, 0, 0);
    float sign = val > 0.0 ? 0.0 : 1.0;
    val = abs(val);
    float exponent = floor(log2(val));
    float biased_exponent = exponent + 127.0;
    float fraction = ((val / exp2(exponent)) - 1.0) * 8388608.0;
    float t = biased_exponent / 2.0;
    float last_bit_of_biased_exponent = fract(t) * 2.0;
    float remaining_bits_of_biased_exponent = floor(t);
    float byte4 = extract_bits(fraction, 0.0, 8.0) / 255.0;
    float byte3 = extract_bits(fraction, 8.0, 16.0) / 255.0;
    float byte2 = (last_bit_of_biased_exponent * 128.0 + extract_bits(fraction, 16.0, 23.0)) / 255.0;
    float byte1 = (sign * 128.0 + remaining_bits_of_biased_exponent) / 255.0;
    return vec4(byte4, byte3, byte2, byte1);
}
float decodeFloat(vec4 rgba)
{
    rgba = rgba.abgr*255.;
    float Sign = 1.0 - step(128.0,rgba[0])*2.0;
    float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;
    float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);
    float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
    return Result;
}

vec2 truncate(vec2 value, float decimalPlaces)
{
    float divisor = pow(10., decimalPlaces);
    return floor(value*divisor) / divisor;
}

vec2 convertIndexToNormalizedUV(float index, float targetWidth)
{
    index /= targetWidth;
    float inputWidthPercent = fract(index);
    if(inputWidthPercent == 0.)
        inputWidthPercent = 1.;

    return vec2(inputWidthPercent * targetWidth  - .5, ceil(index) - .5) / targetWidth;
}`;

export let voronoiMain = `precision lowp int;
precision highp float;

uniform vec2 resolution;
uniform float time;

float noise3D(vec3 p)
{
//smootherstep
//x*x*x*(x*(x*6.-15.)+10.)
    return fract(sin(dot(p ,vec3(12.9898,78.233,128.852))) * 43758.5453)*2.0-1.0;
}
float simplex3D(vec3 p)
{
//http://webstaff.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
float f3 = 1.0/3.0;
float s = (p.x+p.y+p.z)*f3;
int i = int(floor(p.x+s));
int j = int(floor(p.y+s));
int k = int(floor(p.z+s));

float g3 = 1.0/6.0;
float t = float((i+j+k))*g3;
float x0 = float(i)-t;
float y0 = float(j)-t;
float z0 = float(k)-t;
x0 = p.x-x0;
y0 = p.y-y0;
z0 = p.z-z0;

int i1,j1,k1;
int i2,j2,k2;

if(x0>=y0)
{
 if(y0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // X Y Z order
 else if(x0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // X Z Y order
 else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }  // Z X Z order
}
else
{
 if(y0<z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // Z Y X order
 else if(x0<z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // Y Z X order
 else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // Y X Z order
}

float x1 = x0 - float(i1) + g3;
float y1 = y0 - float(j1) + g3;
float z1 = z0 - float(k1) + g3;
float x2 = x0 - float(i2) + 2.0*g3;
float y2 = y0 - float(j2) + 2.0*g3;
float z2 = z0 - float(k2) + 2.0*g3;
float x3 = x0 - 1.0 + 3.0*g3;
float y3 = y0 - 1.0 + 3.0*g3;
float z3 = z0 - 1.0 + 3.0*g3;

vec3 ijk0 = vec3(i,j,k);
vec3 ijk1 = vec3(i+i1,j+j1,k+k1);
vec3 ijk2 = vec3(i+i2,j+j2,k+k2);
vec3 ijk3 = vec3(i+1,j+1,k+1);

vec3 gr0 = normalize(vec3(noise3D(ijk0),noise3D(ijk0*2.01),noise3D(ijk0*2.02)));
vec3 gr1 = normalize(vec3(noise3D(ijk1),noise3D(ijk1*2.01),noise3D(ijk1*2.02)));
vec3 gr2 = normalize(vec3(noise3D(ijk2),noise3D(ijk2*2.01),noise3D(ijk2*2.02)));
vec3 gr3 = normalize(vec3(noise3D(ijk3),noise3D(ijk3*2.01),noise3D(ijk3*2.02)));

float n0 = 0.0;
float n1 = 0.0;
float n2 = 0.0;
float n3 = 0.0;

float t0 = 0.5 - x0*x0 - y0*y0 - z0*z0;
if(t0>=0.0)
{
 t0*=t0;
 n0 = t0 * t0 * dot(gr0, vec3(x0, y0, z0));
}
float t1 = 0.5 - x1*x1 - y1*y1 - z1*z1;
if(t1>=0.0)
{
 t1*=t1;
 n1 = t1 * t1 * dot(gr1, vec3(x1, y1, z1));
}
float t2 = 0.5 - x2*x2 - y2*y2 - z2*z2;
if(t2>=0.0)
{
 t2 *= t2;
 n2 = t2 * t2 * dot(gr2, vec3(x2, y2, z2));
}
float t3 = 0.5 - x3*x3 - y3*y3 - z3*z3;
if(t3>=0.0)
{
 t3 *= t3;
 n3 = t3 * t3 * dot(gr3, vec3(x3, y3, z3));
}
return 96.0*(n0+n1+n2+n3);

}
vec4 circle(vec2 circleCenter, vec2 uv, float radius)
{
    float clampedDistance = clamp((length(circleCenter - uv) - radius)*256., 0., 1.);
    return vec4(0., .5, 1., 1. - clampedDistance);
}
void main()
{
    vec2 uv = gl_FragCoord.xy/resolution.xy;
    float screenRatio = resolution.x / resolution.y;
    uv.x *= screenRatio;
    uv.x += -time*.05 + simplex3D(vec3(0.,0.,(time+3.)*.02));
    uv.y +=  -time*.05 + simplex3D(vec3(0.,0.,(time+50.)*.03));

    vec2 localUV = uv * 8.;
    vec2 id = floor(localUV);
    localUV = fract(localUV);

    vec4 circleShape;
    vec2 circleCenter = vec2(0);

    float minimumDistance = 1.;
    vec2 closestPointID = id;

    for(int column = -1; column < 2; column++)
    {
       for(int row = -1; row < 2; row++)
        {
            vec2 idOffset = vec2(row, column);

            circleCenter.x = (simplex3D(vec3(id + idOffset, time *.35))+1.)*.5;
            circleCenter.y = (simplex3D(vec3(id + idOffset, time *.57 + 50.))+1.)*.5;
            float uvDistance = length(localUV-(circleCenter + idOffset));

            if(uvDistance < minimumDistance)
            {
                minimumDistance = uvDistance;
                closestPointID = id + idOffset;
            }
        }
    }
    vec3 color = vec3((simplex3D(vec3(closestPointID, time*.35+12.))+1.)*.15+.35, (simplex3D(vec3(closestPointID, time*.15+22.))+1.)*.25+.2, .5);

    //color *= (1.-minimumDistance*.15)+.5;


    //Smoother Step
    color *= 1.0-minimumDistance*minimumDistance*minimumDistance*(minimumDistance*(minimumDistance*6.-15.)+10.);
    color *= 1.5;
    gl_FragColor = vec4(color,  1.);
}`;

export let terrainVertex = `
        precision highp float;
        attribute vec2 vertexPosition;

        uniform mat4 projection;
        uniform mat4 view;
        uniform mat4 model;

        uniform float iTime;
        uniform vec3 lightPos;
        uniform vec2 playerPosition;

        varying float lightIntensity;
        varying vec2 uv;
        varying float slope;

        const vec2 one = vec2(1);
        const vec3 up = vec3(0., 1., 0.);

        float noise3D(vec3 p)
        {
            return fract(sin(dot(p ,vec3(12.9898,78.233,128.852))) * 43758.5453)*2.0-1.0;
        }
        float simplex3D(vec3 p)
        {
            //http://webstaff.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
            float f3 = 1.0/3.0;
            float s = (p.x+p.y+p.z)*f3;
            int i = int(floor(p.x+s));
            int j = int(floor(p.y+s));
            int k = int(floor(p.z+s));

            float g3 = 1.0/6.0;
            float t = float((i+j+k))*g3;
            float x0 = float(i)-t;
            float y0 = float(j)-t;
            float z0 = float(k)-t;
            x0 = p.x-x0;
            y0 = p.y-y0;
            z0 = p.z-z0;

            int i1,j1,k1;
            int i2,j2,k2;

            if(x0>=y0)
            {
                if(y0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // X Y Z order
                else if(x0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // X Z Y order
                else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }  // Z X Z order
            }
            else
            {
                if(y0<z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // Z Y X order
                else if(x0<z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // Y Z X order
                else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // Y X Z order
            }

            float x1 = x0 - float(i1) + g3;
            float y1 = y0 - float(j1) + g3;
            float z1 = z0 - float(k1) + g3;
            float x2 = x0 - float(i2) + 2.0*g3;
            float y2 = y0 - float(j2) + 2.0*g3;
            float z2 = z0 - float(k2) + 2.0*g3;
            float x3 = x0 - 1.0 + 3.0*g3;
            float y3 = y0 - 1.0 + 3.0*g3;
            float z3 = z0 - 1.0 + 3.0*g3;

            vec3 ijk0 = vec3(i,j,k);
            vec3 ijk1 = vec3(i+i1,j+j1,k+k1);
            vec3 ijk2 = vec3(i+i2,j+j2,k+k2);
            vec3 ijk3 = vec3(i+1,j+1,k+1);

            vec3 gr0 = normalize(vec3(noise3D(ijk0),noise3D(ijk0*2.01),noise3D(ijk0*2.02)));
            vec3 gr1 = normalize(vec3(noise3D(ijk1),noise3D(ijk1*2.01),noise3D(ijk1*2.02)));
            vec3 gr2 = normalize(vec3(noise3D(ijk2),noise3D(ijk2*2.01),noise3D(ijk2*2.02)));
            vec3 gr3 = normalize(vec3(noise3D(ijk3),noise3D(ijk3*2.01),noise3D(ijk3*2.02)));

            float n0 = 0.0;
            float n1 = 0.0;
            float n2 = 0.0;
            float n3 = 0.0;

            float t0 = 0.5 - x0*x0 - y0*y0 - z0*z0;
            if(t0>=0.0)
            {
                t0*=t0;
                n0 = t0 * t0 * dot(gr0, vec3(x0, y0, z0));
            }
            float t1 = 0.5 - x1*x1 - y1*y1 - z1*z1;
            if(t1>=0.0)
            {
                t1*=t1;
                n1 = t1 * t1 * dot(gr1, vec3(x1, y1, z1));
            }
            float t2 = 0.5 - x2*x2 - y2*y2 - z2*z2;
            if(t2>=0.0)
            {
                t2 *= t2;
                n2 = t2 * t2 * dot(gr2, vec3(x2, y2, z2));
            }
            float t3 = 0.5 - x3*x3 - y3*y3 - z3*z3;
            if(t3>=0.0)
            {
                t3 *= t3;
                n3 = t3 * t3 * dot(gr3, vec3(x3, y3, z3));
            }
            return (96.0*(n0+n1+n2+n3)+1.)*.5;
        }
        float ridges(float smoothNoise)
        {
//            float smoothBottom = clamp((*pow(smoothNoise, 3.)) / (1.+.05*pow(smoothNoise, 2.)), 0., 1.);

            return pow(smoothNoise, 2.);
        }

        float octaveNoise(vec2 neighborXY)
        {
            float amplitude = 1.;
            const float amplitudePersistance = .25;
            float totalAmplitude = 0.;
            float frequency = .005;

            float zHeight = 0.;
            //const int octaveCount = 5;

            //TODO: for loop causing issues on certain platforms
            zHeight += ridges(simplex3D(vec3((neighborXY.x)*frequency, (neighborXY.y-iTime)*frequency, 6.))) * amplitude;
            totalAmplitude += amplitude;
            amplitude *= amplitudePersistance;
            frequency *= 2.;

            zHeight += ridges(simplex3D(vec3((neighborXY.x)*frequency, (neighborXY.y-iTime)*frequency, 6.))) * amplitude;
            totalAmplitude += amplitude;
            amplitude *= amplitudePersistance;
            frequency *= 2.;

            zHeight += ridges(simplex3D(vec3((neighborXY.x)*frequency, (neighborXY.y-iTime)*frequency, 6.))) * amplitude;
            totalAmplitude += amplitude;
            amplitude *= amplitudePersistance;
            frequency *= 2.;

            zHeight += ridges(simplex3D(vec3((neighborXY.x)*frequency, (neighborXY.y-iTime)*frequency, 6.))) * amplitude;
            totalAmplitude += amplitude;
            amplitude *= amplitudePersistance;
            frequency *= 2.;

            zHeight += ridges(simplex3D(vec3((neighborXY.x)*frequency, (neighborXY.y-iTime)*frequency, 6.))) * amplitude;
            totalAmplitude += amplitude;
            amplitude *= amplitudePersistance;
            frequency *= 2.;

            //normalize
            return (zHeight / totalAmplitude) * 100.;
        }

        void main()
        {
            vec3 thisPosition = vec3(vertexPosition, octaveNoise(vertexPosition));
            vec2 neighborOffset = vertexPosition + one;
            vec3 sideV = vec3(neighborOffset.x, thisPosition.y, octaveNoise(vec2(neighborOffset.x, thisPosition.y))) - thisPosition;
            vec3 sideW = vec3(thisPosition.x, neighborOffset.y, octaveNoise(vec2(thisPosition.x, neighborOffset.y))) - thisPosition;

            vec3 lightDirection = normalize(lightPos - thisPosition);
            vec3 normalVector = normalize(cross(sideV, sideW));

            gl_Position = projection * view * model * vec4(thisPosition, 1.);

            slope = pow(clamp(dot(normalVector, up)+.45, 0., 1.), 4.);

            uv = vertexPosition * .03125;
            uv.x -= playerPosition.x *.03125;
            uv.y -= iTime*.03125;
            lightIntensity = max(dot(lightDirection, normalVector), 0.);
        }`;

export let terrainFrag = `precision lowp float;
        uniform sampler2D rockTexture;

        varying float lightIntensity;
        varying vec2 uv;
        varying float slope;

        const vec3 ambientColor = vec3(.7, .5, 0.2);
        const vec3 white = vec3(1);

        void main()
        {
//            float blue = (sin(iTime*.5) +1.) *.5;
//            ambientColor.b = blue;
            gl_FragColor = vec4(lightIntensity * mix(white, texture2D(rockTexture, uv).rgb, slope), 1.);
        }`;