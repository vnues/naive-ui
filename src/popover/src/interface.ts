import { Ref, CSSProperties, VNode } from 'vue'
import { createInjectionKey } from '../../_utils'

export type PopoverTrigger = 'click' | 'hover' | 'focus' | 'manual'

export interface PopoverInst {
  syncPosition: () => void
  setShow: (value: boolean) => void
}

export type PopoverBodyInjection = Ref<HTMLElement | null> | null

export const popoverBodyInjectionKey = createInjectionKey<PopoverBodyInjection>(
  'popoverBodyInjection'
)

export type InternalRenderBody = (
  className: any,
  ref: Ref<HTMLElement | null>,
  style: Ref<CSSProperties>,
  onMouseenter: (e: MouseEvent) => void,
  onMouseleave: (e: MouseEvent) => void
) => VNode
