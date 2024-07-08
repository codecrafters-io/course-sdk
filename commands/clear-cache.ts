import BaseCommand from "./base";
import GlobalLanguageTemplatesDownloader from "../lib/global-language-templates-downloader";

export default class ClearCacheCommand extends BaseCommand {
  async doRun() {
    console.log(`Clearing global language templates cache`);
    GlobalLanguageTemplatesDownloader.clearCache();

    // TODO: Clear tester cache too?
  }
}
