// MUI action rail for customize mode. Replaces the raw emoji buttons
// (↑ ↓ 🚫 ⇣ ×) with IconButtons + Tooltips driven by token colors.
//
// Used by the renderer in customize mode, wrapped around each section
// and each block. Drag-handle is provided externally (kept on dnd-kit
// sortable) and forwarded via `dragHandleProps`.

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { REFLECTION_TOKENS as T } from '../../theme/tokens';

export interface EditableShellProps {
  isRTL: boolean;
  hidden?: boolean;
  canReorder?: boolean;
  canHide?: boolean;
  canDemote?: boolean;
  canDelete?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  /** Drag handle props from dnd-kit (attributes + listeners merged). */
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onHide?: () => void;
  onShow?: () => void;
  onDemote?: () => void;
  onDelete?: () => void;
  /** Optional id used to build sr-only aria-labels. */
  targetId?: string;
  children: ReactNode;
}

export function EditableCardShell({
  isRTL, hidden, canReorder, canHide, canDemote, canDelete,
  isFirst, isLast, dragHandleProps,
  onMoveUp, onMoveDown, onHide, onShow, onDemote, onDelete,
  targetId, children,
}: EditableShellProps) {
  const direction = isRTL ? 'row-reverse' : 'row';
  return (
    <Box
      data-editable-shell
      data-hidden={hidden ? 'true' : 'false'}
      sx={{
        position: 'relative',
        opacity: hidden ? 0.45 : 1,
        transition: `opacity ${T.motion.durStd}ms ${T.motion.easeStd}`,
      }}
    >
      {children}
      <Stack
        direction={direction}
        spacing={0.5}
        sx={{
          mt: 1,
          alignItems: 'center',
          justifyContent: isRTL ? 'flex-end' : 'flex-start',
        }}
      >
        {canReorder && dragHandleProps && (
          <Tooltip title={isRTL ? 'גרור לסידור' : 'Drag to reorder'}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <IconButton
              size="small"
              aria-label={`drag ${targetId ?? ''}`.trim()}
              {...(dragHandleProps as unknown as Record<string, unknown>)}
              color="default"
              sx={{ color: T.text.secondary, cursor: 'grab', touchAction: 'none' }}
            >
              <DragIndicatorIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canReorder && onMoveUp && (
          <Tooltip title={isRTL ? 'הזז למעלה' : 'Move up'}>
            <span>
              <IconButton
                size="small"
                aria-label={`move ${targetId ?? ''} up`.trim()}
                disabled={isFirst}
                onClick={onMoveUp}
                sx={{ color: T.text.secondary }}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {canReorder && onMoveDown && (
          <Tooltip title={isRTL ? 'הזז למטה' : 'Move down'}>
            <span>
              <IconButton
                size="small"
                aria-label={`move ${targetId ?? ''} down`.trim()}
                disabled={isLast}
                onClick={onMoveDown}
                sx={{ color: T.text.secondary }}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {canHide && (
          hidden ? (
            <Tooltip title={isRTL ? 'הצג' : 'Show'}>
              <IconButton
                size="small"
                aria-label={`show ${targetId ?? ''}`.trim()}
                onClick={onShow}
                sx={{ color: T.accent.info }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title={isRTL ? 'הסתר' : 'Hide'}>
              <IconButton
                size="small"
                aria-label={`hide ${targetId ?? ''}`.trim()}
                onClick={onHide}
                sx={{ color: T.text.secondary }}
              >
                <VisibilityOffIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )
        )}
        {canDemote && onDemote && (
          <Tooltip title={isRTL ? 'הפוך לפריט צ׳קליסט' : 'Demote to checklist'}>
            <IconButton
              size="small"
              aria-label={`demote ${targetId ?? ''}`.trim()}
              onClick={onDemote}
              sx={{ color: T.text.secondary }}
            >
              <SubdirectoryArrowRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canDelete && onDelete && (
          <Tooltip title={isRTL ? 'מחק' : 'Delete'}>
            <IconButton
              size="small"
              aria-label={`delete ${targetId ?? ''}`.trim()}
              onClick={onDelete}
              sx={{ color: T.accent.error }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

export default EditableCardShell;
