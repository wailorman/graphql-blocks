/* eslint no-shadow: 0 */

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const debug = require('debug');

const getFromModuleFiles = (modulesPath, utilityName) => {
  const moduleDirs = fs.readdirSync(modulesPath).filter(node => /\.js$/.test(node) === false);

  const _debug = debug(`schema:init:${utilityName}`);

  _debug('moduleDirs: \n%O', moduleDirs);

  const moduleData = moduleDirs
    .reduce((prev, moduleName, i, arr) => {
      const _debug = debug(`schema:collect:${utilityName}:${moduleName}:reduce`);
      _debug('reducing %o module', moduleName);

      const filePath = path.resolve(modulesPath, moduleName, './', `${utilityName}.js`);
      const dirPath = path.resolve(modulesPath, moduleName, './', utilityName);

      const fileExists = fs.existsSync(filePath);
      const dirExists = fs.existsSync(dirPath);

      let res;

      if (!(fileExists || dirExists)) {
        // No such file or path
        _debug('result: empty');
        res = prev;
      } else if (fileExists && fs.lstatSync(filePath).isFile()) {
        prev.push([moduleName, filePath]);

        _debug('result FILE: \n %O', filePath);

        res = prev;
      } else if (dirExists && fs.lstatSync(dirPath).isDirectory()) {
        const filesInDir = fs
          .readdirSync(dirPath)
          .filter((node) => {
            const isFile = fs
              .lstatSync(path.resolve(modulesPath, moduleName, './', utilityName, node))
              .isFile();

            _debug('found node inside dir: %o (%s a file)', node, isFile ? 'IS' : 'NOT');

            return isFile;
          })
          .filter((file) => {
            // Ignore files beginning w/ _ sybmbol

            const isNotHidden = file.indexOf('_') !== 0;

            _debug('file %o is %s', file, isNotHidden ? 'not hidden' : 'HIDDEN');

            return isNotHidden;
          })
          .filter((file) => {
            // Ingore non-JS files

            const isJsFile = /\.js$/.test(file) === true;

            _debug('file %o is %s file', file, isJsFile ? 'js' : 'NOT JS');

            return isJsFile;
          })
          .map(file => [
            moduleName,
            path.resolve(modulesPath, moduleName, './', utilityName, file),
          ]);

        _debug('result DIR: \n %O', filesInDir.map(([, file]) => file));

        res = prev.concat(filesInDir);
      } else {
        // It's exist, but it's not a file or a directory
        _debug('result: empty');
        res = prev;
      }

      const __debug = debug(`schema:collect:${utilityName}:_RESULT_:reduce`);

      i === arr.length - 1 && __debug('result _END: \n %O', res.map(([, file]) => file));

      return res;
    }, [])
    .map(([moduleName, utilityFilePath]) => {
      const _debug = debug(`schema:collect:${utilityName}:${moduleName}:require`);

      _debug('Requiring %o file', utilityFilePath);

      const res = require(utilityFilePath);

      if (!res) {
        _debug(`can't require (not found)`);
      }

      return res;
    });

  return moduleData;
};

const getTypes = modulesPath => getFromModuleFiles(modulesPath, 'types');

const getMediators = modulesPath => getFromModuleFiles(modulesPath, 'mediators');

const getResolvers = modulesPath => getFromModuleFiles(modulesPath, 'resolvers');

const getMiddlewares = modulesPath => getFromModuleFiles(modulesPath, 'middlewares');

exports.getAllTypes = modulesPath =>
  getTypes(modulesPath).concat(_(getMediators(modulesPath))
    .flatten()
    .value()
    .filter(obj => !!(obj && obj.types))
    .map(({ types }) => types));

exports.getAllResolvers = modulesPath =>
  getResolvers(modulesPath).concat(_(getMediators(modulesPath))
    .flatten()
    .value()
    .filter(obj => !!(obj && obj.resolvers))
    .map(({ resolvers }) => resolvers));

exports.getAllMiddlewares = modulesPath =>
  getMiddlewares(modulesPath).concat(_(getMediators(modulesPath))
    .flatten()
    .value()
    .filter(obj => !!(obj && obj.middlewares))
    .map(({ middlewares }) => middlewares));
