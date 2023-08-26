// Class used to store the entire scene on a texture
export class RenderTarget {
    tex // The texture used to render the scene to
    framebuffer // The framebuffer, necessary to render the scene to a texture
    gl // webgl context
    width
    height
    
    constructor (gl, width, height) {
        // Create a render target
        this.tex = gl.createTexture()
        this.gl = gl;
        this.width = width;
        this.height = height;

        // Store texture at position 1
        gl.activeTexture(gl.TEXTURE0+1)
        gl.bindTexture(gl.TEXTURE_2D, this.tex)
        // Make the texture the size given
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        
        // Create framebuffer
        this.framebuffer = gl.createFramebuffer()

        // The framebuffer and texture need to be bound to the gl context
        this.bind();

        // Create a depth renderbuffer
        let depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

        // Make a depth buffer of the size given
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    }

    // Bind the framebuffer and texture to the gl context
    bind () {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer)
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.tex, 0)
    }
}
