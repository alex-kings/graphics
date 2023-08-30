/**
 * 3D scene rendered using a webGL context.
 */
class ClickableScene {
    canvas;
    gl;
    program;
    bufferObjects = [];

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
    }

    /**
     * Compile the shader program
     */
    compileShader() {
        const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        const fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        const vertSource = `
            attribute vec4 aPosition;
            attribute vec4 aColour;

            uniform mat4 uViewMatrix;

            varying vec4 vColour;


            void main() {
                vColour = aColour;
                gl_Position = uViewMatrix * aPosition;
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
        this.gl.attachShader(this.program, vShader);
        this.gl.attachShader(this.program, fShader);
        this.gl.linkProgram(this.program);
    }

    // Add the given 3D object to the scene
    addObject(obj) {
        this.bufferObjects.push ({
            vertexBuffer : this.createBuffer(obj.vertices, this.gl.ARRAY_BUFFER, Float32Array),
            colourBuffer : this.createBuffer(obj.colours, this.gl.ARRAY_BUFFER, Float32Array),
            normalBuffer : this.createBuffer(obj.normals, this.gl.ARRAY_BUFFER, Float32Array),
            indexBuffer : this.createBuffer(obj.indices, this.gl.ELEMENT_ARRAY_BUFFER, Int16Array),
            number : obj.indices.length
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
        // let aNormal = this.gl.getAttribLocation(this.program, "aNormal");
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.normalBuffer);
        // this.gl.vertexAttribPointer(aNormal, 4, this.gl.FLOAT, false, 0, 0);
        // this.gl.enableVertexAttribArray(aNormal);
        // Index buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
    }

    /**
     * Animate
     */
    animate() {
        // time
        this.now = performance.now();
        this.gl.clearColor(0.1, 0.1, 0.1, 0.7);
        this.gl.clearDepth(1.0);
        this.gl.viewport(0,0,this.canvas.width, this.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.gl.useProgram(this.program);

        for(let bufferObject of this.bufferObjects){
            
            this.bindObjBuffers(bufferObject);
            
            // Bind view matrix
            let theta = performance.now()/10000;
            let viewMatrix = this.getRotMatX(theta);
            
            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "uViewMatrix"), false, viewMatrix);

            this.gl.drawElements(this.gl.TRIANGLES, bufferObject.number, this.gl.UNSIGNED_SHORT, 0);
        }
        requestAnimationFrame(this.animate.bind(this));
    }

    /**
     * Matrices
     */
    matMul(mat1, mat2) {
        let res = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                res[i*4 + j] = 0;
                for (let k = 0; k < 4; k++) {
                    res[i*4 + j] += mat1[i*4 + k] * mat2[k*4 + j];
                }
            }
        }
        return res;
    }
    getRotMatX(theta) {
        let cost = Math.cos(theta);
        let sint = Math.sin(theta);
        return [
            cost, 0, -sint, 0,
            0, 1, 0, 0,
            sint, 0, cost, 0,
            0, 0, 0, 1
        ];
    }
    getRotMatZ(theta) {
        let cost = Math.cos(theta);
        let sint = Math.sin(theta);
        return [
            cost, -sint, 0, 0,
            sint,  cost, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }
    getRotMatY(theta) {
        let cost = Math.cos(theta);
        let sint = Math.sin(theta);
        return [
            1, 0, 0, 0,
            0, cost, -sint, 0,
            0, sint,  cost, 0,
            0, 0, 0, 1
        ]
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

function plane() {
    const vertices = [
        -0.5,-0.5,0,1,
         0.5,-0.5,0,1,
        -0.5, 0.5,0,1,
         0.5, 0.5,0,1
    ]
    const indices = [
        0,1,2,
        1,2,3
    ]
    const colours = [
        1,1,1,1,
        1,1,1,1,
        1,1,1,1,
        1,1,1,1
    ]
    const normals = [
        0,0,1,0,
        0,0,1,0,
        0,0,1,0,
        0,0,1,0
    ]
    return {
        vertices : vertices,
        indices : indices,
        colours : colours,
        normals : normals
    }
}

const scene = new ClickableScene("canvas");
const cube1 = cube(0.3, [0.6,0.9,0.2,1]);
scene.addObject(cube1);
scene.run();

let mat1 = [
    1,2,3,4,
    5,6,7,8,
    1,2,3,4,
    0,0,0,1
]
let mat2 = [
    9,9,9,8,
    7,7,7,6,
    5,4,3,2,
    1,2,3,4
]
console.log(scene.matMul(mat1, mat2));