import "../lib/gl-matrix-min.js"
import { RenderTarget } from "./RenderTarget.js";

/**
 * 3D scene rendered using a webGL context.
 */
class ClickableScene {
    canvas;
    gl;
    program; // Program to render to canvas
    pickProgram; // Program for picking objects by hovering with mouse
    bufferObjects = [];
    projectionMatrix;
    pickingRenderTarget;

    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext("webgl");
    }

    // Initialise the scene and kick off animation
    run() {
        this.initialise();
        this.animate();
    }

    // Initialise the scene
    initialise() {
        // Create the render target
        this.pickingRenderTarget = new RenderTarget(this.gl, this.canvas.width, this.canvas.height);
        // Create programs
        this.program = this.compileShaders(
            `
            attribute vec4 aPosition;
            attribute vec4 aColour;
            attribute vec4 aNormal;

            uniform mat4 uProjectionMatrix;
            uniform mat4 uModelMatrix;

            varying vec4 vColour;

            vec3 lightDirection = normalize(vec3(0.5, 1.0, 1.0));

            void main() {
                float lighting = dot(lightDirection, (uModelMatrix * aNormal).xyz);
                vColour = 0.4*aColour + 0.6*vec4((aColour.xyz * lighting), 1.0);
                gl_Position = uProjectionMatrix * uModelMatrix * aPosition;
            }`
        ,
            `
            precision mediump float;

            varying vec4 vColour;

            void main() {
                gl_FragColor = vColour;
            }`
        );
        this.pickProgram = this.compileShaders(
            `
            attribute vec4 a_position;
 
            uniform mat4 uModelMatrix;
            uniform mat4 uProjectionMatrix;
           
            void main() {
              // Multiply the position by the matrix.
              gl_Position = uProjectionMatrix * uModelMatrix * a_position;
            }
            `,
            `
            precision mediump float;
 
            uniform vec4 uId;
           
            void main() {
               gl_FragColor = uId;
            }
            `
        );
        // Create projection matrix
        // View
        let viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, [0,0,3], [0,0,0], [0,1,0]);
        // Perspective
        let perspectiveMatrix = mat4.create();
        mat4.perspective(perspectiveMatrix, Math.PI/2, this.canvas.width / this.canvas.height, 0.01, 5);
        // Projection (perspective * view)
        this.projectionMatrix = mat4.create();
        mat4.mul(this.projectionMatrix, perspectiveMatrix, viewMatrix);
    }

    /**
     * Compile the given vert and frag shaders into a program
     */
    compileShaders(vertSource, fragSource) {
        const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        const fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(vShader, vertSource);
        this.gl.shaderSource(fShader, fragSource);
        this.gl.compileShader(vShader);
        this.gl.compileShader(fShader);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vShader);
        this.gl.attachShader(program, fShader);
        this.gl.linkProgram(program);
        return program;
    }

    // Add the given 3D object to the scene
    addObject(obj, xPos, yPos) {
        this.bufferObjects.push ({
            vertexBuffer : this.createBuffer(obj.vertices, this.gl.ARRAY_BUFFER, Float32Array),
            colourBuffer : this.createBuffer(obj.colours, this.gl.ARRAY_BUFFER, Float32Array),
            normalBuffer : this.createBuffer(obj.normals, this.gl.ARRAY_BUFFER, Float32Array),
            indexBuffer : this.createBuffer(obj.indices, this.gl.ELEMENT_ARRAY_BUFFER, Int16Array),
            number : obj.indices.length,
            xPos : xPos,
            yPos : yPos
        });
    }

    /**
     * Create a buffer and assign the given data to it.
     * @param {Array} data The data to fill the buffer with.
     * @param {Data Type} arrayBufferType Either "gl.ELEMENT_ARRAY_BUFFER" or "gl.ARRAY_BUFFER".
     * @param {Data Type} type The type of the buffer.
     */
    createBuffer(data, arrayBufferType, type) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(arrayBufferType, buffer);
        this.gl.bufferData(arrayBufferType, new type(data), this.gl.STATIC_DRAW);
        return buffer;
    }

    // Bind the given object's buffers
    bindObjBuffers(obj) {
        // Vertex buffer
        let aPosition = this.gl.getAttribLocation(this.program, "aPosition");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.vertexBuffer);
        this.gl.vertexAttribPointer(aPosition, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aPosition);
        // Colour buffer
        let aColour = this.gl.getAttribLocation(this.program, "aColour");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.colourBuffer);
        this.gl.vertexAttribPointer(aColour, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aColour);
        // Normal buffer
        let aNormal = this.gl.getAttribLocation(this.program, "aNormal");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.normalBuffer);
        this.gl.vertexAttribPointer(aNormal, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aNormal);
        // Index buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
    }

    // Draw all the objects with the given program
    drawObjects(program) {
        // time
        this.now = performance.now();
        this.gl.clearColor(0.1, 0.1, 0.1, 0.7);// CAREFUL THIS IS AN ISSUE
        this.gl.clearDepth(1.0);
        this.gl.viewport(0,0,this.canvas.width, this.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.gl.useProgram(program);

        // Bind the projection matrix
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(program, "uProjectionMatrix"), false, this.projectionMatrix);

        for(let bufferObject of this.bufferObjects){
            // Bind object buffers (vertices, normals, indices, colours)
            this.bindObjBuffers(bufferObject);

            // Model
            let theta = performance.now()/1000;
            let modelMatrix = mat4.create();
            mat4.fromTranslation(modelMatrix, [bufferObject.xPos, bufferObject.yPos,0]);
            mat4.rotate(modelMatrix, modelMatrix, theta, [1,2,3]);
            
            // Pass uniform matrices
            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(program, "uModelMatrix"), false, modelMatrix);
            this.gl.drawElements(this.gl.TRIANGLES, bufferObject.number, this.gl.UNSIGNED_SHORT, 0);
        }
    }

    /**
     * Animate
     */
    animate() {
        // Draw to render target using the pick program
        this.pickingRenderTarget.bind();
        this.drawObjects(this.pickProgram);

        // Now draw to canvas using the normal program
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.drawObjects(this.program);

        requestAnimationFrame(this.animate.bind(this));
    }
}

/**
 * Create a cube object.
 * Colour of the form [r,g,b,a];
 */
function cube(l, colour) {
    // Define and store geometry

    let vertices = [    // 4*6 = 24 vertices for the cuboid
        -l,-l,-l, 1, // Bottom face
         l,-l,-l, 1,
         l,-l, l, 1,
        -l,-l, l, 1,
        -l, l,-l, 1, // Top face
         l, l,-l, 1,
         l, l, l, 1,
        -l, l, l, 1,
        -l,-l,-l, 1, // backwards face
         l,-l,-l, 1,
         l, l,-l, 1,
        -l, l,-l, 1,
        -l,-l, l, 1, // forwards face
         l,-l, l, 1,
         l, l, l, 1,
        -l, l, l, 1,
         l,-l,-l, 1, // Right face
         l,-l, l, 1,
         l, l, l, 1,
         l, l,-l, 1,
        -l,-l,-l, 1, // Left face
        -l,-l, l, 1,
        -l, l, l, 1,
        -l, l,-l, 1
    ];

    // 12 triangles - 2 per face.
    let indices = [
         0, 1, 2, // Bottom
         0, 2, 3,
         4, 5, 6, // Top
         4, 6, 7,
         8, 9,10, // Backward
         8,10,11,
        12,13,14, // Forward
        12,14,15,
        16,17,18, // Right
        16,18,19,
        20,21,22, // Left
        20,22,23
    ];

    // Cyan
    let colours = [];
    for(let i = 0; i < vertices.length/4; i++) {
        colours.push(...colour);
    }

    // Normals
    let normals = [
         0,-1, 0, 0,
         0,-1, 0, 0,
         0,-1, 0, 0,
         0,-1, 0, 0,
         0, 1, 0, 0,
         0, 1, 0, 0,
         0, 1, 0, 0,
         0, 1, 0, 0,
         0, 0,-1, 0,
         0, 0,-1, 0,
         0, 0,-1, 0,
         0, 0,-1, 0,
         0, 0, 1, 0,
         0, 0, 1, 0,
         0, 0, 1, 0,
         0, 0, 1, 0,
         1, 0, 0, 0,
         1, 0, 0, 0,
         1, 0, 0, 0,
         1, 0, 0, 0,
        -1, 0, 0, 0,
        -1, 0, 0, 0,
        -1, 0, 0, 0,
        -1, 0, 0, 0
    ]

    return {
        vertices:vertices, 
        colours:colours, 
        indices:indices, 
        normals:normals 
    }
}

const scene = new ClickableScene("canvas");
const c = cube(0.3, [0.6,0.9,0.2,1]);
const separation = 1.5
for(let i = 0; i < 9; i++) {
    let x = separation*(i%3-1);
    let y = separation*(Math.floor(i/3) -1);
    scene.addObject(c, x, y);
}
scene.run();
