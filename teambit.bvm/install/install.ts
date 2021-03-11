import fs, { MoveOptions } from 'fs-extra';
import path from 'path';
import {fetch, FetchOpts} from '@teambit/bvm.fetch';
import {untar} from '@teambit/toolbox.fs.untar';
import ora from 'ora';
import { timeFormat } from '@teambit/time.time-format';
import { Config } from '@teambit/bvm.config';
import {linkOne} from '@teambit/bvm.link';
import { listRemote } from '@teambit/bvm.list';

export type InstallOpts = {
  override?: boolean,
  replace?: boolean
}

type InstallResults = {
  installedVersion: string,
  downloadRequired: boolean,
  replacedCurrent: boolean,
  versionPath: string
}

const defaultOpts = {
  override: false,
  replace: false
}

const loader = ora();

export async function installVersion(version: string, opts: InstallOpts = defaultOpts): Promise<InstallResults>{
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const config = getConfig();
  const remoteVersionList = await listRemote();

  let resolvedVersion = version;
  if (!version || version === 'latest') {
    resolvedVersion = remoteVersionList.latest().version;
  }
  const { versionDir, exists } = config.getSpecificVersionDir(resolvedVersion);
  if (exists) {
    if (!concreteOpts.override){
      const replacedCurrent = await replaceCurrentIfNeeded(concreteOpts.replace, resolvedVersion);
      return {
        downloadRequired: false,
        installedVersion: resolvedVersion,
        replacedCurrent,
        versionPath: versionDir
      }
    }
    await removeWithLoader(versionDir);
  }
  const tempDir = config.getTempDir();
  const fetchDestination = path.join(tempDir, resolvedVersion);
  const fetchOpts: FetchOpts = {
    overrideDir: true,
    destination: fetchDestination
  }
  const downloadResults = await fetch(resolvedVersion, fetchOpts);
  // version already exists, return it's location
  if (downloadResults.downloadedFile) {
    const tarFile = downloadResults.downloadedFile;
    await untar(tarFile);
    await removeWithLoader(tarFile);
  }
  await moveWithLoader(tempDir, versionDir, {overwrite: true});
  const replacedCurrent = await replaceCurrentIfNeeded(concreteOpts.replace, downloadResults.resolvedVersion);
  loader.stop();
  return {
    downloadRequired: !!downloadResults.downloadedFile,
    installedVersion: downloadResults.resolvedVersion,
    replacedCurrent,
    versionPath: versionDir
  }
}

async function removeWithLoader(filePath: string) {
  const removeLoaderText = `removing ${filePath}`;
  loader.start(removeLoaderText);
  const removeStartTime = Date.now();
  await fs.remove(filePath);
  const removeEndTime = Date.now();
  const removeTimeDiff = timeFormat(removeEndTime - removeStartTime);
  loader.succeed(`${removeLoaderText} in ${removeTimeDiff}`);
}

async function moveWithLoader(src: string, target: string, opts: MoveOptions): Promise<void> {
  const moveLoaderText = `moving from temp folder to final location`;
  loader.start(moveLoaderText);
  const moveStartTime = Date.now();
  await fs.move(src, target, opts);
  const moveEndTime = Date.now();
  const moveTimeDiff = timeFormat(moveEndTime - moveStartTime);
  loader.succeed(`${moveLoaderText} in ${moveTimeDiff}`);
}

async function replaceCurrentIfNeeded(forceReplace: boolean, version: string): Promise<boolean> {
  const config = getConfig();
  const currentLink = config.getDefaultLinkVersion();
  if (forceReplace || !currentLink){
    await linkOne(config.getDefaultLinkName(), version, true);
    return true;
  }
  return false;
}

function getConfig(): Config {
  const config = Config.load();
  return config;
}