/** @jsx h */
import {h} from 'preact';
import PureComponent from '../lib/PureComponent';
import s from './ModulesTreemapTooltip.css';

class ModulesTreemapTooltip extends PureComponent {
  render({module, renderModuleSize}) {
    const parentAssets =
      module.parentAssetNames && module.parentAssetNames.length
        ? module.parentAssetNames.join(', ')
        : '';

    return (
      <div>
        <div className={s.itemMetadata}>
          {module.isAsset && <span className={s.itemTypeChunk}>Chunk</span>}
          {!module.isAsset && <span className={s.itemTypeModule}>Module</span>}
          {module.isAsset && module.chunkMetadata.initial && (
            <span className={s.flagInitial}>Initial</span>
          )}
          {module.isAsset && module.chunkMetadata.entry && (
            <span className={s.flagEntry}>Entry</span>
          )}
        </div>
        <div>
          <strong>{module.label}</strong>
        </div>
        <br/>
        {renderModuleSize()}
        {module.path && (
          <div>
        Path: <strong>{module.path}</strong>
          </div>
        )}

        {module.isAsset && (
          <div>
            {parentAssets && (
              <div>
              Parent Chunks: <strong>{parentAssets}</strong>
              </div>
            )}
            <br/>
            <strong>
              <em>Right-click to view options related to this chunk</em>
            </strong>
          </div>
        )}
      </div>
    );
  }
}

export default ModulesTreemapTooltip;