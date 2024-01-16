
export enum AudioTemplateRoute {
    default = "default",
    linear = "linear",
    silent = "silent",
    custom = "custom",

    so1h1p = "so1h1p",

    so2h2p = "so2h2p",
    so2h1v = "so2h1v",
    so2h1p = "so2h1p",

    so3h3p = "so3h3p",
    so3h2p = "so3h2p",
    so3h1p = "so3h1p",
}

export class AudioRoute {
    public static default = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
    public static linear = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
    public static silent = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1] as const;

    // Use so3h3p (AMB8) as default setting
    // Use Ambisonic third order decoder
    public static so3h3p = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;         // (TOA) in 16 channels
    public static so3h2p = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -1, -1, -1, -1, 10] as const;        //  Straight routing as some channels are silent incoming
    public static so3h1p = [0, 1, 2, 3, 4, -1, -1, -1, 5, 6, -1, -1, -1, -1, -1, 7] as const;       //   Straight routing as some channels are silent incoming

    // Use Ambisonic second order decoder
    public static so2h2p = [0, 1, 2, 3, 4, 5, 6, 7, 8, -1, -1, -1, -1, -1, -1, -1] as const;      // SOA as spec 9  channels - incoming channels possibli more than 9 use only first nine
    public static so2h1v = [0, 1, 2, 3, 4, 5, -1, 6, 7, -1, -1, -1, -1, -1, -1, -1] as const;      //  8 channels incoming - insert silence in to 5 - shift rest of channels higher (Denna är Fel på OHTI nuvarande - Kanske)
    public static so2h1p = [0, 1, 2, 3, 4, -1, -1, -1, 5, -1, -1, -1, -1, -1, -1, -1] as const;      //  6   channels incoming - 0 - 5

    // Use Ambisonic first order decoder
    public static so1h1p = [0, 1, 2, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1] as const;     //  6   channels incoming use - 0 - 3
}
