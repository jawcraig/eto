// Author: jawcraig (jawcraig@gmail.com)

var ETO_CONFIG_DEFAULT = {
    configuration_file: "config.json",
    basepath: "",
    datapath: "data/",
    camera_fov: 75,
    camera_near: 1,
    camera_far: 1000,
    camera_position: {x: 20, y: 50, z: 20},
    camera_up: {x: 0, y: 1, z: 0},
    camera_lookat: {x: 0, y: 0, z: 0},
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
    },

    keyDown: function(event) {
        event.preventDefault();
        Input.keys[event.keyCode] = true;
    }
};


var GameObject = function(parent) {
    this.parent = parent;
};

GameObject.prototype.setPlayer = function(player) {
    this.player = player;
};

GameObject.prototype.setAvatar = function(avatar) {
    this.avatar = avatar;
};

GameObject.prototype.setItem = function(item) {
    this.item = item;

    this.setModel(this.item.model);
};

GameObject.prototype.setModel = function(model) {
    if(typeof this.avatar === undefined) {
        this.avatar = {};
    }

    if(typeof model !== undefined) {
        this.avatar.model = model;
    }
};

GameObject.prototype.loadData = function(path, animated) {
    if(typeof this.graphics === undefined || !this.graphics) {
        this.graphics = this.getPlaceHolder();
        this.parent.add(this.graphics);
    }

    if(typeof this.avatar === undefined || this.avatar === null) {
        return;
    }

    if(typeof this.avatar.model !== undefined && this.avatar.model) {
        if(animated) {
            console.log("loadAnimated:", this, this.avatar.name);
            this.loadAnimatedModel(path + this.avatar.model);
        }
        else {
            console.log("loadModel:", this, this.avatar.name);
            this.loadModel(path + this.avatar.model);
        }
    }
};

GameObject.prototype.getPlaceHolder = function() {
    var emptyGeometry = new THREE.BoxGeometry(3, 3, 3, 2, 2, 2);
    var emptyMaterial = new THREE.MeshBasicMaterial({color:0x0000FF});
    return new THREE.SkinnedMesh(emptyGeometry,
        emptyMaterial, false);
};

GameObject.prototype.loadModel = function(modelurl) {
    var self = this;

    console.log("Loading model " + modelurl);
    var loader = new THREE.JSONLoader();
    loader.load(modelurl,
        function(geometry, materials) {
            //var material = new THREE.MeshFaceMaterial(materials);
            var material = new THREE.MeshPhongMaterial({
                color: 0x224422,
                specular: 0x225522,
                shininess: 10,
                shading: THREE.FlatShading
            });
            var mesh = new THREE.Mesh(geometry, material);
            mesh.scale.set(100, 50, 100);
            mesh.translateY(-60);

            if(self.graphics !== undefined && self.graphics) {
                self.parent.remove(self.graphics);
            }

            self.graphics = mesh;
            self.parent.add(mesh);
        }
    );
};

GameObject.prototype.loadAnimatedModel = function(modelurl) {
    var self = this;

    console.log("Loading skinned model " + modelurl);
    var loader = new THREE.JSONLoader();
    loader.load(modelurl,
        function(geometry, materials) {
            // TODO: var material = new THREE.MeshFaceMaterial(materials[0]);
            var material = new THREE.MeshPhongMaterial({
                color: 0x664422,
                specular: 0x009900,
                shininess: 30,
                shading: THREE.FlatShading
            });
            var mesh = new THREE.SkinnedMesh(geometry, material, false);
            mesh.pose();

            if(self.graphics !== undefined && self.graphics) {
                self.parent.remove(self.graphics);
            }

            self.graphics = mesh;
            self.parent.add(mesh);
            var animation = new THREE.Animation(mesh, geometry.animations[0]);
            animation.play(0);
        }
    );
};

GameObject.prototype.handleInput = function() {
    if(this.player.connection != "local") {
        return;
    }

    var graphics = this.graphics;

    if(typeof graphics === undefined || !graphics) {
        return;
    }

    var avatar = this.avatar;

    if(avatar.type == "walker") {
        this.handleWalk();
    }
    else if(avatar.type == "flyer") {
        this.handleFly();
    }
    else {
        console.log("Unknown avatar type: ", avatar.type);
    }

    this.handleActions();
};

GameObject.prototype.handleActions = function() {
    var controls = this.player.controls;
    var graphics = this.graphics;

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

GameObject.prototype.handleFly = function() {
    var controls = this.player.controls;
    var graphics = this.graphics;
    var avatar = this.avatar;

    var xdelta = Math.sin(graphics.rotation.y);
    var ydelta = Math.cos(graphics.rotation.y);
    graphics.position.x += 0.1 * avatar.move * xdelta;
    graphics.position.z += 0.1 * avatar.move * ydelta;

    if(Input.keys[controls.up]) {
        graphics.position.y += 0.1 * avatar.move;
    }
    if(Input.keys[controls.down]) {
        graphics.position.y -= 0.1 * avatar.move;
    }
    if(Input.keys[controls.left]) {
        graphics.rotation.y += 0.03 * avatar.turn;
    }
    if(Input.keys[controls.right]) {
        graphics.rotation.y -= 0.03 * avatar.turn;
    }
};

GameObject.prototype.handleWalk = function() {
    var controls = this.player.controls;
    var graphics = this.graphics;
    var avatar = this.avatar;

    var xdelta = Math.sin(graphics.rotation.y);
    var ydelta = Math.cos(graphics.rotation.y);

    if(Input.keys[controls.up]) {
        graphics.position.x -= 0.1 * avatar.move * xdelta;
        graphics.position.z -= 0.1 * avatar.move * ydelta;
    }
    if(Input.keys[controls.down]) {
        graphics.position.x += 0.1 * avatar.move * xdelta;
        graphics.position.z += 0.1 * avatar.move * ydelta;
    }
    if(Input.keys[controls.left]) {
        graphics.rotation.y += 0.01 * avatar.turn;
    }
    if(Input.keys[controls.right]) {
        graphics.rotation.y -= 0.01 * avatar.turn;
    }
};

var Eto = function() {
    this.CONFIG = ETO_CONFIG_DEFAULT;
    Input.master = this;

    this.characters = [];
    this.items = {};
    this.players = [];
    this.field = null;
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

    camera.position.set(
        this.CONFIG.camera_position.x,
        this.CONFIG.camera_position.y,
        this.CONFIG.camera_position.z);
    camera.up = new THREE.Vector3(
        this.CONFIG.camera_up.x,
        this.CONFIG.camera_up.y,
        this.CONFIG.camera_up.z);
    camera.lookAt(new THREE.Vector3(
        this.CONFIG.camera_lookat.x,
        this.CONFIG.camera_lookat.y,
        this.CONFIG.camera_lookat.z));

    return camera;
};

Eto.prototype.createScene = function() {
    var scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2(0x000010, 0.04);

    scene.add(new THREE.AxisHelper(50));

    this.sky = this.createSky();
    scene.add(this.sky);

    this.field = this.loadField(scene, this.randomizeMap());

    scene.add(new THREE.AmbientLight(0xbbbbbb));
    var point = new THREE.PointLight(0x6f4420, 10, 500);
    point.position.set(100, 100, 100);
    scene.add(point);

    return scene;
};

Eto.prototype.createSky = function() {
    var geometry = new THREE.SphereGeometry(this.CONFIG.sky_size, 8, 8);
    var material = new THREE.MeshBasicMaterial({color: this.CONFIG.sky_color});
    material.side = THREE.DoubleSide;

    return new THREE.Mesh(geometry, material);
};

Eto.prototype.generateField = function(map) {
    var field = new GameObject(this.scene);
    var geometry = new THREE.PlaneGeometry(170, 170, 3, 3);
    var material = new THREE.MeshBasicMaterial({color: 0x113377, side: THREE.DoubleSided});
    field.graphics = new THREE.Mesh(geometry, material);
    field.graphics.rotateX(-Math.PI/2);
    field.graphics.translateY(-1);

    field.collision = field.graphics;
    return field;
};

Eto.prototype.loadField = function(scene, map) {
    var field = new GameObject(scene);
    console.log("Loading map: ", map);
    field.setAvatar(map);
    field.loadData(this.dataPath(""), false);
    field.collision = field.graphics;
    return field;
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
    for(var i = 0; i < this.players.length; ++i) {
        this.players[i].handleInput();
    }
};

Eto.prototype.updateCamera = function() {
//    camera.lookAt(cameraTarget);
};


Eto.prototype.animateModel = function(mesh, delta) {
    var duration = 1000, keyframes = 20, currentKeyframe = 1,
        interpolation = duration / keyframes, lastKeyframe = 0,
        time = Date.now() % duration,
        keyframe = Math.floor( time / interpolation );

    if (keyframe != currentKeyframe) {
      mesh.morphTargetInfluences[ lastKeyframe ] = 0;
      mesh.morphTargetInfluences[ currentKeyframe ] = 1;
      mesh.morphTargetInfluences[ keyframe ] = 0;
      lastKeyframe = currentKeyframe;
       currentKeyframe = keyframe;
    }

    mesh.morphTargetInfluences[ keyframe ] =
        (time % interpolation) / interpolation;
    mesh.morphTargetInfluences[ lastKeyframe ] = 1 -
        mesh.morphTargetInfluences[ keyframe ];
};

Eto.prototype.update = function() {
    var delta = this.clock.getDelta();
    THREE.AnimationHandler.update(delta);

/*    var graphics = this.players[0].graphics;
    if(typeof graphics !== undefined && graphics) {
        if(typeof graphics.morphTargetInfluences != undefined) {
            this.animateModel(graphics, delta);
        }
    }
*/

    this.readInput(delta);

    this.updateCamera();
};

Eto.prototype.loadEntities = function(list) {
    var self = this;

    var successfun = function(data) {
        self.characters = self.characters.concat(data.characters);

        for(var item in data.items) {
            self.items[item] = data.items[item];
            self.items[item].name = item;
        }
    };

    var errorfun = function(hr, status, error) {
        alert("Error while loading " + url + ": " + status +
            " - " + error);
    };

    for(var i = 0; i < list.length; ++i) {
        var url = this.dataPath(list[i]);
        $.ajax({
            async: false,
            url: url,
            dataType: "json",
            success: successfun,
            error: errorfun
        });
    }

    this.entitiesLoaded();
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

Eto.prototype.initGame = function() {
    console.log("config", this.CONFIG);
    this.loadEntities(this.CONFIG.entities);
};

Eto.prototype.randomizeMap = function() {
    var index = Math.floor(Math.random() * this.CONFIG.maps.length);
    return this.CONFIG.maps[index];
};

Eto.prototype.randomizeCharacter = function() {
    var index = Math.floor(Math.random() * this.characters.length);
    return this.characters[index];
};

Eto.prototype.createPlayer = function(index) {
    this.players[index] = new GameObject(this.scene);
    var player = this.players[index];
    player.setPlayer(this.CONFIG.players[index]);
    player.setAvatar(this.randomizeCharacter());
    player.loadData(this.dataPath(""), true);

    this.loadItems(player);
};

Eto.prototype.loadItems = function(player) {
    player.items = [];
    for(var i = 0; i < player.avatar.items.length; ++i) {
        var item = new GameObject(player.graphics);
        item.setAvatar(player.avatar.items[i]);
        console.log(item);
        item.setItem(this.items[item.avatar.name]);
        item.loadData(this.dataPath(""), false);
    }
};


Eto.prototype.entitiesLoaded = function() {
    for(var i = 0; i < this.CONFIG.playercount; ++i) {
        this.createPlayer(i);
    }
};

Eto.prototype.dataPath = function(file) {
    return this.CONFIG.basepath + this.CONFIG.datapath + file;
};


Eto.prototype.init = function() {
    var container = document.getElementById("container");

    this.camera = this.createCamera();
    this.scene = this.createScene();

    this.initGame();

    this.connections = this.createConnections();

    this.renderer = this.createRenderer();

    container.appendChild(renderer.domElement);

    $(document).on("keydown", Input.keyDown);
    $(document).on("keyup", Input.keyUp);

    $("#controls").find("#disconnect").on("click", function() { alert("DISCO!"); });

    $(window).on("resize", this.onWindowResize.bind(this), false);

    this.start();
};

function loadConfiguration(game) {
    $.ajax({
        url: game.CONFIG.basepath + game.CONFIG.configuration_file,
        dataType: "json",
        success: function(data) {
            for(var setting in data) {
                game.CONFIG[setting] = data[setting];
            }
        },
        error: function(hr, status, error) {
            alert("Error while loading " + url + ": " + status +
                " - " + error);
        },
        complete: function() {
            game.init();
        }
    });
}

var game = new Eto();
loadConfiguration(game);
