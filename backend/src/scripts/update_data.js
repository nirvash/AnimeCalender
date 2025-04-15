"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const updater_1 = require("../services/syobocal/updater");
function runUpdate() {
    return __awaiter(this, void 0, void 0, function* () {
        const updater = new updater_1.SyobocalUpdater();
        yield updater.updateAll();
    });
}
runUpdate()
    .then(() => {
    console.log('データ更新スクリプトが正常に完了しました。');
    process.exit(0);
})
    .catch((error) => {
    console.error('データ更新スクリプトの実行中にエラーが発生しました:', error);
    process.exit(1);
});
