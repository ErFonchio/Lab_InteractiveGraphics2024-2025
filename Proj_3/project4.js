// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{

    var b = rotationY;
    var c = rotationX;
	// [TO-DO] Modify the code below to form the transformation matrix.
	//Matrix rotation in 3d:
    /*

    cos(a)cos(b)    cos(a)sin(b)sin(c)-sin(a)cos(c)   cos(a)sin(b)cos(c)+sin(a)sin(c)
    sin(a)cos(b)    sin(a)sin(b)sin(c)+cos(a)cos(c)   sin(a)sin(b)cos(c)-cos(a)sin(c)
    -sin(b)         cos(b)sin(c)                      cos(b)cos(c)
    
    per a=0 perché la rotazione sull'asse zeta è 0 -> cos(0) = 1, sin(0) = 0

    1*cos(b)        1*sin(b)sin(c)                    1*sin(b)cos(c)
    0               1*cos(c)                          -sin(c)
    -sin(b)         cos(b)sin(c)                      cos(b)cos(c)

    */
      
    var trans = [
		Math.cos(b), 0, -Math.sin(b), 0,
		Math.sin(b)*Math.sin(c), Math.cos(c), Math.cos(b)*Math.sin(c), 0,
		Math.sin(b)*Math.cos(c), -Math.sin(c), Math.cos(b)*Math.cos(c), 0,
		translationX, translationY, translationZ, 1
	];
	var mvp = MatrixMult( projectionMatrix, trans );
	return mvp;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer {
	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);

		this.mvpUniform = gl.getUniformLocation(this.prog, 'modelViewProjection');
		this.axisSwapUniform = gl.getUniformLocation(this.prog, 'axisSwapMatrix');
		this.useTextureUniform = gl.getUniformLocation(this.prog, 'useTexture');

		this.positionAttr = gl.getAttribLocation(this.prog, 'vertexPosition');
		this.uvAttr = gl.getAttribLocation(this.prog, 'vertexUV');

		this.vertexBuffer = gl.createBuffer();
		this.uvBuffer = gl.createBuffer();

		this.numTriangles = 0;

		this.axisSwapMatrix = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
	}

	setMesh(positions, uvs) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

		this.numTriangles = positions.length / 3;
	}

	swapYZ(enable) {
		if (enable) {
			const theta = Math.PI / 2;
			this.axisSwapMatrix = [
				1, 0, 0, 0,
				0, -Math.cos(theta), -Math.sin(theta), 0,
				0, -Math.sin(theta), Math.cos(theta), 0,
				0, 0, 0, 1
			];
		} else {
			this.axisSwapMatrix = [
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1
			];
		}
	}

	draw(mvpMatrix) {
		gl.useProgram(this.prog);

		gl.uniformMatrix4fv(this.mvpUniform, false, mvpMatrix);
		gl.uniformMatrix4fv(this.axisSwapUniform, false, this.axisSwapMatrix);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.enableVertexAttribArray(this.positionAttr);
		gl.vertexAttribPointer(this.positionAttr, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.enableVertexAttribArray(this.uvAttr);
		gl.vertexAttribPointer(this.uvAttr, 2, gl.FLOAT, false, 0, 0);

		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	setTexture( img )
	{
		// [TO-DO] Bind the texture
        const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );

        // Set texture parameters 
		gl.generateMipmap(gl.TEXTURE_2D);	

        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		gl.useProgram(this.prog); 
		gl.activeTexture(gl.TEXTURE0); 
		gl.bindTexture(gl.TEXTURE_2D, texture); 
		const sampler = gl.getUniformLocation(this.prog, 'tex');
		gl.uniform1i(sampler,0);
    }

	showTexture(enable) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTextureUniform, enable);
	}
}


const meshVS = `
	attribute vec3 vertexPosition;
	attribute vec2 vertexUV;

	uniform mat4 modelViewProjection;
	uniform mat4 axisSwapMatrix;

	varying vec2 uvCoords;

	void main() {
		uvCoords = vertexUV;
		gl_Position = modelViewProjection * axisSwapMatrix * vec4(vertexPosition, 1.0);
	}`;


const meshFS = `
	precision mediump float;

	uniform bool useTexture;
	uniform sampler2D tex;

	varying vec2 uvCoords;

	void main() {
		if (useTexture) {
			gl_FragColor = texture2D(tex, uvCoords);
		} else {
			gl_FragColor = vec4(1.0, gl_FragCoord.z * gl_FragCoord.z, 0.0, 1.0);
		}
	}`;
