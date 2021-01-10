
class Dice {

    constructor() {
        this.numbers = [1, 2, 3, 4, 5, 6];
        this.number;
    };

    throw() {
        const index = Math.floor(Math.random() * this.numbers.length);
        this.number = this.numbers[index];
        return this.number;
    };
};

class DoubleDice {

    constructor() {
        this.dice1 = new Dice();
        this.dice2 = new Dice();
        this.isDoubleMode = false;
    };

    throw() {
        this.isDoubleMode = true;
        this.dice1.throw();
        this.dice2.throw();
        let diceInfo = this.getDiceInfo();
        Game.getInstance().$diceResult.val(`${diceInfo.dice1}+${diceInfo.dice2}=${diceInfo.total}`);
        return diceInfo.total;
    };

    throwSingleDice() {
        this.isDoubleMode = false;
        this.dice1.throw();
        let diceInfo = this.getDiceInfo();
        Game.getInstance().$diceResult.val(`${diceInfo.dice1}`);
        return diceInfo.total;
    };

    getTotal() {
        const ret = this.isDoubleMode ? (this.dice1.number + this.dice2.number) : this.dice1.number;
        return ret;
    };

    getDiceInfo() {
        return {
            'dice1': this.dice1.number,
            'dice2': this.isDoubleMode ? this.dice2.number : null,
            'total': this.getTotal(),
        };
    };

    // 電波塔効果
    radioTowerProcess() {
        const nowPlayer = Game.getInstance().getNowPlayer();
        const radioTower = nowPlayer.landmark[LANDMARK_KEY.RADIO_TOWER];
        if (!radioTower.isActive() || !radioTower.ableThrowAgain) {
            radioTower.ableThrowAgain = true;
            return this.getDiceInfo();
        }

        let $modal = $(`<div id="radioToweModal" style="display: none;">振り直しますか？</div>`);
        $modal.appendTo($('body'));

        function onClickCancelButton() {
            radioTower.ableThrowAgain = true;
            $modal.remove();
            Waiter.waiting = false;
        }

        function onClickOkButton() {
            radioTower.ableThrowAgain = false;
            this.throw();
            radioTower.ableThrowAgain = true;
            $modal.remove();
            Waiter.waiting = false;
        }
        $modal = $modal.dialog({
            modal: false,
            close: onClickCancelButton.bind(this),
            buttons: {
                'はい': onClickOkButton.bind(this),
                'いいえ': onClickCancelButton.bind(this)
            }
        });

        Waiter.waiting = true;
        while(Waiter.waiting) {
            Waiter.sleep(1000);
        }
        return this.getDiceInfo();
    }
};
