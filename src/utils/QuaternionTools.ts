
export default class QuaternionTools {

    public static degreesToRadians(degree) {
        return degree / 180 * Math.PI;
    }

    public static radiansToDegrees(radian) {
        return radian * (180 / Math.PI);
    }

    public static normalize(a) {
        var len = Math.sqrt((a[0] * a[0]) + (a[1] * a[1]) + (a[2] * a[2]) + (a[3] * a[3]));
        a[0] = a[0] / len;
        a[1] = a[1] / len;
        a[2] = a[2] / len;
        a[3] = a[3] / len;
        return a;
    }

    public static conjugate(q_w, q_x, q_y, q_z) {
        q_x *= -1;
        q_y *= -1;
        q_z *= -1;
        return { wref: q_w, xref: q_x, yref: q_y, zref: q_z };
    }

    public static multiply(qt, ref) {
        // Product Hamilton product
        // https://en.wikipedia.org/wiki/Quaternion#Hamilton_product
        // W - X - Y - Z
        if (!ref || ref.status === false) {
            return qt;
        }
        let a = [];
        a[0] = (qt[0] * ref['wref'] - qt[1] * ref['xref'] - qt[2] * ref['yref'] - qt[3] * ref['zref']); //real
        a[1] = (qt[0] * ref['xref'] + qt[1] * ref['wref'] + qt[3] * ref['yref'] - qt[2] * ref['zref']); //i
        a[2] = (qt[0] * ref['yref'] + qt[2] * ref['wref'] + qt[1] * ref['zref'] - qt[3] * ref['xref']); //j
        a[3] = (qt[0] * ref['zref'] + qt[3] * ref['wref'] + qt[2] * ref['xref'] - qt[1] * ref['yref']); //k
        return a;
    }

    public static fromEuler(roll, pitch, yaw) {
        // Conversion between Euler angles and Quarternions
        // https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
        // roll (X), pitch (Y), yaw (Z)
        // Abbreviations for the various angular functions
        let cy = Math.cos(yaw * 0.5);
        let sy = Math.sin(yaw * 0.5);
        let cp = Math.cos(pitch * 0.5);
        let sp = Math.sin(pitch * 0.5);
        let cr = Math.cos(roll * 0.5);
        let sr = Math.sin(roll * 0.5);

        // let q = {
        //     "w": (cr * cp * cy + sr * sp * sy),
        //     "x": (sr * cp * cy - cr * sp * sy),
        //     "y": (cr * sp * cy + sr * cp * sy),
        //     "z": (cr * cp * sy - sr * sp * cy)
        // };
        return [
            (cr * cp * cy + sr * sp * sy),
            (sr * cp * cy - cr * sp * sy),
            (cr * sp * cy + sr * cp * sy),
            (cr * cp * sy - sr * sp * cy)
        ];
    }

    public static fromMatrix(mtx) {
        const m00 = mtx[0];
        const m01 = mtx[1];
        const m02 = mtx[2];
        const m10 = mtx[3];
        const m11 = mtx[4];
        const m12 = mtx[5];
        const m20 = mtx[6];
        const m21 = mtx[7];
        const m22 = mtx[8];

        let a = [];
        a[0] = Math.sqrt(1 + m00 + m11 + m22) / 2; // w
        const w4 = (4 * a[0]);
        a[1] = (m21 - m12) / w4; // x
        a[2] = (m02 - m20) / w4; // y
        a[3] = (m10 - m01) / w4; // z

        return a;
    }

    public static toEuler(q, degrees) {
        // TODO: Rename and reformat before use
        // Conversion between Quarternions and Euler angles
        // https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
        // roll (X), pitch (Y), yaw (Z)
        let angles = {
            roll: 0,
            pitch: 0,
            yaw: 0
        };
        if (!q) {
            return angles;
        }

        // roll (x-axis rotation)
        let sinr_cosp = 2 * (q[0] * q[1] + q[2] * q[3]);
        let cosr_cosp = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
        angles.roll = Math.atan2(sinr_cosp, cosr_cosp);

        // pitch (y-axis rotation)
        let sinp = 2 * (q[0] * q[2] - q[3] * q[1]);
        if (Math.abs(sinp) >= 1) {
            angles.pitch = (Math.PI / 2) * Math.sign(sinp); // use 90 degrees if out of range, copysign = sinp + or - applied to Math.PI/2
        } else {
            angles.pitch = Math.asin(sinp);
        }

        // yaw (z-axis rotation)
        let siny_cosp = 2 * (q[0] * q[3] + q[1] * q[2]);
        let cosy_cosp = 1 - 2 * (q[2] * q[2] + q[3] * q[3]);
        angles.yaw = Math.atan2(siny_cosp, cosy_cosp);

        if (degrees) {
            return {
                roll: parseInt(this.radiansToDegrees(angles.roll).toFixed(2)),
                pitch: parseInt(this.radiansToDegrees(angles.pitch).toFixed(2)),
                yaw: parseInt(this.radiansToDegrees(angles.yaw).toFixed(2))
            };
        }
        return angles;
    }

    public static toMatrixAsWiki(q) {
        // 1-2y²-2z²    2xy-2zw    2xz+2yw
        // 2xy+2zw      1-2x²-2z²  2yz-2xw
        // 2xz-2yw      2yz+2xw    1-2x²-2y²
        let q_w = q[0];
        let q_x = q[1];
        let q_y = q[2];
        let q_z = q[3];

        let mt = new Float32Array(9);
        // q: w0, x1, y2, z3
        mt[0] = (1.0 - 2.0 * (q_y * q_y) - 2.0 * (q_z * q_z));
        mt[1] = (2.0 * q_x * q_y) - (2.0 * q_z * q_w);
        mt[2] = (2.0 * q_x * q_z) + (2.0 * q_y * q_w);

        mt[3] = (2.0 * q_x * q_y) + (2.0 * q_z * q_w);
        mt[4] = (1.0 - 2.0 * (q_x * q_x) - 2.0 * (q_z * q_z));
        mt[5] = (2.0 * q_y * q_z) - (2.0 * q_x * q_w);

        mt[6] = (2.0 * q_x * q_z) - (2.0 * q_y * q_w);
        mt[7] = (2.0 * q_y * q_z) + (2.0 * q_x * q_w);
        mt[8] = (1.0 - 2.0 * (q_x * q_x) - 2.0 * (q_y * q_y));

        return mt;
    }

    public static quaternionToMatrix(...args) {
        // TODO: Rename
        let arg = Array.from(args)[0];

        let q_w = arg[0];
        let q_x = arg[1];
        let q_y = arg[2];
        let q_z = arg[3];

        const sqw = q_w * q_w;
        const sqx = q_x * q_x;
        const sqy = q_y * q_y;
        const sqz = q_z * q_z;

        let mrot = new Float32Array(9);

        mrot[0] = (sqx - sqy - sqz + sqw);
        mrot[4] = (-sqx + sqy - sqz + sqw);
        mrot[8] = (-sqx - sqy + sqz + sqw);

        mrot[3] = 2.0 * ((q_x * q_y) + (q_z * q_w));
        mrot[1] = 2.0 * ((q_x * q_y) - (q_z * q_w));

        mrot[6] = 2.0 * ((q_x * q_z) - (q_y * q_w));
        mrot[2] = 2.0 * ((q_x * q_z) + (q_y * q_w));

        mrot[7] = 2.0 * ((q_y * q_z) + (q_x * q_w));
        mrot[5] = 2.0 * ((q_y * q_z) - (q_x * q_w));

        // m00:0  m01:1  m02:2
        // m10:3  m11:4  m12:5
        // m20:6  m21:7  m22:8
        return mrot;
    }

    /**
     * Convert row to column major matrix 3x3
     * @param matrix row-major matrix
     * @returns column-major matrix
     */
    public static rowToColumnMajor(matrix: any) {
        return [...matrix]
        let rowm = [...matrix]
        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 3; ++j){
                rowm[ i * 3 + j ] = matrix[ j * 3 + i ];
            }
        }
        return rowm;
    }
}
