import vscode = require('vscode');
import fs = require('fs');
import path = require('path');
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import {
  getAppDirectory,
} from "./utils";

const appDir = getAppDirectory();
const rootDir = path.join(appDir, '..')

const productFile = path.join(rootDir, 'product.json')
const origFile = `${productFile}.orig.${vscode.version}`

export function apply() {
    cleanupOrigFiles()

    const product = require(productFile)

    const checksums = product.checksums;
    for (const [key, _] of Object.entries(checksums)) {
        const parts = key.split("/");
        const filePath = join(appDir, "", ...parts);
        const contentHash = computeChecksum(readFileSync(filePath, "utf-8"));
        checksums[key] = contentHash;
    }

    const productJson = JSON.parse(readFileSync(productFile, "utf-8"));
    const updatedProductJson = JSON.stringify(
        { ...productJson, checksums },
        null,
        2,
    );
    writeFileSync(productFile, updatedProductJson, "utf-8");

    /*let changed = false
    for (const [filePath, curChecksum] of Object.entries(product.checksums)) {
        console.log(filePath, curChecksum)
        const checksum = computeChecksum(path.join(appDir, ...filePath.split('/')))
        if (checksum !== curChecksum) {
        product.checksums[filePath] = checksum
        console.log("CHANGED to", checksum)
        changed = true
        }
    }
    if (changed) {
        const json = JSON.stringify(product, null, '\t')
        try {
        if (!fs.existsSync(origFile)) {
            fs.renameSync(productFile, origFile)
        }
        fs.writeFileSync(productFile, json, { encoding: 'utf8' })
        console.log("APPLIED")
        } catch (err) {
        console.error(err)
        }
    }*/
}

export function restore() {
  try {
    if (fs.existsSync(origFile)) {
      fs.unlinkSync(productFile)
      fs.renameSync(origFile, productFile)
      console.log("RESTORING")
    }
  } catch (err) {
    console.error(err)
  }
}

function computeChecksum(string: string): string {
  return createHash("sha256")
    .update(string)
    .digest("base64")
    .replace(/=+$/, "");
}

/*function computeChecksum(file: string) {
  let contents = fs.readFileSync(file, 'utf8')
  contents = contents.replace(/\r\n/g, '\n')
  console.log(contents)

  return crypto
    .createHash('md5')
    .update(contents, 'utf8')
    .digest('base64')
    .replace(/=+$/, '')
}*/

export function cleanupOrigFiles() {
  // Remove all old backup files that aren't related to the current version
  // of VSCode anymore.
  const oldOrigFiles = fs.readdirSync(rootDir)
    .filter(file => /\.orig\./.test(file))
    .filter(file => !file.endsWith(vscode.version))
  for (const file of oldOrigFiles) {
    fs.unlinkSync(path.join(rootDir, file))
  }
}