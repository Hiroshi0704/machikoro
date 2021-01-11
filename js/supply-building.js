
class SupplyBuilding {

    static id = 0;

    constructor(name, cardColor, cost, activeNumber, explanation, buildingType, coin) {
        this.name = name;
        this.cardColor = cardColor;
        this.cost = cost;
        this.activeNumber = activeNumber;
        this.explanation = explanation;
        this.buildingType = buildingType;
        this.id = SupplyBuilding.id;
        this.coin = coin;
        this.extraCoin = 0;
        SupplyBuilding.id++;
    };

    getId() {
        return 'supplyBuildingId-' + this.id;
    }

    invoke(diceNumber, diceThrower, cardOwner, players) {
        console.log(diceNumber, diceThrower, cardOwner, players);
        throw new Error('Not implemented.');
    };

    isActive(diceNumber, diceThrower) {
        // ダイスの値を確認
        if (this.activeNumber.indexOf(diceNumber) === -1) {
            return false;
        }

        // ダイスを振ったプレイヤーとカードの色を確認
        if (this.cardColor === CARD_COLOR.BLUE) {
            return true;
        } else if (this.cardColor === CARD_COLOR.GREEN && diceThrower === DICE_THROWER.SELF) {
            return true;
        } else if (this.cardColor === CARD_COLOR.RED && diceThrower === DICE_THROWER.OTHER) {
            return true;
        } else if (this.cardColor === CARD_COLOR.PURPLE && diceThrower === DICE_THROWER.SELF) {
            return true;
        } else {
            return false;
        }
    };

    checkThenInvoke(diceNumber, diceThrower, cardOwner, players) {
        if (this.isActive(diceNumber, diceThrower)) {
            // ショッピングモール効果
            if (cardOwner.landmark[LANDMARK_KEY.SHOPPING_MALL].isActive()
            && (this.buildingType === BUILDING_TYPE.SHOP || this.buildingType === BUILDING_TYPE.CAFE)) {
                this.extraCoin = 1;
            } else {
                this.extraCoin = 0;
            }
            this.invoke(diceNumber, diceThrower, cardOwner, players);
        }
    };

    getHtmlTemplate() {
        return `<div id="${this.getId()}" class="card ${this.cardColor}">
                    <div class="activeNumber">${this.activeNumber}</div>
                    <div class="name">
                        <span class="buildingType ${this.buildingType}"></span>
                        <span class="inner">${this.name}</span>
                    </div>
                    <div class="explanation">${this.explanation}</div>
                    <div class="cost">
                        <span class="inner">${this.cost}</span>
                    </div>
                </div>`;
    };

    activateClickEvent() {
        if (Game.getInstance().getNowPlayer().coins >= this.cost) {

            // 同じ紫カード複数所持不可
            const hasSamePurpleCard = (card) => card.name === this.name;
            if (Game.getInstance().getNowPlayer().hand.findIndex(hasSamePurpleCard) !== -1) {
                return;
            }

            $('#' + this.getId()).click(this.onClick.bind(this));
            const intervalTime = 1000;
            this.interval = setInterval(function() {
                $('#' + this.getId()).animate({
                    opacity: '60%'
                }, intervalTime / 2);
                $('#' + this.getId()).animate({
                    opacity: '100%'
                }, intervalTime / 2);
            }.bind(this), intervalTime + 1200);
        }
    };

    deactivateClickEvent() {
        $('#' + this.getId()).off();
        clearInterval(this.interval);
    };

    onClick() {
        const modalId = 'cardConfirmModal';
        const $modal = $(`<div id="${modalId}" class="cardConfirmModal" style="display: none;"></div>`);

        function onClickCloseButton() {
            $modal.remove();
            Game.getInstance().$doneButton.focus();
        };

        function onClickOkButton() {
            $modal.remove();
            const player = Game.getInstance().getNowPlayer();
            player.buy(this.cost);
            const game = Game.getInstance();
            const card = game.publicCards[this.name].shift();
            player.addHand(card);
            if (game.publicCards[this.name].length === 0) {
                delete game.publicCards[this.name];
            }
            game.dealCardStockToPublic();
            game.disableBuySupplyBuildingAndLandmark();
            this.deactivateClickEvent();
            Game.getInstance().$doneButton.focus();
        };

        $modal.append($(`<div>${this.name}でよろしいですか？</div>`));
        $modal.appendTo($('body'));
        $modal.dialog({
            modal: true,
            close: onClickCloseButton.bind(this),
            buttons: {
                OK: onClickOkButton.bind(this),
                cancel: onClickCloseButton.bind(this),
            }
        });
    };

    static getHtmlBuildingType(buildingType) {
        return `<span class="buildingType ${buildingType}"></span>`;
    }

    static generate(length) {
        let ret = [];
        for (let i = 0; i < length; ++i) {
            ret.push(new this());
        }
        return ret;
    };

    getTotalCoin() {
        return this.coin + this.extraCoin;
    };
};

class Wheat extends SupplyBuilding {
    constructor() {
        const explanation = '誰のターンでも銀行から1コインをもらう';
        super('麦畑',CARD_COLOR.BLUE, 1, [1], explanation, BUILDING_TYPE.PLANT, 1);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        cardOwner.earn(coin);
        Logger.info(`${cardOwner.name}は${this.name}で(${coin})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class StockFarm extends SupplyBuilding {
    constructor() {
        const explanation = '誰のターンでも銀行から1コインをもらう';
        super('牧場',CARD_COLOR.BLUE, 1, [2], explanation, BUILDING_TYPE.ANIMAL, 1);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        cardOwner.earn(coin);
        Logger.info(`${cardOwner.name}は${this.name}で(${coin})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class Bakery extends SupplyBuilding {
    constructor() {
        const explanation = '自分のターンなら銀行から1コインをもらう';
        super('パン屋', CARD_COLOR.GREEN, 1, [2, 3], explanation, BUILDING_TYPE.SHOP, 1);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        cardOwner.earn(coin);
        Logger.info(`${cardOwner.name}は${this.name}で(${coin})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class Cafe extends SupplyBuilding {
    constructor() {
        const explanation = '目を出したプレイヤーから1コインもらう';
        super('カフェ', CARD_COLOR.RED, 2, [3], explanation, BUILDING_TYPE.CAFE, 1);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, players) {
        const coin = this.getTotalCoin();
        const others = players.filter(player => player !== cardOwner);
        let income = 0;
        for (let player of others) {
            const paid = player.pay(coin);
            income += paid;
            Logger.info(`${cardOwner.name}は${this.name}で${player.name}から(${paid})コインを得た。`);
        }
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で合計で(${income})コインを得た。合計(${cardOwner.coins})コインです`);
    };
};

class ConvenienceStore extends SupplyBuilding {
    constructor() {
        const explanation = '自分のターンなら銀行から3コインもらう';
        super('コンビニ', CARD_COLOR.GREEN, 2, [4], explanation, BUILDING_TYPE.SHOP, 3);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        cardOwner.earn(coin);
        Logger.info(`${cardOwner.name}は${this.name}で(${coin})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class Forest extends SupplyBuilding {
    constructor() {
        const explanation = '誰のターンでも銀行から1コインをもらう';
        super('森林', CARD_COLOR.BLUE, 3, [5], explanation, BUILDING_TYPE.MINERAL, 1);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        cardOwner.earn(coin);
        Logger.info(`${cardOwner.name}は${this.name}で(${coin})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class CheeseFactory extends SupplyBuilding {
    constructor() {
        const explanation = `自分のターンなら、銀行から自分の<span class="buildingType ${BUILDING_TYPE.ANIMAL}"></span>1軒つき3コインもらう`;
        super('チーズ工場', CARD_COLOR.GREEN, 5, [7], explanation, BUILDING_TYPE.FACTORY, 3);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        const cards = cardOwner.hand.filter(card => card.buildingType === BUILDING_TYPE.ANIMAL);
        let income = coin * cards.length;
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で(${income})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class FurnitureFactory extends SupplyBuilding {
    constructor() {
        const explanation = `自分のターンなら、銀行から自分の<span class="buildingType ${BUILDING_TYPE.MINERAL}"></span>1軒つき3コインもらう`;
        super('家具工場', CARD_COLOR.GREEN, 5, [8], explanation, BUILDING_TYPE.FACTORY, 3);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        const cards = cardOwner.hand.filter(card => card.buildingType === BUILDING_TYPE.MINERAL);
        let income = coin * cards.length;
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で(${income})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class Mine extends SupplyBuilding {
    constructor() {
        const explanation = `誰のターンでも銀行から5コインをもらう`;
        super('鉱山', CARD_COLOR.BLUE, 6, [9], explanation, BUILDING_TYPE.MINERAL, 5);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        let income = coin;
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で(${income})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class FamilyRestaurant extends SupplyBuilding {
    constructor() {
        const explanation = `目を出したプレイヤーから2コインもらう`;
        super('ファミレス', CARD_COLOR.RED, 3, [9, 10], explanation, BUILDING_TYPE.CAFE, 2);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, players) {
        const coin = this.getTotalCoin();
        const others = players.filter(player => player !== cardOwner);
        let income = 0;
        for (let player of others) {
            const paid = player.pay(coin);
            income += paid;
            Logger.info(`${cardOwner.name}は${this.name}で${player.name}から(${paid})コインを得た。`);
        }
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で合計で(${income})コインを得た。合計(${cardOwner.coins})コインです`);
    };
};

class AppleOrchard extends SupplyBuilding {
    constructor() {
        const explanation = `誰のターンでも銀行から3コインをもらう`;
        super('リンゴ園', CARD_COLOR.BLUE, 3, [10], explanation, BUILDING_TYPE.PLANT, 3);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        let income = coin;
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で(${income})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class FruitAndVegetableMarket extends SupplyBuilding {
    constructor() {
        const explanation = `自分のターンなら、銀行から自分の<span class="buildingType ${BUILDING_TYPE.PLANT}"></span>1軒つき2コインもらう`;
        super('青果市場', CARD_COLOR.GREEN, 2, [11, 12], explanation, BUILDING_TYPE.FRUIT, 3);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, _players) {
        const coin = this.getTotalCoin();
        const cards = cardOwner.hand.filter(card => card.buildingType === BUILDING_TYPE.PLANT);
        let income = coin * cards.length;
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で(${income})コインを得た。合計は(${cardOwner.coins})コインです。`);
    };
};

class Stadium extends SupplyBuilding {
    constructor() {
        const explanation = '自分のターンなら全員から2コインもらう';
        super('スタジアム', CARD_COLOR.PURPLE, 6, [6], explanation, BUILDING_TYPE.SPECIAL, 2);
    };

    invoke(_diceNumber, _diceThrower, cardOwner, players) {
        const coin = this.getTotalCoin();
        const others = players.filter(player => player !== cardOwner);
        let income = 0;
        for (let player of others) {
            const paid = player.pay(coin);
            income += paid;
            Logger.info(`${cardOwner.name}は${this.name}で${player.name}から(${paid})コインを得た。`);
        }
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で合計で(${income})コインを得た。合計(${cardOwner.coins})コインです`);
    };
};

class TelevisionStation extends SupplyBuilding {
    constructor() {
        const explanation = '自分のターンなら任意のプレイヤーから5コインもらう';
        super('テレビ局', CARD_COLOR.PURPLE, 7, [6], explanation, BUILDING_TYPE.SPECIAL, 5);
        this.$modal = null;
    };

    invoke(_diceNumber, _diceThrower, cardOwner, players) {
        const coin = this.getTotalCoin();
        const others = players.filter(player => player !== cardOwner);

        // プレイヤを選ばせる画面を表示する
        this.$modal = $(this.getHtmlSelectPlayerModal());
        this.$modal.appendTo($('body'));
        this.$modal = this.$modal.dialog({
            modal: true,
            close: this.onClickModalCloseButton.bind(this)
        });

        // ボタンの作成
        for (let player of others) {
            let $button = $(this.getHtmlSelectPlayerButton(player));
            $button.on('click', this.onClickModalPlayerButton.bind(this, cardOwner, player, coin));
            this.$modal.append($button);
        }

        // プレイヤーが選択されるまで待機
        Waiter.waiting = true;
        Waiter.wait();
    };

    onClickModalCloseButton() {
        if (this.$modal !== null) {
            this.$modal.remove();
        }
        Waiter.waiting = false;
        Game.getInstance().$doneButton.focus();
    };

    onClickModalPlayerButton(cardOwner, player, coin) {
        if (this.$modal !== null) {
            this.$modal.remove();
        }
        let income = player.pay(coin);
        cardOwner.earn(income);
        Logger.info(`${cardOwner.name}は${this.name}で${player.name}から(${income})コインを得た。合計(${cardOwner.coins})コインです。`);
        Waiter.waiting = false;
        Game.getInstance().$doneButton.focus();
    };

    getHtmlSelectPlayerModal() {
        return `
            <div id="televisionStationSelectPlayerModal" style="display: none;"></div>
        `;
    };

    getHtmlSelectPlayerButton(player) {
        return `
            <button type="button">${player.name}(${player.coins})</button>
        `;
    };
};

class BusinessCenter extends SupplyBuilding {
    constructor() {
        const special = SupplyBuilding.getHtmlBuildingType(BUILDING_TYPE.SPECIAL);
        const explanation = `自分のターンなら${special}以外の施設1軒を他のプレイヤーと交換できる`;
        super('ビジネスセンター', CARD_COLOR.PURPLE, 8, [6], explanation, BUILDING_TYPE.SPECIAL);
    };
};


class SupplyBuildingManager {
    constructor() {};

    static getDefaultSupplyBuildingForPlayer() {
        return [
            new Wheat(),
            new Bakery(),
        ];
    };
}
