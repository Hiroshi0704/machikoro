"use strict";

class Waiter {

    constructor() {};

    static wait() {
        if (Waiter.waiting) {
            console.log('待機中');
            setTimeout(Waiter.wait, 1000);
        }
    };
};

Waiter.waiting = false;
