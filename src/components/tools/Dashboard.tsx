import React from 'react';
import { ToolId } from '../../types/media';
import { ConverterWorkspace } from '../converter/ConverterWorkspace';

export const Dashboard: React.FC<{onSelectTool:(id:ToolId)=>void}> = () => <ConverterWorkspace />;
