const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const gzipSize = require('gzip-size');

const Logger = require('./Logger');
const Folder = require('./tree/Folder').default;
const {parseBundle} = require('./parseUtils');
const {createAssetsFilter} = require('./utils');

const FILENAME_QUERY_REGEXP = /\?.*$/u;
const FILENAME_EXTENSIONS = /\.(js|mjs)$/iu;

module.exports = {
  getViewerData,
  readStatsFromFile
};

function getViewerData(bundleStats, bundleDir, opts) {
  const {
    logger = new Logger(),
    excludeAssets = null
  } = opts || {};

  const isAssetIncluded = createAssetsFilter(excludeAssets);

  // Sometimes all the information is located in `children` array (e.g. problem in #10)
  if (_.isEmpty(bundleStats.assets) && !_.isEmpty(bundleStats.children)) {
    bundleStats = bundleStats.children[0];
  }

  // Picking only `*.js or *.mjs` assets from bundle that has non-empty `chunks` array
  bundleStats.assets = _.filter(bundleStats.assets, asset => {
    // Removing query part from filename (yes, somebody uses it for some reason and Webpack supports it)
    // See #22
    asset.name = asset.name.replace(FILENAME_QUERY_REGEXP, '');

    return FILENAME_EXTENSIONS.test(asset.name) && !_.isEmpty(asset.chunks) && isAssetIncluded(asset.name);
  });

  // Trying to parse bundle assets and get real module sizes if `bundleDir` is provided
  let bundlesSources = null;
  let parsedModules = null;

  if (bundleDir) {
    bundlesSources = {};
    parsedModules = {};

    for (const statAsset of bundleStats.assets) {
      const assetFile = path.join(bundleDir, statAsset.name);
      let bundleInfo;

      try {
        bundleInfo = parseBundle(assetFile);
      } catch (err) {
        const msg = (err.code === 'ENOENT') ? 'no such file' : err.message;
        logger.warn(`Error parsing bundle asset "${assetFile}": ${msg}`);
        continue;
      }

      bundlesSources[statAsset.name] = bundleInfo.src;
      _.assign(parsedModules, bundleInfo.modules);
    }

    if (_.isEmpty(bundlesSources)) {
      bundlesSources = null;
      parsedModules = null;
      logger.warn('\nNo bundles were parsed. Analyzer will show only original module sizes from stats file.\n');
    }
  }

  const modules = getBundleModules(bundleStats);
  const assets = _.transform(bundleStats.assets, (result, statAsset) => {
    const asset = result[statAsset.name] = _.pick(statAsset, 'size');

    if (bundlesSources && _.has(bundlesSources, statAsset.name)) {
      asset.parsedSize = Buffer.byteLength(bundlesSources[statAsset.name]);
      asset.gzipSize = gzipSize.sync(bundlesSources[statAsset.name]);
    }

    // Picking modules from current bundle script
    asset.modules = _(modules)
      .filter(statModule => assetHasModule(statAsset, statModule))
      .each(statModule => {
        if (parsedModules) {
          statModule.parsedSrc = parsedModules[statModule.id];
        }
      });

    asset.tree = createModulesTree(asset.modules);

    asset.parentAssetNames = getParentAssets(statAsset, bundleStats).map(
      asset => asset.name
    );

    asset.chunkMetadata = getChunkMetadata(statAsset, bundleStats);
    console.log(JSON.stringify(asset.chunkMetadata));
  }, {});

  return _.transform(assets, (result, asset, filename) => {
    result.push({
      label: filename,
      isAsset: true,
      // Not using `asset.size` here provided by Webpack because it can be very confusing when `UglifyJsPlugin` is used.
      // In this case all module sizes from stats file will represent unminified module sizes, but `asset.size` will
      // be the size of minified bundle.
      // Using `asset.size` only if current asset doesn't contain any modules (resulting size equals 0)
      statSize: asset.tree.size || asset.size,
      parsedSize: asset.parsedSize,
      gzipSize: asset.gzipSize,
      groups: _.invokeMap(asset.tree.children, 'toChartData'),
      chunkMetadata: asset.chunkMetadata,
      parentAssetNames: asset.parentAssetNames
    });
  }, []);
}

function readStatsFromFile(filename) {
  return JSON.parse(
    fs.readFileSync(filename, 'utf8')
  );
}

function getChunkMetadata(statAsset, bundleStats) {
  if (!statAsset.chunks.length) {
    return null;
  }
  if (statAsset.chunks.length > 1) {
    // Multiple chunks in asset.
    // That means we can't easily describe the asset
    // in terms of its chunk's metadata; bail out
    // in this case.
    // TODO: determine circumstances when this case is possible
    return null;
  }
  const chunkId = statAsset.chunks[0];
  const chunk = _.find(bundleStats.chunks, {id: chunkId});
  const {entry, initial} = chunk;
  return {entry, initial};
}

function getBundleModules(bundleStats) {
  return _(bundleStats.chunks)
    .map('modules')
    .concat(bundleStats.modules)
    .compact()
    .flatten()
    .uniqBy('id')
    .value();
}

function getParentAssets(statAsset, bundleStats) {
  // Get asset objects corresponding to parent chunks of the specified asset
  const parentChunks = _(statAsset.chunks)
    .map(chunkId => _.find(bundleStats.chunks, {id: chunkId}))
    .map('parents')
    .flatten()
    .value();
  return bundleStats.assets.filter(asset =>
    asset.chunks.some(chunk => parentChunks.includes(chunk))
  );
}

function assetHasModule(statAsset, statModule) {
  // Checking if this module is the part of asset chunks
  return _.some(statModule.chunks, moduleChunk =>
    _.includes(statAsset.chunks, moduleChunk)
  );
}

function createModulesTree(modules) {
  const root = new Folder('.');

  _.each(modules, module => root.addModule(module));
  root.mergeNestedFolders();

  return root;
}
