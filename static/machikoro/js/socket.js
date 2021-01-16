
class Socket {
    constructor() {
        this.endpoint = this.getEndpoint();
        this.webSocket = new WebSocket(this.endpoint);

        this.onopen = function(event) {
            console.log('onopen', event);
        };

        this.onmessage = function(event, data) {
            console.log('onmessage', event, data);
        };

        this.webSocket.onopen = function(event) {
            this.onopen(event);
        }.bind(this);

        this.webSocket.onmessage = function(event) {
            this.onmessage(event, JSON.parse(event.data));
        }.bind(this);
    }

    getWebSocketStart() {
        let wsStart = 'ws://';
        if (window.location.protocol === 'https:') {
            wsStart = 'wss://';
        }
        return wsStart;
    }

    getHost() {
        return window.location.host
    }

    getPathName() {
        return window.location.pathname;
    }

    getEndpoint() {
        return this.getWebSocketStart() + this.getHost() + this.getPathName();
    }

    update(game) {
        const data = game;
        this.webSocket.send(JSON.stringify(data));
    }

};
