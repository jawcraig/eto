// Author: jawcraig (jawcraig@gmail.com)

var ETO_CONFIG_DEFAULT = {
    title: "ETO",
    version: "0.0.1",

    DEBUG: true,

    configuration_file: "config.json",
    basepath: "",
    datapath: "data/",

    cache_textures: true,
    cache_sounds: true,


    menu_key: 27,


    renderer_params: {
        precision: THREE.highp,
        alpha: true,
        antialias: true
        //ShadowMapEnabled: true,
        // ?//ShadowMapType: PCFSoftShadowMap,
        //ShadowMapCascade: true,
    },

    camera_fov: 75,
    camera_min_fov: 10,
    camera_max_fov: 120,
    camera_near: 1,
    camera_far: 1000,
    camera_position: {x: 20, y: 60, z: 20},
    camera_up: {x: 0, y: 1, z: 0},
    camera_lookat: {x: 0, y: 0, z: 0},
    camera_zoom_speed: 5,

    sky_size: 300,
    sky_color: 0x707090,


    max_volume: 100,
    master_volume: 1.0,
    play_music: false,
    audio_types: [
        {suffix: ".mp3", type: "audio/mpeg"},
        {suffix: ".ogg", type: "audio/ogg"}
    ],


    gravity: {x: 0, y: -1, z: 0},
    forward: {x: 0, y: 0, z: 1},
    feet_start_height: 100,
    feet_end_height: 1,

    walk_speed: 0.2,
    walk_turn_speed: 0.03,
    fly_speed: 0.3,
    fly_turn_speed: 0.03,

    projectile_speed: 0.1,
    projectile_turn_speed: 0.3,
    explosion_size: 1,
    explosion_base_damage: 1,
    explosion_exponent: 2,

    item_cooldown: 1,
    autoaim: 2 * Math.PI / 360,

    player_start_health: 50
};


/** Input system singleton **/


var Input = {
    keys: [],
    oldPageX: 0,
    oldPageY: 0,

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
        if(event.keyCode == game.config.menu_key) {
            game.toggleMenu();
            return;
        }

        if(game.isPaused) {
            return;
        }
        event.preventDefault();


        Input.keys[event.keyCode] = false;
    },

    keyDown: function(event) {
        if(game.isPaused) {
            return;
        }
        event.preventDefault();
        Input.keys[event.keyCode] = true;
    },


    mouseWheel: function(event) {
        if(game.isPaused) {
            return;
        }
        game.zoomCamera(event.originalEvent.deltaY);
    },

    mouseMove: function(event) {
        if(game.isPaused) {
            return;
        }
        var deltax = event.pageX - Input.oldPageX;
        var deltay = event.pageY - Input.oldPageY;
        game.moveCamera(deltax, deltay);
        Input.oldPageX = event.pageX; 
        Input.oldPageY = event.pageY; 
    },


    mouseDown: function(event) {
        if(game.isPaused) {
            return;
        }
        Input.oldPageX = event.pageX; 
        Input.oldPageY = event.pageY; 
        $(document).on("mousemove", Input.mouseMove)
    },

    mouseUp: function(event) {
        if(game.isPaused) {
            return;
        }
        $(document).off("mousemove", Input.mouseMove);
    }
};


/** Resource manager **/

var ResourceManager = {
    emptyGeometry: new THREE.BoxGeometry(3, 3, 3, 2, 2, 2),
    emptyMaterial: new THREE.MeshBasicMaterial({color:0x0000FF}),
    textureCache: {},
    soundCache: {},

    dataPath: function(file) {
        return game.config.basepath + game.config.datapath + file;
    },

    getPlaceHolder: function() {
        var mesh = new THREE.SkinnedMesh(this.emptyGeometry,
            this.emptyMaterial, false);
        mesh.geometry.computeBoundingSphere();
        mesh.geometry.computeBoundingBox();
        mesh.name = "placeholder";
        return mesh;
    },

    loadingError: function(url, status, error) {
        game.error("Error while loading " + url + ": " + status +
            " - " + error);
    },

    loadConfiguration: function(game) {
        var url = game.config.basepath + game.config.configuration_file;
        $.ajax({
            url: url,
            cache: !game.config.DEBUG,
            dataType: "json",
            success: function(data) {
                for(var setting in data) {
                    game.config[setting] = data[setting];
                }
            },
            error: function(hr, status, error) {
                ResourceManager.loadingError(url, status, error);
            },
            complete: function() {
                game.init();
            }
        });
    },

    loadEntities: function(list, successfun, completefun) {
        var errorfun = function(hr, status, error) {
            ResourceManager.loadingError(url, status, error);
        };

        while(list.length) {
            var url = ResourceManager.dataPath(list.pop());

            $.ajax({
                cache: !game.config.DEBUG,
                url: url,
                dataType: "json",
                success: successfun,
                error: errorfun,
                complete: completefun
            });
        }
    },

    loadSound: function(file, audio) {
        if(file in ResourceManager.soundCache) {
            return ResourceManager.soundCache[file];
        }

    // TODO: Implement this using $.ajax (JQuery still buggy?)

        var url = ResourceManager.dataPath(file);
        game.log("Loading audio:", url);

        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        var sound = audio.createSound();

        request.onload = function() {
            audio.decodeAudio(sound, request.response);
        };

        request.send();

        if(game.config.cache_sounds) {
            ResourceManager.soundCache[file] = sound;
        }

        return sound;
    },

    loadTexture: function(textureurl) {
        if(textureurl in ResourceManager.textureCache) {
            return ResourceManager.textureCache[textureurl];
        }

        var url = ResourceManager.dataPath(textureurl);

        var texture = THREE.ImageUtils.loadTexture(url);

        if(game.config.cache_textures) {
            ResourceManager.textureCache[textureurl] = texture;
        }

        return texture;
    },

    loadCollisionModel: function(entity, modelurl) {
        var self = entity;

        game.log("Loading collision model " + modelurl);
        var loader = new THREE.JSONLoader();
        loader.load(ResourceManager.dataPath(modelurl),
            function(geometry, materials) {
                var material = new THREE.MeshBasicMaterial({color: 0xff0000});
                var mesh = new THREE.Mesh(geometry, material);
                self.setMeshProperties(mesh, self.avatar);
                self.collisionMesh = mesh;
            }
        );
    },

    loadModel: function(entity, modelurl) {
        var self = entity;

        game.log("Loading model " + modelurl);
        var loader = new THREE.JSONLoader();
        loader.load(ResourceManager.dataPath(modelurl),
            function(geometry, materials) {
                var buffer = new THREE.BufferGeometry();
                buffer.fromGeometry(geometry);

                var material = ResourceManager.loadMaterial(materials);

                var mesh = new THREE.Mesh(buffer, material);

                self.avatar.geometry = buffer;
                self.avatar.material = material;

                self.finalizeGraphics(mesh);
            }
        );
    },

    loadMaterial: function(materials) {
        // TODO: var material = new THREE.MeshFaceMaterial(materials);
        var material = new THREE.MeshPhongMaterial({
            color: 0x224422,
            specular: 0x225522,
            shininess: 10,
            shading: THREE.FlatShading
        });

        return material;
    },

    loadAnimatedModel: function(entity, modelurl) {
        var self = entity;

        game.log("Loading skinned model " + modelurl);
        var loader = new THREE.JSONLoader();
        loader.load(ResourceManager.dataPath(modelurl),
            function(geometry, materials) {
                var buffer = new THREE.BufferGeometry();
                buffer.fromGeometry(geometry);

                var material =
                    ResourceManager.loadSkinnedMaterial(materials);
                var mesh = new THREE.SkinnedMesh(buffer, material, false);
                mesh.pose();

                self.avatar.geometry = buffer;
                self.avatar.material = material;

                self.finalizeGraphics(mesh);

                if(Entity.hasComponent(buffer.animations) &&
                        buffer.animations.length > 0) {

                    self.avatar.animation = new THREE.Animation(mesh,
                        buffer.animations[0]);
                    self.avatar.animation.play(0);
                    // self.avatar.animations = []
                }
            }
        );
    },

    loadSkinnedMaterial: function(materials) {
        //TODO: var material = new THREE.MeshFaceMaterial(materials);
        // TODO: enableSkinned
        var material = new THREE.MeshPhongMaterial({
            color: 0x664422,
            specular: 0x009900,
            shininess: 30,
            shading: THREE.FlatShading
        });

        return material;
    }
};


/** Audio system **/


var Audio = function() {
    this.context = new AudioContext();
    this.enable3D = false;
    this.enableDoppler = false;

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

Audio.prototype.setAudio3D = function(value) {
    // TODO: Add/remove the panner code
};

var Sound = function(buffer) {
    this.buffer = buffer;
};

Audio.prototype.decodeAudio = function(sound, data) {
    this.context.decodeAudioData(
        data,

        function(buffer) {
            // Complete
            sound.buffer = buffer;
            game.log("Sound decoded!", buffer);
        },

        function() {
            // Error
            game.error("Can't decode " + url);
        }
    );
};

Audio.prototype.createPanner = function() {
    var panner = context.createPanner();
    panner.connect(this.masterGain);
};

Audio.prototype.updatePannerPosition = function(panner, object) {
    Entity.vector.setFromMatrixPosition(object.graphics.matrixWorld);
    panner.setPosition(Entity.vector.x, Entity.vector.y,
        Entity.vector.z);
    // TODO: Doppler, listener direction:
// http://www.html5rocks.com/en/tutorials/webaudio/positional_audio/http://www.html5rocks.com/en/tutorials/webaudio/positional_audio/
};

Audio.prototype.updateListenerPosition = function(camera) {
    camera.position.set(x, y, z);
    camera.updateMatrixWorld();
    Entity.vector.setFromMatrixPosition(camera.matrixWorld);
    this.context.listener.setPosition(Entity.vector.x,
        Entity.vector.y, Entity.vector.z);
};

Audio.prototype.createSound = function() {
    return new Sound(null);
};

Audio.prototype.playSound = function(sound, source, destination, time) {
    var buffer = sound.buffer;

    if(typeof buffer === "undefined" || buffer === null) {
        game.error("Audio: trying to play empty buffer");
        return;
    }

    if(typeof source === "undefined" || source === null) {
        game.log("Audio: Empty source given, creating a new one");
        source = this.context.createBufferSource();
    }

    source.buffer = buffer;
    source.connect(this.getDestination());

    if(typeof time !== "undefined" && time !== null) {
        source.start(time);
    }
    else {
        source.start(0);
    }
};


/** Game Object **/


var Entity = function(parent) {
    this.parent = parent;

    var material = new THREE.MeshBasicMaterial({color: 0xB0C0D0});
    var geometry = new THREE.BoxGeometry(0.2, 10, 0.2);
    this.feet = new THREE.Mesh(geometry, material);

    this.graphics = null;
};

// Global gravity vector - usually negative y
Entity.gravity = new THREE.Vector3(ETO_CONFIG_DEFAULT.gravity.x,
    ETO_CONFIG_DEFAULT.gravity.y, ETO_CONFIG_DEFAULT.gravity.z);
Entity.up = new THREE.Vector3(-ETO_CONFIG_DEFAULT.gravity.x,
    -ETO_CONFIG_DEFAULT.gravity.y, -ETO_CONFIG_DEFAULT.gravity.z);
// Global forward vector - usually positive z
Entity.forward = new THREE.Vector3(ETO_CONFIG_DEFAULT.forward.x,
    ETO_CONFIG_DEFAULT.forward.y, ETO_CONFIG_DEFAULT.forward.z);
// Temporary matrix & vector for calculations
Entity.matrix = new THREE.Matrix4();
Entity.quaternion = new THREE.Quaternion();
Entity.vector = new THREE.Vector3();
Entity.vector2 = new THREE.Vector3();
Entity.vector3 = new THREE.Vector3();
// Ray caster
Entity.ray = new THREE.Raycaster();

Entity.hasComponent = function(component) {
    return (typeof component !== "undefined" && component !== null);
};

Entity.prototype.startUpdate = function(delta) {
    if(Entity.hasComponent(this.graphics) &&
            Entity.hasComponent(this.physics)) {
        this.physics.oldPosition.copy(this.graphics.position);
    }

    if(Entity.hasComponent(this.player)) {
        if(!(this.ai.health > 0)) {
            this.playerDies();
        }

        return this.ai.alive;
    }

    if(Entity.hasComponent(this.item) && Entity.hasComponent(this.ai.alive)) {
        return this.ai.alive;
    }

    if(Entity.hasComponent(this.ai) &&
        Entity.hasComponent(this.ai.explosionstart) &&
        Entity.hasComponent(this.ai.alive)) {

        return this.ai.alive;
    }

    game.log("startUpdate called for unknown entity", this);
    return false; // Not alive
};

Entity.prototype.setAvatar = function(avatar) {
    this.avatar = avatar;
};

Entity.prototype.setProjectile = function(item) {
    this.item = item;

    this.ai = {
        type: "projectile",
        alive: true,
        speed: this.item.speed * game.config.projectile_speed,
        turn: this.item.turn * game.config.projectile_turn_speed
    };

    this.physics = {
        oldPosition: new THREE.Vector3(),
        oldDelta: 1,
        gravity: (Entity.hasComponent(this.item.gravity) && this.item.gravity)
    };

    if(this.physics.gravity) {
        // Angle of fire supposing constant elevation, note that max r = v^2/g
        var g = Entity.gravity.length;
        var v2 = Math.pow(this.ai.speed, 2);
        var r = this.item.range;

        if(Math.abs(r * g) <= Math.abs(v2)) {
            this.physics.theta = Math.asin(r * g / v2) / 2;
        }
        else {
            game.log("Impossible ballistics given in ", this.item);
            this.physics.theta = 1;
        }
    }
};

Entity.prototype.setPlayer = function(player) {
    this.player = player;

    if(!Entity.hasComponent(player.strength)) {
        player.strength = 1;
    }

    this.ai = {
        type: this.avatar.type,
        alive: true,
        round_start_health: player.strength * game.config.player_start_health,
        heading: this.getStartHeading()
            // TODO: FIXME: Set rotation towards heading
    };

    this.ai.health = this.ai.round_start_health;
    game.recordPlayerHealth(this.player.index, this.ai.health,
        this.ai.round_start_health);

    if(this.ai.type == "flyer") {
        this.ai.speed = this.avatar.speed * game.config.fly_speed;
        this.ai.turn = this.avatar.turn * game.config.fly_turn_speed;
    }
    else {
        this.ai.speed = this.avatar.speed * game.config.walk_speed;
        this.ai.turn = this.avatar.turn * game.config.walk_turn_speed;
    }

    this.physics = {
        oldPosition: new THREE.Vector3()
    };
};

Entity.prototype.getStartHeading = function() {
    // TODO: Point at nearest enemy
    return 0;
};

Entity.prototype.setItem = function(item) {
    this.ai = {
        lastFired: -1000 
    };

    this.item = item;

    this.setModel(this.item.model);

    var geometry = new THREE.BoxGeometry(0.2, 0.2, 10.2);
    var material = new THREE.MeshBasicMaterial({color: 0xE010D0});
    this.shot = new THREE.Mesh(geometry, material);

    geometry = new THREE.BoxGeometry(1, 1, 1);
    material = new THREE.MeshBasicMaterial({color: 0xFF1010});
    this.crosshair = new THREE.Mesh(geometry, material);
    Entity.vector.copy(game.config.forward);
    Entity.vector.multiplyScalar(10);
    this.crosshair.position.copy(Entity.vector);
};

Entity.prototype.setModel = function(model) {
    if(!Entity.hasComponent(this.avatar)) {
        this.avatar = {};
    }

    this.avatar.model = model;
};

Entity.prototype.fireProjectileFrom = function(entity, delta) {
    this.ai.owner = entity.parent;
    this.ai.subtype = entity.item.name;
    this.graphics.position.setFromMatrixPosition(
        entity.graphics.matrixWorld);

    // TODO: Place in a better place -> accurate collision check
    // TODO: Place in more realistic place -> accurate collision check

// TODO: Rotate up from horizontal by theta

// TODO: Get global rotation: ? get quaternion from matrix and extract?
//  projectile.graphics.rotation.setFromMatrixRotation(
//        item.graphics.matrixWorld);

    // newpos = oldpos + v * t
    this.physics.oldDelta = delta;
    this.physics.oldPosition.copy(entity.parent.physics.oldPosition);
    entity.getForward().multiplyScalar(-this.ai.speed * delta);
    this.physics.oldPosition.add(Entity.vector);
    // Acceleration is 0 until first time step (should be a * t^2)
    // Could also substract: acceleration0 * delta * delta;
};

Entity.prototype.createParticles = function(center, radius) {
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0, 0.1, 0));
    geometry.vertices.push(new THREE.Vector3(1, 1, 1));
    geometry.vertices.push(new THREE.Vector3(2, 2, -1.5));
    geometry.vertices.push(new THREE.Vector3(0, 3, 2));

    var texture = ResourceManager.loadTexture("sprite.png");

    var material = new THREE.PointCloudMaterial({
        size: radius,
        map: texture,
        transparent: true
    });

    var explosion = new THREE.PointCloud(geometry, material);
    explosion.position.copy(center);

    return explosion;
};

Entity.prototype.createBubble = function(center, radius) {
    var material = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.5
    });

    var geometry = new THREE.SphereGeometry(radius, 16, 16);

    var explosion = new THREE.Mesh(geometry, material);
    explosion.position.copy(center);

    return explosion;
};

Entity.prototype.setExplosion = function(center, owner, item) {
    // TODO: Effect class

    this.ai = {
        alive: true,
        radius: game.config.explosion_size,
        explosionstart: game.time,
        owner: owner,
        damage: item.damage
    };

    if(Entity.hasComponent(item.splash)) {
        this.ai.radius *= item.splash;
    }

    var explosion = this.createParticles(center, this.ai.radius);
    this.graphics = explosion;
    this.parent.graphics.add(this.graphics);

    this.bubble = this.createBubble(center, this.ai.radius);
    this.parent.graphics.add(this.bubble);

    // TODO: Place this to... somewhere else? ai update phase? 
    this.explodePlayers();
};

Entity.prototype.explodePlayers = function() {
    for(var index in game.players) {
        var player = game.players[index];
        var hits = this.doesExplosionHitObject(player.getCollisionMesh());
        if(hits) {
            game.log("explosion ", this, " hits player: ", player);
            var damage = this.explosionDamage(player.graphics.position);
            
            player.damagePlayer(damage, this.ai.owner);
            // TODO: Consider range & throw player in air
        }
    }
};

Entity.prototype.doesExplosionHitObject = function(object) {
    if(this.graphics.position.distanceTo(object.position) <
        object.geometry.boundingSphere.radius + this.ai.radius) {

        return true;
    }

    return false;
};

Entity.prototype.explosionDamage = function(point) {
    var radius = this.ai.radius;
    var range = this.graphics.position.distanceTo(point);
    var basedamage = game.config.explosion_base_damage * this.ai.damage;
    var rangefactor = Math.pow(range, game.config.explosion_exponent);
    return basedamage / rangefactor;
};
Entity.prototype.killExplosion = function() {
    this.removeGraphics();
};

Entity.prototype.explodeProjectile = function(delta) {
    game.log("exploding", this);

    game.createExplosion(this.graphics.position, this.ai.owner, this.item);

    this.removeGraphics();
};


Entity.prototype.damagePlayer = function(damage, owner) {
    console.log("player hit with damage", damage, owner);
    game.assert(!isNaN(damage), "not number");
    game.assert(typeof damage !== "null", "null");
    this.ai.health -= damage;

    game.recordPlayerHealth(this.player.index, this.ai.health,
        this.ai.round_start_health);

    if(this.ai.alive && !(this.ai.health > 0)) {
        if(this.player.index != owner.player.index) {
            game.recordPlayerKill(owner.player.index);
        }
    }
};

/** GRAPHICS system **/


Entity.prototype.loadData = function(animated) {
    animated = animated || false;
    // Load Scripts

    // Load Audio

    // Load Graphics

    if(!Entity.hasComponent(this.avatar)) {
        return;
    }


    // TODO: support .pack format, deduce skinning from the json contents
    if(Entity.hasComponent(this.avatar.model)) {
        if(!Entity.hasComponent(this.graphics)) {
            this.graphics = ResourceManager.getPlaceHolder();

            if(Entity.hasComponent(this.avatar.geometry) &&
                    Entity.hasComponent(this.avatar.material)) {
                game.log("Using cached model");
                var mesh = null;
                if(animated) {
                    mesh = new THREE.SkinnedMesh(this.avatar.geometry,
                        this.avatar.material);
                }
                else {
                    mesh = new THREE.Mesh(this.avatar.geometry,
                        this.avatar.material);
                }
                this.finalizeGraphics(mesh);
                return;
            }

            // TODO: Cache collision mesh
            this.collisionMesh = this.graphics;
            if(Entity.hasComponent(this.parent)) {
                this.parent.graphics.add(this.graphics);
            }
        }

        if(animated) {
            game.log("loadAnimated:", this, this.avatar.name);
            ResourceManager.loadAnimatedModel(this, this.avatar.model);
        }
        else {
            game.log("loadModel:", this, this.avatar.name);
            ResourceManager.loadModel(this, this.avatar.model);
        }
    }

    if(Entity.hasComponent(this.avatar.collision)) {
        game.log("load collision model:", this.avatar.name);
        ResourceManager.loadCollisionModel(this, this.avatar.collision);
    }
};


Entity.prototype.moveGraphicsRelationsTo = function(mesh) {
    // TODO: BUG: Mishandles bones in skinned mesh? moves children to another!

    var oldgraphics = this.graphics;
    this.graphics = mesh;

    var children = oldgraphics.children;
    while(children.length > 0) {
        this.graphics.add(children[children.length - 1]);
    }

    if(Entity.hasComponent(this.parent.graphics)) {
        this.parent.graphics.remove(oldgraphics);
        this.parent.graphics.add(this.graphics);
    }
};

Entity.prototype.setMeshProperties = function(mesh, props) {
    mesh.name = props.name;
    props.geometry = mesh.geometry;
    props.material = mesh.material;

    mesh.position.copy(this.graphics.position);
    mesh.rotation.copy(this.graphics.rotation);
    mesh.scale.copy(this.graphics.scale);

    if(Entity.hasComponent(props)) {
        if(Entity.hasComponent(props.scale)) {
            mesh.scale.set(props.scale.x,
                props.scale.y, props.scale.z);
        }
        if(Entity.hasComponent(props.rotation)) {
            mesh.rotation.set(props.rotation.x,
                props.rotation.y, props.rotation.z);
        }
        if(Entity.hasComponent(props.position)) {
            mesh.position.set(props.position.x,
                props.position.y, props.position.z);
        }
    }

    mesh.geometry.computeBoundingSphere();
    mesh.geometry.computeBoundingBox();
};

Entity.prototype.removeGraphics = function() {
    if(Entity.hasComponent(this.parent.graphics)) {
        this.parent.graphics.remove(this.graphics);
    }
    if(Entity.hasComponent(this.feet)) {
        this.parent.graphics.remove(this.feet);
    }

    // TODO: FIXME: REMOVE: this.
    if(Entity.hasComponent(this.bubble)) {
        this.parent.graphics.remove(this.bubble);
    }
};

Entity.prototype.finalizeGraphics = function(mesh) {
    this.setMeshProperties(mesh, this.avatar);

    this.moveGraphicsRelationsTo(mesh);

    if(Entity.hasComponent(this.avatar) &&
            Entity.hasComponent(this.avatar.name)) {
        this.graphics.name = this.avatar.name;
    }

    if(!Entity.hasComponent(this.avatar.collision)) {
        // TODO: Bug: Race condition: collision arrives before -> overwritten!
        this.collisionMesh = this.graphics;
    }

    if(Entity.hasComponent(this.ai) && Entity.hasComponent(this.ai.type) &&
        (this.ai.type == "flyer" || this.ai.type == "projectile")) {
        game.scene.add(this.feet);
    }

    if(Entity.hasComponent(this.item) && this.item.type == "gun") {
        game.scene.add(this.shot);
    }

    if(Entity.hasComponent(this.crosshair)) {
        this.graphics.add(this.crosshair);
    }
};

/** AI system **/


Entity.prototype.updateInput = function(delta) {
    if(this.player.connection != "local") {
        return;
    }

    var graphics = this.graphics;

    if(!Entity.hasComponent(graphics)) {
        return;
    }

    if(this.ai.type == "walker") {
        this.handleWalk();
    }
    else if(this.ai.type == "flyer") {
        this.handleFly();
    }
    else {
        game.log("Unknown avatar type: ", this.ai.type, this);
        game.error("Unknown avatar type: " + this.ai.type);
    }

    this.handleActions();
};

Entity.prototype.handleActions = function(delta) {
    var controls = this.player.controls;
    var graphics = this.graphics;

    if(Input.keys[controls.primary]) {
        if(this.items.length > 0) {
            this.fire(this.items[0], delta);
        }

        graphics.material.color.setHex(0x00FF00);
    }
    else if(Input.keys[controls.secondary]) {
        if(this.items.length > 1) {
            this.fire(this.items[1], delta);
        }

        graphics.material.color.setHex(0x0000FF);
    }
    else {
        graphics.material.color.setHex(0xFF0000);
    }
};

Entity.prototype.fire = function(slot, delta) {
    var item = slot.item;

    if(game.time - slot.ai.lastFired >
            game.config.item_cooldown * item.cooldown) {

        slot.ai.lastFired = game.time;

        switch(item.type) {
            case "gun":
                this.fireGun(slot);
                break;
            case "projectile":
                this.fireProjectile(slot, delta);
                break;
            case "special":
                game.createExplosion(this.graphics.position,
                    slot.ai.owner, slot);
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

Entity.prototype.getOwningPlayer = function() {
    if(Entity.hasComponent(this.projectile)) {
        // item
        return this.parent;
    }
    if(Entity.hasComponent(this.player)) {
        // player
        return this;
    }
    if(Entity.hasComponent(this.item)) {
        // projectile
        return this.item.parent;
    }
};

Entity.prototype.getTargetPlayer = function() {
    // TODO: Return the nearest/by angle other player
    return null;
};

Entity.prototype.getCollisionMesh = function() {
    return this.graphics;

    // TODO: Use separate mesh
    if(Entity.hasComponent(this.collisionMesh)) {
        return this.collisionMesh;
    }
};

Entity.prototype.fireGun = function(slot) {
    slot.shot.position.setFromMatrixPosition(slot.graphics.matrixWorld);
    var origin = slot.shot.position;
    var direction = slot.getForward();
    // TODO: Perturb by accuracy * randomvector
    //var theta = acos(game.random());
    //var phi = 2 * pi * game.random();

    Entity.ray.set(origin, direction);
    game.log("Resulting ray: ", origin, direction);
    game.scene.add(new THREE.ArrowHelper(direction, origin,
        100, 0xf0f0f0));

    if(!this.shootPlayers(slot)) {
        this.shootGround(slot);
    }
};

Entity.prototype.shootPlayers = function(slot) {
    for(var index in game.players) {
        var player = game.players[index]; 

        if(player == this.ai.owner) {
            continue;
        }
        game.log("player slot shoots", this);
        game.log("check ownership: ",player, "!= ", this.ai.owner);

        var autoaim = game.config.autoaim; 

        if(Entity.hasComponent(slot.autoaim)) {
            autoaim += slot.autoaim / 180 * Math.PI;
        }

        game.log("Player shooting ray: ", Entity.ray.ray.origin,
            Entity.ray.ray.direction);
        Entity.vector2 = player.graphics.position;
        Entity.vector2.sub(Entity.ray.ray.origin);
        var angle = Entity.vector2.angleTo(Entity.ray.ray.direction);

        game.log(angle, "<=", autoaim);
        if(angle <= autoaim) {
            game.log("shot ", slot, " autoaims to player: ", player);
            player.damagePlayer(slot.item.damage, this.ai.owner);
            // TODO: Consider range & throw player in air
            return player.graphics.position;
        }

        var results = Entity.ray.intersectObject(player.getCollisionMesh());
        if(results.length > 0) {
            game.log("shot ", slot, " hits player: ", player);
            player.damagePlayer(slot.item.damage, this.ai.owner);
            // TODO: Consider range & throw player in air
            return results[0].point;
        }
    }

    return null;
};

Entity.prototype.shootGround = function(slot) {
    var surface = game.field.getCollisionMesh();
    var intersects = Entity.ray.intersectObject(surface);

    if(intersects.length > 0) {
        slot.shot.position.copy(intersects[0].point);
        slot.shot.lookAt(intersects[0].face.normal);
        game.createExplosion(intersects[0].point, slot.ai.owner, slot.item);
    }
    else {
        slot.shot.lookAt(Entity.ray.ray.direction.add(slot.shot.position));
        game.createExplosion(slot.shot.position, slot.ai.owner, slot.item);
    }
};

Entity.prototype.fireProjectile = function(slot, delta) {
    game.log("Firing: ", slot.item.name);
    game.createProjectile(slot, delta);
};

Entity.prototype.fireSpecial = function(slot) {
    game.log("Firing: ", slot.item.name);

    if(slot.item.name == "selfdestruct") {
        this.createExplosion(this, slot.item);
        this.alive = false;
        return;
    }

    fireSpecial(slot);
};

Entity.prototype.fireFlamer = function(slot) {
    game.log("Firing: ", slot.item.name);
    fireFlamer(slot);
};

Entity.prototype.fireLaser = function(slot) {
    game.log("Firing: ", slot.item.name);
    fireLaser(slot);
};

Entity.prototype.handleProjectile = function(delta) {
    var graphics = this.graphics;

    // Store original position
    Entity.vector3.copy(graphics.position);
    
/*
    var position = this.graphics.position;
    var oldposition = this.physics.oldPosition;
    var olddelta = this.physics.oldDelta;

    if(this.physics.gravity) {
        // var accel = this.item.gravity * Entity.gravity;
        // TODO: Impact of gravity - physics!
    }
    // Verlet ingerator with varying time step
//    newpos = position + (position - oldposition) * delta/olddelta +
 //       accel * delta * (delta + olddelta) / 2;

    // TODO: Set to face towards velocity
    this.graphics.lookAt(newpos);

*/

    // Euler integrator with zero acceleration : x1 = x + v * t + g
    // TODO Use this instead of owner
    if(this.ai.subtype == "missiles") {
        Entity.vector =
            this.ai.owner.getForward().multiplyScalar(this.ai.speed);
        /*
        Entity.quaternion.setFromAxisAngle(Entity.up, avatar.turn);
        Entity.quaternion.multiplyQuaternions(graphics.quaternion,
            Entity.quaternion);
        graphics.setRotationFromQuaternion(Entity.quaternion);
        */
    }
    else {
        Entity.vector = this.getForward().multiplyScalar(this.ai.speed);
    }

    if(this.physics.gravity) {
        Entity.vector.add(Entity.gravity);
    }

    Entity.vector2 = graphics.position.add(Entity.vector);
    graphics.lookAt(Entity.vector2);
    graphics.position.copy(Entity.vector2);
    
    this.physics.oldPosition.copy(Entity.vector3);
    this.physics.oldDelta = delta;
};

Entity.prototype.handleFly = function(delta) {
    var controls = this.player.controls;
    var graphics = this.graphics;
    var avatar = this.avatar;

    Entity.vector = this.getHeading().multiplyScalar(this.ai.speed);

    if(Input.keys[controls.up]) {
        Entity.vector.y += this.ai.speed;
    }
    if(Input.keys[controls.down]) {
        Entity.vector.y -= this.ai.speed;
    }

    graphics.position.add(Entity.vector);


    if(Input.keys[controls.left]) {
        this.turnAngle(this.ai.turn);
    }
    if(Input.keys[controls.right]) {
        this.turnAngle(-this.ai.turn);
    }
};

Entity.prototype.handleWalk = function(delta) {
    var controls = this.player.controls;
    var graphics = this.graphics;
    var avatar = this.avatar;

    if(Input.keys[controls.up]) {
        graphics.position.add(this.getHeading().multiplyScalar(this.ai.speed));
    }
    if(Input.keys[controls.down]) {
        graphics.position.add(this.getHeading().multiplyScalar(-this.ai.speed));
    }

    if(Input.keys[controls.left]) {
        this.turnAngle(this.ai.turn);
    }
    if(Input.keys[controls.right]) {
        this.turnAngle(-this.ai.turn);
    }
};

Entity.prototype.turnAngle = function(angledelta) {
    this.ai.heading += angledelta;

    Entity.quaternion.setFromAxisAngle(Entity.up, angledelta);
    Entity.quaternion.multiplyQuaternions(this.graphics.quaternion,
        Entity.quaternion);
    this.graphics.setRotationFromQuaternion(Entity.quaternion);
};

Entity.prototype.getHeading = function() {
    return this.getForward();
};

/** Physics system **/


Entity.prototype.updatePhysics = function(delta) {
    var intersects = [];
    if(Entity.hasComponent(this.player)) {
        // A player
        intersects = this.considerSurface(delta, game.field);
        this.handleGroundIntersects(intersects);
    }
    else if(Entity.hasComponent(this.avatar) &&
            this.ai.type == "projectile") {
        // A projectile
        this.handleProjectile();
        intersects = this.considerSurface(delta, game.field);
        this.handleGroundIntersects(intersects);
// TODO: player interactions intersects = this.considerPlayers(delta);
    }
};

Entity.prototype.handleGroundIntersects = function(intersects) {
    if(intersects.length > 0) {
        var closest = intersects[0];
        this.feet.position.copy(closest.point);

        if(this.ai.type == "walker") {
            this.graphics.position.y = this.feet.position.y +
                game.config.feet_end_height;

            // Face along the surface
/*            Entity.vector = this.getForward();
            Entity.vector.projectOnPlane(closest.face.normal);
            Entity.vector2.setFromMatrixPosition(this.graphics.matrixWorld);
            Entity.vector.add(Entity.vector2);
            this.graphics.lookAt(Entity.vector);
*/
        }
        else {
            // Not a walker
            if(closest.distance - game.config.feet_start_height <
                this.graphics.geometry.boundingSphere.radius) {
                // TODO: Handle collision with ground more accurately!
                //      Now only uses bounding sphere
                if(this.ai.type == "projectile") {
                    this.projectileHitsGround();
                }
                else if(this.ai.type == "player") {
                    this.playerHitsGround();
                }
            }
        }
    }
    else {
        game.log("misses the ground");
        if(Entity.hasComponent(this.player)) {
            this.playerDies();
        }
        else {
            this.projectileHitsGround();
        }
    }
};

Entity.prototype.playerHitsGround = function() {
    // TODO: Sometimes called for non-flyers?
    game.assert(Entity.hasComponent(this.player) && this.ai.type == "flyer",
        "playerHitsGround called for a non-flyer ");
    game.log(this);

    game.log("TODO: player hits the ground and exploded!");
    this.playerDies();
};

Entity.prototype.projectileHitsGround = function() {
    game.log("projectileHitsGround!", this.ai);
    this.ai.alive = false;
};

Entity.prototype.playerDies = function() {
    this.ai.alive = false;
    game.createExplosion(this.graphics.position, this,
        game.items["selfdestruct"]);
    this.graphics.position.set(0, 100, 0);
    this.graphics.material.color.setHex(0xFF00FF);
};

Entity.prototype.considerObject = function(delta, object) {
    // TODO: FIXME: first use movement ray with the sphere to cull

    // TODO: Notice movement!
    // TODO: This works correctly only if center is inside the object!
    // Also requires the object to be quite large
    // TODO: Position of collisionmesh has to be linked!
    var collider = this.getCollisionMesh();
    var origin = this.graphics.position;
    var transformation = this.graphics.matrix;


    // Trace ray from center to every vertex, if collides with object, report
    var vertices = collider.geometry.vertices;
    var verticecount = vertices.length;
    for(var vertex = 0; vertex < verticecount; vertex++) {
        Entity.vector.copy(vertices[vertex]);
        Entity.vector.applyMatrix4(transformation);

        Entity.vector2.copy(Entity.vector.sub(origin));
        var distance = Entity.vector2.length;

        Entity.ray.set(Entity.vector, Entity.vector2);
        var results = Entity.ray.intersectObject(object);
        if(results.length > 0 && results[0].distance < distance) {
            return results;
        }
    }

    return null;
};

Entity.prototype.considerSurface = function(delta, terrain) {
    // TODO: Notice movement through!
    var surface = terrain.getCollisionMesh();

    Entity.vector.setFromMatrixPosition(this.graphics.matrixWorld);
    Entity.vector.y += game.config.feet_start_height;
    Entity.ray.set(Entity.vector, Entity.gravity);

    return Entity.ray.intersectObject(surface);
};


/** Animation system **/


Entity.prototype.updateAnimation = function(delta) {
    var graphics = this.graphics;
    if(Entity.hasComponent(graphics)) {
        if(Entity.hasComponent(graphics.morphTargetInfluences)) {
            this.animateModel(graphics, delta);
        }
    }

    if(Entity.hasComponent(this.ai) &&
        Entity.hasComponent(this.ai.explosionstart)) {

        this.graphics.scale.y *= 1.01;
        if(game.time - this.ai.explosionstart > 5) {
            this.ai.alive = false;
        }
    }
};

Entity.prototype.animateModel = function(delta) {
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

// Sets Entity.vector to forward
Entity.prototype.getForward = function() {
    Entity.matrix.extractRotation(this.graphics.matrixWorld);
    Entity.vector.copy(Entity.forward);
    return Entity.vector.applyMatrix4(Entity.matrix);
};


/** Sound system **/







var Eto = function() {
    this.CONFIG = ETO_CONFIG_DEFAULT;

    this.characters = {};
    this.items = {};

    this.maps = [];
    this.players = [];

    this.projectiles = [];
    this.explosions = [];


    this.field = null;

    this.camera = null;
    this.scene = null;
    this.renderer = null;

    this.isRunning = false;
    this.resetRequested = false;

    this.clock = new THREE.Clock();
    this.frameTime = 0;

    this.frameCounter = 0;
    this.averageFps = 0;
};

Object.defineProperty(Eto.prototype, "time", {
    get: function() { return this.frameTime; }
});

Object.defineProperty(Eto.prototype, "config", {
    get: function() { return this.CONFIG; }
});

Eto.prototype.initCamera = function(camera) {
    camera.position.set(
        this.config.camera_position.x,
        this.config.camera_position.y,
        this.config.camera_position.z);
    camera.up = new THREE.Vector3(
        this.config.camera_up.x,
        this.config.camera_up.y,
        this.config.camera_up.z);
    camera.lookAt(new THREE.Vector3(
        this.config.camera_lookat.x,
        this.config.camera_lookat.y,
        this.config.camera_lookat.z));
};

Eto.prototype.createCamera = function() {
    var camera = new THREE.PerspectiveCamera(this.config.camera_fov,
        window.innerWidth / window.innerHeight,
        this.config.camera_near, this.config.camera_far);

    this.initCamera(camera);
    return camera;
};

Eto.prototype.createScene = function() {
    var scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2(0x000010, 0.04);

    scene.name = this.config.title;

    this.master = new Entity(null);
    this.master.parent = this.master;
    this.master.graphics = scene;

    scene.add(new THREE.AxisHelper(50));

    this.sky = this.createSky();
    scene.add(this.sky);

    scene.add(new THREE.AmbientLight(0xbbbbbb));
    var point = new THREE.PointLight(0x6f4420, 10, 500);
    point.position.set(100, 100, 100);
    scene.add(point);

    return scene;
};

Eto.prototype.createSky = function() {
    var geometry = new THREE.SphereGeometry(this.config.sky_size, 8, 8);
    var material = new THREE.MeshBasicMaterial({color: this.config.sky_color});
    material.side = THREE.DoubleSide;
    var sky = new THREE.Mesh(geometry, material);
    sky.name = "skysphere";

    return sky;
};

Eto.prototype.generateField = function(map) {
    var field = new Entity(this.master);
    var geometry = new THREE.PlaneGeometry(170, 170, 3, 3);
    var material = new THREE.MeshBasicMaterial({color: 0x113377, side: THREE.DoubleSided});
    field.graphics = new THREE.Mesh(geometry, material);
    field.graphics.rotateX(-Math.PI/2);
    field.graphics.translateY(-1);

    return field;
};

Eto.prototype.createField = function(map) {
    var field = new Entity(this.master);
    game.log("Loading map: ", map);
    field.setAvatar(map);
    field.loadData();
    field.graphics.geometry.computeBoundingBox();

    return field;
};



Eto.prototype.createAudio = function() {
    return new Audio();
};

Eto.prototype.createMusic = function(map) {
    // TODO: Remove all songs in the list

    for(var song in map.music) {
        this.appendOptionToSelect("#soundtracks",
            map.music[song].src, map.music[song].title);
    }

    if(map.music.length > 0) {
        this.selectSong(map.music[0].src);
    }
};

Eto.prototype.selectSong = function(src) {
    var type = null;

    for(var index in this.config.music_types) {
        suffix = this.config.music_types[index].suffix;
        if(src.indexOf(suffix, src.length - suffix.length) !== -1) {
            type = this.config.music_types[index].type;
            break;
        }
    }
    if(!type) {
        this.error("Unrecognized media type: ", src);
        return;
    }

    $("#musicplayer").src(src);
    $("#musicplayer").type(type);
};



Eto.prototype.createRenderer = function() {
    var renderer = new THREE.WebGLRenderer(this.config.renderer_params);
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
    this.gameLoop();
};

Eto.prototype.stop = function() {
    this.isRunning = false;
    this.isPaused = true;
    this.clock.stop();
};

Eto.prototype.togglePause = function() {
// TODO: This likely really fracks up the animation delta calculation
// TODO: This resets frameTime
    if(!this.isPaused) {
        this.isPaused = true;
        this.clock.stop();
    }
    else {
        this.isPaused = false;
        this.clock.start();
    }
};

Eto.prototype.gameLoop = function() {
    requestAnimationFrame(this.gameLoop.bind(this));

    if(this.resetRequested) {
        this.resetRequested = false;
        this.reset();
    }

    if(!this.isRunning) {
        return;
    }

    this.update();

    this.renderer.render(this.scene, this.camera);
};

Eto.prototype.updateFps = function(fps) {
    this.frameCounter++;
    this.averageFps += (fps - this.averageFps) / this.frameCounter;
    if(this.frameCounter == 240) {
        this.showFps(fps);
        this.frameCounter = 0;
        this.averageFps = 0;
    }
};

Eto.prototype.update = function() {
    var delta = this.clock.getDelta();

    if(this.isPaused) {
        return;
    }

    this.updateFps(1/delta);

    // TODO: Limit updates to 10-20/s or somesuch -> better fps?
    this.startUpdate(delta);

    this.updateInput(delta);
    this.updateAnimation(delta);
    this.updatePhysics(delta);
    this.updateCamera(delta);
};

Eto.prototype.startUpdate = function(delta) {
    this.frameTime += delta;

    var i = this.players.length;
    while(i-- > 0) {
        var player = this.players[i];
        player.startUpdate(delta);
        if(!player.ai.alive) {
            this.playerDied(i);
        }
    } 

    i = this.projectiles.length;
    while(i-- > 0) {
        var projectile = this.projectiles[i];
        projectile.startUpdate(delta);

        if(!projectile.ai.alive) {
            this.projectileDied(i, delta);
        }
    }

    i = this.explosions.length;
    while(i-- > 0) {
        var explosion = this.explosions[i];
        explosion.startUpdate(delta);

        if(!explosion.ai.alive) {
            this.explosionDied(i, delta);
        }
    }
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

    for(i = 0; i < this.projectiles.length; ++i) {
        this.projectiles[i].updateAnimation(delta, this.field);
    }

    for(i = 0; i < this.explosions.length; ++i) {
        this.explosions[i].updateAnimation(delta, this.field);
    }
    THREE.AnimationHandler.update(delta);
};

Eto.prototype.updatePhysics = function(delta) {
    for(var i = 0; i < this.players.length; ++i) {
        this.players[i].updatePhysics(delta, this.field);
    }

    for(i = 0; i < this.projectiles.length; ++i) {
        this.projectiles[i].updatePhysics(delta, this.field);
    }
};

Eto.prototype.moveCamera = function(deltax, deltay) {
    // TODO: this.camera.look_at.x += deltax;
    // TODO: this.camera.look_at.z += deltax;

    this.camera.position.x -= deltax;
    this.camera.position.x -= deltay;
    this.camera.position.z -= deltay;
    this.camera.position.z += deltax;
};

Eto.prototype.zoomCamera = function(delta) {
    if(delta < 0) {
        delta = -1;
    }
    else if(delta > 0) {
        delta = 1;
    }
    else {
        delta = 0; // NaN
    }
    
    var speed = game.config.camera_zoom_speed;
    this.camera.fov = this.clamp(this.camera.fov + speed * delta,
        game.config.camera_min_fov, game.config.camera_max_fov);
};

Eto.prototype.clamp = function(value, start, end) {
    return Math.max(start, Math.min(end, value));
};

Eto.prototype.updateCamera = function(delta) {
    // TODO: Smooth movement using e.g. SLERP
/*    Entity.vector.set(0, 0, 0);
    for(var index in this.players) {
        Entity.vector
    }
    Entity.vector.divideScalar(this.players.length);
// Zoom camera to contain all objects
//    this.camera.lookAt(cameraTarget);
*/

    this.camera.updateProjectionMatrix();
};

Eto.prototype.loadMaps = function(list) {
    for(var index in list) {
        var name = list[index].name;
        this.maps[name] = list[index];
        this.appendOptionToSelect("#maps", index, name);
    }
};

Eto.prototype.loadCharacters = function(list) {
    for(var index in list) {
        var name = list[index].name;
        this.characters[name] = list[index];

        this.appendOptionToSelect("#p0chars", name, name);
        this.appendOptionToSelect("#p1chars", name, name);
    }
};

Eto.prototype.loadItems = function(items) {
    for(var item in items) {
        this.items[item] = items[item];
        this.items[item].name = item;
    }
};


Eto.prototype.loadEntities = function(list) {
    var counter = list.slice(0);

    var successfun = function(data) {
        game.loadMaps(data.maps);

        game.loadCharacters(data.characters);

        game.loadItems(data.items);
    };

    var completefun = function() {
        if(counter.length === 0) {
            game.entitiesLoaded();
        }
    };


    ResourceManager.loadEntities(counter, successfun, completefun);
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

Eto.prototype.randomizeMap = function() {
    var keys = Object.keys(this.maps);
    var index = Math.floor(this.random() * keys.length);
// TODO: FIXME: BUG:    return this.maps[keys[index]];
    return this.maps[keys[1]];
};

Eto.prototype.randomizeCharacter = function(index) {
    var name = this.getSuggestedPlayerCharacter(index);
    var character = this.characters[name];

    if(typeof character === "undefined" || character === null) {
        game.log("Unknown character '" + name + "', randomizing");
        var keys = Object.keys(this.characters);
        var charindex = Math.floor(Math.random() * keys.length);
        character = this.characters[keys[charindex]];
    }

    return character;
};

Eto.prototype.randomizePosition = function(player) {
    game.log("Randomized position. TODO: Use actual random field position!");
    player.graphics.position.set(0, 40, 0);
};


Eto.prototype.incarnatePlayer = function(player, index) {
    player.setAvatar(this.randomizeCharacter(index));
    player.setPlayer(this.config.players[index]);
    player.avatar.name = "player";
    player.loadData(true);

    this.loadPlayerItems(player);

    this.randomizePosition(player);
};

Eto.prototype.createPlayer = function(index) {
    var playerdata = this.config.players[index];
    playerdata.index = index;
    playerdata.kills = 0;
    playerdata.deaths = 0;

    var player = new Entity(this.master);

    return player;
};

Eto.prototype.playerDied = function(index) {
    this.recordPlayerDeath(index);
    this.incarnatePlayer(this.players[index], index);
};

Eto.prototype.recordPlayerHealth = function(index, health, maxhealth) {
    var playerdata = game.config.players[index];

    var fieldnumber = index;
    var field = $("#score").find("#player" + fieldnumber).find("#health");
    var healthdisplay = health * 100 / maxhealth;
    healthdisplay = this.clamp(healthdisplay, 0, 100);
    field.val(healthdisplay)
};

Eto.prototype.recordPlayerKill = function(index) {
    var playerdata = game.config.players[index];
    game.log("Player " + playerdata.name + " kills again!"); 
    playerdata.kills++;

    var fieldnumber = index;
    var field = $("#score").find("#player" + fieldnumber).find("#kills");
    field.text(playerdata.kills)
};

Eto.prototype.recordPlayerDeath = function(index) {
    var playerdata = game.config.players[index];
    game.log("Player " + playerdata.name + "'s death does not go unnoticed!"); 
    playerdata.deaths++;

    var fieldnumber = index;
    var field = $("#score").find("#player" + fieldnumber).find("#deaths");
    field.text(playerdata.deaths)
};

Eto.prototype.loadPlayerItems = function(player) {
    // Remove children.
    for(var i = 0; i < player.graphics.children.length; ++i) {
        player.graphics.remove(player.graphics.children[i]);
    }
    player.items = [];

    for(i = 0; i < player.avatar.items.length; ++i) {
        var item = new Entity(player);
        item.setAvatar(player.avatar.items[i]);
        item.setItem(this.items[item.avatar.name]);

        item.loadData();
        player.items.push(item);
    }
};


Eto.prototype.createProjectile = function(item, delta) {
    var projectile = new Entity(this.master);
    projectile.setAvatar(item.item.projectile);
    projectile.setProjectile(item.item.projectile);

    projectile.loadData();
    projectile.fireProjectileFrom(item, delta);

    game.log("Item:", item, " creates projectile:", projectile);
    this.projectiles.push(projectile);
};

Eto.prototype.projectileDied = function(index, delta) {
    game.log("Projectile " + index + " died!");

    var projectile = this.projectiles[index];

    projectile.explodeProjectile(delta);

    this.projectiles.splice(index, 1);
};

Eto.prototype.explosionDied = function(index, delta) {
    game.log("Explosion " + index + " died!");

    var explosion = this.explosions[index];

    explosion.killExplosion();

    this.explosions.splice(index, 1);
};

Eto.prototype.createExplosion = function(center, owner, item) {
    var explosion = new Entity(this.master);
    explosion.setExplosion(center, owner, item);
    this.explosions.push(explosion);
};

/* Utility functions */

Eto.prototype.random = function() {
    return Math.random();
};

Eto.prototype.log = ETO_CONFIG_DEFAULT.DEBUG ?
    window.console.log.bind(window.console) : function() {};

Eto.prototype.error = function(message) {
    game.log(message);
    game.log("*** Stack trace: ", (new Error()).stack);

    if(this.config.DEBUG) {
        alert(message);
    }
};

Eto.prototype.assert = function(test, message) {
    if(!test) {
        this.error(message);
    }
};


/* Game progress */

Eto.prototype.requestReset = function() {
    game.log("Reset requested!");
    this.resetRequested = true;
};

Eto.prototype.reset = function() {
    game.log("Resetting game! TODO: actually reset!");
    this.players[0].alive = false;
    this.players[1].alive = false;
    // TODO: Call these!
    //this.clearField();
    //this.createGame();
};

Eto.prototype.clearField = function() {
// remove projectiles, players from scene
    this.players = [];
    this.projectiles = [];
};

Eto.prototype.createGame = function() {
    this.field = this.createField(this.randomizeMap());

    for(var i = 0; i < this.config.playercount; ++i) {
        var player = this.createPlayer(i);
        this.players.push(player);
        this.incarnatePlayer(player, i);
    }

    this.start();
};

Eto.prototype.entitiesLoaded = function() {
    this.clearField();

    this.createGame();
};


/* Gui options */


Eto.prototype.getSuggestedPlayerCharacter = function(index) {
    return $("#p" + index + "chars").val();
};

Eto.prototype.appendOptionToSelect = function(selector, val, title) {
    $(selector).append($("<option />").
        val(val).html(title));
};


Eto.prototype.setPlayerStrength = function(event) {
    var playerindex = event.data;
    var strvalue = $(this).val();
    game.log("TODO: set player ", playerindex, " hp+pwr to reflect value ",
        strvalue);
};


Eto.prototype.showFps = function(fps) {
    $("#fpscounter").text(fps.toFixed(2));
};

Eto.prototype.toggleMenu = function() {
    $("#settings").toggleClass("hidden");

    this.togglePause();
};

Eto.prototype.setAudio3D = function(event) {
    this.audio.setAudio3D(event.target.val());
};

Eto.prototype.setAudioVolume = function(event) {
    this.audio.setVolume(event.target.val() / this.config.max_volume);
};

Eto.prototype.setGui = function() {
    // Input events

    $(document).on("keydown", Input.keyDown);
    $(document).on("keyup", Input.keyUp);

    $(document).on("wheel", Input.mouseWheel);
    $(document).on("mousedown", Input.mouseDown);
    $(document).on("mouseup", Input.mouseUp);

    // Game controls events

    // TODO: FIXME: Never called
    $("#p1strength").on("change", this.setPlayerStrength.bind(this), 0);
    // TODO: FIXME: Not a function
    $("#p2strength").on("change", this.setPlayerStrength.bind(this), 1);

    $("#reset").on("click", this.requestReset.bind(this));

    // Audio controls events

    $("#mastergain").on("change", this.setAudioVolume.bind(this), false);
    $("#audio3d").on("change", this.setAudio3D.bind(this), false);

    if(this.config.play_music) {
        $("#soundtracks").on("change", function(event) {
            game.selectSong($("#soundtracks").val());
        });

        this.createMusic(field);
    }

    // Network controls events

    $("#disconnect").on("click",
        function() {
            game.audio.playSound(bello);
            game.log("DISCO!");
        }
    );
};

Eto.prototype.initGame = function() {
    game.log("config", this.config);
    this.loadEntities(this.config.entities);
};


var bello = null;
Eto.prototype.init = function() {
    this.renderer = this.createRenderer();
    var container = document.getElementById("container");
    container.appendChild(this.renderer.domElement);


    this.connections = this.createConnections();

    this.audio = this.createAudio();

    bello = ResourceManager.loadSound("recycle.wav", this.audio);

    this.camera = this.createCamera();
    this.scene = this.createScene();

    // Container events
    $(window).on("resize", this.onWindowResize.bind(this));

    this.setGui();

    this.initGame();
};

var game = new Eto();
ResourceManager.loadConfiguration(game);
