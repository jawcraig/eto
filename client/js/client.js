// Author: jawcraig (jawcraig@gmail.com)

var ETO_CONFIG_DEFAULT = {
    DEBUG: true,

    configuration_file: "config.json",
    basepath: "",
    datapath: "data/",


    menu_key: 27,


    camera_fov: 75,
    camera_near: 1,
    camera_far: 1000,
    camera_position: {x: 20, y: 70, z: 20},
    camera_up: {x: 0, y: 1, z: 0},
    camera_lookat: {x: 0, y: 0, z: 0},

    sky_size: 300,
    sky_color: 0x707090,


    master_volume: 1.0,


    gravity: {x: 0, y: -1, z: 0},
    forward: {x: 1, y: 0, z: 0},
    feet_height: 100,
    walk_speed: 0.1,
    walk_turn_speed: 0.1,
    fly_speed: 0.1,
    fly_turn_speed: 0.1,

    item_cooldown: 1
};


/** Input system singleton **/


var Input = {
    keys: [],

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

        if(event.keyCode == game.config.menu_key) {
            game.toggleMenu();
        }

        Input.keys[event.keyCode] = false;
    },

    keyDown: function(event) {
        event.preventDefault();
        Input.keys[event.keyCode] = true;
    }
};


/** Audio system **/


var Audio = function() {
    this.context = new AudioContext();

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.setVolume(game.config.master_volume);
};

Audio.prototype.getDestination = function() {
    return this.masterGain;
};

// 0..1
Audio.prototype.setVolume = function(volume) {
    this.masterGain.gain.value = volume;
};

Audio.prototype.loadSound = function(url) {
// TODO: Implement this using $.ajax (JQuery still buggy)

    game.log("Loading audio:", url);

    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    var sound = {
        buffer: null
    };

    request.onload = function() {
        this.audio.decodeAudioData(
            request.response,

            function(buffer) {
                // Complete
                sound.buffer = buffer;
            },

            function() {
                // Error
                game.error("Can't load " + url);
            }
        );
    };

    return sound;
};

Audio.prototype.createPanner = function() {
    var panner = context.createPanner();
    panner.connect(this.masterGain);
};

Audio.prototype.updatePannerPosition = function(panner, object) {
    GameObject.vector.setFromMatrixPosition(object.graphics.matrixWorld);
    panner.setPosition(GameObject.vector.x, GameObject.vector.y,
        GameObject.vector.z);
    // TODO: Doppler, listener direction:
// http://www.html5rocks.com/en/tutorials/webaudio/positional_audio/http://www.html5rocks.com/en/tutorials/webaudio/positional_audio/
};

Audio.prototype.updateListenerPosition = function(camera) {
    camera.position.set(x, y, z);
    camera.updateMatrixWorld();
    GameObject.vector.setFromMatrixPosition(camera.matrixWorld);
    this.context.listener.setPosition(GameObject.vector.x,
        GameObject.vector.y, GameObject.vector.z);
};

Audio.prototype.playSound = function(source, buffer, destination, time) {
    if(typeof buffer === "undefined" || !buffer) {
        game.error("Audio: trying to play empty buffer");
        return;
    }

    if(typeof source === "undefined" || !source) {
        game.log("Audio: Empty source given, creating a new one");
        source = this.context.createBufferSource();
    }

    source.buffer = buffer;
    source.connect(this.getDestination());

    if(typeof time !== "undefined") {
        source.start(time);
    }
    else {
        source.start(0);
    }
};


/** Game Object **/


var GameObject = function(parent) {
    this.parent = parent;

    var material = new THREE.MeshBasicMaterial({color: 0xB0C0D0});
    var geometry = new THREE.BoxGeometry(0.2, 10, 0.2);
    this.feet = new THREE.Mesh(geometry, material);
};

// Global gravity vector - usually negative y
GameObject.gravity = new THREE.Vector3(ETO_CONFIG_DEFAULT.gravity.x,
    ETO_CONFIG_DEFAULT.gravity.y, ETO_CONFIG_DEFAULT.gravity.z);
// Global forward vector - usually positive z
GameObject.forward = new THREE.Vector3(ETO_CONFIG_DEFAULT.forward.x,
    ETO_CONFIG_DEFAULT.forward.y, ETO_CONFIG_DEFAULT.forward.z);
// Temporary matrix & vector for calculations
GameObject.matrix = new THREE.Matrix4();
GameObject.vector = new THREE.Vector3();
// Ray caster
GameObject.ray = new THREE.Raycaster();


GameObject.prototype.setPlayer = function(player) {
    this.player = player;
};

GameObject.prototype.setAvatar = function(avatar) {
    this.avatar = avatar;
};

GameObject.prototype.setItem = function(item) {
    this.item = item;
    this.item.lastFired = 0;

    this.setModel(this.item.model);
};

GameObject.prototype.setModel = function(model) {
    if(typeof this.avatar === "undefined") {
        this.avatar = {};
    }

    if(typeof model !== "undefined") {
        this.avatar.model = model;
    }
};


/** GRAPHICS system **/


GameObject.prototype.loadData = function(path, animated) {
    if(typeof this.graphics === "undefined" || !this.graphics) {
        this.graphics = this.getPlaceHolder();
        this.parent.add(this.graphics);
    }

    if(typeof this.avatar === "undefined" || this.avatar === null) {
        return;
    }

    if(typeof this.avatar.model !== "undefined" && this.avatar.model) {
        if(animated) {
            game.log("loadAnimated:", this, this.avatar.name);
            this.loadAnimatedModel(path + this.avatar.model);
        }
        else {
            game.log("loadModel:", this, this.avatar.name);
            this.loadModel(path + this.avatar.model);
        }
    }
};

GameObject.prototype.getPlaceHolder = function() {
    var emptyGeometry = new THREE.BoxGeometry(3, 3, 3, 2, 2, 2);
    var emptyMaterial = new THREE.MeshBasicMaterial({color:0x0000FF});
    var mesh = new THREE.SkinnedMesh(emptyGeometry, emptyMaterial, false);
    return mesh;
};

GameObject.prototype.loadModel = function(modelurl) {
    var self = this;

    game.log("Loading model " + modelurl);
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

            if(typeof self.graphics !== "undefined" && self.graphics !== null) {
                self.parent.remove(self.graphics);
            }

            self.finalizeGraphics(mesh);
        }
    );
};

GameObject.prototype.loadAnimatedModel = function(modelurl) {
    var self = this;

    game.log("Loading skinned model " + modelurl);
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

            if(typeof self.graphics !== "undefined" && self.graphics !== null) {
                self.parent.remove(self.graphics);
            }

            self.finalizeGraphics(mesh);

            if(typeof geometry.animations !== "undefined" &&
                    geometry.animations.length > 0) {
                var animation = new THREE.Animation(mesh,
                    geometry.animations[0]);
                animation.play(0);
            }
        }
    );
};

GameObject.prototype.finalizeGraphics = function(mesh) {
    this.graphics = mesh;

    var props = this.avatar;

    if(typeof props.scale !== "undefined" && props.scale !== null) {
        mesh.scale.set(props.scale.x, props.scale.y, props.scale.z);
    }
    if(typeof props.rotation !== "undefined" && props.rotation !== null) {
        mesh.rotation.set(props.rotation.x, props.rotation.y, props.rotation.z);
    }
    if(typeof props.position !== "undefined" && props.position !== null) {
        mesh.position.set(props.position.x, props.position.y, props.position.z);
    }

    this.parent.add(mesh);

    if(typeof this.avatar.type !== "undefined" && this.avatar.type == "flyer") {
        this.parent.add(this.feet);
    }
};


/** AI system **/


GameObject.prototype.updateInput = function(delta) {
    if(this.player.connection != "local") {
        return;
    }

    var graphics = this.graphics;

    if(typeof graphics === "undefined" || !graphics) {
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
        game.log("Unknown avatar type: ", avatar.type);
    }

    this.handleActions();
};

GameObject.prototype.handleActions = function() {
    var controls = this.player.controls;
    var graphics = this.graphics;

    if(Input.keys[controls.primary]) {
        if(this.items.length > 0) {
            this.fire(this.items[0]);
        }

        graphics.material.color.setHex(0x00FF00);
    }
    else if(Input.keys[controls.secondary]) {
        if(this.items.length > 1) {
            this.fire(this.items[1]);
        }

        graphics.material.color.setHex(0x0000FF);
    }
    else {
        graphics.material.color.setHex(0xFF0000);
    }
};

GameObject.prototype.fire = function(slot) {
    var item = slot.item;

    if(game.time - item.lastFired >
            game.config.item_cooldown * item.cooldown) {

        item.lastFired = game.time;

        switch(item.type) {
            case "gun":
                this.fireGun(slot);
                break;
            case "projectile":
                this.fireProjectile(slot);
                break;
            case "special":
                this.fireSpecial(slot);
                break;
            case "particle":
                this.fireFlamer(slot);
                break;
            case "laser":
                this.fireLaser(slot);
                break;
            default:
                game.error("Not implemented " + item.type);
        }
    }
};

GameObject.prototype.fireGun = function(slot) {
    game.log("Firing: ", slot.item.name);

    var origin = slot.graphics.position;
    var direction = slot.getForward();
    GameObject.ray.set(origin, direction);
};

GameObject.prototype.fireProjectile = function(slot) {
    game.log("Firing: ", slot.item.name);
    fireGun(slot);
};

GameObject.prototype.fireSpecial = function(slot) {
    game.log("Firing: ", slot.item.name);
    fireGun(slot);
};

GameObject.prototype.fireFlamer = function(slot) {
    game.log("Firing: ", slot.item.name);
    fireGun(slot);
};

GameObject.prototype.fireLaser = function(slot) {
    game.log("Firing: ", slot.item.name);
    fireGun(slot);
};

GameObject.prototype.handleFly = function() {
    var controls = this.player.controls;
    var graphics = this.graphics;
    var avatar = this.avatar;

    var xdelta = -Math.sin(graphics.rotation.y);
    var ydelta = -Math.cos(graphics.rotation.y);

    graphics.position.x += game.config.fly_speed * avatar.move * xdelta;
    graphics.position.z += game.config.fly_speed * avatar.move * ydelta;

    if(Input.keys[controls.up]) {
        graphics.position.y += game.config.fly_speed * avatar.move;
    }
    if(Input.keys[controls.down]) {
        graphics.position.y -= game.config.fly_speed * avatar.move;
    }
    if(Input.keys[controls.left]) {
        graphics.rotation.y += game.config.fly_turn_speed * avatar.turn;
    }
    if(Input.keys[controls.right]) {
        graphics.rotation.y -= game.config.fly_turn_speed * avatar.turn;
    }
};

GameObject.prototype.handleWalk = function() {
    var controls = this.player.controls;
    var graphics = this.graphics;
    var avatar = this.avatar;

    var xdelta = -Math.sin(graphics.rotation.y);
    var ydelta = -Math.cos(graphics.rotation.y);

    if(Input.keys[controls.up]) {
        graphics.position.x += game.config.walk_speed * avatar.move * xdelta;
        graphics.position.z += game.config.walk_speed * avatar.move * ydelta;
    }
    if(Input.keys[controls.down]) {
        graphics.position.x -= game.config.walk_speed * avatar.move * xdelta;
        graphics.position.z -= game.config.walk_speed * avatar.move * ydelta;
    }
    if(Input.keys[controls.left]) {
        graphics.rotation.y += game.config.walk_turn_speed * avatar.turn;
    }
    if(Input.keys[controls.right]) {
        graphics.rotation.y -= game.config.walk_turn_speed * avatar.turn;
    }
};


/** Physics system **/


GameObject.prototype.updatePhysics = function(delta, terrain) {
    this.considerSurface(delta, terrain);
};

GameObject.prototype.considerSurface = function(delta, terrain) {
    var surface = terrain.graphics;
/* TODO: Separate collision mesh loading
    var surface = terrain.collisionMesh;

    if(typeof surface === "undefined" || surface === null) {
        game.log("No collision mesh on surface:", terrain);
        surface = terrain.graphics;
    }
*/

    GameObject.vector.copy(this.graphics.position);
    GameObject.vector.y += game.config.feet_height;
    GameObject.ray.set(GameObject.vector, GameObject.gravity);

    var intersects = GameObject.ray.intersectObject(surface);
    if(intersects.length > 0) {
        this.feet.position.copy(intersects[0].point);
        if(this.avatar.type == "walker") {
            this.graphics.position.copy(intersects[0].point);
        }
    }
};


/** Animation system **/


GameObject.prototype.updateAnimation = function(delta) {
    var graphics = this.graphics;
    if(typeof graphics !== "undefined" && graphics) {
        if(typeof graphics.morphTargetInfluences !== "undefined") {
            this.animateModel(graphics, delta);
        }
    }
};

GameObject.prototype.animateModel = function(delta) {
    var mesh = this.graphics;

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

GameObject.prototype.getForward = function() {
    GameObject.matrix.extractRotation(this.graphics.matrix);
    return GameObject.matrix.multiplyVector3(GameObject.forward);
};


/** Sound system **/







var Eto = function() {
    this.CONFIG = ETO_CONFIG_DEFAULT;

    this.characters = [];
    this.items = {};
    this.players = [];
    this.field = null;

    this.camera = null;
    this.scene = null;
    this.renderer = null;

    this.isRunning = false;

    this.clock = new THREE.Clock();
    this.frameTime = 0;
};

Object.defineProperty(Eto.prototype, "time", {
    get: function() { return this.frameTime; }
});

Object.defineProperty(Eto.prototype, "config", {
    get: function() { return this.CONFIG; }
});

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

    field.collisionMesh = field.graphics;
    return field;
};

Eto.prototype.loadField = function(scene, map) {
    var field = new GameObject(scene);
    game.log("Loading map: ", map);
    field.setAvatar(map);
    field.loadData(this.dataPath(""), false);

    field.collisionMesh = field.graphics;
    return field;
};

Eto.prototype.createRenderer = function() {
    var renderer = new THREE.WebGLRenderer();
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
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    this.animate();
};

Eto.prototype.stop = function() {
    this.isRunning = false;
    this.isPaused = true;
    this.clock.stop();
};

Eto.prototype.togglePause = function() {
// TODO: This really fracks up the animation delta calculation
    if(!this.isPaused) {
        this.isPaused = true;
        this.clock.stop();
    }
    else {
        this.isPaused = false;
        this.clock.start();
    }
}

Eto.prototype.animate = function() {
    if(!this.isRunning) {
        return;
    }

    requestAnimationFrame(this.animate.bind(this));

    this.update();

    this.renderer.render(this.scene, this.camera);
};

Eto.prototype.update = function() {
    var delta = this.clock.getDelta();

    if(this.isPaused) {
        return;
    }

    this.frameTime += delta;

    THREE.AnimationHandler.update(delta);

    this.updateInput(delta);
    this.updatePhysics(delta);
    this.updateAnimation(delta);
    this.updateCamera(delta);
};

Eto.prototype.updateInput = function(delta) {
    for(var i = 0; i < this.players.length; ++i) {
        this.players[i].updateInput(delta);
    }
};

Eto.prototype.updateAnimation = function(delta) {
    for(var i = 0; i < this.players.length; ++i) {
        this.players[i].updateAnimation(delta);
    }
};

Eto.prototype.updatePhysics = function(delta) {
    for(var i = 0; i < this.players.length; ++i) {
        this.players[i].updatePhysics(delta, this.field);
    }
};

Eto.prototype.updateCamera = function(delta) {
// Zoom camera to contain all objects
//    this.camera.lookAt(this.cameraTarget);
};


Eto.prototype.loadEntities = function(list) {
    var self = this;
    var counter = list.slice(0);

    var successfun = function(data) {
        self.characters = self.characters.concat(data.characters);

        for(var item in data.items) {
            self.items[item] = data.items[item];
            self.items[item].name = item;
        }
    };

    var errorfun = function(hr, status, error) {
        this.error("Error while loading " + url + ": " + status +
            " - " + error);
    };

    var completefun = function() {
        if(counter.length === 0) {
            self.entitiesLoaded();
        }
    };


    while(counter.length) {
        var url = this.dataPath(counter.pop());
        $.ajax({
            cache: !this.config.DEBUG,
            url: url,
            dataType: "json",
            success: successfun,
            error: errorfun,
            complete: completefun
        });
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
        game.log(event, event.data);
    };
};

Eto.prototype.closeConnections = function() {
    this.connection.close();
};

Eto.prototype.initGame = function() {
    game.log("config", this.CONFIG);
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
        var item = new GameObject(this.scene);
        item.setAvatar(player.avatar.items[i]);
        item.setItem(this.items[item.avatar.name]);
        item.loadData(this.dataPath(""), false);
        player.items.push(item);
    }
};



Eto.prototype.dataPath = function(file) {
    return this.CONFIG.basepath + this.CONFIG.datapath + file;
};

Eto.prototype.log = ETO_CONFIG_DEFAULT.DEBUG ?
    window.console.log.bind(window.console) : function() {};

Eto.prototype.error = function(message) {
    this.log(message);
    this.log("*** Stack trace: ", (new Error()).stack);

    if(this.config.DEBUG) {
        alert(message);
    }
};



Eto.prototype.entitiesLoaded = function() {
    for(var i = 0; i < this.CONFIG.playercount; ++i) {
        this.createPlayer(i);
    }

    this.start();
};

Eto.prototype.createAudio = function() {
    return new Audio();
};

Eto.prototype.toggleMenu = function() {
    $("#settings").toggleClass("hidden");

    this.togglePause();
};

Eto.prototype.init = function() {

    this.connections = this.createConnections();

    this.audio = this.createAudio();

    this.camera = this.createCamera();
    this.scene = this.createScene();

    this.renderer = this.createRenderer();
    var container = document.getElementById("container");
    container.appendChild(this.renderer.domElement);


    $(document).on("keydown", Input.keyDown);
    $(document).on("keyup", Input.keyUp);

    $("#controls").find("#disconnect").on("click",
        function() { game.error("DISCO!"); });

    $(window).on("resize", this.onWindowResize.bind(this), false);

    this.initGame();
};

function loadConfiguration(game) {
    $.ajax({
        url: game.config.basepath + game.config.configuration_file,
        cache: !game.config.DEBUG,
        dataType: "json",
        success: function(data) {
            for(var setting in data) {
                game.config[setting] = data[setting];
            }
        },
        error: function(hr, status, error) {
            game.error("Error while loading " + url + ": " + status +
                " - " + error);
        },
        complete: function() {
            game.init();
        }
    });
}

var game = new Eto();
loadConfiguration(game);
