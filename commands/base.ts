import { exit } from "process";
import { CodeCraftersError } from "../lib/errors";

export default class BaseCommand {
  run() {
    try {
      this.doRun();
    } catch (e) {
      if (e instanceof CodeCraftersError) {
        console.error(e.message);
        exit(1);
      } else {
        throw e;
      }
    }
  }

  doRun() {
    throw new Error("Not implemented");
  }
}
