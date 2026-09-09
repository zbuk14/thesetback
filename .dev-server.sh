#!/bin/bash
# npm/npx in .local-node are broken relative symlinks post-copy, so we call
# the astro CLI directly via node rather than through npm. --root is
# explicit because this process's inherited cwd is unreliable (broken
# getcwd from the old Desktop-sandboxed launcher) and Astro would otherwise
# silently resolve the project root from that stale/ambient state.
exec /Users/zacharyboukkouri/thesetback/.local-node/bin/node \
  /Users/zacharyboukkouri/thesetback/node_modules/.bin/astro dev \
  --root /Users/zacharyboukkouri/thesetback
