import Sound from "../models/Sound";
import ArrayUtil from "../utils/ArrayUtil";
import $d from "../utils/dom-util";
import AudioPlayer from "./AudioPlayer";
import AudioPlayerAmbisonics from "./AudioPlayerAmbisonics";
import Tool from '../utils/Tools';
import * as audioSources from "../content/soundlinks.json";

export default class AudioPlayerView {
    private model: AudioPlayerAmbisonics | AudioPlayer;

    constructor(model: AudioPlayerAmbisonics | AudioPlayer) {
        this.model = model;

        this.setupListeners();

        //this.generateAudioFileList();

        this.fetchAudioList();
    }

    private fetchAudioList() {
        console.log("######");
        fetch("static/mediafiles.json").then((data) => data.json()).then((result) => {
            console.error("=============")
            console.log(result);
            this.generateFileList(result);
        }).catch((error) => {
            console.error(error);
        });
    }

    private setupListeners() {

        // Audio playback controls
        $d.event("btnToggleAudioPlayback", "click", this.model.toggleAudioPlayback);
        $d.event("btnToggleAudioPlayer", "click", this.model.toggleAudioPlayback);

        $d.event("play", "click", this.model.playAudio);
        $d.event("stop", "click", this.model.stopAudio);

        // Change Ambisonic decoder
        $d.om("status-ambisonic-order").innerText = "3rd order";
        $d.event("btnToggleAmbisonicDecoderOrder", "click", this.model.toggleAmbisonicOrder);

        // Setting Headtrack reference
        $d.event(window, "htsetreference", (e: any) => {
            let dataset = document.querySelectorAll("[data-key]");
            dataset.forEach(function(item: HTMLElement) {
                if (e.detail.hasOwnProperty("htReference")) {
                    if (item.dataset.key === "audio-set-reference-button-icon") {
                        if (e.detail.htReference) {
                            item.classList.add('ht-custom-btn--reference--on');
                        } else {
                            item.classList.remove('ht-custom-btn--reference--on');
                        }
                    }

                    if (item.dataset.key === "audio-reset-reference-button-icon") {
                        if (e.detail.htReference) {
                            item.classList.remove('ht-custom-btn--reset--on');
                        } else {
                            item.classList.add('ht-custom-btn--reset--on');
                        }
                    }
                }
            });
        });

        $d.event("inputSelectAudioFile", "change", (event) => {
            this.model.inputSelectAudioFile(event.target.value);
        });

        $d.event("inputCustomAudioLink", "change", (event) => {
            this.model.inputSelectAudioFile(event.target.value);
        });

        $d.event("inputCustomAudioFile", "change", (event: any) => {
            const item = (event.target as HTMLInputElement);
            console.log("Input custom file: ", item.files[0]);
            let file = item.files[0];
            if (file.type.match("audio.*")) {
                $d.om("txtLoadedAudioFile").innerText = `${file.name} (${file.type})`;
                this.model.inputSelectAudioFile(file);
            } else {
                alert("Not an audio file");
                return;
            }
        });

        $d.event("audio-dropdown-list", "click", (event: any) => {
            console.log("Loading selected item: ", { ev: event.target.dataset });

            const links = document.querySelectorAll("[data-link]");
            Array.from(links).forEach((element) => {
                element.classList.remove("selected");
            });
            event.target.classList.add("selected");

            this.model.inputSelectAudioFile(event.target.dataset.link);
        });
    }

    private generateFileList(data: any) {
        const selectListOfAudioFiles = $d.om("inputSelectAudioFile");
        const itt = $d.om("audio-dropdown-list");

        this.model.links = ArrayUtil.toArray<Sound>(data).map((x) => Sound.FromMedia(x));
        this.model.links.forEach((audio: Sound) => {
            if (audio.path == '') {
                return;
            }
            let option = document.createElement("option");
            option.setAttribute("id", `R-${audio.file}`);
            option.setAttribute("value", `../${audio.path}/${audio.file}`);
            option.text = audio.displayName;
            selectListOfAudioFiles.appendChild(option);

            let liitem = document.createElement("li");
            liitem.setAttribute("id", `R-${audio.file}`);
            liitem.dataset.link = `../${audio.path}/${audio.file}`;
            liitem.innerHTML = `<span class="item-title">${audio.displayName} ${audio.file}</span> <span class="item-size">${audio.size ? audio.size : ''}</span> <span class="item-format">${audio.format ? audio.format : ''} ${audio.channel_order ? audio.channel_order : ''} = ${audio._order}</span> <span class="item-license">${audio.license ? audio.license : ''}</span>`;
            itt.appendChild(liitem);
        });
        console.log(this.model.links, audioSources)
    }

    private generateAudioFileList() {
        const selectListOfAudioFiles = $d.om("inputSelectAudioFile");
        const itt = $d.om("audio-dropdown-list");

        this.model.links = ArrayUtil.toArray<Sound>(audioSources).map((x) => new Sound(x));
        this.model.links.forEach((audio: Sound) => {
            if (audio.path == '') {
                return;
            }
            let option = document.createElement("option");
            option.setAttribute("id", `R-${audio.file}`);
            option.setAttribute("value", `../${audio.path}/${audio.file}`);
            option.text = audio.file;
            selectListOfAudioFiles.appendChild(option);

            if (audio.path == "sounds-amb8") {
                let liitem = document.createElement("li");
                liitem.setAttribute("id", `R-${audio.file}`);
                liitem.dataset.link = `../${audio.path}/${audio.file}`;
                liitem.innerHTML = `<span class="item-title">${audio.file}</span> <span class="item-size">${audio.size ? audio.size : ''}</span> <span class="item-format">${audio.format ? audio.format : ''}</span> <span class="item-license">${audio.license ? audio.license : ''}</span>`;
                itt.appendChild(liitem);
            }
        });
        console.log(this.model.links, audioSources)
    }

    public setAudioPlaying(isPlaying: boolean) {
        let dataset = document.querySelectorAll("[data-key]");
        dataset.forEach(function(item: HTMLElement) {
            if (item.dataset.key === "audio-play-button-icon") {
                if (isPlaying) {
                    item.classList.add('ht-custom-btn--audio--playing');
                } else {
                    item.classList.remove('ht-custom-btn--audio--playing');
                }
            }

            if (item.dataset.key === "audio-play-button") {
                if (isPlaying) {
                    item.textContent = 'Pause';
                } else {
                    item.textContent = 'Play';
                }
            }
        });

        if (isPlaying) {
            (document.getElementById('play') as HTMLButtonElement).disabled = true;
            (document.getElementById('stop') as HTMLButtonElement).disabled = false;
        } else {
            (document.getElementById('play') as HTMLButtonElement).disabled = false;
            (document.getElementById('stop') as HTMLButtonElement).disabled = true;
        }
    }

    public disablePlayButtons() {
        (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).disabled = true;
        (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).disabled = true;
    }

    public enablePlayButtons() {
        (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).disabled = false;
        (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).disabled = false;
    }

    public setOrder(ambisonicOrderNum: number) {
        if (ambisonicOrderNum == 2) {
            $d.om("status-ambisonic-order").innerText = "3rd order";
        } else if (ambisonicOrderNum == 1) {
            $d.om("status-ambisonic-order").innerText = "2nd order";
        } else {
            $d.om("status-ambisonic-order").innerText = "1st order";
        }
    }

    public setAudioTimer(duration: number, currentTime: any) {
        if (Number.isNaN(duration)) {
            $d.text("status-audio-timer", `0/0`);
        } else {
            $d.text("status-audio-timer", `${Math.floor(currentTime).toString()}/${Math.floor(duration).toString()}`);
        }
    }
}