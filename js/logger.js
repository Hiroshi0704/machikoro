class Logger {
    constructor() {};

    static diceNumbers = [];

    static info(log) {
        const $log = $('#log');
        $log.append(`<p class="new">${log}</p>`);
        Logger.scrollToBottom();
    };

    static dice(diceNumber) {
        const $log = $('#log');
        $log.append(`<p>サイコロ: ${diceNumber}</p>`);
        Logger.diceNumbers.push(diceNumber);
        Logger.scrollToBottom();
    }

    static update() {
        const $log = $('#log');
        $log.find('p').removeClass('new');
        $log.append('<hr>');
        Logger.scrollToBottom();
    };

    static scrollToBottom() {
        const $log = $('#log');
        const bottom = $log[0].scrollHeight;
        $log[0].scroll(0, bottom);
    }

    static getDiceNumbersInfo() {
        const ret = {};
        const numberCount = {};
        for (let diceNumber of Logger.diceNumbers) {
            numberCount[diceNumber] = (numberCount[diceNumber] || 0) + 1;
        }
        ret.numberCount = numberCount;
        return ret;
    }

};
