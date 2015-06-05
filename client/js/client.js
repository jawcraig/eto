// Author: jawcraig (jawcraig@gmail.com)

var ETO_CONFIG_DEFAULT = {
    configuration_file: "config.json",
    baseurl: "",
    camera_fov: 75,
    camera_near: 1,
    camera_far: 1000,
    sky_size: 300,
    sky_color: 0x707090
};

var Input = {
    keys: [],
    master: null,

    TAB: 9,
    SHIFT: 16,
    CTRL: 17,
    ALT: 18,
    ESC: 27,
    SPACE: 32,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,

    keyUp: function(event) {
        event.preventDefault();
        Input.keys[event.keyCode] = false;
    },

    keyDown: function(event) {
        event.preventDefault();
        Input.keys[event.keyCode] = true;
    }
};

var GameObject = function(scene) {
    this.scene = scene;
    this.graphics = null;
    this.physics = null;
    this.sounds = null;
    this.controls = null;
};

GameObject.prototype.set = function(data) {
    for(var setting in data) {
        this[setting] = data[setting];
    }
};

GameObject.prototype.load = function(configurl) {
    var self = this;
    $.ajax({
        dataType: "json",
        url: configurl, 
        success: function(data) {
            self.set(data);
        },
        error: function(hr, status, error) {
            console.log("Error loading", url, status, error);
        },
        complete: function() {
            self.initialize(); 
        }
    });
};

GameObject.prototype.generate = function() {
    this.loadModel("data/ant.json");
};

GameObject.prototype.loadModel = function(modelurl) {
    var self = this;
    var loader = new THREE.JSONLoader();
    loader.load(modelurl,
        function(geometry, materials) {
            //var material = new THREE.MeshFaceMaterial(materials[0]);
            //var geometry = new THREE.BoxGeometry(10, 10, 10, 2, 2, 2);
            var material = new THREE.MeshPhongMaterial({
                color: 0x664422,
                specular: 0x009900,
                shininess: 30,
                shading: THREE.FlatShading
            });
            var mesh = new THREE.SkinnedMesh(geometry, material, false);
//            mesh.pose();
            self.graphics = mesh;
            self.scene.add(mesh);
            var animation = new THREE.Animation(mesh, geometry.animations[0]);
            animation.play(0);
        }
    );
};

var Eto = function() {
    this.CONFIG = ETO_CONFIG_DEFAULT;
    Input.master = this;

    this.player = null;
    this.camera = null;
    this.scene = null;
    this.renderer = null;

    this.running = false;

    this.clock = new THREE.Clock();
};

Eto.prototype.createCamera = function() {
    var camera = new THREE.PerspectiveCamera(this.CONFIG.camera_fov,
        window.innerWidth / window.innerHeight,
        this.CONFIG.camera_near, this.CONFIG.camera_far);
 
    camera.position.set(10, 10, 20);

    return camera;
};

Eto.prototype.createScene = function() {
    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000010, 0.04);

    var sky = this.createSky();
    scene.add(sky);

    scene.add(new THREE.AmbientLight(0xbbbbbb));
    var point = new THREE.PointLight(0xff4400, 5, 30);
    point.position.set(5, 5, 5);
    scene.add(point);

    return scene;
};

Eto.prototype.createSky = function() {
    var geometry = new THREE.SphereGeometry(this.CONFIG.sky_size, 8, 8);
    var material = new THREE.MeshBasicMaterial({color: this.CONFIG.sky_color});
    material.side = THREE.DoubleSide;

    return new THREE.Mesh(geometry, material);
};

Eto.prototype.createRenderer = function() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    return renderer;
};


Eto.prototype.onWindowResize = function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
};

Eto.prototype.start = function() {
    running = true;
    this.animate();
};

Eto.prototype.stop = function() {
    running = false;
};

Eto.prototype.animate = function() {
    if(!running) {
        return;
    }

    requestAnimationFrame(this.animate.bind(this));

    this.update();

    renderer.render(this.scene, this.camera);
};

Eto.prototype.readInput = function(delta) {
    if(Input.keys[Input.UP]) {
        this.player.graphics.position.x += .1; 
    }
    if(Input.keys[Input.DOWN]) {
        this.player.graphics.position.x -= .1; 
    }
    if(Input.keys[Input.LEFT]) {
        this.player.graphics.rotation.y -= .1; 
    }
    if(Input.keys[Input.RIGHT]) {
        this.player.graphics.rotation.y += .1; 
    }
};

Eto.prototype.updateCamera = function() {
//    camera.lookAt(cameraTarget);
};

Eto.prototype.update = function() {
    var delta = this.clock.getDelta();
    THREE.AnimationHandler.update(delta);

var duration = 1000, keyframes = 20, currentKeyframe = 1,
    interpolation = duration / keyframes, lastKeyframe = 0;

    if(this.player.graphics) {
        this.player.graphics.rotateY(-.01);
        var mesh = this.player.graphics;

        var time = Date.now() % duration,
            keyframe = Math.floor( time / interpolation );
        if ( keyframe != currentKeyframe ) {
          mesh.morphTargetInfluences[ lastKeyframe ] = 0;
          mesh.morphTargetInfluences[ currentKeyframe ] = 1;
          mesh.morphTargetInfluences[ keyframe ] = 0;
          lastKeyframe = currentKeyframe;
           currentKeyframe = keyframe;
        }
        mesh.morphTargetInfluences[ keyframe ] = ( time % interpolation )
                                                    / interpolation;
        mesh.morphTargetInfluences[ lastKeyframe ] = 1 - 
                                  mesh.morphTargetInfluences[ keyframe ];
    }
    else {
        console.log("noplayer.graphics");
    }

    this.readInput(delta);

    this.updateCamera();
};

Eto.prototype.loadConfiguration = function() {
    var game = this;
    $.ajax({
        dataType: "json",
        url: this.CONFIG.configuration_file,
        success: function(data) {
            for(var setting in data) {
                this.CONFIG[setting] = data[setting];
            }
        },
        error: function(hr, status, error) {
            alert("Error while loading configuration: " + status +
                " - " + error);
        },
        complete: function() {
            console.log("config", game.CONFIG);
            game.init();
        }
    });
};

Eto.prototype.createConnections = function() {
// Socket.io instead?
    this.connection = new RTCPeerConnection();
    var channel = this.connection.createDataChannel("game");
    channel.onopen = function(event) {
        channel.send("MESSAGE!");
    };
    channel.onmessage = function(event) {
        console.log(event, event.data);
    };
};

Eto.prototype.closeConnections = function() {
    this.connection.close();
}

Eto.prototype.init = function() {
    var container = document.getElementById("container");

    this.camera = this.createCamera();
    this.scene = this.createScene();

    this.player = new GameObject(this.scene);
    this.player.generate();
    this.connections = createConnections();
    this.renderer = this.createRenderer();

    container.appendChild(renderer.domElement);

    $(document).on("keydown", Input.keyDown);
    $(document).on("keyup", Input.keyUp);

    $("#controls").find("#disconnect").on("click", function() { alert("DISCO!"); });

    $(window).on("resize", this.onWindowResize.bind(this), false);

    this.start();
};

var game = new Eto();
game.loadConfiguration();
