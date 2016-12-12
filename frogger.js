//webGL globals
var gl = null, imageContext;
var frog_obj = null, car_obj = null;
var rttFramebuffer = null;
var rttTexture = null;
var CANVAS_WIDTH = 512;
var CANVAS_HEIGHT = 512;

//shader params
var vPosAttr, vNormAttr, vColorAttr, vTexAttr;
var oMatrixUniform, pMatrixUniform, mvMatrixUniform, lmvMatrixUniform, nMatrixUniform;
var lightUniform, SamplerUniform0, SamplerUniform1, useTexUniform, useTexNormalUniform;
var numTexUniform;
var vertexBuffer, normalBuffer, triangleBuffer, colorBuffer, texBuffer;

//camera/view globals
var Eye = [0,0,-3/5];
var Light = vec3.fromValues(-1,0,-2);
var LookAt = [0,0,0], LookUp = [0,1,0];
var OrthoProjMatrix, PerspProjMatrix, MVMatrix, NMatrix, LightMVMatrix;

//model globals
var numCars, numTrucks, numLogs, numTurtles;
var yCars, yTrucks;
var yTurtles, yLogs;
var triIndexArr=[], vPosArr=[], vNormArr=[], vTransform=[], vColorArr=[], vTexArr=[];
var numArrays=0;
var vColor=[];
var FROG_SCALE = 100, CUBOID_SCALE = 512, CAR_SCALE = 1000;
var cur_orientation = 3;
var frog_texture = new Array(), scene_texture = new Array(), car_texture = new Array();
var car_texture = null, truck_texture = null, log_texture = null;
var scene_loaded = 0;
var no_jump = 1;
var cur_position = [], final_position = [], initial_position = [];
var jump_speed = 8;
var num_lives = 3, old_num_lives = 3;

//sound and misc
var hop, drown, squash, win, gameover;

function jump(){
    if(no_jump == 0)
        requestAnimationFrame(jump);
    if(Math.floor(cur_position[0])==final_position[0] && Math.floor(cur_position[1])==final_position[1] && Math.floor(cur_position[2])==final_position[2]){
        no_jump = 1;
        return;
    }
    else{
        var x=0,y=0,z=0;
        if(cur_position[0] < final_position[0]) x = jump_speed;
        else if(cur_position[0] > final_position[0]) x = -jump_speed;
        if(cur_position[1] < final_position[1]) y = jump_speed;
        else if(cur_position[1] > final_position[1]) y = -jump_speed;
        
        if(x!=0 && final_position[2]==0){
            if(Math.abs(cur_position[0]) >= Math.abs(final_position[0]/2))
                z = jump_speed;
            else
                z = -jump_speed;
        }else if(y!=0 && final_position[2]==0){
            if(Math.abs(cur_position[1]) >= Math.abs(final_position[1]/2))
                z = jump_speed;
            else
                z = -jump_speed;
        }else if(Math.abs(cur_position[2]) != Math.abs(final_position[2])){
                z = jump_speed/2*(final_position[2]-cur_position[2])/Math.abs(final_position[2]-cur_position[2]);
        }
        cur_position[0] = cur_position[0] + x;
        cur_position[1] = cur_position[1] + y;
        cur_position[2] = cur_position[2] + z;
        
        mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),vec3.fromValues(x/CUBOID_SCALE,y/CUBOID_SCALE,z/CUBOID_SCALE)),vTransform[5]);
    }
}

var dead = 0;
var road = 0;
var cur_dead = 0;
function deadFrog(){
    if(dead){
        requestAnimationFrame(deadFrog);
    }
    else{
        var trans_frog = mat4.getTranslation(vec3.create(),vTransform[5]);
        trans_frog[1] -= 15/CUBOID_SCALE;
        if(road == 1)
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),vec3.fromValues(1/2-trans_frog[0],-1*trans_frog[1],(cur_dead-16)/CUBOID_SCALE)),vTransform[5]);
        else if(road == -1)
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),vec3.fromValues(1/2-trans_frog[0],-1*trans_frog[1],(-1*cur_dead)/CUBOID_SCALE)),vTransform[5]);
        cur_dead = 0;
        old_num_lives = num_lives;
        num_lives--;
        if(num_lives == 0){
            gameover.play();
            gameover.currentTime = 0;
        }
        return;
    }
    if(cur_dead == 100){
        dead = 0;
        return;
    }
    mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),vec3.fromValues(0,0,-1*road*4/CUBOID_SCALE)),vTransform[5]);
    cur_dead += 4;
}

function animateFrog(event){
    if(no_jump ==0 || dead == 1)
        return;
    var trans = mat4.getTranslation(vec3.create(),vTransform[5]);
    trans[0] -= 1/2; trans[1] -= 15/CUBOID_SCALE;

    hop.play();
    hop.currentTime = 0;
    switch(event.code){
        case "ArrowRight":
            var angle = 0;
            if(cur_orientation == 2)
                angle = Math.PI;
            else if(cur_orientation == 3)
                angle = 3*Math.PI/2;
            else if(cur_orientation == 4)
                angle = Math.PI/2;
            cur_orientation = 1;
            
            var old_trans = mat4.getTranslation(vec3.create(),vTransform[5]);
            vec3.scale(old_trans,old_trans,-1);
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),old_trans),vTransform[5]);
            mat4.multiply(vTransform[5],mat4.fromZRotation(mat4.create(),angle),vTransform[5]);
            vec3.scale(old_trans,old_trans,-1);
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),old_trans),vTransform[5]);
            
            if(trans[0]*CUBOID_SCALE >= 240)
                break;
            no_jump = 0;
            final_position = [16,0,0];
            cur_position = [0,0,0];
            jump();
            break;
            
        case "ArrowLeft":
            no_jump = 1;
            var angle = 0;
            if(cur_orientation == 1)
                angle = Math.PI;
            else if(cur_orientation == 3)
                angle = Math.PI/2;
            else if(cur_orientation == 4)
                angle = -1*Math.PI/2;
            cur_orientation = 2;

            var old_trans = mat4.getTranslation(vec3.create(),vTransform[5]);
            vec3.scale(old_trans,old_trans,-1);
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),old_trans),vTransform[5]);
            mat4.multiply(vTransform[5],mat4.fromZRotation(mat4.create(),angle),vTransform[5]);
            vec3.scale(old_trans,old_trans,-1);
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),old_trans),vTransform[5]);
            
            if(trans[0]*CUBOID_SCALE <=-240)
                break;
            no_jump = 0;
            final_position = [-16,0,0];
            cur_position = [0,0,0];
            jump();
            break;
            
        case "ArrowUp":
            var angle = 0;
            if(cur_orientation == 1)
                angle = Math.PI/2;
            else if(cur_orientation == 2)
                angle = -1*Math.PI/2;
            else if(cur_orientation == 4)
                angle = Math.PI;
            
            cur_orientation = 3;
            
            var old_trans = mat4.getTranslation(vec3.create(),vTransform[5]);
            vec3.scale(old_trans,old_trans,-1);
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),old_trans),vTransform[5]);
            mat4.multiply(vTransform[5],mat4.fromZRotation(mat4.create(),angle),vTransform[5]);
            vec3.scale(old_trans,old_trans,-1);
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),old_trans),vTransform[5]);
            
            if(trans[1]*CUBOID_SCALE >= 480)
                break;
            if(Math.floor(trans[1]*CUBOID_SCALE)==0)
                final_position = [0,32,16];
            else if(Math.floor(trans[1]*CUBOID_SCALE)==192)
                final_position = [0,48,-16];
            else if(trans[1]*CUBOID_SCALE >= 432)
                final_position = [0,48,0];
            else if(trans[1]*CUBOID_SCALE >= 240)
                final_position = [0,64,0];
            else
                final_position = [0,32,0];
            no_jump = 0;
            cur_position = [0,0,0];
            jump();
            break;
            
        case "ArrowDown":
            var angle = 0;
            if(cur_orientation == 1)
                angle = -1*Math.PI/2;
            else if(cur_orientation == 2)
                angle = Math.PI/2;
            else if(cur_orientation == 3)
                angle = Math.PI;
            
            cur_orientation = 4;
            
            var old_trans = mat4.getTranslation(vec3.create(),vTransform[5]);
            vec3.scale(old_trans,old_trans,-1);
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),old_trans),vTransform[5]);
            mat4.multiply(vTransform[5],mat4.fromZRotation(mat4.create(),angle),vTransform[5]);
            vec3.scale(old_trans,old_trans,-1);
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),old_trans),vTransform[5]);
            
            if(trans[1]*CUBOID_SCALE <= 0)
                break;
            if(Math.floor(trans[1]*CUBOID_SCALE)==240)
                final_position = [0,-48,16];
            else if(Math.floor(trans[1]*CUBOID_SCALE)==32)
                final_position = [0,-32,-16];
            else if(Math.floor(trans[1]*CUBOID_SCALE)==6*32+48)
                final_position = [0,-48,0];
            else if(Math.floor(trans[1]*CUBOID_SCALE == 480))
                final_position = [0,-48,0];
            else if(trans[1]*CUBOID_SCALE > 6*32+48)
                final_position = [0,-64,0];
            else
                final_position = [0,-32,0];
            no_jump = 0;
            cur_position = [0,0,0];
            jump();
            break;
    }
}

function writeCanvas(){
    imageContext.font="30px Georgia";
    var gradient=imageContext.createLinearGradient(0,0,512,0);
    gradient.addColorStop("0","magenta");
    gradient.addColorStop("0.5","blue");
    gradient.addColorStop("1.0","red");
    imageContext.fillStyle=gradient;
    imageContext.fillText("Frogger!!",200,25);
    imageContext.font="20px Georgia";
    imageContext.fillStyle = '#ffffff';
    imageContext.fillText("Lives left: "+old_num_lives,350,25);
    imageContext.fillStyle = '#000000';
    imageContext.fillText("Lives left: "+num_lives,350,25);
}

function setupWebGL(){
    document.onkeydown = animateFrog;
    
    var imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
    var cw = imageCanvas.width, ch = imageCanvas.height;
    imageContext = imageCanvas.getContext("2d");
    
    // create a webgl canvas and set it up
    var webGLCanvas = document.getElementById("myWebGLCanvas"); // create a webgl canvas
    gl = webGLCanvas.getContext("webgl"); // get a webgl object from it
    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.enable(gl.DEPTH_TEST);
        }
    } // end try
    
    catch(e) {
        console.log(e);
    } // end catch
    
    frog_obj = document.getElementById('frog_obj').textContent;
    gl.viewport(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    
    hop = new Audio("hop.wav");
    drown = new Audio("drown.wav");
    squash = new Audio("squash.wav");
    win = new Audio("win.wav");
    gameover = new Audio("gameover.wav");
}

var count = 0;
function handleSceneTexture(){
    count++;
    console.log(count);
    if(count == 11){
        for(var i=0; i<numArrays; i++){
            if(i==5){
                for(var j=0; j<3; j++){
                    gl.bindTexture(gl.TEXTURE_2D,frog_texture[j]);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frog_texture[j].image);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
            }else if(i==6){
                gl.bindTexture(gl.TEXTURE_2D,car_texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, car_texture.image);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            else if(i==8){
                gl.bindTexture(gl.TEXTURE_2D,truck_texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, truck_texture.image);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            else if(i==10){
                gl.bindTexture(gl.TEXTURE_2D,log_texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, log_texture.image);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            else if(i==7 || i==9 || i==11 || i==12){
                
            }
            else{
                gl.bindTexture(gl.TEXTURE_2D,scene_texture[i]);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene_texture[i].image);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
        }
        scene_loaded = 1;
    }
}


var cuboidColor = [];
var xOffset=0, yOffset=0, zOffset=0;

function loadCuboid(k,l,b,h,i){
    //front face
    vPosArr[k].push(0+xOffset,0+yOffset,0+zOffset); vNormArr[k].push(0,0,-1); vTexArr[k].push(0,0);
    vPosArr[k].push(l+xOffset,0+yOffset,0+zOffset); vNormArr[k].push(0,0,-1); vTexArr[k].push(1,0);
    vPosArr[k].push(l+xOffset,b+yOffset,0+zOffset); vNormArr[k].push(0,0,-1); vTexArr[k].push(1,1);
    vPosArr[k].push(0+xOffset,b+yOffset,0+zOffset); vNormArr[k].push(0,0,-1); vTexArr[k].push(0,1);
    
    triIndexArr[k].push(0+24*i,1+24*i,2+24*i,0+24*i,2+24*i,3+24*i);
    
    //back face
    vPosArr[k].push(0+xOffset,0+yOffset,h+zOffset); vNormArr[k].push(0,0,1); vTexArr[k].push(0,0);
    vPosArr[k].push(l+xOffset,0+yOffset,h+zOffset); vNormArr[k].push(0,0,1); vTexArr[k].push(1,0);
    vPosArr[k].push(l+xOffset,b+yOffset,h+zOffset); vNormArr[k].push(0,0,1); vTexArr[k].push(1,1);
    vPosArr[k].push(0+xOffset,b+yOffset,h+zOffset); vNormArr[k].push(0,0,1); vTexArr[k].push(0,1);
    
    triIndexArr[k].push(4+24*i,5+24*i,6+24*i,4+24*i,6+24*i,7+24*i);
    
    //left face
    vPosArr[k].push(0+xOffset,0+yOffset,h+zOffset); vNormArr[k].push(-1,0,0); vTexArr[k].push(0,0);
    vPosArr[k].push(0+xOffset,0+yOffset,0+zOffset); vNormArr[k].push(-1,0,0); vTexArr[k].push(1,0);
    vPosArr[k].push(0+xOffset,b+yOffset,0+zOffset); vNormArr[k].push(-1,0,0); vTexArr[k].push(1,1);
    vPosArr[k].push(0+xOffset,b+yOffset,h+zOffset); vNormArr[k].push(-1,0,0); vTexArr[k].push(0,1);
    
    triIndexArr[k].push(8+24*i,9+24*i,10+24*i,8+24*i,10+24*i,11+24*i);
    
    //right face
    vPosArr[k].push(l+xOffset,0+yOffset,0+zOffset); vNormArr[k].push(1,0,0); vTexArr[k].push(0,0);
    vPosArr[k].push(l+xOffset,0+yOffset,h+zOffset); vNormArr[k].push(1,0,0); vTexArr[k].push(1,0);
    vPosArr[k].push(l+xOffset,b+yOffset,h+zOffset); vNormArr[k].push(1,0,0); vTexArr[k].push(1,1);
    vPosArr[k].push(l+xOffset,b+yOffset,0+zOffset); vNormArr[k].push(1,0,0); vTexArr[k].push(0,1);
    
    triIndexArr[k].push(12+24*i,13+24*i,14+24*i,12+24*i,14+24*i,15+24*i);
    
    //top face
    vPosArr[k].push(0+xOffset,b+yOffset,0+zOffset); vNormArr[k].push(0,1,0); vTexArr[k].push(0,0);
    vPosArr[k].push(l+xOffset,b+yOffset,0+zOffset); vNormArr[k].push(0,1,0); vTexArr[k].push(1,0);
    vPosArr[k].push(l+xOffset,b+yOffset,h+zOffset); vNormArr[k].push(0,1,0); vTexArr[k].push(1,1);
    vPosArr[k].push(0+xOffset,b+yOffset,h+zOffset); vNormArr[k].push(0,1,0); vTexArr[k].push(0,1);
    
    triIndexArr[k].push(16+24*i,17+24*i,18+24*i,16+24*i,18+24*i,19+24*i);
    
    //bottom face
    vPosArr[k].push(0+xOffset,0+yOffset,0+zOffset); vNormArr[k].push(0,-1,0); vTexArr[k].push(0,0);
    vPosArr[k].push(l+xOffset,0+yOffset,0+zOffset); vNormArr[k].push(0,-1,0); vTexArr[k].push(1,0);
    vPosArr[k].push(l+xOffset,0+yOffset,h+zOffset); vNormArr[k].push(0,-1,0); vTexArr[k].push(1,1);
    vPosArr[k].push(0+xOffset,0+yOffset,h+zOffset); vNormArr[k].push(0,-1,0); vTexArr[k].push(0,1);
    
    triIndexArr[k].push(20+24*i,21+24*i,22+24*i,20+24*i,22+24*i,23+24*i);
}

var cars_xoffset = new Array();
var cars_yoffset = new Array();

function loadCars(k,i){
    if(vPosArr[k] == null){
    vPosArr[k] = new Array();
    vNormArr[k] = new Array();
    vTexArr[k] = new Array();
    triIndexArr[k] = new Array();
    
        if(car_texture == null){
    car_texture = gl.createTexture();
    car_texture.image = new Image();
    car_texture.image.crossOrigin = "Anonymous";
    
    car_texture.image.onload = handleSceneTexture;
    car_texture.image.src = "https://swami1991.github.io/ncsu2.jpg";
        }
    }
    
    //console.log(vPosArr[k].length);
    loadCuboid(numArrays,64,20,16,i);

}

function loadTrucks(k,i){
    if(vPosArr[k] == null){
        vPosArr[k] = new Array();
        vNormArr[k] = new Array();
        vTexArr[k] = new Array();
        triIndexArr[k] = new Array();
        
        if(truck_texture == null){
        truck_texture = gl.createTexture();
        truck_texture.image = new Image();
        truck_texture.image.crossOrigin = "Anonymous";
        
        truck_texture.image.onload = handleSceneTexture;
        truck_texture.image.src = "https://swami1991.github.io/ncsu1.jpg";
        }
    }
    
    //console.log(vPosArr[k].length);
    loadCuboid(numArrays,128,20,16,i);
}

function loadTurtles(k){
}

function loadLogs(k,i){
    if(vPosArr[k] == null){
        vPosArr[k] = new Array();
        vNormArr[k] = new Array();
        vTexArr[k] = new Array();
        triIndexArr[k] = new Array();
        
        if(log_texture == null){
        log_texture = gl.createTexture();
        log_texture.image = new Image();
        log_texture.image.crossOrigin = "Anonymous";
        
        log_texture.image.onload = handleSceneTexture;
        log_texture.image.src = "https://swami1991.github.io/logs.jpg";
        }
    }
    
    loadCuboid(numArrays,128,32,24,i);
}

function loadRoad(){
    vPosArr[numArrays] = null;
    xOffset = 0; yOffset = 64; zOffset = 0;
    loadCars(numArrays,0);
    
    xOffset = 128; yOffset = 64; zOffset = 0;
    loadCars(numArrays,1);
    
    xOffset = 256; yOffset = 64; zOffset = 0;
    loadCars(numArrays,2);
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
    vPosArr[numArrays] = null;
    xOffset = 64; yOffset = 96; zOffset = 0;
    loadCars(numArrays,0);
    
    xOffset = 192; yOffset = 96; zOffset = 0;
    loadCars(numArrays,1);
    
    xOffset = 320; yOffset = 96; zOffset = 0;
    loadCars(numArrays,2);
    
    xOffset = 64; yOffset = 160; zOffset = 0;
    loadCars(numArrays,3);
    
    xOffset = 192; yOffset = 160; zOffset = 0;
    loadCars(numArrays,4);
    
    xOffset = 320; yOffset = 160; zOffset = 0;
    loadCars(numArrays,5);
    
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
    vPosArr[numArrays] = null;
    xOffset = 128; yOffset = 128; zOffset = 0;
    loadTrucks(numArrays,0);
    
    xOffset = 320; yOffset = 128; zOffset = 0;
    loadTrucks(numArrays,1);
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
    vPosArr[numArrays] = null;
    xOffset = 128; yOffset = 192; zOffset = 0;
    loadTrucks(numArrays,0);
    
    xOffset = 320; yOffset = 192; zOffset = 0;
    loadTrucks(numArrays,1);
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
}

function loadWater(){
    vPosArr[numArrays] = null;
    xOffset = 0; yOffset = 304; zOffset = 0;
    loadLogs(numArrays,0);
    
    xOffset = 256; yOffset = 304; zOffset = 0;
    loadLogs(numArrays,1);
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
    vPosArr[numArrays] = null;
    xOffset = 128; yOffset = 368; zOffset = 0;
    loadLogs(numArrays,0);
    
    xOffset = 320; yOffset = 368; zOffset = 0;
    loadLogs(numArrays,1);
    
    xOffset = 448; yOffset = 368; zOffset = 0;
    loadLogs(numArrays,1);
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
    vPosArr[numArrays] = null;
    xOffset = 64; yOffset = 432; zOffset = 0;
    loadLogs(numArrays,0);
    
    xOffset = 256; yOffset = 432; zOffset = 0;
    loadLogs(numArrays,1);
    
    xOffset = 384; yOffset = 432; zOffset = 0;
    loadLogs(numArrays,1);
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
}

function loadScene(){
    var index = 0;
   
    //bottom bank
    vPosArr[numArrays] = new Array();
    vNormArr[numArrays] = new Array();
    vTexArr[numArrays] = new Array();
    triIndexArr[numArrays] = new Array();
    
    scene_texture[numArrays] = gl.createTexture();
    scene_texture[numArrays].image = new Image();
    scene_texture[numArrays].image.crossOrigin = "Anonymous";
    
    scene_texture[numArrays].image.onload = handleSceneTexture;
    scene_texture[numArrays].image.src = "https://swami1991.github.io/bottom.jpg";
    xOffset = 0; yOffset = 0; zOffset = 0;
    loadCuboid(numArrays,512,32,16,0);
    
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
    //middle bank
    vPosArr[numArrays] = new Array();
    vNormArr[numArrays] = new Array();
    vTexArr[numArrays] = new Array();
    triIndexArr[numArrays] = new Array();
    
    scene_texture[numArrays] = gl.createTexture();
    scene_texture[numArrays].image = new Image();
    scene_texture[numArrays].image.crossOrigin = "Anonymous";
    
    scene_texture[numArrays].image.onload = handleSceneTexture;
    scene_texture[numArrays].image.src = "https://swami1991.github.io/middle.jpg";
    xOffset = 0; yOffset = 256-16; zOffset = 0;
    loadCuboid(numArrays,512,32,16,0);
    
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
    
    //top bank
    vPosArr[numArrays] = new Array();
    vNormArr[numArrays] = new Array();
    vTexArr[numArrays] = new Array();
    triIndexArr[numArrays] = new Array();
    
    scene_texture[numArrays] = gl.createTexture();
    scene_texture[numArrays].image = new Image();
    scene_texture[numArrays].image.crossOrigin = "Anonymous";
    
    scene_texture[numArrays].image.onload = handleSceneTexture;
    scene_texture[numArrays].image.src = "https://swami1991.github.io/grass.jpg";
    xOffset = 0; yOffset = 512-32; zOffset = 0;
    loadCuboid(numArrays,512,32,16,0);
    
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    

    //road
    vPosArr[numArrays] = new Array();
    vNormArr[numArrays] = new Array();
    vTexArr[numArrays] = new Array();
    triIndexArr[numArrays] = new Array();
    
    scene_texture[numArrays] = gl.createTexture();
    scene_texture[numArrays].image = new Image();
    scene_texture[numArrays].image.crossOrigin = "Anonymous";
    
    scene_texture[numArrays].image.onload = handleSceneTexture;
    scene_texture[numArrays].image.src = "https://swami1991.github.io/road.jpg";
    cuboidColor = [0,0,0];
    xOffset = 0; yOffset = 32; zOffset = 16;
    loadCuboid(numArrays,512,208,0,0);
    
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
    
    //water
    vPosArr[numArrays] = new Array();
    vNormArr[numArrays] = new Array();
    vTexArr[numArrays] = new Array();
    triIndexArr[numArrays] = new Array();
    
    scene_texture[numArrays] = gl.createTexture();
    scene_texture[numArrays].image = new Image();
    scene_texture[numArrays].image.crossOrigin = "Anonymous";
    
    scene_texture[numArrays].image.onload = handleSceneTexture;
    scene_texture[numArrays].image.src = "https://swami1991.github.io/water.jpg";
    cuboidColor = [0.81,0.95,1];
    xOffset = 0; yOffset = 256+16; zOffset = 16;
    loadCuboid(numArrays,512,208,0,0);
    
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/CUBOID_SCALE,1/CUBOID_SCALE,1/CUBOID_SCALE));
    numArrays++;
}

function loadFrog(){
    var frog = new OBJ.Mesh(frog_obj);
    
    scene_texture[numArrays] = null;
    frog_texture[numArrays] = new Array();
    for(var i=0; i<3; i++){
        frog_texture[i] = gl.createTexture();
        frog_texture[i].image = new Image();
        frog_texture[i].image.crossOrigin = "Anonymous";
    
        frog_texture[i].image.onload = handleSceneTexture;
    }

    frog_texture[0].image.src = "https://swami1991.github.io/Skintexture.tif";
    frog_texture[1].image.src = "https://swami1991.github.io/righteye.tif";
    frog_texture[2].image.src = "https://swami1991.github.io/lefteye.tif";
    
    
    vPosArr[numArrays] = frog.vertices;
    vTexArr[numArrays] = frog.textures;
    vNormArr[numArrays] = frog.vertexNormals;
    triIndexArr[numArrays] = frog.indices;
    
    
    vTransform[numArrays] = mat4.create();
    mat4.scale(vTransform[numArrays],vTransform[numArrays],vec3.fromValues(1/FROG_SCALE,1/FROG_SCALE,1/FROG_SCALE));

    mat4.multiply(vTransform[numArrays],mat4.fromXRotation(mat4.create(),-1*Math.PI/2),vTransform[numArrays]);
    mat4.multiply(vTransform[numArrays],mat4.fromTranslation(mat4.create(),vec3.fromValues(1/2,15/CUBOID_SCALE,-10/CUBOID_SCALE)),vTransform[numArrays]);
    
    numArrays++;
}


function loadModels(){
    loadScene();
    loadFrog();
    loadRoad();
    loadWater();
}

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
    precision mediump float;
    
    uniform sampler2D uSampler0;
    uniform sampler2D uSampler1;
    uniform sampler2D uSampler2;
    uniform sampler2D uSampler3;
    uniform bool useTex;
    uniform float numTex;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vLight;
    varying vec2 vTex;
    varying vec3 vShadowPosition;
    
    void main(void) {
        vec3 normal = normalize(vNormal);
        vec3 light = vLight-vPosition;
        light = normalize(light);
        
        vec4 color;
        if(useTex){
            float visibility = 1.0;
            vec4 tcolor0 = texture2D(uSampler0,vTex);
            vec4 tcolor1 = texture2D(uSampler1,vec2(vShadowPosition.x/2.0+0.5,vShadowPosition.y/2.0+0.5));
            if(vShadowPosition.z*0.5+0.5-0.005 > tcolor1.z)
                visibility = 0.5;
            for(int i=0;i<3;i++){
                color[i] = clamp(tcolor0[i]*(dot(light,normal)),0.0,1.0);
                if(numTex == 3.0){
                    vec4 tcolor2 = texture2D(uSampler2,vTex);
                    vec4 tcolor3 = texture2D(uSampler3,vTex);
                    color[i] += clamp(tcolor2[i]*(dot(light,normal)),0.0,1.0);
                    color[i] += clamp(tcolor3[i]*(dot(light,normal)),0.0,1.0);
                }
                color[i] = visibility*color[i];
            }
            color[3] = 1.0;
            gl_FragColor = color;
            
        }else{
            gl_FragColor = vec4(vec3(gl_FragCoord.z),1.0);
        }
        
    }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
    attribute vec3 vertexPosition;
    attribute vec3 vertexNormal;
    attribute vec2 vertexTexture;
    
    uniform mat4 uMVMatrix;
    uniform mat4 uLightMVMatrix;
    uniform mat4 uOMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 uTranslate;
    uniform mat4 uNMatrix;
    uniform vec3 uLight;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vLight;
    varying vec2 vTex;
    varying vec3 vShadowPosition;
    
    void main(void) {
        gl_Position = uPMatrix * uMVMatrix * uTranslate * vec4(vertexPosition, 1.0);
        
        vec4 vertex_trans = uOMatrix * uLightMVMatrix * uTranslate * vec4(vertexPosition, 1.0);
        vShadowPosition = vec3(vertex_trans[0]/vertex_trans[3],vertex_trans[1]/vertex_trans[3],vertex_trans[2]/vertex_trans[3]);;
        
        vertex_trans = uMVMatrix * vec4(vec3(uTranslate * vec4(vertexPosition, 1.0)),1.0);
        vPosition = vec3(vertex_trans[0]/vertex_trans[3],vertex_trans[1]/vertex_trans[3],vertex_trans[2]/vertex_trans[3]);
        
        vec4 normal = uNMatrix * vec4(normalize(vertexNormal),0.0);
        vNormal = vec3(normal[0],normal[1],normal[2]);
        
        vec4 temp = uMVMatrix * vec4(uLight,1.0);
        vLight = vec3(temp[0]/temp[3],temp[1]/temp[3],temp[2]/temp[3]);
        
        vTex = vertexTexture;
    }
    `;
    
    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution
        
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
        
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context
            
            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                vPosAttr = gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vPosAttr);
                
                vNormAttr = gl.getAttribLocation(shaderProgram, "vertexNormal");
                gl.enableVertexAttribArray(vNormAttr);
                
                vTexAttr = gl.getAttribLocation(shaderProgram, "vertexTexture");
                gl.enableVertexAttribArray(vTexAttr);
                
                oMatrixUniform = gl.getUniformLocation(shaderProgram,"uOMatrix");
                pMatrixUniform = gl.getUniformLocation(shaderProgram,"uPMatrix");
                mvMatrixUniform = gl.getUniformLocation(shaderProgram,"uMVMatrix");
                lmvMatrixUniform = gl.getUniformLocation(shaderProgram,"uLightMVMatrix");
                nMatrixUniform = gl.getUniformLocation(shaderProgram,"uNMatrix");
                translateUniform = gl.getUniformLocation(shaderProgram,"uTranslate");
                lightUniform = gl.getUniformLocation(shaderProgram,"uLight");
                SamplerUniform0 = gl.getUniformLocation(shaderProgram,"uSampler0");
                SamplerUniform1 = gl.getUniformLocation(shaderProgram,"uSampler1");
                SamplerUniform2 = gl.getUniformLocation(shaderProgram,"uSampler2");
                SamplerUniform3 = gl.getUniformLocation(shaderProgram,"uSampler3");
                useTexUniform = gl.getUniformLocation(shaderProgram,"useTex");
                numTexUniform = gl.getUniformLocation(shaderProgram,"numTex");
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

function FrogIsOnLog(x,index){
    var numLogs = 2;
    var length = 128;
    var space, offset;
    switch(index){
        case 10:
            offset = 0;
            space = 128;
            break;
        case 11:
            offset = 128;
            space = 64;
            break;
        case 12:
            offset = 64;
            space = 64;
            break;
        default:
            console.log("Error");
            break;
    }
    var trans = mat4.getTranslation(vec3.create(),vTransform[index]);
    for(var i=0; i<numLogs; i++){
        var start_x = offset+i*(length+space) + CUBOID_SCALE*trans[0];
        var end_x = offset+i*(length+space) + CUBOID_SCALE*trans[0] + length;
        if(x >= start_x && x <= end_x)
            return 1;
    }
    return 0;
}

function FrogHitVehicle(x,index){
    var numCars, length, space, offset;
    space = 64;
    switch(index){
        case 6:
            numCars = 3;
            length = 64;
            offset = 0;
            break;
        case 7:
            numCars = 3;
            length = 64;
            offset = 64;
            break;
        case 8:
            numCars = 2;
            length = 128;
            offset = 128;
            break;
        case 9:
            numCars = 2;
            length = 128;
            offset = 128;
            break;
        default:
            console.log("Error");
            break;
    }
    var trans = mat4.getTranslation(vec3.create(),vTransform[index]);
    for(var i=0; i<numCars; i++){
        var start_x = offset+i*(length+space) + CUBOID_SCALE*trans[0];
        var end_x = offset+i*(length+space) + CUBOID_SCALE*trans[0] + length;
        if(x >= start_x-10 && x <= end_x+10)
            return 1;
    }
    return 0;
}

var speed = [];

function FrogIsOnRiver(y){
    if(y>256  && y<480)
        return 1;
    return 0;
}

function FrogIsOnRoad(y){
    if(y>=32  && y<256)
        return 1;
    return 0;
}

function animate(){
    for(var k=0; k<6; k++)
        speed[k] = 0;
    if(numArrays < 6)
        return;
    for(var k=6; k<numArrays; k++){
        if(speed.length != numArrays){
            switch(k){
                case 6:
                    speed[k] = 0.004;
                    break;
                case 7:
                    speed[k] = 0.008;
                    break;
                case 8:
                    speed[k] = 0.004;
                    break;
                case 9:
                    speed[k] = 0.009;
                    break;
                    
                case 10:
                    speed[k] = 0.005;
                    break;
                
                case 11:
                    speed[k] = 0.006;
                    break;
                    
                case 12:
                    speed[k] = 0.005;
                    break;
                    
                default:
                    console.log("Error");
                    break;
            }
        }
    
        var trans = mat4.getTranslation(vec3.create(),vTransform[k]);
        if(trans[0]>1){
            trans = new vec3.fromValues(-2,0,0);
            mat4.multiply(vTransform[k],mat4.fromTranslation(mat4.create(),trans),vTransform[k]);
        }else{
            trans = new vec3.fromValues(speed[k],0,0);
            mat4.multiply(vTransform[k],mat4.fromTranslation(mat4.create(),trans),vTransform[k]);
        }
    }
   
    if(no_jump == 1 && dead == 0 && cur_dead ==0 && won == 0){
    //check if the frog is on the log. If so, then move along with the log
    var trans_frog = mat4.getTranslation(vec3.create(),vTransform[5]);
    trans_frog[1] -= 15/CUBOID_SCALE;
    
    var frog_x = Math.floor(trans_frog[0]*CUBOID_SCALE), frog_y = Math.floor(trans_frog[1]*CUBOID_SCALE);
        if(frog_y >= 480){
        console.log("You Won!!");
            win.play();
            win.currentTime = 0;
            won = 1;
        }
    if(FrogIsOnRiver(frog_y)){
        var logs_row = -1;
        if(frog_y == 304) logs_row = 10;
        else if(frog_y == 368) logs_row = 11;
        else if(frog_y == 432) logs_row = 12;
        if(FrogIsOnLog(frog_x,logs_row))
            mat4.multiply(vTransform[5],mat4.fromTranslation(mat4.create(),vec3.fromValues(speed[logs_row],0,0)),vTransform[5]);
        else{
            drown.play();
            drown.currentTime = 0;
            console.log("Frog is Dead!");
            road = -1;
            dead = 1;
            cur_dead = 0;
            deadFrog();
        }
    }else if(FrogIsOnRoad(frog_y)){
        var cars_row = -1;
        if(frog_y == 64) cars_row = 6;
        else if(frog_y == 96) cars_row = 7;
        else if(frog_y == 128) cars_row = 8;
        else if(frog_y == 160) cars_row = 7;
        else if(frog_y == 192) cars_row = 9;
        
        if(cars_row != -1)
            if(FrogHitVehicle(frog_x,cars_row)){
                squash.play();
                squash.currentTime = 0;
                console.log("Frog is Dead on road!");
                road = 1;
                dead = 1;
                cur_dead = 0;
                deadFrog();
            }
        
    }
    }
    
}

var won = 0;
function drawShadowMap(){
    PerspProjMatrix = mat4.perspective(mat4.create(),-3*Math.PI/2,1,0.1,100);
    OrthoProjMatrix = mat4.ortho(mat4.create(),-1/2,1/2,-1/2,1/2,1,3);
    
    LightMVMatrix = mat4.lookAt(mat4.create(),[Light[0],Light[1],Light[2]],LookAt,LookUp);
    mat4.multiply(LightMVMatrix,mat4.fromTranslation(mat4.create(),vec3.fromValues(1/2,-1/2,0)),LightMVMatrix);
    mat4.multiply(LightMVMatrix,[-1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],LightMVMatrix);
    
    for(var k=0; k<numArrays; k++){
        NMatrix = mat4.create();
        
        gl.uniformMatrix4fv(oMatrixUniform,false,OrthoProjMatrix);
        gl.uniformMatrix4fv(pMatrixUniform,false,OrthoProjMatrix);
        gl.uniformMatrix4fv(mvMatrixUniform,false,LightMVMatrix);
        gl.uniformMatrix4fv(lmvMatrixUniform,false,LightMVMatrix);
        gl.uniformMatrix4fv(nMatrixUniform,false,NMatrix);
        gl.uniform3fv(lightUniform,Light);
        gl.uniformMatrix4fv(translateUniform,false,vTransform[k]);
        gl.uniform1i(SamplerUniform0, 0);
        gl.uniform1i(SamplerUniform1, 0);
        gl.uniform1i(SamplerUniform2, 0);
        gl.uniform1i(SamplerUniform3, 0);
        gl.uniform1i(useTexUniform, 0);
        gl.uniform1f(numTexUniform, 1);
        
        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vPosArr[k]),gl.STATIC_DRAW);
        
        normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vNormArr[k]),gl.STATIC_DRAW);
        
        texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vTexArr[k]),gl.STATIC_DRAW);
        
        triangleBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(triIndexArr[k]),gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
        gl.vertexAttribPointer(vPosAttr,3,gl.FLOAT,false,0,0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
        gl.vertexAttribPointer(vNormAttr,3,gl.FLOAT,false,0,0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER,texBuffer);
        gl.vertexAttribPointer(vTexAttr,2,gl.FLOAT,false,0,0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer);
        gl.drawElements(gl.TRIANGLES,triIndexArr[k].length,gl.UNSIGNED_SHORT,0);
    }
}

function renderModels(){
    requestAnimationFrame(renderModels);
    writeCanvas();
    console.log("in render models");
    if(scene_loaded){
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawShadowMap();
        var pixels = new Uint8Array(rttFramebuffer.width*rttFramebuffer.height*4);
        gl.readPixels(0,0,CANVAS_WIDTH,CANVAS_HEIGHT,gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    
    //setup transformation matrices
        PerspProjMatrix = mat4.perspective(mat4.create(),-3*Math.PI/2,1,0.1,100);
        OrthoProjMatrix = mat4.ortho(mat4.create(),-1/2,1/2,-1/2,1/2,1,3);
        MVMatrix = mat4.lookAt(mat4.create(),Eye,LookAt,LookUp);
        mat4.multiply(MVMatrix,mat4.fromTranslation(mat4.create(),vec3.fromValues(1/2,-1/2,0)),MVMatrix);
    
    mat4.multiply(MVMatrix,[-1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],MVMatrix);
        
    for(var k=0; k<numArrays; k++){
        NMatrix = mat4.create();
        NMatrix = mat4.invert(mat4.create(),mat4.multiply(mat4.create(),MVMatrix,vTransform[k]));
        mat4.transpose(NMatrix,NMatrix);
        
        gl.uniformMatrix4fv(oMatrixUniform,false,OrthoProjMatrix);
        gl.uniformMatrix4fv(pMatrixUniform,false,PerspProjMatrix);
        gl.uniformMatrix4fv(mvMatrixUniform,false,MVMatrix);
        gl.uniformMatrix4fv(lmvMatrixUniform,false,LightMVMatrix);
        gl.uniformMatrix4fv(nMatrixUniform,false,NMatrix);
        gl.uniform3fv(lightUniform,Light);
        gl.uniformMatrix4fv(translateUniform,false,vTransform[k]);
        gl.uniform1i(SamplerUniform0, 0);
        gl.uniform1i(SamplerUniform1, 1);
        gl.uniform1i(SamplerUniform2, 2);
        gl.uniform1i(SamplerUniform3, 3);
        gl.uniform1i(useTexUniform, 1);
        gl.uniform1f(numTexUniform, 1);
        
        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vPosArr[k]),gl.STATIC_DRAW);
        
        normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vNormArr[k]),gl.STATIC_DRAW);
        
        texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vTexArr[k]),gl.STATIC_DRAW);

        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(triIndexArr[k]),gl.STATIC_DRAW);
    
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
        gl.vertexAttribPointer(vPosAttr,3,gl.FLOAT,false,0,0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
        gl.vertexAttribPointer(vNormAttr,3,gl.FLOAT,false,0,0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER,texBuffer);
        gl.vertexAttribPointer(vTexAttr,2,gl.FLOAT,false,0,0);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        
        switch(k){
            case 5:
                gl.uniform1f(numTexUniform, 3);
            
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, frog_texture[0]);
            
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, frog_texture[1]);
            
                gl.activeTexture(gl.TEXTURE3);
                gl.bindTexture(gl.TEXTURE_2D, frog_texture[2]);
                break;
                
            case 6:
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, car_texture);
                break;
            case 7:
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, car_texture);
                break;
                
                
            case 8:
            case 9:
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, truck_texture);
                break;
                
            case 10:
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, log_texture);
                break;
            case 11:
            case 12:
                break;
                
                
            default:
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, scene_texture[k]);
                break;
        }
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer);
        gl.drawElements(gl.TRIANGLES,triIndexArr[k].length,gl.UNSIGNED_SHORT,0);
    }
        if(num_lives > 0)
        animate();
    }
}

function setupFrameBuffer(){
    rttFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
    rttFramebuffer.width = CANVAS_WIDTH;
    rttFramebuffer.height = CANVAS_HEIGHT;
    
    rttTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    //gl.generateMipmap(gl.TEXTURE_2D);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, rttFramebuffer.width, rttFramebuffer.height);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function main(){
    setupWebGL();
    setupFrameBuffer();
    loadModels();
    setupShaders();
    renderModels();
}
