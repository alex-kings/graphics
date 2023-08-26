/**
 * 3D scene rendered using a webGL context.
 */
class ClickableScene {
    canvas;
    gl;
    program;
    bufferObjects;

    // Attribute locations
    aPosition;
    aColour;
    aNormal;

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
        this.compileShader();
        this.gl.viewport(0,0,this.canvas.width, this.canvas.height);
    }

    /**
     * Compile the shader program
     */
    compileShader() {
        const vShader = gl.createShader(gl.VERTEX_SHADER);
        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        const vertSource = `
            attribute vec4 aPosition;
            attribute vec4 aColour;

            varying vec4 vColour;

            void main() {
                vColour = aColour;
                gl_Position = aPosition;
            }
        `;
        const fragSource = `
            precision mediump float;

            varying vec4 vColour;

            void main() {
                gl_FragColor = vColour;
            }
        `;
        this.gl.shaderSource(vShader, vertSource);
        this.gl.shaderSource(fShader, fragSource);
        this.gl.compileShader(vShader);
        this.gl.compileShader(fShader);
        this.program = this.gl.createProgram();
        this.gl.attachShader(program, vShader);
        this.gl.attachShader(program, fShader);
        this.gl.linkProgram(program);
    }

    // Add the given 3D object to the scene
    addObject(vertices, colours, normals, indices) {
        this.bufferObjects.push ({
            vertexBuffer : this.createBuffer(vertices, this.gl.ARRAY_BUFFER, Float32Array),
            colourBuffer : this.createBuffer(colours, this.gl.ARRAY_BUFFER, Float32Array),
            normalBuffer : this.createBuffer(normals, this.gl.ARRAY_BUFFER, Float32Array),
            indexBuffer : this.createBuffer(indices, this.gl.ELEMENT_ARRAY_BUFFER, Int16Array)
        });
    }

    // Set attribute locations in the GPU
    setAttribLocations() {
        this.aColour = this.gl.getAttribLocation(this.program, "aColour");
        this.aPosition = this.gl.getAttribLocation(this.program, "aPosition");
        this.aNormal = this.gl.getAttribLocation(this.program, "aNormal");
    }

    /**
     * Create a buffer and assign the given data to it.
     * @param {Array} data The data to fill the buffer with.
     * @param {Data Type} arrayBufferType Either "gl.ELEMENT_ARRAY_BUFFER" or "gl.ARRAY_BUFFER".
     * @param {Data Type} type The type of the buffer.
     */
    createBuffer(data, arrayBufferType, type) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(arrayBufferType, buffer);
        gl.bufferData(arrayBufferType, new type(data), gl.STATIC_DRAW);
        return buffer;
    }

    /**
     * Animate
     */
    animate() {
        
        // requestAnimationFrame(this.animate.bind(this));
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
    let colours = vertices.map(()=>(colour.flat()))

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
const cube1 = cube(0.5, [0.6,0.9,0.2,1]);
scene.addObject(cube1.vertices, cube1.colours, cube1.normals, cube1.indices);
scene.run();