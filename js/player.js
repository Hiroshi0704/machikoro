
class Player {

    static id = 0;

    constructor(name, hand, landmark, coins) {
        this.name = name;
        this.hand = hand;
        this.landmark = landmark;
        this.coins = coins;
        this.doubleDiceMode = false;
        this.dice = new DoubleDice();
        this.id = Player.id;
        Player.id++;
    };

    getId() {
        return 'playerId-' + this.id;
    }

    buy(cost) {
        if (this.coins < cost) {
            return this.coins - cost;
        }
        this.coins -= cost;
        this.updateCoinsOnDisplay();
        return this.coins;
    };

    pay(money) {
        let paid = money;
        this.coins -= money;
        if (this.coins < 0) {
            paid += this.coins;
            this.coins = 0;
        }
        this.updateCoinsOnDisplay();
        return paid;
    };

    earn(money) {
        this.coins += money;
        this.updateCoinsOnDisplay();
        return this.coins;
    };

    addHand(card) {
        this.hand.push(card);
        this.sortHand();
        Game.getInstance().displayPlayerHand(this);
        Game.getInstance().displayAllPlayersHandAndLandmark();
    };

    updateCoinsOnDisplay() {
        $(`.playerList .${this.getId()} span.coins`).text(this.coins);
    };

    isDoubleDiceAble() {
        const station = this.landmark[LANDMARK_KEY.STATION];
        return station.isActive();
    };

    isDoubleDiceMode() {
        if (this.isDoubleDiceAble()) {
            return this.doubleDiceMode;
        } else {
            this.setDoubleDiceMode(false);
        }
        return this.doubleDiceMode;
    };

    setDoubleDiceMode(doubleDiceMode) {
        this.doubleDiceMode = doubleDiceMode;
    };

    throwOnly() {
        let diceNumber = 0;
        if (this.isDoubleDiceMode()) {
            diceNumber = this.dice.throw();
        } else {
            diceNumber = this.dice.throwSingleDice();
        }
        return diceNumber;
    }

    throw(number) {
        let diceNumber = 0;
        if (number !== undefined) {
            diceNumber = number;
        } else {
            if (this.isDoubleDiceMode()) {
                diceNumber = this.dice.throw();
            } else {
                diceNumber = this.dice.throwSingleDice();
            }
        }

        Logger.dice(diceNumber);

        const otherPlayer = Game.getInstance().players.filter(player => player !== this);
        for (let player of otherPlayer) {
            player.standBy(diceNumber);
        }

        this.bluePhase(diceNumber, DICE_THROWER.SELF);
        this.greenPhase(diceNumber, DICE_THROWER.SELF);
        this.purplePhase(diceNumber, DICE_THROWER.SELF);
        return diceNumber;
    };

    standBy(diceNumber) {
        this.redPhase(diceNumber, DICE_THROWER.OTHER);
        this.bluePhase(diceNumber, DICE_THROWER.OTHER);
    }

    redPhase(diceNumber, diceThrower) {
        const cards = this.hand.filter(card => card.cardColor === CARD_COLOR.RED);
        for (let card of cards) {
            card.checkThenInvoke(diceNumber, diceThrower, this, Game.getInstance().players);
        }
    };

    bluePhase(diceNumber, diceThrower) {
        const cards = this.hand.filter(card => card.cardColor === CARD_COLOR.BLUE);
        for (let card of cards) {
            card.checkThenInvoke(diceNumber, diceThrower, this, Game.getInstance().players);
        }
    };

    greenPhase(diceNumber, diceThrower) {
        const cards = this.hand.filter(card => card.cardColor === CARD_COLOR.GREEN);
        for (let card of cards) {
            card.checkThenInvoke(diceNumber, diceThrower, this, Game.getInstance().players);
        }
    };

    purplePhase(diceNumber, diceThrower) {
        const cards = this.hand.filter(card => card.cardColor === CARD_COLOR.PURPLE);
        for (let card of cards) {
            card.checkThenInvoke(diceNumber, diceThrower, this, Game.getInstance().players);
        }
    };

    sortHand() {
        this.hand.sort(function(a, b) {
            if (a.activeNumber[0] > b.activeNumber[0]) {
                return 1;
            } else {
                if ((a.activeNumber[0] === b.activeNumber[0])
                && (a.activeNumber.length > b.activeNumber.length)) {
                    return 1;
                }
                return -1;
            }
        });
    }
};
