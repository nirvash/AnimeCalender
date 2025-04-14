import { SyobocalUpdater } from '../services/syobocal/updater';

async function runUpdate() {
  const updater = new SyobocalUpdater();
  await updater.updateAll();
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