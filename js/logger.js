class Logger {
    constructor() {};

    static info(log) {
        const $log = $('#log');
        $log.append(`<p class="new">${log}</p>`);

        const bottom = $log[0].scrollHeight;
        $log[0].scroll(0, bottom);
    };

    static update() {
        const $log = $('#log');
        $log.find('p').removeClass('new');
    };

};
