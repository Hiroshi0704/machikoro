
class Landmark {

    static id = 0;

    constructor(name, cost, explanation) {
        this.name = name;
        this.cost = cost;
        this.explanation = explanation;
        this.active = false;
        this.id = Landmark.id;
        Landmark.id++;
    };

    getId() {
        return 'landmarkId-' + this.id;
    }

    getHtmlTemplate() {
        return `<div id="${this.getId()}" class="card landmark ${this.active ? 'active' : ''}">
                    <div class="activeNumber"></div>
                    <div class="name">
                        <span class="buildingType ${BUILDING_TYPE.SPECIAL}"></span>
                        <span class="inner">${this.name}</span>
                    </div>
                    <div class="explanation">${this.explanation}</div>
                    <div class="cost">
                        <span class="inner">${this.cost}</span>
                    </div>
                </div>`;
    };

    isActive() {
        return this.active;
    };

    setActive(active) {
        this.active = active;
    };

    static getHtmlBuildingType(buildingType) {
        return `<span class="buildingType ${buildingType}"></span>`;
    };

    activateClickEvent() {
        if (!this.isActive() && Game.getInstance().getNowPlayer().coins >= this.cost) {
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
    }

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
            const game = Game.getInstance();
            const player = game.getNowPlayer();
            player.buy(this.cost);
            this.setActive(true);
            game.displayPlayerLandmark(player);
            $modal.remove();
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
    }

};

class Station extends Landmark {
    constructor() {
        const explanation = 'ダイスを2個同時に振れる';
        super('駅', 4, explanation);
    };
};

class ShoppingMall extends Landmark {
    constructor() {
        const cafe = Landmark.getHtmlBuildingType(BUILDING_TYPE.CAFE);
        const shop = Landmark.getHtmlBuildingType(BUILDING_TYPE.SHOP);
        const explanation = `自分の${cafe}と${shop}施設で得られるコインを+1する`;
        super('ショッピングモール', 10, explanation);
    };
};

class AmusementPark extends Landmark {
    constructor() {
        const explanation = `ぞろ目を出したらもう一度自分のターン`;
        super('遊園地', 16, explanation);
    };
};

class RadioTower extends Landmark {
    constructor() {
        const explanation = `毎ターン一度だけダイスを振り直せる`;
        super('電波塔', 22, explanation);
        this.ableThrowAgain = true;
    };
};

class LandmarkManager {
    constructor() {};

    static getLandmarkForPlayer() {
        const ret = {};
        ret[LANDMARK_KEY.STATION] = new Station();
        ret[LANDMARK_KEY.SHOPPING_MALL] = new ShoppingMall();
        ret[LANDMARK_KEY.AMUSEMENT_PARK] = new AmusementPark();
        ret[LANDMARK_KEY.RADIO_TOWER] = new RadioTower();
        return ret;
    };
};
