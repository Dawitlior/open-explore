/**
 * AlphaLiveConsole — Deprecated shim.
 * The live deck has been replaced by the globally-mounted
 * <LiveDeckBento /> backed by <BybitLiveProvider />. This file now
 * exists only to keep stale imports compiling.
 */

import { memo } from 'react';
import { LiveDeckBento } from '@/components/live/LiveDeckBento';

type Props = { T?: unknown; isRTL?: boolean; enabled?: boolean };

const AlphaLiveConsole_Impl = (_props: Props) => <LiveDeckBento />;

export const AlphaLiveConsole = memo(AlphaLiveConsole_Impl);
export default AlphaLiveConsole;
