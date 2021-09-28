
export default class Tools {
    private elementNotAvailable: any[];
    private elementsInAnimation: any[];

    constructor() {
        this.elementNotAvailable = [];
        this.elementsInAnimation = [];
    }

    public static GetUrlParameters(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
        var results = regex.exec(url);
        if (!results) {
            return '';
        }
        if (!results[2]) {
            return '';
        }
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    public static $attr = (key, value, html: any = false) => {
        // Updates every element with the 'data-key' attribute
        html = html || false;
        try {
            let dataset = document.querySelectorAll("[data-key]");
            if (html) {
                dataset.forEach(function (item: HTMLElement) {
                    if (item.dataset.key === key) {
                        window.requestAnimationFrame(function () {
                            item.innerHTML = value;
                        });
                    }
                });
            } else {
                dataset.forEach(function (item: HTMLElement) {
                    if (item.dataset.key === key) {
                        window.requestAnimationFrame(function () {
                            item.textContent = value;
                        });
                    }
                });
            }
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    public static $dom = (id) => {
        // if (this.elementNotAvailable.includes(id)) {
        //     return null;
        // }
        if (id !== null && id !== "" && id !== undefined) {
            try {
                if (document.getElementById(id) !== null) {
                    return document.getElementById(id);
                } else {
                    console.warn("Can't access element with id: " + id);
                    // this.elementNotAvailable.push(id);
                    return null;
                }
            } catch (e) {
                console.warn("Can't access element with id: " + id);
                // this.elementNotAvailable.push(id);
                return null;
            }
        } else {
            console.warn("Can't access element with id: " + id);
            // this.elementNotAvailable.push(id);
            return null;
        }
    };

    public static $event(elementName, evnt, funct) {
        try {
            let element = elementName;
            if (typeof elementName == "string") {
                element = this.$dom(elementName);
            }
            if (element.attachEvent)
                return element.attachEvent('on' + evnt, funct);

            else
                return element.addEventListener(evnt, funct, false);
        } catch (error) {
            console.warn(`Could not attach event: ${error} for element ${elementName}`);
            return document.createElement("div");
        }
    }
}
