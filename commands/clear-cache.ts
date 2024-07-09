import BaseCommand from "./base";
import GlobalLanguageTemplatesDownloader from "../lib/global-language-templates-downloader";
import TesterDownloader from "../lib/tester-downloader";

export default class ClearCacheCommand extends BaseCommand {
  async doRun() {
    console.log(`Clearing global language templates cache`);
    GlobalLanguageTemplatesDownloader.clearCache();

    console.log(`Clearing testers cache`);
    TesterDownloader.clearCache();

    // TODO: Any other caches to delete?
  }
}
