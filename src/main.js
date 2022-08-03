import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let camera, controls, scene, renderer;

let hoveredObject = null;

// to choose an object, hold Ctrl and click on an object
let chosenObject = null;
let ctrlIsPressed = false;

// always track the current coordinates of the mouse
let cursor_x = -1;
let cursor_y = -1;

init();
animate();

function init() {
  // scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  scene.fog = new THREE.FogExp2(0xcccccc, 0.001);

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(400, 200, 0);

  // camera controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 50;
  controls.maxDistance = 250;
  controls.maxPolarAngle = Math.PI / 2;

  // grid
  const gridSize = 300;
  const gridNDivisions = gridSize / 10; // so a unit in the grid is of length 10
  const gridHelper = new THREE.GridHelper(gridSize, gridNDivisions);
  gridHelper.name = "GridHelper";
  scene.add(gridHelper);

  // plane
  const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00, // yellow
    side: THREE.FrontSide,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.name = "Plane";
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1; // slightly under grid, so no visual bugs occur on the grid lines
  scene.add(plane);

  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x002288);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  render();
}

function render() {
  renderer.render(scene, camera);
}

function meshCreator(objectGeometry, size = 10) {
  let geometry;
  const color = 0xffffff;
  const flatShading = true;
  let material = new THREE.MeshPhongMaterial({
    color,
    flatShading,
  });
  switch (objectGeometry) {
    case "cube":
      geometry = new THREE.BoxGeometry(10, size, 10);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(size / 2, 32, 32);
      break;
    case "pyramid":
      geometry = new THREE.CylinderGeometry(0, 10 / Math.sqrt(2), size, 4, 1);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(5, 5, size, 64);
    default:
      break;
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 5;
  mesh.position.y = size / 2;
  mesh.position.z = 5;
  mesh.userData = { edges: "edges1", hoverable: true };
  return mesh;
}

function addObjectToScene() {
  const objectGeometry = document.getElementById(
    "select-geometric-object"
  ).value;
  const objectHeight = document.getElementById("size-geometric-object").value;
  console.log(objectHeight);
  scene.add(meshCreator(objectGeometry, Number(objectHeight)));
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.body.addEventListener("mousemove", (e) => {
  cursor_x = e.pageX;
  cursor_y = e.pageY;
  mouse.x = (cursor_x / window.innerWidth) * 2 - 1;
  mouse.y = -(cursor_y / window.innerHeight) * 2 + 1;

  // cast a ray through the frustum
  raycaster.setFromCamera(mouse, camera);

  // get the list of objects the ray intersected
  const intersects = raycaster.intersectObject(scene, true);

  if (hoveredObject) {
    // if prior selection exists, set color of prior to status quo beforehand
    // hoveredObject.material.color.set(0xffffff)
    hoveredObject.material.color.set(
      chosenObject && hoveredObject.uuid === chosenObject.uuid
        ? 0x000000
        : 0xffffff
    );
  }
  if (intersects.length > 0 && intersects[0].object.userData.hoverable) {
    // if now some object is hovered, set chosenObject to newly hovered object
    hoveredObject = intersects[0].object;
    hoveredObject.material.color.set(0x808080);
  } else {
    // if now no object is hovered
    hoveredObject = null;
  }
});

document.body.addEventListener("mousedown", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // cast a ray through the frustum
  raycaster.setFromCamera(mouse, camera);

  if (ctrlIsPressed) {
    if (chosenObject) chosenObject.material.color.set(0xffffff);
    if (hoveredObject !== null) {
      chosenObject = hoveredObject;
      chosenObject.material.color.set(0x000000);
      console.log("Chosen", chosenObject.uuid);
    } else {
      chosenObject = null;
    }
  }
});

document.body.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "Control":
      // release Ctrl
      ctrlIsPressed = false;
  }
});

document.body.addEventListener("keydown", (e) => {
  if (e.key === "Control") {
    ctrlIsPressed = true;
  }
  if (chosenObject) {
    switch (e.key) {
      case "r":
      case "R":
        chosenObject.rotation.y += Math.PI / 4;
        render();
        break;
      case "Delete":
        chosenObject.geometry.dispose();
        chosenObject.material.dispose();
        scene.remove(chosenObject);
        chosenObject = null;
        render();
        break;
      case "m":
      case "M":
        mouse.x = (cursor_x / window.innerWidth) * 2 - 1;
        mouse.y = -(cursor_y / window.innerHeight) * 2 + 1;

        // cast a ray through the frustum
        raycaster.setFromCamera(mouse, camera);

        // get the list of objects the ray intersected
        const intersects = raycaster.intersectObject(scene, true);
        const intersectsNames = intersects.map((e) => e.object.name);
        if (
          intersectsNames.includes("GridHelper") ||
          intersectsNames.includes("Plane")
        ) {
          const posX = intersects[0].point.x;
          const posZ = intersects[0].point.z;
          const newPosX =
            posX < 0
              ? Math.ceil(posX / 10) * 10 - 5
              : Math.floor(posX / 10) * 10 + 5;
          const newPosZ =
            (posZ < 0 ? Math.floor(posZ / 10) : Math.floor(posZ / 10)) * 10 + 5;
          chosenObject.position.x = newPosX;
          chosenObject.position.z = newPosZ;
        }
        break;
      default:
        break;
    }
    if (e.key === "r" || e.key === "R") {
    }
  }
});

document.getElementById("button-geometric-object").onclick = function () {
  addObjectToScene();
};
