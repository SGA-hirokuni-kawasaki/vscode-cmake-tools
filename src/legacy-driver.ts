/**
 * Module for the legacy driver. Talks to pre-CMake Server versions of CMake.
 * Can also talk to newer versions of CMake via the command line.
 */ /** */

import { CMakeDriver } from './driver';
// import rollbar from './rollbar';
import {Kit} from './kit';
import {fs} from './pr';
import config from './config';
import * as util from './util';
import * as proc from './proc';
// import * as proc from './proc';

/**
 * The legacy driver.
 */
export class LegacyCMakeDriver extends CMakeDriver {
  private constructor() { super(); }

  async setKit(kit: Kit): Promise<void> {
    const need_clean = this._kitChangeNeedsClean(kit);
    if (need_clean) {
      await fs.rmdir(this.binaryDir);
    }
    this._setBaseKit(kit);
  }

  // Legacy disposal does nothing
  async asyncDispose() {}

  async configure(): Promise<number> {
    if (!await this._beforeConfigure()) {
      // Pre-configure steps failed. Bad...
      return -1;
    }

    // Build up the CMake arguments
    const args: string[] = [];
    if (!this.cmakeCache) {
      // No cache! This is our first time configuring
      const generator = 'Ninja';  // TODO: Find generators!
      args.push('-G' + generator);
      // TODO: Platform and toolset selection
    }

    if (!this._kit) {
      throw new Error('No kit is set!');
    }
    switch (this._kit.type) {
    case 'compilerKit': {
      args.push(...util.objectPairs(this._kit.compilers)
                    .map(([ lang, comp ]) => `-DCMAKE_${lang}_COMPILER:FILEPATH=${comp}`));
    }
    }

    const cmake_settings = this._cmakeFlags();
    args.push(...cmake_settings);
    args.push('-H' + util.normalizePath(this.sourceDir));
    const bindir = util.normalizePath(this.binaryDir);
    args.push('-B' + bindir);
    const res = await proc.execute(config.cmakePath, args);
    console.log(res.stderr);
    console.log(res.stdout);
    return res.retc;
  }

  static async create(): Promise<LegacyCMakeDriver> {
    const inst = new LegacyCMakeDriver();
    await inst._init();
    return inst;
  }
}