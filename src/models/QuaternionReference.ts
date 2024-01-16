export class QuarternionReference {
    public wref: any = null;
    public xref: any = null;
    public yref: any = null;
    public zref: any = null;
    public status: boolean = false;

    public reset() {
        this.wref = null;
        this.xref = null;
        this.yref = null;
        this.zref = null;
        this.status = false;
    }

    public store(data: any) {
        this.wref = data.wref || null;
        this.xref = data.xref || null;
        this.yref = data.yref || null;
        this.zref = data.zref || null;
        this.status = true;
    }
}