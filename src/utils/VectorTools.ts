
export default class VectorTools {
    static crossProduct(a1, a2, a3, b1, b2, b3) {
        return [
            a2 * b3 - a3 * b2,
            a3 * b1 - a1 * b3,
            a1 * b2 - a2 * b1
        ];
    }

    static normalizeVector(a) {
        var len = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
        a[0] = a[0] / len;
        a[1] = a[1] / len;
        a[2] = a[2] / len;
        return a;
    }
}
