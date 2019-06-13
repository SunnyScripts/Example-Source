export function setupContext(currentLayer, context, program, outputTexture, floats, textures)
{
    context.useProgram(program);

    if(outputTexture)
        context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, outputTexture, 0);

    for(let i = 0; i < floats.length; i++)
    {
        context.uniform1f(context.getUniformLocation(program, floats[i].name), floats[i].value);
    }

    for(let i = 0; i < textures.length; i++)
    {
        bindTextureUniform(textures[i].name, textures[i].value, i, program, context);
    }
}

export function logFramebufferTexture(context, textureWidth, actionName, layerNumber)
{
    let tempArray = new Uint8Array(textureWidth * textureWidth *4);
    context.readPixels(0, 0, textureWidth, textureWidth, context.RGBA, context.UNSIGNED_BYTE, tempArray);
    console.log(actionName, "output of layer", layerNumber, new Float32Array(tempArray.buffer));
}

export function compileShader(context, type, source)
{
    const shader = context.createShader(type);
    context.shaderSource(shader, source);

    context.compileShader(shader);

    if(!context.getShaderParameter(shader, context.COMPILE_STATUS))
    {
        console.error('One of the shaders failed to compile :(\n' + context.getShaderInfoLog(shader));
        context.deleteShader(shader);
        return null;
    }
    return shader;
}

export function createProgram(context, vertexShader, fragmentShader)
{
    const program = context.createProgram();

    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);

    context.linkProgram(program);

    if(!context.getProgramParameter(program, context.LINK_STATUS))
    {
        console.error('Shader program can\'t initialize :(\n' + context.getProgramInfoLog(program));
        context.deleteProgram(program);
        return null
    }
    return program;
}

export function initBasicVertexBuffer (context, vertexAttributeLocation)
{
    const vertexBuffer = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer);

    const positions =[
        -1,  -1,//1
        1,  -1,//2
        -1,   1,//3
        1,   1,//4
    ];

    context.bufferData(context.ARRAY_BUFFER, new Float32Array(positions), context.STATIC_DRAW);
    context.vertexAttribPointer(vertexAttributeLocation, 2, context.FLOAT, false, 0,0);
    context.enableVertexAttribArray(vertexAttributeLocation);

    return { size: positions.length };
}

export function bindTextureUniform(uniformName, texture, textureUnit, program, context)
{
    context.uniform1i(context.getUniformLocation(program, uniformName), textureUnit);
    context.activeTexture(context.TEXTURE0 + textureUnit);
    context.bindTexture(context.TEXTURE_2D, texture);
}