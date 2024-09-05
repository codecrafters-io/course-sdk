import Course from "./lib/models/course";
import TesterDownloader from "./lib/tester-downloader";

const course = Course.loadFromDirectory(process.cwd());

TesterDownloader.clearCache(); // Wip first

const testerDownloader = new TesterDownloader(course);
console.log("Before download");
await testerDownloader.downloadIfNeeded();
console.log("Download done");
