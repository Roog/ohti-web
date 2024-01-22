export default class NumberUtil {

    public static log10(x: number) {
        return Math.log(x)/Math.LN10;
    }

    public static gainToDecibel(gain: number): any {
        let decibel_level = 20 * NumberUtil.log10( gain );
        return decibel_level;
    }

    public static decibelToGain(decibel: number): any {
        let gain_level = Math.pow(10, (decibel / 20));
        return gain_level;
    }

}
