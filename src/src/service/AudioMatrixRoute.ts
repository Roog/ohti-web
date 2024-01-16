import { AudioRoute, AudioTemplateRoute } from "./AudioTemplateRoute";


export class AudioMatrixRoute {
    public current: any = AudioRoute.default;
    private templateRouteName: AudioTemplateRoute = AudioTemplateRoute.default;
    private customized: boolean = false;

    public readonly inputs: number = 16;
    public readonly outputs: number = 16;

    public onRouteChange? = (template: AudioTemplateRoute, route: AudioRoute) => void {};

    constructor() {
    }

    public channels(): number {
        return this.current.length || 0;
    }

    public getInput(outputIndex: number): number {
        return this.current[outputIndex];
    }

    public getCurrent() {
    }

    /**
     * Routes input to output manually. Inputs and outputs are 0 indexed.
     * @param outputIndex for destination
     * @param inputIndex
     */
    public setInput(outputIndex: number, inputIndex: number) {
        this.current[outputIndex] = inputIndex;
        this.customized = true;
        this.templateRouteName = AudioTemplateRoute.custom;
        // TODO: check if matching any route
        this.onRouteChange(this.templateRouteName, [...this.current]);
    }

    /**
     * Selects audio matrix route template from a few static pre defined audio routes
     * @param template number from static template
     */
    public select(template: AudioTemplateRoute) {
        this.customized = false;
        this.templateRouteName = template;
        let transfer = null;
        switch (template) {
            case AudioTemplateRoute.default:
                transfer = AudioRoute.default;
                break;
            case AudioTemplateRoute.linear:
                transfer = AudioRoute.linear;
                break;
            case AudioTemplateRoute.silent:
                transfer = AudioRoute.silent;
                break;

            case AudioTemplateRoute.so1h1p:
                transfer = AudioRoute.so1h1p;
                break;

            case AudioTemplateRoute.so2h2p:
                transfer = AudioRoute.so2h2p;
                break;
            case AudioTemplateRoute.so2h1v:
                transfer = AudioRoute.so2h1v;
                break;
            case AudioTemplateRoute.so2h1p:
                transfer = AudioRoute.so2h1p;
                break;

            case AudioTemplateRoute.so3h3p:
                transfer = AudioRoute.so3h3p;
                break;
            case AudioTemplateRoute.so3h2p:
                transfer = AudioRoute.so3h2p;
                break;
            case AudioTemplateRoute.so3h1p:
                transfer = AudioRoute.so3h1p;
                break;

            default:
                throw new Error("Trying to select audio route template that doesn't exist");
        }

        this.current = transfer.map(object => object);
        this.onRouteChange(this.templateRouteName, [...this.current]);
    }
}
