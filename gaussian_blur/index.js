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

const canvas = document.createElement("canvas");
const gl = canvas.getContext("webgl", {preserveDrawingBuffer:true})


// Create shaders
const v_shader = gl.createShader(gl.VERTEX_SHADER);
const f_shader = gl.createShader(gl.FRAGMENT_SHADER);
const v_shader_source = `
    attribute vec4 aPosition;
    attribute vec2 aTexCoord;

    varying vec2 vTexCoord;

    uniform int uInvert;

    void main() {
        gl_Position = aPosition;
        vTexCoord = aTexCoord;
        // if(uInvert != 0) vTexCoord.y = 1.0-vTexCoord.y;
    }
`;
const f_shader_source = `
    precision mediump float;

    #define MAX_RADIUS 50

    varying vec2 vTexCoord;
    uniform sampler2D uTexture;

    uniform int uPixels;
    uniform float uCoeffs[MAX_RADIUS*2+1];
    uniform vec2 uDirection;
    uniform vec2 uInvTexSize;

    void main() {
        vec4 col = vec4(0.0);
        for(int i = 0; i <= MAX_RADIUS*2+1; i++) {
            if(i>2*uPixels) continue;
            vec2 tc = vTexCoord + uDirection*uInvTexSize*float(i-uPixels);
            col += uCoeffs[i]*texture2D(uTexture,tc);
        }
        gl_FragColor = vec4(col.rgb, 1.0);
        // gl_FragColor = col;
        // gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        // for (int i = 0; i <= MAX_RADIUS*2+1; ++i) {
            // float t = vTexCoord.y * float(uPixels*2+1) - float(i);
            // if (t >= 0.0 && t < 1.0) gl_FragColor.rgb += uCoeffs[i];
        // }
    }
`;
gl.shaderSource(v_shader, v_shader_source);
gl.shaderSource(f_shader, f_shader_source);
gl.compileShader(v_shader);
gl.compileShader(f_shader);

// Create shader program
const program = gl.createProgram();
// Pass uniforms
gl.attachShader(program, v_shader);
gl.attachShader(program, f_shader);
gl.linkProgram(program);


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
// Vertex position
const v_buffer = createBuffer(vertices, gl.ARRAY_BUFFER, Float32Array);
// Texture coordinates
const tex_buffer = createBuffer(texcoords, gl.ARRAY_BUFFER, Float32Array);
// Indices
const i_buffer = createBuffer(indices, gl.ELEMENT_ARRAY_BUFFER, Uint16Array);

// Bind buffers
gl.bindBuffer(gl.ARRAY_BUFFER, v_buffer);
let aPosition = gl.getAttribLocation(program,"aPosition");
gl.vertexAttribPointer(aPosition, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);
let aTexCoord = gl.getAttribLocation(program,"aTexCoord");
gl.bindBuffer(gl.ARRAY_BUFFER, tex_buffer);
gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aTexCoord);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, i_buffer);

// Blur and return the image.
async function blurImage(imgSrc, radius) {
    const sigma = radius/4;
    const img = new Image();
    img.src = imgSrc;

    await new Promise((resolve,reject)=>{
        img.onload=resolve;
        img.onerror=reject;
    })

    // Get img dimensions
    canvas.height = img.height;
    canvas.width = img.width;
    // Set the viewport to match the image
    gl.viewport(0,0,img.width,img.height);
    
    // Bind texture
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    // NPOT texture needs settings:
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Use program before binding uniforms.
    gl.useProgram(program);

    // Pass uniforms
    gl.uniform1i(gl.getUniformLocation(program, "uPixels"), radius);
    const dirLoc = gl.getUniformLocation(program, "uDirection");
    gl.uniform2f(dirLoc, 1,0);
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);
    const invertLoc = gl.getUniformLocation(program, "uInvert");
    gl.uniform1i(invertLoc, 0);
    gl.uniform2f(gl.getUniformLocation(program, 'uInvTexSize'), 1/canvas.width, 1/canvas.height);

    // Calculate gaussian coefficients
    const gaussianCoeff = [];
    for(let i = -radius; i <= radius; i++) {
        gaussianCoeff.push((1/(sigma*Math.sqrt(2*Math.PI))) * Math.exp(-0.5*i*i/(sigma*sigma)));
    }
    // Pass gaussian coeffs as a uniform
    gl.uniform1fv(gl.getUniformLocation(program, "uCoeffs"), gaussianCoeff);

    // Make a buffer to render the scene on
    const rt = new RenderTarget(gl, canvas.width, canvas.height);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    
    // Tell that we are starting to render on canvas now
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // Second framebuffer to render the scene on
    const rt2 = new RenderTarget(gl, canvas.width, canvas.height);
    
    // Bind the texture we rendered on as the one used in the
    // shader program
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, rt.tex);
    
    // Blur in the other direction
    gl.uniform2f(dirLoc, 0,1);
    gl.uniform1i(invertLoc, 1);
    
    // Bind the uniform that tells in which direction to go
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    let pixels = new Uint8ClampedArray(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
    gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels)

    const id = new ImageData(pixels, canvas.width);
    console.log(id);

    const resCanv = document.createElement("canvas");
    resCanv.width = canvas.width;
    resCanv.height = canvas.height;
    resCanv.style.width = "15rem";
    const ctx = resCanv.getContext("2d");
    ctx.putImageData(id,0,0);

    return resCanv;
}

const container = document.getElementById("result-container");
const pics = [
    "pictures/pic1.jpg",
    "pictures/pic2.jpg",
    "pictures/pic3.jpg",
    "pictures/pic4.jpg",
    "pictures/pic5.jpg",
    "pictures/pic6.png",
    "pictures/pic7.jpg",
    "pictures/pic8.jpg",
    "pictures/pic9.jpg",
    "pictures/pic10.jpg"
]

document.getElementById("btn").onclick = async () => {
    let count = pics.length;
    const start = performance.now();
    // Time
    for(let i = 0; i < count; i++) {
        const res = await blurImage(pics[i], 40);
        container.appendChild(res);
    }
    const end = performance.now();
    console.log(end-start);
}