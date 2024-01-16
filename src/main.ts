import AnimationView from "./service/Animation";
import AudioPlayer from "./service/AudioPlayer";
import HeadtrackerListener from "./service/HeadtrackerListener";
import Events from "./utils/Events";
import Tool from './utils/Tools';

export class Application {
    private listener: HeadtrackerListener;
    private audio: AudioPlayer;
    private animation: AnimationView;

    private event: Events = new Events();

    constructor() {
        console.log("Initiated application");

        Tool.$event("startSession", "click", () => {
            document.getElementById("startSessionCover").style.display = "none";

            // Headtracker socket listener
            this.listener = HeadtrackerListener.getInstance();

            // Audioplayer
            this.audio = AudioPlayer.getInstance();

            // 3D Animation
            this.animation = AnimationView.getInstance();
        });
    }
}

export default class Main {
    public static load() {
        console.log("Initiated main");
        const app = new Application();
    }
}

Main.load();
