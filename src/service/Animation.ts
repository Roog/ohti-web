// import * as THREE from 'three';
import * as THREE from 'three';
import Events from '../utils/Events';
import QuaternionTools from '../utils/QuaternionTools';
import Tool from '../utils/Tools';
import VectorTools from '../utils/VectorTools';
import AudioPlayer from './AudioPlayer';
import HeadtrackerListener from './HeadtrackerListener';

export default class AnimationView {

    private event: Events = new Events();

    private $container: any;
    private renderer: any;
    private scene: any;
    private camera: any;
    private noHeight: any;

    private WIDTH: any;
    private HEIGHT: any;

    // Elements
    private axesHelper: any;
    private box: any;
    private pivot: any;

    private LIVEHTREFACTUAL: any;
    public LIVEHTREF: any = [0,0,0,0];

    private static instance: AnimationView;
    public static getInstance(): AnimationView {
        if (AnimationView.instance == null) {
            AnimationView.instance = new AnimationView();
        }
        return AnimationView.instance;
    }

    private constructor() {
        const self = this;

        this.LIVEHTREFACTUAL = null;

        // ==========================================
        // 3D Graphics, THREE.js
        // var renderer, scene, camera;
        this.$container = Tool.$dom('htGfxScene');
        // var noHeight = false;

        // Set the scene size.
        this.WIDTH = window.innerWidth || 300;
        this.HEIGHT = window.innerHeight || 300;

        // Set some camera attributes.
        var VIEW_ANGLE = 50;
        var ORIGINALASPECT = this.WIDTH / this.HEIGHT;
        const NEAR = 0.1;
        const FAR = 1000;

        // Check for custom settings
        if (this.$container.dataset.noheight) {
            this.noHeight = true;
            this.HEIGHT = 300;
            ORIGINALASPECT = this.WIDTH / this.HEIGHT;
            VIEW_ANGLE = 20;
        }

        this.scene = new THREE.Scene();

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            VIEW_ANGLE,
            ORIGINALASPECT,
            NEAR,
            FAR
        );

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( this.WIDTH, this.HEIGHT );

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        this.renderer.autoClear = false;
        this.renderer.setClearColor(0x000000, 0.0);

        // Attach the renderer-supplied DOM element
        this.$container.appendChild(this.renderer.domElement);

        // Camera
        this.camera.position.set( -15, 0, 3 );
        this.camera.up = new THREE.Vector3(0,0,1);
        this.camera.lookAt( 0, 0, 0 );

        // Extra Helpers
        this.axesHelper = new THREE.AxesHelper( 3 );
        this.scene.add( this.axesHelper );

        // Create lights
        // var light = new THREE.PointLight(0xEEEEEE);
        // light.position.set(20, 0, 20);
        // this.scene.add(light);

        var light2 = new THREE.DirectionalLight( 0xEEEEEE, 0.4 );
        //light2.position.set( 2.75, 10, 0.5 );
        this.scene.add(light2);

        var lightAmb = new THREE.AmbientLight(0x777777);
        this.scene.add(lightAmb);

        // Create geometry shape
        this.pivot = new THREE.Group();
        this.scene.add( this.pivot );

        // BOX (IMU CHIP)
        var boxGeom = new THREE.BoxGeometry( 2, 2, 0.5 ); // width, height, depth
        var boxMaterial = new THREE.MeshBasicMaterial({ color: 0x7f7f7f });
        this.box = new THREE.Mesh( boxGeom, boxMaterial );
        this.box.position.set( 0, 0, 0 );
        this.scene.add( this.box );

        // New Box manual
        const geometry = new THREE.BoxGeometry(1.2, 0.6, 0.6);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
        const mesh = new THREE.Mesh(geometry, material);
        // mesh.position.set( 0.5, 0, 0 );
        // mesh.rotation.order = 'XYZ';
        this.pivot.add(mesh);

        // Set up animation loop, could also use requestAnimationFrame
        console.log(this.renderer)
        this.renderer.setAnimationLoop(() => {
            let euler = QuaternionTools.toEuler(self.LIVEHTREFACTUAL, true);
            Tool.$attr("euler-x", (Math.round(euler.roll * 100) / 100));
            // INFO: compensating for the visual value only
            Tool.$attr("euler-y", (Math.round(euler.pitch * 100) / 100) * -1);
            // INFO: compensating for the visual value only
            Tool.$attr("euler-z", (Math.round(euler.yaw * 100) / 100) * -1) ;

            self.renderer.render( self.scene, self.camera );
        });
        // this.animate();

        self.renderer.render( self.scene, self.camera );

        window.addEventListener('beforeunload', function (e) {
            console.log("Before unload, could maybe clear some things?")
        });

        window.addEventListener("resize", this.onWindowResize, false);

        // ==========================================
        // Manual angle set

        // Euler
        // x "Roll/z-roll spin" - gamma is the angle between the N axis and the X axis (x-convention).
        Tool.$event("inputRangeX",
            "input",
            this.manuallyRotateFieldEuler);

        // y "Pitch/x-roll up/down" - alpha is the angle between the x axis and the N axis
        Tool.$event("inputRangeY",
            "input",
            this.manuallyRotateFieldEuler);

        // z "Yaw/head/y-roll left/right" - beta is the angle between the z axis and the Z axis.
        Tool.$event("inputRangeZ",
            "input",
            this.manuallyRotateFieldEuler);

        Tool.$event(document, "keydown", event => {
            if (event.isComposing || event.keyCode === 229) {
                return;
            }
            console.log(event.keyCode);

            switch(event.keyCode) {
                case 69:
                    (Tool.$dom("inputRangeX") as any).value = parseInt((Tool.$dom("inputRangeX") as any).value) + 1;
                break;
                case 87:
                    (Tool.$dom("inputRangeX") as any).value = parseInt((Tool.$dom("inputRangeX") as any).value) - 1;
                break;
                case 83:
                    (Tool.$dom("inputRangeY") as any).value = parseInt((Tool.$dom("inputRangeY") as any).value) + 1;
                break;
                case 68:
                    (Tool.$dom("inputRangeY") as any).value = parseInt((Tool.$dom("inputRangeY") as any).value) - 1;
                break;
                case 88:
                    (Tool.$dom("inputRangeZ") as any).value = parseInt((Tool.$dom("inputRangeZ") as any).value) + 1;
                break;
                case 67:
                    (Tool.$dom("inputRangeZ") as any).value = parseInt((Tool.$dom("inputRangeZ") as any).value) - 1;
                break;
            }
            this.manuallyRotateFieldEuler();
        });

        // Main controls
        Tool.$event("btnToggleSetReference", "click", this.setLocalReferencePoint);

        Tool.$event("inputSaveHeadtrackReference", "click", this.setLocalReferencePoint);

        Tool.$event("btnToggleResetReference", "click", this.resetLocalReferencePoint);

        Tool.$event("inputResetHeadtrackReference", "click", this.resetLocalReferencePoint);
    }

    // public animate = () => {
    //     let euler = QuaternionTools.ToEuler(this.LIVEHTREFACTUAL, true);
    //     Tool.$attr("euler-x", (Math.round(euler.roll * 100) / 100));
    //     Tool.$attr("euler-y", (Math.round(euler.pitch * 100) / 100));
    //     Tool.$attr("euler-z", (Math.round(euler.yaw * 100) / 100));

    //     this.renderer.render( this.scene, this.camera );

    //     requestAnimationFrame( this.animate );
    // }

    public rotateGraphics = (ret: any) => { // WXYZ
        this.LIVEHTREFACTUAL = ret;

        this.axesHelper.quaternion.set(ret[1], ret[2], ret[3], ret[0]);
        this.box.quaternion.set(ret[1], ret[2], ret[3], ret[0]);
        this.pivot.quaternion.set(ret[1], ret[2], ret[3], ret[0]);
    }

    private onWindowResize = () => {
        let w = window.innerWidth;
        let h = this.noHeight ? this.HEIGHT : window.innerHeight;
        console.log(window)
        if (this.renderer) {
            console.log(`Window width: ${w}, height: ${h}`);
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
            this.renderer.render( this.scene, this.camera );
        }
    }

    private manuallyRotateFieldEuler = () => {
        let rollValue = parseFloat((Tool.$dom("inputRangeX") as any).value); // roll
        let pitchValue = parseFloat((Tool.$dom("inputRangeY") as any).value); // pitch
        let yawValue = parseFloat((Tool.$dom("inputRangeZ") as any).value); // yaw
        (Tool.$dom("infoXValue") as any).innerText = rollValue;
        // INFO: compensating for the visual value only
        (Tool.$dom("infoYValue") as any).innerText = pitchValue * -1;
        // INFO: compensating for the visual value only
        (Tool.$dom("infoZValue") as any).innerText = yawValue * -1;

        rollValue = QuaternionTools.degreesToRadians(rollValue);
        pitchValue = QuaternionTools.degreesToRadians(pitchValue);
        yawValue = QuaternionTools.degreesToRadians(yawValue);

        let quat = QuaternionTools.fromEuler(rollValue, pitchValue, yawValue);
        let qRefComp = QuaternionTools.multiply(quat, HeadtrackerListener.getInstance().HTREFERENCE);
        qRefComp = QuaternionTools.normalize(qRefComp);

        // Omnitone rotate soundfield with Matrix
        // Ambisonics.js rotate soundfield with Euler
        const qMtx = QuaternionTools.quaternionToMatrix(qRefComp);
        const rowor_to_col = QuaternionTools.rowToColumnMajor(qMtx);
        AudioPlayer.getInstance().rotateSoundField(rowor_to_col, { x: rollValue, y: pitchValue, z: yawValue });

        // Three.js Rotate 3D model
        this.rotateGraphics(qRefComp);

        // Set global reference
        this.LIVEHTREF = quat;
    }

    // manualRotateField() {
    //     var azimuthValue = parseFloat((Tool.$dom("inputRangeAzimuth") as any).value);
    //     var elevationValue = parseFloat((Tool.$dom("inputRangeElevation") as any).value);
    //     (Tool.$dom("infoAzimuthValue") as any).innerText = azimuthValue;
    //     (Tool.$dom("infoElevationValue") as any).innerText = elevationValue;

    //     // Standard OpenGL-style "View" Matrix calculation.
    //     // Spherical vectors Range, Azimuth, Elevation
    //     var theta = azimuthValue / 180 * Math.PI; //(Radians)
    //     var phi = elevationValue / 180 * Math.PI; //(Radians)

    //     var forward = [
    //         Math.sin(theta) * Math.cos(phi),
    //         Math.sin(phi),
    //         Math.cos(theta) * Math.cos(phi)
    //     ];

    //     var right = VectorTools.normalizeVector(VectorTools.crossProduct(forward[0], forward[1], forward[2], 0, 1, 0));
    //     var up = VectorTools.normalizeVector(VectorTools.crossProduct(right[0], right[1], right[2], forward[0], forward[1], forward[2]));

    //     var manualRotMatrix = new Float32Array(9);
    //     manualRotMatrix[0] = right[0];
    //     manualRotMatrix[1] = right[1];
    //     manualRotMatrix[2] = right[2];
    //     manualRotMatrix[3] = up[0];
    //     manualRotMatrix[4] = up[1];
    //     manualRotMatrix[5] = up[2];
    //     manualRotMatrix[6] = forward[0];
    //     manualRotMatrix[7] = forward[1];
    //     manualRotMatrix[8] = forward[2];

    //     console.log(manualRotMatrix);

    //     // Omnitone rotate soundfield with Matrix
    //     // Ambisonics.js rotate soundfield with Euler
    //     AudioPlayer.getInstance().ht_rotatesoundfield(manualRotMatrix);

    //     let qRefQuaternion = QuaternionTools.FromMatrix(manualRotMatrix);
    //     qRefQuaternion = QuaternionTools.Multiply(qRefQuaternion, HeadtrackerListener.getInstance().HTREFERENCE);
    //     qRefQuaternion = QuaternionTools.Normalize(qRefQuaternion);

    //     // Three.js Rotate 3D model
    //     this.ht_rotategfx(qRefQuaternion)
    // }

    private resetSliders() {
        (Tool.$dom("inputRangeX") as any).value = 0;
        (Tool.$dom("inputRangeY") as any).value = 0;
        (Tool.$dom("inputRangeZ") as any).value = 0;
    }

    private setLocalReferencePoint = () => {
        if (this.LIVEHTREF !== null) {
            const LIVEHTREFSAVE = this.LIVEHTREF;
            console.dir(LIVEHTREFSAVE);

            const HTREFRAW_W = parseFloat(LIVEHTREFSAVE[0]) || 0;
            const HTREFRAW_X = parseFloat(LIVEHTREFSAVE[1]) || 0;
            const HTREFRAW_Y = parseFloat(LIVEHTREFSAVE[2]) || 0;
            const HTREFRAW_Z = parseFloat(LIVEHTREFSAVE[3]) || 0;

            this.resetSliders();

            let REF = HeadtrackerListener.getInstance().HTREFERENCE;
            REF.store(QuaternionTools.conjugate(HTREFRAW_W, HTREFRAW_X, HTREFRAW_Y, HTREFRAW_Z));
            console.log("Saving reference input: ", REF);

            // Animate the current if there is only manual control
            this.rotateGraphics(QuaternionTools.multiply(this.LIVEHTREF, REF));

            var event = new CustomEvent("htsetreference", { detail: { htReference: true } });
            window.dispatchEvent(event);

            Tool.$attr("status-ht-reference", `${REF["wref"]} ${REF["xref"]} ${REF["yref"]} ${REF["zref"]}`);
        } else {
            console.log("Could not set reference no input available.")
        }
    }

    private resetLocalReferencePoint = () => {
        console.log("Reset HT-Ref")
        let REF = HeadtrackerListener.getInstance().HTREFERENCE;
        REF.reset();
        // REF = { wref: null, xref: null, yref: null, zref: null, status: false }

        // Draw new if it's manual control
        if (this.LIVEHTREF) {
            this.rotateGraphics(QuaternionTools.multiply(this.LIVEHTREF, REF));
        }

        var event = new CustomEvent("htsetreference", { detail: { htReference: false } });
        window.dispatchEvent(event);
        Tool.$attr("status-ht-reference", "");
        return false
    }
}
