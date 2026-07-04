import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v_0_22_0_19 } from './v0.22.0.19'
import { v_0_22_0_16 } from './v0.22.0.16'

export const versionGraph = VersionGraph.of({
  current,
  other: [v_0_22_0_19, v_0_22_0_16],
})
