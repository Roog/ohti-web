import Tool from '../utils/Tools';

export default class AudioFileDrop {

    public onMediaElementDropped: (source: string) => void;

    constructor() {
        const dropzone = Tool.$dom("dropzone");
        dropzone.addEventListener("dragenter", this.handlerDragEnter, false);
        dropzone.addEventListener("dragover", this.handleDragOver, false);
        dropzone.addEventListener("dragleave", this.handlerDragLeave, false);
        dropzone.addEventListener("drop", this.handleFileDrop, false);
    }

    public register(x: (source: string) => void) {
        this.onMediaElementDropped = x;
    }

    private handlerDragEnter = (event) => {
        Tool.$dom("dropzone").style.border = "2px dashed purple";
    }

    private handlerDragLeave = (event) => {
        Tool.$dom("dropzone").style.border = "2px dashed grey";
    }

    private handleFileDrop = (event) => {
        event.stopPropagation();
        event.preventDefault();
        Tool.$dom("dropzone").style.border = "2px dashed green";
        let $fileName = Tool.$dom("droped-file-name");
        $fileName.textContent = `Name: ${event.dataTransfer.files[0].name}`;

        const file = event.dataTransfer.files[0];
        if (!file.type.match("audio.*")||!file.type.match("video.*")) {
            $fileName.textContent = `ERROR! ${file.name} is not a valid audio file.`;
            return;
        } else {
            $fileName.textContent = `Name: ${file.name} (${file.type}, ${file.size} bytes) Now hit play!`;
        }

        // this.audioElement.src = window.URL.createObjectURL(file);
        const src = window.URL.createObjectURL(file);
        this.onMediaElementDropped(src);
    }

    private handleDragOver = (event) => {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        Tool.$dom("dropzone").style.border = "2px dashed purple";
    }
}