export enum AudioHRIR {
    google = "google",
    magls = "magls",
}

export function AudioHRIR_ToText(method: AudioHRIR) {
    return method === AudioHRIR.google ? "GoogleVR/SADIE Omnitone" : "Magnitude LS";
}