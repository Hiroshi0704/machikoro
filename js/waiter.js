
class Waiter {
    constructor() {};

    static waiting = false;

    static wait() {
        if (Waiter.waiting) {
            console.log('待機中');
            setTimeout(Waiter.wait, 1000);
        }
    };
};
