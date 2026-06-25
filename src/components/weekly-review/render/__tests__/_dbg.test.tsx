import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { ORCA_DEFAULT_TEMPLATE } from '../../lib/wr-default-template';
import { WeeklyReviewRenderer } from '../WeeklyReviewRenderer';
import { readDraft } from '../legacy-adapter';
import { EMPTY_DRAFT } from '../../hooks/use-week-draft';

const T = { id:'midnight', text:{primary:'#fff',muted:'#888'}, bg:{surface:'#111'}, border:{subtle:'#222'}, accent:{cyan:'#0ff'}, status:{success:'#0f0',danger:'#f00',warning:'#fb0'}};

describe('dbg', () => {
  it('dump', () => {
    const { container } = render(
      <WeeklyReviewRenderer schema={ORCA_DEFAULT_TEMPLATE} values={readDraft(EMPTY_DRAFT)} onChange={()=>{}} T={T} isRTL={false} locale="en" systemSlots={{}} />
    );
    const btns = Array.from(container.querySelectorAll('button')).map(b => JSON.stringify((b.textContent||'').trim()));
    console.log('BUTTONS:', btns.join('\n'));
    const opts = Array.from(container.querySelectorAll('option')).map(o => o.textContent);
    console.log('OPTIONS:', opts);
  });
});
