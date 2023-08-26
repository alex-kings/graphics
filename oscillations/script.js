import {RenderTarget} from "./RenderTarget.js";

/**
 * Gaussian blur
 */

/**
 * Create a buffer and assign the given data to it.
 * @param {Array} data The data to fill the buffer with.
 * @param {Data Type} BufferType Either "gl.ELEMENT_ARRAY_BUFFER" or "gl.ARRAY_BUFFER".
 * @param {Data Type} Type The type of the arraybuffer.
 * @returns The newly created buffer
 */
function createBuffer(data, BufferType, Type) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(BufferType, buffer);
    gl.bufferData(BufferType, new Type(data), gl.STATIC_DRAW);
    return buffer;
}

function bindBuffer(buffer, name, elementLength, program) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let aPosition = gl.getAttribLocation(program,name);
    gl.vertexAttribPointer(aPosition, elementLength, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);
}

// Create a program with the given fragment and vertex shaders.
function createProgram(v_source, f_source) {
    const v_shader = gl.createShader(gl.VERTEX_SHADER);
    const f_shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(v_shader, v_source);
    gl.shaderSource(f_shader, f_source);
    gl.compileShader(v_shader);
    gl.compileShader(f_shader);
    const program = gl.createProgram();
    gl.attachShader(program, v_shader);
    gl.attachShader(program, f_shader);
    gl.linkProgram(program);
    return program;
}

const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl")
        
// Create shaders
const v_shader_source = `
    attribute vec4 aPosition;
    attribute vec2 aTexCoord;

    varying vec2 vTexCoord;

    uniform int uInvert;

    void main() {
        gl_Position = aPosition;
        vTexCoord = aTexCoord;
        if(uInvert != 0) vTexCoord.y = 1.0-vTexCoord.y;
    }
`;
const f_shader_source = `
    precision mediump float;

    varying vec2 vTexCoord;

    uniform sampler2D uTexture;

    void main() {
        vec4 col = vec4(0.0);
        gl_FragColor = texture2D(uTexture, vTexCoord);
    }
`;
const program = createProgram(v_shader_source, f_shader_source)
gl.useProgram(program);

// Create a square using two triangles
const vertices = [
    -1,-1,0,1,
     1,-1,0,1,
    -1, 1,0,1,
     1, 1,0,1
]
const indices = [
    0,1,2,
    1,2,3
]
const texcoords = [
    0,1,
    1,1,
    0,0,
    1,0
]
// Create buffers and assign data to them
const v_buffer = createBuffer(vertices, gl.ARRAY_BUFFER, Float32Array);
const tex_buffer = createBuffer(texcoords, gl.ARRAY_BUFFER, Float32Array);
const i_buffer = createBuffer(indices, gl.ELEMENT_ARRAY_BUFFER, Uint16Array);

// Bind texture
const texture = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
// NPOT texture needs settings:
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// Fill with a single pixel so we can start rendering. This is standard approach in WebGL
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([127,127,255,255]));

// Bind buffers
bindBuffer(v_buffer, "aPosition", 4, program);
bindBuffer(tex_buffer, "aTexCoord", 2, program);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, i_buffer);

// Pass uniforms
gl.uniform1i(gl.getUniformLocation(program, "uTexture"),0);
gl.uniform1i(gl.getUniformLocation(program, "uInvert"),0);

// RenderTarget
let rt;



/**
 * Second fragment shader for post-effect
 */

const oscillations_f_shader_source = `
    precision mediump float;

    varying vec2 vTexCoord;

    uniform sampler2D uTexture;
    uniform vec2 uDeflection;

    void main() {
        vec4 col = 0.4*texture2D(uTexture, uDeflection+vTexCoord);


        gl_FragColor = 0.6*texture2D(uTexture, vTexCoord)+col;
    }

`

const program2 = createProgram(v_shader_source, oscillations_f_shader_source);


// Load the image to use as a texture
const img = new Image();
img.onload = () => {
    // Get img dimensions
    const w = img.width;
    const h = img.height;
    canvas.height = h;
    canvas.width = w;

    // Set the viewport to match the image
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Store texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    // Make a buffer to render the scene on
    rt = new RenderTarget(gl, canvas.width, canvas.height);

    // Render the scene on a texture
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    gl.useProgram(program2);

    // Tell that we are starting to render on canvas now
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.uniform1i(gl.getUniformLocation(program2, "uInvert"),1);
    gl.uniform1i(gl.getUniformLocation(program2, "uTexture"), 0);

    // Bind the texture we rendered on as the one used in the
    // shader program
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, rt.tex);

    animate();
}
img.src = "jo.jpg";

let r = 0.05;

// Post-effect animation.
function animate() {
    let t = (performance.now()/1000)%(2*Math.PI);

    let deflection = [r*Math.cos(t), r*Math.sin(t)];
    
    // Bind uniform
    gl.uniform2f(gl.getUniformLocation(program2,"uDeflection"),deflection[0], deflection[1]);

    // Bind the uniform that tells in which direction to go
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(animate);
}



