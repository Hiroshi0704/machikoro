"use strict";

class Logger {
    constructor() {};

    static info(log) {
        Game.getInstance().socket.send(JSON.stringify({'log': log}));
    };

    static dice(diceNumber) {
        Game.getInstance().socket.send(JSON.stringify({'logDiceNumber': diceNumber}));
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

    static outputLog(log) {
        const $log = $('#log');
        $log.append(`<p class="new">${log}</p>`);
        Logger.scrollToBottom();
    }

    static outputDice(diceNumber) {
        const $log = $('#log');
        $log.append(`<p class="new">サイコロ: ${diceNumber}</p>`);
        Logger.diceNumbers.push(diceNumber);
        Logger.scrollToBottom();
    }

};

Logger.diceNumbers = [];
