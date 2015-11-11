///<reference path='./typings/tsd.d.ts'/>
///<reference path="./localTypings/webglutils.d.ts"/>
define(["require", "exports", './loader'], function (require, exports, loader) {
    ////////////////////////////////////////////////////////////////////////////////////////////
    // stats module by mrdoob (https://github.com/mrdoob/stats.js) to show the performance 
    // of your graphics
    var stats = new Stats();
    stats.setMode(1); // 0: fps, 1: ms, 2: mb
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
    ////////////////////////////////////////////////////////////////////////////////////////////
    // utilities
    var rand = function (min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return min + Math.random() * (max - min);
    };
    var randInt = function (range) {
        return Math.floor(Math.random() * range);
    };
    ////////////////////////////////////////////////////////////////////////////////////////////
    // get some of our canvas elements that we need
    var canvas = document.getElementById("webgl");
    var desc = document.getElementById("desc");
    var currentShader = 1;
    window["onEffect1"] = function () {
        desc.innerText = "My mandelbrot texture! Uses 20 iterations, implemented in a4-shader1.frag.";
        currentShader = 1;
    };
    window["onEffect2"] = function () {
        desc.innerText = "Swiss cheese! Uses the basic a3 shader but discards vertices within a few specified circles. Implemented in a4-shader2.frag.";
        currentShader = 2;
    };
    window["onEffect3"] = function () {
        desc.innerText = "Ewan McGregor in space! If the average of g - r and g - b from the green screen texture is over 0.15, we use the space texture at that point instead. Implemented in a4-shader3.frag.";
        currentShader = 3;
    };
    window["onEffect4"] = function () {
        desc.innerText = "Warble! The y value varies depending on the sine of the point's x coordinate + time. Implemented in a4-shader4.vert.";
        currentShader = 4;
    };
    ////////////////////////////////////////////////////////////////////////////////////////////
    // some simple interaction using the mouse.
    // we are going to get small motion offsets of the mouse, and use these to rotate the object
    //
    // our offset() function from assignment 0, to give us a good mouse position in the canvas 
    function offset(e) {
        e = e || window.event;
        var target = e.target || e.srcElement, rect = target.getBoundingClientRect(), offsetX = e.clientX - rect.left, offsetY = e.clientY - rect.top;
        return vec2.fromValues(offsetX, offsetY);
    }
    var mouseStart = undefined; // previous mouse position
    var mouseDelta = undefined; // the amount the mouse has moved
    var mouseAngles = vec2.create(); // angle offset corresponding to mouse movement
    // start things off with a down press
    canvas.onmousedown = function (ev) {
        mouseStart = offset(ev);
        mouseDelta = vec2.create(); // initialize to 0,0
        vec2.set(mouseAngles, 0, 0);
    };
    // stop things with a mouse release
    canvas.onmouseup = function (ev) {
        if (mouseStart != undefined) {
            var clickEnd = offset(ev);
            vec2.sub(mouseDelta, clickEnd, mouseStart); // delta = end - start
            vec2.scale(mouseAngles, mouseDelta, 10 / canvas.height);
            // now toss the two values since the mouse is up
            mouseDelta = undefined;
            mouseStart = undefined;
        }
    };
    // if we're moving and the mouse is down        
    canvas.onmousemove = function (ev) {
        if (mouseStart != undefined) {
            var m = offset(ev);
            vec2.sub(mouseDelta, m, mouseStart); // delta = mouse - start 
            vec2.copy(mouseStart, m); // start becomes current position
            vec2.scale(mouseAngles, mouseDelta, 10 / canvas.height);
        }
    };
    // stop things if you move out of the window
    canvas.onmouseout = function (ev) {
        if (mouseStart != undefined) {
            vec2.set(mouseAngles, 0, 0);
            mouseDelta = undefined;
            mouseStart = undefined;
        }
    };
    ////////////////////////////////////////////////////////////////////////////////////////////
    // start things off by calling initWebGL
    initWebGL();
    function initWebGL() {
        // get the rendering context for webGL
        var gl = getWebGLContext(canvas);
        if (!gl) {
            return; // no webgl!  Bye bye
        }
        // turn on backface culling and zbuffering
        //gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        // attempt to download and set up our GLSL shaders.  When they download, processed to the next step
        // of our program, the "main" routing
        // 
        loader.loadFiles(['shaders/a4-shader1.vert', 'shaders/a4-shader1.frag',
            'shaders/a4-shader2.vert', 'shaders/a4-shader2.frag',
            'shaders/a4-shader3.vert', 'shaders/a4-shader3.frag',
            'shaders/a4-shader4.vert', 'shaders/a4-shader4.frag'], function (shaderText) {
            var program1 = createProgramFromSources(gl, [shaderText[0], shaderText[1]]);
            var program2 = createProgramFromSources(gl, [shaderText[2], shaderText[3]]);
            var program3 = createProgramFromSources(gl, [shaderText[4], shaderText[5]]);
            var program4 = createProgramFromSources(gl, [shaderText[6], shaderText[7]]);
            main(gl, [program1, program2, program3, program4]);
        }, function (url) {
            alert('Shader failed to download "' + url + '"');
        });
    }
    var clock = 0;
    ////////////////////////////////////////////////////////////////////////////////////////////
    // webGL is set up, and our Shader program has been created.  Finish setting up our webGL application       
    function main(gl, program) {
        // use the webgl-utils library to create setters for all the uniforms and attributes in our shaders.
        // It enumerates all of the uniforms and attributes in the program, and creates utility functions to 
        // allow "setUniforms" and "setAttributes" (below) to set the shader variables from a javascript object. 
        // The objects have a key for each uniform or attribute, and a value containing the parameters for the
        // setter function
        //var uniformSetters = createUniformSetters(gl, program);
        //var attribSetters  = createAttributeSetters(gl, program);
        // an indexed quad
        var arrays = {
            position: { numComponents: 3, data: [], },
            texcoord: { numComponents: 2, data: [], },
            normal: { numComponents: 3, data: [], },
            indices: { numComponents: 3, data: [], },
        };
        //Sets up quad to have 16 x 16 vertices
        for (var i = 0; i < 16; i++) {
            for (var j = 0; j < 16; j++) {
                arrays.position.data.push(i * (10 / 16), j * (10 / 16), 0);
                arrays.normal.data.push(0, 0, -1);
                arrays.texcoord.data.push(1 - (i / 16), 1 - (j / 16));
            }
        }
        for (var i = 0; i < 15; i++) {
            for (var j = 0; j < 15; j++) {
                arrays.indices.data.push(i + j * 16, i + j * 16 + 1, i + ((j + 1) * 16));
                arrays.indices.data.push(i + j * 16 + 1, (j + 1) * 16 + i, (j + 1) * 16 + i + 1);
            }
        }
        var center = [5, 5, 0];
        var scaleFactor = 20;
        var bufferInfo = createBufferInfoFromArrays(gl, arrays);
        function degToRad(d) {
            return d * Math.PI / 180;
        }
        var cameraAngleRadians = degToRad(0);
        var fieldOfViewRadians = degToRad(60);
        var cameraHeight = 50;
        var uniformsThatAreTheSameForAllObjects = {
            u_lightWorldPos: [50, 30, -100],
            u_viewInverse: mat4.create(),
            u_lightColor: [1, 1, 1, 1],
            u_ambient: [0.1, 0.1, 0.1, 0.1],
            //Added for green screen effect
            u_image0: gl.createTexture(),
            u_image1: gl.createTexture(),
            //Added for warble
            u_clock: 0.0
        };
        var uniformsThatAreComputedForEachObject = {
            u_worldViewProjection: mat4.create(),
            u_world: mat4.create(),
            u_worldInverseTranspose: mat4.create(),
        };
        var baseColor = rand(240);
        var objectState = {
            materialUniforms: {
                u_colorMult: chroma.hsv(rand(baseColor, baseColor + 120), 0.5, 1).gl(),
                //u_diffuse:               texture,
                u_specular: [1, 1, 1, 1],
                u_shininess: 450,
                u_specularFactor: 0.75,
            }
        };
        // some variables we'll reuse below
        var projectionMatrix = mat4.create();
        var viewMatrix = mat4.create();
        var rotationMatrix = mat4.create();
        var matrix = mat4.create(); // a scratch matrix
        var invMatrix = mat4.create();
        var axisVector = vec3.create();
        //Creating our two textures
        var texture1 = gl.createTexture();
        var image1 = new Image();
        image1.src = "resources/texture1.jpg";
        image1.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture1);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image1);
        };
        var texture2 = gl.createTexture();
        var image2 = new Image();
        image2.src = "resources/texture2.jpg";
        image2.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture2);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image2);
        };
        uniformsThatAreTheSameForAllObjects.u_image0 = texture1;
        uniformsThatAreTheSameForAllObjects.u_image1 = texture2;
        requestAnimationFrame(drawScene);
        // Draw the scene.
        function drawScene(time) {
            time *= 0.001;
            //console.log(uniformsThatAreTheSameForAllObjects.u_clock);
            // measure time taken for the little stats meter
            stats.begin();
            // if the window changed size, reset the WebGL canvas size to match.  The displayed size of the canvas
            // (determined by window size, layout, and your CSS) is separate from the size of the WebGL render buffers, 
            // which you can control by setting canvas.width and canvas.height
            resizeCanvasToDisplaySize(canvas);
            // Set the viewport to match the canvas
            gl.viewport(0, 0, canvas.width, canvas.height);
            // Clear the canvas AND the depth buffer.
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // Compute the projection matrix
            var aspect = canvas.clientWidth / canvas.clientHeight;
            mat4.perspective(projectionMatrix, fieldOfViewRadians, aspect, 1, 2000);
            // Compute the camera's matrix using look at.
            var cameraPosition = [0, 0, -200];
            var target = [0, 0, 0];
            var up = [0, 1, 0];
            var cameraMatrix = mat4.lookAt(uniformsThatAreTheSameForAllObjects.u_viewInverse, cameraPosition, target, up);
            // Make a view matrix from the camera matrix.
            mat4.invert(viewMatrix, cameraMatrix);
            // tell WebGL to use our shader program
            if (currentShader == 1) {
                gl.useProgram(program[0]);
            }
            else if (currentShader == 2) {
                gl.useProgram(program[1]);
            }
            else if (currentShader == 3) {
                gl.useProgram(program[2]);
            }
            else {
                gl.useProgram(program[3]);
            }
            if (currentShader == 1) {
                var uniformSetters = createUniformSetters(gl, program[0]);
                var attribSetters = createAttributeSetters(gl, program[0]);
            }
            else if (currentShader == 2) {
                var uniformSetters = createUniformSetters(gl, program[1]);
                var attribSetters = createAttributeSetters(gl, program[1]);
            }
            else if (currentShader == 3) {
                var uniformSetters = createUniformSetters(gl, program[2]);
                var attribSetters = createAttributeSetters(gl, program[2]);
            }
            else {
                uniformsThatAreTheSameForAllObjects.u_clock = clock;
                clock += 0.1;
                var uniformSetters = createUniformSetters(gl, program[3]);
                var attribSetters = createAttributeSetters(gl, program[3]);
            }
            // Setup all the needed attributes and buffers. 
            setBuffersAndAttributes(gl, attribSetters, bufferInfo);
            // Set the uniforms that are the same for all objects.  Unlike the attributes, each uniform setter
            // is different, depending on the type of the uniform variable.  Look in webgl-util.js for the
            // implementation of  setUniforms to see the details for specific types           
            setUniforms(uniformSetters, uniformsThatAreTheSameForAllObjects);
            ///////////////////////////////////////////////////////
            // Compute the view matrix and corresponding other matrices for rendering.
            // first make a copy of our rotationMatrix
            mat4.copy(matrix, rotationMatrix);
            // adjust the rotation based on mouse activity.  mouseAngles is set if user is dragging 
            if (mouseAngles[0] !== 0 || mouseAngles[1] !== 0) {
                /*
                 * only rotate around Y, use the second mouse value for scale.  Leaving the old code from A3
                 * here, commented out
                 *
                // need an inverse world transform so we can find out what the world X axis for our first rotation is
                mat4.invert(invMatrix, matrix);
                // get the world X axis
                var xAxis = vec3.transformMat4(axisVector, vec3.fromValues(1,0,0), invMatrix);
          
                // rotate about the world X axis (the X parallel to the screen!)
                mat4.rotate(matrix, matrix, -mouseAngles[1], xAxis);
                */
                // now get the inverse world transform so we can find the world Y axis
                mat4.invert(invMatrix, matrix);
                // get the world Y axis
                var yAxis = vec3.transformMat4(axisVector, vec3.fromValues(0, 1, 0), invMatrix);
                // rotate about teh world Y axis
                mat4.rotate(matrix, matrix, mouseAngles[0], yAxis);
                // save the resulting matrix back to the cumulative rotation matrix 
                mat4.copy(rotationMatrix, matrix);
                // use mouseAngles[1] to scale
                scaleFactor += mouseAngles[1];
                vec2.set(mouseAngles, 0, 0);
            }
            // add a translate and scale to the object World xform, so we have:  R * T * S
            mat4.translate(matrix, rotationMatrix, [-center[0] * scaleFactor, -center[1] * scaleFactor,
                -center[2] * scaleFactor]);
            mat4.scale(matrix, matrix, [scaleFactor, scaleFactor, scaleFactor]);
            mat4.copy(uniformsThatAreComputedForEachObject.u_world, matrix);
            // get proj * view * world
            mat4.multiply(matrix, viewMatrix, uniformsThatAreComputedForEachObject.u_world);
            mat4.multiply(uniformsThatAreComputedForEachObject.u_worldViewProjection, projectionMatrix, matrix);
            // get worldInvTranspose.  For an explaination of why we need this, for fixing the normals, see
            // http://www.unknownroad.com/rtfm/graphics/rt_normals.html
            mat4.transpose(uniformsThatAreComputedForEachObject.u_worldInverseTranspose, mat4.invert(matrix, uniformsThatAreComputedForEachObject.u_world));
            // Set the uniforms we just computed
            setUniforms(uniformSetters, uniformsThatAreComputedForEachObject);
            // Set the uniforms that are specific to the this object.
            setUniforms(uniformSetters, objectState.materialUniforms);
            // Draw the geometry.   Everything is keyed to the ""
            gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
            // stats meter
            stats.end();
            requestAnimationFrame(drawScene);
        }
    }
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImE0LnRzIl0sIm5hbWVzIjpbIm9mZnNldCIsImluaXRXZWJHTCIsIm1haW4iLCJtYWluLmRlZ1RvUmFkIiwibWFpbi5kcmF3U2NlbmUiXSwibWFwcGluZ3MiOiJBQUFBLHlDQUF5QztBQUN6QyxxREFBcUQ7O0lBaUJyRCw0RkFBNEY7SUFDNUYsdUZBQXVGO0lBQ3ZGLG1CQUFtQjtJQUNuQixJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO0lBQ3hCLEtBQUssQ0FBQyxPQUFPLENBQUUsQ0FBQyxDQUFFLENBQUMsQ0FBQyx1QkFBdUI7SUFFM0MsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztJQUM3QyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3JDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUM7SUFFbkMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBRSxDQUFDO0lBRTlDLDRGQUE0RjtJQUM1RixZQUFZO0lBQ1osSUFBSSxJQUFJLEdBQUcsVUFBUyxHQUFXLEVBQUUsR0FBWTtRQUMzQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN0QixHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQ1YsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNWLENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUM7SUFFRixJQUFJLE9BQU8sR0FBRyxVQUFTLEtBQUs7UUFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQztJ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RUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ25EQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbENBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBLEdBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBLEdBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO1lBQ2hEQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUNEQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxFQUFFQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtZQUM1QkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsRUFBRUEsRUFBRUEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0E7Z0JBQzVCQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxHQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxHQUFDQSxDQUFDQSxHQUFDQSxFQUFFQSxHQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxHQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDekRBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEdBQUNBLENBQUNBLEdBQUNBLEVBQUVBLEdBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBLEdBQUNBLEVB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Q0EsV0FBV0EsQ0FBQ0EsY0FBY0EsRUFBRUEsb0NBQW9DQSxDQUFDQSxDQUFDQTtZQUVsRUEseURBQXlEQTtZQUN6REEsV0FBV0EsQ0FBQ0EsY0FBY0EsRUFBRUEsV0FBV0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQTtZQUUxREEscURBQXFEQTtZQUNyREEsRUFBRUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsU0FBU0EsRUFBRUEsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBRUEsQ0FBQ0EsY0FBY0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFNUVBLGNBQWNBO1lBQ2RBLEtBQUtBLENBQUNBLEdBQUdBLEVBQUVBLENBQUNBO1lBRVpBLHFCQUFxQkEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDbkNBLENBQUNBO0lBQ0hGLENBQUNBIiwiZmlsZSI6ImE0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vPHJlZmVyZW5jZSBwYXRoPScuL3R5cGluZ3MvdHNkLmQudHMnLz5cbi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4vbG9jYWxUeXBpbmdzL3dlYmdsdXRpbHMuZC50c1wiLz5cblxuLypcbiAqIFBvcnRpb25zIG9mIHRoaXMgY29kZSBhcmVcbiAqIENvcHlyaWdodCAyMDE1LCBCbGFpciBNYWNJbnR5cmUuXG4gKiBcbiAqIFBvcnRpb25zIG9mIHRoaXMgY29kZSB0YWtlbiBmcm9tIGh0dHA6Ly93ZWJnbGZ1bmRhbWVudGFscy5vcmcsIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9ncmVnZ21hbi93ZWJnbC1mdW5kYW1lbnRhbHNcbiAqIGFuZCBhcmUgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGxpY2Vuc2UuICBJbiBwYXJ0aWN1bGFyLCBmcm9tIFxuICogICAgaHR0cDovL3dlYmdsZnVuZGFtZW50YWxzLm9yZy93ZWJnbC93ZWJnbC1sZXNzLWNvZGUtbW9yZS1mdW4uaHRtbFxuICogICAgaHR0cDovL3dlYmdsZnVuZGFtZW50YWxzLm9yZy93ZWJnbC9yZXNvdXJjZXMvcHJpbWl0aXZlcy5qc1xuICogXG4gKiBUaG9zZSBwb3J0aW9ucyBDb3B5cmlnaHQgMjAxNCwgR3JlZ2cgVGF2YXJlcy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKi9cblxuaW1wb3J0IGxvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVyJyk7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0cyBtb2R1bGUgYnkgbXJkb29iIChodHRwczovL2dpdGh1Yi5jb20vbXJkb29iL3N0YXRzLmpzKSB0byBzaG93IHRoZSBwZXJmb3JtYW5jZSBcbi8vIG9mIHlvdXIgZ3JhcGhpY3NcbnZhciBzdGF0cyA9IG5ldyBTdGF0cygpO1xuc3RhdHMuc2V0TW9kZSggMSApOyAvLyAwOiBmcHMsIDE6IG1zLCAyOiBtYlxuXG5zdGF0cy5kb21FbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbnN0YXRzLmRvbUVsZW1lbnQuc3R5bGUucmlnaHQgPSAnMHB4JztcbnN0YXRzLmRvbUVsZW1lbnQuc3R5bGUudG9wID0gJzBweCc7XG5cbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoIHN0YXRzLmRvbUVsZW1lbnQgKTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHV0aWxpdGllc1xudmFyIHJhbmQgPSBmdW5jdGlvbihtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKSB7XG4gIGlmIChtYXggPT09IHVuZGVmaW5lZCkge1xuICAgIG1heCA9IG1pbjtcbiAgICBtaW4gPSAwO1xuICB9XG4gIHJldHVybiBtaW4gKyBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbik7XG59O1xuXG52YXIgcmFuZEludCA9IGZ1bmN0aW9uKHJhbmdlKSB7XG4gIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiByYW5nZSk7XG59O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZ2V0IHNvbWUgb2Ygb3VyIGNhbnZhcyBlbGVtZW50cyB0aGF0IHdlIG5lZWRcbnZhciBjYW52YXMgPSA8SFRNTENhbnZhc0VsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3ZWJnbFwiKTsgIFxudmFyIGRlc2MgPSA8SFRNTERpdkVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZXNjXCIpO1xuXG52YXIgY3VycmVudFNoYWRlciA9IDE7XG53aW5kb3dbXCJvbkVmZmVjdDFcIl0gPSAoKSA9PiB7ICBcbiAgZGVzYy5pbm5lclRleHQgPSBcIk15IG1hbmRlbGJyb3QgdGV4dHVyZSEgVXNlcyAyMCBpdGVyYXRpb25zLCBpbXBsZW1lbnRlZCBpbiBhNC1zaGFkZXIxLmZyYWcuXCJcbiAgICBjdXJyZW50U2hhZGVyID0gMTtcbn0gXG5cbndpbmRvd1tcIm9uRWZmZWN0MlwiXSA9ICgpID0+IHtcbiAgZGVzYy5pbm5lclRleHQgPSBcIlN3aXNzIGNoZWVzZSEgVXNlcyB0aGUgYmFzaWMgYTMgc2hhZGVyIGJ1dCBkaXNjYXJkcyB2ZXJ0aWNlcyB3aXRoaW4gYSBmZXcgc3BlY2lmaWVkIGNpcmNsZXMuIEltcGxlbWVudGVkIGluIGE0LXNoYWRlcjIuZnJhZy5cIiAgICAgXG4gICAgY3VycmVudFNoYWRlciA9IDI7XG59IFxuXG53aW5kb3dbXCJvbkVmZmVjdDNcIl0gPSAoKSA9PiB7XG4gIGRlc2MuaW5uZXJUZXh0ID0gXCJFd2FuIE1jR3JlZ29yIGluIHNwYWNlISBJZiB0aGUgYXZlcmFnZSBvZiBnIC0gciBhbmQgZyAtIGIgZnJvbSB0aGUgZ3JlZW4gc2NyZWVuIHRleHR1cmUgaXMgb3ZlciAwLjE1LCB3ZSB1c2UgdGhlIHNwYWNlIHRleHR1cmUgYXQgdGhhdCBwb2ludCBpbnN0ZWFkLiBJbXBsZW1lbnRlZCBpbiBhNC1zaGFkZXIzLmZyYWcuXCJcbiAgIGN1cnJlbnRTaGFkZXIgPSAzO1xufSBcblxud2luZG93W1wib25FZmZlY3Q0XCJdID0gKCkgPT4ge1xuICBkZXNjLmlubmVyVGV4dCA9IFwiV2FyYmxlISBUaGUgeSB2YWx1ZSB2YXJpZXMgZGVwZW5kaW5nIG9uIHRoZSBzaW5lIG9mIHRoZSBwb2ludCdzIHggY29vcmRpbmF0ZSArIHRpbWUuIEltcGxlbWVudGVkIGluIGE0LXNoYWRlcjQudmVydC5cIlxuICAgIGN1cnJlbnRTaGFkZXIgPSA0O1xufSBcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHNvbWUgc2ltcGxlIGludGVyYWN0aW9uIHVzaW5nIHRoZSBtb3VzZS5cbi8vIHdlIGFyZSBnb2luZyB0byBnZXQgc21hbGwgbW90aW9uIG9mZnNldHMgb2YgdGhlIG1vdXNlLCBhbmQgdXNlIHRoZXNlIHRvIHJvdGF0ZSB0aGUgb2JqZWN0XG4vL1xuLy8gb3VyIG9mZnNldCgpIGZ1bmN0aW9uIGZyb20gYXNzaWdubWVudCAwLCB0byBnaXZlIHVzIGEgZ29vZCBtb3VzZSBwb3NpdGlvbiBpbiB0aGUgY2FudmFzIFxuZnVuY3Rpb24gb2Zmc2V0KGU6IE1vdXNlRXZlbnQpOiBHTE0uSUFycmF5IHtcbiAgICBlID0gZSB8fCA8TW91c2VFdmVudD4gd2luZG93LmV2ZW50O1xuXG4gICAgdmFyIHRhcmdldCA9IDxFbGVtZW50PiBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQsXG4gICAgICAgIHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgIG9mZnNldFggPSBlLmNsaWVudFggLSByZWN0LmxlZnQsXG4gICAgICAgIG9mZnNldFkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcblxuICAgIHJldHVybiB2ZWMyLmZyb21WYWx1ZXMob2Zmc2V0WCwgb2Zmc2V0WSk7XG59XG5cbnZhciBtb3VzZVN0YXJ0ID0gdW5kZWZpbmVkOyAgLy8gcHJldmlvdXMgbW91c2UgcG9zaXRpb25cbnZhciBtb3VzZURlbHRhID0gdW5kZWZpbmVkOyAgLy8gdGhlIGFtb3VudCB0aGUgbW91c2UgaGFzIG1vdmVkXG52YXIgbW91c2VBbmdsZXMgPSB2ZWMyLmNyZWF0ZSgpOyAgLy8gYW5nbGUgb2Zmc2V0IGNvcnJlc3BvbmRpbmcgdG8gbW91c2UgbW92ZW1lbnRcblxuLy8gc3RhcnQgdGhpbmdzIG9mZiB3aXRoIGEgZG93biBwcmVzc1xuY2FudmFzLm9ubW91c2Vkb3duID0gKGV2OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgbW91c2VTdGFydCA9IG9mZnNldChldik7ICAgICAgICBcbiAgICBtb3VzZURlbHRhID0gdmVjMi5jcmVhdGUoKTsgIC8vIGluaXRpYWxpemUgdG8gMCwwXG4gICAgdmVjMi5zZXQobW91c2VBbmdsZXMsIDAsIDApO1xufVxuXG4vLyBzdG9wIHRoaW5ncyB3aXRoIGEgbW91c2UgcmVsZWFzZVxuY2FudmFzLm9ubW91c2V1cCA9IChldjogTW91c2VFdmVudCkgPT4ge1xuICAgIGlmIChtb3VzZVN0YXJ0ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBjbGlja0VuZCA9IG9mZnNldChldik7XG4gICAgICAgIHZlYzIuc3ViKG1vdXNlRGVsdGEsIGNsaWNrRW5kLCBtb3VzZVN0YXJ0KTsgICAgICAgIC8vIGRlbHRhID0gZW5kIC0gc3RhcnRcbiAgICAgICAgdmVjMi5zY2FsZShtb3VzZUFuZ2xlcywgbW91c2VEZWx0YSwgMTAvY2FudmFzLmhlaWdodCk7ICBcblxuICAgICAgICAvLyBub3cgdG9zcyB0aGUgdHdvIHZhbHVlcyBzaW5jZSB0aGUgbW91c2UgaXMgdXBcbiAgICAgICAgbW91c2VEZWx0YSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbW91c2VTdGFydCA9IHVuZGVmaW5lZDsgXG4gICAgfVxufVxuXG4vLyBpZiB3ZSdyZSBtb3ZpbmcgYW5kIHRoZSBtb3VzZSBpcyBkb3duICAgICAgICBcbmNhbnZhcy5vbm1vdXNlbW92ZSA9IChldjogTW91c2VFdmVudCkgPT4ge1xuICAgIGlmIChtb3VzZVN0YXJ0ICE9IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgbSA9IG9mZnNldChldik7XG4gICAgICB2ZWMyLnN1Yihtb3VzZURlbHRhLCBtLCBtb3VzZVN0YXJ0KTsgICAgLy8gZGVsdGEgPSBtb3VzZSAtIHN0YXJ0IFxuICAgICAgdmVjMi5jb3B5KG1vdXNlU3RhcnQsIG0pOyAgICAgICAgICAgICAgIC8vIHN0YXJ0IGJlY29tZXMgY3VycmVudCBwb3NpdGlvblxuICAgICAgdmVjMi5zY2FsZShtb3VzZUFuZ2xlcywgbW91c2VEZWx0YSwgMTAvY2FudmFzLmhlaWdodCk7XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKFwibW91c2Vtb3ZlIG1vdXNlQW5nbGVzOiBcIiArIG1vdXNlQW5nbGVzWzBdICsgXCIsIFwiICsgbW91c2VBbmdsZXNbMV0pO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJtb3VzZW1vdmUgbW91c2VEZWx0YTogXCIgKyBtb3VzZURlbHRhWzBdICsgXCIsIFwiICsgbW91c2VEZWx0YVsxXSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhcIm1vdXNlbW92ZSBtb3VzZVN0YXJ0OiBcIiArIG1vdXNlU3RhcnRbMF0gKyBcIiwgXCIgKyBtb3VzZVN0YXJ0WzFdKTtcbiAgIH1cbn1cblxuLy8gc3RvcCB0aGluZ3MgaWYgeW91IG1vdmUgb3V0IG9mIHRoZSB3aW5kb3dcbmNhbnZhcy5vbm1vdXNlb3V0ID0gKGV2OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgaWYgKG1vdXNlU3RhcnQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICB2ZWMyLnNldChtb3VzZUFuZ2xlcywgMCwgMCk7XG4gICAgICBtb3VzZURlbHRhID0gdW5kZWZpbmVkO1xuICAgICAgbW91c2VTdGFydCA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGFydCB0aGluZ3Mgb2ZmIGJ5IGNhbGxpbmcgaW5pdFdlYkdMXG5pbml0V2ViR0woKTtcblxuZnVuY3Rpb24gaW5pdFdlYkdMKCkge1xuICAvLyBnZXQgdGhlIHJlbmRlcmluZyBjb250ZXh0IGZvciB3ZWJHTFxuICB2YXIgZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCA9IGdldFdlYkdMQ29udGV4dChjYW52YXMpO1xuICBpZiAoIWdsKSB7XG4gICAgcmV0dXJuOyAgLy8gbm8gd2ViZ2whICBCeWUgYnllXG4gIH1cblxuICAvLyB0dXJuIG9uIGJhY2tmYWNlIGN1bGxpbmcgYW5kIHpidWZmZXJpbmdcbiAgLy9nbC5lbmFibGUoZ2wuQ1VMTF9GQUNFKTtcbiAgZ2wuZW5hYmxlKGdsLkRFUFRIX1RFU1QpO1xuXG4gIC8vIGF0dGVtcHQgdG8gZG93bmxvYWQgYW5kIHNldCB1cCBvdXIgR0xTTCBzaGFkZXJzLiAgV2hlbiB0aGV5IGRvd25sb2FkLCBwcm9jZXNzZWQgdG8gdGhlIG5leHQgc3RlcFxuICAvLyBvZiBvdXIgcHJvZ3JhbSwgdGhlIFwibWFpblwiIHJvdXRpbmdcbiAgLy8gXG4gIGxvYWRlci5sb2FkRmlsZXMoWydzaGFkZXJzL2E0LXNoYWRlcjEudmVydCcsICdzaGFkZXJzL2E0LXNoYWRlcjEuZnJhZycsXG4gICAgICAgICAgICAgICAgICAgICdzaGFkZXJzL2E0LXNoYWRlcjIudmVydCcsICdzaGFkZXJzL2E0LXNoYWRlcjIuZnJhZycsXG4gICAgICAgICAgICAgICAgICAgICdzaGFkZXJzL2E0LXNoYWRlcjMudmVydCcsICdzaGFkZXJzL2E0LXNoYWRlcjMuZnJhZycsXG4gICAgICAgICAgICAgICAgICAgICdzaGFkZXJzL2E0LXNoYWRlcjQudmVydCcsICdzaGFkZXJzL2E0LXNoYWRlcjQuZnJhZyddLCBmdW5jdGlvbiAoc2hhZGVyVGV4dCkge1xuICAgIHZhciBwcm9ncmFtMSA9IGNyZWF0ZVByb2dyYW1Gcm9tU291cmNlcyhnbCwgW3NoYWRlclRleHRbMF0sIHNoYWRlclRleHRbMV1dKTtcbiAgICB2YXIgcHJvZ3JhbTIgPSBjcmVhdGVQcm9ncmFtRnJvbVNvdXJjZXMoZ2wsIFtzaGFkZXJUZXh0WzJdLCBzaGFkZXJUZXh0WzNdXSk7XG4gICAgdmFyIHByb2dyYW0zID0gY3JlYXRlUHJvZ3JhbUZyb21Tb3VyY2VzKGdsLCBbc2hhZGVyVGV4dFs0XSwgc2hhZGVyVGV4dFs1XV0pO1xuICAgIHZhciBwcm9ncmFtNCA9IGNyZWF0ZVByb2dyYW1Gcm9tU291cmNlcyhnbCwgW3NoYWRlclRleHRbNl0sIHNoYWRlclRleHRbN11dKTtcbiAgICBtYWluKGdsLCBbcHJvZ3JhbTEsIHByb2dyYW0yLCBwcm9ncmFtMywgcHJvZ3JhbTRdKTtcbiAgfSwgZnVuY3Rpb24gKHVybCkge1xuICAgICAgYWxlcnQoJ1NoYWRlciBmYWlsZWQgdG8gZG93bmxvYWQgXCInICsgdXJsICsgJ1wiJyk7XG4gIH0pOyBcbn1cblxudmFyIGNsb2NrID0gMDtcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyB3ZWJHTCBpcyBzZXQgdXAsIGFuZCBvdXIgU2hhZGVyIHByb2dyYW0gaGFzIGJlZW4gY3JlYXRlZC4gIEZpbmlzaCBzZXR0aW5nIHVwIG91ciB3ZWJHTCBhcHBsaWNhdGlvbiAgICAgICBcbmZ1bmN0aW9uIG1haW4oZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgcHJvZ3JhbTogV2ViR0xQcm9ncmFtW10pIHtcbiAgXG4gIC8vIHVzZSB0aGUgd2ViZ2wtdXRpbHMgbGlicmFyeSB0byBjcmVhdGUgc2V0dGVycyBmb3IgYWxsIHRoZSB1bmlmb3JtcyBhbmQgYXR0cmlidXRlcyBpbiBvdXIgc2hhZGVycy5cbiAgLy8gSXQgZW51bWVyYXRlcyBhbGwgb2YgdGhlIHVuaWZvcm1zIGFuZCBhdHRyaWJ1dGVzIGluIHRoZSBwcm9ncmFtLCBhbmQgY3JlYXRlcyB1dGlsaXR5IGZ1bmN0aW9ucyB0byBcbiAgLy8gYWxsb3cgXCJzZXRVbmlmb3Jtc1wiIGFuZCBcInNldEF0dHJpYnV0ZXNcIiAoYmVsb3cpIHRvIHNldCB0aGUgc2hhZGVyIHZhcmlhYmxlcyBmcm9tIGEgamF2YXNjcmlwdCBvYmplY3QuIFxuICAvLyBUaGUgb2JqZWN0cyBoYXZlIGEga2V5IGZvciBlYWNoIHVuaWZvcm0gb3IgYXR0cmlidXRlLCBhbmQgYSB2YWx1ZSBjb250YWluaW5nIHRoZSBwYXJhbWV0ZXJzIGZvciB0aGVcbiAgLy8gc2V0dGVyIGZ1bmN0aW9uXG5cbiAgLy92YXIgdW5pZm9ybVNldHRlcnMgPSBjcmVhdGVVbmlmb3JtU2V0dGVycyhnbCwgcHJvZ3JhbSk7XG4gIC8vdmFyIGF0dHJpYlNldHRlcnMgID0gY3JlYXRlQXR0cmlidXRlU2V0dGVycyhnbCwgcHJvZ3JhbSk7XG5cbiAgLy8gYW4gaW5kZXhlZCBxdWFkXG4gIHZhciBhcnJheXMgPSB7XG4gICAgIHBvc2l0aW9uOiB7IG51bUNvbXBvbmVudHM6IDMsIGRhdGE6IFtdLCB9LFxuICAgICB0ZXhjb29yZDogeyBudW1Db21wb25lbnRzOiAyLCBkYXRhOiBbXSwgfSxcbiAgICAgbm9ybWFsOiAgIHsgbnVtQ29tcG9uZW50czogMywgZGF0YTogW10sIH0sXG4gICAgIGluZGljZXM6ICB7IG51bUNvbXBvbmVudHM6IDMsIGRhdGE6IFtdLCB9LFxuICB9O1xuICAvL1NldHMgdXAgcXVhZCB0byBoYXZlIDE2IHggMTYgdmVydGljZXNcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCAxNjsgaisrKSB7XG4gICAgICBhcnJheXMucG9zaXRpb24uZGF0YS5wdXNoKGkqKDEwLzE2KSwgaiooMTAvMTYpLCAwKTtcbiAgICAgIGFycmF5cy5ub3JtYWwuZGF0YS5wdXNoKDAsIDAsIC0xKTtcbiAgICAgIGFycmF5cy50ZXhjb29yZC5kYXRhLnB1c2goMS0oaS8xNiksIDEtKGovMTYpKTtcbiAgICB9XG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNTsgaSsrKSB7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCAxNTsgaisrKSB7XG4gICAgICBhcnJheXMuaW5kaWNlcy5kYXRhLnB1c2goaStqKjE2LCBpK2oqMTYrMSwgaSsoKGorMSkqMTYpKTtcbiAgICAgIGFycmF5cy5pbmRpY2VzLmRhdGEucHVzaChpK2oqMTYrMSwgKGorMSkqMTYraSwgKGorMSkqMTYraSsxKTtcbiAgICB9XG4gIH1cblxuICB2YXIgY2VudGVyID0gWzUsNSwwXTtcbiAgdmFyIHNjYWxlRmFjdG9yID0gMjA7XG4gIFxuICB2YXIgYnVmZmVySW5mbyA9IGNyZWF0ZUJ1ZmZlckluZm9Gcm9tQXJyYXlzKGdsLCBhcnJheXMpO1xuICBcbiAgZnVuY3Rpb24gZGVnVG9SYWQoZCkge1xuICAgIHJldHVybiBkICogTWF0aC5QSSAvIDE4MDtcbiAgfVxuXG4gIHZhciBjYW1lcmFBbmdsZVJhZGlhbnMgPSBkZWdUb1JhZCgwKTtcbiAgdmFyIGZpZWxkT2ZWaWV3UmFkaWFucyA9IGRlZ1RvUmFkKDYwKTtcbiAgdmFyIGNhbWVyYUhlaWdodCA9IDUwO1xuXG4gIHZhciB1bmlmb3Jtc1RoYXRBcmVUaGVTYW1lRm9yQWxsT2JqZWN0cyA9IHtcbiAgICB1X2xpZ2h0V29ybGRQb3M6ICAgICAgICAgWzUwLCAzMCwgLTEwMF0sXG4gICAgdV92aWV3SW52ZXJzZTogICAgICAgICAgIG1hdDQuY3JlYXRlKCksXG4gICAgdV9saWdodENvbG9yOiAgICAgICAgICAgIFsxLCAxLCAxLCAxXSxcbiAgICB1X2FtYmllbnQ6ICAgICAgICAgICAgICAgWzAuMSwgMC4xLCAwLjEsIDAuMV0sXG4gICAgLy9BZGRlZCBmb3IgZ3JlZW4gc2NyZWVuIGVmZmVjdFxuICAgIHVfaW1hZ2UwOiAgICAgICAgICAgICAgICBnbC5jcmVhdGVUZXh0dXJlKCksXG4gICAgdV9pbWFnZTE6ICAgICAgICAgICAgICAgIGdsLmNyZWF0ZVRleHR1cmUoKSxcbiAgICAvL0FkZGVkIGZvciB3YXJibGVcbiAgICB1X2Nsb2NrOiAgICAgICAgICAgICAgICAgMC4wXG4gIH07XG5cbiAgdmFyIHVuaWZvcm1zVGhhdEFyZUNvbXB1dGVkRm9yRWFjaE9iamVjdCA9IHtcbiAgICB1X3dvcmxkVmlld1Byb2plY3Rpb246ICAgbWF0NC5jcmVhdGUoKSxcbiAgICB1X3dvcmxkOiAgICAgICAgICAgICAgICAgbWF0NC5jcmVhdGUoKSxcbiAgICB1X3dvcmxkSW52ZXJzZVRyYW5zcG9zZTogbWF0NC5jcmVhdGUoKSxcbiAgfTtcblxuXG4gIHZhciBiYXNlQ29sb3IgPSByYW5kKDI0MCk7XG4gIHZhciBvYmplY3RTdGF0ZSA9IHsgXG4gICAgICBtYXRlcmlhbFVuaWZvcm1zOiB7XG4gICAgICAgIHVfY29sb3JNdWx0OiAgICAgICAgICAgICBjaHJvbWEuaHN2KHJhbmQoYmFzZUNvbG9yLCBiYXNlQ29sb3IgKyAxMjApLCAwLjUsIDEpLmdsKCksXG4gICAgICAgIC8vdV9kaWZmdXNlOiAgICAgICAgICAgICAgIHRleHR1cmUsXG4gICAgICAgIHVfc3BlY3VsYXI6ICAgICAgICAgICAgICBbMSwgMSwgMSwgMV0sXG4gICAgICAgIHVfc2hpbmluZXNzOiAgICAgICAgICAgICA0NTAsXG4gICAgICAgIHVfc3BlY3VsYXJGYWN0b3I6ICAgICAgICAwLjc1LFxuICAgICAgfVxuICB9O1xuXG4gIC8vIHNvbWUgdmFyaWFibGVzIHdlJ2xsIHJldXNlIGJlbG93XG4gIHZhciBwcm9qZWN0aW9uTWF0cml4ID0gbWF0NC5jcmVhdGUoKTtcbiAgdmFyIHZpZXdNYXRyaXggPSBtYXQ0LmNyZWF0ZSgpO1xuICB2YXIgcm90YXRpb25NYXRyaXggPSBtYXQ0LmNyZWF0ZSgpO1xuICB2YXIgbWF0cml4ID0gbWF0NC5jcmVhdGUoKTsgIC8vIGEgc2NyYXRjaCBtYXRyaXhcbiAgdmFyIGludk1hdHJpeCA9IG1hdDQuY3JlYXRlKCk7XG4gIHZhciBheGlzVmVjdG9yID0gdmVjMy5jcmVhdGUoKTtcbiAgXG4gIC8vQ3JlYXRpbmcgb3VyIHR3byB0ZXh0dXJlc1xuICB2YXIgdGV4dHVyZTEgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gIHZhciBpbWFnZTEgPSBuZXcgSW1hZ2UoKTtcbiAgaW1hZ2UxLnNyYyA9IFwicmVzb3VyY2VzL3RleHR1cmUxLmpwZ1wiO1xuICBpbWFnZTEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZTEpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBLCBnbC5SR0JBLGdsLlVOU0lHTkVEX0JZVEUsIGltYWdlMSk7XG4gIH07XG4gIFxuICB2YXIgdGV4dHVyZTIgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gIHZhciBpbWFnZTIgPSBuZXcgSW1hZ2UoKTtcbiAgaW1hZ2UyLnNyYyA9IFwicmVzb3VyY2VzL3RleHR1cmUyLmpwZ1wiO1xuICBpbWFnZTIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZTIpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG4gICAgZ2wudGV4SW1hZ2UyRChnbC5URVhUVVJFXzJELCAwLCBnbC5SR0JBLCBnbC5SR0JBLGdsLlVOU0lHTkVEX0JZVEUsIGltYWdlMik7XG4gIH07XG5cbiAgdW5pZm9ybXNUaGF0QXJlVGhlU2FtZUZvckFsbE9iamVjdHMudV9pbWFnZTAgPSB0ZXh0dXJlMTtcbiAgdW5pZm9ybXNUaGF0QXJlVGhlU2FtZUZvckFsbE9iamVjdHMudV9pbWFnZTEgPSB0ZXh0dXJlMjtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXdTY2VuZSk7XG5cbiAgLy8gRHJhdyB0aGUgc2NlbmUuXG4gIGZ1bmN0aW9uIGRyYXdTY2VuZSh0aW1lOiBudW1iZXIpIHtcbiAgICB0aW1lICo9IDAuMDAxOyBcbiAgICAvL2NvbnNvbGUubG9nKHVuaWZvcm1zVGhhdEFyZVRoZVNhbWVGb3JBbGxPYmplY3RzLnVfY2xvY2spO1xuICAgIC8vIG1lYXN1cmUgdGltZSB0YWtlbiBmb3IgdGhlIGxpdHRsZSBzdGF0cyBtZXRlclxuICAgIHN0YXRzLmJlZ2luKCk7XG5cbiAgICAvLyBpZiB0aGUgd2luZG93IGNoYW5nZWQgc2l6ZSwgcmVzZXQgdGhlIFdlYkdMIGNhbnZhcyBzaXplIHRvIG1hdGNoLiAgVGhlIGRpc3BsYXllZCBzaXplIG9mIHRoZSBjYW52YXNcbiAgICAvLyAoZGV0ZXJtaW5lZCBieSB3aW5kb3cgc2l6ZSwgbGF5b3V0LCBhbmQgeW91ciBDU1MpIGlzIHNlcGFyYXRlIGZyb20gdGhlIHNpemUgb2YgdGhlIFdlYkdMIHJlbmRlciBidWZmZXJzLCBcbiAgICAvLyB3aGljaCB5b3UgY2FuIGNvbnRyb2wgYnkgc2V0dGluZyBjYW52YXMud2lkdGggYW5kIGNhbnZhcy5oZWlnaHRcbiAgICByZXNpemVDYW52YXNUb0Rpc3BsYXlTaXplKGNhbnZhcyk7XG5cbiAgICAvLyBTZXQgdGhlIHZpZXdwb3J0IHRvIG1hdGNoIHRoZSBjYW52YXNcbiAgICBnbC52aWV3cG9ydCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgIFxuICAgIC8vIENsZWFyIHRoZSBjYW52YXMgQU5EIHRoZSBkZXB0aCBidWZmZXIuXG4gICAgZ2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCB8IGdsLkRFUFRIX0JVRkZFUl9CSVQpO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgcHJvamVjdGlvbiBtYXRyaXhcbiAgICB2YXIgYXNwZWN0ID0gY2FudmFzLmNsaWVudFdpZHRoIC8gY2FudmFzLmNsaWVudEhlaWdodDtcbiAgICBtYXQ0LnBlcnNwZWN0aXZlKHByb2plY3Rpb25NYXRyaXgsZmllbGRPZlZpZXdSYWRpYW5zLCBhc3BlY3QsIDEsIDIwMDApO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgY2FtZXJhJ3MgbWF0cml4IHVzaW5nIGxvb2sgYXQuXG4gICAgdmFyIGNhbWVyYVBvc2l0aW9uID0gWzAsIDAsIC0yMDBdO1xuICAgIHZhciB0YXJnZXQgPSBbMCwgMCwgMF07XG4gICAgdmFyIHVwID0gWzAsIDEsIDBdO1xuICAgIHZhciBjYW1lcmFNYXRyaXggPSBtYXQ0Lmxvb2tBdCh1bmlmb3Jtc1RoYXRBcmVUaGVTYW1lRm9yQWxsT2JqZWN0cy51X3ZpZXdJbnZlcnNlLCBjYW1lcmFQb3NpdGlvbiwgdGFyZ2V0LCB1cCk7XG5cbiAgICAvLyBNYWtlIGEgdmlldyBtYXRyaXggZnJvbSB0aGUgY2FtZXJhIG1hdHJpeC5cbiAgICBtYXQ0LmludmVydCh2aWV3TWF0cml4LCBjYW1lcmFNYXRyaXgpO1xuICAgIFxuICAgIFxuICAgIFxuICAgIC8vIHRlbGwgV2ViR0wgdG8gdXNlIG91ciBzaGFkZXIgcHJvZ3JhbVxuICAgIGlmIChjdXJyZW50U2hhZGVyID09IDEpIHtcbiAgICAgIGdsLnVzZVByb2dyYW0ocHJvZ3JhbVswXSk7XG4gICAgfSBlbHNlIGlmIChjdXJyZW50U2hhZGVyID09IDIpIHtcbiAgICAgIGdsLnVzZVByb2dyYW0ocHJvZ3JhbVsxXSk7XG4gICAgfSBlbHNlIGlmIChjdXJyZW50U2hhZGVyID09IDMpIHtcbiAgICAgIGdsLnVzZVByb2dyYW0ocHJvZ3JhbVsyXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdsLnVzZVByb2dyYW0ocHJvZ3JhbVszXSk7XG4gICAgfVxuICAgIFxuICAgIGlmIChjdXJyZW50U2hhZGVyID09IDEpIHtcbiAgICB2YXIgdW5pZm9ybVNldHRlcnMgPSBjcmVhdGVVbmlmb3JtU2V0dGVycyhnbCwgcHJvZ3JhbVswXSk7XG4gICAgdmFyIGF0dHJpYlNldHRlcnMgID0gY3JlYXRlQXR0cmlidXRlU2V0dGVycyhnbCwgcHJvZ3JhbVswXSk7ICBcbiAgfSBlbHNlIGlmIChjdXJyZW50U2hhZGVyID09IDIpIHtcbiAgICB2YXIgdW5pZm9ybVNldHRlcnMgPSBjcmVhdGVVbmlmb3JtU2V0dGVycyhnbCwgcHJvZ3JhbVsxXSk7XG4gICAgdmFyIGF0dHJpYlNldHRlcnMgID0gY3JlYXRlQXR0cmlidXRlU2V0dGVycyhnbCwgcHJvZ3JhbVsxXSk7XG4gIH0gZWxzZSBpZiAoY3VycmVudFNoYWRlciA9PSAzKSB7XG4gICAgdmFyIHVuaWZvcm1TZXR0ZXJzID0gY3JlYXRlVW5pZm9ybVNldHRlcnMoZ2wsIHByb2dyYW1bMl0pO1xuICAgIHZhciBhdHRyaWJTZXR0ZXJzICA9IGNyZWF0ZUF0dHJpYnV0ZVNldHRlcnMoZ2wsIHByb2dyYW1bMl0pO1xuICB9IGVsc2Uge1xuICAgIHVuaWZvcm1zVGhhdEFyZVRoZVNhbWVGb3JBbGxPYmplY3RzLnVfY2xvY2sgPSBjbG9jaztcbiAgICBjbG9jays9MC4xO1xuICAgIHZhciB1bmlmb3JtU2V0dGVycyA9IGNyZWF0ZVVuaWZvcm1TZXR0ZXJzKGdsLCBwcm9ncmFtWzNdKTtcbiAgICB2YXIgYXR0cmliU2V0dGVycyAgPSBjcmVhdGVBdHRyaWJ1dGVTZXR0ZXJzKGdsLCBwcm9ncmFtWzNdKTtcbiAgfVxuXG4gICAgLy8gU2V0dXAgYWxsIHRoZSBuZWVkZWQgYXR0cmlidXRlcyBhbmQgYnVmZmVycy4gXG4gICAgc2V0QnVmZmVyc0FuZEF0dHJpYnV0ZXMoZ2wsIGF0dHJpYlNldHRlcnMsIGJ1ZmZlckluZm8pO1xuXG4gICAgLy8gU2V0IHRoZSB1bmlmb3JtcyB0aGF0IGFyZSB0aGUgc2FtZSBmb3IgYWxsIG9iamVjdHMuICBVbmxpa2UgdGhlIGF0dHJpYnV0ZXMsIGVhY2ggdW5pZm9ybSBzZXR0ZXJcbiAgICAvLyBpcyBkaWZmZXJlbnQsIGRlcGVuZGluZyBvbiB0aGUgdHlwZSBvZiB0aGUgdW5pZm9ybSB2YXJpYWJsZS4gIExvb2sgaW4gd2ViZ2wtdXRpbC5qcyBmb3IgdGhlXG4gICAgLy8gaW1wbGVtZW50YXRpb24gb2YgIHNldFVuaWZvcm1zIHRvIHNlZSB0aGUgZGV0YWlscyBmb3Igc3BlY2lmaWMgdHlwZXMgICAgICAgICAgIFxuICAgIHNldFVuaWZvcm1zKHVuaWZvcm1TZXR0ZXJzLCB1bmlmb3Jtc1RoYXRBcmVUaGVTYW1lRm9yQWxsT2JqZWN0cyk7XG4gICBcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gQ29tcHV0ZSB0aGUgdmlldyBtYXRyaXggYW5kIGNvcnJlc3BvbmRpbmcgb3RoZXIgbWF0cmljZXMgZm9yIHJlbmRlcmluZy5cbiAgICBcbiAgICAvLyBmaXJzdCBtYWtlIGEgY29weSBvZiBvdXIgcm90YXRpb25NYXRyaXhcbiAgICBtYXQ0LmNvcHkobWF0cml4LCByb3RhdGlvbk1hdHJpeCk7XG4gICAgXG4gICAgLy8gYWRqdXN0IHRoZSByb3RhdGlvbiBiYXNlZCBvbiBtb3VzZSBhY3Rpdml0eS4gIG1vdXNlQW5nbGVzIGlzIHNldCBpZiB1c2VyIGlzIGRyYWdnaW5nIFxuICAgIGlmIChtb3VzZUFuZ2xlc1swXSAhPT0gMCB8fCBtb3VzZUFuZ2xlc1sxXSAhPT0gMCkge1xuICAgICAgLypcbiAgICAgICAqIG9ubHkgcm90YXRlIGFyb3VuZCBZLCB1c2UgdGhlIHNlY29uZCBtb3VzZSB2YWx1ZSBmb3Igc2NhbGUuICBMZWF2aW5nIHRoZSBvbGQgY29kZSBmcm9tIEEzIFxuICAgICAgICogaGVyZSwgY29tbWVudGVkIG91dFxuICAgICAgICogXG4gICAgICAvLyBuZWVkIGFuIGludmVyc2Ugd29ybGQgdHJhbnNmb3JtIHNvIHdlIGNhbiBmaW5kIG91dCB3aGF0IHRoZSB3b3JsZCBYIGF4aXMgZm9yIG91ciBmaXJzdCByb3RhdGlvbiBpc1xuICAgICAgbWF0NC5pbnZlcnQoaW52TWF0cml4LCBtYXRyaXgpO1xuICAgICAgLy8gZ2V0IHRoZSB3b3JsZCBYIGF4aXNcbiAgICAgIHZhciB4QXhpcyA9IHZlYzMudHJhbnNmb3JtTWF0NChheGlzVmVjdG9yLCB2ZWMzLmZyb21WYWx1ZXMoMSwwLDApLCBpbnZNYXRyaXgpO1xuXG4gICAgICAvLyByb3RhdGUgYWJvdXQgdGhlIHdvcmxkIFggYXhpcyAodGhlIFggcGFyYWxsZWwgdG8gdGhlIHNjcmVlbiEpXG4gICAgICBtYXQ0LnJvdGF0ZShtYXRyaXgsIG1hdHJpeCwgLW1vdXNlQW5nbGVzWzFdLCB4QXhpcyk7XG4gICAgICAqL1xuICAgICAgICAgICAgXG4gICAgICAvLyBub3cgZ2V0IHRoZSBpbnZlcnNlIHdvcmxkIHRyYW5zZm9ybSBzbyB3ZSBjYW4gZmluZCB0aGUgd29ybGQgWSBheGlzXG4gICAgICBtYXQ0LmludmVydChpbnZNYXRyaXgsIG1hdHJpeCk7XG4gICAgICAvLyBnZXQgdGhlIHdvcmxkIFkgYXhpc1xuICAgICAgdmFyIHlBeGlzID0gdmVjMy50cmFuc2Zvcm1NYXQ0KGF4aXNWZWN0b3IsIHZlYzMuZnJvbVZhbHVlcygwLDEsMCksIGludk1hdHJpeCk7XG5cbiAgICAgIC8vIHJvdGF0ZSBhYm91dCB0ZWggd29ybGQgWSBheGlzXG4gICAgICBtYXQ0LnJvdGF0ZShtYXRyaXgsIG1hdHJpeCwgbW91c2VBbmdsZXNbMF0sIHlBeGlzKTtcbiAgICAgIFxuICAgICAgLy8gc2F2ZSB0aGUgcmVzdWx0aW5nIG1hdHJpeCBiYWNrIHRvIHRoZSBjdW11bGF0aXZlIHJvdGF0aW9uIG1hdHJpeCBcbiAgICAgIG1hdDQuY29weShyb3RhdGlvbk1hdHJpeCwgbWF0cml4KTtcbiAgICAgIFxuICAgICAgLy8gdXNlIG1vdXNlQW5nbGVzWzFdIHRvIHNjYWxlXG4gICAgICBzY2FsZUZhY3RvciArPSBtb3VzZUFuZ2xlc1sxXTtcbiAgICAgIFxuICAgICAgdmVjMi5zZXQobW91c2VBbmdsZXMsIDAsIDApOyAgICAgICAgXG4gICAgfSAgIFxuXG4gICAgLy8gYWRkIGEgdHJhbnNsYXRlIGFuZCBzY2FsZSB0byB0aGUgb2JqZWN0IFdvcmxkIHhmb3JtLCBzbyB3ZSBoYXZlOiAgUiAqIFQgKiBTXG4gICAgbWF0NC50cmFuc2xhdGUobWF0cml4LCByb3RhdGlvbk1hdHJpeCwgWy1jZW50ZXJbMF0qc2NhbGVGYWN0b3IsIC1jZW50ZXJbMV0qc2NhbGVGYWN0b3IsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtY2VudGVyWzJdKnNjYWxlRmFjdG9yXSk7XG4gICAgbWF0NC5zY2FsZShtYXRyaXgsIG1hdHJpeCwgW3NjYWxlRmFjdG9yLCBzY2FsZUZhY3Rvciwgc2NhbGVGYWN0b3JdKTtcbiAgICBtYXQ0LmNvcHkodW5pZm9ybXNUaGF0QXJlQ29tcHV0ZWRGb3JFYWNoT2JqZWN0LnVfd29ybGQsIG1hdHJpeCk7XG4gICAgXG4gICAgLy8gZ2V0IHByb2ogKiB2aWV3ICogd29ybGRcbiAgICBtYXQ0Lm11bHRpcGx5KG1hdHJpeCwgdmlld01hdHJpeCwgdW5pZm9ybXNUaGF0QXJlQ29tcHV0ZWRGb3JFYWNoT2JqZWN0LnVfd29ybGQpO1xuICAgIG1hdDQubXVsdGlwbHkodW5pZm9ybXNUaGF0QXJlQ29tcHV0ZWRGb3JFYWNoT2JqZWN0LnVfd29ybGRWaWV3UHJvamVjdGlvbiwgcHJvamVjdGlvbk1hdHJpeCwgbWF0cml4KTtcblxuICAgIC8vIGdldCB3b3JsZEludlRyYW5zcG9zZS4gIEZvciBhbiBleHBsYWluYXRpb24gb2Ygd2h5IHdlIG5lZWQgdGhpcywgZm9yIGZpeGluZyB0aGUgbm9ybWFscywgc2VlXG4gICAgLy8gaHR0cDovL3d3dy51bmtub3ducm9hZC5jb20vcnRmbS9ncmFwaGljcy9ydF9ub3JtYWxzLmh0bWxcbiAgICBtYXQ0LnRyYW5zcG9zZSh1bmlmb3Jtc1RoYXRBcmVDb21wdXRlZEZvckVhY2hPYmplY3QudV93b3JsZEludmVyc2VUcmFuc3Bvc2UsIFxuICAgICAgICAgICAgICAgICAgIG1hdDQuaW52ZXJ0KG1hdHJpeCwgdW5pZm9ybXNUaGF0QXJlQ29tcHV0ZWRGb3JFYWNoT2JqZWN0LnVfd29ybGQpKTtcblxuICAgIC8vIFNldCB0aGUgdW5pZm9ybXMgd2UganVzdCBjb21wdXRlZFxuICAgIHNldFVuaWZvcm1zKHVuaWZvcm1TZXR0ZXJzLCB1bmlmb3Jtc1RoYXRBcmVDb21wdXRlZEZvckVhY2hPYmplY3QpO1xuXG4gICAgLy8gU2V0IHRoZSB1bmlmb3JtcyB0aGF0IGFyZSBzcGVjaWZpYyB0byB0aGUgdGhpcyBvYmplY3QuXG4gICAgc2V0VW5pZm9ybXModW5pZm9ybVNldHRlcnMsIG9iamVjdFN0YXRlLm1hdGVyaWFsVW5pZm9ybXMpO1xuXG4gICAgLy8gRHJhdyB0aGUgZ2VvbWV0cnkuICAgRXZlcnl0aGluZyBpcyBrZXllZCB0byB0aGUgXCJcIlxuICAgIGdsLmRyYXdFbGVtZW50cyhnbC5UUklBTkdMRVMsIGJ1ZmZlckluZm8ubnVtRWxlbWVudHMsIGdsLlVOU0lHTkVEX1NIT1JULCAwKTtcblxuICAgIC8vIHN0YXRzIG1ldGVyXG4gICAgc3RhdHMuZW5kKCk7XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhd1NjZW5lKTtcbiAgfVxufVxuXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
