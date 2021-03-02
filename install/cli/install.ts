import type {CommandModule, Argv} from 'yargs';
import {installVersion, InstallOpts} from '@teambit/bvm.install.api';
import { timeFormat } from '@teambit/time.time-format';
import ora from 'ora';

const loader = ora();
export class InstallCmd implements CommandModule {
  aliases = ['i', 'install'];
  describe = 'install specific bit version';
  command = [
    'install [bit-version]'
  ];
  builder(yargs: Argv) {
    yargs.positional('bit-version', {
      describe: 'version to install',
      default: 'latest',
      type: 'string'
    })
    .option({
      override: {
        describe: 'download the version again even if it is already exist in file system',
        default: false,
        type: 'boolean'
      }
    })
    .option({
      replace: {
        describe: 'replace current version',
        default: true,
        type: 'boolean'
      }
    })
    .example('$0 install 0.0.200', 'install version 0.0.200 of bit')
    return yargs;
  }
  async handler(args) {
    const opts: InstallOpts = {
      override: args.override
    }
    const installStartTime = Date.now();
    const finalPath = await installVersion(args.bitVersion, opts);
    const installEndTime = Date.now();
    const installTimeDiff = timeFormat(installEndTime - installStartTime);
    console.log(`version ${args.bitVersion} installed on ${finalPath} in ${installTimeDiff}`);
    return;
  };
}

export const command =  new InstallCmd();