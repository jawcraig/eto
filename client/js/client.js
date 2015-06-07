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
    KEYA: 65,
    KEYW: 87,
    KEYD: 68,
    KEYS: 83,
    PIPE: 0,

    keyUp: function(event) {
        event.preventDefault();
        Input.keys[event.keyCode] = false;
        console.log(event.keyCode);
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

GameObject.prototype.updateElement = function(element, data) {
    for(var setting in data) {
        this[element][setting] = data[setting];
    }
};

GameObject.prototype.setPlayer = function(player) {
    this.player = player;
};

GameObject.prototype.setAvatar = function(avatar) {
    this.avatar = avatar;
    this.loadModel(this.avatar.model);
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

    this.player = [];
    this.camera = null;
    this.scene = null;
    this.renderer = null;

    this.isRunning = false;

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
    isRunning = true;
    this.animate();
};

Eto.prototype.stop = function() {
    isRunning = false;
};

Eto.prototype.animate = function() {
    if(!isRunning) {
        return;
    }

    requestAnimationFrame(this.animate.bind(this));

    this.update();

    renderer.render(this.scene, this.camera);
};

Eto.prototype.readInput = function(delta) {
    var controls = this.player[0].player.controls;
    var graphics = this.player[0].graphics;

    if(Input.keys[controls.up]) {
        graphics.position.x += 0.1;
    }
    if(Input.keys[controls.down]) {
        graphics.position.x -= 0.1;
    }
    if(Input.keys[controls.left]) {
        graphics.rotation.y -= 0.1;
    }
    if(Input.keys[controls.right]) {
        graphics.rotation.y += 0.1;
    }

    if(Input.keys[controls.primary]) {
        graphics.material.color.setHex(0x00FF00);
    }
    else if(Input.keys[controls.secondary]) {
        graphics.material.color.setHex(0x0000FF);
    }
    else {
        graphics.material.color.setHex(0xFF0000);
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
        this.player.graphics.rotateY(-0.01);
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
        mesh.morphTargetInfluences[ keyframe ] =
            ( time % interpolation ) / interpolation;
        mesh.morphTargetInfluences[ lastKeyframe ] = 1 -
                                  mesh.morphTargetInfluences[ keyframe ];
    }
    else {
        console.log("noplayer.graphics");
    }

    this.readInput(delta);

    this.updateCamera();
};

Eto.prototype.loadJSON = function(url, onSuccess, onComplete) {
    var self = this;
    $.ajax({
        dataType: "json",
        success: onSuccess,
        complete: onComplete,
        error: function(hr, status, error) {
            alert("Error while loading " + url + ": " + status +
                " - " + error);
        }
    });
};

Eto.prototype.loadConfiguration = function() {
    var self = this;

    this.loadJSON(this.CONFIG.configuration_file,
        function(data) {
            for(var setting in data) {
                self.CONFIG[setting] = data[setting];
            }
        },
        function() {
            console.log("config", game.CONFIG);
            self.init();
        }
    );
};

Eto.prototype.loadEntities = function(list) {
    var self = this;

    var pusher = function(data) {
        for(var setting in data) {
            this.entities.push(data[setting]);
        }
    };

    for(var i = 0; i < list.length; ++i) {
        this.loadJSON(list[i],
            pusher.bind(self)
        );
    }
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
};

Eto.prototype.init = function() {
    var container = document.getElementById("container");

    this.camera = this.createCamera();
    this.scene = this.createScene();

    this.loadEntities(this.CONFIG.entities);
    console.log(this.entities);
    this.player[0] = new GameObject(this.scene);
    this.player[0].setPlayer(this.CONFIG.players[0]);
    this.player[0].setAvatar(this.entities[0]);
    console.log(this.player[0]);

    this.connections = this.createConnections();

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
