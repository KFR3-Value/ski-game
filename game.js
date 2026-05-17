// Game Variables
let scene, camera, renderer, clock, dirLight;
let skier;
let trackMat;
let trackLength = 2000;
let finishLineZ = -700;
let cameraTarget = new THREE.Vector3();
let introTimer = 0;
let skierMatJacket, skierMatPants, skierMatHelmet, skierMatSkis, skierMatRightSleeve;
let startBar;
let stopwatchCtx, stopwatchTexture; // For the digital Stoppuhr

function pseudoRandom(seed) {
    let x = Math.sin(seed * 9999.9999) * 10000;
    return x - Math.floor(x);
}

function generateFenceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; 
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Black background = fully transparent in alphaMap
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, 128, 128);
    
    // White lines = opaque net
    ctx.strokeStyle = '#ffffff'; 
    ctx.lineWidth = 6;
    
    // Borders
    ctx.strokeRect(0, 0, 128, 128);
    // Diagonal net pattern
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(128,128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128,0); ctx.lineTo(0,128); ctx.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1000, 30); // Stretch across the huge fence
    return texture;
}

function generateSnowBumpMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const imgData = ctx.createImageData(512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        // High frequency white noise to simulate microscopic snow crystals
        const noise = Math.random() * 255;
        data[i] = noise;     // R
        data[i+1] = noise;   // G
        data[i+2] = noise;   // B
        data[i+3] = 255;     // Alpha
    }
    ctx.putImageData(imgData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // High repeat count so the noise becomes microscopic grains on the huge track
    texture.repeat.set(100, 1000); 
    return texture;
}

function createDriverPhotoTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // 1. Sleek gradient background (futuristic dark tech vibe)
    const grad = ctx.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, '#111622');
    grad.addColorStop(1, '#070a0f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 320);

    // 2. High-tech glowing neon-cyan inner border
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 314);
    
    // Outer subtle white bezel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 240, 304);

    // 3. Grid lines overlay (high-tech cockpit aesthetic)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 20; y < 320; y += 20) {
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(246, y);
        ctx.stroke();
    }
    for (let x = 20; x < 256; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 10);
        ctx.lineTo(x, 310);
        ctx.stroke();
    }

    // 4. Stylized athlete profile silhouette (helmet, goggles, shoulders)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    
    // Shoulders
    ctx.beginPath();
    ctx.moveTo(40, 250);
    ctx.quadraticCurveTo(128, 195, 216, 250);
    ctx.lineTo(230, 320);
    ctx.lineTo(26, 320);
    ctx.closePath();
    ctx.fill();

    // Helmet (circle)
    ctx.beginPath();
    ctx.arc(128, 130, 48, 0, Math.PI * 2);
    ctx.fill();

    // Goggles (cyan glowing visual elements)
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.ellipse(128, 125, 32, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Goggle strap detail
    ctx.fillStyle = '#070a0f';
    ctx.fillRect(80, 122, 10, 6);
    ctx.fillRect(166, 122, 10, 6);

    // 5. Tech text at the bottom
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("ATHLETE PROFILE", 128, 276);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText("RESERVED SPACE", 128, 294);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

function getTerrainHeight(x, z) {
    let noise = Math.sin(x * 0.05) * Math.cos(z * 0.02) * 2.0;
    noise += Math.sin(x * 0.2 + z * 0.1) * 0.5;
    
    let startHill = 0;
    let flatten = 1;
    if (z > -20) {
        let t = (z - (-20)) / 30; // 0 at z=-20, 1 at z=10
        if (t > 1) t = 1;
        let ease = t * t * (3 - 2 * t);
        startHill = ease * 10; // Top of snow hill is exactly 10
        
        // Flatten the noise at the very top so the start platform is perfectly flat
        if (t > 0.8) {
            flatten = 1 - ((t - 0.8) / 0.2); 
        }
    }
    
    // The massive aggressive mountain gradient (20% steepness)
    let mainSlope = 0;
    if (z < 10) {
        mainSlope = (z - 10) * 0.2; // Drops exactly 400 meters over the 2km track
    }
    
    // Make edges rise like a halfpipe
    const edgeFactor = Math.pow(Math.abs(x) / 100, 2) * 10;
    return (noise * flatten) + startHill + mainSlope + edgeFactor;
}

function getSkierHeight(x, z) {
    // Start house wooden floor logic
    if (Math.abs(x) < 6 && z >= 12 && z <= 24) {
        return 10; 
    }
    return getTerrainHeight(x, z);
}

// Game State
let gameState = 'landing'; // landing, intro, playing, finished, failed
let timeElapsed = 0;
let speed = 0;
let lateralSpeed = 0;

// Gates Data
let gates = [];

// Inputs
let input = { left: false, right: false };

// UI Elements
const speedEl = document.getElementById('speed-value');
const timerEl = document.getElementById('timer-value');
const screenEl = document.getElementById('message-screen');
const mainMsgEl = document.getElementById('main-message');
const subMsgEl = document.getElementById('sub-message');

// Landing Page Logic
function initLandingPage() {
    const targetDate = new Date('2026-07-30T00:00:00').getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            document.getElementById('cd-days').innerText = '00';
            document.getElementById('cd-hours').innerText = '00';
            document.getElementById('cd-minutes').innerText = '00';
            document.getElementById('cd-seconds').innerText = '00';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('cd-days').innerText = String(days).padStart(2, '0');
        document.getElementById('cd-hours').innerText = String(hours).padStart(2, '0');
        document.getElementById('cd-minutes').innerText = String(minutes).padStart(2, '0');
        document.getElementById('cd-seconds').innerText = String(seconds).padStart(2, '0');
    }

    // Initial call and set interval
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);

    // Trigger Button
    document.getElementById('secret-trigger').addEventListener('click', () => {
        clearInterval(countdownInterval);

        const loaderScreen = document.getElementById('video-loader-screen');
        const video = document.getElementById('loader-video');
        const skipBtn = document.getElementById('skip-video-btn');
        const progressBar = document.getElementById('video-loading-progress');

        // Show video loading screen
        loaderScreen.classList.add('active');
        loaderScreen.style.display = 'flex';

        // Autoplay the video
        video.currentTime = 0;
        video.play().catch(err => {
            console.warn("Autoplay was blocked or failed, skipping video loading screen.", err);
            finishVideoAndStartGame();
        });

        let isTransitioned = false;

        function finishVideoAndStartGame() {
            if (isTransitioned) return;
            isTransitioned = true;

            // Remove event listeners
            video.removeEventListener('ended', finishVideoAndStartGame);
            video.removeEventListener('timeupdate', updateProgressBar);
            video.removeEventListener('error', finishVideoAndStartGame);
            skipBtn.removeEventListener('click', finishVideoAndStartGame);

            // Clean up/pause video
            video.pause();

            // Smooth fade out
            loaderScreen.classList.remove('active');
            
            // Wait for fade transition, then switch to game
            setTimeout(() => {
                loaderScreen.style.display = 'none';
                // Release video resource to save memory during intensive 3D game
                try {
                    video.src = '';
                    video.load();
                } catch(e) {}

                // Hide landing page
                document.getElementById('landing-page').style.display = 'none';

                // Show game wrapper
                document.getElementById('game-wrapper').style.display = 'block';

                // Initialize 3D game
                init();

                // Activate service room and transition state
                document.getElementById('service-room').classList.add('active');
                gameState = 'menu';
            }, 800); // matches CSS transition duration
        }

        function updateProgressBar() {
            if (video.duration) {
                const percent = (video.currentTime / video.duration) * 100;
                progressBar.style.width = percent + '%';
            }
        }

        // Attach event listeners for ending/skipping video
        video.addEventListener('ended', finishVideoAndStartGame);
        video.addEventListener('timeupdate', updateProgressBar);
        video.addEventListener('error', finishVideoAndStartGame); // Skip if video fails to play/load
        skipBtn.addEventListener('click', finishVideoAndStartGame);
    });
}

function init() {
    scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x8faec4); // Darker, colder blue fallback
    scene.background = skyColor;
    // Fog completely disabled
    scene.fog = null;



    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Crisp rendering
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    // Photorealism: Filmic Tone Mapping and Color Space
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85; // Lower exposure to fix the washout
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Photorealism: Load the HDRI properly using PMREMGenerator for Three.js r128
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const textureLoader = new THREE.TextureLoader();

    // Load the panoramic background image (must be power-of-two dimensions for r128)
    textureLoader.load('background_fixed.jpg', function(texture) {
        console.log('Background loaded!', texture.image.width, 'x', texture.image.height);
        
        texture.encoding = THREE.sRGBEncoding;

        // 1. Create a CRISP CubeMap specifically for the visual background
        // We use the image height to determine the resolution of the cubemap faces
        const renderTarget = new THREE.WebGLCubeRenderTarget(texture.image.height);
        renderTarget.fromEquirectangularTexture(renderer, texture);
        scene.background = renderTarget.texture;
        
        // 2. Process the flat texture into a blurry PMREM map for lighting/reflections ONLY
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        
        // Clean up memory
        texture.dispose();
        pmremGenerator.dispose();
        
    }, undefined, function(err) {
        console.error("Failed to load background image.", err);
    });

    document.getElementById('game-container').appendChild(renderer.domElement);
    
    clock = new THREE.Clock();

    // Lighting (Photorealistic setup)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x446688, 0.4); // Cooler ambient shadows
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfff5e6, 2.5); // Stronger sun
    dirLight.position.set(-50, 150, -50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024; // Lower res but tighter frustum for crispness/FPS
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 400; // Tighter bounds
    const shadowSize = 40; // Extremely tight shadow box perfectly centered on player
    dirLight.shadow.camera.left = -shadowSize;
    dirLight.shadow.camera.right = shadowSize;
    dirLight.shadow.camera.top = shadowSize;
    dirLight.shadow.camera.bottom = -shadowSize;
    // Tweak bias for tight frustum
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    createEnvironment();
    createStartHouse();
    createSkier();
    createSnowSpraySystem(); // Initialize the dynamic snow spray particle pool
    createGates();
    createFinishLine();
    setupControls();
    window.selectSki('powder');

    // Start in menu state before intro
    gameState = 'menu';
    
    // Hide the starting gate bar so it doesn't block the driver customization
    if (startBar) {
        startBar.visible = false;
    }
    
    // Position camera dynamically in front of the skier (downhill, looking uphill) to see the front customization
    camera.position.set(-1.8, 11.2, 7.5);
    cameraTarget.set(0, 11.2, 12);
    camera.lookAt(cameraTarget);

    animate();
}

function createEnvironment() {
    // 1. Photorealistic Snow Track (Procedural Terrain)
    const segmentsW = 50;
    const segmentsH = 400;
    const trackGeo = new THREE.PlaneGeometry(250, trackLength + 400, segmentsW, segmentsH);
    
    const pos = trackGeo.attributes.position;
    for(let i = 0; i < pos.count; i++) {
        let px = pos.getX(i);
        let py = pos.getY(i); 
        
        let worldX = px;
        let worldZ = -py - trackLength/2 + 50; 
        
        pos.setZ(i, getTerrainHeight(worldX, worldZ));
    }
    trackGeo.computeVertexNormals();

    const snowNoiseMap = generateSnowBumpMap();
    trackMat = new THREE.MeshPhysicalMaterial({ 
        color: 0xf4f9ff, // Pure bright white with an imperceptible cool tint
        roughness: 0.8, // Powdery snow is rough
        metalness: 0.1,
        roughnessMap: snowNoiseMap, // Dynamic sparkle!
        bumpMap: snowNoiseMap,
        bumpScale: 0.015, // Creates microscopic shadows in the snow grains
        clearcoat: 0.3, // Simulates icy crystals catching the sunlight
        clearcoatRoughness: 0.6,
        flatShading: false
    });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.z = -trackLength / 2 + 50;
    track.receiveShadow = true;
    scene.add(track);

    // 3. Side Fences (Red Nets) that naturally snake down the steep slope
    const fenceMat = new THREE.MeshStandardMaterial({ 
        color: 0xdd1111, 
        transparent: false, 
        alphaTest: 0.5,
        alphaMap: generateFenceTexture(),
        side: THREE.DoubleSide,
        roughness: 0.8
    });
    
    // Left Fence
    const fenceGeoL = new THREE.PlaneGeometry(trackLength, 10, 100, 1);
    const posL = fenceGeoL.attributes.position;
    for (let i = 0; i < posL.count; i++) {
        let localX = posL.getX(i);
        let localY = posL.getY(i);
        let worldZ = (-trackLength / 2 + 50) - localX;
        let worldX = -25;
        let terrainY = getTerrainHeight(worldX, worldZ);
        posL.setY(i, terrainY + localY + 5); // 5 is half-height
    }
    fenceGeoL.computeVertexNormals();
    
    const fenceL = new THREE.Mesh(fenceGeoL, fenceMat);
    fenceL.position.set(-25, 0, -trackLength / 2 + 50);
    fenceL.rotation.y = Math.PI / 2;
    fenceL.castShadow = true;
    fenceL.customDepthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        alphaMap: fenceMat.alphaMap,
        alphaTest: 0.5
    });
    scene.add(fenceL);

    // Right Fence
    const fenceGeoR = new THREE.PlaneGeometry(trackLength, 10, 100, 1);
    const posR = fenceGeoR.attributes.position;
    for (let i = 0; i < posR.count; i++) {
        let localX = posR.getX(i);
        let localY = posR.getY(i);
        let worldZ = (-trackLength / 2 + 50) + localX;
        let worldX = 25;
        let terrainY = getTerrainHeight(worldX, worldZ);
        posR.setY(i, terrainY + localY + 5); 
    }
    fenceGeoR.computeVertexNormals();

    const fenceR = new THREE.Mesh(fenceGeoR, fenceMat);
    fenceR.position.set(25, 0, -trackLength / 2 + 50);
    fenceR.rotation.y = -Math.PI / 2;
    fenceR.castShadow = true;
    fenceR.customDepthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        alphaMap: fenceMat.alphaMap,
        alphaTest: 0.5
    });
    scene.add(fenceR);

    // 4. Realistic Mountain Range (Deterministic & Rugged)
    const mountainGeo = new THREE.ConeGeometry(500, 800, 8, 4); 
    
    // Rough up the vertices so they look like real rocks, not perfect pyramids
    const mPos = mountainGeo.attributes.position;
    for(let i = 0; i < mPos.count; i++) {
        // Don't displace the bottom edge as much to avoid floating mountains
        if (mPos.getY(i) > -300) {
            mPos.setX(i, mPos.getX(i) + (pseudoRandom(i * 1.1) - 0.5) * 120);
            mPos.setZ(i, mPos.getZ(i) + (pseudoRandom(i * 1.2) - 0.5) * 120);
            mPos.setY(i, mPos.getY(i) + (pseudoRandom(i * 1.3) - 0.5) * 100);
        }
    }
    mountainGeo.computeVertexNormals();

    const mountainMat1 = new THREE.MeshStandardMaterial({ color: 0xeef5ff, roughness: 0.9, flatShading: true });
    const mountainMat2 = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9, flatShading: true });
    
    const countM = 80;
    const instancedMountains1 = new THREE.InstancedMesh(mountainGeo, mountainMat1, countM / 2);
    const instancedMountains2 = new THREE.InstancedMesh(mountainGeo, mountainMat2, countM / 2);
    instancedMountains1.castShadow = false; // Performance optimization
    instancedMountains1.receiveShadow = true;
    instancedMountains2.castShadow = false;
    instancedMountains2.receiveShadow = true;

    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < countM; i++) {
        let x = (pseudoRandom(i) - 0.5) * 6000;
        // Keep them far away from the track center to frame the background!
        if (x > -2000 && x < 0) x = -2000 - pseudoRandom(i + 100) * 1000;
        if (x < 2000 && x >= 0) x = 2000 + pseudoRandom(i + 200) * 1000;
        
        const z = -pseudoRandom(i + 300) * (trackLength + 2000) + 500;
        const terrainY = getTerrainHeight(x, z);
        
        dummy.scale.set(1 + pseudoRandom(i + 400), 0.5 + pseudoRandom(i + 500), 1 + pseudoRandom(i + 600));
        dummy.position.set(x, terrainY + 300 * dummy.scale.y, z);
        dummy.rotation.y = pseudoRandom(i + 700) * Math.PI;
        dummy.updateMatrix();
        
        if (i % 2 === 0) {
            instancedMountains1.setMatrixAt(Math.floor(i / 2), dummy.matrix);
        } else {
            instancedMountains2.setMatrixAt(Math.floor(i / 2), dummy.matrix);
        }
    }
    
    instancedMountains1.instanceMatrix.needsUpdate = true;
    instancedMountains2.instanceMatrix.needsUpdate = true;
    
    scene.add(instancedMountains1);
    scene.add(instancedMountains2);

    // 5. Instanced Pine Trees
    const treeGeo = new THREE.ConeGeometry(8, 30, 5);
    treeGeo.translate(0, 15, 0); // Origin to bottom
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x1f3d2b, roughness: 0.9, flatShading: true });
    const treeCount = 400;
    const treeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    treeInstanced.castShadow = false; // Don't cast to save FPS
    treeInstanced.receiveShadow = true;
    
    for (let i = 0; i < treeCount; i++) {
        // Place along the track outside fences
        let side = pseudoRandom(i) > 0.5 ? 1 : -1;
        let x = side * (40 + pseudoRandom(i+1) * 150);
        let z = 100 - pseudoRandom(i+2) * (trackLength + 400);
        
        dummy.position.set(x, getTerrainHeight(x, z), z);
        dummy.scale.setScalar(0.5 + pseudoRandom(i+3));
        dummy.rotation.y = pseudoRandom(i+4) * Math.PI;
        dummy.rotation.x = (pseudoRandom(i+5) - 0.5) * 0.2;
        dummy.rotation.z = (pseudoRandom(i+6) - 0.5) * 0.2;
        dummy.updateMatrix();
        treeInstanced.setMatrixAt(i, dummy.matrix);
    }
    
    treeInstanced.instanceMatrix.needsUpdate = true;
    
    scene.add(treeInstanced);
}

function createStartHouse() {
    const houseGroup = new THREE.Group();
    
    // Materials
    const archMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.6 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const sunriseRed = new THREE.MeshStandardMaterial({ color: 0xff3322 });
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xddb892, roughness: 0.9 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });

    // 1. The Main White Arch Shape (Adelboden Style)
    // CCW definition: +X is Left (from downhill), -X is Right.
    // We want the slant on the Right (-X).
    const archShape = new THREE.Shape();
    archShape.moveTo(9, 0);       // Bottom-Left
    archShape.lineTo(9, 11);      // Top-Left (flat)
    archShape.lineTo(-13, 14);    // Top-Right (slanted right and up)
    archShape.lineTo(-10, 0);     // Bottom-Right
    archShape.lineTo(9, 0);       // Close
    
    // The Hole (Skier passes through)
    const hole = new THREE.Path();
    hole.moveTo(3, 0);
    hole.lineTo(3, 8.5);
    hole.lineTo(-3, 8.5);
    hole.lineTo(-3, 0);
    hole.lineTo(3, 0);
    archShape.holes.push(hole);

    const extrudeSettings = { depth: 1, bevelEnabled: false };
    const archGeo = new THREE.ExtrudeGeometry(archShape, extrudeSettings);
    const archMesh = new THREE.Mesh(archGeo, archMat);
    // Base shape is at 10.6 facing downhill (-Z). Extrudes to 11.6 (uphill).
    archMesh.position.set(0, 10, 10.6); 
    archMesh.castShadow = true;
    archMesh.receiveShadow = true;
    houseGroup.add(archMesh);

    // 2. The Red Background Frame
    // Extends past the right, top, and BACK to make the back entirely red
    const frameShape = new THREE.Shape();
    frameShape.moveTo(9, 0);
    frameShape.lineTo(9, 11.5);    // Border on top
    frameShape.lineTo(-13.5, 14.5); // Border on top and right
    frameShape.lineTo(-10.5, 0);   // Border on right
    frameShape.lineTo(9, 0);
    frameShape.holes.push(hole);

    const frameGeo = new THREE.ExtrudeGeometry(frameShape, extrudeSettings);
    const frameMesh = new THREE.Mesh(frameGeo, redMat);
    // Positioned at 11.6 (perfectly flush against the back of the white arch) to 12.6 (behind back)
    // This perfectly covers the back face of the white arch, making the back solid red without Z-fighting!
    frameMesh.position.set(0, 10, 11.6); 
    frameMesh.castShadow = true;
    houseGroup.add(frameMesh);

    // 3. Logos and Decals (Placed on the DOWNHILL front face at Z = 10.59)
    const decalZ = 10.59;

    // Right Side (-X is Right from downhill): Sunrise Logo Red Background Frame
    // Moved further right and up (-8.2, 19.2) to fit the new athlete profile beautifully
    const sunriseGeo = new THREE.BoxGeometry(4.5, 4.5, 0.1);
    const sunriseMesh = new THREE.Mesh(sunriseGeo, sunriseRed);
    sunriseMesh.position.set(-8.2, 19.2, decalZ); 
    houseGroup.add(sunriseMesh);

    // Right Side: Jägermeister Logo (Centered inside the red background frame)
    const logoLoader = new THREE.TextureLoader();
    const jaegerTex = logoLoader.load('jaegermeister.png');
    jaegerTex.encoding = THREE.sRGBEncoding;
    const jaegerMat = new THREE.MeshBasicMaterial({ map: jaegerTex, transparent: true });
    const jaegerGeo = new THREE.PlaneGeometry(4.5, 4);
    const jaegerMesh = new THREE.Mesh(jaegerGeo, jaegerMat);
    // Centered on the repositioned red frame
    jaegerMesh.position.set(-8.2, 19.2, decalZ - 0.06);
    jaegerMesh.rotation.y = Math.PI; // Face downhill
    houseGroup.add(jaegerMesh);

    // Right Side: Mock Driver Picture (Reserved vertical space)
    const driverTex = createDriverPhotoTexture();
    const driverMat = new THREE.MeshBasicMaterial({ map: driverTex });
    const driverGeo = new THREE.PlaneGeometry(3.5, 4.375); // 4:5 Aspect Ratio
    const driverMesh = new THREE.Mesh(driverGeo, driverMat);
    // Placed lower and closer to the arch (-4.8, 14.2) for perfect visual weight balance
    driverMesh.position.set(-4.8, 14.2, decalZ);
    driverMesh.rotation.y = Math.PI; // Face downhill
    houseGroup.add(driverMesh);

    // Left Side: Belvedere Logo
    const belvedereTex = logoLoader.load('belvedere.png');
    belvedereTex.encoding = THREE.sRGBEncoding;
    const belvedereMat = new THREE.MeshBasicMaterial({ map: belvedereTex, transparent: true });
    const belvedereGeo = new THREE.PlaneGeometry(4.5, 4);
    const belvedereMesh = new THREE.Mesh(belvedereGeo, belvedereMat);
    belvedereMesh.position.set(5.5, 17.5, decalZ);
    belvedereMesh.rotation.y = Math.PI; // Face downhill
    houseGroup.add(belvedereMesh);

    // Digital Stoppuhr (Stopwatch) on the Front Face
    const stopwatchCanvas = document.createElement('canvas');
    stopwatchCanvas.width = 256;
    stopwatchCanvas.height = 64;
    stopwatchCtx = stopwatchCanvas.getContext('2d');
    
    stopwatchCtx.fillStyle = '#000000';
    stopwatchCtx.fillRect(0, 0, 256, 64);
    stopwatchCtx.fillStyle = '#ff1111'; // Neon red text
    stopwatchCtx.font = 'bold 40px Courier New';
    stopwatchCtx.textAlign = 'center';
    stopwatchCtx.textBaseline = 'middle';
    stopwatchCtx.fillText("00:00.00", 128, 32);

    stopwatchTexture = new THREE.CanvasTexture(stopwatchCanvas);
    stopwatchTexture.encoding = THREE.sRGBEncoding;

    const timerMat = new THREE.MeshBasicMaterial({ map: stopwatchTexture });
    const timerGeo = new THREE.PlaneGeometry(4.5, 1.2);
    const timerMesh = new THREE.Mesh(timerGeo, timerMat);
    timerMesh.rotation.y = Math.PI; // Face downhill so text is not backwards
    timerMesh.position.set(0, 19.5, decalZ); // Centered directly above the hole
    houseGroup.add(timerMesh);

    // 4. Gray Scaffolding Truss on the left edge (+X)
    const trussGeo = new THREE.CylinderGeometry(0.2, 0.2, 11, 8);
    const truss1 = new THREE.Mesh(trussGeo, trussMat);
    truss1.position.set(9.5, 15.5, 10.6);
    const truss2 = new THREE.Mesh(trussGeo, trussMat);
    truss2.position.set(9.5, 15.5, 11.6);
    houseGroup.add(truss1, truss2);

    // 5. White House (The skier's actual starting hut in the back)
    const whiteWallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
    const darkRoofMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    
    const hutGroup = new THREE.Group();
    hutGroup.position.set(0, 14, 15); // Behind the skier (Skier is at Z=12, ground is Y=10. Local Y=0 is World Y=14)
    
    // Side walls only, so both the front (towards slope) and back (uphill) are open
    // Walls are 8 high, so they go from Local Y=-4 to Y=4 (World Y=10 to 18)
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 8), whiteWallMat);
    wallL.position.set(4.5, 0, 0); // Left wall
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 8), whiteWallMat);
    wallR.position.set(-4.5, 0, 0); // Right wall
    hutGroup.add(wallL, wallR);

    // Flat roof sitting on top of the walls
    // Walls end at Local Y=4, so roof sits at Local Y=4.25
    const hutRoof = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 8), darkRoofMat);
    hutRoof.position.set(0, 4.25, 0);
    hutRoof.castShadow = true;
    hutGroup.add(hutRoof);
    
    houseGroup.add(hutGroup);

    // 6. Starting Gate Post & Red Bar
    const postMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
    const barMat = new THREE.MeshStandardMaterial({ color: 0xee1111, metalness: 0.2, roughness: 0.2 });
    
    // Two small posts in front of the skier
    const gatePostGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
    const postL = new THREE.Mesh(gatePostGeo, postMat);
    postL.position.set(-1.5, 10.75, 10.5); // Skier is at Z=12
    const postR = new THREE.Mesh(gatePostGeo, postMat);
    postR.position.set(1.5, 10.75, 10.5);
    
    // The Red Bar (hinged on the RIGHT post so it swings the other way)
    startBar = new THREE.Group();
    startBar.position.set(1.5, 11, 10.5); // Hinge location 
    
    const barMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), barMat);
    barMesh.rotation.z = Math.PI / 2; // Lay flat
    barMesh.position.set(-1.5, 0, 0); // Offset so the right edge is at the hinge
    startBar.add(barMesh);
    
    houseGroup.add(postL, postR, startBar);

    // 7. Cheering Coaches inside the house
    const coachMatBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }); // Black dress/jacket
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    function createCoach(jacketMat, isLeft) {
        const coach = new THREE.Group();
        
        // Body (Y: 1.2 to 2.6)
        const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 0.6), jacketMat);
        body.position.set(0, 1.9, 0);
        
        // Head (Y: 2.6 to 3.4)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4), skinMat);
        head.position.set(0, 3.0, 0);
        
        // Arms
        const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), jacketMat);
        arm1.position.set(0.65, 1.9, 0);
        const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), jacketMat);
        arm2.position.set(-0.65, 1.9, 0);
        
        // One arm raised cheering (rotated forward and up)
        if (isLeft) {
            arm1.position.set(0.65, 2.4, -0.3);
            arm1.rotation.x = Math.PI / 1.2;
        } else {
            arm2.position.set(-0.65, 2.4, -0.3);
            arm2.rotation.x = Math.PI / 1.2;
        }

        // Legs (Y: 0 to 1.2)
        const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), pantsMat);
        leg1.position.set(0.25, 0.6, 0);
        const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), pantsMat);
        leg2.position.set(-0.25, 0.6, 0);

        coach.add(body, head, arm1, arm2, leg1, leg2);
        coach.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }});
        return coach;
    }

    const coachL = createCoach(coachMatBlack, true);
    coachL.position.set(3.6, 10, 12.5); // Tucked behind the solid arch face
    coachL.rotation.y = -Math.PI / 4; // Angled slightly towards the skier
    
    const coachR = createCoach(coachMatBlack, false);
    coachR.position.set(-3.6, 10, 12.5); // Tucked behind the solid arch face
    coachR.rotation.y = Math.PI / 4;

    houseGroup.add(coachL, coachR);

    scene.add(houseGroup);
}

function createSkier() {
    skier = new THREE.Group();

    // Premium Physically Based Materials (MeshStandardMaterial)
    // High-fidelity standard shaders are extremely robust and compatible on all GPUs
    skierMatHelmet = new THREE.MeshStandardMaterial({ 
        color: 0x3a9ad9, 
        roughness: 0.1, 
        metalness: 0.9
    }); // Shiny helmet composite (fixed light blue)

    skierMatJacket = new THREE.MeshStandardMaterial({ 
        color: 0x3a9ad9, 
        roughness: 0.65, 
        metalness: 0.1
    }); // High-performance jacket (fixed light blue)

    skierMatPants = new THREE.MeshStandardMaterial({ 
        color: 0x3a9ad9, 
        roughness: 0.75, 
        metalness: 0.05
    }); // High-performance pants (fixed light blue)

    skierMatRightSleeve = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65,
        metalness: 0.1
    }); // Solid white right sleeve

    skierMatSkis = new THREE.MeshStandardMaterial({ 
        color: 0x00f0ff, 
        roughness: 0.2, 
        metalness: 0.6
    }); // Composite waxed skis (will be updated dynamically by selection)

    // Skis
    const skiGeo = new THREE.BoxGeometry(0.15, 0.05, 2.5);
    const skiL = new THREE.Mesh(skiGeo, skierMatSkis);
    skiL.position.set(-0.3, 0.025, 0);
    const skiR = new THREE.Mesh(skiGeo, skierMatSkis);
    skiR.position.set(0.3, 0.025, 0);
    skier.add(skiL, skiR);

    // Pelvis (root for body parts)
    const pelvis = new THREE.Group();
    skier.add(pelvis);

    // Legs (pivot at hips)
    const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    legGeo.translate(0, -0.4, 0); // Pivot at top
    const legL = new THREE.Mesh(legGeo, skierMatPants);
    legL.position.set(-0.3, 0, 0);
    const legR = new THREE.Mesh(legGeo, skierMatPants);
    legR.position.set(0.3, 0, 0);
    pelvis.add(legL, legR);

    // Torso Group (pivot at hips)
    const torsoPivot = new THREE.Group();
    pelvis.add(torsoPivot);

    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.35);
    torsoGeo.translate(0, 0.45, 0); // Pivot at bottom
    const torso = new THREE.Mesh(torsoGeo, skierMatJacket);
    torsoPivot.add(torso);

    // Head (attached to top of torso)
    const headGeo = new THREE.SphereGeometry(0.22, 32, 32); 
    const head = new THREE.Mesh(headGeo, skierMatHelmet);
    head.position.set(0, 0.9 + 0.22, -0.1); 
    torsoPivot.add(head);

    // Arms (pivot at shoulders)
    const armGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
    armGeo.translate(0, -0.35, 0); // Pivot at shoulder (top)
    const armL = new THREE.Mesh(armGeo, skierMatJacket);
    armL.position.set(-0.45, 0.8, 0); 
    const armR = new THREE.Mesh(armGeo, skierMatRightSleeve);
    armR.position.set(0.45, 0.8, 0);
    torsoPivot.add(armL, armR);

    // Poles (attached to hands)
    const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.8, 16);
    poleGeo.translate(0, -0.9, 0); // Translate by half-height so pivot (0,0,0) is at the TOP of the pole (grip)!
    const poleL = new THREE.Mesh(poleGeo, skierMatSkis);
    poleL.position.set(0, -0.7, 0); // Hand is at bottom of arm
    armL.add(poleL);

    const poleR = new THREE.Mesh(poleGeo, skierMatSkis);
    poleR.position.set(0, -0.7, 0);
    armR.add(poleR);

    // Save hierarchy parts and poses for kinematic animation
    skier.userData = {
        parts: { pelvis, legL, legR, torsoPivot, armL, armR, poleL, poleR },
        poseStanding: {
            pelvis: { pos: [0, 0.8, 0], rot: [0, 0, 0] },
            legL: { pos: [-0.3, 0, 0], rot: [0, 0, 0] },
            legR: { pos: [0.3, 0, 0], rot: [0, 0, 0] },
            torsoPivot: { pos: [0, 0, 0], rot: [0, 0, 0] },
            armL: { pos: [-0.45, 0.8, 0], rot: [0, 0, 0] },
            armR: { pos: [0.45, 0.8, 0], rot: [0, 0, 0] },
            poleL: { pos: [0, -0.7, 0], rot: [-0.5, 0, 0] }, // Tuck aerodynamically backwards & upwards
            poleR: { pos: [0, -0.7, 0], rot: [-0.5, 0, 0] }
        },
        poseTuck: {
            pelvis: { pos: [0, 0.45, 0.4], rot: [0, 0, 0] }, // Hips drop down and UPHILL (+Z)
            legL: { pos: [-0.3, 0, 0], rot: [-0.6, 0, 0] }, // Knees bend DOWNHILL (-Z)
            legR: { pos: [0.3, 0, 0], rot: [-0.6, 0, 0] },
            torsoPivot: { pos: [0, 0, 0], rot: [-1.3, 0, 0] }, // Torso leans far DOWNHILL (-Z)
            armL: { pos: [-0.45, 0.8, 0], rot: [0.8, 0, 0] }, // Arms pull BACK relative to torso
            armR: { pos: [0.45, 0.8, 0], rot: [0.8, 0, 0] },
            poleL: { pos: [0, -0.7, 0], rot: [-1.3, 0, 0] }, // Perfect tucked aerodynamic pole profile
            poleR: { pos: [0, -0.7, 0], rot: [-1.3, 0, 0] }
        }
    };

    // Initialize to standing pose
    for (let partName in skier.userData.parts) {
        const part = skier.userData.parts[partName];
        const state = skier.userData.poseStanding[partName];
        if (state.pos) part.position.fromArray(state.pos);
        if (state.rot) part.rotation.fromArray(state.rot);
    }

    // Enable shadows for the entire skier
    skier.traverse(child => {
        if (child.isMesh) child.castShadow = true;
    });

    skier.position.set(0, 10, 12); // Start perfectly centered under the roof
    scene.add(skier);
}

// ============================================================================
// VFX: HIGH-PERFORMANCE DYNAMIC SNOW SPRAY SYSTEM
// ============================================================================
let sprayMesh;
const MAX_SPRAY_PARTICLES = 150;
const sprayParticles = [];

function createSnowSpraySystem() {
    const particleGeo = new THREE.SphereGeometry(0.12, 4, 4);
    const particleMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false, // Prevents Z-buffer fighting/halo artifacts in dense spray
        blending: THREE.NormalBlending
    });
    
    sprayMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_SPRAY_PARTICLES);
    // Render order set high so transparent dust particles draw cleanly over snow
    sprayMesh.renderOrder = 1;
    scene.add(sprayMesh);
    
    // Initialize pool
    for (let i = 0; i < MAX_SPRAY_PARTICLES; i++) {
        sprayParticles.push({
            active: false,
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            scale: 0.1,
            opacity: 0.5,
            life: 0.0
        });
    }
}

function updateSnowSpraySystem(dt) {
    if (!sprayMesh) return;
    const dummy = new THREE.Object3D();
    
    // 1. Spawn new particles if skier is moving fast and on the ground
    if (gameState === 'playing' && speed > 5) {
        // Spray emission scales with speed and hard turns (lateralSpeed)
        const spawnRate = Math.floor(dt * (40 + Math.abs(lateralSpeed) * 35));
        let spawned = 0;
        
        for (let i = 0; i < MAX_SPRAY_PARTICLES; i++) {
            const p = sprayParticles[i];
            if (!p.active) {
                p.active = true;
                p.life = 0.6 + Math.random() * 0.4; // 0.6 - 1.0 seconds
                p.opacity = 0.5;
                p.scale = 0.4 + Math.random() * 0.6;
                
                // Emitting from tails of both skis
                const leftSkiOffset = -0.3;
                const rightSkiOffset = 0.3;
                const activeOffset = Math.random() > 0.5 ? leftSkiOffset : rightSkiOffset;
                
                p.pos.set(
                    skier.position.x + activeOffset + (Math.random() - 0.5) * 0.15,
                    skier.position.y + 0.08,
                    skier.position.z + 1.25 // Off the tails of the skis
                );
                
                // Physics velocity: ejects backward (+Z since player moves -Z)
                // Also flings wide to the opposite side of the carving direction
                p.vel.set(
                    -lateralSpeed * 0.35 + (Math.random() - 0.5) * 2.0,
                    Math.random() * 1.5 + 0.8, // eject upwards
                    speed * 0.15 + 1.5 + Math.random() * 2.0 // spray lags behind player
                );
                
                spawned++;
                if (spawned >= spawnRate) break;
            }
        }
    }
    
    // 2. Animate and update GPU instanced matrices
    for (let i = 0; i < MAX_SPRAY_PARTICLES; i++) {
        const p = sprayParticles[i];
        if (p.active) {
            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                dummy.scale.set(0, 0, 0); // Hide
            } else {
                // Apply velocities
                p.pos.addScaledVector(p.vel, dt);
                p.vel.y -= 3.0 * dt; // Gravity pull on spray
                p.vel.x *= 0.96; // Air resistance on lateral spread
                
                // Expand dust cloud and fade opacity
                p.scale += dt * 1.8;
                p.opacity = (p.life / 1.0) * 0.5;
                
                dummy.position.copy(p.pos);
                dummy.scale.setScalar(p.scale);
            }
            dummy.updateMatrix();
            sprayMesh.setMatrixAt(i, dummy.matrix);
        } else {
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            sprayMesh.setMatrixAt(i, dummy.matrix);
        }
    }
    sprayMesh.instanceMatrix.needsUpdate = true;
}

function createGates() {
    // Bring gates much closer together for faster action
    const gateZPositions = [-100, -250, -400, -550];
    
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 6, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.3, metalness: 0.2 }); 
    const panelGeo = new THREE.PlaneGeometry(1.2, 0.8);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.6, side: THREE.DoubleSide });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1111cc, roughness: 0.6, side: THREE.DoubleSide });

    gateZPositions.forEach((z, index) => {
        const isRed = index % 2 === 0;
        const colorMat = isRed ? redMat : blueMat;
        const offset = isRed ? 6 : -6; 

        // Define valid passing window for collision check
        gates.push({
            z: z,
            minX: offset - 3.8,
            maxX: offset + 3.8,
            passed: false
        });

        // Left Gate Structure
        const yL1 = getTerrainHeight(offset - 5, z);
        const poleL1 = new THREE.Mesh(poleGeo, poleMat);
        poleL1.position.set(offset - 5, yL1 + 3, z);
        
        const yL2 = getTerrainHeight(offset - 3.8, z);
        const poleL2 = new THREE.Mesh(poleGeo, poleMat);
        poleL2.position.set(offset - 3.8, yL2 + 3, z);
        
        const panelL = new THREE.Mesh(panelGeo, colorMat);
        panelL.position.set(offset - 4.4, (yL1 + yL2) / 2 + 4, z);
        
        poleL1.castShadow = true; poleL2.castShadow = true; panelL.castShadow = true;
        scene.add(poleL1, poleL2, panelL);

        // Right Gate Structure
        const yR1 = getTerrainHeight(offset + 5, z);
        const poleR1 = new THREE.Mesh(poleGeo, poleMat);
        poleR1.position.set(offset + 5, yR1 + 3, z);
        
        const yR2 = getTerrainHeight(offset + 3.8, z);
        const poleR2 = new THREE.Mesh(poleGeo, poleMat);
        poleR2.position.set(offset + 3.8, yR2 + 3, z);
        
        const panelR = new THREE.Mesh(panelGeo, colorMat);
        panelR.position.set(offset + 4.4, (yR1 + yR2) / 2 + 4, z);

        poleR1.castShadow = true; poleR2.castShadow = true; panelR.castShadow = true;
        scene.add(poleR1, poleR2, panelR);
    });
}

function createFinishLine() {
    const bannerGeo = new THREE.BoxGeometry(30, 2, 0.5);
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xffca28, roughness: 0.5 });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    
    // Average height between poles
    const heightL = getTerrainHeight(-15, finishLineZ);
    const heightR = getTerrainHeight(15, finishLineZ);
    const midHeight = (heightL + heightR) / 2;
    
    banner.position.set(0, midHeight + 8, finishLineZ);
    banner.castShadow = true;
    scene.add(banner);

    const postGeo = new THREE.CylinderGeometry(0.4, 0.4, 12, 16);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
    
    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-15, heightL + 6, finishLineZ);
    postL.castShadow = true;
    scene.add(postL);

    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(15, heightR + 6, finishLineZ);
    postR.castShadow = true;
    scene.add(postR);
}

// Global function to be called from HTML
// ============================================================================
// SKI EQUIPMENT DATABASE & DYNAMICS
// ============================================================================
const SKIS_DATABASE = {
    powder: {
        name: "Powder Beast",
        color: "#00f0ff",
        stats: {
            speed: 75,
            accel: 65,
            carve: 70,
            grip: 90,
            physics: {
                dragCoeff: 0.52,
                gravityScale: 6.2,
                carveImpulse: 36,
                gripDamping: 0.94
            }
        }
    },
    downhill: {
        name: "Downhill Bullet",
        color: "#d4fc34",
        stats: {
            speed: 90,
            accel: 80,
            carve: 40,
            grip: 50,
            physics: {
                dragCoeff: 0.44,
                gravityScale: 7.0,
                carveImpulse: 28,
                gripDamping: 0.82
            }
        }
    },
    slalom: {
        name: "Slalom Carver",
        color: "#f72585",
        stats: {
            speed: 50,
            accel: 50,
            carve: 95,
            grip: 85,
            physics: {
                dragCoeff: 0.62,
                gravityScale: 5.8,
                carveImpulse: 48,
                gripDamping: 0.92
            }
        }
    },
    carbon: {
        name: "Carbon Stealth",
        color: "#ff6600",
        stats: {
            speed: 85,
            accel: 95,
            carve: 50,
            grip: 40,
            physics: {
                dragCoeff: 0.48,
                gravityScale: 7.8,
                carveImpulse: 30,
                gripDamping: 0.76
            }
        }
    }
};

let selectedSkiId = 'powder';

// Global function to be called from HTML
window.selectSki = function(skiId) {
    if (!SKIS_DATABASE[skiId]) return;
    
    selectedSkiId = skiId;
    
    // Update active visual card in the DOM
    const cards = document.querySelectorAll('.sr-ski-card');
    cards.forEach(card => {
        card.classList.remove('active');
        // Reset box shadow on inactive color indicators
        const indicator = card.querySelector('.ski-color-indicator');
        if (indicator) indicator.style.boxShadow = 'none';
    });
    
    const activeCard = document.getElementById('ski-' + skiId);
    if (activeCard) {
        activeCard.classList.add('active');
        // Add custom glowing box-shadow matching selected ski color
        const indicator = activeCard.querySelector('.ski-color-indicator');
        if (indicator) {
            const color = SKIS_DATABASE[skiId].color;
            indicator.style.boxShadow = `0 0 10px ${color}`;
        }
    }
    
    // Update 3D ski color in real-time
    const skiData = SKIS_DATABASE[skiId];
    if (skierMatSkis) {
        skierMatSkis.color.set(skiData.color);
    }
    
    // Set dynamic gameplay physics parameters
    currentDragCoeff = skiData.stats.physics.dragCoeff;
    currentGravityScale = skiData.stats.physics.gravityScale;
    currentCarveImpulse = skiData.stats.physics.carveImpulse;
    currentGripDamping = skiData.stats.physics.gripDamping;
    
    // Update right panel stats display with human-friendly values
    const approxTopSpeed = Math.floor(Math.sqrt(2 * GRAVITY * 0.14 / (currentDragCoeff * AIR_DENSITY * SKIER_FRONTAL_AREA / SKIER_MASS)) * 3.6);
    document.getElementById('val-speed').innerText = approxTopSpeed;
    document.getElementById('val-accel').innerText = currentGravityScale.toFixed(2) + 'x';
    document.getElementById('val-carve').innerText = currentCarveImpulse;
    document.getElementById('val-grip').innerText = currentGripDamping.toFixed(2);
    
    // Animate the progress bars to match the selected ski profile
    document.getElementById('bar-speed').style.width = skiData.stats.speed + '%';
    document.getElementById('bar-accel').style.width = skiData.stats.accel + '%';
    document.getElementById('bar-carve').style.width = skiData.stats.carve + '%';
    document.getElementById('bar-grip').style.width = skiData.stats.grip + '%';
};

// ============================================================================
// KINEMATIC PHYSICS SYSTEM — Gravity-Driven with Drag & Carving
// ============================================================================

// Physical constants
const GRAVITY = 9.81;           // m/s² — Earth's gravitational acceleration
const AIR_DENSITY = 1.225;      // kg/m³ — Sea-level air density (ρ)
const SKIER_MASS = 85;          // kg — Skier + equipment mass
const SKIER_FRONTAL_AREA = 0.4; // m² — Tuck position frontal cross-section

// Base friction coefficients for the simulation engine
const baseStats = {
    snowFriction: 0.06,     // μ_snow — Kinetic friction of ski on snow
    carveFriction: 0.04     // Edge friction lost while carving
};

// Live physics variables
let currentGravityScale = 6.2;
let currentDragCoeff    = 0.52;
let currentCarveImpulse = 36;
let currentGripDamping  = 0.94;

function startIntroCutscene() {
    gameState = 'intro';
    introTimer = 0;
    
    // Hide the Service Room UI
    document.getElementById('service-room').classList.remove('active');
    
    // Ensure the starting gate bar is visible when the race intro starts
    if (startBar) {
        startBar.visible = true;
    }
    
    // Keep screen hidden during clear-view phase (first 2s)
    // The overlay will appear only after the swerve starts
    screenEl.classList.remove('active');
    mainMsgEl.innerText = '';

    // SNAP camera to the front of the house (downhill side, looking uphill at skier)
    // This ensures Phase 0 (2s clear view) starts from exactly the right position
    camera.position.set(0, 15, -18);
    cameraTarget.set(0, 12, 12);
    camera.lookAt(cameraTarget);

    // Show the overlay only when the countdown starts (after swerve finishes at 5s)
    setTimeout(() => {
        screenEl.classList.add('active');
    }, 5000);

    // Total intro: 2s hold + 3s swerve/zoom + 3s countdown/tuck = 8s
    setTimeout(() => {
        gameState = 'playing';
        // Gate push impulse — skier pushes out of the starting gate
        // This carries them off the flat platform onto the slope where gravity takes over
        speed = 12;
        screenEl.classList.remove('active');
        mainMsgEl.innerText = '';
        
        // Initialize skier to standing pose when race starts
        for (let partName in skier.userData.parts) {
            const part = skier.userData.parts[partName];
            const start = skier.userData.poseStanding[partName];
            if (start.pos) part.position.fromArray(start.pos);
            if (start.rot) part.rotation.fromArray(start.rot);
        }
        
        clock.start();
    }, 8000); 
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') input.left = true;
        if (e.key === 'ArrowRight') input.right = true;
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') input.left = false;
        if (e.key === 'ArrowRight') input.right = false;
    });

    const tLeft = document.getElementById('touch-left');
    const tRight = document.getElementById('touch-right');
    const knobLeft = document.getElementById('knob-left');
    const knobRight = document.getElementById('knob-right');

    tLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        input.left = true;
        knobLeft.style.transform = 'translateX(70px)';
    }, {passive: false});

    tLeft.addEventListener('touchend', (e) => {
        e.preventDefault();
        input.left = false;
        knobLeft.style.transform = 'translateX(0)';
    });

    tRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        input.right = true;
        knobRight.style.transform = 'translateX(70px)';
    }, {passive: false});

    tRight.addEventListener('touchend', (e) => {
        e.preventDefault();
        input.right = false;
        knobRight.style.transform = 'translateX(0)';
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (gameState === 'intro') {
        introTimer += dt;
        
        const skierCenter = skier.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        
        // === PHASE 0: 0–2s — Hold still at front of house (clear view, no overlay) ===
        if (introTimer < 2.0) {
            camera.position.set(0, 15, skier.position.z - 30);
            cameraTarget.copy(skierCenter);
        }
        // === PHASE 1: 2–5s — Swerve from front around to behind the skier ===
        else if (introTimer < 5.0) {
            const progress = (introTimer - 2.0) / 3.0; // 0 → 1
            const ease = progress * progress * (3 - 2 * progress); // smoothstep
            
            // Orbit: start at PI (in front of skier, -Z side) → end at 0 (behind skier, +Z side)
            const startAngle = Math.PI;
            const endAngle = 0;
            const angle = startAngle + (endAngle - startAngle) * ease;
            
            const startRadius = 30;
            const endRadius = 8;
            const radius = startRadius + (endRadius - startRadius) * ease;
            
            const startY = 15;
            const endY = skier.position.y + 2.5;
            const camY = startY + (endY - startY) * ease + Math.sin(ease * Math.PI) * 8; // arc up then settle
            
            const camX = Math.sin(angle) * radius;
            const camZ = skier.position.z + Math.cos(angle) * radius;
            
            camera.position.set(camX, camY, camZ);
            cameraTarget.copy(skierCenter);
        }
        // === PHASE 2: 5–8s — Locked behind skier, countdown 3-2-1-0, then tuck ===
        else {
            camera.position.set(
                skier.position.x,
                skier.position.y + 2.5,
                skier.position.z + 6
            );
            cameraTarget.copy(skierCenter);
        }
        
        // === COUNTDOWN — starts only in Phase 2 (after swerve) ===
        if (introTimer >= 5.0 && introTimer < 5.8)      mainMsgEl.innerText = '3';
        else if (introTimer >= 5.8 && introTimer < 6.6) mainMsgEl.innerText = '2';
        else if (introTimer >= 6.6 && introTimer < 7.4) mainMsgEl.innerText = '1';
        else if (introTimer >= 7.4 && introTimer < 8.0) mainMsgEl.innerText = '0';
        else if (introTimer < 5.0) mainMsgEl.innerText = '';
        


        camera.lookAt(cameraTarget);
    } 
    else if (gameState === 'playing') {
        timeElapsed += dt;
        timerEl.innerText = formatTime(timeElapsed);

        // Swift aerodynamic tuck animation starting exactly as the clock hits 0 (first 0.6 seconds of the run)
        if (timeElapsed <= 0.6) {
            const t = timeElapsed / 0.6;
            const ease = t * t * (3 - 2 * t);
            for (let partName in skier.userData.parts) {
                const part = skier.userData.parts[partName];
                const start = skier.userData.poseStanding[partName];
                const end = skier.userData.poseTuck[partName];
                if (start.pos && end.pos) {
                    part.position.x = start.pos[0] + (end.pos[0] - start.pos[0]) * ease;
                    part.position.y = start.pos[1] + (end.pos[1] - start.pos[1]) * ease;
                    part.position.z = start.pos[2] + (end.pos[2] - start.pos[2]) * ease;
                }
                if (start.rot && end.rot) {
                    part.rotation.x = start.rot[0] + (end.rot[0] - start.rot[0]) * ease;
                    part.rotation.y = start.rot[1] + (end.rot[1] - start.rot[1]) * ease;
                    part.rotation.z = start.rot[2] + (end.rot[2] - start.rot[2]) * ease;
                }
            }
        } else {
            // Lock safely into aerodynamic tuck pose for high speed carving
            for (let partName in skier.userData.parts) {
                const part = skier.userData.parts[partName];
                const end = skier.userData.poseTuck[partName];
                if (end.pos) part.position.fromArray(end.pos);
                if (end.rot) part.rotation.fromArray(end.rot);
            }
        }
        
        // Update the Stoppuhr texture on the arch
        if (stopwatchCtx && stopwatchTexture) {
            stopwatchCtx.fillStyle = '#000000';
            stopwatchCtx.fillRect(0, 0, 256, 64);
            stopwatchCtx.fillStyle = '#ff1111'; // Bright red digital text
            stopwatchCtx.fillText(formatTime(timeElapsed), 128, 32);
            stopwatchTexture.needsUpdate = true;
        }
        
        // Swing the starting gate OUTWARD (downhill towards -Z)
        if (startBar && startBar.rotation.y > -Math.PI / 2) {
            startBar.rotation.y -= dt * 6; 
        }

        // ================================================================
        // GRAVITY-DRIVEN KINEMATIC PHYSICS
        // ================================================================
        
        // --- 1. SLOPE ANGLE from terrain sampling ---
        const currentSkierY = getSkierHeight(skier.position.x, skier.position.z);
        const skierForwardY = getSkierHeight(skier.position.x, skier.position.z - 1);
        // slopeZ is negative on downhill (terrain ahead is lower)
        const slopeZ = skierForwardY - currentSkierY;
        // heightDrop is positive on downhill (we're falling)
        const heightDrop = -slopeZ;
        const slopeAngle = Math.atan2(heightDrop, 1.0);
        const sinTheta = Math.sin(slopeAngle);
        const cosTheta = Math.cos(slopeAngle);
        
        // --- 2. GRAVITY along the slope: a = g * sin(θ) * scale ---
        const gravityAccel = GRAVITY * sinTheta * currentGravityScale;
        
        // --- 3. SNOW FRICTION (opposes motion): a = μ * g * cos(θ) ---
        const frictionDecel = baseStats.snowFriction * GRAVITY * cosTheta;
        
        // --- 4. AERODYNAMIC DRAG (quadratic, creates natural terminal velocity) ---
        // a_drag = (½ * Cd * ρ * A * v²) / m
        const dragDecel = (0.5 * currentDragCoeff * AIR_DENSITY * SKIER_FRONTAL_AREA * speed * speed) / SKIER_MASS;
        
        // --- 5. CARVING COST (proportional to forward speed) ---
        // Turning at high speed costs more energy — ski edges dig harder into snow
        // At 80 units/s: costs 0.04 * 80 = 3.2 m/s² (modest vs 12 gravity)
        // At 20 units/s: costs 0.04 * 20 = 0.8 m/s² (almost free — encouraging agility)
        const isTurning = input.left || input.right;
        const carveDecel = isTurning ? baseStats.carveFriction * speed : 0;
        
        // --- 6. NET ACCELERATION ---
        let netAccel = gravityAccel - frictionDecel - dragDecel - carveDecel;
        if (speed <= 0 && netAccel < 0) netAccel = 0; // No rolling backward
        
        // --- 7. INTEGRATE VELOCITY ---
        speed += netAccel * dt;
        if (speed < 0) speed = 0;
        
        // --- 8. LATERAL STEERING ---
        if (input.left)  lateralSpeed -= currentCarveImpulse * dt;
        if (input.right) lateralSpeed += currentCarveImpulse * dt;
        
        // --- 9. LATERAL GRIP (frame-rate-independent exponential decay) ---
        // pow(factor, dt*60) normalizes to 60fps reference rate
        lateralSpeed *= Math.pow(currentGripDamping, dt * 60);
        if (Math.abs(lateralSpeed) < 0.01) lateralSpeed = 0;
        
        // --- 10. POSITION ---
        skier.position.z -= speed * dt;
        skier.position.x += lateralSpeed * dt;
        skier.position.y = currentSkierY;
        
        // --- 11. VISUAL ROTATION ---
        // Pitch: nose follows slope (slopeZ is negative downhill → negative angle → nose down)
        skier.rotation.x = Math.atan2(slopeZ, 1);
        // Roll: lean into the turn
        skier.rotation.z = -lateralSpeed * 0.08;
        // Yaw: heading shifts slightly when carving
        skier.rotation.y = -lateralSpeed * 0.04;

        // Gate Missing Check Logic
        for (let gate of gates) {
            if (!gate.passed && skier.position.z <= gate.z) {
                gate.passed = true;
                // If the player is outside the gate bounds when passing its Z axis
                if (skier.position.x < gate.minX || skier.position.x > gate.maxX) {
                    gameState = 'failed';

                    // Display Whiteout Result Modal
                    document.getElementById('result-modal').style.display = 'flex';
                    document.getElementById('fail-modal-box').style.display = 'block';
                    document.getElementById('success-modal-box').style.display = 'none';

                    speedEl.innerText = "0";
                    
                    return; // exit the loop
                }
            }
        }

        // === GAMEPLAY CAMERA: tight 3rd-person follow, no cinematic lag ===
        dirLight.position.set(skier.position.x - 50, skier.position.y + 100, skier.position.z + 50);
        dirLight.target.position.copy(skier.position);
        dirLight.target.updateMatrixWorld();
        
        // Ideal position: directly behind and slightly above the skier
        const idealCameraPos = new THREE.Vector3(
            skier.position.x,           // Track X exactly — no lag on turns
            skier.position.y + 3.5,     // Fixed height above skier
            skier.position.z + 7        // Fixed distance behind skier
        );
        
        // Very tight follow — no cinematic drift that fights the steering
        camera.position.x += (idealCameraPos.x - camera.position.x) * 0.35;
        camera.position.y += (idealCameraPos.y - camera.position.y) * 0.15;
        camera.position.z += (idealCameraPos.z - camera.position.z) * 0.35;
        
        // Terrain floor clamp — prevent camera from clipping below the snow surface
        // This is critical on steep transition zones where the terrain behind the skier
        // (uphill) is higher than the camera's ideal Y position
        const cameraTerrainY = getTerrainHeight(camera.position.x, camera.position.z);
        if (camera.position.y < cameraTerrainY + 1.5) {
            camera.position.y = cameraTerrainY + 1.5;
        }
        
        // Look slightly ahead and down the slope
        const lookTarget = new THREE.Vector3(
            skier.position.x,
            skier.position.y + 0.5,
            skier.position.z - 10
        );
        cameraTarget.lerp(lookTarget, 0.35);
        camera.lookAt(cameraTarget);

        // --- CINEMATIC CAMERA EFFECTS ---
        // 1. Dynamic FOV (Field of View tunnel warp effect)
        // Base FOV is 60 (high-precision). Stretch up to 78 at top speed (e.g. speed ≈ 60)
        const targetFOV = 60 + Math.min(18, speed * 0.3);
        camera.fov += (targetFOV - camera.fov) * 0.08; // Smooth warp zoom
        camera.updateProjectionMatrix();
        
        // 2. High-Speed Screen Shake
        // Vibrates the camera slightly at high speeds (>30 units/s) to convey extreme velocity
        if (speed > 30) {
            const shakeIntensity = Math.pow((speed - 30) / 40, 2) * 0.03;
            camera.position.x += (Math.random() - 0.5) * shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            camera.position.z += (Math.random() - 0.5) * shakeIntensity;
        }

        speedEl.innerText = Math.floor(speed * 3.6);

        // Cutscene Trigger right after crossing the finish line
        if (skier.position.z <= finishLineZ + 10) {
            gameState = 'cutscene';

            // Display Success Leaderboard Modal
            document.getElementById('result-modal').style.display = 'flex';
            document.getElementById('fail-modal-box').style.display = 'none';
            document.getElementById('success-modal-box').style.display = 'block';

            // Update Michael Krummenacher's score with his actual run time!
            const finishedTimeStr = document.getElementById('timer-value').innerText;
            const scoreEl = document.getElementById('krummenacher-score');
            if (scoreEl) {
                scoreEl.innerText = finishedTimeStr;
                scoreEl.className = "score text-gold"; // Highlight his final time in gold!
            }

            speedEl.innerText = "0";
        }
    } 
    else if (gameState === 'finished' || gameState === 'failed' || gameState === 'cutscene') {
        // Stop movement immediately on failure, gently on finish
        if (gameState === 'failed') {
            speed *= 0.8;
            lateralSpeed *= 0.8;
        } else {
            speed *= 0.95;
            lateralSpeed *= 0.95;
        }
        
        skier.position.z -= speed * dt;
        skier.position.x += lateralSpeed * dt;
        
        // Ensure skier stays on terrain even when finished/failed/cutscene
        skier.position.y = getSkierHeight(skier.position.x, skier.position.z);
        
        if (gameState === 'cutscene') {
            // Cinematic orbit camera for the end
            const orbitSpeed = timeElapsed * 0.5;
            const radius = 15;
            const camX = skier.position.x + Math.sin(orbitSpeed) * radius;
            const camZ = skier.position.z + Math.cos(orbitSpeed) * radius;
            camera.position.lerp(new THREE.Vector3(camX, skier.position.y + 8, camZ), 0.05);
        } else {
            camera.position.lerp(new THREE.Vector3(skier.position.x * 0.5, skier.position.y + 5, skier.position.z + 12), 0.05);
        }
        
        cameraTarget.lerp(skier.position, 0.05);
        camera.lookAt(cameraTarget);
    }

    // Always update snow spray particle animations
    updateSnowSpraySystem(dt);

    renderer.render(scene, camera);
}

// Start with the landing page
initLandingPage();
