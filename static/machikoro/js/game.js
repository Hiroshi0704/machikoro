'use strict';

class GameConfig {

    static createCardStock() {
        let ret = [];
        for (let cardConfig of GameConfig.cardStock) {
            ret = ret.concat(cardConfig.card.generate(cardConfig.length));
        }
        return ret;
    }

};

GameConfig.playerNames = ['Player1', 'Player2', 'Player3', 'Player4'];
GameConfig.cardStock = [
    {card: Wheat, length: 6},
    {card: StockFarm, length: 6},
    {card: Bakery, length: 6},
    {card: Cafe, length: 6},
    {card: ConvenienceStore, length: 6},
    {card: Forest, length: 6},
    {card: CheeseFactory, length: 6},
    {card: FurnitureFactory, length: 6},
    {card: Mine, length: 6},
    {card: FamilyRestaurant, length: 6},
    {card: AppleOrchard, length: 6},
    {card: FruitAndVegetableMarket, length: 6},

    // 特殊カード
    {card: TelevisionStation, length: 4},
    {card: Stadium, length: 4},

    // 町コロ＋
    {card: FlowerGarden, length: 6},
    {card: FlowerShop, length: 6},
    {card: Pizzeria, length: 0},
    {card: HamburgerShop, length: 0},
];

class Game {

    constructor() {
        this.players = [];
        this.playersIndex = -1;
        this.cardStock = [];
        this.publicCards = {};
        this.$throwDiceButton = $('#player .dice .throwDiceButton');
        this.$doneButton  = $('#player .dice .doneButton');
        this.$diceResult = $('#player .dice .result');
        this.isSuspend = false;
    };

    static getInstance() {
        if (Game.game === null) {
            Game.game = new Game();
        }
        return Game.game;
    }

    start() {
        this.init();
    };

    init() {

        this.cardStock = this.shuffleArray(GameConfig.createCardStock());

        this.initPlayers(GameConfig.playerNames);
        this.displayPlayerList();
        this.displayPlayerHand(this.getNowPlayer());
        this.displayPlayerLandmark(this.getNowPlayer());
        this.displayAllPlayersHandAndLandmark();
        this.playerListTurn(this.getNowPlayer());
        this.enableDoubleDiceButtonIfAllowed(this.getNowPlayer());
        this.$throwDiceButton.off().on('click', this.onClickThrowDiceButton.bind(this));
        this.$doneButton.off().on('click', this.onClickDoneButton.bind(this));
        this.$doneButton.prop('disabled', true);
        this.dealCardStockToPublic();
        $('#doubleDiceMode').change(this.onChangeDoubleDiceMode.bind(this));
        this.$throwDiceButton.focus();
        $(`a[href="#tab${this.getNowPlayer().getId()}"]`).mouseover();
    }

    initPlayers(names) {
        for (let name of names) {
            const supply = SupplyBuildingManager.getDefaultSupplyBuildingForPlayer();
            const landmark = LandmarkManager.getLandmarkForPlayer();
            const player = new Player(name, supply, landmark, 3);
            const $a = $('<a>').attr('href', '#tab' + player.getId()).append($(player.getHtmlName()));
            const $tab = $('<li>').append($a);
            $('.tabs ul').append($tab);
            $('.tabs').append($('<div>').addClass('innerTab').attr('id', 'tab' + player.getId()));
            this.players.push(player);
        }

        $('.tabs').tabs({
            event: "mouseover",
        });
    };

    onClickDoneButton() {
        Logger.update();
        // 遊園地効果
        let nextPlayer;
        const diceInfo = this.getNowPlayer().dice.getDiceInfo();
        if (this.getNowPlayer().landmark[LANDMARK_KEY.AMUSEMENT_PARK].isActive()
            && (diceInfo.dice1 === diceInfo.dice2)) {
            nextPlayer = this.getNowPlayer();
        } else {
            nextPlayer = this.getNextPlayer();
        }
        this.displayPlayerHand(nextPlayer);
        this.displayPlayerLandmark(nextPlayer);
        this.playerListTurn(nextPlayer);
        this.enableDoubleDiceButtonIfAllowed(nextPlayer);
        this.disableBuySupplyBuildingAndLandmark();
        this.$throwDiceButton.prop('disabled', false);
        this.$doneButton.prop('disabled', true);
        this.$diceResult.val('');
        this.$throwDiceButton.focus();
        $(`a[href="#tab${nextPlayer.getId()}"]`).mouseover();
    };

    onClickThrowDiceButton() {
        // 電波塔効果
        const radioTower = this.getNowPlayer().landmark[LANDMARK_KEY.RADIO_TOWER];
        if (radioTower.isActive() && radioTower.ableThrowAgain) {
            const diceNumber = this.getNowPlayer().throwOnly();
            let $modal = $(`<div id="radioToweModal" style="display: none;">振り直しますか？</div>`);
            $modal.appendTo($('body'));

            function onClickCancelButton() {
                $modal.remove();
                this.getNowPlayer().throw(diceNumber);
                this.$throwDiceButton.prop('disabled', true);
            };

            function onClickOkButton() {
                $modal.remove();
                radioTower.ableThrowAgain = false;
                this.onClickThrowDiceButton();
            };

            $modal = $modal.dialog({
                modal: false,
                close: onClickCancelButton.bind(this),
                buttons: {
                    'はい': onClickOkButton.bind(this),
                    'いいえ': onClickCancelButton.bind(this)
                }
            });
            this.$throwDiceButton.prop('disabled', true);
        } else {
            this.getNowPlayer().throw();
            this.$throwDiceButton.prop('disabled', true);
        }
    };

    prepareNext() {
        // 所持コインが0の場合は銀行から1コインもらう
        if (this.getNowPlayer().coins === 0) {
            this.getNowPlayer().earn(1);
            Logger.info(`${this.getNowPlayer().getHtmlName()}は銀行から(1)コインを得た。`);
        }
        this.enableBuySupplyBuildingAndLandmark();
        this.$throwDiceButton.prop('disabled', true);
        $('#player .dice .doneButton').prop('disabled', false);
        this.$doneButton.focus();
        this.getNowPlayer().landmark[LANDMARK_KEY.RADIO_TOWER].ableThrowAgain = true;
        this.isSuspend = false;
        this.resetPlayerHandChecked();
    }

    resetPlayerHandChecked() {
        for (let player of this.players) {
            for (let card of player.hand) {
                card.checked = false;
            }
        }
    }

    getPlayers() {
        return this.players;
    };

    setPlayers(players) {
        this.players = players;
    }

    getNowPlayer() {
        return this.getPlayers()[0];
    }

    getNextPlayer() {
        const players = this.getPlayers();
        players.push(players.shift());
        this.setPlayers(players);
        return this.getPlayers()[0];
    };

    nextPlayerIndex() {
        this.playersIndex++;
        if (this.playersIndex >= this.players.length) {
            this.playersIndex = 0;
        }
        return this.playersIndex;
    };

    displayPlayerHand(player) {
        this.clearPlayerHand();
        const $player = $('#player');
        for (let card of player.hand) {
            let selector = '';
            if (card.cardColor === CARD_COLOR.BLUE) {
                selector = '#tabsBlue';
            } else if (card.cardColor === CARD_COLOR.GREEN) {
                selector = '#tabsGreen';
            } else if (card.cardColor === CARD_COLOR.RED) {
                selector = '#tabsRed';
            } else {
                selector = '#tabsPurple';
            }
            const $cardTemplate = $(card.getHtmlTemplate());
            $player.find(selector).append($cardTemplate);
        }
    };

    clearPlayerHand() {
        $('#tabsBlue').find('.card').remove();
        $('#tabsGreen').find('.card').remove();
        $('#tabsRed').find('.card').remove();
        $('#tabsPurple').find('.card').remove();
    };

    displayPlayerLandmark(player) {
        this.clearPlayerLandmark();
        const $player = $('#player');
        for (let key in player.landmark) {
            const landmark = player.landmark[key];
            const $cardTemplate = $(landmark.getHtmlTemplate());
            $player.find('#tabsLandmark').append($cardTemplate);
        }
    };

    clearPlayerLandmark() {
        $('#tabsLandmark').find('.card').remove();
    };

    displayPlayerList() {
        for (let player of this.getPlayers()) {
            $('.playerList').append($(`<div class="${player.getId()}">${player.getHtmlName()}(<span class="coins">${player.coins}</span>)<span class="turn">●</span></div>`));
        }
    };

    playerListTurn(player) {
        $('.playerList .turn').removeClass('active');
        $(`.playerList .${player.getId()} .turn`).addClass('active');
    };

    enableBuySupplyBuilding() {
        for (let key of Object.keys(this.publicCards)) {
            const card = this.publicCards[key][0];
            card.activateClickEvent();
        }
    };

    enableBuyLandmark() {
        const nowPlayerLandmark = this.getNowPlayer().landmark;
        for (let key of Object.keys(nowPlayerLandmark)) {
            const landmark = nowPlayerLandmark[key];
            landmark.activateClickEvent();
        }
    }

    disableBuySupplyBuilding() {
        for (let key of Object.keys(this.publicCards)) {
            const card = this.publicCards[key][0];
            card.deactivateClickEvent();
        }
    };

    disableBuyLandmark() {
        const nowPlayerLandmark = this.getNowPlayer().landmark;
        for (let key of Object.keys(nowPlayerLandmark)) {
            const landmark = nowPlayerLandmark[key];
            landmark.deactivateClickEvent();
        }
    };

    disableBuySupplyBuildingAndLandmark() {
        this.disableBuySupplyBuilding();
        this.disableBuyLandmark();
    };

    enableBuySupplyBuildingAndLandmark() {
        this.enableBuySupplyBuilding();
        this.enableBuyLandmark();
    };

    shuffleArray(array) {
        let ret = array.slice();
        for (let i = ret.length; 1 < i; i--) {
            let k = Math.floor(Math.random() * i);
            [ret[k], ret[i - 1]] = [ret[i - 1], ret[k]];
        }
        return ret;
    };

    dealCardStockToPublic() {

        while (Object.keys(this.publicCards).length < 8 && this.cardStock.length >= 1) {
            const nextCard = this.cardStock.shift();
            if (this.publicCards[nextCard.name] === undefined) {
                this.publicCards[nextCard.name] = [];
            }
            this.publicCards[nextCard.name].push(nextCard);
        }

        const $public = $('#public');
        $public.find('.card').remove();
        for(let key of Object.keys(this.publicCards)) {
            const card = this.publicCards[key][0];
            $public.append($(card.getHtmlTemplate()));
        }
    };

    onChangeDoubleDiceMode() {
        const isDouble = $('#doubleDiceMode').prop('checked');
        this.getNowPlayer().setDoubleDiceMode(isDouble);
    }

    enableDoubleDiceButtonIfAllowed(player) {
        $('#doubleDiceMode').prop('disabled', false);
        if (player.isDoubleDiceAble()) {
            $('#doubleDiceMode').prop('checked', player.isDoubleDiceMode()).change();
        } else {
            $('#doubleDiceMode').prop('checked', false).change();
        }
        $('#doubleDiceMode').prop('disabled', !player.isDoubleDiceAble());
    }

    displayAllPlayersHandAndLandmark() {
        this.clearAllPlayersHandAndLandmark();
        for (let player of this.getPlayers()) {
            for (let card of player.hand) {
                const $cardTemplate = $(card.getHtmlTemplate()).removeAttr('id');
                $('#tab' + player.getId()).append($cardTemplate);
            }
            for (let key in player.landmark) {
                const landmark = player.landmark[key];
                const $cardTemplate = $(landmark.getHtmlTemplate()).removeAttr('id');
                $('#tab' + player.getId()).append($cardTemplate);
            }
        }
    };

    clearAllPlayersHandAndLandmark() {
        for (let player of this.players) {
            $('#tab' + player.getId()).find('.card').remove();
        }
    }
};

Game.game = null;

window.onload = function() {

    var game = Game.getInstance();
    game.start();

};
