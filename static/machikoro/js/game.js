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
        const loc = window.location;
        this.socket = new WebSocket('ws://' + loc.host + '/ws' + loc.pathname);
        this.socket.onopen = this.onopen.bind(this);
        this.socket.onmessage = this.onmessage.bind(this);
        this.className = this.constructor.name;
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

    onopen(event) {
        console.log('conected', event);
        // this.sendGame();
    }

    onmessage(event) {
        console.log('received', event);
        const data = JSON.parse(event.data);
        if (data.game !== undefined) {
            this.receiveGame(event, data);
        } else if (data.log !== undefined) {
            this.receiveLog(event, data);
        } else if (data.logDiceNumber !== undefined) {
            this.receiveLogDiceNumber(event, data);
        } else if (data.channel_name !== undefined) {
            this.receiveChannelName(event, data);
        } else if (data.updatePlayers !== undefined) {
            this.receiveUpdatePlayers(event, data);
        } else if (data.gameStart) {
            this.receiveGameStart(event, data);
        }
    }

    receiveGame(_event, data) {
        Logger.update();
        const _game = Game.toClass(data.game, this.className);
        let _players = _game.players.map(data => Game.toClass(data, data.className));
        for (let player of _players) {
            player.dice = Game.toClass(player.dice, player.dice.className);
            player.dice.dice1 = Game.toClass(player.dice.dice1, player.dice.dice1.className);
            player.dice.dice2 = Game.toClass(player.dice.dice2, player.dice.dice2.className);
            player.hand = player.hand.map(card => Game.toClass(card, card.className));
            for (let key of Object.keys(player.landmark)) {
                const landmark = player.landmark[key];
                player.landmark[key] = Game.toClass(landmark, landmark.className);
            }
        }
        Game.getInstance().players = _players;
        Game.getInstance().cardStock = _game.cardStock.map(card => Game.toClass(card, card.className));
        Game.getInstance().publicCards = this.loadPublicCards(_game.publicCards);

        const player = this.getNowPlayer();
        this.displayPlayerHand(player);
        this.displayPlayerLandmark(player);
        this.playerListTurn(player);
        this.enableDoubleDiceButtonIfAllowed(player);
        this.disableBuySupplyBuildingAndLandmark();
        this.displayPublicCards();
        this.displayAllPlayersHandAndLandmark();
        this.$throwDiceButton.prop('disabled', false);
        this.$doneButton.prop('disabled', true);
        this.$diceResult.val('');
        this.$throwDiceButton.focus();
        $(`a[href="#tab${player.getId()}"]`).mouseover();

        for (let player of this.players) {
            player.updateCoinsOnDisplay();
        }

        if (player.channelName !== Game.channelName) {
            this.$throwDiceButton.prop('disabled', true);
        }
    }

    receiveLog(_event, data) {
        Logger.outputLog(data.log);
    }

    receiveLogDiceNumber(_event, data) {
        Logger.outputDice(data.logDiceNumber);
    }

    receiveChannelName(_event, data) {
        if (Game.channelName === null) {
            Game.channelName = data.channel_name;
        }
        Game.channels = data.channels;
    }

    receiveUpdatePlayers(_event, data) {
        this.players = data.updatePlayers.map(player => Game.toClass(player, player.className));
    }

    receiveGameStart(_event, _data) {
        $('#startDialog').remove();
        this.players = [];
        this.start();

        if (Game.starter) {
            this.sendGame();
        }
    }

    sendGame() {
        const data = {
            'game': {
                'players': this.players,
                'cardStock': this.cardStock,
                'publicCards': this.publicCards,
            },
        }
        this.socket.send(JSON.stringify(data));
    }

    initPlayers(names) {
        for (let i in Game.channels) {
            const channel_name = Game.channels[i];
            const supply = SupplyBuildingManager.getDefaultSupplyBuildingForPlayer();
            const landmark = LandmarkManager.getLandmarkForPlayer();
            const player = new Player(names[i], supply, landmark, 3, channel_name);
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
        this.sendGame();
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
            if (this.publicCards[nextCard.className] === undefined) {
                this.publicCards[nextCard.className] = [];
            }
            this.publicCards[nextCard.className].push(nextCard);
        }

        const $public = $('#public');
        $public.find('.card').remove();
        for(let key of Object.keys(this.publicCards)) {
            const card = this.publicCards[key][0];
            $public.append($(card.getHtmlTemplate()));
        }
    };

    displayPublicCards() {
        const $public = $('#public');
        $public.find('.card').remove();
        for(let key of Object.keys(this.publicCards)) {
            const card = this.publicCards[key][0];
            $public.append($(card.getHtmlTemplate()));
        }
    }

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

    static toClass(data, className) {
        function getClass(className){return Function('return (' + className + ')')();}
        const clazz = getClass(className);
        return Object.setPrototypeOf(data, clazz.prototype);
    }

    loadPublicCards(plainPublicCards) {
        let ret = {};
        for (let key of Object.keys(plainPublicCards)) {
            const cardList = plainPublicCards[key];
            ret[key] = cardList.map(card => Game.toClass(card, card.className));
        }
        return ret;
    }
};

Game.game = null;
Game.channelName = null;
Game.starter = false

window.onload = function() {

    var game = Game.getInstance();

    $('<div id="startDialog">').dialog({
        modal: true,
        buttons: {
            'スタート': function() {
                game.socket.send(JSON.stringify({'gameStart': true}));
                Game.starter = true;
            }
        }
    })

};
