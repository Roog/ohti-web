import { QuarternionReference } from "../models/QuaternionReference";
import Events from "../utils/Events";
import QuaternionTools from "../utils/QuaternionTools";
import AnimationView from "./Animation";
import AspNetCoreHubListener from "./NetCoreHubListener";
import AudioPlayer from "./AudioPlayer";

export default class HeadtrackerListener extends AspNetCoreHubListener {

    private event: Events = new Events();

    public connectionOpenEventType: string = "local-headtracker";
    public path: string;
    public HTREFERENCE: QuarternionReference = new QuarternionReference();

    private static instance: HeadtrackerListener;
    public static getInstance(): HeadtrackerListener {
        if (HeadtrackerListener.instance == null) {
            HeadtrackerListener.instance = new HeadtrackerListener();
        }
        return HeadtrackerListener.instance;
    }

    private constructor() {
        super("http://localhost:5000", "apiHub");

        // On connection get states
        this.onConnected = () => {
            console.info("HeadtrackerListener connected");
        };

        this.onDisconnected = () => {
            console.info("HeadtrackerListener disconnected");
        };

        // Recieve Headtracking data
        this.addHubEventListener("HeadtrackerEvent", function(address, w, x, y, z) {
            console.log("received event", address);
            // Add new reference plane
            let qRefComp = QuaternionTools.multiply([w, x, y, z], this.HTREFERENCE);
            qRefComp = QuaternionTools.normalize(qRefComp);

            // Quaternion to Matrix
            // Omnitone rotate soundfield with Matrix
            // Ambisonics.js rotate soundfield with Euler
            let qMtx = QuaternionTools.quaternionToMatrix(qRefComp);
            const rowor_to_col = QuaternionTools.rowToColumnMajor(qMtx);
            AudioPlayer.getInstance().rotateSoundField(rowor_to_col, null);

            // Three.js Rotate 3D model
            requestAnimationFrame(function() {
                AnimationView.getInstance().rotateGraphics(qRefComp)
            });

            AnimationView.getInstance().LIVEHTREF = [w, x, y, z];
        });

        // Start connection
        this.startConnection().then(() => {
            //
        }).catch((error: any) => {
            console.error(error);
        });
    }
}
