// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
	// [TO-DO] Modify the code below to form the transformation matrix.
    
    var b = rotationY;
	var c = rotationX;

	var trans = [
		Math.cos(b), 0, -Math.sin(b), 0,
		Math.sin(b)*Math.sin(c), Math.cos(c), Math.cos(b)*Math.sin(c), 0,
		Math.sin(b)*Math.cos(c), -Math.sin(c), Math.cos(b)*Math.cos(c), 0,
		translationX, translationY, translationZ, 1
	];
    //Qui diamo solo la matrice di trasformazione
	return trans;
}
// [TO-DO] Complete the implementation of the following class.
class MeshDrawer {
    // The constructor is a good place for taking care of the necessary initializations.

	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);

		// solo le uniform locations
		this.mvpUniform = gl.getUniformLocation(this.prog, 'modelViewProjection');
		this.mvUniform = gl.getUniformLocation(this.prog, 'modelView');
		this.matrixNormalUniform = gl.getUniformLocation(this.prog, 'matrixNormal');
		this.axisSwapUniform = gl.getUniformLocation(this.prog, 'axisSwapMatrix');
		this.useTextureUniform = gl.getUniformLocation(this.prog, 'useTexture');
		this.lightDirUniform = gl.getUniformLocation(this.prog, 'lightDir');
		this.shininessUniform = gl.getUniformLocation(this.prog, 'shininess');

		// attributes
		this.positionAttr = gl.getAttribLocation(this.prog, 'vertexPosition');
		this.uvAttr = gl.getAttribLocation(this.prog, 'vertexUV');
		this.normalAttr = gl.getAttribLocation(this.prog, 'vertexNormal');

		// create buffers
		this.vertexBuffer = gl.createBuffer();
		this.uvBuffer = gl.createBuffer();
		this.normalBuffer = gl.createBuffer();

		this.numTriangles = 0;

		this.axisSwapMatrix = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
	}

    // This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.

	setMesh(vertPos, texCoords, normals) {
        // [TO-DO] Update the contents of the vertex buffer objects.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

		this.numTriangles = vertPos.length / 3;
	}

	swapYZ(swap) {
		if (swap) {
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

	draw(matrixMVP, matrixMV, matrixNormal) {
		gl.useProgram(this.prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.enableVertexAttribArray(this.normalAttr);
		gl.vertexAttribPointer(this.normalAttr, 3, gl.FLOAT, false, 0, 0);
		gl.uniformMatrix4fv(this.mvpUniform, false, matrixMVP);
		gl.uniformMatrix4fv(this.mvUniform, false, matrixMV);
		gl.uniformMatrix3fv(this.matrixNormalUniform, false, matrixNormal);
		gl.uniformMatrix4fv(this.axisSwapUniform, false, this.axisSwapMatrix);

		// Vertex position
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.enableVertexAttribArray(this.positionAttr);
		gl.vertexAttribPointer(this.positionAttr, 3, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.enableVertexAttribArray(this.uvAttr);
		gl.vertexAttribPointer(this.uvAttr, 2, gl.FLOAT, false, 0, 0);

		

		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	setTexture(img) {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		const sampler = gl.getUniformLocation(this.prog, 'tex');
		gl.uniform1i(sampler, 0);
	}

	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTextureUniform, show);
	}

	setLightDir(x, y, z) {
		gl.useProgram(this.prog);
		gl.uniform3f(this.lightDirUniform, x, y, z);
	}

	setShininess(shininess) {
		gl.useProgram(this.prog);
		gl.uniform1f(this.shininessUniform, shininess);
	}
}

// VERTEX SHADER
const meshVS = `
	attribute vec3 vertexPosition;
	attribute vec2 vertexUV;
	attribute vec3 vertexNormal;

	uniform mat4 modelViewProjection;
	uniform mat4 modelView;
	uniform mat3 matrixNormal;
	uniform mat4 axisSwapMatrix;

	varying vec2 uvCoords;
	varying vec3 fragNormal;
	varying vec3 fragPosition;

	void main() {
		vec4 pos = axisSwapMatrix * vec4(vertexPosition, 1.0);
		gl_Position = modelViewProjection * pos;

		uvCoords = vertexUV;
		fragPosition = (modelView * pos).xyz;
		fragNormal = normalize(matrixNormal * mat3(axisSwapMatrix) * vertexNormal);
	}
`;

// FRAGMENT SHADER
const meshFS = `
	precision mediump float;

    uniform bool useTexture;
    uniform sampler2D tex;
    uniform vec3 lightDir;
    uniform float shininess;

    varying vec2 uvCoords;
    varying vec3 fragNormal;
    varying vec3 fragPosition;

    void main() {
        vec3 normal = normalize(fragNormal);
        vec3 light = normalize(lightDir);
        vec3 viewDir = normalize(-fragPosition);
        vec3 halfVec = normalize(light + viewDir);

        float diff = max(dot(normal, light), 0.0);
        float spec = 0.0;
        if (diff > 0.0) {
            spec = pow(max(dot(normal, halfVec), 0.0), shininess);
        }

        vec3 kd = vec3(1.0, 1.0, 0.0);
        if (useTexture){
            kd = texture2D(tex, uvCoords).rgb;
        }
        vec3 ks = vec3(1.0);
        vec3 lightColor = vec3(1.0);

        vec3 color = kd * lightColor * diff + ks * lightColor * spec;
        gl_FragColor = vec4(color, 1.0);
    }  
`;
