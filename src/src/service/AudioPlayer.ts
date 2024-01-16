// import * as audioSources from "../content/soundlinks.json";
import Tool from '../utils/Tools';
import Sound from "../models/Sound";
import ArrayUtil from "../utils/ArrayUtil";
import Events from "../utils/Events";
// import Omnitone from 'omnitone/build/omnitone.min.esm.js';
import Omnitone from "../custom-build/omnitone.esm.js";
import NumberUtil from "../utils/NumberUtil";
import { AudioRoute, AudioTemplateRoute } from "./AudioTemplateRoute";
import { AudioMatrixRoute } from "./AudioMatrixRoute";
import DOMUtil from "../utils/DOMUtil";
import AudioFileDrop from "./AudioFileDrop";
import { getFetching } from '../utils/FetcherUtil';
import OmnitoneFOAHrirMagLsBase64 from '../hrirs/omnitone-foa-hrir-magls-base64';
import OmnitoneSOAHrirMagLsBase64 from '../hrirs/omnitone-soa-hrir-magls-base64';
import OmnitoneTOAHrirMagLsBase64 from '../hrirs/omnitone-toa-hrir-magls-base64';
import { AudioHRIR, AudioHRIR_ToText } from './AudioHRIR';

export default class AudioPlayer {

    private event: Events = new Events();

    public audioContext: AudioContext;
    public links: Sound[];

    private audioRouteOutput: AudioMatrixRoute;

    private audioElement: HTMLVideoElement;
    private audioInputGain: GainNode;
    private audioElementSource: MediaElementAudioSourceNode;

    private ambisonicOrderNum: number = 2;
    private ambisonicMethod: AudioHRIR = AudioHRIR.magls;
    private rotationMtx3: any;

    private decoderFOA: any;
    private decoderSOA: any;
    private decoderTOA: any;

    private magDecoderFOA: any;
    private magDecoderSOA: any;
    private magDecoderTOA: any;

    private static instance: AudioPlayer;
    public static getInstance(): AudioPlayer {
        if (AudioPlayer.instance == null) {
            AudioPlayer.instance = new AudioPlayer();
        }
        return AudioPlayer.instance;
    }

    private constructor() {

        this.audioRouteOutput = new AudioMatrixRoute();
        this.audioRouteOutput.onRouteChange = this.onAudioRouteChange;

        this.initiate();
    }

    private async initiate() {
        const self = this;

        // Add audio files to list
        const selectListOfAudioFiles = Tool.$dom("inputSelectAudioFile");
        const itt = Tool.$dom("audio-dropdown-list");

        try {
            const audioSources = await getFetching<Sound[]>("/sounds.json");
            this.links = ArrayUtil.toArray<Sound>(audioSources).map((x) => new Sound(x));

            this.links.forEach((audio: Sound) => {
                if (audio.path == '') {
                    return;
                }
                let option = document.createElement("option");
                option.setAttribute("id", `R-${audio.file}`);
                option.setAttribute("value", `./${audio.path}/${audio.file}`);
                option.setAttribute(`data-routing`, audio.routing);
                option.setAttribute(`data-order`, audio.ambiorder);
                option.text = audio.file;
                selectListOfAudioFiles.appendChild(option);

                let liitem = document.createElement("li");
                liitem.setAttribute("id", `R-${audio.file}`);
                liitem.dataset.link = `./${audio.path}/${audio.file}`;
                liitem.setAttribute(`data-routing`, audio.routing);
                liitem.setAttribute(`data-order`, audio.ambiorder);
                liitem.innerHTML = `<span class="item-title">${audio.file}</span> <span class="item-size">${audio.size ? audio.size : ''}</span> <span class="item-format">${audio.format ? audio.format : ''}</span> <span class="item-license">${audio.license ? audio.license : ''}</span>`;
                itt.appendChild(liitem);
            });
            console.log(this.links, audioSources);
        } catch(error) {
            console.log(`Error parsing soundfiles`, error);
            throw new Error(error);
        }

        // Create an AudioContext
        this.audioContext = new AudioContext();

        // 1. Prepare audio element to feed the ambisonic source audio feed.
        this.audioElement = document.createElement("video"); //document.getElementById("audio-player") as HTMLAudioElement;
        this.audioElement.loop = true;
        this.audioElement.crossOrigin = "anonymous";
        this.audioElement.src = this.links.length !== 0 ? `./${this.links[0].path}/${this.links[0].file}` : "";
        this.audioElement.volume = 1;
        this.audioElement.controls = true;
        this.audioElement.preload = "auto";

        this.audioElement.ontimeupdate = function(event) {
            let track = event.target as HTMLAudioElement;
            let currTime = Math.floor(track.currentTime).toString();
            let duration = Math.floor(track.duration).toString();

            if (Number.isNaN(track.duration)) {
                Tool.$attr("status-audio-timer", `0/0`);
            } else {
                Tool.$attr("status-audio-timer", `${currTime}/${duration}`);
            }
        }

        this.audioElement.onloadedmetadata = function() {
            // self.audioElement.setAttribute("duration", self.audioElement.duration.toString());

            let currTime = Math.floor(self.audioElement.currentTime);
            let duration = Math.floor(self.audioElement.duration);
            if (Number.isNaN(self.audioElement.duration)) {
                Tool.$attr("status-audio-timer", `0/0`);
            } else {
                Tool.$attr("status-audio-timer", `${currTime}/${duration}`);
            }
        }

        this.audioElement.onplay = function() {
            console.log("ON PLAY");
            window.dispatchEvent( new CustomEvent("htsetreference", { detail: { audioPlaying: true } }) )
        }

        this.audioElement.onpause = function() {
            console.log("ON PAUSE");
            window.dispatchEvent( new CustomEvent("htsetreference", { detail: { audioPlaying: false } }) )
        }

        this.audioElement.onended = function() {
            console.log("ON ENDED");
            window.dispatchEvent( new CustomEvent("htsetreference", { detail: { audioPlaying: false } }) )
        }

        console.log({ element: this.audioElement });

        document.getElementById("audioPlayerContainer").append(this.audioElement);

        // 2. Create media element source
        this.audioElementSource = this.audioContext.createMediaElementSource(this.audioElement);

        // 3. Create gain node
        this.audioInputGain = this.audioContext.createGain();
        this.audioElementSource.connect(this.audioInputGain);

        // 4. Create the audio routing
        // this.splitter = this.audioContext.createChannelSplitter(this.audioRouteOutput.outputs);
        // this.audioInputGain.connect(this.splitter);
        // this.merger = this.audioContext.createChannelMerger(this.audioRouteOutput.inputs);

        // 4.a Creates First Order Ambisonic Decoder (Google HRIR)
        this.decoderFOA = Omnitone.createFOARenderer(this.audioContext, {
            ambisonicOrder: 1,
            // The example audio is in the FuMa ordering (W,X,Y,Z). So remap the channels to the ACN format.
            // // : [0, 3, 1, 2]
        });
        this.decoderFOA.initialize().then(() => {
            (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).disabled = false;
            (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).disabled = false;
            let state = this.ambisonicOrderNum === 0 && this.ambisonicMethod === AudioHRIR.google ? "ambisonic" : "off";
            this.decoderFOA.setRenderingMode(state);
            // Swap left and right channel
            this.swapStereoChannels(this.decoderFOA);
            // Enable this to play out as it is
            // this.decoderFOA.output.connect(this.audioContext.destination);
        },
        function (onInitializationError) {
            console.error(onInitializationError);
        });

        // MagLS HRIR
        this.magDecoderFOA = Omnitone.createFOARenderer(this.audioContext, {
            hrirBufferList: OmnitoneFOAHrirMagLsBase64,
            ambisonicOrder: 1,
        });
        this.magDecoderFOA.initialize().then(() => {
            (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).disabled = false;
            (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).disabled = false;
            let state = this.ambisonicOrderNum === 0 && this.ambisonicMethod === AudioHRIR.magls ? "ambisonic" : "off";
            this.magDecoderFOA.setRenderingMode(state);
            // Swap left and right channel
            this.swapStereoChannels(this.magDecoderFOA);
            // Enable this to play out as it is
            // this.magDecoderFOA.output.connect(this.audioContext.destination);
        },
        function (onInitializationError) {
            console.error(onInitializationError);
        });

        // 4.b Creates Second Order Ambisonic Decoder (Google HRIR)
        this.decoderSOA = Omnitone.createHOARenderer(this.audioContext, {
            ambisonicOrder: 2,
        });
        // The example audio is in the FuMa ordering (W,X,Y,Z). So remap the channels to the ACN format.
        // channelMap: [0, 3, 1, 2]
        this.decoderSOA.initialize().then(() => {
            (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).disabled = false;
            (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).disabled = false;
            let state = this.ambisonicOrderNum === 1 && this.ambisonicMethod === AudioHRIR.google ? "ambisonic" : "off";
            this.decoderSOA.setRenderingMode(state);
            // Swap left and right channel
            this.swapStereoChannels(this.decoderSOA);
            // Enable this to play out as it is
            // this.decoderSOA.output.connect(this.audioContext.destination);
        },
        function (onInitializationError) {
            console.error(onInitializationError);
        });

        // MagLS HRIR
        this.magDecoderSOA = Omnitone.createHOARenderer(this.audioContext, {
            hrirBufferList: OmnitoneSOAHrirMagLsBase64,
            ambisonicOrder: 2,
        });
        this.magDecoderSOA.initialize().then(() => {
            (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).disabled = false;
            (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).disabled = false;
            let state = this.ambisonicOrderNum === 1 && this.ambisonicMethod === AudioHRIR.magls ? "ambisonic" : "off";
            this.magDecoderSOA.setRenderingMode(state);
            // Swap left and right channel
            this.swapStereoChannels(this.magDecoderSOA);
            // Enable this to play out as it is
            // this.magDecoderSOA.output.connect(this.audioContext.destination);
        },
        function (onInitializationError) {
            console.error(onInitializationError);
        });

        // 4.c Creates Third Order Ambisonic Decoder (Google HRIR)
        this.decoderTOA = Omnitone.createHOARenderer(this.audioContext, {
            ambisonicOrder: 3,
        });
        this.decoderTOA.initialize().then(() => {
            (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).disabled = false;
            (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).disabled = false;
            let state = this.ambisonicOrderNum === 2 && this.ambisonicMethod === AudioHRIR.google ? "ambisonic" : "off";
            this.decoderTOA.setRenderingMode(state);
            // Swap left and right channel
            this.swapStereoChannels(this.decoderTOA);
            // Enable this to play out as it is
            // this.decoderTOA.output.connect(this.audioContext.destination);
        },
        function (onInitializationError) {
            console.error(onInitializationError);
        });

        // MagLS HRIR
        this.magDecoderTOA = Omnitone.createHOARenderer(this.audioContext, {
            hrirBufferList: OmnitoneTOAHrirMagLsBase64,
            ambisonicOrder: 3,
        });
        this.magDecoderTOA.initialize().then(() => {
            (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).disabled = false;
            (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).disabled = false;
            let state = this.ambisonicOrderNum === 2 && this.ambisonicMethod === AudioHRIR.magls ? "ambisonic" : "off";
            this.magDecoderTOA.setRenderingMode(state);
            // Swap left and right channel
            this.swapStereoChannels(this.magDecoderTOA);
            // Enable this to play out as it is
            // this.magDecoderTOA.output.connect(this.audioContext.destination);
        },
        function (onInitializationError) {
            console.error(onInitializationError);
        });

        // Rotate the sound field.
        //decoder.setRotationMatrix(rotationMatrix);

        // Mono or regular multi-channel layouts.
        //decoder.setMode('bypass');

        // Ambisonically decoded audio stream.
        //decoder.setMode('ambisonic');

        // Disable encoding completely. (audio processing disabled)
        //decoder.setMode('off');

        // Creates FOA Rotator to use directly with more functions
        // var rotator = Omnitone.createFOARotator(this.audioContext);

        // console.log({ rotator: rotator });

        // ========
        // Add audio file drop and selector
        Tool.$dom("inputCustomAudioFile").onchange = function(this: HTMLInputElement) {
            console.log("Input custom file: ", this.files[0]);
            let file = this.files[0];
            if (file.type.match("audio.*")) {
                document.getElementById("txtLoadedAudioFile").innerText = `${file.name} (${file.type})`;
                self.audioElement.src = window.URL.createObjectURL(file);
            } else {
                alert("Not an audio file");
                return;
            }
        };

        Tool.$dom("inputCustomAudioLink").onchange = function(this: HTMLInputElement) {
            console.log("Input custom link: ", this.value);
            self.audioElement.src = window.URL.createObjectURL(this.value as any);
        };

        Tool.$dom("inputSelectAudioFile").onchange = function(this: HTMLInputElement) {
            console.log("Loading selected item: ", this.value);
            console.log({ elem: self.audioElement })
            if ("src" in (self.audioElement as HTMLAudioElement)) {
                self.audioElement.src = this.value; //const mediaSource = new MediaSource();
            } else {
                // Avoid using this in new browsers, as it is going away.
                self.audioElement.src = window.URL.createObjectURL(this.value as any);
            }
        };

        Tool.$event("audio-dropdown-list", "click", function(event) {
            console.log("Loading selected item: ", { ev: event.target.dataset });
            console.log({ elem: self.audioElement });

            if (event.target.dataset.link === undefined || event.target.dataset.link === "") {
                console.warn("Link is undefined, not loading target");
                return;
            }

            // Verify if it's currently playing
            if (self.audioElement && !self.audioElement.paused) {
                self.toggleAudioPlayback(null);
            }

            const links = document.querySelectorAll("[data-link]");
            Array.from(links).forEach((element) => {
                element.classList.remove("selected");
            });

            event.target.classList.add("selected");

            if ("src" in (self.audioElement as HTMLAudioElement)) {
                self.audioElement.src = event.target.dataset.link; //const mediaSource = new MediaSource();
            } else {
                // Avoid using this in new browsers, as it is going away.
                self.audioElement.src = window.URL.createObjectURL(event.target.dataset.link);
            }

            const template = event.target.dataset.routing;
            if (template && template !== undefined && template !== "") {
                console.log(`Audio matrix template selected '${template}'`);
                self.audioRouteOutput.select(AudioTemplateRoute[template]);
                self.generateChannelSelector();
            }

            const order = event.target.dataset.order;
            if (order && order !== undefined && order !== "") {
                console.log(`Audio ambisonic order selected '${order}'`);
                if (order === "F" || order == "first") {
                    self.selectFirstOrderAmbisonic();
                } else if (order === "S" || order == "second") {
                    self.selectSecondOrderAmbisonic();
                } else if (order === "T" || order == "third") {
                    self.selectThirdOrderAmbisonic();
                }
            }
        });

        // Audio drop
        const drop = new AudioFileDrop();
        drop.register((source: string) => {
            this.audioElement.src = source;
        });

        // Audio playback controls
        Tool.$event("btnToggleAudioPlayback", "click", this.toggleAudioPlayback);
        Tool.$event("btnToggleAudioPlayer", "click", this.toggleAudioPlayback);

        // Change Ambisonic decoder
        Tool.$dom("status-ambisonic-order").innerText = "3rd order";
        Tool.$event("btnToggleAmbisonicDecoderOrder", "click", this.toggleAmbisonicOrder);

        // Setting Headtrack reference
        Tool.$event(window, "htsetreference", (e: any) => {

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

                if (e.detail.hasOwnProperty("audioPlaying")) { // TODO: working????
                    if (item.dataset.key === "audio-play-button-icon") {
                        if (e.detail.audioPlaying) {
                            item.classList.add('ht-custom-btn--audio--playing');
                        } else {
                            item.classList.remove('ht-custom-btn--audio--playing');
                        }
                    }

                    if (item.dataset.key === "audio-play-button") {
                        if (e.detail.audioPlaying) {
                            item.textContent = 'Pause';
                        } else {
                            item.textContent = 'Play';
                        }
                    }
                }
            });
        });

        this.generateChannelSelector();

        // Bind events to channel matrix selector
        Tool.$event("channel-selector", "click", (event: any) => {
            if (event.target.type == "radio") {
                event.stopPropagation();
                const target = event.target;

                let split = target.value.split("x"); // format: output x input
                try {
                    console.log(`Route input ${parseInt(split[1])} =>  to output ${parseInt(split[0])} (${this.audioRouteOutput.getInput(parseInt(split[0]))})`)
                    this.audioRouteOutput.setInput(parseInt(split[0]), parseInt(split[1]));
                    console.log("Pappa, kopiera denna!", this.audioRouteOutput.current);
                } catch(error) {
                    console.error(error);
                }
                // this.getCurrentDecoder.input.disconnect();
                // this.audioContext.resume();
                // this.audioElement.play();
                this.mergeChannels();
            }
        });

        // Bind events to HRIR buttons
        Tool.$dom("status-hrir").innerText = AudioHRIR_ToText(this.ambisonicMethod);
        const hrirBtn = document.querySelectorAll("[data-hrir]");
        console.log("HRIR buttons:", hrirBtn);
        Array.from(hrirBtn).forEach((element) => {
            Tool.$event(element, "click", (event) => {
                const action = event.target.dataset.hrir;
                if (action) {
                    console.log(`Audio HRIR '${action}'`);

                    this.setHRIR(AudioHRIR[action]);
                }
            });
        });

        // Bind events to template buttons
        const templateBtn = document.querySelectorAll("[data-template]");
        console.log("Template buttons:", templateBtn);
        Array.from(templateBtn).forEach((element) => {
            Tool.$event(element, "click", (event) => {
                const action = event.target.dataset.template;
                if (action) {
                    console.log(`Audio matrix template '${action}'`);
                    this.audioRouteOutput.select(AudioTemplateRoute[action]);
                    this.generateChannelSelector();
                }
            });
        });

        // Bind the gain level
        const gainTemplateBtn = document.querySelectorAll("[data-input-gain]");
        console.log("Gain template buttons:", gainTemplateBtn);
        Array.from(gainTemplateBtn).forEach((element) => {
            Tool.$event(element, "click", (event) => {
                const action = event.target.dataset.inputGain as number;
                if (action) {
                    let dat = NumberUtil.decibelToGain(action);
                    this.audioInputGain.gain.value = dat;
                    console.log(`Audio gain template '${action}'dB => ${dat}`);
                    Tool.$attr("audio-gain-level", `${action}dB`);
                    this.onAudioGainChanged(action);
                }
            });
        });
    }

    /**
     * Called when a new gain value is set
     * @param gain [number] level
     */
    private onAudioGainChanged = (gain: number) => {
        console.log(`Audio Gain '${gain}'`);
        const allBtns = document.querySelectorAll(`button.gain`);
        if (allBtns) {
            allBtns.forEach((el: HTMLButtonElement) => {
                el.classList.remove('selected')
                if (el.dataset.inputGain === gain.toString()) {
                    el.classList.add('selected');
                }
            });
        }
    };

    /**
     * Called when a new routing is made in the Audio Matrix
     * @param template [string] name
     * @param route [array] list with input output routing
     */
    private onAudioRouteChange = (template: AudioTemplateRoute, route: AudioRoute) => {
        console.log(`Audio matrix template '${template}' routed`);
        const allBtns = document.querySelectorAll(`button.template`);
        if (allBtns) {
            allBtns.forEach((el: HTMLButtonElement) => {
                el.classList.remove('selected')
                if (el.dataset.template === template) {
                    el.classList.add('selected');
                }
            });
        }
    };

    /**
     * Called when a new ambisonic HRIR method is choosen
     * @param method [string] name
     */
    private onFilterMethodChange = (method: AudioHRIR) => {
        console.log(`Audio HRIR method '${method}'`);
        const allBtns = document.querySelectorAll(`button.hrir`);
        if (allBtns) {
            allBtns.forEach((el: HTMLButtonElement) => {
                el.classList.remove('selected')
                if (el.dataset.hrir === method) {
                    el.classList.add('selected');
                }
            });
        }
    };

    /**
     * Create the matrix routing DOM-view
     */
    private generateChannelSelector = () => {
        let group = document.createDocumentFragment();

        for (let y = 0; y < this.audioRouteOutput.inputs + 1; y++) {
            // inputs
            let frg = document.createDocumentFragment();
            let row = document.createElement("DIV");
            let input = document.createElement("DIV");
            input.textContent = ( y == this.audioRouteOutput.inputs ? `silent` : `in ${y}` );
            row.className = "ch-row";
            row.append(input);

            let inputValue = ( y == this.audioRouteOutput.inputs ? -1 : y );
            // console.log(inputValue);

            for (let x = 0; x < this.audioRouteOutput.outputs; x++) {
                // outputs
                let label = document.createElement("LABEL");
                label.className = ( y == this.audioRouteOutput.inputs ? "ch-label silent" : "ch-label" );
                label.setAttribute("for", `crosspoint-${x}x${inputValue}`);

                let crosspoint = document.createElement("input");
                crosspoint.setAttribute("type", "radio");
                crosspoint.setAttribute("name", `output-${x}`);
                crosspoint.setAttribute("value", `${x}x${inputValue}`);
                crosspoint.setAttribute("data-input", `${inputValue}`);
                crosspoint.setAttribute("data-output", `${x}`);
                crosspoint.id = `crosspoint-${x}x${inputValue}`;

                if ( this.audioRouteOutput.getInput(x) == inputValue ) {
                    crosspoint.setAttribute("checked", "checked");
                }
                row.append(crosspoint);
                row.append(label);
            }
            frg.append(row);
            group.append(frg);
        }

        let row = document.createElement("DIV");
        row.className = "ch-row";

        let title = document.createElement("DIV");
        title.textContent = `outputs `;
        row.append(title);

        for (let x = 0; x < this.audioRouteOutput.channels(); x++) {
            let output = document.createElement("DIV");
            output.textContent = `${x}`; // `${x+1}`;
            row.append(output);
        }
        group.append(row);

        const container = Tool.$dom("channel-selector");
        DOMUtil.removeAllChildNodes(container);
        container.appendChild(group);

        this.mergeChannels();
    }

    private swapStereoChannels = (decoder: any) => {
        const splitterChSwap = this.audioContext.createChannelSplitter(2);
        const mergerChSwap = this.audioContext.createChannelMerger(2);
        // connect the merger to the destination
        mergerChSwap.connect(this.audioContext.destination);
        decoder.output.connect(splitterChSwap);
        splitterChSwap.connect(mergerChSwap, 1, 0);
        splitterChSwap.connect(mergerChSwap, 0, 1);
    }

    private lastSplitter: any = null;

    /**
     * Creates a channel splitter, reroutes and channel merger
     */
    mergeChannels() {
        try {
            //this.audioElementSource.connect(splitter); // mediaElemSource is video or audio element
            if (this.lastSplitter !== null) {
                this.audioInputGain.disconnect(this.lastSplitter);
                this.lastSplitter = null;
            }

            const splitter = this.audioContext.createChannelSplitter(this.audioRouteOutput.outputs); // out 10
            this.lastSplitter = splitter;
            this.audioInputGain.connect(splitter);
            const merger = this.audioContext.createChannelMerger(this.audioRouteOutput.inputs); // inouts 9

            console.log("================================================");
            console.log("Splitter    : nr of input", splitter.numberOfInputs, "= 1 nr of out:", splitter.numberOfOutputs, "= 16");
            console.log("Merger      : nr of input ", merger.numberOfInputs, "= 16 nr of out:", merger.numberOfOutputs, "= 1");
            console.log("Route output:", this.audioRouteOutput);
            const routeLog = [];
            this.audioRouteOutput.current.forEach((input, outIndex) => {
                // node, output , input

                // CurrentAudioNode.connect(DestinationNode, OutputNumber, InputNumber)
                // DestinationNode = The AudioNode or AudioParam to which to connect.
                // OutputNumber = An index specifying which output of the current AudioNode to connect to the destination. The index numbers are defined according to the number of output channels (see Audio channels).
                // InputNumber = An index describing which input of the destination you want to connect the current AudioNode to; the default is 0. The index numbers are defined according to the number of input channels (see Audio channels).
                if (input != -1) {
                    // Combine the output of each input 'splitter' node back into one stream using the merger.
                    splitter.connect(merger, input, outIndex); // --------- xxx yes
                    routeLog.push(`input ${input+1} => ${outIndex+1}`);
                } else {
                    // Create dummy silent node and connect it
                    const silence = this.audioContext.createBufferSource();
                    const volume = this.audioContext.createGain();
                    volume.gain.value = 1;
                    silence.connect(volume);
                    volume.connect(merger, 0, outIndex);
                    silence.start(0);
                    // console.log("Silence ch count:", silence.channelCount, ",in=", silence.numberOfInputs, "out=", silence.numberOfOutputs);

                    // const source3 = this.audioContext.createOscillator();
                    // source3.frequency.value = 440;
                    // const volume = this.audioContext.createGain();
                    // volume.gain.value = -1;
                    // source3.connect(volume);
                    // volume.connect(merger, 0, outIndex);
                    // source3.start(0);

                    // splitter.connect(merger, outIndex, this.audioRouteOutput.outputs - 1);
                    routeLog.push(`input ${this.audioRouteOutput.outputs} => ${outIndex+1} (fake silent input)`);
                }
            });
            console.log("Route       :\n\t\t\t\t" + routeLog.join("\n\t\t\t\t"));
            console.log("Splitter    :", splitter);
            console.log("Merger      :", merger);
            console.log("Gain        :", this.audioInputGain);
            console.log("Decoder in  :", this.getCurrentDecoder.input);
            console.log("Decoder out :", this.getCurrentDecoder.output);

            // Out from Omnitone decoder, send to audio context
            merger.connect(this.getCurrentDecoder.input);



            // inputGain.connect(soaRenderer.input);
            // inputGain.connect(toaRenderer.input);
            // soaRenderer.output.connect(audioContext.destination);
            // toaRenderer.output.connect(audioContext.destination);

            // const splitter2 = this.audioContext.createChannelSplitter(2);
            // const merger2 = this.audioContext.createChannelMerger(2);
            // // connect the merger to the destination now.
            // merger2.connect(this.audioContext.destination);

            // // Gain node to control the volume of each channel.
            // // const gainL = this.audioContext.createGain();
            // // const gainR = this.audioContext.createGain();

            // this.getCurrentDecoder.input.connect(splitter2);

            // // audioSource is split into its separate channels.  For each channel connect
            // // a different gain node so we can control the volume independently.
            // splitter2.connect(merger2, 0, 0);
            // splitter2.connect(merger2, 1, 0);

            // Combine the output of each gain node back into one stream using the merger.
            // gainL.connect(merger2, 0, 0);
            // gainR.connect(merger2, 0, 1);

            // Set the gain values for the left and right channels as desired.
            // gainL.gain.value = 1;
            // gainR.gain.value = 1;

            console.log(`AudioContext state '${this.audioContext.state}'`)

        } catch(error) {
            console.error(error);
        }
    }

    setHRIR(filter: AudioHRIR) {
        this.ambisonicMethod = filter;

        if (this.ambisonicOrderNum === 2) {
            this.selectThirdOrderAmbisonic();
        } else if (this.ambisonicOrderNum === 1) {
            this.selectSecondOrderAmbisonic();
        } else {
            this.selectFirstOrderAmbisonic();
        }

        this.onFilterMethodChange(filter);
    }

    toggleAmbisonicOrder = (event) => {
        this.ambisonicOrderNum = (this.ambisonicOrderNum+1)%3;
        if (this.ambisonicOrderNum === 2) {
            this.selectThirdOrderAmbisonic();
        } else if (this.ambisonicOrderNum === 1) {
            this.selectSecondOrderAmbisonic();
        } else {
            this.selectFirstOrderAmbisonic();
        }
    }

    resetAllAmbisonicDecoder = () => {
        this.decoderFOA.setRenderingMode("off");
        this.decoderSOA.setRenderingMode("off");
        this.decoderTOA.setRenderingMode("off");

        this.magDecoderFOA.setRenderingMode("off");
        this.magDecoderSOA.setRenderingMode("off");
        this.magDecoderTOA.setRenderingMode("off");
    }

    selectFirstOrderAmbisonic = () => {
        this.ambisonicOrderNum = 0;
        Tool.$dom("status-ambisonic-order").innerText = "1st order";
        Tool.$dom("status-hrir").innerText = AudioHRIR_ToText(this.ambisonicMethod);
        this.resetAllAmbisonicDecoder();
        if (this.ambisonicMethod === AudioHRIR.google) {
            this.decoderFOA.setRenderingMode("ambisonic");
        } else {
            this.magDecoderFOA.setRenderingMode("ambisonic");
        }
        this.mergeChannels();
        if (this.rotationMtx3) {
            this.rotateSoundField(this.rotationMtx3);
        }
    }

    selectSecondOrderAmbisonic = () => {
        this.ambisonicOrderNum = 1;
        Tool.$dom("status-ambisonic-order").innerText = "2nd order";
        Tool.$dom("status-hrir").innerText = AudioHRIR_ToText(this.ambisonicMethod);
        this.resetAllAmbisonicDecoder();
        if (this.ambisonicMethod === AudioHRIR.google) {
            this.decoderSOA.setRenderingMode("ambisonic");
        } else {
            this.magDecoderSOA.setRenderingMode("ambisonic");
        }
        this.mergeChannels();
        if (this.rotationMtx3) {
            this.rotateSoundField(this.rotationMtx3);
        }
    }

    selectThirdOrderAmbisonic = () => {
        this.ambisonicOrderNum = 2;
        document.getElementById("status-ambisonic-order").innerText = "3rd order";
        Tool.$dom("status-hrir").innerText = AudioHRIR_ToText(this.ambisonicMethod);
        this.resetAllAmbisonicDecoder();
        if (this.ambisonicMethod === AudioHRIR.google) {
            this.decoderTOA.setRenderingMode("ambisonic");
        } else {
            this.magDecoderTOA.setRenderingMode("ambisonic");
        }
        this.mergeChannels();
        if (this.rotationMtx3) {
            this.rotateSoundField(this.rotationMtx3);
        }
    }

    toggleAudioPlayback = (event) => {

        this.mergeChannels();
        try {
            if (this.audioElement.paused && this.audioElement.currentTime >= 0 && !this.audioElement.ended) {
                this.audioContext.resume();
                this.audioElement.play();
                window.dispatchEvent( new CustomEvent("htsetreference", { detail: { audioPlaying: true } }) )
            } else {
                window.dispatchEvent( new CustomEvent("htsetreference", { detail: { audioPlaying: false } }) )
                this.audioElement.pause();
            }

            if (this.audioElement.paused) {
                (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).textContent = "Play";
                (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).textContent = "Play";
            } else {
                (Tool.$dom("btnToggleAudioPlayback") as HTMLButtonElement).textContent = "Pause";
                (Tool.$dom("btnToggleAudioPlayer") as HTMLButtonElement).textContent = "Pause";
            }

        } catch(error) {
            console.error(error);
        }
    }

    private get getCurrentDecoder() {
        if (this.ambisonicOrderNum == 2) {
            return this.ambisonicMethod === AudioHRIR.google ? this.decoderTOA : this.magDecoderTOA;
        } else if (this.ambisonicOrderNum == 1) {
            return this.ambisonicMethod === AudioHRIR.google ? this.decoderSOA : this.magDecoderSOA;
        } else {
            return this.ambisonicMethod === AudioHRIR.google ? this.decoderFOA : this.magDecoderFOA;
        }
    }

    /**
     * Omnitone uses 3x3 (column-major matrix) to rotate the sound field.
     * @param mtx3 3x3 row major matrix
     * @param euler null
     */
    rotateSoundField(mtx3: any, euler: any = null) {
        this.getCurrentDecoder.setRotationMatrix3(mtx3);
        this.rotationMtx3 = mtx3;
    }

}