/** @jsx h */
import {h} from 'preact';
import PureComponent from '../lib/PureComponent';
import s from './ModulesTreemapTooltip.css';

class ModulesTreemapTooltip extends PureComponent {
  render({module, renderModuleSize}) {
    const assetRelations = module.relations || null;

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

        {module.isAsset && assetRelations && (
          <div>
            <div>
            # Parent Chunks: <strong>{assetRelations.parents.length}</strong>
            </div>
            <div>
            # Sibling Chunks: <strong>{assetRelations.siblings.length}</strong>
            </div>
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