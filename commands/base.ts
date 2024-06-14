import { exit } from "process";
import { FriendlyError } from "../lib/errors";

export default class BaseCommand {
  async run() {
    try {
      await this.doRun();
    } catch (e) {
      if (e instanceof FriendlyError) {
        console.error(e.message);
        exit(1);
      } else {
        throw e;
      }
    }
  }

  async doRun() {
    throw new Error("Not implemented");
  }
}
