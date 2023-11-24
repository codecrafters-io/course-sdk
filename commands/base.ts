import { exit } from "process";
import { CodeCraftersError } from "../lib/errors";

export default class BaseCommand {
  async run() {
    await this.doRun();
    // try {
    //   this.doRun();
    // } catch (e) {
    //   if (e instanceof CodeCraftersError) {
    //     console.error(e.message);
    //     exit(1);
    //   } else {
    //     throw e;
    //   }
    // }
  }

  async doRun() {
    throw new Error("Not implemented");
  }
}
