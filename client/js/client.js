// Author: jawcraig (jawcraig@gmail.com)

var CONFIG_DEFAULT = {
    configuration_file = "config.json",
    baseurl: "",
    camera_fov = 90,
    camera_near = 1,
    camera_far = 1000,
    sky_size = 500,
    sky_color = 0x101030,
};

var CONFIG = CONFIG_DEFAULT;

var camera;
var scene;
var renderer;
var running = false;

function assert(condition, message) {
    if(!condition) {
        $.error(message);
    }
}

function loadConfiguration() {
    $.ajax({
            dataType: "json",
            url: CONFIG.configuration_file,
            success: function(data) {
                for(var setting in data) {
                    CONFIG[setting] = data[setting];
                }
            },
            error: function(hr, status, error) {
                alert("Error while loading configuration: " + status + " - " + error);
            },
            complete: function() {
                init();
            }
    });
}

function init() {
    var container = document.getElementById("container");

    camera = createCamera();
    scene = createScene();
    renderer = createRenderer();

    container.appendChild(renderer.domElement);

    $(container).on("mouseclick", onMouseClick, false);
    $("#controls").find("#disconnect").on("click", function() { alert("DISCO!"); });

    window.addEventListener("resize", onWindowResize, false);

    start();
}

function createCamera() {}
    return new THREE.PerspectiveCamera(CONFIG.camera_fov,
        window.innerWidth / window.innerHeight,
        CONFIG.camera_near, CONFIG.camera_far);
}

function createScene() {
    var scene = new THREE.Scene();

    var skycube = createSkyCube();
    scene.add(skycube);

    return scene;
}

function createSkyCube() {
    var geometry = THREE.BoxGeometry(CONFIG.sky_size, CONFIG.sky_size,
        CONFIG.sky_size, 8, 8, 8);
    var material = new THREE.MeshBasicMaterial({color: CONFIG.sky_color, side: THREE.BackSide});

    return new THREE.Mesh(geometry, material);
}

function createRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    return renderer;
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
    alert("CLICK!");
}


function start() {
    running = true;
    animate();
}

function stop() {
    running = false;
}

function animate() {
    if(!running) {
        return;
    }

    requestAnimationFrame(animate);

    update();

    renderer.render(scene, camera);
}

function update() {
    //    camera.lookAt(cameraTarget);
}

loadConfiguration();
