import {ConverterWorkspace} from '../converter/ConverterWorkspace';
import type {ToolId} from '../../types/media';
export function FileConverter(_props:{onSelectTool:(id:ToolId)=>void}) {
  return <ConverterWorkspace/>;
}
